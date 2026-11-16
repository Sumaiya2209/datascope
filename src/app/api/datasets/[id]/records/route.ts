import { count, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "../../../../../../auth";
import {
  AuthorizationError,
  requireDatasetAccess,
} from "@/lib/auth/permissions";
import { db } from "@/lib/db";
import {
  datasetRecords,
  queryLogs,
  searchHistory,
  users,
} from "@/lib/db/schema";
import {
  buildOrderBy,
  buildQuery,
  createFilterHash,
  searchRequestSchema,
} from "@/features/search/server/buildQuery";

type RouteContext = {
  params: Promise<{ id: string }>;
};

type CountCacheEntry = {
  count: number;
  expiresAt: number;
};

const COUNT_CACHE_TTL_MS = 30_000;
const COUNT_CACHE_MAX_ENTRIES = 512;
const countCache = new Map<string, CountCacheEntry>();
const datasetIdSchema = z.uuid();

function durationSince(startedAt: number): number {
  return Math.min(
    Math.max(Math.round(performance.now() - startedAt), 0),
    2_147_483_647,
  );
}

async function writeQueryLog(
  userId: string,
  datasetId: string,
  filterHash: string,
  durationMs: number,
  rowsReturned: number,
  succeeded: boolean,
) {
  await db.insert(queryLogs).values({
    userId,
    datasetId,
    queryType: "dataset_records_search",
    normalizedQuery: filterHash,
    durationMs,
    rowsReturned,
    succeeded,
    errorCode: succeeded ? null : "QUERY_FAILED",
  });
}

async function saveSearchHistory(
  userId: string,
  datasetId: string,
  config: z.infer<typeof searchRequestSchema>,
  resultCount: number,
  durationMs: number,
) {
  await db.transaction(async (transaction) => {
    await transaction.execute(
      sql`SELECT ${users.id} FROM ${users} WHERE ${users.id} = ${userId} FOR UPDATE`,
    );
    await transaction.insert(searchHistory).values({
      userId,
      datasetId,
      query: { ...config },
      resultCount,
      durationMs,
    });

    await transaction.execute(sql`
      DELETE FROM ${searchHistory}
      WHERE ${searchHistory.userId} = ${userId}
        AND ${searchHistory.id} NOT IN (
          SELECT ${searchHistory.id}
          FROM ${searchHistory}
          WHERE ${searchHistory.userId} = ${userId}
          ORDER BY ${searchHistory.executedAt} DESC, ${searchHistory.id} DESC
          LIMIT 50
        )
    `);
  });
}

function getAuthorizationResponse(error: AuthorizationError) {
  const status =
    error.code === "UNAUTHENTICATED"
      ? 401
      : error.code === "FORBIDDEN"
        ? 403
        : 404;

  return NextResponse.json(
    { error: error.message, code: error.code },
    { status },
  );
}

function parseGetInput(request: Request): unknown {
  const params = new URL(request.url).searchParams;

  return {
    search: params.get("search") ?? undefined,
    conditions: params.get("conditions") ?? undefined,
    sort: params.get("sort") ?? undefined,
    page: params.get("page") ?? undefined,
    pageSize: params.get("pageSize") ?? undefined,
  };
}

async function parsePostInput(request: Request): Promise<unknown | Response> {
  try {
    return await request.json();
  } catch (error) {
    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { error: "Request body must be valid JSON." },
        { status: 400 },
      );
    }

    throw error;
  }
}

async function getCachedCount(
  filterHash: string,
  loadCount: () => Promise<number>,
): Promise<number> {
  const now = Date.now();
  for (const [key, entry] of countCache) {
    if (entry.expiresAt <= now) {
      countCache.delete(key);
    }
  }

  const cached = countCache.get(filterHash);
  if (cached) {
    return cached.count;
  }

  const total = await loadCount();
  if (countCache.size >= COUNT_CACHE_MAX_ENTRIES) {
    const oldestKey = countCache.keys().next().value;
    if (oldestKey !== undefined) {
      countCache.delete(oldestKey);
    }
  }

  countCache.set(filterHash, {
    count: total,
    expiresAt: now + COUNT_CACHE_TTL_MS,
  });

  return total;
}

async function searchRecords(
  request: Request,
  context: RouteContext,
  method: "GET" | "POST",
) {
  const startedAt = performance.now();
  const { id } = await context.params;
  const parsedDatasetId = datasetIdSchema.safeParse(id);

  if (!parsedDatasetId.success) {
    return NextResponse.json(
      { error: "Dataset id must be a UUID." },
      { status: 400 },
    );
  }

  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    return NextResponse.json(
      { error: "Sign-in is required.", code: "UNAUTHENTICATED" },
      { status: 401 },
    );
  }

  try {
    await requireDatasetAccess(userId, parsedDatasetId.data);
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return getAuthorizationResponse(error);
    }

    throw error;
  }

  const input =
    method === "GET" ? parseGetInput(request) : await parsePostInput(request);
  if (input instanceof Response) {
    return input;
  }

  const parsedRequest = searchRequestSchema.safeParse(input);
  if (!parsedRequest.success) {
    return NextResponse.json(
      {
        error: "Search request is invalid.",
        details: parsedRequest.error.flatten(),
      },
      { status: 400 },
    );
  }

  const config = parsedRequest.data;
  const filterHash = createFilterHash(parsedDatasetId.data, config);
  const hasFilters = Boolean(config.search) || config.conditions.length > 0;

  if (!hasFilters) {
    await writeQueryLog(
      userId,
      parsedDatasetId.data,
      filterHash,
      durationSince(startedAt),
      0,
      true,
    );

    return NextResponse.json({
      records: [],
      page: config.page,
      pageSize: config.pageSize,
      total: 0,
      hasMore: false,
    });
  }

  try {
    const where = buildQuery(parsedDatasetId.data, config);
    const total = await getCachedCount(filterHash, async () => {
      const [result] = await db
        .select({ total: count() })
        .from(datasetRecords)
        .where(where);

      if (!result) {
        throw new Error("The records count query returned no result.");
      }

      return result.total;
    });
    const selectedRecords = await db
      .select({
        id: datasetRecords.id,
        status: datasetRecords.status,
        country: datasetRecords.country,
        category: datasetRecords.category,
        revenue: datasetRecords.revenue,
        createdAt: datasetRecords.createdAt,
        updatedAt: datasetRecords.updatedAt,
        name: datasetRecords.name,
        email: datasetRecords.email,
        extra: datasetRecords.extra,
      })
      .from(datasetRecords)
      .where(where)
      .orderBy(...buildOrderBy(config))
      .limit(config.pageSize + 1)
      .offset((config.page - 1) * config.pageSize);

    const hasMore = selectedRecords.length > config.pageSize;
    const records = selectedRecords.slice(0, config.pageSize);

    await saveSearchHistory(
      userId,
      parsedDatasetId.data,
      config,
      total,
      durationSince(startedAt),
    );
    await writeQueryLog(
      userId,
      parsedDatasetId.data,
      filterHash,
      durationSince(startedAt),
      records.length,
      true,
    );

    return NextResponse.json({
      records,
      page: config.page,
      pageSize: config.pageSize,
      total,
      hasMore,
    });
  } catch (error) {
    await writeQueryLog(
      userId,
      parsedDatasetId.data,
      filterHash,
      durationSince(startedAt),
      0,
      false,
    );
    throw error;
  }
}

export async function GET(request: Request, context: RouteContext) {
  return searchRecords(request, context, "GET");
}

export async function POST(request: Request, context: RouteContext) {
  return searchRecords(request, context, "POST");
}

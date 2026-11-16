import { and, asc, count, desc, eq, gte, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import {
  AuthorizationError,
  requireDatasetAccess,
} from "@/lib/auth/permissions";
import { auth } from "../../../../../../auth";
import { db } from "@/lib/db";
import { datasetRecords, searchHistory } from "@/lib/db/schema";
import type { AnalyticsOverview } from "@/lib/api/types";

type RouteContext = {
  params: Promise<{ id: string }>;
};

type AnalyticsCacheEntry = {
  expiresAt: number;
  value: AnalyticsOverview;
};

const CACHE_TTL_MS = 60_000;
const CACHE_MAX_ENTRIES = 256;
const analyticsCache = new Map<string, AnalyticsCacheEntry>();
const datasetIdSchema = z.uuid();

function authorizationResponse(error: AuthorizationError) {
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

function getCachedAnalytics(datasetId: string): AnalyticsOverview | undefined {
  const entry = analyticsCache.get(datasetId);
  if (!entry) {
    return undefined;
  }
  if (entry.expiresAt <= Date.now()) {
    analyticsCache.delete(datasetId);
    return undefined;
  }
  return entry.value;
}

function setCachedAnalytics(datasetId: string, value: AnalyticsOverview) {
  if (analyticsCache.size >= CACHE_MAX_ENTRIES) {
    const now = Date.now();
    for (const [key, entry] of analyticsCache) {
      if (entry.expiresAt <= now) {
        analyticsCache.delete(key);
      }
    }
    if (analyticsCache.size >= CACHE_MAX_ENTRIES) {
      const oldestKey = analyticsCache.keys().next().value;
      if (oldestKey !== undefined) {
        analyticsCache.delete(oldestKey);
      }
    }
  }

  analyticsCache.set(datasetId, {
    expiresAt: Date.now() + CACHE_TTL_MS,
    value,
  });
}

async function loadAnalytics(datasetId: string): Promise<AnalyticsOverview> {
  const [
    [total],
    categories,
    statuses,
    countries,
    monthlyRows,
    activityRows,
    filterRows,
  ] = await Promise.all([
    db
      .select({
        recordCount: count(),
        revenueTotal: sql<string>`coalesce(sum(${datasetRecords.revenue}), 0)::text`,
      })
      .from(datasetRecords)
      .where(eq(datasetRecords.datasetId, datasetId)),
    db
      .select({
        category: datasetRecords.category,
        count: count(),
      })
      .from(datasetRecords)
      .where(eq(datasetRecords.datasetId, datasetId))
      .groupBy(datasetRecords.category)
      .orderBy(desc(count())),
    db
      .select({
        status: datasetRecords.status,
        count: count(),
      })
      .from(datasetRecords)
      .where(eq(datasetRecords.datasetId, datasetId))
      .groupBy(datasetRecords.status)
      .orderBy(desc(count())),
    db
      .select({
        country: datasetRecords.country,
        count: count(),
      })
      .from(datasetRecords)
      .where(eq(datasetRecords.datasetId, datasetId))
      .groupBy(datasetRecords.country)
      .orderBy(desc(count()))
      .limit(15),
    db
      .select({
        month: sql<string>`to_char(date_trunc('month', ${datasetRecords.createdAt}), 'YYYY-MM')`,
        count: count(),
      })
      .from(datasetRecords)
      .where(
        and(
          eq(datasetRecords.datasetId, datasetId),
          gte(
            datasetRecords.createdAt,
            sql`date_trunc('month', now()) - interval '11 months'`,
          ),
        ),
      )
      .groupBy(sql`date_trunc('month', ${datasetRecords.createdAt})`)
      .orderBy(sql`date_trunc('month', ${datasetRecords.createdAt})`),
    db
      .select({
        date: sql<string>`to_char(date_trunc('day', ${searchHistory.executedAt}), 'YYYY-MM-DD')`,
        searches: count(),
      })
      .from(searchHistory)
      .where(
        and(
          eq(searchHistory.datasetId, datasetId),
          gte(
            searchHistory.executedAt,
            sql`date_trunc('day', now()) - interval '29 days'`,
          ),
        ),
      )
      .groupBy(sql`date_trunc('day', ${searchHistory.executedAt})`)
      .orderBy(sql`date_trunc('day', ${searchHistory.executedAt})`),
    db
      .select({
        field: sql<string>`filter_item.value->>'field'`,
        operator: sql<string>`filter_item.value->>'operator'`,
        uses: count(),
      })
      .from(searchHistory)
      .crossJoin(
        sql`
        jsonb_array_elements(
          CASE
            WHEN jsonb_typeof(${searchHistory.query}->'conditions') = 'array'
            THEN ${searchHistory.query}->'conditions'
            ELSE '[]'::jsonb
          END
        ) AS filter_item(value)
      `,
      )
      .where(
        and(
          eq(searchHistory.datasetId, datasetId),
          sql`filter_item.value->>'field' IS NOT NULL`,
          sql`filter_item.value->>'operator' IS NOT NULL`,
        ),
      )
      .groupBy(
        sql`filter_item.value->>'field'`,
        sql`filter_item.value->>'operator'`,
      )
      .orderBy(
        desc(count()),
        asc(sql`filter_item.value->>'field'`),
        asc(sql`filter_item.value->>'operator'`),
      )
      .limit(10),
  ]);

  if (!total) {
    throw new Error("The analytics total aggregation returned no result.");
  }

  return {
    recordCount: total.recordCount,
    revenueTotal: total.revenueTotal,
    categoryBreakdown: categories.map((row) => ({
      category: row.category,
      count: row.count,
    })),
    statusBreakdown: statuses.map((row) => ({
      status: row.status,
      count: row.count,
    })),
    countryBreakdown: countries.map((row) => ({
      country: row.country,
      count: row.count,
    })),
    monthlyGrowth: monthlyRows.map((row) => ({
      month: row.month,
      count: row.count,
    })),
    searchActivity: activityRows.map((row) => ({
      date: row.date,
      searches: row.searches,
    })),
    mostUsedFilters: filterRows.map((row) => ({
      field: row.field,
      operator: row.operator,
      uses: row.uses,
    })),
  };
}

export async function GET(_request: Request, context: RouteContext) {
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
      return authorizationResponse(error);
    }
    throw error;
  }

  const cached = getCachedAnalytics(parsedDatasetId.data);
  if (cached) {
    return NextResponse.json(cached, {
      headers: { "Cache-Control": "private, max-age=60" },
    });
  }

  const analytics = await loadAnalytics(parsedDatasetId.data);
  setCachedAnalytics(parsedDatasetId.data, analytics);

  return NextResponse.json(analytics, {
    headers: { "Cache-Control": "private, max-age=60" },
  });
}

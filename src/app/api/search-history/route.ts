import { and, desc, eq, inArray, or } from "drizzle-orm";
import { NextResponse } from "next/server";
import { auth } from "../../../../auth";
import { hasDatasetPermission, isAppRole } from "@/lib/auth/roles";
import { searchHistoryLimitSchema } from "@/features/saved-views/server/schemas";
import { searchRequestSchema } from "@/features/search/server/buildQuery";
import { db } from "@/lib/db";
import {
  accessPermissions,
  datasets,
  roles,
  searchHistory,
  users,
} from "@/lib/db/schema";

export async function GET(request: Request) {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    return NextResponse.json(
      { error: "Sign-in is required.", code: "UNAUTHENTICATED" },
      { status: 401 },
    );
  }

  const rawLimit = new URL(request.url).searchParams.get("limit") ?? "50";
  const parsedLimit = searchHistoryLimitSchema.safeParse(rawLimit);

  if (!parsedLimit.success) {
    return NextResponse.json(
      { error: "limit must be an integer between 1 and 50." },
      { status: 400 },
    );
  }

  const [user] = await db
    .select({ roleId: users.roleId, role: roles.slug })
    .from(users)
    .innerJoin(roles, eq(users.roleId, roles.id))
    .where(eq(users.id, userId))
    .limit(1);

  if (!user || !isAppRole(user.role)) {
    return NextResponse.json(
      { error: "A valid user is required.", code: "UNAUTHENTICATED" },
      { status: 401 },
    );
  }

  const role = user.role;
  let accessibleDatasetIds: string[] | null = null;
  if (role !== "admin") {
    const grants = await db
      .select({
        datasetId: accessPermissions.datasetId,
        permission: accessPermissions.permission,
      })
      .from(accessPermissions)
      .where(
        or(
          eq(accessPermissions.roleId, user.roleId),
          eq(accessPermissions.userId, userId),
        ),
      );
    const grantsByDataset = new Map<string, typeof grants>();

    for (const grant of grants) {
      const datasetGrants = grantsByDataset.get(grant.datasetId) ?? [];
      datasetGrants.push(grant);
      grantsByDataset.set(grant.datasetId, datasetGrants);
    }

    accessibleDatasetIds = [...grantsByDataset]
      .filter(([, datasetGrants]) =>
        hasDatasetPermission(
          role,
          datasetGrants.map(({ permission }) => permission),
          "view",
        ),
      )
      .map(([datasetId]) => datasetId);

    if (accessibleDatasetIds.length === 0) {
      return NextResponse.json({ history: [] });
    }
  }

  const visibilityCondition = accessibleDatasetIds
    ? inArray(searchHistory.datasetId, accessibleDatasetIds)
    : undefined;
  const historyRows = await db
    .select({
      id: searchHistory.id,
      datasetId: datasets.id,
      datasetName: datasets.name,
      query: searchHistory.query,
      resultCount: searchHistory.resultCount,
      durationMs: searchHistory.durationMs,
      executedAt: searchHistory.executedAt,
    })
    .from(searchHistory)
    .innerJoin(datasets, eq(searchHistory.datasetId, datasets.id))
    .where(
      visibilityCondition
        ? and(eq(searchHistory.userId, userId), visibilityCondition)
        : eq(searchHistory.userId, userId),
    )
    .orderBy(desc(searchHistory.executedAt), desc(searchHistory.id))
    .limit(parsedLimit.data);

  const history = historyRows.flatMap((entry) => {
    const parsedQuery = searchRequestSchema.safeParse(entry.query);
    return parsedQuery.success ? [{ ...entry, query: parsedQuery.data }] : [];
  });

  return NextResponse.json({ history });
}

import { and, asc, eq, or } from "drizzle-orm";
import { NextResponse } from "next/server";
import { auth } from "../../../../auth";
import { isAppRole } from "@/lib/auth/roles";
import { db } from "@/lib/db";
import { accessPermissions, datasets, roles, users } from "@/lib/db/schema";

export async function GET() {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    return NextResponse.json(
      { error: "Sign-in is required.", code: "UNAUTHENTICATED" },
      { status: 401 },
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

  const datasetColumns = {
    id: datasets.id,
    name: datasets.name,
    slug: datasets.slug,
    description: datasets.description,
    category: datasets.category,
    recordCount: datasets.recordCount,
  };
  const visibleDatasets =
    user.role === "admin"
      ? await db
          .select(datasetColumns)
          .from(datasets)
          .orderBy(asc(datasets.name))
      : await db
          .selectDistinct(datasetColumns)
          .from(datasets)
          .innerJoin(
            accessPermissions,
            and(
              eq(accessPermissions.datasetId, datasets.id),
              or(
                eq(accessPermissions.roleId, user.roleId),
                eq(accessPermissions.userId, userId),
              ),
            ),
          )
          .orderBy(asc(datasets.name));

  return NextResponse.json({ datasets: visibleDatasets });
}

import { asc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { requireAdminAccess } from "@/features/admin/server/access";
import { db } from "@/lib/db";
import { roles, users } from "@/lib/db/schema";

export async function GET() {
  const access = await requireAdminAccess();
  if (!access.authorized) {
    return access.response;
  }

  const userRows = await db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      role: roles.slug,
      createdAt: users.createdAt,
    })
    .from(users)
    .innerJoin(roles, eq(users.roleId, roles.id))
    .orderBy(asc(users.name), asc(users.email));

  return NextResponse.json({ users: userRows });
}

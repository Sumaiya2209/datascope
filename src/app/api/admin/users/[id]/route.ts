import { count, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import {
  requireAdminAccess,
  parseAdminRequestBody,
} from "@/features/admin/server/access";
import { userRoleSchema } from "@/features/admin/server/schemas";
import { db } from "@/lib/db";
import { roles, users } from "@/lib/db/schema";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  const access = await requireAdminAccess();
  if (!access.authorized) {
    return access.response;
  }

  const { id } = await context.params;
  const parsedId = z.uuid().safeParse(id);
  if (!parsedId.success) {
    return NextResponse.json(
      { error: "User id must be a UUID." },
      { status: 400 },
    );
  }

  const body = await parseAdminRequestBody(request);
  if (body instanceof Response) {
    return body;
  }
  const parsed = userRoleSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "A valid user role is required.",
        details: parsed.error.flatten(),
      },
      { status: 400 },
    );
  }

  if (parsedId.data === access.userId) {
    return NextResponse.json(
      { error: "You cannot change your own administrator role." },
      { status: 409 },
    );
  }

  const result = await db.transaction(async (transaction) => {
    const [adminRole] = await transaction
      .select({ id: roles.id })
      .from(roles)
      .where(eq(roles.slug, "admin"))
      .for("update")
      .limit(1);

    if (!adminRole) {
      throw new Error('The required "admin" role is not configured.');
    }

    const [target] = await transaction
      .select({ id: users.id, role: roles.slug })
      .from(users)
      .innerJoin(roles, eq(users.roleId, roles.id))
      .where(eq(users.id, parsedId.data))
      .limit(1);

    if (!target) {
      return { kind: "not_found" as const };
    }

    const [newRole] = await transaction
      .select({ id: roles.id })
      .from(roles)
      .where(eq(roles.slug, parsed.data.role))
      .limit(1);

    if (!newRole) {
      throw new Error(`The "${parsed.data.role}" role is not configured.`);
    }

    if (target.role === "admin" && parsed.data.role !== "admin") {
      const [adminCount] = await transaction
        .select({ count: count() })
        .from(users)
        .where(eq(users.roleId, adminRole.id));

      if (adminCount && adminCount.count <= 1) {
        return { kind: "last_admin" as const };
      }
    }

    const [updated] = await transaction
      .update(users)
      .set({ roleId: newRole.id, updatedAt: new Date() })
      .where(eq(users.id, parsedId.data))
      .returning({
        id: users.id,
        email: users.email,
        name: users.name,
        createdAt: users.createdAt,
      });

    if (!updated) {
      return { kind: "conflict" as const };
    }

    return {
      kind: "updated" as const,
      user: { ...updated, role: parsed.data.role },
    };
  });

  if (result.kind === "not_found") {
    return NextResponse.json(
      { error: "User was not found.", code: "NOT_FOUND" },
      { status: 404 },
    );
  }
  if (result.kind === "last_admin") {
    return NextResponse.json(
      { error: "The last administrator cannot be demoted." },
      { status: 409 },
    );
  }
  if (result.kind === "conflict") {
    return NextResponse.json(
      { error: "User role changed concurrently. Refresh and retry." },
      { status: 409 },
    );
  }

  return NextResponse.json({ user: result.user });
}

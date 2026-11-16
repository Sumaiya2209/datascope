import "server-only";
import { and, eq, or } from "drizzle-orm";
import { auth } from "../../../auth";
import { accessPermissions, datasets, roles, users } from "@/lib/db/schema";
import { db } from "@/lib/db";
import {
  hasDatasetPermission,
  hasRequiredRole,
  isAppRole,
  type AppRole,
  type DatasetPermission,
} from "./roles";

export { hasDatasetPermission, hasRequiredRole };
export type { AppRole, DatasetPermission };

export class AuthorizationError extends Error {
  constructor(
    public readonly code: "UNAUTHENTICATED" | "FORBIDDEN" | "NOT_FOUND",
    message: string,
  ) {
    super(message);
    this.name = "AuthorizationError";
  }
}

export async function requireRole(
  ...allowedRoles: readonly AppRole[]
): Promise<{ id: string; role: AppRole }> {
  if (allowedRoles.length === 0) {
    throw new TypeError("requireRole needs at least one allowed role.");
  }

  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    throw new AuthorizationError("UNAUTHENTICATED", "Sign-in is required.");
  }

  const [user] = await db
    .select({ role: roles.slug })
    .from(users)
    .innerJoin(roles, eq(users.roleId, roles.id))
    .where(eq(users.id, userId))
    .limit(1);

  if (!user || !isAppRole(user.role)) {
    throw new AuthorizationError(
      "UNAUTHENTICATED",
      "A valid user is required.",
    );
  }

  if (!hasRequiredRole(user.role, allowedRoles)) {
    throw new AuthorizationError("FORBIDDEN", "Your role is not permitted.");
  }

  return { id: userId, role: user.role };
}

export async function requireDatasetAccess(
  userId: string,
  datasetId: string,
  requiredPermission: DatasetPermission = "view",
): Promise<{ userId: string; datasetId: string; role: AppRole }> {
  const [user] = await db
    .select({
      id: users.id,
      roleId: users.roleId,
      role: roles.slug,
    })
    .from(users)
    .innerJoin(roles, eq(users.roleId, roles.id))
    .where(eq(users.id, userId))
    .limit(1);

  if (!user || !isAppRole(user.role)) {
    throw new AuthorizationError(
      "UNAUTHENTICATED",
      "A valid user is required.",
    );
  }

  const [dataset] = await db
    .select({ id: datasets.id })
    .from(datasets)
    .where(eq(datasets.id, datasetId))
    .limit(1);

  if (!dataset) {
    throw new AuthorizationError("NOT_FOUND", "Dataset was not found.");
  }

  if (user.role === "admin") {
    return { userId, datasetId, role: user.role };
  }

  const grants = await db
    .select({ permission: accessPermissions.permission })
    .from(accessPermissions)
    .where(
      and(
        eq(accessPermissions.datasetId, datasetId),
        or(
          eq(accessPermissions.roleId, user.roleId),
          eq(accessPermissions.userId, userId),
        ),
      ),
    );

  if (
    !hasDatasetPermission(
      user.role,
      grants.map((grant) => grant.permission),
      requiredPermission,
    )
  ) {
    throw new AuthorizationError(
      "FORBIDDEN",
      "You do not have permission to access this dataset.",
    );
  }

  return { userId, datasetId, role: user.role };
}

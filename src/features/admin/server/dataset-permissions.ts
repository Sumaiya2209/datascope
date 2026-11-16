import { and, eq, inArray } from "drizzle-orm";
import { accessPermissions, roles } from "@/lib/db/schema";
import { db } from "@/lib/db";
import type { DatasetPermission } from "@/lib/auth/roles";

export type RoleGrants = {
  analyst: DatasetPermission | null;
  viewer: DatasetPermission | null;
};

type DbTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

export async function setRoleGrants(
  transaction: DbTransaction,
  datasetId: string,
  grants: RoleGrants,
) {
  const roleRows = await transaction
    .select({ id: roles.id, slug: roles.slug })
    .from(roles)
    .where(inArray(roles.slug, ["analyst", "viewer"]));
  const roleIds = new Map(roleRows.map((role) => [role.slug, role.id]));

  if (!roleIds.has("analyst") || !roleIds.has("viewer")) {
    throw new Error(
      "The analyst and viewer roles must exist before managing dataset permissions.",
    );
  }

  const permissionRoleIds = [
    roleIds.get("analyst"),
    roleIds.get("viewer"),
  ].filter((roleId): roleId is string => roleId !== undefined);
  await transaction
    .delete(accessPermissions)
    .where(
      and(
        eq(accessPermissions.datasetId, datasetId),
        inArray(accessPermissions.roleId, permissionRoleIds),
      ),
    );

  const permissionRows = (["analyst", "viewer"] as const).flatMap((slug) => {
    const permission = grants[slug];
    const roleId = roleIds.get(slug);
    return permission && roleId ? [{ datasetId, roleId, permission }] : [];
  });

  if (permissionRows.length > 0) {
    await transaction.insert(accessPermissions).values(permissionRows);
  }
}

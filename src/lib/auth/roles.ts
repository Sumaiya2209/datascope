export const appRoles = ["admin", "analyst", "viewer"] as const;

export type AppRole = (typeof appRoles)[number];
export type DatasetPermission = "view" | "edit" | "manage";

const permissionLevels: Record<DatasetPermission, number> = {
  view: 1,
  edit: 2,
  manage: 3,
};

const maximumRolePermission: Record<AppRole, number> = {
  admin: permissionLevels.manage,
  analyst: permissionLevels.edit,
  viewer: permissionLevels.view,
};

export function isAppRole(role: unknown): role is AppRole {
  return typeof role === "string" && appRoles.includes(role as AppRole);
}

export function hasRequiredRole(
  role: AppRole,
  allowedRoles: readonly AppRole[],
): boolean {
  return allowedRoles.includes(role);
}

export function hasDatasetPermission(
  role: AppRole,
  grants: readonly DatasetPermission[],
  requiredPermission: DatasetPermission = "view",
): boolean {
  if (role === "admin") {
    return true;
  }

  const requiredLevel = permissionLevels[requiredPermission];
  if (requiredLevel > maximumRolePermission[role]) {
    return false;
  }

  return grants.some((grant) => permissionLevels[grant] >= requiredLevel);
}

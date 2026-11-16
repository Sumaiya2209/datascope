import { describe, expect, it } from "vitest";
import { hasDatasetPermission, hasRequiredRole } from "./roles";

describe("role permissions", () => {
  it("restricts role-only actions to the explicitly allowed roles", () => {
    expect(hasRequiredRole("admin", ["admin"])).toBe(true);
    expect(hasRequiredRole("analyst", ["admin"])).toBe(false);
    expect(hasRequiredRole("viewer", ["admin", "analyst"])).toBe(false);
  });

  it("grants admins all dataset actions without individual grants", () => {
    expect(hasDatasetPermission("admin", [], "manage")).toBe(true);
  });

  it("allows analysts to read and edit granted datasets but not manage them", () => {
    expect(hasDatasetPermission("analyst", ["edit"], "view")).toBe(true);
    expect(hasDatasetPermission("analyst", ["edit"], "edit")).toBe(true);
    expect(hasDatasetPermission("analyst", ["manage"], "manage")).toBe(false);
    expect(hasDatasetPermission("analyst", [], "view")).toBe(false);
  });

  it("keeps viewers read-only even when a higher grant is present", () => {
    expect(hasDatasetPermission("viewer", ["view"], "view")).toBe(true);
    expect(hasDatasetPermission("viewer", ["edit"], "edit")).toBe(false);
    expect(hasDatasetPermission("viewer", ["manage"], "manage")).toBe(false);
  });
});

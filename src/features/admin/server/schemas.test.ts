import { describe, expect, it } from "vitest";
import {
  datasetCreateSchema,
  datasetUpdateSchema,
  userPreferencesSchema,
  userRoleSchema,
} from "./schemas";

describe("admin request schemas", () => {
  it("normalizes valid dataset metadata and rejects empty or unknown fields", () => {
    expect(
      datasetCreateSchema.parse({
        name: "  Customer records  ",
        category: "  Sales ",
        permissions: { analyst: "edit", viewer: "view" },
      }),
    ).toMatchObject({
      name: "Customer records",
      category: "Sales",
      permissions: { analyst: "edit", viewer: "view" },
    });

    expect(datasetCreateSchema.safeParse({ name: " " }).success).toBe(false);
    expect(
      datasetCreateSchema.safeParse({ name: "Customers", sql: "DROP" }).success,
    ).toBe(false);
    expect(datasetUpdateSchema.safeParse({}).success).toBe(false);
  });

  it("accepts only configured application roles", () => {
    expect(userRoleSchema.safeParse({ role: "analyst" }).success).toBe(true);
    expect(userRoleSchema.safeParse({ role: "owner" }).success).toBe(false);
    expect(
      userRoleSchema.safeParse({ role: "viewer", admin: true }).success,
    ).toBe(false);
  });

  it("applies preference defaults and validates page size, columns and uniqueness", () => {
    expect(userPreferencesSchema.parse({})).toMatchObject({
      theme: "system",
      defaultPageSize: 25,
    });

    expect(
      userPreferencesSchema.safeParse({
        defaultPageSize: 75,
        defaultColumns: ["name"],
      }).success,
    ).toBe(false);
    expect(
      userPreferencesSchema.safeParse({
        defaultColumns: ["name", "name"],
      }).success,
    ).toBe(false);
    expect(
      userPreferencesSchema.safeParse({
        defaultColumns: ["name; DROP TABLE users"],
      }).success,
    ).toBe(false);
  });
});

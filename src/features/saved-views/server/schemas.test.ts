import { describe, expect, it } from "vitest";
import { savedViewConfigurationSchema } from "./schemas";

describe("saved view configuration", () => {
  it("accepts a complete search and visible-column snapshot", () => {
    const result = savedViewConfigurationSchema.safeParse({
      search: "customer",
      conditions: [
        { field: "revenue", operator: "between", value: [100, 500] },
      ],
      sort: [{ field: "created_at", direction: "desc" }],
      page: 2,
      pageSize: 50,
      visibleColumns: ["name", "revenue"],
    });

    expect(result.success).toBe(true);
  });

  it("rejects filters that are incompatible with their field type", () => {
    const result = savedViewConfigurationSchema.safeParse({
      conditions: [{ field: "revenue", operator: "contains", value: "10" }],
    });

    expect(result.success).toBe(false);
  });

  it("rejects duplicate columns and unknown configuration keys", () => {
    expect(
      savedViewConfigurationSchema.safeParse({
        visibleColumns: ["name", "name"],
      }).success,
    ).toBe(false);
    expect(
      savedViewConfigurationSchema.safeParse({
        sql: "SELECT * FROM dataset_records",
      }).success,
    ).toBe(false);
  });
});

import { sql } from "drizzle-orm";
import { PgDialect } from "drizzle-orm/pg-core";
import { describe, expect, it } from "vitest";
import { buildOrderBy, buildQuery, searchRequestSchema } from "./buildQuery";

const dialect = new PgDialect();
const datasetId = "d1f6c971-90f4-49d5-92f0-857ee6263d42";

describe("search request query builder", () => {
  it("combines global search and typed filters using bound parameters", () => {
    const config = searchRequestSchema.parse({
      search: "Taylor Reed",
      conditions: [
        { field: "status", operator: "eq", value: "Active" },
        { field: "revenue", operator: "gte", value: 2500 },
      ],
      sort: [{ field: "created_at", direction: "desc" }],
      page: 2,
      pageSize: 50,
    });

    const query = dialect.sqlToQuery(buildQuery(datasetId, config));

    expect(query.sql).toContain("plainto_tsquery");
    expect(query.sql).toContain('"status" =');
    expect(query.sql).toContain('"revenue" >=');
    expect(query.sql).not.toContain("Taylor Reed");
    expect(query.params).toEqual([datasetId, "Taylor Reed", "Active", 2500]);
  });

  it("builds ordered multi-column sorting from the whitelist", () => {
    const config = searchRequestSchema.parse({
      conditions: [{ field: "name", operator: "contains", value: "Reed" }],
      sort: [
        { field: "revenue", direction: "desc" },
        { field: "created_at", direction: "asc" },
      ],
    });
    const orderBy = dialect.sqlToQuery(sql.join(buildOrderBy(config), sql`, `));

    expect(orderBy.sql.toLowerCase()).toContain(
      '"dataset_records"."revenue" desc',
    );
    expect(orderBy.sql.toLowerCase()).toContain(
      '"dataset_records"."created_at" asc',
    );
  });

  it("uses a bound ILIKE pattern for partial-match conditions", () => {
    const config = searchRequestSchema.parse({
      conditions: [{ field: "name", operator: "contains", value: "50%_off" }],
    });
    const query = dialect.sqlToQuery(buildQuery(datasetId, config));

    expect(query.sql.toLowerCase()).toContain("ilike");
    expect(query.sql).not.toContain("50%_off");
    expect(query.params).toContain("%50\\%\\_off%");
  });

  it("rejects malformed, unsupported, or oversized search input", () => {
    const invalidInputs = [
      { pageSize: 101 },
      { sort: [{ field: "extra", direction: "asc" }] },
      {
        conditions: [{ field: "revenue", operator: "contains", value: "100" }],
      },
      {
        conditions: [{ field: "revenue", operator: "between", value: [1] }],
      },
      { conditions: "[not valid json" },
    ];

    for (const input of invalidInputs) {
      expect(searchRequestSchema.safeParse(input).success).toBe(false);
    }
  });

  it("validates date ranges, duplicate sort fields, and large offsets", () => {
    expect(
      searchRequestSchema.safeParse({
        conditions: [
          {
            field: "created_at",
            operator: "between",
            value: ["not-a-date", "2025-01-01"],
          },
        ],
      }).success,
    ).toBe(false);
    expect(
      searchRequestSchema.safeParse({
        sort: [
          { field: "name", direction: "asc" },
          { field: "name", direction: "desc" },
        ],
      }).success,
    ).toBe(false);
    expect(
      searchRequestSchema.safeParse({
        page: Number.MAX_SAFE_INTEGER,
        pageSize: 100,
      }).success,
    ).toBe(false);
  });

  it("adds a deterministic id tie-breaker to sorting", () => {
    const config = searchRequestSchema.parse({
      sort: [{ field: "revenue", direction: "desc" }],
    });
    const orderBy = dialect.sqlToQuery(sql.join(buildOrderBy(config), sql`, `));

    expect(orderBy.sql.toLowerCase()).toContain('"dataset_records"."id" asc');
  });
});

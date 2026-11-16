import { describe, expect, it } from "vitest";
import {
  areConditionsValid,
  parseSearchDraft,
  serializeSearchDraft,
} from "./urlSearchConfig";
import type { SearchDraft } from "./searchConfigSlice";

describe("URL search configuration", () => {
  it("round-trips search, filters, sorting, and pagination", () => {
    const config: SearchDraft = {
      search: "Taylor Reed",
      conditions: [
        {
          field: "revenue",
          operator: "between",
          value: [1_000, 5_000],
        },
        {
          field: "created_at",
          operator: "gte",
          value: "2025-01-01",
        },
      ],
      sort: [{ field: "created_at", direction: "desc" }],
      page: 3,
      pageSize: 50,
    };

    const restored = parseSearchDraft(
      new URLSearchParams(serializeSearchDraft(config)),
    );

    expect(restored).toEqual(config);
    expect(areConditionsValid(restored.conditions)).toBe(true);
  });

  it("falls back safely when URL values are malformed or out of range", () => {
    const restored = parseSearchDraft(
      new URLSearchParams(
        "search=%20Taylor%20&conditions=not-json&sort=%7Bbad-json&page=0&pageSize=500",
      ),
    );

    expect(restored).toEqual({
      search: "Taylor",
      conditions: [],
      sort: [],
      page: 1,
      pageSize: 25,
    });
  });

  it("rejects incomplete or field-incompatible conditions", () => {
    expect(
      areConditionsValid([
        { field: "revenue", operator: "between", value: ["10", "20"] },
      ]),
    ).toBe(false);
    expect(
      areConditionsValid([
        { field: "created_at", operator: "contains", value: "2025" },
      ]),
    ).toBe(false);
    expect(
      areConditionsValid([
        { field: "status", operator: "eq", value: "Active" },
      ]),
    ).toBe(true);
  });
});

import { describe, expect, it } from "vitest";
import { draftUpdated, searchDraftApplied } from "./searchConfigSlice";
import searchConfigReducer from "./searchConfigSlice";

describe("searchConfigSlice", () => {
  it("keeps draft filters separate until they are applied", () => {
    const draft = searchConfigReducer(
      undefined,
      draftUpdated({
        search: "Taylor",
        conditions: [{ field: "status", operator: "eq", value: "Active" }],
      }),
    );

    expect(draft.applied).toBeNull();

    const applied = searchConfigReducer(draft, searchDraftApplied());
    const changed = searchConfigReducer(
      applied,
      draftUpdated({ search: "Reed" }),
    );

    expect(changed.draft.search).toBe("Reed");
    expect(changed.applied?.search).toBe("Taylor");
  });
});

import { describe, expect, it } from "vitest";
import uiPreferencesReducer, {
  datasetVisibleColumnsSet,
  densitySet,
  sidebarToggled,
  visibleColumnToggled,
} from "./uiPreferencesSlice";

describe("uiPreferencesSlice", () => {
  it("updates sidebar, density, and visible-column preferences", () => {
    const initial = uiPreferencesReducer(undefined, { type: "init" });
    const updated = uiPreferencesReducer(
      uiPreferencesReducer(
        uiPreferencesReducer(initial, sidebarToggled()),
        densitySet("compact"),
      ),
      visibleColumnToggled("email"),
    );

    expect(updated.sidebarCollapsed).toBe(true);
    expect(updated.density).toBe("compact");
    expect(updated.visibleColumns).not.toContain("email");
  });

  it("keeps dynamic visible columns scoped to each dataset", () => {
    const initial = uiPreferencesReducer(undefined, { type: "init" });
    const firstDataset = uiPreferencesReducer(
      initial,
      datasetVisibleColumnsSet({
        datasetId: "dataset-1",
        columns: ["status", "custom_field"],
      }),
    );
    const updated = uiPreferencesReducer(
      firstDataset,
      datasetVisibleColumnsSet({
        datasetId: "dataset-2",
        columns: ["email"],
      }),
    );

    expect(updated.visibleColumnsByDataset).toEqual({
      "dataset-1": ["status", "custom_field"],
      "dataset-2": ["email"],
    });
  });
});

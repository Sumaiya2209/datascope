import { describe, expect, it } from "vitest";
import datasetReducer, { datasetSelected } from "./datasetSlice";

describe("datasetSlice", () => {
  it("tracks the selected dataset id", () => {
    const state = datasetReducer(undefined, datasetSelected("dataset-1"));

    expect(state.selectedDatasetId).toBe("dataset-1");
    expect(datasetReducer(state, datasetSelected(null)).selectedDatasetId).toBe(
      null,
    );
  });
});

import { describe, expect, it } from "vitest";
import { makeStore } from "./index";

describe("Redux store configuration", () => {
  it("registers client-state slices and RTK Query without a records slice", () => {
    const state = makeStore().getState();

    expect(state).toHaveProperty("auth");
    expect(state).toHaveProperty("dataset");
    expect(state).toHaveProperty("searchConfig");
    expect(state).toHaveProperty("savedViews");
    expect(state).toHaveProperty("uiPreferences");
    expect(state).toHaveProperty("api");
    expect(state).not.toHaveProperty("records");
  });
});

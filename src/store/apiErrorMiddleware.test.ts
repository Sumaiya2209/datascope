import { describe, expect, it } from "vitest";
import { getApiErrorMessage } from "./apiErrorMiddleware";

describe("getApiErrorMessage", () => {
  it("prefers API error details and falls back for unknown failures", () => {
    expect(
      getApiErrorMessage({
        status: 400,
        data: { error: "Invalid search configuration." },
      }),
    ).toBe("Invalid search configuration.");
    expect(getApiErrorMessage({ status: "FETCH_ERROR" })).toBe(
      "The request failed. Please try again.",
    );
  });
});

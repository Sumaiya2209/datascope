import { describe, expect, it } from "vitest";
import authReducer, { authCleared, authUserUpdated } from "./authSlice";

describe("authSlice", () => {
  it("keeps only the authenticated user id and role", () => {
    const state = authReducer(
      undefined,
      authUserUpdated({ userId: "user-1", role: "analyst" }),
    );

    expect(state).toEqual({
      userId: "user-1",
      role: "analyst",
      status: "authenticated",
    });
  });

  it("clears user state on sign-out", () => {
    const state = authReducer(
      { userId: "user-1", role: "viewer", status: "authenticated" },
      authCleared(),
    );

    expect(state).toEqual({
      userId: null,
      role: null,
      status: "unauthenticated",
    });
  });
});

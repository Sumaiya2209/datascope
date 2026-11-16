import { afterEach, describe, expect, it, vi } from "vitest";
import { configureTestDatabase } from "../scripts/test-database";

describe("test database guard", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("does not fall back to the application database URL", () => {
    vi.stubEnv("DATABASE_URL", "postgres://app:secret@localhost/app");
    vi.stubEnv("TEST_DATABASE_URL", "");

    expect(() => configureTestDatabase()).toThrow(
      "TEST_DATABASE_URL is required",
    );
  });

  it("refuses database names that are not explicitly test databases", () => {
    vi.stubEnv("TEST_DATABASE_URL", "postgres://test:test@localhost/datascope");

    expect(() => configureTestDatabase()).toThrow(
      "must target a database whose name ends in _test",
    );
  });

  it("selects only the explicitly configured PostgreSQL test database", () => {
    const testUrl = "postgres://test:test@localhost:5433/datascope_test";
    vi.stubEnv("TEST_DATABASE_URL", testUrl);
    vi.stubEnv("DATABASE_URL", "postgres://app:secret@localhost/app");

    expect(configureTestDatabase()).toBe(testUrl);
    expect(process.env.DATABASE_URL).toBe(testUrl);
  });
});

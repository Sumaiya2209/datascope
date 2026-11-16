import { beforeEach, describe, expect, it, vi } from "vitest";

const database = vi.hoisted(() => ({
  select: vi.fn(),
  from: vi.fn(),
  where: vi.fn(),
  limit: vi.fn(),
}));

vi.mock("@/lib/db", () => ({ db: { select: database.select } }));

import { POST } from "./route";

function registrationRequest() {
  return new Request("http://localhost/api/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: "Test User",
      email: "test@example.com",
      password: "A-long-test-password-123",
    }),
  });
}

describe("POST /api/register", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    database.select.mockReturnValue({ from: database.from });
    database.from.mockReturnValue({ where: database.where });
    database.where.mockReturnValue({ limit: database.limit });
  });

  it("returns a setup error when the viewer role is missing", async () => {
    database.limit.mockResolvedValue([]);

    const response = await POST(registrationRequest());

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toMatchObject({
      error: expect.stringContaining("db:seed"),
    });
  });

  it("returns a service error when the database cannot be reached", async () => {
    database.limit.mockRejectedValue(new Error("connection refused"));
    const logError = vi.spyOn(console, "error").mockImplementation(() => {});

    const response = await POST(registrationRequest());

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toMatchObject({
      error: expect.stringContaining("database could not be reached"),
    });
    expect(logError).toHaveBeenCalledOnce();
    logError.mockRestore();
  });
});

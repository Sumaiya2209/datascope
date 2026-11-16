import { expect, test } from "@playwright/test";

test("home page responds successfully", async ({ page }) => {
  const response = await page.goto("/");

  expect(response?.ok()).toBe(true);
});

import { expect, test } from "@playwright/test";

test("home page responds successfully", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const response = await page.goto("/");

  expect(response?.ok()).toBe(true);
  await expect(
    page.getByRole("heading", { name: /make your data/i }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: /get started/i })).toBeVisible();

  const documentWidth = await page.evaluate(
    () => document.documentElement.scrollWidth,
  );
  expect(documentWidth).toBeLessThanOrEqual(390);
});

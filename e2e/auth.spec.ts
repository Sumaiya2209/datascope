import { expect, test } from "@playwright/test";

test("login and registration pages are public", async ({ page }) => {
  await page.goto("/login");
  await expect(
    page.getByRole("heading", { name: "Sign in", exact: true }),
  ).toBeVisible();

  await page.goto("/register");
  await expect(
    page.getByRole("heading", { name: "Create an account" }),
  ).toBeVisible();

  await page.goto("/login?registered=1");
  await expect(page.getByRole("status")).toHaveText(
    "Account created. You can sign in now.",
  );
});

test("protected pages redirect unauthenticated visitors to login", async ({
  page,
}) => {
  await page.goto("/overview");

  await expect(page).toHaveURL(/\/login\?callbackUrl=.*overview/);
  await expect(
    page.getByRole("heading", { name: "Sign in", exact: true }),
  ).toBeVisible();
});

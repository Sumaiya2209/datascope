import { expect, test } from "@playwright/test";

test("login, search, filter records, and apply a saved view", async ({
  page,
}) => {
  const email = process.env.E2E_TEST_EMAIL;
  const password = process.env.E2E_TEST_PASSWORD;
  const datasetId = process.env.E2E_TEST_DATASET_ID;
  expect(email).toBeTruthy();
  expect(password).toBeTruthy();
  expect(datasetId).toBeTruthy();

  await page.goto("/login");
  await page.getByLabel("Email").fill(email!);
  await page.getByLabel("Password").fill(password!);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/overview(?:\?|$)/, { timeout: 20_000 });

  await page.goto("/explorer");
  await page.getByLabel("Select dataset").selectOption(datasetId!);

  const search = page.getByRole("textbox", { name: "Search records" });
  await search.fill("Target");
  await expect(page.getByText("E2E Target Alpha")).toBeVisible({
    timeout: 20_000,
  });
  await expect(page.getByText("E2E Target Beta")).toBeVisible();

  await page.getByRole("button", { name: "Add condition" }).click();
  await page.getByLabel("Condition 1 field").selectOption("status");
  await page.getByLabel("Condition 1 operator").selectOption("eq");
  await page.getByLabel("Condition 1 value").fill("Active");
  await page.getByRole("button", { name: "Apply search" }).click();
  await expect(page.getByText("E2E Target Alpha")).toBeVisible({
    timeout: 20_000,
  });
  await expect(page.getByText("E2E Target Beta")).toHaveCount(0);

  const viewName = `E2E Active Targets ${Date.now()}`;
  await page.getByRole("button", { name: "Save current view" }).click();
  await page.getByLabel("View name").fill(viewName);
  await page.getByRole("button", { name: "Create view" }).click();
  const savedView = page.getByRole("listitem").filter({ hasText: viewName });
  await expect(savedView).toBeVisible({ timeout: 20_000 });

  await page.getByLabel("Condition 1 value").fill("Pending");
  await page.getByRole("button", { name: "Apply search" }).click();
  await expect(page.getByText("E2E Target Beta")).toBeVisible({
    timeout: 20_000,
  });
  await expect(page.getByText("E2E Target Alpha")).toHaveCount(0);

  await savedView.getByRole("button", { name: "Apply" }).click();
  await expect(page.getByLabel("Condition 1 value")).toHaveValue("Active");
  await expect(page.getByText("E2E Target Alpha")).toBeVisible({
    timeout: 20_000,
  });
  await expect(page.getByText("E2E Target Beta")).toHaveCount(0);
  await expect(page).toHaveURL(/search=Target/);
});

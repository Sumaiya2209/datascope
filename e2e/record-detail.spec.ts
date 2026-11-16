import { expect, test } from "@playwright/test";

test("record detail endpoints require dataset authorization", async ({
  request,
}) => {
  const datasetId = "00000000-0000-4000-8000-000000000001";
  const recordId = "00000000-0000-4000-8000-000000000002";
  const paths = [
    `/api/datasets/${datasetId}/records/${recordId}`,
    `/api/datasets/${datasetId}/records/${recordId}/relationships`,
    `/api/datasets/${datasetId}/records/${recordId}/history`,
  ];

  for (const path of paths) {
    const response = await request.get(path);
    expect(response.status()).toBe(401);
  }
});

test("saved views and search history require authentication", async ({
  request,
}) => {
  const datasetId = "00000000-0000-4000-8000-000000000001";

  const savedViewsResponse = await request.get(
    `/api/datasets/${datasetId}/saved-views`,
  );
  const searchHistoryResponse = await request.get("/api/search-history");

  expect(savedViewsResponse.status()).toBe(401);
  expect(searchHistoryResponse.status()).toBe(401);
});

test("analytics endpoint and page require dataset authorization", async ({
  request,
  page,
}) => {
  const datasetId = "00000000-0000-4000-8000-000000000001";
  const response = await request.get(`/api/datasets/${datasetId}/analytics`);

  expect(response.status()).toBe(401);

  await page.goto("/analytics");
  await expect(page).toHaveURL(/\/login\?callbackUrl=/);
});

test("admin APIs and user settings require authentication", async ({
  request,
  page,
}) => {
  const adminDatasets = await request.get("/api/admin/datasets");
  const adminUsers = await request.get("/api/admin/users");
  const preferences = await request.get("/api/user/preferences");

  expect(adminDatasets.status()).toBe(401);
  expect(adminUsers.status()).toBe(401);
  expect(preferences.status()).toBe(401);

  await page.goto("/admin/datasets");
  await expect(page).toHaveURL(/\/login\?callbackUrl=/);
  await page.goto("/admin/users");
  await expect(page).toHaveURL(/\/login\?callbackUrl=/);
  await page.goto("/settings");
  await expect(page).toHaveURL(/\/login\?callbackUrl=/);
});

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

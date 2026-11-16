import { afterEach, describe, expect, it, vi } from "vitest";
import { dataApi } from "./dataApi";
import type { AdminDataset, DatasetDetail, SavedView } from "./types";
import { makeStore } from "@/store";

const datasetId = "dataset-cache-test";
const secondDatasetId = "dataset-cache-other";

class RelativeRequest extends Request {
  constructor(input: RequestInfo | URL, init?: RequestInit) {
    super(
      typeof input === "string" ? new URL(input, "http://localhost") : input,
      init,
    );
  }
}

function dataset(id: string): AdminDataset {
  return {
    id,
    name: `Dataset ${id}`,
    slug: id,
    description: null,
    category: null,
    recordCount: 2,
    dataSource: null,
    createdAt: "2025-01-01T00:00:00.000Z",
    updatedAt: "2025-01-01T00:00:00.000Z",
    permissions: { analyst: "edit", viewer: "view" },
  };
}

function datasetDetail(id: string): DatasetDetail {
  return { ...dataset(id), fields: [] };
}

function savedView(id: string): SavedView {
  return {
    id,
    datasetId,
    ownerId: "test-user",
    ownerName: "Test User",
    name: "Test view",
    description: null,
    configuration: { search: "sample" },
    isShared: false,
    createdAt: "2025-01-01T00:00:00.000Z",
    updatedAt: "2025-01-01T00:00:00.000Z",
  };
}

describe("RTK Query cache invalidation", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("refetches subscribed dataset lists and detail after a dataset update", async () => {
    const calls = new Map<string, number>();
    const firstDataset = dataset(datasetId);
    const fetchMock = vi.fn(
      async (input: RequestInfo | URL, init?: RequestInit) => {
        const requestUrl = new URL(
          typeof input === "string" || input instanceof URL
            ? input.toString()
            : input.url,
          "http://localhost",
        );
        const method =
          init?.method ??
          (typeof input === "string" || input instanceof URL
            ? "GET"
            : input.method);
        const key = `${method} ${requestUrl.pathname}`;
        calls.set(key, (calls.get(key) ?? 0) + 1);

        let body: unknown;
        if (requestUrl.pathname === "/api/datasets") {
          body = { datasets: [firstDataset] };
        } else if (requestUrl.pathname === "/api/admin/datasets") {
          body = { datasets: [firstDataset] };
        } else if (requestUrl.pathname === `/api/datasets/${datasetId}`) {
          body = { dataset: datasetDetail(datasetId) };
        } else if (method === "PATCH") {
          body = { dataset: firstDataset };
        } else {
          throw new Error(`Unexpected request: ${key}`);
        }

        return new Response(JSON.stringify(body), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      },
    );
    vi.stubGlobal("Request", RelativeRequest);
    vi.stubGlobal("fetch", fetchMock);
    const store = makeStore();

    await Promise.all([
      store.dispatch(dataApi.endpoints.getDatasets.initiate()).unwrap(),
      store.dispatch(dataApi.endpoints.getAdminDatasets.initiate()).unwrap(),
      store
        .dispatch(dataApi.endpoints.getDataset.initiate({ datasetId }))
        .unwrap(),
    ]);

    await store
      .dispatch(
        dataApi.endpoints.updateAdminDataset.initiate({
          datasetId,
          changes: { name: "Renamed dataset" },
        }),
      )
      .unwrap();

    await vi.waitFor(() => {
      expect(calls.get("GET /api/datasets")).toBe(2);
      expect(calls.get("GET /api/admin/datasets")).toBe(2);
      expect(calls.get(`GET /api/datasets/${datasetId}`)).toBe(2);
    });
  });

  it("invalidates saved views only for the mutated dataset", async () => {
    const calls = new Map<string, number>();
    const fetchMock = vi.fn(
      async (input: RequestInfo | URL, init?: RequestInit) => {
        const requestUrl = new URL(
          typeof input === "string" || input instanceof URL
            ? input.toString()
            : input.url,
          "http://localhost",
        );
        const method =
          init?.method ??
          (typeof input === "string" || input instanceof URL
            ? "GET"
            : input.method);
        const key = `${method} ${requestUrl.pathname}`;
        calls.set(key, (calls.get(key) ?? 0) + 1);
        const body =
          method === "POST"
            ? { view: savedView("created-view") }
            : { views: [] };

        return new Response(JSON.stringify(body), {
          status: method === "POST" ? 201 : 200,
          headers: { "content-type": "application/json" },
        });
      },
    );
    vi.stubGlobal("Request", RelativeRequest);
    vi.stubGlobal("fetch", fetchMock);
    const store = makeStore();

    await Promise.all([
      store
        .dispatch(dataApi.endpoints.getSavedViews.initiate({ datasetId }))
        .unwrap(),
      store
        .dispatch(
          dataApi.endpoints.getSavedViews.initiate({
            datasetId: secondDatasetId,
          }),
        )
        .unwrap(),
    ]);

    await store
      .dispatch(
        dataApi.endpoints.createSavedView.initiate({
          datasetId,
          name: "New view",
          configuration: { search: "sample" },
        }),
      )
      .unwrap();

    await vi.waitFor(() => {
      expect(calls.get(`GET /api/datasets/${datasetId}/saved-views`)).toBe(2);
      expect(
        calls.get(`GET /api/datasets/${secondDatasetId}/saved-views`),
      ).toBe(1);
    });
  });
});

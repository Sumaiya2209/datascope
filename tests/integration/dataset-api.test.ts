import { randomUUID } from "node:crypto";
import { and, eq, inArray } from "drizzle-orm";
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import type { Session } from "next-auth";
import type { Mock } from "vitest";

vi.mock("../../auth", () => ({ auth: vi.fn() }));
vi.mock("server-only", () => ({}));

import { auth } from "../../auth";
import {
  DELETE as deleteSavedView,
  PATCH as updateSavedView,
} from "../../src/app/api/datasets/[id]/saved-views/[viewId]/route";
import {
  GET as getSavedViews,
  POST as createSavedView,
} from "../../src/app/api/datasets/[id]/saved-views/route";
import { POST as searchRecords } from "../../src/app/api/datasets/[id]/records/route";
import {
  AuthorizationError,
  requireDatasetAccess,
} from "../../src/lib/auth/permissions";
import { client, db } from "../../src/lib/db/client";
import {
  accessPermissions,
  datasetFields,
  datasetRecords,
  datasets,
  queryLogs,
  roles,
  savedViews,
  searchHistory,
  users,
} from "../../src/lib/db/schema";

const analystEmail = `integration-analyst-${randomUUID()}@example.test`;
const viewerEmail = `integration-viewer-${randomUUID()}@example.test`;
const restrictedEmail = `integration-restricted-${randomUUID()}@example.test`;
const datasetSlug = `integration-${randomUUID().replaceAll("-", "")}`;

let analystId: string;
let viewerId: string;
let restrictedId: string;
let datasetId: string;
let savedViewId: string;
let analystRoleId: string;
let viewerRoleId: string;
let sessionUserId: string | null = null;
const rolesCreatedBySuite: string[] = [];

const mockedAuth = auth as unknown as Mock<() => Promise<Session | null>>;
mockedAuth.mockImplementation(async () => {
  if (!sessionUserId) {
    return null;
  }
  return {
    user: {
      id: sessionUserId,
      email: analystEmail,
      name: "Integration analyst",
      role: "analyst",
    },
    expires: new Date(Date.now() + 60_000).toISOString(),
  } satisfies Session;
});

function routeContext<
  TParams extends { id: string } | { id: string; viewId: string },
>(params: TParams) {
  return { params: Promise.resolve(params) };
}

function jsonRequest(url: string, body: unknown) {
  return new Request(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

async function createUser(roleId: string, email: string, name: string) {
  const [user] = await db
    .insert(users)
    .values({ roleId, email, name })
    .returning({ id: users.id });
  if (!user) {
    throw new Error(`Failed to insert integration user ${email}.`);
  }
  return user.id;
}

describe("dataset and saved-view API integration", () => {
  beforeAll(async () => {
    const roleRows: Array<{ slug: string; id: string }> = [];
    for (const { name, slug } of [
      { name: "Integration Analyst", slug: "analyst" },
      { name: "Integration Viewer", slug: "viewer" },
    ]) {
      let [role] = await db
        .select({ id: roles.id })
        .from(roles)
        .where(eq(roles.slug, slug))
        .limit(1);
      if (!role) {
        [role] = await db
          .insert(roles)
          .values({ name, slug })
          .onConflictDoNothing({ target: roles.slug })
          .returning({ id: roles.id });
        if (role) {
          rolesCreatedBySuite.push(role.id);
        } else {
          [role] = await db
            .select({ id: roles.id })
            .from(roles)
            .where(eq(roles.slug, slug))
            .limit(1);
        }
      }
      if (!role) {
        throw new Error(`The "${slug}" role could not be loaded.`);
      }
      roleRows.push({ slug, id: role.id });
    }
    analystRoleId = roleRows.find(({ slug }) => slug === "analyst")!.id;
    viewerRoleId = roleRows.find(({ slug }) => slug === "viewer")!.id;

    analystId = await createUser(
      analystRoleId,
      analystEmail,
      "Integration analyst",
    );
    viewerId = await createUser(
      viewerRoleId,
      viewerEmail,
      "Integration viewer",
    );
    restrictedId = await createUser(
      viewerRoleId,
      restrictedEmail,
      "Restricted viewer",
    );

    const [dataset] = await db
      .insert(datasets)
      .values({
        name: "Integration API Dataset",
        slug: datasetSlug,
        description: "Isolated fixtures for API integration tests.",
        createdBy: analystId,
      })
      .returning({ id: datasets.id });
    if (!dataset) {
      throw new Error("The integration dataset could not be created.");
    }
    datasetId = dataset.id;

    await db.insert(accessPermissions).values([
      {
        datasetId,
        roleId: analystRoleId,
        permission: "edit",
      },
      {
        datasetId,
        userId: viewerId,
        permission: "view",
      },
    ]);

    await db.insert(datasetFields).values(
      [
        ["status", "Status", "string"],
        ["country", "Country", "string"],
        ["category", "Category", "string"],
        ["revenue", "Revenue", "number"],
        ["created_at", "Created at", "datetime"],
        ["name", "Name", "string"],
        ["email", "Email", "string"],
      ].map(([name, label, dataType], position) => ({
        datasetId,
        name: name!,
        label: label!,
        dataType: dataType!,
        isSearchable: true,
        isFilterable: true,
        isSortable: true,
        position,
      })),
    );

    await db.insert(datasetRecords).values([
      {
        datasetId,
        status: "Active",
        country: "United States",
        category: "Integration",
        revenue: "100.00",
        createdAt: new Date("2025-01-01T00:00:00Z"),
        name: "Integration Target Alpha",
        email: "alpha@example.test",
      },
      {
        datasetId,
        status: "Active",
        country: "United States",
        category: "Integration",
        revenue: "200.00",
        createdAt: new Date("2025-02-01T00:00:00Z"),
        name: "Integration Target Beta",
        email: "beta@example.test",
      },
      {
        datasetId,
        status: "Active",
        country: "Canada",
        category: "Integration",
        revenue: "300.00",
        createdAt: new Date("2025-03-01T00:00:00Z"),
        name: "Integration Target Excluded",
        email: "excluded@example.test",
      },
    ]);
  });

  beforeEach(() => {
    sessionUserId = analystId ?? null;
  });

  afterAll(async () => {
    const fixtureIds = [analystId, viewerId, restrictedId].filter(
      (id): id is string => Boolean(id),
    );
    if (fixtureIds.length > 0) {
      await db
        .delete(searchHistory)
        .where(inArray(searchHistory.userId, fixtureIds));
      await db.delete(queryLogs).where(inArray(queryLogs.userId, fixtureIds));
    }
    if (datasetId) {
      await db.delete(datasets).where(eq(datasets.id, datasetId));
    }
    if (fixtureIds.length > 0) {
      await db.delete(users).where(inArray(users.id, fixtureIds));
    }
    if (rolesCreatedBySuite.length > 0) {
      await db.delete(roles).where(inArray(roles.id, rolesCreatedBySuite));
    }
    await client.end();
  });

  it("returns 401 for anonymous requests and 403 without dataset access", async () => {
    sessionUserId = null;
    const anonymousResponse = await searchRecords(
      jsonRequest("http://localhost/api/records", { search: "Target" }),
      routeContext({ id: datasetId }),
    );
    expect(anonymousResponse.status).toBe(401);

    sessionUserId = restrictedId;
    const forbiddenResponse = await searchRecords(
      jsonRequest("http://localhost/api/records", { search: "Target" }),
      routeContext({ id: datasetId }),
    );
    expect(forbiddenResponse.status).toBe(403);
  });

  it("enforces dataset grants directly against PostgreSQL", async () => {
    await expect(
      requireDatasetAccess(analystId, datasetId, "edit"),
    ).resolves.toMatchObject({ userId: analystId, datasetId, role: "analyst" });

    await expect(
      requireDatasetAccess(restrictedId, datasetId),
    ).rejects.toMatchObject({
      code: "FORBIDDEN",
    } satisfies Partial<AuthorizationError>);
  });

  it("combines global search and filters, sorts results, and paginates", async () => {
    const requestBody = {
      search: "Target",
      conditions: [
        { field: "status", operator: "eq", value: "Active" },
        { field: "country", operator: "eq", value: "United States" },
      ],
      sort: [{ field: "revenue", direction: "desc" }],
      pageSize: 1,
    };

    const firstResponse = await searchRecords(
      jsonRequest("http://localhost/api/records", requestBody),
      routeContext({ id: datasetId }),
    );
    expect(firstResponse.status).toBe(200);
    const firstPage = await firstResponse.json();
    expect(firstPage).toMatchObject({
      page: 1,
      pageSize: 1,
      total: 2,
      hasMore: true,
    });
    expect(
      firstPage.records.map((record: { name: string }) => record.name),
    ).toEqual(["Integration Target Beta"]);

    const secondResponse = await searchRecords(
      jsonRequest("http://localhost/api/records", {
        ...requestBody,
        page: 2,
      }),
      routeContext({ id: datasetId }),
    );
    const secondPage = await secondResponse.json();
    expect(secondPage).toMatchObject({
      page: 2,
      pageSize: 1,
      total: 2,
      hasMore: false,
    });
    expect(
      secondPage.records.map((record: { name: string }) => record.name),
    ).toEqual(["Integration Target Alpha"]);
  });

  it("returns empty results for empty searches and rejects invalid pagination", async () => {
    const emptyResponse = await searchRecords(
      jsonRequest("http://localhost/api/records", {}),
      routeContext({ id: datasetId }),
    );
    expect(emptyResponse.status).toBe(200);
    expect(await emptyResponse.json()).toMatchObject({
      records: [],
      total: 0,
      hasMore: false,
    });

    const invalidResponse = await searchRecords(
      jsonRequest("http://localhost/api/records", {
        search: "Target",
        pageSize: 101,
      }),
      routeContext({ id: datasetId }),
    );
    expect(invalidResponse.status).toBe(400);
  });

  it("creates, shares, updates, and deletes saved views with access controls", async () => {
    const createResponse = await createSavedView(
      jsonRequest("http://localhost/api/saved-views", {
        name: "Integration active targets",
        isShared: true,
        configuration: {
          search: "Target",
          conditions: [{ field: "status", operator: "eq", value: "Active" }],
          sort: [{ field: "revenue", direction: "desc" }],
          page: 1,
          pageSize: 25,
          visibleColumns: ["name", "status", "revenue"],
        },
      }),
      routeContext({ id: datasetId }),
    );
    expect(createResponse.status).toBe(201);
    const created = await createResponse.json();
    savedViewId = created.view.id;
    expect(created.view).toMatchObject({
      name: "Integration active targets",
      isShared: true,
      ownerId: analystId,
    });

    sessionUserId = viewerId;
    const sharedViewsResponse = await getSavedViews(
      new Request("http://localhost/api/saved-views"),
      routeContext({ id: datasetId }),
    );
    expect(sharedViewsResponse.status).toBe(200);
    expect((await sharedViewsResponse.json()).views).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: savedViewId,
          name: "Integration active targets",
        }),
      ]),
    );

    sessionUserId = restrictedId;
    const restrictedViewsResponse = await getSavedViews(
      new Request("http://localhost/api/saved-views"),
      routeContext({ id: datasetId }),
    );
    expect(restrictedViewsResponse.status).toBe(403);

    sessionUserId = analystId;
    const updateResponse = await updateSavedView(
      jsonRequest("http://localhost/api/saved-views", {
        name: "Integration targets updated",
      }),
      routeContext({ id: datasetId, viewId: savedViewId }),
    );
    expect(updateResponse.status).toBe(200);
    expect((await updateResponse.json()).view.name).toBe(
      "Integration targets updated",
    );

    const deleteResponse = await deleteSavedView(
      new Request("http://localhost/api/saved-views", { method: "DELETE" }),
      routeContext({ id: datasetId, viewId: savedViewId }),
    );
    expect(deleteResponse.status).toBe(204);

    const [remainingView] = await db
      .select({ id: savedViews.id })
      .from(savedViews)
      .where(
        and(
          eq(savedViews.id, savedViewId),
          eq(savedViews.datasetId, datasetId),
        ),
      )
      .limit(1);
    expect(remainingView).toBeUndefined();
  });
});

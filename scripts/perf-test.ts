import "dotenv/config";
import { randomBytes } from "node:crypto";
import { spawn, type ChildProcess } from "node:child_process";
import { createServer } from "node:net";
import { resolve } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { faker } from "@faker-js/faker";
import { chromium } from "@playwright/test";
import { encode } from "next-auth/jwt";
import { count, eq } from "drizzle-orm";

const RECORD_COUNT = 1_000_000;
const BATCH_SIZE = 5_000;
const PERF_DATASET_SLUG = "performance-benchmark";
const PERF_ADMIN_EMAIL = "perf-admin@datascope.local";
const REPORT_PATH = resolve(process.cwd(), "docs", "performance-report.md");
const RESULTS_START = "<!-- PERFORMANCE_RESULTS_START -->";
const RESULTS_END = "<!-- PERFORMANCE_RESULTS_END -->";

type ExplainSummary = {
  label: string;
  planningMs: number;
  executionMs: number;
  sharedHitBlocks: number;
  sharedReadBlocks: number;
  planNodes: string;
};

function getPerfDatabaseUrl(): string {
  const databaseUrl = process.env.PERF_DATABASE_URL;
  if (!databaseUrl) {
    throw new Error(
      "PERF_DATABASE_URL is required. The benchmark never falls back to DATABASE_URL.",
    );
  }
  if (process.env.CONFIRM_PERF_SEED !== "1") {
    throw new Error(
      "Set CONFIRM_PERF_SEED=1 to confirm that the dedicated performance database may be reset and seeded.",
    );
  }

  const parsedUrl = new URL(databaseUrl);
  const databaseName = decodeURIComponent(parsedUrl.pathname.slice(1));
  if (
    !["postgres:", "postgresql:"].includes(parsedUrl.protocol) ||
    !databaseName.endsWith("_perf")
  ) {
    throw new Error(
      "PERF_DATABASE_URL must point to a PostgreSQL database whose name ends in _perf.",
    );
  }

  return databaseUrl;
}

function getPort(): number {
  const port = Number(process.env.PERF_PORT ?? 3102);
  if (!Number.isInteger(port) || port < 1024 || port > 65535) {
    throw new Error("PERF_PORT must be an integer between 1024 and 65535.");
  }
  return port;
}

async function assertPortAvailable(port: number): Promise<void> {
  await new Promise<void>((resolvePromise, rejectPromise) => {
    const server = createServer();
    server.once("error", (error: NodeJS.ErrnoException) => {
      rejectPromise(
        error.code === "EADDRINUSE"
          ? new Error(
              `Performance port ${port} is already in use. Set PERF_PORT to an available port.`,
            )
          : error,
      );
    });
    server.listen(port, "127.0.0.1", () => {
      server.close((error) => {
        if (error) {
          rejectPromise(error);
        } else {
          resolvePromise();
        }
      });
    });
  });
}

async function seedPerformanceData(
  db: typeof import("../src/lib/db/client").db,
  schema: typeof import("../src/lib/db/schema"),
) {
  const [role] = await db
    .insert(schema.roles)
    .values({
      name: "Administrator",
      slug: "admin",
      description: "Performance benchmark administrator.",
    })
    .onConflictDoUpdate({
      target: schema.roles.slug,
      set: {
        name: "Administrator",
        description: "Performance benchmark administrator.",
      },
    })
    .returning({ id: schema.roles.id });

  if (!role) {
    throw new Error("Could not create or load the benchmark admin role.");
  }

  const [user] = await db
    .insert(schema.users)
    .values({
      roleId: role.id,
      email: PERF_ADMIN_EMAIL,
      name: "Performance Benchmark Admin",
    })
    .onConflictDoUpdate({
      target: schema.users.email,
      set: { roleId: role.id, name: "Performance Benchmark Admin" },
    })
    .returning({ id: schema.users.id });

  if (!user) {
    throw new Error("Could not create or load the benchmark admin user.");
  }

  const [existingDataset] = await db
    .select({ id: schema.datasets.id })
    .from(schema.datasets)
    .where(eq(schema.datasets.slug, PERF_DATASET_SLUG))
    .limit(1);

  if (existingDataset) {
    await db
      .delete(schema.queryLogs)
      .where(eq(schema.queryLogs.datasetId, existingDataset.id));
    await db
      .delete(schema.searchHistory)
      .where(eq(schema.searchHistory.datasetId, existingDataset.id));
    await db
      .delete(schema.datasets)
      .where(eq(schema.datasets.id, existingDataset.id));
  }

  const [dataset] = await db
    .insert(schema.datasets)
    .values({
      createdBy: user.id,
      name: "Performance Benchmark",
      slug: PERF_DATASET_SLUG,
      description: "Generated one-million-record performance test dataset.",
      category: "Benchmark",
      dataSource: "DataScope performance benchmark",
      recordCount: 0,
    })
    .returning({ id: schema.datasets.id });

  if (!dataset) {
    throw new Error("Could not create the benchmark dataset.");
  }

  await db
    .insert(schema.accessPermissions)
    .values({ datasetId: dataset.id, roleId: role.id, permission: "manage" })
    .onConflictDoNothing();

  const fieldSeeds = [
    ["status", "Status", "string", true],
    ["country", "Country", "string", true],
    ["category", "Category", "string", true],
    ["revenue", "Revenue", "number", false],
    ["created_at", "Created at", "datetime", false],
    ["name", "Name", "string", true],
    ["email", "Email", "string", true],
  ] as const;
  await db.insert(schema.datasetFields).values(
    fieldSeeds.map(([name, label, dataType, isSearchable], position) => ({
      datasetId: dataset.id,
      name,
      label,
      dataType,
      isSearchable,
      isFilterable: true,
      isSortable: true,
      position,
    })),
  );

  faker.seed(20_261_115);
  const startedAt = Date.now();
  console.log(
    `Seeding ${RECORD_COUNT.toLocaleString()} benchmark records in batches of ${BATCH_SIZE.toLocaleString()}...`,
  );

  for (let start = 0; start < RECORD_COUNT; start += BATCH_SIZE) {
    const batchCount = Math.min(BATCH_SIZE, RECORD_COUNT - start);
    const batch = Array.from({ length: batchCount }, () => {
      const firstName = faker.person.firstName();
      const lastName = faker.person.lastName();
      return {
        datasetId: dataset.id,
        status: faker.helpers.arrayElement([
          "Active",
          "Pending",
          "Inactive",
          "Suspended",
        ]),
        country: faker.location.country(),
        category: faker.commerce.department(),
        revenue: faker.finance.amount({ min: 100, max: 250_000, dec: 2 }),
        createdAt: faker.date.past({ years: 5 }),
        name: `${firstName} ${lastName}`,
        email: faker.internet.exampleEmail({ firstName, lastName }),
        extra: {},
      };
    });

    await db.insert(schema.datasetRecords).values(batch);
    const completed = start + batchCount;
    if (completed % 50_000 === 0 || completed === RECORD_COUNT) {
      console.log(
        `Seeded ${completed.toLocaleString()} / ${RECORD_COUNT.toLocaleString()} records in ${((Date.now() - startedAt) / 1_000).toFixed(1)}s`,
      );
    }
  }

  const [result] = await db
    .select({ total: count() })
    .from(schema.datasetRecords)
    .where(eq(schema.datasetRecords.datasetId, dataset.id));
  if (!result || result.total !== RECORD_COUNT) {
    throw new Error(
      `Expected ${RECORD_COUNT.toLocaleString()} benchmark records; found ${result?.total ?? 0}.`,
    );
  }

  await db
    .update(schema.datasets)
    .set({ recordCount: result.total, updatedAt: new Date() })
    .where(eq(schema.datasets.id, dataset.id));

  return { datasetId: dataset.id, userId: user.id, recordCount: result.total };
}

function startPerformanceServer(
  port: number,
  authSecret: string,
): ChildProcess {
  const nextCli = resolve(
    process.cwd(),
    "node_modules",
    "next",
    "dist",
    "bin",
    "next",
  );
  return spawn(
    process.execPath,
    [nextCli, "dev", "--hostname", "127.0.0.1", "--port", String(port)],
    {
      cwd: process.cwd(),
      stdio: "inherit",
      env: {
        ...process.env,
        AUTH_SECRET: authSecret,
        NEXTAUTH_SECRET: authSecret,
        NEXT_DIST_DIR: ".next-perf",
      },
    },
  );
}

async function waitForPerformanceServer(
  server: ChildProcess,
  baseUrl: string,
  sessionCookie: string,
  userId: string,
): Promise<void> {
  const deadline = Date.now() + 120_000;
  let lastError = "server has not responded yet";

  while (Date.now() < deadline) {
    if (server.exitCode !== null) {
      throw new Error(
        `The isolated Next.js performance server exited with code ${server.exitCode}.`,
      );
    }

    try {
      const response = await fetch(`${baseUrl}/api/auth/session`, {
        headers: { cookie: sessionCookie },
      });
      if (response.ok) {
        const session = (await response.json()) as {
          user?: { id?: string };
        };
        if (session.user?.id === userId) {
          return;
        }
        lastError =
          "the response did not authenticate with the temporary benchmark secret";
      } else {
        lastError = `session endpoint returned HTTP ${response.status}`;
      }
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
    }

    await delay(500);
  }

  throw new Error(
    `The isolated Next.js performance server did not become ready: ${lastError}.`,
  );
}

async function stopPerformanceServer(server: ChildProcess): Promise<void> {
  if (server.exitCode !== null || server.signalCode !== null) {
    return;
  }

  await new Promise<void>((resolvePromise) => {
    const timeout = setTimeout(() => {
      server.kill("SIGKILL");
      resolvePromise();
    }, 10_000);
    server.once("exit", () => {
      clearTimeout(timeout);
      resolvePromise();
    });
    server.kill("SIGTERM");
  });
}

type SearchResponse = {
  records?: unknown[];
  total?: number;
  hasMore?: boolean;
};

async function searchRequest(
  baseUrl: string,
  datasetId: string,
  sessionCookie: string,
  page: number,
): Promise<{ elapsedMs: number; response: SearchResponse }> {
  const startedAt = performance.now();
  const httpResponse = await fetch(
    `${baseUrl}/api/datasets/${datasetId}/records`,
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        cookie: sessionCookie,
      },
      body: JSON.stringify({
        conditions: [{ field: "revenue", operator: "gte", value: 0 }],
        sort: [{ field: "revenue", direction: "asc" }],
        page,
        pageSize: 100,
      }),
    },
  );
  const elapsedMs = performance.now() - startedAt;
  const response = (await httpResponse.json()) as SearchResponse & {
    error?: string;
  };
  if (!httpResponse.ok) {
    throw new Error(
      `Records API returned HTTP ${httpResponse.status}: ${response.error ?? "unknown error"}`,
    );
  }
  if (response.total !== RECORD_COUNT || response.records?.length !== 100) {
    throw new Error(
      `Unexpected page ${page} response: total=${response.total}, records=${response.records?.length ?? 0}.`,
    );
  }
  const expectedHasMore = page < RECORD_COUNT / 100;
  if (response.hasMore !== expectedHasMore) {
    throw new Error(`Unexpected hasMore value for page ${page}.`);
  }

  return { elapsedMs, response };
}

function percentile(samples: number[], value: number): number {
  const sorted = [...samples].sort((a, b) => a - b);
  return sorted[Math.ceil(value * sorted.length) - 1] ?? 0;
}

function formatMs(value: number): string {
  return value.toFixed(1);
}

async function measureTypingRequests(
  baseUrl: string,
  datasetId: string,
  sessionCookie: string,
): Promise<{ duringTyping: number; throughDebouncedResponse: number }> {
  const browser = await chromium.launch({ headless: true });
  try {
    const context = await browser.newContext();
    await context.addCookies([
      {
        name: "authjs.session-token",
        value: sessionCookie.slice("authjs.session-token=".length),
        url: baseUrl,
      },
    ]);

    const page = await context.newPage();
    let recordsApiRequests = 0;
    page.on("request", (request) => {
      const requestUrl = new URL(request.url());
      if (
        requestUrl.pathname === `/api/datasets/${datasetId}/records` &&
        request.method() === "POST"
      ) {
        recordsApiRequests += 1;
      }
    });

    await page.goto(`${baseUrl}/explorer`, { waitUntil: "domcontentloaded" });
    const datasetSelect = page.getByLabel("Select dataset");
    await datasetSelect.waitFor({ state: "visible", timeout: 30_000 });
    await page.waitForFunction(
      (id) =>
        Array.from(
          document.querySelector<HTMLSelectElement>(
            'select[aria-label="Select dataset"]',
          )?.options ?? [],
        ).some((option) => option.value === id),
      datasetId,
    );
    await datasetSelect.selectOption(datasetId);

    const searchInput = page.getByRole("textbox", { name: "Search records" });
    await searchInput.waitFor({ state: "visible" });
    const requestResponse = page.waitForResponse(
      (response) =>
        response.url().includes(`/api/datasets/${datasetId}/records`) &&
        response.request().method() === "POST",
      { timeout: 30_000 },
    );
    const startingCount = recordsApiRequests;
    await searchInput.pressSequentially("Active", { delay: 10 });
    const duringTyping = recordsApiRequests - startingCount;
    await delay(100);
    const beforeDebouncedResponse = recordsApiRequests - startingCount;
    const apiResponse = await requestResponse;
    if (!apiResponse.ok()) {
      throw new Error(
        `Explorer search returned HTTP ${apiResponse.status()} while measuring typing requests.`,
      );
    }

    return {
      duringTyping,
      throughDebouncedResponse: Math.max(
        beforeDebouncedResponse,
        recordsApiRequests - startingCount,
      ),
    };
  } finally {
    await browser.close();
  }
}

function collectPlanNodes(node: unknown, found = new Set<string>()): string[] {
  if (!node || typeof node !== "object") {
    return [...found];
  }
  const planNode = node as Record<string, unknown>;
  if (typeof planNode["Node Type"] === "string") {
    found.add(planNode["Node Type"]);
  }
  if (Array.isArray(planNode.Plans)) {
    for (const child of planNode.Plans) {
      collectPlanNodes(child, found);
    }
  }
  return [...found];
}

async function explainQuery(
  client: typeof import("../src/lib/db/client").client,
  label: string,
  query: string,
  parameters: (string | number)[],
): Promise<ExplainSummary> {
  const rows = await client.unsafe(query, parameters);
  const rawPlan = rows[0] ? Object.values(rows[0])[0] : undefined;
  const planDocument =
    typeof rawPlan === "string" ? JSON.parse(rawPlan) : rawPlan;
  const plan = Array.isArray(planDocument) ? planDocument[0] : planDocument;
  if (!plan || typeof plan !== "object") {
    throw new Error(`EXPLAIN ANALYZE returned no plan for "${label}".`);
  }

  const document = plan as Record<string, unknown>;
  const rootPlan =
    document.Plan && typeof document.Plan === "object"
      ? (document.Plan as Record<string, unknown>)
      : {};
  const bufferStats =
    rootPlan["Shared Hit Blocks"] !== undefined ? rootPlan : document;

  return {
    label,
    planningMs:
      typeof document["Planning Time"] === "number"
        ? document["Planning Time"]
        : 0,
    executionMs:
      typeof document["Execution Time"] === "number"
        ? document["Execution Time"]
        : 0,
    sharedHitBlocks:
      typeof bufferStats["Shared Hit Blocks"] === "number"
        ? bufferStats["Shared Hit Blocks"]
        : 0,
    sharedReadBlocks:
      typeof bufferStats["Shared Read Blocks"] === "number"
        ? bufferStats["Shared Read Blocks"]
        : 0,
    planNodes: collectPlanNodes(rootPlan).join(", ") || "Not reported",
  };
}

async function runExplainPlans(
  client: typeof import("../src/lib/db/client").client,
  datasetId: string,
): Promise<ExplainSummary[]> {
  const prefix = "EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) ";
  const plans: ExplainSummary[] = [];
  plans.push(
    await explainQuery(
      client,
      "Count with revenue filter",
      `${prefix}SELECT count(*) FROM dataset_records WHERE dataset_id = $1 AND revenue >= $2`,
      [datasetId, 0],
    ),
  );
  plans.push(
    await explainQuery(
      client,
      "First page by revenue",
      `${prefix}SELECT id, revenue FROM dataset_records WHERE dataset_id = $1 AND revenue >= $2 ORDER BY revenue, id LIMIT $3 OFFSET $4`,
      [datasetId, 0, 100, 0],
    ),
  );
  plans.push(
    await explainQuery(
      client,
      "Page 10,000 by revenue",
      `${prefix}SELECT id, revenue FROM dataset_records WHERE dataset_id = $1 AND revenue >= $2 ORDER BY revenue, id LIMIT $3 OFFSET $4`,
      [datasetId, 0, 100, 999_900],
    ),
  );
  plans.push(
    await explainQuery(
      client,
      "Full-text search",
      `${prefix}SELECT id FROM dataset_records WHERE dataset_id = $1 AND search_vector @@ plainto_tsquery('english', $2) LIMIT $3`,
      [datasetId, "Active", 100],
    ),
  );
  plans.push(
    await explainQuery(
      client,
      "Trigram partial match",
      `${prefix}SELECT id FROM dataset_records WHERE dataset_id = $1 AND name ILIKE $2 LIMIT $3`,
      [datasetId, "%son%", 100],
    ),
  );
  return plans;
}

function buildReportSection(input: {
  measuredAt: string;
  recordCount: number;
  searchP50: number;
  searchP95: number;
  pageOneP50: number;
  pageOneP95: number;
  pageTenThousandP50: number;
  pageTenThousandP95: number;
  coldCountMs: number;
  warmCountP50: number;
  warmCountP95: number;
  typingCounts: { duringTyping: number; throughDebouncedResponse: number };
  explain: ExplainSummary[];
}): string {
  const cacheImprovement =
    input.coldCountMs === 0
      ? "N/A"
      : `${(((input.coldCountMs - input.warmCountP50) / input.coldCountMs) * 100).toFixed(1)}%`;
  const metricRows = [
    ["Measured at (UTC)", input.measuredAt, "timestamp"],
    ["Verified dataset size", input.recordCount.toLocaleString(), "records"],
    ["Search response latency, p50", formatMs(input.searchP50), "ms"],
    ["Search response latency, p95", formatMs(input.searchP95), "ms"],
    ["Page 1 response latency, p50", formatMs(input.pageOneP50), "ms"],
    ["Page 1 response latency, p95", formatMs(input.pageOneP95), "ms"],
    [
      "Page 10,000 response latency, p50",
      formatMs(input.pageTenThousandP50),
      "ms",
    ],
    [
      "Page 10,000 response latency, p95",
      formatMs(input.pageTenThousandP95),
      "ms",
    ],
    ["Cold count-cache request", formatMs(input.coldCountMs), "ms"],
    ["Warm count-cache latency, p50", formatMs(input.warmCountP50), "ms"],
    ["Warm count-cache latency, p95", formatMs(input.warmCountP95), "ms"],
    ["Cold-to-warm p50 latency reduction", cacheImprovement, "percent"],
    [
      "Records API requests during keystrokes",
      String(input.typingCounts.duringTyping),
      "requests",
    ],
    [
      "Records API requests through debounced response",
      String(input.typingCounts.throughDebouncedResponse),
      "requests",
    ],
  ];

  const metricTable = [
    "| Metric | Measured value | Unit |",
    "| --- | ---: | --- |",
    ...metricRows.map(
      ([metric, value, unit]) => `| ${metric} | ${value} | ${unit} |`,
    ),
  ].join("\n");
  const explainTable = [
    "| Query | Planning (ms) | Execution (ms) | Shared hit blocks | Shared read blocks | Plan nodes |",
    "| --- | ---: | ---: | ---: | ---: | --- |",
    ...input.explain.map(
      (plan) =>
        `| ${plan.label} | ${formatMs(plan.planningMs)} | ${formatMs(plan.executionMs)} | ${plan.sharedHitBlocks} | ${plan.sharedReadBlocks} | ${plan.planNodes} |`,
    ),
  ].join("\n");

  return `\n\n${metricTable}\n\n### EXPLAIN ANALYZE\n\n${explainTable}\n`;
}

async function updatePerformanceReport(section: string): Promise<void> {
  const { readFile, writeFile } = await import("node:fs/promises");
  const report = await readFile(REPORT_PATH, "utf8");
  const start = report.indexOf(RESULTS_START);
  const end = report.indexOf(RESULTS_END);
  if (start === -1 || end === -1 || end <= start) {
    throw new Error(
      `${REPORT_PATH} must contain the performance results markers in order.`,
    );
  }

  const replacement = `${RESULTS_START}${section}${RESULTS_END}`;
  await writeFile(
    REPORT_PATH,
    `${report.slice(0, start)}${replacement}${report.slice(end + RESULTS_END.length)}`,
  );
}

async function main(): Promise<void> {
  const databaseUrl = getPerfDatabaseUrl();
  const port = getPort();
  await assertPortAvailable(port);

  process.env.DATABASE_URL = databaseUrl;
  const authSecret = randomBytes(32).toString("hex");
  process.env.AUTH_SECRET = authSecret;
  process.env.NEXTAUTH_SECRET = authSecret;

  const [{ db, client }, schema, migrator] = await Promise.all([
    import("../src/lib/db/client"),
    import("../src/lib/db/schema"),
    import("drizzle-orm/postgres-js/migrator"),
  ]);

  let server: ChildProcess | undefined;
  try {
    await migrator.migrate(db, {
      migrationsFolder: resolve(process.cwd(), "drizzle"),
    });
    const seeded = await seedPerformanceData(db, schema);
    const sessionCookieName = "authjs.session-token";
    const sessionToken = await encode({
      secret: authSecret,
      salt: sessionCookieName,
      maxAge: 60 * 60,
      token: {
        sub: seeded.userId,
        name: "Performance Benchmark Admin",
        email: PERF_ADMIN_EMAIL,
        role: "admin",
      },
    });
    const sessionCookie = `${sessionCookieName}=${sessionToken}`;
    const baseUrl = `http://127.0.0.1:${port}`;

    server = startPerformanceServer(port, authSecret);
    await waitForPerformanceServer(
      server,
      baseUrl,
      sessionCookie,
      seeded.userId,
    );
    console.log(`Isolated performance server is ready at ${baseUrl}.`);

    const warmupResponse = await fetch(
      `${baseUrl}/api/datasets/${seeded.datasetId}/records`,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          cookie: sessionCookie,
        },
        body: JSON.stringify({
          conditions: [],
          page: 1,
          pageSize: 100,
          search: "",
          sort: [],
        }),
      },
    );
    if (!warmupResponse.ok) {
      throw new Error(
        `Records API warm-up failed with HTTP ${warmupResponse.status}.`,
      );
    }

    const cold = await searchRequest(
      baseUrl,
      seeded.datasetId,
      sessionCookie,
      1,
    );
    const searchSamples: number[] = [];
    for (let iteration = 0; iteration < 30; iteration += 1) {
      searchSamples.push(
        (await searchRequest(baseUrl, seeded.datasetId, sessionCookie, 1))
          .elapsedMs,
      );
    }

    const pageOneSamples: number[] = [];
    const pageTenThousandSamples: number[] = [];
    for (let iteration = 0; iteration < 10; iteration += 1) {
      pageOneSamples.push(
        (await searchRequest(baseUrl, seeded.datasetId, sessionCookie, 1))
          .elapsedMs,
      );
      pageTenThousandSamples.push(
        (await searchRequest(baseUrl, seeded.datasetId, sessionCookie, 10_000))
          .elapsedMs,
      );
    }

    const typingCounts = await measureTypingRequests(
      baseUrl,
      seeded.datasetId,
      sessionCookie,
    );
    const explain = await runExplainPlans(client, seeded.datasetId);
    const reportSection = buildReportSection({
      measuredAt: new Date().toISOString(),
      recordCount: seeded.recordCount,
      searchP50: percentile(searchSamples, 0.5),
      searchP95: percentile(searchSamples, 0.95),
      pageOneP50: percentile(pageOneSamples, 0.5),
      pageOneP95: percentile(pageOneSamples, 0.95),
      pageTenThousandP50: percentile(pageTenThousandSamples, 0.5),
      pageTenThousandP95: percentile(pageTenThousandSamples, 0.95),
      coldCountMs: cold.elapsedMs,
      warmCountP50: percentile(searchSamples, 0.5),
      warmCountP95: percentile(searchSamples, 0.95),
      typingCounts,
      explain,
    });
    await updatePerformanceReport(reportSection);
    console.log(`Wrote measured results to ${REPORT_PATH}.`);
  } finally {
    if (server) {
      await stopPerformanceServer(server);
    }
    await client.end({ timeout: 5 });
  }
}

main().catch((error: unknown) => {
  console.error("Performance benchmark failed:", error);
  process.exitCode = 1;
});

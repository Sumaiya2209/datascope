import "dotenv/config";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { migrate } from "drizzle-orm/postgres-js/migrator";

export function configureTestDatabase(): string {
  const databaseUrl = process.env.TEST_DATABASE_URL;
  if (!databaseUrl) {
    throw new Error(
      "TEST_DATABASE_URL is required. Start the isolated postgres-test service and set it to the datascope_test database.",
    );
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(databaseUrl);
  } catch {
    throw new Error("TEST_DATABASE_URL must be a valid PostgreSQL URL.");
  }

  const databaseName = decodeURIComponent(parsedUrl.pathname.slice(1));
  if (!databaseName.endsWith("_test")) {
    throw new Error(
      "Refusing to run tests: TEST_DATABASE_URL must target a database whose name ends in _test.",
    );
  }

  if (!["postgres:", "postgresql:"].includes(parsedUrl.protocol)) {
    throw new Error("TEST_DATABASE_URL must use the PostgreSQL protocol.");
  }

  process.env.DATABASE_URL = databaseUrl;
  return databaseUrl;
}

export async function migrateTestDatabase(): Promise<void> {
  configureTestDatabase();
  const { client, db } = await import("../src/lib/db/client");

  try {
    await migrate(db, { migrationsFolder: resolve(process.cwd(), "drizzle") });
  } finally {
    await client.end();
  }
}

export function runLocalCli(packageEntry: string, args: string[]): number {
  const result = spawnSync(
    process.execPath,
    [resolve(process.cwd(), packageEntry), ...args],
    {
      stdio: "inherit",
      env: process.env,
    },
  );

  if (result.error) {
    throw result.error;
  }
  return result.status ?? 1;
}

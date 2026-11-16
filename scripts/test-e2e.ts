import { randomBytes } from "node:crypto";
import {
  configureTestDatabase,
  migrateTestDatabase,
  runLocalCli,
} from "./test-database";

async function main() {
  configureTestDatabase();
  await migrateTestDatabase();

  const password = randomBytes(24).toString("base64url");
  process.env.E2E_TEST_PASSWORD = password;
  process.env.E2E_AUTH_SECRET = randomBytes(32).toString("base64url");

  const { E2E_TEST_EMAIL, seedE2EFixture } =
    await import("../tests/e2e/fixture");
  const { datasetId } = await seedE2EFixture(password);
  process.env.E2E_TEST_EMAIL = E2E_TEST_EMAIL;
  process.env.E2E_TEST_DATASET_ID = datasetId;

  const exitCode = runLocalCli("node_modules/@playwright/test/cli.js", [
    "test",
  ]);
  process.exitCode = exitCode;
}

main().catch((error: unknown) => {
  console.error("End-to-end test setup failed:", error);
  process.exitCode = 1;
});

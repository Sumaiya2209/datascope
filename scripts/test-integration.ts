import {
  configureTestDatabase,
  migrateTestDatabase,
  runLocalCli,
} from "./test-database";

async function main() {
  configureTestDatabase();
  await migrateTestDatabase();

  const exitCode = runLocalCli("node_modules/vitest/vitest.mjs", [
    "run",
    "--config",
    "vitest.integration.config.ts",
  ]);
  process.exitCode = exitCode;
}

main().catch((error: unknown) => {
  console.error("Integration test setup failed:", error);
  process.exitCode = 1;
});

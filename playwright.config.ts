import { defineConfig, devices } from "@playwright/test";

if (!process.env.TEST_DATABASE_URL || !process.env.E2E_AUTH_SECRET) {
  throw new Error(
    "Run Playwright through npm run test:e2e with TEST_DATABASE_URL configured.",
  );
}

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  reporter: "list",
  use: {
    baseURL: "http://127.0.0.1:3100",
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: "npm run dev -- --hostname 127.0.0.1 --port 3100",
    url: "http://127.0.0.1:3100",
    reuseExistingServer: false,
    env: {
      DATABASE_URL: process.env.TEST_DATABASE_URL,
      AUTH_SECRET: process.env.E2E_AUTH_SECRET,
      AUTH_TRUST_HOST: "true",
    },
    timeout: 120_000,
  },
});

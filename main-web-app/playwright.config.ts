import { defineConfig, devices } from "@playwright/test";

const testDatabaseUrl = "postgres://test:testpass@localhost:5433/knogest_test";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: "line",
  use: {
    baseURL: "http://piloto.localhost:3000",
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  globalSetup: "./tests/e2e/global-setup.ts",
  webServer: [
    {
      command: "pnpm dev",
      url: "http://piloto.localhost:3000/auth/login",
      reuseExistingServer: false,
      env: {
        API_BASE_URL: "http://localhost:3333",
        AUTH_COOKIE_MODE: "local",
      },
      timeout: 120_000,
    },
    {
      command: "pnpm --dir ../main-api dev",
      url: "http://localhost:3333/docs",
      reuseExistingServer: false,
      env: {
        DATABASE_URL: testDatabaseUrl,
        JWT_SECRET_KEY: "e2e-secret-key-with-at-least-thirty-two-characters",
        NODE_ENV: "test",
      },
      timeout: 120_000,
    },
  ],
});

import { defineConfig, devices } from "@playwright/test";

/**
 * Smoke test for the main flow. Point it at any running server:
 *   E2E_BASE_URL=https://your-app.vercel.app npm run test:e2e
 * Defaults to a local server on :3000. Run with DEMO_MODE=true for no API costs.
 */
export default defineConfig({
  testDir: "tests/e2e",
  timeout: 120_000,
  retries: 0,
  reporter: [["list"]],
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3000",
    trace: "retain-on-failure",
  },
  projects: [
    { name: "phone", use: { ...devices["Pixel 7"], viewport: { width: 390, height: 844 } } },
    { name: "desktop", use: { viewport: { width: 1440, height: 1000 } } },
  ],
});

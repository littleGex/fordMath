import { defineConfig, devices } from "@playwright/test";

/**
 * End-to-end tests in a real browser. They run against the built site in dist/,
 * so run `npm run build` first. Each test starts and stops its own server.
 */
export default defineConfig({
  testDir: "e2e",
  timeout: 60_000,
  reporter: process.env.CI ? "github" : "list",
  use: { ...devices["iPhone 13"], browserName: "chromium" },
});

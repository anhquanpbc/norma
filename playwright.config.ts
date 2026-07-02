import { defineConfig, devices } from "@playwright/test";

/**
 * Browser self-test for the Norma reference site. The SITE stays zero-dependency;
 * Playwright + axe are test-only. We serve index.html over http (via a tiny zero-dep
 * static server) so axe sees real computed styles and we can assert "0 network requests".
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  webServer: {
    command: "node e2e/server.mjs",
    url: "http://127.0.0.1:4173/index.html",
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
  },
  use: {
    baseURL: "http://127.0.0.1:4173",
    trace: "on-first-retry",
    // Force the reduced-motion path so scroll-reveal elements are settled at opacity:1
    // (index.html line ~361). Otherwise axe/screenshots catch elements mid-animation.
    reducedMotion: "reduce",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});

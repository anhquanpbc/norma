import { test, expect } from "@playwright/test";

// Responsive coverage: assert no horizontal overflow at each breakpoint (cross-platform
// stable) and attach a full-page screenshot as an artifact for human review. Strict
// pixel regression is intentionally deferred (Linux/Windows font AA differences make
// committed baselines flaky without a container-generated baseline strategy).
const breakpoints = [320, 375, 768, 1024, 1440];

for (const width of breakpoints) {
  test(`no horizontal overflow @ ${width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/index.html");
    await page.waitForLoadState("networkidle");
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    await testInfo.attach(`index-${width}px`, {
      body: await page.screenshot({ fullPage: true }),
      contentType: "image/png",
    });
    expect(overflow, `horizontal overflow of ${overflow}px at ${width}px`).toBeLessThanOrEqual(1);
  });
}

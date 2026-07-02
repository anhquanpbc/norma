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
    // The real cross-browser assertion runs first, on every engine.
    expect(overflow, `horizontal overflow of ${overflow}px at ${width}px`).toBeLessThanOrEqual(1);
    // A full-page screenshot is only a human-review artifact — best-effort. WebKit caps screenshot
    // dimensions, so a very tall (narrow) page can exceed the limit; never fail the test over that.
    try {
      await testInfo.attach(`index-${width}px`, {
        body: await page.screenshot({ fullPage: true }),
        contentType: "image/png",
      });
    } catch (e) {
      testInfo.annotations.push({ type: "screenshot-skipped", description: `${width}px: ${(e as Error).message}` });
    }
  });
}

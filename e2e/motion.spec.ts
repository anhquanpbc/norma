import { test, expect } from "@playwright/test";

// a11y.reduced-motion is verified statically only by CSS-block presence. This proves the RENDERED
// outcome under prefers-reduced-motion: reduce (set globally in playwright.config.ts): no content is
// left hidden by the scroll-reveal, and transitions are neutralized.

test("under reduced-motion, below-the-fold content is settled and animation is neutralized", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/index.html");

  // A deep section (§14) must be fully opaque without ever scrolling to it — the reduced-motion
  // path must not leave reveal elements stuck at opacity:0.
  const opacity = await page.locator("#s14 .card").first().evaluate((el) => getComputedStyle(el).opacity);
  expect(opacity).toBe("1");

  // No element is left in the pending (pre-reveal, opacity:0) state.
  const pending = await page.evaluate(() => document.querySelectorAll(".reveal.pending").length);
  expect(pending).toBe(0);

  // The @media (prefers-reduced-motion: reduce) block collapses transitions to ~0.
  const td = await page.locator(".card").first().evaluate((el) => getComputedStyle(el).transitionDuration);
  expect(parseFloat(td)).toBeLessThan(0.05);
});

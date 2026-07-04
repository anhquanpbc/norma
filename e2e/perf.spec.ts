import { test, expect } from "@playwright/test";

// Dogfood §6 Core Web Vitals against the reference site itself. The site is a single zero-network
// self-contained document, so LCP should be tiny and CLS ~0 — this gate keeps it that way and makes the
// "we measure CWV" claim real. layout-shift / largest-contentful-paint are Chromium-only Performance
// observers, so this runs on chromium only.
test.describe("Core Web Vitals (§6)", () => {
  test.skip(({ browserName }) => browserName !== "chromium", "LCP/CLS observers are Chromium-only");

  test("LCP < 2.5s and CLS < 0.1", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" }); // deterministic: no entrance-animation churn
    await page.addInitScript(() => {
      const w = window as unknown as { __cls: number; __lcp: number };
      w.__cls = 0;
      w.__lcp = 0;
      new PerformanceObserver((list) => {
        for (const e of list.getEntries()) {
          const s = e as PerformanceEntry & { hadRecentInput?: boolean; value?: number };
          if (!s.hadRecentInput) w.__cls += s.value ?? 0;
        }
      }).observe({ type: "layout-shift", buffered: true });
      new PerformanceObserver((list) => {
        const es = list.getEntries();
        w.__lcp = es[es.length - 1].startTime;
      }).observe({ type: "largest-contentful-paint", buffered: true });
    });

    await page.goto("/index.html", { waitUntil: "networkidle" });
    // let LCP finalize and any late shifts settle (two animation frames + a beat)
    await page.evaluate(() => new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(r, 200)))));

    const { cls, lcp } = await page.evaluate(() => {
      const w = window as unknown as { __cls: number; __lcp: number };
      return { cls: w.__cls, lcp: w.__lcp };
    });

    expect.soft(lcp, `LCP ${Math.round(lcp)}ms should be under the 2500ms §6 'good' threshold`).toBeLessThan(2500);
    expect.soft(cls, `CLS ${cls.toFixed(3)} should be under the 0.1 §6 'good' threshold`).toBeLessThan(0.1);
    expect(lcp).toBeGreaterThan(0); // sanity: the observer actually fired
  });
});

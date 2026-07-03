import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

// Freeze entrance animations to their RESTING state so axe measures real design colors,
// not a mid-fade frame (see initReveal / @keyframes rise in index.html).
const FREEZE = `*,*::before,*::after{animation:none!important;transition:none!important;scroll-behavior:auto!important}
.reveal,[class*="reveal"]{opacity:1!important;transform:none!important}`;

// Rendered-DOM WCAG 2.2 check across BOTH themes and BOTH languages — the matrix that the
// static linter cannot cover (computed OKLCH contrast per theme, ARIA on real elements).
for (const theme of ["light", "dark"] as const) {
  for (const lang of ["en", "vi"] as const) {
    test(`no axe WCAG 2.2 AA violations (${theme} / ${lang})`, async ({ page }) => {
      await page.addInitScript((t) => { try { localStorage.setItem("norma-theme", t); } catch (e) {} }, theme);
      await page.addInitScript((css) => {
        const apply = () => {
          const s = document.createElement("style");
          s.setAttribute("data-test-freeze", "");
          s.textContent = css;
          (document.head || document.documentElement).appendChild(s);
        };
        if (document.head) apply();
        else document.addEventListener("DOMContentLoaded", apply);
      }, FREEZE);

      await page.goto("/index.html");
      await page.evaluate(() => { location.hash = "#top"; }); // reveal every section, not just above-fold
      if (lang === "vi") await page.locator("#btn-vi").click();

      const { violations } = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22a", "wcag22aa"])
        .analyze();

      for (const v of violations) {
        console.log(`\n[${v.impact}] ${v.id} — ${v.help}`);
        for (const n of v.nodes) console.log("  " + n.target.join(" ") + "  " + (n.failureSummary || "").replace(/\n/g, " "));
      }
      expect(violations.map((v) => v.id)).toEqual([]);
    });
  }
}

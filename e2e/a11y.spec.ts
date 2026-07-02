import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

// The page animates entrance opacity (0->1) via .reveal + @keyframes rise. axe must
// measure the RESTING design colors, not a mid-fade frame, or it flags false contrast
// failures nondeterministically. Injecting the freeze via addInitScript guarantees no
// element ever animates — deterministic regardless of load/timing. (Verified: at rest the
// flagged chip text is --ink/--azure-ink/--ink-3, all AA-clean; mid-fade it blends to grey.)
const FREEZE = `*,*::before,*::after{animation:none!important;transition:none!important;scroll-behavior:auto!important}
.reveal,[class*="reveal"]{opacity:1!important;transform:none!important}`;

for (const lang of ["en", "vi"] as const) {
  test(`no axe WCAG 2.1 AA violations (${lang})`, async ({ page }) => {
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
    if (lang === "vi") await page.locator("#btn-vi").click();

    const { violations } = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();

    for (const v of violations) {
      console.log(`\n[${v.impact}] ${v.id} — ${v.help}`);
      for (const n of v.nodes) console.log(`  ${n.target.join(" ")}  ${(n.failureSummary || "").replace(/\n/g, " ")}`);
    }
    expect(violations.map((v) => v.id)).toEqual([]);
  });
}

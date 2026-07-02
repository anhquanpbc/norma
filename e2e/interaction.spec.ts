import { test, expect } from "@playwright/test";

test("loads with a visible h1 and no console errors", async ({ page }) => {
  const errors: string[] = [];
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/index.html");
  await expect(page.locator("h1").first()).toBeVisible();
  expect(errors).toEqual([]);
});

test("EN/VI toggle swaps visible language and aria-pressed", async ({ page }) => {
  await page.goto("/index.html");
  const html = page.locator("html");

  // defaults to English
  await expect(html).toHaveAttribute("data-lang", "en");
  await expect(page.locator("#btn-en")).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator("#btn-vi")).toHaveAttribute("aria-pressed", "false");

  // switch to Vietnamese
  await page.locator("#btn-vi").click();
  await expect(html).toHaveAttribute("data-lang", "vi");
  await expect(page.locator("#btn-vi")).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator("#btn-en")).toHaveAttribute("aria-pressed", "false");
});

test("type-scale slider updates its live output", async ({ page }) => {
  await page.goto("/index.html");
  const slider = page.locator("#ratioSlider");
  const out = page.locator("#ratioOut");
  if ((await slider.count()) === 0) test.skip();
  const before = await out.textContent();
  await slider.focus();
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("ArrowRight");
  await expect(out).not.toHaveText(before ?? "");
});

test("sidebar search filters the section nav", async ({ page }) => {
  await page.goto("/index.html");
  const links = page.locator(".doc-nav .sections a");
  const total = await links.count();
  await page.locator("#docSearch").fill("color");
  const visible = await links.evaluateAll((els) => els.filter((e) => !(e as HTMLElement).hidden).length);
  expect(visible).toBeGreaterThan(0);
  expect(visible).toBeLessThan(total);
});

test("nav-jump reveals every section (no reduced-motion)", async ({ page }) => {
  // Without reduced-motion, sections start hidden and reveal on scroll; jumping via a
  // nav/hash link must not leave skipped sections blank.
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/index.html");
  await page.evaluate(() => { location.hash = "#s8"; });
  await page.waitForTimeout(200);
  const pending = await page.evaluate(() => document.querySelectorAll(".reveal.pending").length);
  expect(pending).toBe(0);
});

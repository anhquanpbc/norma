import { test, expect } from "@playwright/test";

// Keyboard-operability checks (WCAG 2.1.1 / 2.4.7 / 2.4.1). axe cannot exercise the keyboard or
// evaluate :focus-visible appearance, so these assert the interaction outcomes on real elements.

test("the bypass-blocks skip link is focusable, becomes visible, and jumps to the content", async ({ page }) => {
  await page.goto("/index.html");
  // Focus the skip link the way a keyboard user reaches it. (WebKit on Linux doesn't Tab to links
  // unless full keyboard access is on, so we focus it directly rather than assume Tab order.)
  await page.locator(".skip").focus();
  const cls = await page.evaluate(() => (document.activeElement as HTMLElement)?.className ?? "");
  expect(cls).toContain("skip");
  // .skip is off-screen until focused (.skip:focus{ left:0 }) — once focused it must be on-screen.
  const box = await page.locator(".skip").boundingBox();
  expect(box).not.toBeNull();
  expect(box!.x).toBeGreaterThanOrEqual(0);
  // Activating it moves to the content start (the <main id="main"> landmark).
  await page.keyboard.press("Enter");
  expect(await page.evaluate(() => location.hash)).toBe("#main");
});

test("focused controls carry a visible focus ring (>= 2px outline)", async ({ page }) => {
  await page.goto("/index.html");
  await page.keyboard.press("Tab"); // skip link
  await page.keyboard.press("Tab"); // first header control
  const ring = await page.evaluate(() => {
    const el = document.activeElement as HTMLElement;
    const s = getComputedStyle(el);
    return { tag: el?.tagName, width: parseFloat(s.outlineWidth) || 0 };
  });
  // Whatever control receives focus must show a ring of at least 2 CSS px (2.4.13 perimeter).
  expect(ring.width).toBeGreaterThanOrEqual(2);
});

test("EN/VI and theme toggles are keyboard-activatable", async ({ page }) => {
  await page.goto("/index.html");
  await page.locator("#btn-vi").focus();
  await page.keyboard.press("Enter");
  await expect(page.locator("html")).toHaveAttribute("data-lang", "vi");
  const before = await page.locator("html").getAttribute("data-theme");
  await page.locator("#themeToggle").focus();
  await page.keyboard.press("Enter");
  await expect(page.locator("html")).not.toHaveAttribute("data-theme", before ?? "");
});

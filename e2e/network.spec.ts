import { test, expect } from "@playwright/test";

// The site advertises "0 network requests / no CDN / view source to verify".
// Assert the rendered page fetches nothing off-origin (data: URIs are inline, allowed).
test("makes zero external network requests", async ({ page }) => {
  const external: string[] = [];
  page.on("request", (req) => {
    const url = req.url();
    if (url.startsWith("data:") || url.startsWith("blob:")) return;
    const { hostname } = new URL(url);
    if (hostname !== "127.0.0.1" && hostname !== "localhost") external.push(url);
  });
  await page.goto("/index.html", { waitUntil: "networkidle" });
  // interacting must not trigger a fetch either
  await page.locator("#btn-vi").click();
  expect(external).toEqual([]);
});

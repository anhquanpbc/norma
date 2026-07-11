import type { Check, Finding } from "../types.js";
import { elementLine } from "../parse.js";
import { isFullDocument, elDisabled, mk, isWellFormedLang, notInTemplate, OG_CORE } from "./helpers.js";

// ---------- document-level checks (full documents only, never fragments) ----------
export const metaViewport: Check = (ctx, rules) => {
  if (!isFullDocument(ctx)) return [];
  const r = rules[0];
  const out: Finding[] = [];
  ctx.dom!.querySelectorAll("meta").forEach((el) => {
    if ((el.getAttribute("name") ?? "").toLowerCase() !== "viewport" || elDisabled(el, r.id)) return;
    const content = (el.getAttribute("content") ?? "").toLowerCase();
    // Browsers accept ',' AND ';' as viewport property separators.
    const noScale = /user-scalable\s*=\s*(no|0)(\s|,|;|$)/.exec(content);
    const maxScale = /maximum-scale\s*=\s*([\d.]+)/.exec(content);
    const zoomCapped = maxScale != null && parseFloat(maxScale[1]) < 2;
    if (!noScale && !zoomCapped) return;
    const what = noScale ? `user-scalable=${noScale[1]}` : `maximum-scale=${maxScale![1]}`;
    out.push(mk(ctx, r, elementLine(ctx, el),
      `Viewport meta blocks zoom (${what}) — users must be able to zoom text to 200%.`,
      `Thẻ viewport chặn zoom (${what}) — người dùng phải phóng to chữ được tới 200%.`));
  });
  return out;
};

export const viewportPresence: Check = (ctx, rules) => {
  if (!isFullDocument(ctx)) return [];
  const r = rules[0];
  const has = ctx.dom!.querySelectorAll("meta").some((m) =>
    (m.getAttribute("name") ?? "").toLowerCase() === "viewport" && (m.getAttribute("content") ?? "").trim() !== "");
  if (has) return [];
  const html = ctx.dom!.querySelector("html");
  if (!html || elDisabled(html, r.id)) return [];
  return [mk(ctx, r, elementLine(ctx, html),
    `Document has no <meta name="viewport"> — mobile browsers will render the desktop layout zoomed out.`,
    `Tài liệu thiếu <meta name="viewport"> — trình duyệt mobile sẽ hiển thị bố cục desktop thu nhỏ.`)];
};

// ---------- i18n / theme checks ----------
export const langValid: Check = (ctx, rules) => {
  if (!ctx.dom) return [];
  const r = rules[0];
  const out: Finding[] = [];
  ctx.dom.querySelectorAll("[lang]").forEach((el) => {
    const lang = el.getAttribute("lang") ?? "";
    if (!lang.trim() || isWellFormedLang(lang) || elDisabled(el, r.id)) return; // empty is i18n.html-lang's concern
    out.push(mk(ctx, r, elementLine(ctx, el),
      `lang="${lang}" is not a well-formed BCP-47 language tag — use a code like "en", "vi", or "zh-Hant".`,
      `lang="${lang}" không phải thẻ ngôn ngữ BCP-47 hợp lệ — dùng mã như "en", "vi", hoặc "zh-Hant".`));
  });
  return out;
};

export const htmlLang: Check = (ctx, rules) => {
  if (!ctx.dom || !/<html\b/i.test(ctx.source)) return []; // only a full document, not a fragment
  const r = rules[0];
  const html = ctx.dom.querySelector("html");
  if (!html) return [];
  const lang = (html.getAttribute("lang") ?? "").trim();
  if (lang || elDisabled(html, r.id)) return [];
  return [mk(ctx, r, elementLine(ctx, html),
    "<html> has no lang attribute — set the document's default language.",
    "<html> không có thuộc tính lang — đặt ngôn ngữ mặc định của tài liệu.")];
};

// ---------- Document metadata / technical-SEO checks (full-document scoped) ----------
export const documentTitle: Check = (ctx, rules) => {
  if (!isFullDocument(ctx)) return [];
  const r = rules[0];
  // The document title, excluding an inline SVG's <title> in the body and any inert <template> copy.
  // (querySelectorAll, not head-scoped, so a conforming doc that omits the optional <head> tag still counts.)
  const title = ctx.dom!.querySelectorAll("title").find((t) => !t.closest("svg") && notInTemplate(t));
  if ((title?.text ?? "").trim()) return [];
  return [mk(ctx, r, title ? elementLine(ctx, title) : 1,
    "The document has no non-empty <title> — screen readers announce it as the URL and search/social results have no name (WCAG 2.4.2).",
    "Tài liệu không có <title> khác rỗng — trình đọc màn hình đọc là URL, kết quả tìm kiếm/chia sẻ không có tên (WCAG 2.4.2).")];
};

export const metaDescription: Check = (ctx, rules) => {
  if (!isFullDocument(ctx)) return [];
  const r = rules[0];
  // <meta> name values are ASCII case-insensitive (HTML spec), so name="Description" is valid.
  const meta = ctx.dom!.querySelectorAll("meta").find((m) =>
    notInTemplate(m) && (m.getAttribute("name") ?? "").trim().toLowerCase() === "description");
  if ((meta?.getAttribute("content") ?? "").trim()) return [];
  return [mk(ctx, r, meta ? elementLine(ctx, meta) : 1,
    "The document has no <meta name=\"description\"> — search engines invent a snippet from the page, usually worse than an authored summary.",
    "Tài liệu không có <meta name=\"description\"> — máy tìm kiếm tự bịa đoạn mô tả từ trang, thường tệ hơn một tóm tắt do bạn viết.")];
};

export const canonicalUnique: Check = (ctx, rules) => {
  if (!ctx.dom) return [];
  const r = rules[0];
  const canon = ctx.dom.querySelectorAll("link[rel]").filter((l) =>
    (l.getAttribute("rel") ?? "").trim().toLowerCase() === "canonical" && notInTemplate(l));
  if (canon.length < 2) return [];
  return [mk(ctx, r, elementLine(ctx, canon[1]),
    `The document has ${canon.length} <link rel="canonical"> — search engines ignore all but one (often the wrong one). Keep exactly one.`,
    `Tài liệu có ${canon.length} <link rel="canonical"> — máy tìm kiếm chỉ giữ một (thường là cái sai). Chỉ để đúng một.`)];
};

export const ogTags: Check = (ctx, rules) => {
  if (!isFullDocument(ctx)) return [];
  const r = rules[0];
  // Open Graph uses property="og:*" (RDFa); some pages mistakenly use name="og:*" — accept either so a
  // page that DID add OG isn't false-flagged. Flag only when NONE of the core three (og:title / og:url /
  // og:image) is present: any OG means the page has opted in; total absence is what makes a shared link
  // render as a bare URL. Values are ASCII case-insensitive.
  const hasOg = ctx.dom!.querySelectorAll("meta").some((m) => {
    if (!notInTemplate(m)) return false;
    const key = ((m.getAttribute("property") ?? m.getAttribute("name")) ?? "").trim().toLowerCase();
    return OG_CORE.has(key) && (m.getAttribute("content") ?? "").trim() !== ""; // empty content is not a real tag
  });
  if (hasOg) return [];
  return [mk(ctx, r, 1,
    "The document has no Open Graph tags (og:title/og:url/og:image) — shared links render as a bare URL with no title or preview image.",
    "Tài liệu không có thẻ Open Graph (og:title/og:url/og:image) — link chia sẻ hiện dưới dạng URL trơ, không tiêu đề hay ảnh xem trước.")];
};

export const viewportFit: Check = (ctx, rules) => {
  if (!isFullDocument(ctx)) return [];
  const r = rules[0];
  let usesSafeArea = false;
  for (const block of ctx.css) block.root.walkDecls((d) => { if (/env\(\s*safe-area-inset-/i.test(d.value)) usesSafeArea = true; });
  if (!usesSafeArea) return [];
  const meta = ctx.dom!.querySelector('meta[name="viewport"]');
  if (/viewport-fit\s*=\s*cover/i.test(meta?.getAttribute("content") ?? "")) return [];
  return [mk(ctx, r, meta ? elementLine(ctx, meta) : 1,
    "CSS uses env(safe-area-inset-*) but the viewport meta lacks viewport-fit=cover — the insets resolve to 0, so notch/home-indicator padding silently does nothing.",
    "CSS dùng env(safe-area-inset-*) nhưng viewport meta thiếu viewport-fit=cover — insets về 0, nên padding cho tai thỏ/home-indicator âm thầm vô hiệu.")];
};

import type { Rule as PostcssRule, Declaration, ChildNode } from "postcss";
import type { HTMLElement } from "node-html-parser";
import type { Check, CssBlock, FileContext, Finding, Rule } from "./types.js";
import { contrastRatio, resolveVar } from "./color.js";
import { elementLine } from "./parse.js";

// ---------- helpers ----------
const cssLine = (block: CssBlock, node: { source?: { start?: { line: number } } }): number =>
  (node.source?.start?.line ?? 1) + block.startLine - 1;

function ruleDisabled(rule: PostcssRule, ruleId: string): boolean {
  const texts: string[] = [];
  const prev = rule.prev();
  if (prev && prev.type === "comment") texts.push((prev as { text: string }).text);
  rule.each((n: ChildNode) => { if (n.type === "comment") texts.push((n as { text: string }).text); });
  return texts.some((t) => t.includes("norma-disable") && t.includes(ruleId));
}
const elDisabled = (el: HTMLElement, ruleId: string): boolean => {
  const a = el.getAttribute("data-norma-disable");
  return !!a && (a.includes(ruleId) || a.includes("all"));
};

function decls(rule: PostcssRule): Map<string, string> {
  const m = new Map<string, string>();
  rule.walkDecls((d: Declaration) => { m.set(d.prop.toLowerCase(), d.value); });
  return m;
}
function pxOf(value: string | undefined): number | null {
  if (!value) return null;
  const m = value.match(/(-?[\d.]+)\s*(px|rem|em)?/);
  if (!m) return null;
  const n = parseFloat(m[1]);
  return m[2] === "rem" || m[2] === "em" ? n * 16 : n;
}
function isLargeText(d: Map<string, string>, vars: Map<string, string>): boolean {
  // Resolve tokens first: a heading sized via font-size:var(--h1) is still large text,
  // and must be held to the 3:1 (not 4.5:1) threshold. Without this, token-driven headings
  // are misclassified as body text and falsely fail color.contrast.text at error severity.
  const size = pxOf(resolveVar(d.get("font-size") ?? "", vars));
  const w = resolveVar(d.get("font-weight") ?? "", vars).trim();
  const bold = w === "bold" || parseInt(w, 10) >= 700;
  if (size == null) return false;
  return size >= 24 || (size >= 18.66 && bold);
}
const mk = (ctx: FileContext, r: Rule, line: number, en: string, vi: string): Finding => ({
  ruleId: r.id, severity: r.severity === "off" ? "warn" : r.severity, file: ctx.file, line, message: { en, vi },
});

// ---------- CSS checks ----------
const contrast: Check = (ctx, rules) => {
  const text = rules.find((r) => (r.check as unknown as { min: number }).min >= 4.5);
  const large = rules.find((r) => (r.check as unknown as { min: number }).min < 4.5);
  const out: Finding[] = [];
  for (const block of ctx.css) {
    block.root.walkRules((rule) => {
      const d = decls(rule);
      const fg = d.get("color");
      const bg = d.get("background-color") ?? d.get("background");
      if (!fg || !bg) return;
      const ratio = contrastRatio(fg, bg, ctx.vars);
      if (ratio == null) return;
      const target = isLargeText(d, ctx.vars) ? large : text;
      if (!target) return;
      const min = (target.check as unknown as { min: number }).min;
      if (ratio + 0.01 >= min) return;
      if (ruleDisabled(rule, target.id)) return;
      out.push(mk(ctx, target, cssLine(block, rule),
        `Contrast ${ratio.toFixed(2)}:1 for "${rule.selector}" is below ${min}:1.`,
        `Tương phản ${ratio.toFixed(2)}:1 cho "${rule.selector}" dưới ${min}:1.`));
    });
  }
  return out;
};

const BORDER_PROP = /^border(-(top|right|bottom|left|inline|block)(-(start|end))?)?(-width)?$/;
const focusRing: Check = (ctx, rules) => {
  const r = rules[0];
  const out: Finding[] = [];
  for (const block of ctx.css) {
    block.root.walkRules((rule) => {
      if (!/:focus(-visible)?(?![\w-])/.test(rule.selector) || /:focus-within/.test(rule.selector)) return;
      const d = decls(rule);
      const outline = (d.get("outline") ?? "").trim();
      const outlineWidth = (d.get("outline-width") ?? "").trim();
      const removed = /^(none|0(px|rem|em)?)\b/.test(outline) || /^0(px|rem|em)?$/.test(outlineWidth);
      if (!removed) return; // an outline is present → indicator visible; a two-color outline+box-shadow ring is valid
      // Outline explicitly removed: fine only if a visible replacement exists — a box-shadow ring or a non-zero border.
      const shadow = (d.get("box-shadow") ?? "").trim();
      const hasShadow = !!shadow && shadow !== "none";
      let hasBorder = false;
      for (const [prop, val] of d) {
        const v = val.trim();
        if (BORDER_PROP.test(prop) && v && v !== "none" && !/^0(px|rem|em)?\b/.test(v)) hasBorder = true;
      }
      if (hasShadow || hasBorder || ruleDisabled(rule, r.id)) return;
      out.push(mk(ctx, r, cssLine(block, rule),
        `"${rule.selector}" removes the focus outline with no visible replacement (box-shadow ring or border).`,
        `"${rule.selector}" xoá outline focus mà không có thay thế nhìn thấy (vòng box-shadow hoặc border).`));
    });
  }
  return out;
};

const reducedMotion: Check = (ctx, rules) => {
  const r = rules[0];
  let animateLine: number | null = null;
  let guarded = false;
  for (const block of ctx.css) {
    block.root.walkAtRules(/^media$/i, (at) => { if (/prefers-reduced-motion/i.test(at.params)) guarded = true; });
    block.root.walkDecls(/^(animation|transition)(-name|-property|-duration)?$/i, (d) => {
      const v = d.value.trim();
      if (animateLine === null && v && v !== "none" && !/^0m?s?$/.test(v)) animateLine = cssLine(block, d);
    });
  }
  if (animateLine !== null && !guarded) {
    return [mk(ctx, r, animateLine,
      "File animates but has no @media (prefers-reduced-motion: reduce) block.",
      "File có chuyển động nhưng thiếu khối @media (prefers-reduced-motion: reduce).")];
  }
  return [];
};

// A "dark context" = inside @media (prefers-color-scheme: dark) or a .dark / [data-theme=dark] scope.
function inDarkContext(node: Declaration): boolean {
  let p = node.parent as { type?: string; name?: string; params?: string; selector?: string; parent?: unknown } | undefined;
  while (p) {
    if (p.type === "atrule" && /^media$/i.test(p.name ?? "") && /prefers-color-scheme\s*:\s*dark/i.test(p.params ?? "")) return true;
    if (p.type === "rule" && /\.dark\b|\.theme-dark\b|\[data-theme[~|^$*]?=['"]?dark/i.test(p.selector ?? "")) return true;
    p = p.parent as typeof p;
  }
  return false;
}

// Canonicalize a solid hex (#rgb / #rrggbb) to 6-digit lowercase; null for non-hex or alpha (#rgba/#rrggbbaa).
function canonHex(h: string): string | null {
  const m = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(h.trim());
  if (!m) return null;
  const s = m[1].toLowerCase();
  return s.length === 3 ? s.split("").map((c) => c + c).join("") : s;
}
const forbiddenValue: Check = (ctx, rules) => {
  const out: Finding[] = [];
  for (const block of ctx.css) {
    block.root.walkDecls((d) => {
      const lowerVal = d.value.toLowerCase();
      // Hex patterns match a whole color token (so "#000000" also catches "#000", but never "#0009");
      // non-hex patterns (e.g. "indigo-500") fall back to substring.
      const valueHexes = new Set(
        (d.value.match(/#[0-9a-f]{3,8}\b/gi) ?? []).map(canonHex).filter((x): x is string => x !== null),
      );
      for (const r of rules) {
        const patterns = ((r.check as { patterns?: string[] }).patterns ?? []);
        const hit = patterns.find((p) => { const ph = canonHex(p); return ph ? valueHexes.has(ph) : lowerVal.includes(p.toLowerCase()); });
        if (!hit) continue;
        // context: "dark-surface" rules only fire inside a dark theme scope.
        if ((r.check as { context?: string }).context === "dark-surface" && !inDarkContext(d)) continue;
        const parent = d.parent;
        if (parent && parent.type === "rule" && ruleDisabled(parent as PostcssRule, r.id)) continue;
        out.push(mk(ctx, r, cssLine(block, d),
          `Forbidden value "${hit}" in ${d.prop} — ${r.title.en}.`,
          `Giá trị bị cấm "${hit}" trong ${d.prop} — ${r.title.vi}.`));
      }
    });
  }
  return out;
};

// ---------- HTML checks ----------
const NON_TEXT_INPUT = new Set(["hidden", "submit", "button", "reset", "image"]);
function labelledInputs(dom: HTMLElement): Set<HTMLElement> {
  const forIds = new Set<string>();
  dom.querySelectorAll("label[for]").forEach((l) => forIds.add(l.getAttribute("for")!));
  const ok = new Set<HTMLElement>();
  dom.querySelectorAll("input, select, textarea").forEach((el) => {
    const id = el.getAttribute("id");
    const wrapped = !!el.closest("label");
    const aria = el.hasAttribute("aria-label") || el.hasAttribute("aria-labelledby");
    if (aria || wrapped || (id && forIds.has(id))) ok.add(el);
  });
  return ok;
}
const formLabel: Check = (ctx, rules) => {
  if (!ctx.dom) return [];
  const r = rules[0];
  const ok = labelledInputs(ctx.dom);
  const out: Finding[] = [];
  ctx.dom.querySelectorAll("input, select, textarea").forEach((el) => {
    const type = (el.getAttribute("type") ?? "text").toLowerCase();
    if (NON_TEXT_INPUT.has(type)) return;
    if (ok.has(el) || elDisabled(el, r.id)) return;
    const ph = el.hasAttribute("placeholder");
    out.push(mk(ctx, r, elementLine(ctx, el),
      ph ? `<${el.rawTagName}> uses a placeholder as its only label.` : `<${el.rawTagName}> has no associated label.`,
      ph ? `<${el.rawTagName}> dùng placeholder làm nhãn duy nhất.` : `<${el.rawTagName}> không có nhãn liên kết.`));
  });
  return out;
};

const SEMANTIC = new Set(["BUTTON", "A", "INPUT", "SELECT", "TEXTAREA", "LABEL", "SUMMARY", "OPTION", "DETAILS"]);
const semanticControl: Check = (ctx, rules) => {
  if (!ctx.dom) return [];
  const r = rules[0];
  const out: Finding[] = [];
  ctx.dom.querySelectorAll("[onclick]").forEach((el) => {
    if (SEMANTIC.has(el.rawTagName?.toUpperCase() ?? "") || elDisabled(el, r.id)) return;
    out.push(mk(ctx, r, elementLine(ctx, el),
      `<${el.rawTagName} onclick> is not a semantic control — use <button> or <a>.`,
      `<${el.rawTagName} onclick> không phải điều khiển ngữ nghĩa — dùng <button> hoặc <a>.`));
  });
  return out;
};

// Covers Misc Technical (⌚ 231A), arrows (2190–21FF), Misc Symbols + Dingbats (2300–27BF:
// ✅ 2705, ❤ 2764, ✨ 2728), and pictographs (1F000–1FAFF) + flags.
const EMOJI = /[\u{1F000}-\u{1FAFF}\u{1F1E6}-\u{1F1FF}\u{2190}-\u{21FF}\u{2300}-\u{27BF}\u{2B00}-\u{2BFF}]/u;
const EMOJI_STRIP = /[\u{1F000}-\u{1FAFF}\u{1F1E6}-\u{1F1FF}\u{2190}-\u{21FF}\u{2300}-\u{27BF}\u{2B00}-\u{2BFF}\u{FE0F}\u{200D}]/gu;
const emojiIcon: Check = (ctx, rules) => {
  if (!ctx.dom) return [];
  const r = rules[0];
  const out: Finding[] = [];
  ctx.dom.querySelectorAll("button, a, [role=button]").forEach((el) => {
    if (!EMOJI.test(el.text)) return;
    const named = el.hasAttribute("aria-label") || el.hasAttribute("aria-labelledby") || el.hasAttribute("title");
    const visibleText = el.text.replace(EMOJI_STRIP, "").trim(); // text left after removing the emoji glyphs
    if (named || visibleText.length > 0 || elDisabled(el, r.id)) return; // an accessible name is present
    out.push(mk(ctx, r, elementLine(ctx, el),
      `Interactive <${el.rawTagName}> uses an emoji with no text or aria label.`,
      `<${el.rawTagName}> tương tác dùng emoji mà không có nhãn chữ/aria.`));
  });
  return out;
};

const imgDimensions: Check = (ctx, rules) => {
  if (!ctx.dom) return [];
  const r = rules[0];
  const out: Finding[] = [];
  ctx.dom.querySelectorAll("img").forEach((el) => {
    const style = el.getAttribute("style") ?? "";
    // Inline width/height reserve space just as well as the attributes (consistent with targetSize).
    const hasWH = (el.hasAttribute("width") && el.hasAttribute("height"))
      || (inlinePx(style, "width") != null && inlinePx(style, "height") != null);
    const ar = /aspect-ratio/i.test(style);
    if (hasWH || ar || elDisabled(el, r.id)) return;
    out.push(mk(ctx, r, elementLine(ctx, el),
      `<img> has no width/height or aspect-ratio — reserve space to prevent CLS.`,
      `<img> thiếu width/height hoặc aspect-ratio — đặt sẵn kích thước để chống CLS.`));
  });
  return out;
};

const imgAlt: Check = (ctx, rules) => {
  if (!ctx.dom) return [];
  const r = rules[0];
  const out: Finding[] = [];
  ctx.dom.querySelectorAll("img").forEach((el) => {
    if (el.hasAttribute("alt") || elDisabled(el, r.id)) return; // alt="" (decorative) is allowed; a MISSING alt is not
    const role = (el.getAttribute("role") ?? "").toLowerCase();
    if (el.getAttribute("aria-hidden") === "true" || role === "presentation" || role === "none") return;
    out.push(mk(ctx, r, elementLine(ctx, el),
      `<img> has no alt attribute — add alt text (alt="" if purely decorative).`,
      `<img> không có thuộc tính alt — thêm alt (alt="" nếu chỉ trang trí).`));
  });
  return out;
};

const headingOrder: Check = (ctx, rules) => {
  if (!ctx.dom || !/<h[1-6]\b/i.test(ctx.source)) return []; // only files that actually have headings
  const r = rules[0];
  const out: Finding[] = [];
  let prev = 0;
  ctx.dom.querySelectorAll("h1, h2, h3, h4, h5, h6").forEach((el) => {
    const level = parseInt((el.rawTagName ?? "").slice(1), 10);
    if (!level) return;
    if (prev && level > prev + 1 && !elDisabled(el, r.id)) {
      out.push(mk(ctx, r, elementLine(ctx, el),
        `Heading <${el.rawTagName}> skips a level (from <h${prev}>) — descend one level at a time.`,
        `<${el.rawTagName}> nhảy cấp tiêu đề (từ <h${prev}>) — chỉ xuống một cấp mỗi lần.`));
    }
    prev = level;
  });
  return out;
};

const INTERACTIVE = "button, a[href], input:not([type=hidden]), select, textarea, [role=button], [onclick]";
// Read an inline dimension (prefers min-* over the plain property), in px, or null if not set inline.
function inlinePx(style: string, ...props: string[]): number | null {
  for (const p of props) {
    const v = pxOf(new RegExp(`(?:^|;)\\s*${p}\\s*:\\s*([^;]+)`, "i").exec(style)?.[1]);
    if (v != null) return v;
  }
  return null;
}
const targetSize: Check = (ctx, rules) => {
  if (!ctx.dom) return [];
  const r = rules[0];
  // native_warn_px (44/48) can't be verified from HTML alone — native platform sizing is
  // an agent-enforced note carried in the rule title, not a static check.
  const min = (r.check as unknown as { min_px: number }).min_px ?? 24;
  const out: Finding[] = [];
  ctx.dom.querySelectorAll(INTERACTIVE).forEach((el) => {
    if (elDisabled(el, r.id)) return;
    const style = el.getAttribute("style") ?? "";
    const w = inlinePx(style, "min-width", "width");
    const h = inlinePx(style, "min-height", "height");
    // WCAG 2.5.8 needs a 24x24 CSS px square to fit — any known dimension below the minimum fails.
    const small: string[] = [];
    if (w != null && w < min) small.push(`${w}px wide`);
    if (h != null && h < min) small.push(`${h}px tall`);
    if (!small.length) return;
    out.push(mk(ctx, r, elementLine(ctx, el),
      `Interactive <${el.rawTagName}> is ${small.join(" and ")} — below the ${min}x${min} CSS px minimum.`,
      `<${el.rawTagName}> tương tác ${small.join(" và ")} — dưới tối thiểu ${min}x${min} CSS px.`));
  });
  return out;
};

// ---------- i18n / theme checks ----------
const htmlLang: Check = (ctx, rules) => {
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

const logicalProperties: Check = (ctx, rules) => {
  const r = rules[0];
  const dir = /^(left|right)$/i;
  const out: Finding[] = [];
  for (const block of ctx.css) {
    block.root.walkDecls((d) => {
      const prop = d.prop.toLowerCase();
      let hit: string | null = null;
      if (/^(margin|padding)-(left|right)$/.test(prop)) hit = prop;
      else if ((prop === "text-align" || prop === "float" || prop === "clear") && dir.test(d.value.trim())) hit = `${prop}:${d.value.trim().toLowerCase()}`;
      if (!hit) return;
      const parent = d.parent;
      if (parent && parent.type === "rule" && ruleDisabled(parent as PostcssRule, r.id)) return;
      out.push(mk(ctx, r, cssLine(block, d),
        `Physical "${hit}" — use the logical (inline) equivalent for RTL / vertical support.`,
        `Vật lý "${hit}" — dùng bản logic (inline) để hỗ trợ RTL / viết dọc.`));
    });
  }
  return out;
};

const colorScheme: Check = (ctx, rules) => {
  const r = rules[0];
  if (!ctx.css.length) return [];
  if (ctx.dom && ctx.dom.querySelectorAll("meta").some((m) => (m.getAttribute("name") ?? "").toLowerCase() === "color-scheme")) return [];
  let declared = false;
  let rootLine = 0;
  for (const block of ctx.css) {
    block.root.walkDecls((d) => { if (d.prop.toLowerCase() === "color-scheme") declared = true; });
    block.root.walkRules((rule) => { if (!rootLine && /(^|,)\s*(:root|html)\b/.test(rule.selector)) rootLine = cssLine(block, rule); });
  }
  if (declared || !rootLine) return []; // no :root/html block => a snippet, don't require it
  return [mk(ctx, r, rootLine,
    "No color-scheme declared — UA-rendered widgets (form controls, scrollbars) won't match the theme.",
    "Chưa khai báo color-scheme — widget do trình duyệt vẽ (form control, thanh cuộn) sẽ không khớp theme.")];
};

function hexRgb(h: string): [number, number, number] | null {
  let s = h.replace("#", "");
  if (s.length === 3) s = s.split("").map((c) => c + c).join("");
  if (s.length < 6) return null;
  return [parseInt(s.slice(0, 2), 16), parseInt(s.slice(2, 4), 16), parseInt(s.slice(4, 6), 16)];
}
const rgbChromatic = (r: number, g: number, b: number): boolean => Math.max(r, g, b) - Math.min(r, g, b) > 12;
// The first raw chromatic color literal (hex #rgb/#rgba/#rrggbb/#rrggbbaa, rgb()/rgba(), hsl()/hsla())
// in a value, or null. Neutral black/white/grey and OKLCH (the palette's native format) are exempt.
function rawChromatic(value: string): string | null {
  for (const m of value.matchAll(/#[0-9a-fA-F]{3,8}\b/g)) {
    const hex = m[0].slice(1);
    if (hex.length !== 3 && hex.length !== 4 && hex.length !== 6 && hex.length !== 8) continue;
    const rgb = hexRgb("#" + (hex.length <= 4 ? hex.slice(0, 3) : hex.slice(0, 6))); // drop alpha nibble(s)
    if (rgb && rgbChromatic(rgb[0], rgb[1], rgb[2])) return m[0];
  }
  for (const m of value.matchAll(/rgba?\([^)]*\)/gi)) {
    const n = m[0].match(/[\d.]+/g);
    if (n && n.length >= 3 && rgbChromatic(+n[0], +n[1], +n[2])) return m[0];
  }
  for (const m of value.matchAll(/hsla?\([^)]*\)/gi)) {
    const n = m[0].match(/[\d.]+/g); // [h, s%, l%]
    if (n && n.length >= 3 && +n[1] > 10 && +n[2] > 4 && +n[2] < 96) return m[0];
  }
  return null;
}
const COLOR_PROP = /^(color|background(-color)?|border(-(top|right|bottom|left))?(-color)?|outline(-color)?|fill|stroke|box-shadow|text-decoration-color|caret-color|text-shadow)$/;
const colorTokenOnly: Check = (ctx, rules) => {
  const r = rules[0];
  const out: Finding[] = [];
  for (const block of ctx.css) {
    block.root.walkDecls((d) => {
      const prop = d.prop.toLowerCase();
      if (prop.startsWith("--") || !COLOR_PROP.test(prop)) return; // token definitions & non-color props are fine
      const chromatic = rawChromatic(d.value);
      if (!chromatic) return; // neutral black / white / grey and OKLCH are exempt
      const parent = d.parent;
      if (parent && parent.type === "rule" && ruleDisabled(parent as PostcssRule, r.id)) return;
      out.push(mk(ctx, r, cssLine(block, d),
        `Raw color "${chromatic}" in ${d.prop} — reference a token / custom property instead.`,
        `Màu thô "${chromatic}" trong ${d.prop} — hãy tham chiếu token / custom property.`));
    });
  }
  return out;
};

// ---------- frontend-markup security checks ----------
const isExternalUrl = (u: string): boolean => /^(https?:)?\/\//i.test(u);

const externalRel: Check = (ctx, rules) => {
  if (!ctx.dom) return [];
  const r = rules[0];
  const out: Finding[] = [];
  ctx.dom.querySelectorAll("a[target]").forEach((el) => {
    if ((el.getAttribute("target") ?? "").toLowerCase() !== "_blank") return;
    if (!isExternalUrl(el.getAttribute("href") ?? "")) return; // only external links
    const rel = (el.getAttribute("rel") ?? "").toLowerCase();
    if (rel.includes("noopener") || rel.includes("noreferrer") || elDisabled(el, r.id)) return;
    out.push(mk(ctx, r, elementLine(ctx, el),
      `External <a target="_blank"> has no rel="noopener" — reverse-tabnabbing risk.`,
      `<a target="_blank"> ra ngoài thiếu rel="noopener" — rủi ro reverse-tabnabbing.`));
  });
  return out;
};

const sri: Check = (ctx, rules) => {
  if (!ctx.dom) return [];
  const r = rules[0];
  const out: Finding[] = [];
  ctx.dom.querySelectorAll("script").forEach((el) => {
    const src = el.getAttribute("src") ?? "";
    if (!isExternalUrl(src) || el.hasAttribute("integrity") || elDisabled(el, r.id)) return;
    out.push(mk(ctx, r, elementLine(ctx, el),
      `External <script src> has no Subresource Integrity (integrity=...).`,
      `<script src> ngoài thiếu Subresource Integrity (integrity=...).`));
  });
  ctx.dom.querySelectorAll("link").forEach((el) => {
    const rel = (el.getAttribute("rel") ?? "").toLowerCase();
    if (!/stylesheet|preload|modulepreload/.test(rel)) return;
    if (!isExternalUrl(el.getAttribute("href") ?? "") || el.hasAttribute("integrity") || elDisabled(el, r.id)) return;
    out.push(mk(ctx, r, elementLine(ctx, el),
      `External <link rel="${rel}"> has no Subresource Integrity (integrity=...).`,
      `<link rel="${rel}"> ngoài thiếu Subresource Integrity (integrity=...).`));
  });
  return out;
};

export const CHECKS: Record<string, Check> = {
  contrast, focusRing, reducedMotion, forbiddenValue, formLabel, semanticControl, emojiIcon, imgDimensions, imgAlt, targetSize,
  headingOrder, htmlLang, logicalProperties, colorScheme, colorTokenOnly, externalRel, sri,
};

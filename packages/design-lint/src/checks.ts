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
// Resolve a single CSS length to absolute CSS px, or null if it can't be resolved statically.
// Only px/rem/em (and unitless 0) resolve; %, vw/vh, ch/ex, fr, calc()/min()/max()/clamp()/var()
// depend on layout/viewport/font and must NOT be treated as px (a "5%" wide button is not 5px).
function pxOf(value: string | undefined): number | null {
  if (!value) return null;
  const m = value.trim().match(/^(-?[\d.]+)\s*([a-z%]*)/i);
  if (!m) return null; // doesn't start with a number (calc(), min(), var(), clamp() …) → unresolvable
  const unit = m[2].toLowerCase();
  if (unit === "" || unit === "px") return parseFloat(m[1]);
  if (unit === "rem" || unit === "em") return parseFloat(m[1]) * 16;
  return null; // %, vw, vh, vmin, vmax, ch, ex, fr, cap, lh … — not a static px value
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
// ---------- JSX/TSX source scanning (MVP: className / style / JSX-tag tells; no DOM, no postcss) ----------
const lineOf = (source: string, index: number): number => source.slice(0, index).split("\n").length;
const escapeRe = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Blank //… and /*…*/ (incl. JSX {/* … */}) comments with spaces — preserving offsets and newlines —
// so the scanners never match a color/tag inside a commented-out or discussed-in-prose region. String
// literals are left intact (a className value lives in a string and must still be scanned); `\` escapes
// and `https://` inside a string are respected so they aren't mistaken for a comment.
function maskComments(src: string): string {
  const out = src.split("");
  let i = 0, quote = "";
  while (i < src.length) {
    const c = src[i];
    if (quote) {
      if (c === "\\") { i += 2; continue; }
      if (c === quote) quote = "";
      i++; continue;
    }
    if (c === '"' || c === "'" || c === "`") { quote = c; i++; continue; }
    if (c === "/" && src[i + 1] === "/") { while (i < src.length && src[i] !== "\n") out[i++] = " "; continue; }
    if (c === "/" && src[i + 1] === "*") {
      out[i++] = " "; out[i++] = " ";
      while (i < src.length && !(src[i] === "*" && src[i + 1] === "/")) { if (src[i] !== "\n") out[i] = " "; i++; }
      if (i < src.length) { out[i++] = " "; out[i++] = " "; }
      continue;
    }
    i++;
  }
  return out.join("");
}

/**
 * Opening tags in JSX source. The OUTER walk tracks string state so a `<div` written inside a string
 * literal (`{"<div onClick>"}`) is never taken for a tag; the INNER body scan is brace/quote-aware so
 * onClick={()=>a>b} and title="a>b" don't split the tag early. Run on comment-masked source.
 */
function jsxOpenTags(src: string): { tag: string; start: number; body: string }[] {
  const tags: { tag: string; start: number; body: string }[] = [];
  let i = 0, quote = "";
  while (i < src.length) {
    const c = src[i];
    if (quote) { if (c === "\\") { i += 2; continue; } if (c === quote) quote = ""; i++; continue; }
    if (c === '"' || c === "'" || c === "`") { quote = c; i++; continue; }
    const m = c === "<" ? /^<([a-z][a-z0-9]*)\b/.exec(src.slice(i, i + 40)) : null;
    if (!m) { i++; continue; }
    let j = i + m[0].length, depth = 0, q2 = "";
    for (; j < src.length; j++) {
      const cc = src[j];
      if (q2) { if (cc === q2) q2 = ""; }
      else if (cc === '"' || cc === "'" || cc === "`") q2 = cc;
      else if (cc === "{") depth++;
      else if (cc === "}") depth = Math.max(0, depth - 1);
      else if (cc === ">" && depth === 0) break;
    }
    tags.push({ tag: m[1], start: i, body: src.slice(i, j) });
    i = j + 1;
  }
  return tags;
}

// The colour/value tells (indigo-default) transfer to JSX — a hex or `indigo-500` in a className /
// style / arbitrary value is the same tell. Scanned ONLY inside real opening-tag bodies (not comments,
// import paths, JSX text or unrelated string literals), so documenting the tell isn't itself a violation.
function forbiddenValueJsx(ctx: FileContext, rules: Rule[]): Finding[] {
  const out: Finding[] = [];
  const tags = jsxOpenTags(maskComments(ctx.source));
  for (const r of rules) {
    if ((r.check as { context?: string }).context) continue; // dark-surface etc. need a CSS scope
    for (const p of (r.check as { patterns?: string[] }).patterns ?? []) {
      const re = new RegExp(escapeRe(p) + (canonHex(p) ? "\\b" : ""), "gi");
      for (const t of tags) {
        for (const m of t.body.matchAll(re)) {
          out.push(mk(ctx, r, lineOf(ctx.source, t.start + m.index!),
            `Forbidden value "${m[0]}" — ${r.title.en}.`,
            `Giá trị bị cấm "${m[0]}" — ${r.title.vi}.`));
        }
      }
    }
  }
  return out;
}

const forbiddenValue: Check = (ctx, rules) => {
  if (ctx.type === "jsx") return forbiddenValueJsx(ctx, rules);
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

const SEMANTIC = new Set(["BUTTON", "INPUT", "SELECT", "TEXTAREA", "LABEL", "SUMMARY", "OPTION", "DETAILS"]);
// JSX: a lowercase intrinsic element (<div>, <span>, <li> …, never a <Component>) with an onClick and
// no ARIA role is the div-as-button tell. Component wrappers are skipped — we can't judge their semantics.
function semanticControlJsx(ctx: FileContext, rules: Rule[]): Finding[] {
  const r = rules[0];
  const out: Finding[] = [];
  for (const t of jsxOpenTags(maskComments(ctx.source))) {
    const TAG = t.tag.toUpperCase();
    if (TAG === "A" || SEMANTIC.has(TAG)) continue;
    if (!/\bonClick\b/.test(t.body) || /\brole\s*=/.test(t.body)) continue;
    out.push(mk(ctx, r, lineOf(ctx.source, t.start),
      `<${t.tag} onClick> is not a semantic control — use <button> or <a>.`,
      `<${t.tag} onClick> không phải điều khiển ngữ nghĩa — dùng <button> hoặc <a>.`));
  }
  return out;
}

const semanticControl: Check = (ctx, rules) => {
  if (ctx.type === "jsx") return semanticControlJsx(ctx, rules);
  if (!ctx.dom) return [];
  const r = rules[0];
  const out: Finding[] = [];
  ctx.dom.querySelectorAll("[onclick]").forEach((el) => {
    const tag = el.rawTagName?.toUpperCase() ?? "";
    // <a> counts as semantic only with an href — an href-less <a onclick> has no link role
    // (mirrors the a[href] in the INTERACTIVE selector below). An explicit ARIA retrofit
    // (role + tabindex) satisfies 4.1.2, so conforming markup is not flagged.
    const retrofitted = el.hasAttribute("tabindex") && (el.getAttribute("role") ?? "").trim() !== "";
    const isSemantic = tag === "A" ? (el.hasAttribute("href") || retrofitted) : SEMANTIC.has(tag);
    if (isSemantic || elDisabled(el, r.id)) return;
    if (tag === "A") {
      out.push(mk(ctx, r, elementLine(ctx, el),
        `<a onclick> without href exposes no link role — use <button> or add a real href.`,
        `<a onclick> không có href nên không có role liên kết — dùng <button> hoặc thêm href thật.`));
    } else {
      out.push(mk(ctx, r, elementLine(ctx, el),
        `<${el.rawTagName} onclick> is not a semantic control — use <button> or <a>.`,
        `<${el.rawTagName} onclick> không phải điều khiển ngữ nghĩa — dùng <button> hoặc <a>.`));
    }
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

// ---------- document-level checks (full documents only, never fragments) ----------
const isFullDocument = (ctx: FileContext): boolean => !!ctx.dom && /<html\b/i.test(ctx.source);

const metaViewport: Check = (ctx, rules) => {
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

const viewportPresence: Check = (ctx, rules) => {
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

// Name-from-content per accname: descendant text EXCLUDING aria-hidden subtrees, with a
// descendant <img alt> contributing its alt (an <svg><title> counts only while the svg
// itself is not aria-hidden).
function accessibleText(el: HTMLElement): string {
  let s = "";
  for (const child of el.childNodes) {
    if (child.nodeType === 3) { s += (child as { text?: string }).text ?? ""; }
    else if (child.nodeType === 1) {
      const c = child as HTMLElement;
      if (c.getAttribute("aria-hidden") === "true") continue;
      if ((c.rawTagName ?? "").toUpperCase() === "IMG") { s += c.getAttribute("alt") ?? ""; continue; }
      s += accessibleText(c);
    }
  }
  return s;
}
const nonEmptyAttr = (el: HTMLElement, name: string): boolean => (el.getAttribute(name) ?? "").trim().length > 0;

const controlName: Check = (ctx, rules) => {
  if (!ctx.dom) return [];
  const r = rules[0];
  const out: Finding[] = [];
  ctx.dom.querySelectorAll("button, a[href], [role=button]").forEach((el) => {
    // aria-hidden controls are out of the a11y tree; <template> content is inert (named at clone time).
    if (el.getAttribute("aria-hidden") === "true" || el.closest("template") || elDisabled(el, r.id)) return;
    // An EMPTY aria-label/labelledby/title contributes no name per accname — require non-empty.
    const named = nonEmptyAttr(el, "aria-label") || nonEmptyAttr(el, "aria-labelledby") || nonEmptyAttr(el, "title")
      || accessibleText(el).trim().length > 0;
    if (named) return;
    out.push(mk(ctx, r, elementLine(ctx, el),
      `<${el.rawTagName}> has no accessible name — add text content or an aria-label (SR users hear only "${(el.rawTagName ?? "").toLowerCase() === "a" ? "link" : "button"}").`,
      `<${el.rawTagName}> không có tên tiếp cận — thêm chữ hoặc aria-label (trình đọc màn hình chỉ đọc "${(el.rawTagName ?? "").toLowerCase() === "a" ? "liên kết" : "nút"}").`));
  });
  return out;
};

// ---------- i18n / theme checks ----------
// A well-formed BCP-47 language tag in practice: a 2-3 ALPHA primary subtag (ISO 639-1/639-3),
// or the grandfathered/private-use singletons i-/x-; every subtag is alphanumeric, length 1-8,
// hyphen-separated. This catches the common mistakes (lang="english", "en_US", "e") with no
// false positives on real tags (en-US, zh-Hant-TW, es-419, yue). It is a well-formedness check,
// not a registry lookup — a well-formed but unregistered tag is not flagged.
function isWellFormedLang(tag: string): boolean {
  const t = tag.trim().toLowerCase();
  if (!t) return false;
  const parts = t.split("-");
  if (parts.some((p) => !/^[a-z0-9]{1,8}$/.test(p))) return false; // underscores, spaces, empties, >8 all fail
  return /^[a-z]{2,3}$/.test(parts[0]) || parts[0] === "i" || parts[0] === "x";
}
const langValid: Check = (ctx, rules) => {
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
      if (/^(margin|padding)-(left|right)$/.test(prop) || /^border-(left|right)(-(width|style|color))?$/.test(prop)) hit = prop;
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

// ---------- AI-tell markup/style checks ----------
const deadHref: Check = (ctx, rules) => {
  if (!ctx.dom) return [];
  const r = rules[0];
  const out: Finding[] = [];
  ctx.dom.querySelectorAll("a[href]").forEach((el) => {
    const href = (el.getAttribute("href") ?? "").trim();
    if ((href !== "#" && href !== "") || elDisabled(el, r.id)) return;
    out.push(mk(ctx, r, elementLine(ctx, el),
      `<a href="${href}"> is wired to nothing — link to a real target or use a <button>.`,
      `<a href="${href}"> không nối vào đâu — trỏ tới đích thật hoặc dùng <button>.`));
  });
  return out;
};

const gradientText: Check = (ctx, rules) => {
  const r = rules[0];
  const out: Finding[] = [];
  for (const block of ctx.css) {
    block.root.walkRules((rule) => {
      const d = decls(rule);
      // background-clip can be per-layer (e.g. "padding-box, text") — any layer clipping to text counts.
      const clipsText = [d.get("background-clip"), d.get("-webkit-background-clip")]
        .some((v) => (v ?? "").toLowerCase().split(",").some((layer) => layer.trim() === "text"));
      if (!clipsText) return;
      const bg = `${d.get("background") ?? ""} ${d.get("background-image") ?? ""}`;
      if (!/gradient\(/i.test(bg) || ruleDisabled(rule, r.id)) return;
      out.push(mk(ctx, r, cssLine(block, rule),
        `"${rule.selector}" clips a gradient to text — gradient text has no single computable contrast (WCAG 1.4.3 can silently fail).`,
        `"${rule.selector}" cắt gradient vào chữ — chữ gradient không có tương phản tính được (WCAG 1.4.3 có thể fail ngầm).`));
    });
  }
  return out;
};

const positiveTabindex: Check = (ctx, rules) => {
  if (!ctx.dom) return [];
  const r = rules[0];
  const out: Finding[] = [];
  ctx.dom.querySelectorAll("[tabindex]").forEach((el) => {
    const n = parseInt((el.getAttribute("tabindex") ?? "").trim(), 10);
    if (!(n >= 1) || elDisabled(el, r.id)) return;
    out.push(mk(ctx, r, elementLine(ctx, el),
      `<${el.rawTagName} tabindex="${n}"> forces tab order — use tabindex="0"/"-1" and DOM order instead.`,
      `<${el.rawTagName} tabindex="${n}"> ép thứ tự tab — dùng tabindex="0"/"-1" và thứ tự DOM.`));
  });
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

// ---------- structure / enforcement of the expanded reference content ----------
// <template> content is inert — not part of the rendered landmark/heading tree until cloned.
const notInTemplate = (el: HTMLElement): boolean => !el.closest("template");

const landmarkMain: Check = (ctx, rules) => {
  if (!isFullDocument(ctx)) return [];
  const r = rules[0];
  const mains = ctx.dom!.querySelectorAll("main, [role=main]").filter(notInTemplate);
  if (mains.length === 1) return [];
  const html = ctx.dom!.querySelector("html");
  if (!html || elDisabled(html, r.id)) return [];
  const line = mains.length > 1 ? elementLine(ctx, mains[1]) : elementLine(ctx, html);
  return [mk(ctx, r, line,
    mains.length === 0
      ? "Document has no <main> landmark — SR users can't jump to the main content."
      : `Document has ${mains.length} <main> landmarks — there must be exactly one.`,
    mains.length === 0
      ? "Tài liệu không có landmark <main> — người dùng SR không nhảy tới nội dung chính được."
      : `Tài liệu có ${mains.length} landmark <main> — phải đúng một.`)];
};

const singleH1: Check = (ctx, rules) => {
  if (!isFullDocument(ctx)) return [];
  const r = rules[0];
  const h1s = ctx.dom!.querySelectorAll("h1").filter(notInTemplate);
  if (h1s.length === 1) return [];
  const html = ctx.dom!.querySelector("html");
  if (!html || elDisabled(html, r.id)) return [];
  const line = h1s.length > 1 ? elementLine(ctx, h1s[1]) : elementLine(ctx, html);
  return [mk(ctx, r, line,
    h1s.length === 0
      ? "Document has no <h1> — every page needs one top-level heading."
      : `Document has ${h1s.length} <h1> headings — use exactly one; demote the rest.`,
    h1s.length === 0
      ? "Tài liệu không có <h1> — mỗi trang cần một tiêu đề cấp cao nhất."
      : `Tài liệu có ${h1s.length} <h1> — chỉ dùng một; hạ cấp phần còn lại.`)];
};

const fieldsetGroup: Check = (ctx, rules) => {
  if (!ctx.dom) return [];
  const r = rules[0];
  const out: Finding[] = [];
  // Radio/checkbox grouping is scoped to the owning <form> (or the document for form-less controls),
  // so key by (form, name) — two separate forms sharing a name are NOT one group.
  const DOC = {};
  const groups = new Map<unknown, Map<string, HTMLElement[]>>();
  ctx.dom.querySelectorAll("input[type=radio], input[type=checkbox]").forEach((el) => {
    const name = el.getAttribute("name");
    if (!name || el.closest("template")) return;
    const formKey = el.closest("form") ?? DOC;
    let byName = groups.get(formKey);
    if (!byName) { byName = new Map(); groups.set(formKey, byName); }
    (byName.get(name) ?? byName.set(name, []).get(name)!).push(el);
  });
  const allGroups = [...groups.values()].flatMap((byName) => [...byName.entries()]);
  for (const [name, els] of allGroups) {
    if (els.length < 2) continue;
    const grouped = els.every((el) => el.closest("fieldset") || el.closest("[role=group]") || el.closest("[role=radiogroup]"));
    if (grouped || elDisabled(els[0], r.id)) continue;
    out.push(mk(ctx, r, elementLine(ctx, els[0]),
      `The "${name}" radio/checkbox group isn't in a <fieldset> + <legend> — the group name is lost to screen readers (1.3.1).`,
      `Nhóm radio/checkbox "${name}" không nằm trong <fieldset> + <legend> — trình đọc màn hình mất tên nhóm (1.3.1).`));
  }
  return out;
};

const GENERIC_NAMES = new Set(["click here", "here", "read more", "more", "learn more", "link", "this link", "details"]);
const genericLinkText: Check = (ctx, rules) => {
  if (!ctx.dom) return [];
  const r = rules[0];
  const out: Finding[] = [];
  ctx.dom.querySelectorAll("a[href], button").forEach((el) => {
    if (el.getAttribute("aria-hidden") === "true" || elDisabled(el, r.id)) return;
    const label = (el.getAttribute("aria-label") ?? "").trim() || accessibleText(el).trim();
    if (!GENERIC_NAMES.has(label.toLowerCase())) return;
    out.push(mk(ctx, r, elementLine(ctx, el),
      `<${el.rawTagName}> text "${label}" isn't descriptive out of context — say where it goes (WCAG 2.4.4).`,
      `Chữ "${label}" của <${el.rawTagName}> không mô tả khi tách ngữ cảnh — nói rõ nó dẫn tới đâu (WCAG 2.4.4).`));
  });
  return out;
};

const focusForcedColors: Check = (ctx, rules) => {
  const r = rules[0];
  const out: Finding[] = [];
  // The recommended pattern removes outline for aesthetics + restores it in @media (forced-colors: active).
  // If the file handles forced-colors with an outline fallback, the box-shadow ring is fine — don't flag.
  let forcedColorsHandled = false;
  for (const block of ctx.css) {
    block.root.walkAtRules(/^media$/i, (at) => {
      if (!/forced-colors\s*:\s*active/i.test(at.params)) return;
      at.walkDecls(/^outline(-width|-style|-color)?$/i, (d) => {
        if (!/^(none|0(px|rem|em)?)\b/.test(d.value.trim())) forcedColorsHandled = true;
      });
    });
  }
  if (forcedColorsHandled) return [];
  for (const block of ctx.css) {
    block.root.walkRules((rule) => {
      if (!/:focus(-visible)?(?![\w-])/.test(rule.selector) || /:focus-within/.test(rule.selector)) return;
      const d = decls(rule);
      const outline = (d.get("outline") ?? "").trim();
      const removed = /^(none|0(px|rem|em)?)\b/.test(outline) || /^0(px|rem|em)?$/.test((d.get("outline-width") ?? "").trim());
      if (!removed) return; // an outline is present → survives forced-colors
      const shadow = (d.get("box-shadow") ?? "").trim();
      if (!shadow || shadow === "none") return;
      let hasBorder = false;
      for (const [prop, val] of d) {
        const v = val.trim();
        if (BORDER_PROP.test(prop) && v && v !== "none" && !/^0(px|rem|em)?\b/.test(v)) hasBorder = true;
      }
      if (hasBorder || ruleDisabled(rule, r.id)) return; // border survives forced-colors; box-shadow does not
      out.push(mk(ctx, r, cssLine(block, rule),
        `"${rule.selector}" signals focus with box-shadow only — forced-colors mode strips it. Add an outline.`,
        `"${rule.selector}" báo focus chỉ bằng box-shadow — chế độ forced-colors sẽ xoá nó. Thêm outline.`));
    });
  }
  return out;
};

const zindexScale: Check = (ctx, rules) => {
  const r = rules[0];
  const out: Finding[] = [];
  for (const block of ctx.css) {
    block.root.walkDecls(/^z-index$/i, (d) => {
      const v = d.value.trim();
      if (!/^\d+$/.test(v) || parseInt(v, 10) < 1000) return; // only raw ints >= 1000 (var()/small values are fine)
      const parent = d.parent;
      if (parent && parent.type === "rule" && ruleDisabled(parent as PostcssRule, r.id)) return;
      out.push(mk(ctx, r, cssLine(block, d),
        `z-index: ${v} — avoid arbitrary high values; use a z-index token scale (base…tooltip).`,
        `z-index: ${v} — tránh giá trị cao tuỳ tiện; dùng thang token z-index (base…tooltip).`));
    });
  }
  return out;
};

const containerQuery: Check = (ctx, rules) => {
  const r = rules[0];
  let atLine: number | null = null;
  let hasType = false;
  for (const block of ctx.css) {
    block.root.walkAtRules(/^container$/i, (at) => { if (atLine === null) atLine = cssLine(block, at); });
    block.root.walkDecls(/^container(-type)?$/i, () => { hasType = true; });
  }
  if (atLine === null || hasType) return [];
  return [mk(ctx, r, atLine,
    "@container is used but no element declares container-type — the container query never matches.",
    "Dùng @container nhưng không phần tử nào khai báo container-type — container query không bao giờ khớp.")];
};

const iframeTitle: Check = (ctx, rules) => {
  if (!ctx.dom) return [];
  const r = rules[0];
  const out: Finding[] = [];
  ctx.dom.querySelectorAll("iframe").forEach((el) => {
    if (el.closest("template") || el.getAttribute("aria-hidden") === "true" || el.hasAttribute("hidden") || elDisabled(el, r.id)) return;
    if (nonEmptyAttr(el, "title") || nonEmptyAttr(el, "aria-label") || nonEmptyAttr(el, "aria-labelledby")) return;
    out.push(mk(ctx, r, elementLine(ctx, el),
      "<iframe> has no title — screen readers announce it as an unnamed frame (WCAG 4.1.2).",
      "<iframe> không có title — trình đọc màn hình đọc là frame vô danh (WCAG 4.1.2)."));
  });
  return out;
};

const tableHeaders: Check = (ctx, rules) => {
  if (!ctx.dom) return [];
  const r = rules[0];
  const out: Finding[] = [];
  ctx.dom.querySelectorAll("table").forEach((el) => {
    const role = (el.getAttribute("role") ?? "").toLowerCase();
    if (role === "presentation" || role === "none" || elDisabled(el, r.id)) return; // layout tables exempt
    // Attribute cells to their nearest enclosing <table> so a nested table's <th> doesn't mask a header-less outer table.
    const owns = (tag: string) => el.querySelectorAll(tag).filter((c) => c.closest("table") === el);
    if (owns("td").length === 0 || owns("th").length > 0) return; // no data cells, or has its own headers
    out.push(mk(ctx, r, elementLine(ctx, el),
      "<table> has data cells but no <th> — add header cells (with scope) so the data is navigable (1.3.1).",
      "<table> có ô dữ liệu nhưng không có <th> — thêm ô tiêu đề (kèm scope) để dữ liệu điều hướng được (1.3.1)."));
  });
  return out;
};

const duplicateIdRefs: Check = (ctx, rules) => {
  if (!ctx.dom) return [];
  const r = rules[0];
  // <template> content is an inert, separate node tree — its ids don't collide with the live document.
  const referenced = new Set<string>();
  ctx.dom.querySelectorAll("label[for]").filter(notInTemplate).forEach((l) => { const v = l.getAttribute("for"); if (v) referenced.add(v); });
  for (const attr of ["aria-labelledby", "aria-describedby", "aria-controls"]) {
    ctx.dom.querySelectorAll(`[${attr}]`).filter(notInTemplate).forEach((el) => {
      (el.getAttribute(attr) ?? "").trim().split(/\s+/).forEach((id) => { if (id) referenced.add(id); });
    });
  }
  if (referenced.size === 0) return [];
  const byId = new Map<string, HTMLElement[]>();
  ctx.dom.querySelectorAll("[id]").filter(notInTemplate).forEach((el) => {
    const id = el.getAttribute("id");
    if (id) (byId.get(id) ?? byId.set(id, []).get(id)!).push(el);
  });
  const out: Finding[] = [];
  for (const id of referenced) {
    const els = byId.get(id);
    if (!els || els.length < 2 || elDisabled(els[1], r.id)) continue;
    out.push(mk(ctx, r, elementLine(ctx, els[1]),
      `id="${id}" is referenced by a label/aria attribute but appears ${els.length} times — the association is ambiguous.`,
      `id="${id}" được tham chiếu bởi label/aria nhưng xuất hiện ${els.length} lần — liên kết mơ hồ.`));
  }
  return out;
};

// ---------- Document metadata / technical-SEO checks (full-document scoped) ----------
const documentTitle: Check = (ctx, rules) => {
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

const metaDescription: Check = (ctx, rules) => {
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

const canonicalUnique: Check = (ctx, rules) => {
  if (!ctx.dom) return [];
  const r = rules[0];
  const canon = ctx.dom.querySelectorAll("link[rel]").filter((l) =>
    (l.getAttribute("rel") ?? "").trim().toLowerCase() === "canonical" && notInTemplate(l));
  if (canon.length < 2) return [];
  return [mk(ctx, r, elementLine(ctx, canon[1]),
    `The document has ${canon.length} <link rel="canonical"> — search engines ignore all but one (often the wrong one). Keep exactly one.`,
    `Tài liệu có ${canon.length} <link rel="canonical"> — máy tìm kiếm chỉ giữ một (thường là cái sai). Chỉ để đúng một.`)];
};

const viewportFit: Check = (ctx, rules) => {
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

// WAI-ARIA 1.2 concrete roles (abstract roles like "widget"/"roletype" are intentionally excluded —
// authoring them is invalid). DPUB-ARIA (doc-*) and Graphics-ARIA (graphics-*) roles are accepted by prefix.
const VALID_ROLES = new Set([
  "button", "checkbox", "gridcell", "link", "menuitem", "menuitemcheckbox", "menuitemradio", "option",
  "progressbar", "radio", "scrollbar", "searchbox", "separator", "slider", "spinbutton", "switch", "tab",
  "tabpanel", "textbox", "treeitem", "combobox", "grid", "listbox", "menu", "menubar", "radiogroup",
  "tablist", "tree", "treegrid", "application", "article", "blockquote", "caption", "cell", "columnheader",
  "definition", "deletion", "directory", "document", "emphasis", "feed", "figure", "generic", "group",
  "heading", "img", "insertion", "list", "listitem", "math", "meter", "none", "note", "paragraph",
  "presentation", "row", "rowgroup", "rowheader", "strong", "subscript", "superscript", "table", "term",
  "time", "toolbar", "tooltip", "banner", "complementary", "contentinfo", "form", "main", "navigation",
  "region", "search", "alert", "log", "marquee", "status", "timer", "alertdialog", "dialog",
]);
const isValidRole = (t: string): boolean => VALID_ROLES.has(t) || /^(doc|graphics)-/.test(t);

const invalidRole: Check = (ctx, rules) => {
  if (!ctx.dom) return [];
  const r = rules[0];
  const out: Finding[] = [];
  ctx.dom.querySelectorAll("[role]").forEach((el) => {
    if (el.closest("template") || elDisabled(el, r.id)) return;
    const raw = (el.getAttribute("role") ?? "").trim();
    const tokens = raw.toLowerCase().split(/\s+/).filter(Boolean);
    if (!tokens.length || tokens.some(isValidRole)) return; // empty attr, or has a valid (fallback) token
    out.push(mk(ctx, r, elementLine(ctx, el),
      `role="${raw}" is not a valid ARIA role — it exposes no role to assistive tech (a typo silently does nothing).`,
      `role="${raw}" không phải role ARIA hợp lệ — không phơi role nào cho công nghệ trợ giúp (gõ sai âm thầm vô hiệu).`));
  });
  return out;
};

const INTERACTIVE_ROLE = new Set(["button", "link", "checkbox", "radio", "menuitem", "menuitemcheckbox", "menuitemradio", "tab", "switch", "option", "slider", "spinbutton", "textbox", "combobox", "searchbox"]);
const isInteractiveEl = (el: HTMLElement): boolean => {
  const tag = (el.rawTagName ?? "").toLowerCase();
  if (tag === "a" || tag === "area") return el.hasAttribute("href");
  if (tag === "button" || tag === "select" || tag === "textarea") return true;
  if (tag === "input") return (el.getAttribute("type") ?? "").toLowerCase() !== "hidden";
  return INTERACTIVE_ROLE.has((el.getAttribute("role") ?? "").toLowerCase());
};

const nestedInteractive: Check = (ctx, rules) => {
  if (!ctx.dom) return [];
  const r = rules[0];
  const out: Finding[] = [];
  ctx.dom.querySelectorAll("a, area, button, input, select, textarea, [role]").forEach((el) => {
    if (!isInteractiveEl(el) || el.closest("template") || elDisabled(el, r.id)) return;
    for (let p = el.parentNode as HTMLElement | null; p && p.nodeType === 1; p = p.parentNode as HTMLElement | null) {
      if (isInteractiveEl(p)) {
        out.push(mk(ctx, r, elementLine(ctx, el),
          `<${el.rawTagName}> is nested inside an interactive <${p.rawTagName}> — nested controls break keyboard focus and screen-reader semantics (4.1.2).`,
          `<${el.rawTagName}> lồng trong <${p.rawTagName}> tương tác — điều khiển lồng phá focus bàn phím và ngữ nghĩa trình đọc màn hình (4.1.2).`));
        break;
      }
    }
  });
  return out;
};

const listStructure: Check = (ctx, rules) => {
  if (!ctx.dom) return [];
  const r = rules[0];
  const out: Finding[] = [];
  ctx.dom.querySelectorAll("ul, ol").forEach((el) => {
    if (el.closest("template") || el.hasAttribute("role") || elDisabled(el, r.id)) return; // a role override re-purposes the list
    const bad = el.childNodes.find((c) => c.nodeType === 1 && !["li", "script", "template"].includes(((c as HTMLElement).rawTagName ?? "").toLowerCase()));
    if (bad) out.push(mk(ctx, r, elementLine(ctx, el),
      `<${el.rawTagName}> has a non-<li> child <${(bad as HTMLElement).rawTagName}> — only <li> (plus <script>/<template>) may be a direct child, or the list semantics break.`,
      `<${el.rawTagName}> có con không phải <li> là <${(bad as HTMLElement).rawTagName}> — chỉ <li> (cùng <script>/<template>) được làm con trực tiếp, nếu không ngữ nghĩa danh sách hỏng.`));
  });
  return out;
};

export const CHECKS: Record<string, Check> = {
  contrast, focusRing, reducedMotion, forbiddenValue, formLabel, semanticControl, emojiIcon, imgDimensions, imgAlt, targetSize,
  headingOrder, htmlLang, logicalProperties, colorScheme, colorTokenOnly, externalRel, sri,
  metaViewport, viewportPresence, controlName, deadHref, gradientText, positiveTabindex, langValid,
  landmarkMain, singleH1, fieldsetGroup, genericLinkText, focusForcedColors, zindexScale, containerQuery,
  iframeTitle, tableHeaders, duplicateIdRefs, viewportFit,
  documentTitle, metaDescription, canonicalUnique,
  invalidRole, nestedInteractive, listStructure,
};

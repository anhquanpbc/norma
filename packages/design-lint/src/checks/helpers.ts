import type { Rule as PostcssRule, Declaration, ChildNode } from "postcss";
import type { HTMLElement } from "node-html-parser";
import type { CssBlock, FileContext, Finding, Rule } from "../types.js";
import { resolveVar } from "../color.js";

// ---------- helpers ----------
export const cssLine = (block: CssBlock, node: { source?: { start?: { line: number } } }): number =>
  (node.source?.start?.line ?? 1) + block.startLine - 1;

export function ruleDisabled(rule: PostcssRule, ruleId: string): boolean {
  const texts: string[] = [];
  const prev = rule.prev();
  if (prev && prev.type === "comment") texts.push((prev as { text: string }).text);
  rule.each((n: ChildNode) => { if (n.type === "comment") texts.push((n as { text: string }).text); });
  return texts.some((t) => t.includes("norma-disable") && t.includes(ruleId));
}
export const elDisabled = (el: HTMLElement, ruleId: string): boolean => {
  const a = el.getAttribute("data-norma-disable");
  return !!a && (a.includes(ruleId) || a.includes("all"));
};

export function decls(rule: PostcssRule): Map<string, string> {
  const m = new Map<string, string>();
  rule.walkDecls((d: Declaration) => { m.set(d.prop.toLowerCase(), d.value); });
  return m;
}
// Resolve a single CSS length to absolute CSS px, or null if it can't be resolved statically.
// Only px/rem/em (and unitless 0) resolve; %, vw/vh, ch/ex, fr, calc()/min()/max()/clamp()/var()
// depend on layout/viewport/font and must NOT be treated as px (a "5%" wide button is not 5px).
export function pxOf(value: string | undefined): number | null {
  if (!value) return null;
  const m = value.trim().match(/^(-?[\d.]+)\s*([a-z%]*)/i);
  if (!m) return null; // doesn't start with a number (calc(), min(), var(), clamp() …) → unresolvable
  const unit = m[2].toLowerCase();
  if (unit === "" || unit === "px") return parseFloat(m[1]);
  if (unit === "rem" || unit === "em") return parseFloat(m[1]) * 16;
  return null; // %, vw, vh, vmin, vmax, ch, ex, fr, cap, lh … — not a static px value
}
export function isLargeText(d: Map<string, string>, vars: Map<string, string>): boolean {
  // Resolve tokens first: a heading sized via font-size:var(--h1) is still large text,
  // and must be held to the 3:1 (not 4.5:1) threshold. Without this, token-driven headings
  // are misclassified as body text and falsely fail color.contrast.text at error severity.
  const size = pxOf(resolveVar(d.get("font-size") ?? "", vars));
  const w = resolveVar(d.get("font-weight") ?? "", vars).trim();
  const bold = w === "bold" || parseInt(w, 10) >= 700;
  if (size == null) return false;
  return size >= 24 || (size >= 18.66 && bold);
}
export const mk = (ctx: FileContext, r: Rule, line: number, en: string, vi: string): Finding => ({
  ruleId: r.id, severity: r.severity === "off" ? "warn" : r.severity, file: ctx.file, line, message: { en, vi },
});

export const BORDER_PROP = /^border(-(top|right|bottom|left|inline|block)(-(start|end))?)?(-width)?$/;

// A "dark context" = inside @media (prefers-color-scheme: dark) or a .dark / [data-theme=dark] scope.
export function inDarkContext(node: Declaration): boolean {
  let p = node.parent as { type?: string; name?: string; params?: string; selector?: string; parent?: unknown } | undefined;
  while (p) {
    if (p.type === "atrule" && /^media$/i.test(p.name ?? "") && /prefers-color-scheme\s*:\s*dark/i.test(p.params ?? "")) return true;
    if (p.type === "rule" && /\.dark\b|\.theme-dark\b|\[data-theme[~|^$*]?=['"]?dark/i.test(p.selector ?? "")) return true;
    p = p.parent as typeof p;
  }
  return false;
}

// Canonicalize a solid hex (#rgb / #rrggbb) to 6-digit lowercase; null for non-hex or alpha (#rgba/#rrggbbaa).
export function canonHex(h: string): string | null {
  const m = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(h.trim());
  if (!m) return null;
  const s = m[1].toLowerCase();
  return s.length === 3 ? s.split("").map((c) => c + c).join("") : s;
}
// ---------- JSX/TSX source scanning (MVP: className / style / JSX-tag tells; no DOM, no postcss) ----------
export const lineOf = (source: string, index: number): number => source.slice(0, index).split("\n").length;
export const escapeRe = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Blank //… and /*…*/ (incl. JSX {/* … */}) comments with spaces — preserving offsets and newlines —
// so the scanners never match a color/tag inside a commented-out or discussed-in-prose region. String
// literals are left intact (a className value lives in a string and must still be scanned); `\` escapes
// and `https://` inside a string are respected so they aren't mistaken for a comment.
export function maskComments(src: string): string {
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
    if (c === "<" && src[i + 1] === "!" && src[i + 2] === "-" && src[i + 3] === "-") { // HTML comment (Vue/Svelte templates)
      out[i++] = " "; out[i++] = " "; out[i++] = " "; out[i++] = " ";
      while (i < src.length && !(src[i] === "-" && src[i + 1] === "-" && src[i + 2] === ">")) { if (src[i] !== "\n") out[i] = " "; i++; }
      if (i < src.length) { out[i++] = " "; out[i++] = " "; out[i++] = " "; }
      continue;
    }
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
export function jsxOpenTags(src: string): { tag: string; start: number; body: string }[] {
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

/** The className/class attribute VALUES in a JSX opening-tag body — the only place a non-hex class token
 *  (e.g. `indigo-500`) is the colour tell. The same substring in an href / data-* / prop is not a colour. */
export function classText(body: string): string {
  const out: string[] = [];
  const re = /\b(?:className|class)\s*=\s*/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(body))) {
    const k = m.index + m[0].length;
    const ch = body[k];
    if (ch === '"' || ch === "'" || ch === "`") {
      const end = body.indexOf(ch, k + 1);
      out.push(body.slice(k + 1, end < 0 ? body.length : end));
    } else if (ch === "{") {
      let depth = 0, j = k;
      for (; j < body.length; j++) {
        if (body[j] === "{") depth++;
        else if (body[j] === "}") { depth--; if (depth === 0) break; }
      }
      out.push(body.slice(k + 1, j));
    }
  }
  return out.join("\n");
}

// The colour/value tells (indigo-default) transfer to JSX — a hex or `indigo-500` in a className /
// style / arbitrary value is the same tell. Scanned ONLY inside real opening-tag bodies (not comments,
// import paths, JSX text or unrelated string literals), so documenting the tell isn't itself a violation.
export function forbiddenValueJsx(ctx: FileContext, rules: Rule[]): Finding[] {
  const out: Finding[] = [];
  const tags = jsxOpenTags(maskComments(ctx.source));
  for (const r of rules) {
    if ((r.check as { context?: string }).context) continue; // dark-surface etc. need a CSS scope
    for (const p of (r.check as { patterns?: string[] }).patterns ?? []) {
      const hex = !!canonHex(p);
      const re = new RegExp(escapeRe(p) + (hex ? "\\b" : ""), "gi");
      for (const t of tags) {
        // A specific indigo HEX (#667eea) is the tell anywhere in the tag (style, className, a colour prop);
        // a non-hex class token (indigo-500) is the tell ONLY inside a className/class value — the same
        // substring in an href/data-*/prop is not a colour. Non-hex matches report at the tag's line.
        const haystack = hex ? t.body : classText(t.body);
        for (const m of haystack.matchAll(re)) {
          out.push(mk(ctx, r, lineOf(ctx.source, hex ? t.start + m.index! : t.start),
            `Forbidden value "${m[0]}" — ${r.title.en}.`,
            `Giá trị bị cấm "${m[0]}" — ${r.title.vi}.`));
        }
      }
    }
  }
  return out;
}

// ---------- HTML checks ----------
export const NON_TEXT_INPUT = new Set(["hidden", "submit", "button", "reset", "image"]);
export function labelledInputs(dom: HTMLElement): Set<HTMLElement> {
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

export const SEMANTIC = new Set(["BUTTON", "INPUT", "SELECT", "TEXTAREA", "LABEL", "SUMMARY", "OPTION", "DETAILS"]);
// A lowercase intrinsic element (<div>, <span>, <li> …, never a <Component>) carrying a click handler and
// no ARIA role is the div-as-button tell — across JSX (onClick), Vue (@click / v-on:click) and Svelte
// (on:click). Component wrappers are skipped — we can't judge their semantics.
export const CLICK_HANDLER = /@click\b|\bv-on:click\b|\bon:click\b|\bonClick\b/;
export function semanticControlJsx(ctx: FileContext, rules: Rule[]): Finding[] {
  const r = rules[0];
  const out: Finding[] = [];
  for (const t of jsxOpenTags(maskComments(ctx.source))) {
    const TAG = t.tag.toUpperCase();
    if (TAG === "A" || SEMANTIC.has(TAG)) continue;
    // A click handler / role is an attribute NAME — never inside a quoted value. Strip quoted values first
    // so `title="a@click.com"` isn't read as a handler and `title="role=x"` doesn't fake an ARIA retrofit.
    const attrs = t.body.replace(/"[^"]*"|'[^']*'/g, "");
    if (!CLICK_HANDLER.test(attrs) || /\brole\s*=/.test(attrs)) continue;
    out.push(mk(ctx, r, lineOf(ctx.source, t.start),
      `<${t.tag}> has a click handler but is not a semantic control — use <button> or <a>.`,
      `<${t.tag}> có xử lý click nhưng không phải điều khiển ngữ nghĩa — dùng <button> hoặc <a>.`));
  }
  return out;
}

// Covers Misc Technical (⌚ 231A), arrows (2190–21FF), Misc Symbols + Dingbats (2300–27BF:
// ✅ 2705, ❤ 2764, ✨ 2728), and pictographs (1F000–1FAFF) + flags.
export const EMOJI = /[\u{1F000}-\u{1FAFF}\u{1F1E6}-\u{1F1FF}\u{2190}-\u{21FF}\u{2300}-\u{27BF}\u{2B00}-\u{2BFF}]/u;
export const EMOJI_STRIP = /[\u{1F000}-\u{1FAFF}\u{1F1E6}-\u{1F1FF}\u{2190}-\u{21FF}\u{2300}-\u{27BF}\u{2B00}-\u{2BFF}\u{FE0F}\u{200D}]/gu;

export const INTERACTIVE = "button, a[href], input:not([type=hidden]), select, textarea, [role=button], [onclick]";
// Read an inline dimension (prefers min-* over the plain property), in px, or null if not set inline.
export function inlinePx(style: string, ...props: string[]): number | null {
  for (const p of props) {
    const v = pxOf(new RegExp(`(?:^|;)\\s*${p}\\s*:\\s*([^;]+)`, "i").exec(style)?.[1]);
    if (v != null) return v;
  }
  return null;
}

// ---------- document-level checks (full documents only, never fragments) ----------
export const isFullDocument = (ctx: FileContext): boolean => !!ctx.dom && /<html\b/i.test(ctx.source);

// Name-from-content per accname: descendant text EXCLUDING aria-hidden subtrees, with a
// descendant <img alt> contributing its alt (an <svg><title> counts only while the svg
// itself is not aria-hidden).
export function accessibleText(el: HTMLElement): string {
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
export const nonEmptyAttr = (el: HTMLElement, name: string): boolean => (el.getAttribute(name) ?? "").trim().length > 0;

// ---------- i18n / theme checks ----------
// A well-formed BCP-47 language tag in practice: a 2-3 ALPHA primary subtag (ISO 639-1/639-3),
// or the grandfathered/private-use singletons i-/x-; every subtag is alphanumeric, length 1-8,
// hyphen-separated. This catches the common mistakes (lang="english", "en_US", "e") with no
// false positives on real tags (en-US, zh-Hant-TW, es-419, yue). It is a well-formedness check,
// not a registry lookup — a well-formed but unregistered tag is not flagged.
export function isWellFormedLang(tag: string): boolean {
  const t = tag.trim().toLowerCase();
  if (!t) return false;
  const parts = t.split("-");
  if (parts.some((p) => !/^[a-z0-9]{1,8}$/.test(p))) return false; // underscores, spaces, empties, >8 all fail
  return /^[a-z]{2,3}$/.test(parts[0]) || parts[0] === "i" || parts[0] === "x";
}

export function hexRgb(h: string): [number, number, number] | null {
  let s = h.replace("#", "");
  if (s.length === 3) s = s.split("").map((c) => c + c).join("");
  if (s.length < 6) return null;
  return [parseInt(s.slice(0, 2), 16), parseInt(s.slice(2, 4), 16), parseInt(s.slice(4, 6), 16)];
}
export const rgbChromatic = (r: number, g: number, b: number): boolean => Math.max(r, g, b) - Math.min(r, g, b) > 12;
// The first raw chromatic color literal (hex #rgb/#rgba/#rrggbb/#rrggbbaa, rgb()/rgba(), hsl()/hsla())
// in a value, or null. Neutral black/white/grey and OKLCH (the palette's native format) are exempt.
export function rawChromatic(value: string): string | null {
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
export const COLOR_PROP = /^(color|background(-color)?|border(-(top|right|bottom|left))?(-color)?|outline(-color)?|fill|stroke|box-shadow|text-decoration-color|caret-color|text-shadow)$/;

// A color literal anywhere in a declaration value (oklch() covers the Norma token format; hex too).
export const COLOR_LITERAL = /oklch\([^)]*\)|#[0-9a-f]{3,8}\b/gi;

// Blank string literals and url(...) (SVG fragment refs, data: URIs) — length-preserving — so a hex/oklch
// that lives inside `content:"…"` or `url(#id)` isn't mistaken for a colour usage: it isn't one, and there
// is no token to reference there. This also covers `fill: url(#id)` where a property allow-list could not.
export const maskNonColor = (value: string): string =>
  value.replace(/"[^"]*"|'[^']*'/g, (m) => " ".repeat(m.length)).replace(/url\([^)]*\)/gi, (m) => " ".repeat(m.length));

// ---------- frontend-markup security checks ----------
export const isExternalUrl = (u: string): boolean => /^(https?:)?\/\//i.test(u);

// ---------- structure / enforcement of the expanded reference content ----------
// <template> content is inert — not part of the rendered landmark/heading tree until cloned.
export const notInTemplate = (el: HTMLElement): boolean => !el.closest("template");

// A bypass link's target (WCAG 2.4.1) must land focus at or around the main content: the target IS the
// <main>, CONTAINS it (a wrapper), or is INSIDE it. Uses only querySelectorAll containment (identity).
export const mainRelated = (target: HTMLElement, main: HTMLElement): boolean =>
  target === main ||
  target.querySelectorAll("main, [role=main]").includes(main) ||   // target wraps main
  main.querySelectorAll("[id]").includes(target);                  // target is inside main

export const GENERIC_NAMES = new Set(["click here", "here", "read more", "more", "learn more", "link", "this link", "details"]);

// Box-geometry / size properties. A :focus / :focus-visible rule must only REPAINT the control
// (outline*, box-shadow, border-color/style, background, color, filter) — changing its corner radius,
// border thickness, size, padding or text metrics on focus snaps the corners / reflows the box, and a
// still-present static border then reads as a doubled outer border (the "focus grows a second border /
// morphs the control" AI tell). outline & outline-offset are the ring itself and are always allowed (a
// NEGATIVE outline-offset is the canonical inset-ring technique); a position move (the skip-link reveal
// `.skip:focus{ left:0 }`) is a legitimate pattern, so top/right/bottom/left/inset are NOT included.
export const RESHAPE_PROP =
  /^(border-radius|border-(top|bottom)-(left|right)-radius|border-(start|end)-(start|end)-radius|border-width|border-(top|right|bottom|left|inline|block)(-(start|end))?-width|width|height|(min|max)-(width|height|inline-size|block-size)|inline-size|block-size|padding(-(top|right|bottom|left|inline|block)(-(start|end))?)?|font-size|line-height)$/;

export const OG_CORE = new Set(["og:title", "og:url", "og:image"]);

// WAI-ARIA 1.2 concrete roles (abstract roles like "widget"/"roletype" are intentionally excluded —
// authoring them is invalid). DPUB-ARIA (doc-*) and Graphics-ARIA (graphics-*) roles are accepted by prefix.
export const VALID_ROLES = new Set([
  "button", "checkbox", "gridcell", "link", "menuitem", "menuitemcheckbox", "menuitemradio", "option",
  "progressbar", "radio", "scrollbar", "searchbox", "separator", "slider", "spinbutton", "switch", "tab",
  "tabpanel", "textbox", "treeitem", "combobox", "grid", "listbox", "menu", "menubar", "radiogroup",
  "tablist", "tree", "treegrid", "application", "article", "blockquote", "caption", "cell", "code", "columnheader",
  "definition", "deletion", "directory", "document", "emphasis", "feed", "figure", "generic", "group",
  "heading", "img", "insertion", "list", "listitem", "math", "meter", "none", "note", "paragraph",
  "presentation", "row", "rowgroup", "rowheader", "strong", "subscript", "superscript", "table", "term",
  "time", "toolbar", "tooltip", "banner", "complementary", "contentinfo", "form", "main", "navigation",
  "region", "search", "alert", "log", "marquee", "status", "timer", "alertdialog", "dialog",
]);
export const isValidRole = (t: string): boolean => VALID_ROLES.has(t) || /^(doc|graphics)-/.test(t);

export const INTERACTIVE_ROLE = new Set(["button", "link", "checkbox", "radio", "menuitem", "menuitemcheckbox", "menuitemradio", "tab", "switch", "option", "slider", "spinbutton", "textbox", "combobox", "searchbox"]);
export const isInteractiveEl = (el: HTMLElement): boolean => {
  const tag = (el.rawTagName ?? "").toLowerCase();
  if (tag === "a" || tag === "area") return el.hasAttribute("href");
  if (tag === "button" || tag === "select" || tag === "textarea") return true;
  if (tag === "input") return (el.getAttribute("type") ?? "").toLowerCase() !== "hidden";
  return INTERACTIVE_ROLE.has((el.getAttribute("role") ?? "").toLowerCase());
};

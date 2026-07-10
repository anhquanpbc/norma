import postcss from "postcss";
import { parse as parseHtml, type HTMLElement } from "node-html-parser";
import type { FileType } from "./types.js";

// The deterministic, single-edit rules that can be auto-fixed with no human judgement.
// Everything else (contrast, target-size, labels, lang, alt text, dead hrefs …) needs a decision
// and is intentionally NOT auto-fixed.
const LOGICAL_PROP: Record<string, string> = {
  "margin-left": "margin-inline-start", "margin-right": "margin-inline-end",
  "padding-left": "padding-inline-start", "padding-right": "padding-inline-end",
  "border-left": "border-inline-start", "border-right": "border-inline-end",
  "border-left-width": "border-inline-start-width", "border-right-width": "border-inline-end-width",
  "border-left-style": "border-inline-start-style", "border-right-style": "border-inline-end-style",
  "border-left-color": "border-inline-start-color", "border-right-color": "border-inline-end-color",
};
// text-align takes the flow-relative keywords start/end; float and clear take inline-start/inline-end.
// float:start / clear:end are INVALID CSS — the browser drops the whole declaration, silently deleting the
// float the fixer claims to preserve — so the two properties must never share text-align's map. Mirrors the
// i18n.logical-properties remediation in standard/rules.yaml.
const LOGICAL_ALIGN: Record<string, string> = { left: "start", right: "end" };
const LOGICAL_FLOAT: Record<string, string> = { left: "inline-start", right: "inline-end" };

/** Rename physical → logical properties in a CSS string, format-preserving via postcss. */
function fixCss(css: string): [string, number] {
  let count = 0;
  let root;
  try { root = postcss.parse(css); } catch { return [css, 0]; }
  root.walkDecls((d) => {
    const prop = d.prop.toLowerCase();
    if (LOGICAL_PROP[prop]) { d.prop = LOGICAL_PROP[prop]; count++; return; }
    const map = prop === "text-align" ? LOGICAL_ALIGN : (prop === "float" || prop === "clear") ? LOGICAL_FLOAT : null;
    if (map) {
      const v = d.value.trim().toLowerCase();
      if (map[v]) { d.value = map[v]; count++; }
    }
  });
  return count ? [root.toString(), count] : [css, 0];
}

export interface FixResult { output: string; fixed: number; }

const elRange = (el: HTMLElement): [number, number] | undefined =>
  (el as unknown as { range?: [number, number] }).range;

// The offset of the opening tag's real `>` (or self-closing `/`), scanning from the element start and
// skipping any `>` that sits inside a quoted attribute value — so a title="a > b" can't fool us.
function openTagCloseOffset(source: string, from: number): number {
  let quote = "";
  for (let i = from; i < source.length; i++) {
    const ch = source[i];
    if (quote) { if (ch === quote) quote = ""; }
    else if (ch === '"' || ch === "'") quote = ch;
    else if (ch === ">") return source[i - 1] === "/" ? i - 1 : i;
  }
  return -1;
}

/** Apply the safe auto-fixes to a source file. Returns the new source and the number of edits. */
export function fixSource(source: string, type: FileType): FixResult {
  if (type === "css") {
    const [output, fixed] = fixCss(source);
    return { output, fixed };
  }
  // HTML: DOM-driven, offset-based edits — we only ever edit inside a real element's opening tag, never
  // text nodes / comments / other attributes, and the rest of the file is byte-for-byte preserved.
  let fixed = 0;
  const edits: { start: number; end: number; text: string }[] = [];
  const dom = parseHtml(source, { comment: true });

  // a11y.no-positive-tabindex → tabindex="0". Scoped to elements that genuinely have a positive
  // tabindex attribute (so data-tabindex, <pre> text, comments and other attrs are never touched);
  // the (?<![\w-]) boundary picks the real attr even when a data-tabindex is also present.
  dom.querySelectorAll("[tabindex]").forEach((el: HTMLElement) => {
    if (!/^[1-9]\d*$/.test((el.getAttribute("tabindex") ?? "").trim())) return;
    const range = elRange(el);
    if (!range) return;
    const close = openTagCloseOffset(source, range[0]);
    if (close < 0) return;
    const tag = source.slice(range[0], close);
    const m = /(?<![\w-])tabindex\s*=\s*(["'])[1-9]\d*\1/i.exec(tag);
    if (!m) return;
    const start = range[0] + m.index;
    edits.push({ start, end: start + m[0].length, text: m[0].replace(/[1-9]\d*/, "0") });
    fixed++;
  });

  // security.external-rel → insert rel="noopener noreferrer" on an external target="_blank" link with
  // NO rel yet (a partial rel is left for manual review to avoid clobbering it).
  dom.querySelectorAll("a[target]").forEach((el: HTMLElement) => {
    if ((el.getAttribute("target") ?? "").toLowerCase() !== "_blank") return;
    if (!/^(https?:)?\/\//i.test(el.getAttribute("href") ?? "")) return;
    if (el.hasAttribute("rel")) return;
    const range = elRange(el);
    if (!range) return;
    const at = openTagCloseOffset(source, range[0]);
    if (at < 0) return;
    edits.push({ start: at, end: at, text: ` rel="noopener noreferrer"` });
    fixed++;
  });

  edits.sort((a, b) => b.start - a.start); // apply right-to-left so offsets stay valid
  let output = source;
  for (const e of edits) output = output.slice(0, e.start) + e.text + output.slice(e.end);
  return { output, fixed };
}

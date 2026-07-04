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
const LOGICAL_ALIGN: Record<string, string> = { left: "start", right: "end" };

/** Rename physical → logical properties in a CSS string, format-preserving via postcss. */
function fixCss(css: string): [string, number] {
  let count = 0;
  let root;
  try { root = postcss.parse(css); } catch { return [css, 0]; }
  root.walkDecls((d) => {
    const prop = d.prop.toLowerCase();
    if (LOGICAL_PROP[prop]) { d.prop = LOGICAL_PROP[prop]; count++; return; }
    if (prop === "text-align" || prop === "float" || prop === "clear") {
      const v = d.value.trim().toLowerCase();
      if (LOGICAL_ALIGN[v]) { d.value = LOGICAL_ALIGN[v]; count++; }
    }
  });
  return count ? [root.toString(), count] : [css, 0];
}

export interface FixResult { output: string; fixed: number; }

/** Apply the safe auto-fixes to a source file. Returns the new source and the number of edits. */
export function fixSource(source: string, type: FileType): FixResult {
  if (type === "css") {
    const [output, fixed] = fixCss(source);
    return { output, fixed };
  }
  // HTML: surgical, offset-based edits so the rest of the file is byte-for-byte preserved.
  let fixed = 0;
  const edits: { start: number; end: number; text: string }[] = [];

  // a11y.no-positive-tabindex → tabindex="0" (an unambiguous value swap).
  for (const m of source.matchAll(/tabindex\s*=\s*(["'])[1-9]\d*\1/gi)) {
    const start = m.index!;
    edits.push({ start, end: start + m[0].length, text: m[0].replace(/[1-9]\d*/, "0") });
    fixed++;
  }

  // security.external-rel → insert rel="noopener noreferrer" on an external target="_blank" link
  // that has NO rel yet (a partial rel is left for manual review to avoid clobbering it).
  const dom = parseHtml(source, { comment: true });
  dom.querySelectorAll("a[target]").forEach((el: HTMLElement) => {
    if ((el.getAttribute("target") ?? "").toLowerCase() !== "_blank") return;
    if (!/^(https?:)?\/\//i.test(el.getAttribute("href") ?? "")) return;
    if (el.hasAttribute("rel")) return;
    const range = (el as unknown as { range?: [number, number] }).range;
    if (!range) return;
    const gt = source.indexOf(">", range[0]);
    if (gt < 0) return;
    const at = source[gt - 1] === "/" ? gt - 1 : gt; // before a self-closing slash if present
    edits.push({ start: at, end: at, text: ` rel="noopener noreferrer"` });
    fixed++;
  });

  edits.sort((a, b) => b.start - a.start); // apply right-to-left so offsets stay valid
  let output = source;
  for (const e of edits) output = output.slice(0, e.start) + e.text + output.slice(e.end);
  return { output, fixed };
}

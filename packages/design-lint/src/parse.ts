import { parse as parseHtml, HTMLElement } from "node-html-parser";
import postcss, { Root } from "postcss";
import type { CssBlock, FileContext, FileType } from "./types.js";

function lineAt(source: string, index: number): number {
  let line = 1;
  for (let i = 0; i < index && i < source.length; i++) if (source[i] === "\n") line++;
  return line;
}

function parseCss(css: string, startLine: number): CssBlock | null {
  try {
    return { root: postcss.parse(css) as Root, startLine };
  } catch {
    return null; // tolerate malformed CSS rather than crash the run
  }
}

function collectVars(blocks: CssBlock[], dom?: HTMLElement): Map<string, string> {
  // First definition wins: the base :root (light) theme is declared first, so token
  // overrides in later scopes (e.g. [data-theme="dark"]) don't clobber the value the static
  // contrast check resolves. Dark-theme contrast is verified separately by the browser a11y test.
  const vars = new Map<string, string>();
  const put = (k: string, v: string) => { if (!vars.has(k)) vars.set(k, v); };
  for (const b of blocks) {
    b.root.walkDecls((d) => {
      if (d.prop.startsWith("--")) put(d.prop, d.value);
    });
  }
  // inline style="--x: ..." declarations
  dom?.querySelectorAll("[style]").forEach((el) => {
    for (const part of (el.getAttribute("style") ?? "").split(";")) {
      const [k, ...rest] = part.split(":");
      if (k && k.trim().startsWith("--")) put(k.trim(), rest.join(":").trim());
    }
  });
  return vars;
}

export function buildContext(file: string, source: string, type: FileType): FileContext {
  if (type === "css") {
    const block = parseCss(source, 1);
    const css = block ? [block] : [];
    return { file, type, source, css, vars: collectVars(css) };
  }
  const dom = parseHtml(source, { comment: true });
  const css: CssBlock[] = [];
  const re = /<style\b[^>]*>([\s\S]*?)<\/style>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(source))) {
    const startLine = lineAt(source, m.index + m[0].indexOf(m[1]));
    const block = parseCss(m[1], startLine);
    if (block) css.push(block);
  }
  return { file, type, source, dom, css, vars: collectVars(css, dom) };
}

/** 1-based line of an HTML element in the original source (best effort). */
export function elementLine(ctx: FileContext, el: HTMLElement): number {
  const range = (el as unknown as { range?: [number, number] }).range;
  if (range && typeof range[0] === "number") return lineAt(ctx.source, range[0]);
  const idx = ctx.source.indexOf(el.outerHTML);
  return idx >= 0 ? lineAt(ctx.source, idx) : 1;
}

export { lineAt };

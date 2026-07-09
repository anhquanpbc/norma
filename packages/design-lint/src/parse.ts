import { parse as parseHtml, HTMLElement } from "node-html-parser";
import postcss, { Root } from "postcss";
import type { CssBlock, FileContext, FileType } from "./types.js";

function lineAt(source: string, index: number): number {
  let line = 1;
  for (let i = 0; i < index && i < source.length; i++) if (source[i] === "\n") line++;
  return line;
}

/** 1-based line of an HTML element in the original source (best effort). */
function nodeLine(source: string, el: HTMLElement): number {
  const range = (el as unknown as { range?: [number, number] }).range;
  if (range && typeof range[0] === "number") return lineAt(source, range[0]);
  const idx = source.indexOf(el.outerHTML);
  return idx >= 0 ? lineAt(source, idx) : 1;
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

export function buildContext(file: string, source: string, type: FileType, tokens?: Map<string, string>): FileContext {
  if (type === "jsx") {
    // JSX/TSX is not a DOM and not CSS — the jsx-aware checks scan the raw source directly
    // (className/style/JSX-tag tells). No node-html-parser (JSX expressions break it), no postcss.
    return { file, type, source, css: [], vars: new Map(), tokens };
  }
  if (type === "css") {
    const block = parseCss(source, 1);
    const css = block ? [block] : [];
    return { file, type, source, css, vars: collectVars(css), tokens };
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
  // Inline style="..." attributes become synthetic single-rule blocks so the CSS checks
  // (contrast, color-only, forbidden values, logical properties) see inline declarations —
  // the surface AI-generated markup leans on most. Appended AFTER <style> blocks so the base
  // :root theme still wins in collectVars' first-definition-wins var resolution.
  for (const el of dom.querySelectorAll("[style]")) {
    const style = el.getAttribute("style") ?? "";
    if (!style.trim()) continue;
    const disable = el.getAttribute("data-norma-disable");
    const tag = (el.rawTagName || "e").toLowerCase();
    // Translate data-norma-disable into a leading comment so the shared disable logic applies.
    const inlineSrc = (disable ? `/* norma-disable ${disable} */\n` : "") + `${tag}{${style}}`;
    const block = parseCss(inlineSrc, nodeLine(source, el));
    if (block) css.push(block);
  }
  return { file, type, source, dom, css, vars: collectVars(css, dom), tokens };
}

/** 1-based line of an HTML element in the original source (best effort). */
export function elementLine(ctx: FileContext, el: HTMLElement): number {
  return nodeLine(ctx.source, el);
}

/**
 * Build a css FileContext from an ALREADY-PARSED PostCSS Root — e.g. one Stylelint hands a plugin, which
 * may have been parsed with a custom syntax (postcss-scss / postcss-less). Linting that root directly —
 * rather than re-parsing the raw text with the default CSS parser, which THROWS on SCSS/Less syntax
 * (`//` comments, `$vars`, `#{}` interpolation) and would silently lint nothing — is what lets a consumer
 * enforce Norma on SCSS/Less, and keeps node positions exact (they are the caller's own nodes).
 */
export function cssContextFromRoot(file: string, source: string, root: Root): FileContext {
  const css: CssBlock[] = [{ root, startLine: 1 }];
  return { file, type: "css", source, css, vars: collectVars(css) };
}

export { lineAt };

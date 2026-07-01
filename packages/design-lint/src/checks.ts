import type { Rule as PostcssRule, Declaration, ChildNode } from "postcss";
import type { HTMLElement } from "node-html-parser";
import type { Check, CssBlock, FileContext, Finding, Rule } from "./types.js";
import { contrastRatio } from "./color.js";
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
function isLargeText(d: Map<string, string>): boolean {
  const size = pxOf(d.get("font-size"));
  const w = d.get("font-weight") ?? "";
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
      const target = isLargeText(d) ? large : text;
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

const focusRing: Check = (ctx, rules) => {
  const r = rules[0];
  const out: Finding[] = [];
  for (const block of ctx.css) {
    block.root.walkRules((rule) => {
      if (!/:focus(-visible)?(?![\w-])/.test(rule.selector) || /:focus-within/.test(rule.selector)) return;
      const d = decls(rule);
      const outline = d.get("outline");
      const hasOutline = !!outline && !/^(none|0(px)?|0 )/.test(outline.trim());
      const shadow = d.get("box-shadow");
      const hasShadow = !!shadow && shadow.trim() !== "none";
      const removed = outline != null && /^(none|0(px)?)\b/.test(outline.trim()) && !hasShadow;
      const rings = (hasOutline ? 1 : 0) + (hasShadow ? 1 : 0);
      if (rings < 2 && !removed) return;
      if (ruleDisabled(rule, r.id)) return;
      out.push(mk(ctx, r, cssLine(block, rule),
        removed ? `"${rule.selector}" removes the focus outline with no visible replacement.`
                : `"${rule.selector}" stacks ${rings} focus rings (outline + box-shadow); use one clean ring.`,
        removed ? `"${rule.selector}" xoá outline focus mà không thay thế.`
                : `"${rule.selector}" chồng ${rings} vòng focus (outline + box-shadow); dùng một vòng.`));
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

const forbiddenValue: Check = (ctx, rules) => {
  const out: Finding[] = [];
  for (const block of ctx.css) {
    block.root.walkDecls((d) => {
      for (const r of rules) {
        const patterns = ((r.check as { patterns?: string[] }).patterns ?? []);
        const hit = patterns.find((p) => d.value.toLowerCase().includes(p.toLowerCase()));
        if (!hit) continue;
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

const EMOJI = /[\u{1F000}-\u{1FAFF}\u{1F1E6}-\u{1F1FF}\u{2600}-\u{26FF}\u{2B00}-\u{2BFF}]/u;
const emojiIcon: Check = (ctx, rules) => {
  if (!ctx.dom) return [];
  const r = rules[0];
  const out: Finding[] = [];
  ctx.dom.querySelectorAll("button, a, [role=button]").forEach((el) => {
    if (!EMOJI.test(el.text) || el.hasAttribute("aria-label") || elDisabled(el, r.id)) return;
    out.push(mk(ctx, r, elementLine(ctx, el),
      `Interactive <${el.rawTagName}> uses an emoji with no text/aria label.`,
      `<${el.rawTagName}> tương tác dùng emoji mà không có nhãn chữ/aria.`));
  });
  return out;
};

const imgDimensions: Check = (ctx, rules) => {
  if (!ctx.dom) return [];
  const r = rules[0];
  const out: Finding[] = [];
  ctx.dom.querySelectorAll("img").forEach((el) => {
    const hasWH = el.hasAttribute("width") && el.hasAttribute("height");
    const ar = /aspect-ratio/i.test(el.getAttribute("style") ?? "");
    if (hasWH || ar || elDisabled(el, r.id)) return;
    out.push(mk(ctx, r, elementLine(ctx, el),
      `<img> has no width/height or aspect-ratio — reserve space to prevent CLS.`,
      `<img> thiếu width/height hoặc aspect-ratio — đặt sẵn kích thước để chống CLS.`));
  });
  return out;
};

const INTERACTIVE = "button, a[href], input:not([type=hidden]), select, textarea, [role=button], [onclick]";
const targetSize: Check = (ctx, rules) => {
  if (!ctx.dom) return [];
  const r = rules[0];
  const min = (r.check as unknown as { min_px: number }).min_px ?? 24;
  const out: Finding[] = [];
  ctx.dom.querySelectorAll(INTERACTIVE).forEach((el) => {
    const style = el.getAttribute("style") ?? "";
    const w = pxOf(/(?:^|;)\s*width\s*:\s*([^;]+)/.exec(style)?.[1]);
    const h = pxOf(/(?:^|;)\s*height\s*:\s*([^;]+)/.exec(style)?.[1]);
    if (w != null && h != null && w < min && h < min && !elDisabled(el, r.id)) {
      out.push(mk(ctx, r, elementLine(ctx, el),
        `Interactive <${el.rawTagName}> is ${w}x${h}px — below the ${min}x${min} minimum.`,
        `<${el.rawTagName}> tương tác ${w}x${h}px — dưới mức tối thiểu ${min}x${min}.`));
    }
  });
  return out;
};

export const CHECKS: Record<string, Check> = {
  contrast, focusRing, reducedMotion, forbiddenValue, formLabel, semanticControl, emojiIcon, imgDimensions, targetSize,
};

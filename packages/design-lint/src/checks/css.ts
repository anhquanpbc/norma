import type { Rule as PostcssRule } from "postcss";
import type { Check, Finding } from "../types.js";
import { contrastRatio } from "../color.js";
import { normColor } from "../tokens.js";
import {
  cssLine, ruleDisabled, decls, isLargeText, mk, BORDER_PROP, inDarkContext, canonHex,
  forbiddenValueJsx, rawChromatic, COLOR_PROP, COLOR_LITERAL, maskNonColor, RESHAPE_PROP,
} from "./helpers.js";

// ---------- CSS checks ----------
export const contrast: Check = (ctx, rules) => {
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

export const focusRing: Check = (ctx, rules) => {
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

export const reducedMotion: Check = (ctx, rules) => {
  const r = rules[0];
  let animateLine: number | null = null;
  let guarded = false;
  for (const block of ctx.css) {
    block.root.walkAtRules(/^media$/i, (at) => { if (/prefers-reduced-motion/i.test(at.params)) guarded = true; });
    block.root.walkDecls(/^(animation|transition)(-name|-property|-duration)?$/i, (d) => {
      const v = d.value.trim();
      if (animateLine === null && v && v !== "none" && !/^0m?s?$/.test(v)) animateLine = cssLine(block, d);
    });
    // scroll-behavior: smooth is motion too — a very common AI default that jumps the viewport for users
    // who asked for none. Treat it as a trigger (auto/other values are not motion).
    block.root.walkDecls(/^scroll-behavior$/i, (d) => {
      if (animateLine === null && /^smooth$/i.test(d.value.trim())) animateLine = cssLine(block, d);
    });
  }
  if (animateLine !== null && !guarded) {
    return [mk(ctx, r, animateLine,
      "File has motion (animation, transition, or scroll-behavior: smooth) but no @media (prefers-reduced-motion: reduce) block.",
      "File có chuyển động (animation, transition, hoặc scroll-behavior: smooth) nhưng thiếu khối @media (prefers-reduced-motion: reduce).")];
  }
  return [];
};

export const forbiddenValue: Check = (ctx, rules) => {
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

export const logicalProperties: Check = (ctx, rules) => {
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

export const viewportUnits: Check = (ctx, rules) => {
  const r = rules[0];
  const out: Finding[] = [];
  for (const block of ctx.css) {
    block.root.walkDecls(/^(min-|max-)?(height|block-size)$/i, (d) => {
      if (!/(?<![\w.])100vh(?![\w])/i.test(d.value)) return; // only the full-height 100vh tell (80vh, 100dvh, etc. are fine)
      const parent = d.parent;
      if (parent && parent.type === "rule") {
        if (ruleDisabled(parent as PostcssRule, r.id)) return;
        // Skip a deliberate progressive-enhancement fallback — `min-height:100vh; min-height:100dvh` — where a
        // later declaration of the SAME property in dvh/svh/lvh overrides the 100vh, so the author already did
        // the fix and only kept 100vh for pre-dvh browsers.
        const prop = d.prop.toLowerCase();
        let overridden = false;
        (parent as PostcssRule).walkDecls((o) => {
          if (o !== d && o.prop.toLowerCase() === prop && /\d(?:dvh|svh|lvh)\b/i.test(o.value)) overridden = true;
        });
        if (overridden) return;
      }
      out.push(mk(ctx, r, cssLine(block, d),
        `${d.prop}: 100vh overflows on mobile — 100vh is the LARGEST viewport, so the collapsing URL bar hides the bottom. Use 100dvh (or 100svh).`,
        `${d.prop}: 100vh tràn trên mobile — 100vh là viewport LỚN NHẤT, nên thanh URL thu lại che mất phần dưới. Dùng 100dvh (hoặc 100svh).`));
    });
  }
  return out;
};

export const colorScheme: Check = (ctx, rules) => {
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

export const colorTokenOnly: Check = (ctx, rules) => {
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

// token-binding: flag a raw CSS color that LITERALLY duplicates a defined color token's value, and point
// at the token by path. Inert unless a token file was supplied (ctx.tokens). Skips custom-property
// declarations (a `--x: <color>` is the token definition, not a usage) and var() (already a reference).
export const tokenBinding: Check = (ctx, rules) => {
  const map = ctx.tokens;
  if (!map || !map.size) return [];
  const r = rules[0];
  const out: Finding[] = [];
  for (const block of ctx.css) {
    block.root.walkDecls((d) => {
      if (d.prop.startsWith("--")) return;
      const parent = d.parent;
      if (parent && parent.type === "rule" && ruleDisabled(parent as PostcssRule, r.id)) return;
      for (const m of maskNonColor(d.value).matchAll(COLOR_LITERAL)) {
        const path = map.get(normColor(m[0]));
        if (!path) continue;
        out.push(mk(ctx, r, cssLine(block, d),
          `Hard-coded color "${m[0]}" duplicates token ${path} — reference the token instead of copying its value.`,
          `Màu hard-code "${m[0]}" trùng token ${path} — hãy tham chiếu token thay vì sao chép giá trị.`));
      }
    });
  }
  return out;
};

export const gradientText: Check = (ctx, rules) => {
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

export const focusForcedColors: Check = (ctx, rules) => {
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

export const focusReshape: Check = (ctx, rules) => {
  const r = rules[0];
  const out: Finding[] = [];
  for (const block of ctx.css) {
    block.root.walkRules((rule) => {
      if (!/:focus(-visible)?(?![\w-])/.test(rule.selector) || /:focus-within/.test(rule.selector)) return;
      const hits: string[] = [];
      for (const prop of decls(rule).keys()) if (RESHAPE_PROP.test(prop)) hits.push(prop);
      if (!hits.length || ruleDisabled(rule, r.id)) return;
      out.push(mk(ctx, r, cssLine(block, rule),
        `"${rule.selector}" reshapes the control on focus (${hits.join(", ")}) — a focus indicator must repaint (outline / box-shadow / border-color), not change the box's radius, size or padding.`,
        `"${rule.selector}" đổi dáng control khi focus (${hits.join(", ")}) — chỉ báo focus phải tô lại (outline / box-shadow / border-color), không đổi bo góc, kích thước hay padding của hộp.`));
    });
  }
  return out;
};

export const zindexScale: Check = (ctx, rules) => {
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

export const containerQuery: Check = (ctx, rules) => {
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

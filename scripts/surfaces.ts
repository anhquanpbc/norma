/**
 * surfaces.ts — the ONE source of truth for which scoped Copilot instruction file(s) a rule
 * belongs in, derived from its check.type (not a hand-maintained id list that silently falls
 * behind the catalog). Consumed by scripts/gen-agents.ts (to emit the scoped files) and
 * scripts/check-drift.ts (to assert every error-severity rule reaches its scoped file).
 *
 *   css  → .github/instructions/css.instructions.md   (applyTo CSS/SCSS)
 *   html → .github/instructions/html.instructions.md  (applyTo HTML/JSX/Vue/Svelte)
 */
export type Surface = "css" | "html";

/** check.type → the surface(s) whose scoped file lists the rule. */
export const SURFACE_BY_CHECK: Record<string, Surface[]> = {
  contrast: ["css", "html"], // color+background can be a <style> rule or an inline style
  focusRing: ["css"],
  reducedMotion: ["css"],
  forbiddenValue: ["css"], // antipattern.indigo-default + antipattern.pure-dark-mode
  colorTokenOnly: ["css"],
  logicalProperties: ["css"],
  colorScheme: ["css"],
  spacingScale: ["css"],
  formLabel: ["html"],
  semanticControl: ["html"],
  emojiIcon: ["html"],
  imgDimensions: ["html"],
  imgAlt: ["html"],
  headingOrder: ["html"],
  targetSize: ["html"],
  htmlLang: ["html"],
  externalRel: ["html"],
  sri: ["html"],
  metaViewport: ["html"],
  viewportPresence: ["html"],
  controlName: ["html"],
  deadHref: ["html"],
  positiveTabindex: ["html"],
  gradientText: ["css"],
  langValid: ["html"],
  landmarkMain: ["html"],
  singleH1: ["html"],
  fieldsetGroup: ["html"],
  genericLinkText: ["html"],
  focusForcedColors: ["css"],
  zindexScale: ["css"],
  containerQuery: ["css"],
  iframeTitle: ["html"],
  tableHeaders: ["html"],
  duplicateIdRefs: ["html"],
  manual: [], // spacing-scale / body-min / inp-budget / agent-verified WCAG mandates — not statically checkable
};

export const onSurface = (checkType: string, surface: Surface): boolean =>
  (SURFACE_BY_CHECK[checkType] ?? []).includes(surface);

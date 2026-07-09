/**
 * surfaces.ts — the ONE source of truth for which scoped Copilot instruction file(s) a rule
 * belongs in, derived from its check.type (not a hand-maintained id list that silently falls
 * behind the catalog). Consumed by scripts/gen-agents.ts (to emit the scoped files),
 * scripts/check-drift.ts (to assert every error-severity rule reaches its scoped file), and the
 * Stylelint plugin (src/stylelint.ts, via CSS_CHECK_TYPES) — one partition, no duplication.
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
  focusReshape: ["css"],
  zindexScale: ["css"],
  tokenBinding: ["css"],
  containerQuery: ["css"],
  iframeTitle: ["html"],
  tableHeaders: ["html"],
  duplicateIdRefs: ["html"],
  viewportFit: ["html", "css"],
  documentTitle: ["html"],
  metaDescription: ["html"],
  canonicalUnique: ["html"],
  invalidRole: ["html"],
  nestedInteractive: ["html"],
  listStructure: ["html"],
  manual: [], // spacing-scale / body-min / inp-budget / agent-verified WCAG mandates — not statically checkable
};

export const onSurface = (checkType: string, surface: Surface): boolean =>
  (SURFACE_BY_CHECK[checkType] ?? []).includes(surface);

/**
 * The check.types that operate on CSS (a <style> rule or inline style) — i.e. the ones a Stylelint
 * plugin can run, since Stylelint only sees stylesheets. Derived from SURFACE_BY_CHECK so it can never
 * drift from the partition. `manual` maps to [] (skipped by lintContext anyway); DOM-only checks are
 * excluded, and the two dual-surface checks (contrast, viewportFit) are included — their CSS half runs.
 */
export const CSS_CHECK_TYPES: ReadonlySet<string> = new Set(
  Object.entries(SURFACE_BY_CHECK)
    .filter(([, surfaces]) => surfaces.includes("css"))
    .map(([checkType]) => checkType),
);

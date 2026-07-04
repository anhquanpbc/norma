# Changelog

All notable changes to this project are documented here. The format is based on
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/). The **standard** is versioned in
`standard/VERSION`; the **CLI** (`@norma/design-lint`) is versioned in its own `package.json`.

## [Unreleased]

### Added

- **Vue & Svelte template reach.** The component scanner now recognises `.vue`/`.svelte` (default glob +
  dir-expand include them) and the two tells transfer verbatim: `antipattern.indigo-default` (colour tell in
  `class`/`:class`/`style`) and `a11y.semantic-control`, whose click-handler detection now covers `@click`,
  `v-on:click` and `on:click` alongside JSX `onClick`. The comment masker gained **HTML comments**
  (`<!-- … -->`) so commented-out template markup (which Vue/Svelte use, unlike JSX) is never mis-flagged.
  A Vue/Svelte SFC `<style>` block is not yet linted as CSS (roadmap).
- **MCP server (`norma-mcp`)** — a zero-dependency Model Context Protocol server over stdio (JSON-RPC 2.0,
  no SDK) so an AI agent can use Norma in the loop: `lint_source` (lint an HTML/CSS/JSX string → findings),
  `list_rules` (the catalog, filterable by `domain`/`tag`), `get_rule` (one rule by id, with rationale +
  remediation). Shipped as a second bin in `@norma/design-lint`.

## [1.7.0] — 2026-07-04

### Added

- **3 more sound static a11y rules (catalog 48→51):** `a11y.invalid-role` (a `role` value that isn't a
  defined WAI-ARIA 1.2 role — a typo like `role="buton"` exposes no role at all; `doc-*`/`graphics-*`
  extension roles accepted), `a11y.nested-interactive` (an interactive element inside another — `<button>`
  in `<a>` etc. — has no valid HTML content model and breaks keyboard/AT semantics), `a11y.list-structure`
  (a `<ul>`/`<ol>` with a non-`<li>` element child; role-repurposed lists exempt). All CONV/warn, low-FP,
  `<template>`-aware; the reference site dogfoods clean.

## [1.6.0] — 2026-07-04

### Added

- **Technical-SEO layer (§5) — the front-end/markup surface of SEO.** REFERENCE (EN+VI) + a new site card
  cover: crawlable-is-accessible (the SEO and a11y surfaces are the *same DOM* — one `<h1>`, real
  `<a href>`, descriptive link text, `alt`, `<html lang>` — all already linted); document metadata
  (unique `<title>`, meta description, one canonical); Open Graph + `twitter:card`; JSON-LD structured
  data; crawl directives (`robots` meta / `robots.txt` / `sitemap.xml`, never ship a staging `noindex`);
  `hreflang` tied to §3 BCP-47; and CWV/mobile as ranking signals. Keyword/link/content strategy is
  explicitly **out of scope** for a design standard. **3 new rules (catalog 45→48):** `a11y.document-title`
  (a non-empty `<title>` — WCAG 2.4.2 Level A *and* the top SEO signal), `seo.meta-description` (present),
  `seo.canonical` (at most one). All CONV/warn, full-document scoped, low-FP. The reference site now
  dogfoods a `rel=canonical` + a JSON-LD `TechArticle` block (practising what it documents).

## [1.5.0] — 2026-07-04

### Added

- **Device-capability layer (§10–11) — "screen size is only half of it."** REFERENCE (EN+VI) + a new site
  card now cover what varies *beyond* width: input modality (`pointer`/`hover` — never hide a critical
  action behind `:hover`), modern viewport units (`dvh`/`svh`/`lvh` — `100vh` overflows past the mobile
  URL bar), safe-area insets + `viewport-fit=cover`, orientation & reflow, a `@media print` stylesheet, and
  responsive-images depth (`srcset`/`sizes` for resolution vs `<picture media>` for art-direction; lazy
  vs `fetchpriority` for the LCP hero). **New rule `responsive.viewport-fit`** (CONV/warn, catalog 44→45):
  flags `env(safe-area-inset-*)` used without `viewport-fit=cover` in the viewport meta — the insets
  resolve to 0, so notch/home-indicator padding silently does nothing.
- **JSX/TSX support (MVP)** — the linter now recognises `.jsx`/`.tsx` and scans them (line-accurate,
  no DOM/AST) for the two tells that transfer cleanly from CSS/HTML: `antipattern.indigo-default`
  (`#667eea`/`#764ba2`/`indigo-500` in a `className`, `style` object, or arbitrary Tailwind value) and
  `a11y.semantic-control` (a lowercase intrinsic element with `onClick` and no ARIA `role`; `<Component>`
  wrappers skipped). A brace/quote-aware tag tokenizer means `onClick={() => a > b}` and `title="a>b"`
  don't fool it. Structural a11y (landmarks/headings/labels/contrast) stays HTML/CSS-only — a component
  file isn't a page. This is the first reach onto the React/Tailwind stack the docs previously disclosed
  as unsupported; the default glob now includes `jsx,tsx`.
- **CLI DX** — `--max-warnings <n>` exits non-zero when warnings exceed `n` (so CI can gate the 26
  warn-severity rules, not just errors); **`--fix`** auto-fixes the deterministic rules in place
  (physical→logical CSS properties; a positive `tabindex`→`0`; `rel="noopener noreferrer"` on a
  rel-less external `target="_blank"` — HTML edits are byte-surgical, everything judgemental is left
  alone); the CLI now **warns on an unknown rule id** in `.normarc` (a typo silently did nothing
  before); and lint runs are **resilient per file** — one unreadable / binary / malformed file is
  recorded as `skipped` in the result instead of aborting the whole run.

## [1.4.0] — 2026-07-04

### Added

- **3 more sound static a11y rules** (catalog 41 → 44; 163 check tests): `a11y.iframe-title` (every
  `<iframe>` needs a title; decorative ones `aria-hidden`), `a11y.table-headers` (a data `<table>` with
  cells but no `<th>` — layout tables with `role=presentation` exempt), `a11y.duplicate-id-refs` (an id
  targeted by `label[for]`/`aria-labelledby`/`describedby`/`controls` must be unique — the reference
  subset that still matters after WCAG 2.2 dropped the blanket 4.1.1 duplicate-id rule). All CONV/warn,
  low-FP, reference site dogfoods clean.
- **`.gitattributes`** normalizes line endings to LF, ending the "LF will be replaced by CRLF" warning
  that fired on every commit from a Windows checkout.

### Fixed

- **Reference site: uneven-height cards in the same row no longer leave a gap.** Nine two-card /
  two-widget grids carried an inline `align-items: start`, so a shorter card sat at its natural height
  beside a taller sibling — a ragged bottom edge and an ugly gap. They now stretch to equal height (the
  grid default). The five *widget + stacked-column* grids keep `align-items: start` on purpose (stretching
  a stacked column would push a gap below its last card). Verified visually across §3/§4/§9; e2e 60/60.

## [1.3.0] — 2026-07-04

Content-completeness pass (layout + 15 further concepts) after the "the standard forgot layout" review,
plus **7 new lint rules** so enforcement catches up with the expanded content. **Catalog 34 → 41 rules
(18 SPEC 🔒 / 23 CONV 📐).**

### Added

- **7 new static rules enforcing the expanded content** (`132 → 147` unit tests, all low-false-positive):
  `a11y.landmark-main` (exactly one `<main>`), `a11y.single-h1` (exactly one `<h1>`), `forms.fieldset-group`
  (radio/checkbox sets need a `<fieldset>`/`role=group`), `a11y.generic-link-text` ("click here"/"read more"
  — WCAG 2.4.4), `a11y.focus-forced-colors` (a `:focus-visible` ring must not be box-shadow-only — it's
  stripped in Windows High Contrast), `tokens.zindex-scale` (no raw `z-index >= 1000` — use the §2 ladder),
  `responsive.container-query` (`@container` with no `container-type` anywhere is inert). All CONV/warn;
  the reference site dogfoods clean.
- **Content pass, batch 5 — disciplines & citations** (§4 + §9 + §10 + Sources + agent spec + site).
  **§4 Data visualization**: chart-type-by-data-relationship, colour-blind-safe OKLCH palettes (~6–8 hues),
  never colour alone (1.4.1) + ≥3:1 non-text (1.4.11), zero-baseline bars, accessible SVG (`role=img` +
  `<title>`/`<desc>` or a `<table>` fallback). **§9 Content & UX writing**: sentence case, action-first
  labels, the *what+why+how* error formula, empty-state copy, and a banned-generic-copy list
  ("Click here"/"Submit"/"Oops"). **§10 Form structure & validation**: `<fieldset>`/`<legend>` grouping,
  the error-summary pattern (G83), required/optional marking, the **disabled-submit anti-pattern**,
  multi-step/password UX. **Sources** gains WAI-ARIA APG, the CSS module specs, web-features/Baseline,
  ACT Rules + ARIA-in-HTML, GOV.UK/USWDS, ECMA-402/CLDR/BCP-47, and ISO 9241/Nielsen heuristics — closing
  the citation voids. Site adds a §4 data-viz card + APG/Baseline footer sources.

  **This completes the content-completeness roadmap** (layout + 15 further concepts) opened after the
  "the standard forgot layout" review — all folded into existing sections (no renumbering; "13 domains"
  and the section-sync guard unchanged).
- **Content pass, batch 4 — feedback/status family & overlay taxonomy** (§9 + agent spec + site).
  §9 gains **Feedback & status** (toast timing 4–10s non-critical only, **never** auto-dismiss actionable
  content [2.2.1], pause-on-hover, `role=status` vs `role=alert` + 4.1.3; `role=progressbar`; banner vs
  badge vs skeleton; **Undo over confirm** for reversible destructive actions, name the action) and an
  **Overlays** decision table (dialog / alertdialog / non-modal / popover / tooltip / drawer / bottom sheet)
  with the mechanics AI hand-rolls wrong — mark the background `inert`, restore focus, lock body scroll,
  deliberate initial focus, prefer native `<dialog>`/popover (top layer). Site adds two §9 cards.
- **Content pass, batch 3 — document structure, forced-colors & navigation** (§5 + agent spec + site).
  §5 gains **Document structure & bypass** (a visible-on-focus **skip link** — WCAG 2.4.1 Level A, the
  cheapest a11y win and usually missing; landmarks; one `<h1>` + no skipped heading levels; `aria-current`
  on the active item), **Forced colors & user-preference media** (`forced-colors: active` strips
  shadow/background/gradients → never signal state/focus by shadow alone, re-assert with system-colour
  keywords, SVG `currentColor`; plus `prefers-contrast`/`prefers-reduced-transparency`/`prefers-reduced-data`
  — the last directly serves the §14 glass tell), and **Navigation & discoverability** (breadcrumb pattern,
  pagination-vs-infinite-scroll tradeoff, per-page title/description/Open Graph). Site adds two §5 cards.
- **Content-completeness pass, batch 2 — the three P0 gaps beyond layout** (§1 + §9 + agent spec + site).
  **§1 core token scales**: an elevation/shadow ladder (0–5, one light source, one soft shadow per level,
  never stacked colored glows; lighter-surface elevation on dark), a radius scale (`0·2·4·8·12·16·24·full`)
  + border-width tokens + the nested-radius rule (`inner = outer − padding`), and interaction state-layer
  opacities as tokens (hover 8% / focus 10% / pressed 10% / dragged 16%; disabled 38%/12%) — §1 *named*
  elevation/radius as token types but never gave values; this closes the §14 halo/glow + mixed-radii tells
  at the root. **§9 ARIA APG widget catalog**: a per-widget role / state / keyboard table (tabs, menu,
  combobox, listbox, dialog, switch, slider, tree, grid, breadcrumb, carousel, …) plus the three rules AI
  breaks (native-first `<select>`, one-tab-stop composites via roving `tabindex`/`aria-activedescendant`,
  accessible name on every control) and 4.1.3 status messages; **WAI-ARIA APG added to Sources**.
  **§9 "Design every state"**: the view lifecycle — empty (first-run vs no-results), loading (a skeleton
  matching the layout, not a spinner), error (cause + recovery), offline/optimistic/success/403/truncation.
  Site adds Widget-patterns, Design-every-state, and Core-token-scales cards.
- **§2 gains a full "Layout & composition" body** (EN + VI + site + agent spec). The section was titled
  "Spacing, Grid & Layout" but gave layout a single sentence; it now covers the engine choice (Grid for
  2-D, Flexbox for 1-D), Grid mechanics incl. the RAM technique
  `repeat(auto-fit, minmax(min(100%,16rem),1fr))` + subgrid + template-areas, box-alignment/`gap`, the
  named composition primitives (Stack/Cluster/Sidebar/Switcher/Cover/Center — Every Layout / CUBE CSS),
  intrinsic sizing (`min()/max()/clamp()`, logical axes, `aspect-ratio`+`object-fit`), container queries
  (Baseline 2023), and a z-index **token ladder** + stacking-context/overflow/scroll model. The site's §2
  adds a Layout card (with the RAM snippet) and a z-index-ladder card; the reference site's own decorative
  borders were already logical (`border-inline-start`). No renumbering — expanded in place, so the
  "13 domains" identity and the section-sync guard are unchanged. First of a broader content-completeness
  pass (ARIA APG widget catalog, design-every-state, elevation/radius/z-index token scales, forced-colors,
  data-viz, content/UX-writing are queued next).

## [1.2.0] — 2026-07-04

### Added

- **i18n / multi-script enforcement** (catalog 32 → 34 rules; 16 → 18 SPEC). `i18n.lang-valid`
  (🔒 error, WCAG 3.1.1/3.1.2) flags a `lang` that isn't a well-formed BCP-47 tag — `english`,
  `en_US`, `e` — with no false positives on real tags (`en-US`, `zh-Hant-TW`, `es-419`, `yue`, private-use
  `x-…`). `i18n.inline-lang` (🔒 `check: manual`, SC 3.1.2) requires a `lang` on foreign-language runs
  (agent-verified). `i18n.logical-properties` now also flags physical `border-left`/`border-right`
  (→ `border-inline-start/end`). REFERENCE §3 gains a **locale formatting, expansion & bidi** block
  (ECMA-402 `Intl`, `Intl.PluralRules`, ~30% text-expansion budget, `unicode-bidi:isolate`/`<bdi>`),
  and the reference site converts its remaining `border-left` decorations to logical props.
- **`examples/`** — a runnable adoption surface: `minimal-pass/` (a clean starter page that lints with
  zero findings) and `catches-violations/` (an AI-scaffolded "before" page seeded with 11 rules' worth
  of defects), plus a copy-paste `ci-recipe.yml`. A new **Examples & action self-test** CI job proves
  both: the starter lints clean through the action, the broken page fails and trips its seeded rules.
- **`action.yml`** — a reusable GitHub Action (`uses: anhquanpbc/norma@v1`) that builds the linter from
  its own checkout, so a team can gate CI **today**, before `@norma/design-lint` is published to npm.
  The README "Adopt in your project" now leads with it (EN + VI).
- **`RELEASING.md`** — a one-tag release runbook (verify → `git tag v1.1.0 && git push` → `publish.yml`
  publishes with provenance), plus the post-publish badge swap-back.

### Changed

- **Honest pre-publish docs.** The dead `npm/v` badge (rendered "not found" for the unpublished package,
  reading as abandoned) is now a static `coming soon` placeholder; the Quick start (EN + VI) leads with
  the paths that work **today** (the action, or from source) and demotes `npx @norma/design-lint` to
  "once published". `npm pack --dry-run` confirmed the tarball is publish-safe (dist/cli.js + index.js +
  rules.json via `prepack`).

### Fixed

- **Directory arguments no longer silently lint zero files.** `norma-design-lint src` (a directory,
  as the README's own examples show) was added verbatim, then skipped by the extension filter, so the
  run reported "0 files" and **exited 0** — a green CI gate that inspected nothing. A directory arg now
  expands to a recursive `**/*.{html,htm,css}` glob and actually lints the files under it.
- **`node_modules`/`dist`/`build`/`coverage`/`.git` are excluded by default** from globs and directory
  walks, so a broad glob no longer floods CI with violations in vendored CSS the team can't fix.
- **`a11y.target-size` no longer false-positives on non-px inline units.** `pxOf` treated `width:5%`
  / `2vw` / `3ch` / `calc(...)` as a bare px number, so a full-bleed `width:5%` button was flagged as
  "5px wide — below 24×24" at **error** severity, breaking the build. It now resolves only px/rem/em
  (and unitless 0) and returns null for anything layout/viewport/font-dependent. 127 → 132 unit tests.

## [1.1.0] — 2026-07-03

Post-1.0.0 hardening from an independent multi-dimension audit, a **2026 currency refresh**, and the
rule-catalog gaps that audit proved the standard already promised (standard 1.0.0 → 1.1.0). The CLI was
never published, so everything below lands **before the first npm release**.

### Added

- **New rule `a11y.heading-order`** (📐 CONV, WCAG 1.3.1) — flags a skipped heading level (`h2 → h4`).
- **New static rules** — `a11y.meta-viewport` (🔒 error, WCAG 1.4.4: `user-scalable=no` /
  `maximum-scale<2` in the viewport meta), `a11y.control-name` (🔒 error, WCAG 4.1.2: every
  `button`/`a[href]`/`[role=button]` needs an accessible name), `responsive.viewport-meta` (📐 warn:
  full documents declare a viewport meta), `antipattern.dead-href` (📐 warn: `href="#"` / empty),
  `antipattern.gradient-text` (📐 warn: `background-clip:text` over a gradient — uncomputable contrast),
  `a11y.no-positive-tabindex` (📐 warn, WCAG 2.4.3: `tabindex >= 1`).
- **Agent-verified SPEC rules** (`check: manual` — the engine skips them; the design agent cites them):
  `a11y.focus-not-obscured` (2.4.11), `a11y.dragging-alternative` (2.5.7), `forms.redundant-entry`
  (3.3.7), `a11y.color-only-meaning` (1.4.1). The rules.yaml header now documents that severity is
  agent-weight-only for manual rules. **Catalog: 21 → 32 rules (16 SPEC 🔒 / 16 CONV 📐).**
- **§14 anti-patterns extended with the 2025–26 tells** — default-font monoculture
  (Inter/Roboto/Space Grotesk), gradient-text headlines (`background-clip:text`), stock-AI imagery,
  dead controls (`href="#"`), the landing-template skeleton + dark-by-default sameness, fabricated
  social proof, and named animation clichés (typewriter/particles/cursor trails); the glassmorphism
  TELL now separates platform-native material (Liquid Glass) from decorative CSS glass.
- **Site identity** — the page finally says **Norma**: `<title>`, header brand + GitHub link, hero,
  meta description + Open Graph + data-URI favicon, and a footer "Adopt the standard" block (repo,
  npm CLI, AGENTS.md, rule catalog, version). New §05 "Keyboard · ARIA · screen readers" card,
  Postel's law in §12, a scope note, and attribute-level EN/VI i18n (`document.title`, aria-labels,
  search placeholder now switch language).
- **check-drift guards** — shared load-bearing facts must appear verbatim in REFERENCE.md,
  REFERENCE.vi.md **and** index.html (the 37%→55.8% class of drift), and version integrity
  (`standard/VERSION` == `rules.json` == README badge == site footer).

### Changed

- **2026 refresh** — WCAG 2.2 updated edition 2024-12-12 + ISO/IEC 40500:2025 (SC count corrected
  87 → **86**); EU Accessibility Act enforcement (live since 2025-06-28); HTTP Archive **2025**
  Almanac INP stats (77% mobile good INP); **M3 Expressive**: springs are Material's primary motion
  system, duration/easing tokens relabeled fallback; **Liquid Glass** system-wide + the iOS 27
  legibility rollback; Baseline CSS guidance (`text-wrap: balance/pretty`, native `<dialog>` +
  Popover API over hand-rolled overlays, CSS anchor positioning, `light-dark()`); Chrome
  soft-navigation measurement noted (thresholds unchanged); DTCG source repointed to the stable
  v2025.10 URL.
- **Dark-pattern stat corrected to 55.8%** per arXiv 2502.13499 v2 ("Deception at Scale", 2026) —
  the shipped ~37% contradicted the current version of its own citation.
- `a11y.semantic-control` now also flags href-less `<a onclick>` (no link role, not focusable).
- e2e axe self-test upgraded from WCAG 2.1 to **WCAG 2.2** tags (`wcag22a`/`wcag22aa`).
- ADOPTERS + linter README wording made accurate ("statically checkable" dogfood; the real
  `check: manual` rule list instead of a wrong "off" list); the linter README now documents its
  reach (HTML/CSS only; JSX/Tailwind rely on the agent layer).
- **`tokens.tokens.json`** — the theme map moved from a non-spec root `$themes` key to
  `$extensions.org.norma.themes` so the file is strict-DTCG valid; the "verbatim" motion-token
  descriptions now state they are the M3 subset this standard references (M3 defines 16).
- **e2e** — added keyboard-operability (skip link, focus ring ≥2px, toggle activation) and
  reduced-motion (settled reveal, neutralized transitions) specs — the interaction-a11y layer axe
  can't reach. The PR **dependency-review** job is now advisory until Dependency graph is enabled.
- **`publish.yml`** — a tag-triggered `npm publish --provenance --access public` behind the full verify
  gate, so releasing the CLI is push-button (set the `NPM_TOKEN` secret once). The package now declares
  `publishConfig.access: "public"`, an `exports` map, and ships its own `LICENSE`.
- **CLI config validation** — `.normarc.json` is parsed defensively (a friendly error, no stack trace)
  and override severities are checked against `error | warn | off`.
- CI now runs a **Node 22 + 24 matrix** and a **dependency-review** gate on pull requests.

### Fixed

- **Contrast false positive** — large text sized via a token (`font-size: var(--h1)`) was misclassified
  as body text and failed at 4.5:1; the size is now resolved through tokens first and held to 3:1.
- **Inline styles are linted** — the CSS checks (contrast, token-only color, forbidden values, logical
  properties) previously ignored `style="…"` attributes, the surface AI-generated markup leans on most.
- **`a11y.target-size`** now flags a control undersized in *either* axis (was `&&`, missing `16×100`) and
  reads `min-width` / `min-height`.
- **`tokens.color-only`** now catches `rgb()` / `hsl()` / 8-digit hex, not just 3/6-digit hex.
- **`a11y.emoji-icon`** now covers Dingbats / Misc-Technical / arrow icons (✅ ❤ ✨ ⌚) and accepts
  `title` / `aria-labelledby` / `[role=button]` as an accessible name.
- **Translucent foregrounds** (alpha 0.5–0.99) are alpha-composited over the background instead of scored
  as opaque, so they no longer over-report contrast.
- **Generated scoped Copilot files** are derived from each rule's check-type surface (not a hand-kept id
  list), so the `html` / `css` instruction files can't silently omit a mandate — a drift assertion enforces
  it. Restores the previously-missing `a11y.img-alt`, `i18n.html-lang`, `i18n.logical-properties`,
  `theme.color-scheme`, `security.*`.
- **Reference site** — card headings no longer skip a level (`h4` → `h3`); the docs search box has a
  persistent visible label; language choice persists (localStorage + `navigator.language`) like the theme;
  the skip link targets the content start (`#top`); code blocks keep a border in dark mode; scroll-spy uses
  `getBoundingClientRect` (robust to positioned ancestors).
- **REFERENCE** — documented the §10 Forms & Responsive merge (the former §10 + §11) in both languages, so the numbering no longer reads as an accidental gap (the site already labels it "§10–11").
- **Tests** — **106 unit tests** (was 58) + new keyboard/reduced-motion e2e specs; coverage 94% statements / 87% branches.

## [1.0.0] — 2026-07-02

First tagged release of the Norma standard (`standard/VERSION` 1.0.0) and the
`@norma/design-lint` CLI (1.0.0).

### The standard

- **Machine-readable catalog** — `standard/rules.yaml` → schema-validated `standard/rules.json`:
  **21 rules (10 SPEC 🔒 / 11 CONV 📐)** mapped onto the 13 reference domains. Every SPEC rule carries a
  primary-source URL (WCAG 2.2 fragment anchors, WHATWG/W3C specs); internal conventions honestly leave
  `source_url` empty rather than fabricate a citation.
- **Coverage** — contrast (4.5 / 3:1, with `var()` + OKLCH resolution), target size, focus visibility
  (2.4.7), reduced-motion, form labels, semantic controls, emoji-as-icon, image **alt** (1.1.1) and
  dimensions, `<html lang>`, logical properties, `color-scheme`, token-only color, the indigo-default and
  pure-`#000`/`#fff` dark-mode "tells", and frontend-markup security (`rel=noopener`, SRI). Three rules are
  advisory/runtime and not statically enforced (`tokens.spacing-scale`, `type.body-min`, `perf.inp-budget`).
- **Design tokens** in W3C DTCG format (`standard/tokens.tokens.json`) with a light + dark ramp and a
  `$themes` map; one brand OKLCH pinned across tokens, site and reference.
- **Scope note** — a front-end *design* standard. Backend and runtime/header security (CSP/HSTS/Trusted
  Types) are explicitly out of scope; frontend-markup security is in.

### `@norma/design-lint` (CLI 1.0.0)

- Lints HTML/CSS against the standard: stylish / JSON / SARIF output, `.normarc.json` config,
  `--rules` / `--lang en|vi`, inline `norma-disable` suppression, and a programmatic API. Node ≥ 22.
- **58 unit tests**, v8 coverage over an 80% gate; the reference `index.html` dogfoods clean in both the
  unit suite and CI. The static contrast check resolves the base (`:root`/light) theme; dark-theme contrast
  is verified by the browser a11y test.

### The site & docs

- Single self-contained, **zero-network** `index.html` — a docs layout (sticky section nav + client-side
  section search), a bilingual EN/VI toggle, and a **working light/dark theme** implemented as a
  semantic-token remap (`[data-theme="dark"]`, near-black surfaces, never pure `#000`/`#fff`). Degrades
  gracefully with no JS / reduced motion.
- **Bilingual docs** — `README` / `REFERENCE` / `CONTRIBUTING` / the CLI README each ship an English
  canonical file plus a `*.vi` sibling; `index.html` is fully EN/VI. The agent-surface files (Claude Code
  subagent, `CLAUDE.md`, Cursor, Copilot, `AGENTS.md`) are projected from one canonical spec and are
  English-only.
- **CI/CD** — build + test + an anti-drift guard (regeneration diff, brand OKLCH, domain count, every rule
  covered by the agent spec, and index.html ↔ REFERENCE.md section-sync) + dogfood-lint (SARIF); a
  Playwright + axe browser self-test (WCAG across theme × language, interaction, zero-network, responsive
  overflow); GitHub Pages deploy gated on a verify job; Dependabot.

### Dual license

- MIT (code) + CC BY 4.0 (content), split via `LICENSE` + `LICENSE-CONTENT`.

[1.0.0]: https://github.com/anhquanpbc/norma/releases/tag/v1.0.0

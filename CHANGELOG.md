# Changelog

All notable changes to this project are documented here. The format is based on
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/). The **standard** is versioned in
`standard/VERSION`; the **CLI** (`norma-design-lint`) is versioned in its own `package.json`.

## [Unreleased]

### Changed

- **The reusable GitHub Action's default `globs` now includes components.** `action.yml`'s default changed
  from `**/*.{html,htm,css}` to `**/*.{html,htm,css,jsx,tsx,vue,svelte}`, matching the CLI's own default —
  so `uses: anhquanpbc/norma@v1` with no explicit `globs` no longer silently skips JSX/TSX/Vue/Svelte
  components (a false green for component apps). This is a behavior change to the `@v1` action: a project
  that relied on the default and has design tells in its components (e.g. a `<div onClick>`) may see new
  findings — that's the point; adopt on existing debt with `--baseline`. (Not an npm/CLI change — `action.yml`
  ships in the repo, not the package; it reaches consumers when the `v1` tag advances to include it.)

- **index.html now consumes the generated token variable names.** The reference site's design tokens were
  renamed from ad-hoc short names (`--azure`, `--s-1`, `--t-0`) to the `standard/tokens.css` names
  (`--color-brand-azure`, `--space-1`, `--font-scale-0`) — a mechanical, **value-preserving** rename (321
  occurrences; pixel-identical render, e2e green). The `[data-theme=dark]` overrides and ~15 site-specific
  vars (`--violet`, `--amber`, the `-wash`/`-ink` tints, `--bar-bg`, `--footer-bg`, …) are unchanged. A new
  `check:drift` guard (item 10) asserts every token-derived `:root` value equals `standard/tokens.css`, so
  the site's tokens can no longer drift from the standard. Closes the deferred GEN1 site-rewire.

## [1.23.1] — 2026-07-11 · CLI

### Fixed

- **`--max-warnings` now rejects a negative value** instead of silently accepting it. The guard checked only
  `Number.isInteger`, so `--max-warnings -1` passed — then `warnCount > -1` is always true, so every run
  reported "warnings exceed the threshold" and exited 1 for the wrong reason. It now fails input validation
  with the documented "expected a non-negative integer" message (matching the `--max-per-rule` guard). `0`
  (fail on any warning) stays valid.

## [1.23.0] — 2026-07-11 · CLI

### Added

- **DESIGN.md interop — enforce a Google Stitch design system against your shipped source.** The `--tokens`
  / `tokens.token-binding` check now reads W3C DTCG **structured color objects**
  (`{ colorSpace, components, hex }`) — the shape [DESIGN.md](https://github.com/google-labs-code/design.md)'s
  `export --format dtcg` emits — via the `hex` fallback (or sRGB components), not just Norma's own hex/oklch
  strings. So `npx @google/design.md export --format dtcg DESIGN.md > design.tokens.json` then
  `norma-design-lint --tokens design.tokens.json` flags any raw color that hard-codes a DESIGN.md-declared
  token — the **source-compliance check DESIGN.md's own validator never runs**, positioning Norma one layer
  beneath Google's spec format. A DTCG-2025.10 root `$schema` pointer is now accepted without a warning (the
  exports carry one). No YAML parser and no new deps — Norma consumes the DTCG **export**, staying a
  single-purpose linter. The reusable Action gains a `tokens` input for the same interop in CI (reaches `@v1`
  when the tag advances). Bilingual recipe in the README; a real `@google/design.md` export is checked in as
  a test fixture. (No standard change — CLI-only.)

## [1.22.0] — 2026-07-11 · CLI

### Added

- **`--max-per-rule <n>` — cap the per-finding output so a large repo fits in an agent's context (token
  efficiency).** A rule firing thousands of times (e.g. one antipattern across a monorepo) no longer floods
  `stylish`/`json` output: `--max-per-rule 3` lists at most 3 findings per rule (a global cap across all
  files) and reports the rest as a count. Measured: on a 60-findings-one-rule file, `--format json
  --max-per-rule 3` cut the payload **94%** (17.3 KB → 1.0 KB). The cap is display-only — the summary
  counts, the exit code, the `--baseline` file, and the SARIF upload are always computed from the **full**
  set, so nothing is silently gated away. `markdown` (already aggregated by rule) and `sarif` (kept complete
  for GitHub code scanning) are unaffected (a stderr note says so if combined). `json` gains a `truncated`
  **per-rule map** (`{ ruleId: hiddenCount }`, `{}` when nothing was) so the sampled-away tail stays
  attributable, and stylish prints an `… N more (a per-rule sample)` note. The listing is a per-rule sample,
  so it can omit whole files — the summary counts are authoritative; re-run without the cap for the full list.

### Changed

- **`--format json` is slimmed for machine/agent consumption.** Two accidental-bloat fixes: `file` is now
  **repo-relative** and forward-slashed (was an absolute, OS-specific path), and `message` is the single
  **`--lang`** string (was the full `{ en, vi }` object — an English agent never read the `vi` half), matching
  the MCP `lint_source` shape. The top-level `errorCount`/`warnCount`/`fileCount`/`skipped`/`version` are
  unchanged. **Note:** this is a shape change to the `json` output — a consumer that read `finding.message.en`
  should now read `finding.message` (and pass `--lang vi` for Vietnamese), and paths are relative to the CWD.

## [1.21.0] — 2026-07-11 · CLI

### Added

- **MCP `get_tokens` tool — the design tokens, resolved for UI generation.** A sixth MCP tool hands an
  agent the Norma palette / spacing / type-scale / radius / z-index / motion tokens *in-band*: each token's
  CSS custom-property name (`--color-brand-azure`), its CSS-writable value (an alias is kept as
  `var(--…)`), the alias-resolved concrete value, and its description — plus the light/dark theme role map
  from `$extensions`. So an agent can **generate** markup that reaches for the right token instead of a raw
  value, closing the gap where `validate_tokens` could only check a token file after the fact. Optional
  `group` filter (`color`, `space`, `font`, `radius`, `z`, `motion`). The token file
  (`standard/tokens.tokens.json`) now ships inside the package (`dist/`), and the CSS-value formatter is
  shared with `scripts/gen-tokens-css.ts` (via `src/token-view.ts`) so the token view an agent reads and
  the generated `standard/tokens.css` can never disagree on how a token renders. The MCP server now
  advertises **six** tools. (No standard change — CLI-only.)

## [1.20.1] — 2026-07-11 · CLI

### Added

- **Framework quickstart docs (Direction C: adoption).** The README gains a "Framework quickstart (React,
  Vue, Svelte)" section that assembles the three linting layers — the ESLint plugin for components, the
  Stylelint plugin for stylesheets / SFC `<style>` blocks, and the CLI for built HTML — into per-framework
  recipes, plus a `lint-staged` **pre-commit** recipe. README-only (published so it reaches npm).

## [1.20.0] — 2026-07-11 · CLI

### Added

- **`norma-design-lint init` — one-command project scaffold (Direction C: adoption).** Writes a starter
  `.normarc.json`, a CI workflow (`.github/workflows/design-lint.yml` — the recommended `npx` recipe with a
  by-domain/by-rule Step-Summary), and the vendor-neutral `AGENTS.md` rule file (copied from the bundled
  `dist/agents`). Non-interactive and safe: existing files are **skipped, never clobbered**, unless
  `--force`; it also prints where the Claude Code / Cursor / Copilot rule files live. Collapses the old
  copy-a-file → hand-write-a-config → copy-the-CI-recipe chore into `npx norma-design-lint init`.

## [1.19.0] — 2026-07-10 · CLI

### Added

- **The generated AI-agent rule files now ship inside the package (Direction C: adoption).** `npm i
  norma-design-lint` now includes the per-tool rule files under
  `node_modules/norma-design-lint/dist/agents/` — `AGENTS.md` plus the Claude Code / Cursor / Copilot rule
  files — so you no longer have to clone the repo to wire up your agent: copy the one for your tool (see the
  README table). `CLAUDE.md` is intentionally not bundled (it's this repo's own project memory, not an
  adopter template). A single `agent-files.mjs` manifest is the source of truth for the bundle.
- **`stylelint` / `eslint` keywords** so the bundled plugins (`norma-design-lint/stylelint`,
  `norma-design-lint/eslint`) are discoverable on npm.

## [1.18.0] — 2026-07-10 · CLI

### Added

- **`responsive.viewport-units` — flag bare `100vh` for full-height layouts (Direction B: extend
  enforcement).** A `height` / `min-height` / `max-height` (or the logical `block-size` forms) set to
  `100vh` now **warns**: `100vh` equals the *largest* viewport, so on mobile the collapsing URL bar hides
  the bottom of the layout. Recommends `100dvh` (dynamic) / `100svh` (guaranteed-visible). Scoped to the
  full-height `100vh` tell only — `80vh`, `100dvh`, `100svh`, `1100vh`, `width`, and custom properties are
  not flagged, keeping false positives near zero. Bundles standard **1.13.0** (rule catalog 55 → 56).

## [1.13.0] — 2026-07-10 · standard

### Added

- **Rule `responsive.viewport-units`** (domain `responsive`, 📐 CONV, `warn`) — full-height layouts use
  `dvh` / `svh`, not `100vh` (REFERENCE §11; web.dev viewport units). Enforced by the CLI as of 1.18.0.
  Catalog 55 → 56.

## [1.17.0] — 2026-07-10 · CLI

### Changed

- **`a11y.reduced-motion` now also catches `scroll-behavior: smooth` (Direction B: extend enforcement).**
  The check previously inspected only `animation` / `transition` declarations, so a page whose only motion
  was `html { scroll-behavior: smooth }` — a common AI default that animates scrolling for users who asked
  for none — passed clean. It's now a motion trigger (`scroll-behavior: auto` is not). Ships with standard
  **1.12.0**, whose `a11y.reduced-motion` rationale + remediation were updated to name scroll-behavior and
  add a `html { scroll-behavior: auto }` reset — so following the remediation is a *complete* fix, not a
  finding-silencer (the guard clears on any `prefers-reduced-motion` block, so a duration-only reset would
  otherwise pass CI while smooth scroll still ran for reduced-motion users).

## [1.12.0] — 2026-07-10 · standard

### Changed

- **`a11y.reduced-motion` broadened to cover `scroll-behavior: smooth`.** The rationale now names smooth
  scroll as non-essential motion, and the remediation includes an `html { scroll-behavior: auto }` reset
  alongside the animation/transition duration resets. Enforced by the CLI as of 1.17.0.

## [1.16.0] — 2026-07-10 · CLI

### Added

- **`seo.og-tags` — enforce Open Graph link-preview tags (Direction B: extend enforcement).** A full
  document with no core Open Graph tags — none of `og:title` / `og:url` / `og:image` — now **warns**;
  without them a link shared to social or chat renders as a bare URL with no title or preview image. The
  check accepts `property="og:*"` or `name="og:*"` and passes as soon as **any one** core tag is present,
  so false positives are near zero (a page that opted into OG is never nagged about which tags). Bundles
  standard **1.11.0** (rule catalog 54 → 55).

## [1.11.0] — 2026-07-10 · standard

### Added

- **Rule `seo.og-tags`** (domain `a11y`, 📐 CONV, `warn`) — The Open Graph protocol (ogp.me). Enforced by
  the CLI as of 1.16.0 (see above). Catalog 54 → 55.

## [1.15.0] — 2026-07-10 · CLI

### Added

- **`a11y.skip-link` — enforce a bypass / skip link (Direction B: extend enforcement).** A full document
  that has a `<main>` landmark but no in-page skip link targeting it now **warns**. A valid skip link is an
  `<a href="#id">` whose target is the `<main>`, a wrapper *around* it, or an element *inside* it — following
  it lands focus at/around the main content. WCAG 2.4.1 Bypass Blocks (Level A) — "the cheapest a11y win",
  and absent from most AI-generated pages. First-focusable / visible-on-focus can't be verified statically,
  so it's a heuristic **presence** check shipped at `warn`, scoped to documents that already have a `<main>`
  (a missing `<main>` stays `a11y.landmark-main`'s concern) to keep false positives near zero. Bundles
  standard **1.10.0** (rule catalog 53 → 54).

## [1.10.0] — 2026-07-10 · standard

### Added

- **Rule `a11y.skip-link`** (domain `a11y`, 📐 CONV, `warn`) — WCAG 2.4.1 Bypass Blocks (Level A). Enforced by
  the CLI as of 1.15.0 (see above). Catalog 53 → 54.

## [1.14.1] — 2026-07-10 · CLI

### Fixed

- **`--fix` no longer corrupts `float` / `clear` into invalid CSS.** The auto-fixer shared one keyword map
  across `text-align`, `float`, and `clear`, rewriting `float: left` → `float: start` and `clear: right` →
  `clear: end`. But `start`/`end` are **not** valid `float`/`clear` values — the browser drops the whole
  declaration, silently deleting the float the fixer claimed to preserve, and dodging re-detection (the check
  only flags `left`/`right`). `float`/`clear` now map to `inline-start`/`inline-end` (matching the
  `i18n.logical-properties` remediation); `text-align` keeps `start`/`end`. Guarded by a regression test.

## [1.14.0] — 2026-07-10 · CLI

### Added

- **`--format markdown` — a stateless run summary (Phase 2 M1, Measure pillar).** A pure Markdown report of
  a lint run — findings aggregated **by domain** and **by rule**, plus the **baseline delta** (new vs
  suppressed) — for a GitHub Step Summary or PR comment (`… --format markdown >> "$GITHUB_STEP_SUMMARY"`;
  recipe in `examples/ci-recipe.yml`). No new deps, no server, no history store — the cross-commit *trend*
  is already delivered by `--format sarif` → GitHub code scanning. Exposed as `markdown(res, rules,
  suppressed)` on the API.

## [1.13.0] — 2026-07-09 · CLI

### Added

- **`--tokens <path>` — token-binding (Phase 2 E2).** Given a DTCG token file, the new `tokenBinding` check
  flags a raw CSS value that **literally duplicates** a defined token (e.g. a hard-coded `oklch(…)` equal to
  `color.brand.azure`) and names the token to reference — the first check to make `tokens.tokens.json`
  **load-bearing for enforcement** (nothing read it at lint time before). Color-only for now, exact-value
  (whitespace-normalized), skips `var()` and custom-property *definitions*, respects `norma-disable`, and is
  inert without `--tokens`. Also readable from a `.normarc` `tokens` field, and `lintFiles({ tokensPath })`
  on the API. Loads the token file once, warning (via `validateTokens`) if it isn't valid DTCG.

## [1.9.0] — 2026-07-09 · standard

### Added

- **Rule `tokens.token-binding` (CONV/warn).** No raw CSS value that duplicates a defined design token —
  the standard side of the token-binding check above. Catalog **52 → 53** rules.
- **Compiled `standard/tokens.css` (GEN1).** A generated CSS custom-property view of the DTCG tokens
  (`scripts/gen-tokens-css.ts`, wired into `npm run gen` + the `check:drift` guard), closing the "never
  compiled" gap. Var name = `--` + the DTCG token path (`z.modal` → `--z-modal`); aliases → `var()`
  references; the dark ramp is `--color-dark-*`. A ~60-line zero-dependency emitter — deliberately **not**
  Style Dictionary — that establishes the canonical token→var naming. `index.html` still hand-writes its
  own vars; wiring the site to consume `tokens.css` is a separate change.

## [1.12.0] — 2026-07-09 · CLI

### Added

- **ESLint plugin — `norma-design-lint/eslint` (Phase 2, Enforce pillar).** Run Norma's two component-level
  design tells — the indigo-default colour tell and the `<div onClick>` non-semantic-control tell — inside
  a team's existing ESLint (flat config): `{ files: ["**/*.{jsx,tsx}"], plugins: { norma }, rules: {
  "norma/design": "error" } }`. It uses ESLint's own source text (no re-parse) and the exact engine the CLI
  runs on component files. Coverage is deliberately narrow — the two tells that transfer without a rendered
  DOM; structural a11y that needs the DOM is left to the CLI / Stylelint plugin. Accepts `{ lang, rules }`.
  `eslint` is an **optional peer dependency**, and the plugin imports nothing from ESLint at runtime — no
  new dependency for CLI/MCP users.

### Fixed

- **`antipattern.indigo-default` JSX false positive.** The `indigo-500` class token was matched against the
  whole JSX opening tag, so an `href="/…/indigo-500-…"` slug or a `data-*` attribute containing the
  substring false-fired. Non-hex class tokens are now scoped to `className`/`class` values (a specific
  indigo **hex** is still flagged anywhere in the tag — it is a colour). Fixes the CLI's
  `.jsx/.tsx/.vue/.svelte` path too, not just the new ESLint plugin.

## [1.11.0] — 2026-07-09 · CLI

### Added

- **Stylelint plugin — `norma-design-lint/stylelint` (Phase 2, Enforce pillar).** Run Norma's CSS-family
  checks (contrast, focus rings, reduced-motion, logical properties, the z-index ladder, the
  indigo-default tell, …) inside a team's existing Stylelint pipeline — one config line, no separate CI
  tool: `{ plugins: ["norma-design-lint/stylelint"], rules: { "norma/design": true } }`. It reuses the
  exact engine the CLI uses — linting Stylelint's **already-parsed** stylesheet (so it works with plain
  CSS and **SCSS / Less** via `customSyntax`), filtered to the CSS-surface checks via the shared
  `SURFACE_BY_CHECK` partition, and maps each finding to a Stylelint warning on the offending line at the
  rule's own severity (error-severity rules fail the build). Accepts `lang` + per-rule severity overrides.
  `stylelint` is an **optional peer dependency** — no new runtime dependency for CLI/MCP users.

## [1.10.0] — 2026-07-09 · CLI

### Added

- **`norma-design-lint tokens validate <file>` — a DTCG token validator.** Validates a W3C DTCG
  design-token file against the **Norma profile**: `$type` inheritance down the tree, group-vs-token
  structure, per-type value shapes (color/dimension/number/fontFamily/cubicBezier/duration), and — the
  part a JSON Schema cannot do — **alias reference integrity** (a `{group.token}` that doesn't resolve, or
  a reference cycle, is an error). Color is accepted as a CSS `oklch()`/hex string, Norma's readable
  convention (strict-DTCG color is hex or a color object). The reference `standard/tokens.tokens.json` is
  now dogfooded in CI (`npm run validate:tokens`) and a unit test.
- **MCP `validate_tokens` tool.** Exposes the same validator to AI agents (validate a token JSON string →
  `{ valid, tokenCount, errors, warnings }`), so an agent can author tokens in the loop. The MCP server
  now advertises five tools.

## [1.8.1] — 2026-07-09 · standard

### Added

- **z-index token ladder.** The layer ladder that was already normative in prose (REFERENCE §2) now
  exists as real DTCG `number` tokens in `standard/tokens.tokens.json` (`z.base 0 … z.tooltip 1700`,
  consumed as `--z-*`), closing the "phantom token" gap that rule `tokens.zindex-scale` pointed at.

### Fixed

- **z-index ladder drift.** The `fixed 1200` rung had silently gone missing from the index.html ladder
  card (8 of the 9 documented rungs); restored. A new `check:drift` guard now asserts every rung stays
  consistent across `tokens.tokens.json`, `REFERENCE.md`, `REFERENCE.vi.md` and `index.html`.

## [1.9.0] — 2026-07-08

First step toward comprehensive design governance (Govern + Generate pillars): make the linter's findings
*deliverable* and *adoptable*, and give AI agents a way to fix, not just be told.

### Added

- **`--baseline` / `--update-baseline` ratchet.** Freeze current findings into a fingerprinted baseline
  (`.norma-baseline.json`), then fail only on **new** design debt — so a team can turn Norma on over an
  existing codebase without a red build on run one. Fingerprints are line-independent (ruleId +
  repo-relative path + normalized message), so a known finding stays matched as code moves.
- **Enriched SARIF for GitHub code scanning.** `--format sarif` now populates `tool.driver.rules` with
  names, descriptions, `helpUri` (the primary source), level, and SPEC/CONV + WCAG tags, and attaches a
  `partialFingerprints` to every result. Ready for `github/codeql-action/upload-sarif` — PR annotations,
  a Security-tab alert list, and cross-commit trends. A copy-paste recipe is in `examples/ci-recipe.yml`.
- **MCP `fix_source` tool.** Exposes the deterministic `--fix` engine to AI agents (physical→logical CSS,
  positive `tabindex`→0, `rel=noopener` on external `target=_blank`), closing the lint → fix → re-lint
  loop. The MCP server now advertises four tools.

### Changed

- **License presentation.** `LICENSE` is now clean, standard MIT so GitHub detects it as MIT (it was
  reported as "Other" because of an appended dual-license note). The content license — CC BY 4.0 for the
  written standard and prose — is now stated in the README with the canonical Creative Commons URL, and
  the separate root `LICENSE-CONTENT` file was removed. Code stays MIT and content stays CC BY 4.0; only
  the presentation changed.

## [1.8.2] — 2026-07-08

### Changed

- **Documentation overhaul for clarity and professionalism.** Rewrote the root README (EN + VI):
  front-loaded a "Try it" block with real linter output, merged the duplicated *Quick start* / *Adopt*
  sections into one *Use it* section, glossed the 🔒 SPEC / 📐 CONV markers, and cut maintainer-only
  internals and stale "before the npm release" hedging (~40% shorter). Also: restored the full
  Contributor Covenant 2.1 enforcement ladder in `CODE_OF_CONDUCT.md`; fixed stale post-publish
  references in `SECURITY.md` and `RELEASING.md`; aligned the `LICENSE-CONTENT` attribution tagline;
  added a `-h/--help` row to the package README options (EN + VI); and repaired a `CONTRIBUTING.vi.md`
  drift. No runtime/behaviour change.
- **`node-html-parser` 8.0.4 → 9.0.0.** v9's only breaking change is a build-tooling swap on the
  dependency's side; the linter's API usage is unchanged and the full test suite + dogfood stay green.

## [1.8.1] — 2026-07-08

### Fixed

- **`norma-design-lint` / `norma-mcp` no longer silently no-op when run via `npx` or the installed bin.**
  The ESM main-module guard compared raw file URLs (`import.meta.url === pathToFileURL(argv[1]).href`),
  which is false when the bin is a symlink/shim — exactly how `npx norma-design-lint` and the installed
  `.bin` entry invoke it — so the CLI printed nothing and exited 0 (a silent false pass, dangerous for a
  linter). It now compares realpaths (resolving the symlink and normalising Windows drive-letter casing).
  `node dist/cli.js` was unaffected, which is why 1.8.0's tests passed; two new CI steps now invoke the
  built bin through a symlink so this can't regress. **Anyone on 1.8.0 should upgrade.**

## [1.8.0] — 2026-07-08

First npm release of the CLI (published as the unscoped package `norma-design-lint`).

### Added

- **New rule `a11y.focus-no-reshape` (CONV, catalog 51→52).** A `:focus`/`:focus-visible` block must only
  repaint the control (`outline`, `box-shadow`, `border-color`); a new static check flags box-geometry
  changes on focus — `border-radius`, `border-width`, `width`/`height`, `padding`, `font-size` — the
  "focus snaps the corners / grows a second border outside the field" AI tell (WCAG 2.4.13). A negative
  `outline-offset` (inset ring) and a skip link's position reveal are intentionally not flagged. This
  caught a real instance in the reference site's own `:focus-visible` rule.
- **Runtime Core Web Vitals gate.** A new Playwright spec (`e2e/perf.spec.ts`, Chromium) measures the
  reference site's **LCP** and **CLS** and asserts the §6 "good" thresholds (LCP < 2.5s, CLS < 0.1) — so
  the "we measure CWV" claim is dogfooded on every CI run. Dependency-free (uses the existing Playwright
  setup, no Lighthouse-CI), matching the project's dependency minimalism.
- **Vue & Svelte template reach.** The component scanner now recognises `.vue`/`.svelte` (default glob +
  dir-expand include them) and the two tells transfer verbatim: `antipattern.indigo-default` (colour tell in
  `class`/`:class`/`style`) and `a11y.semantic-control`, whose click-handler detection now covers `@click`,
  `v-on:click` and `on:click` alongside JSX `onClick`. The comment masker gained **HTML comments**
  (`<!-- … -->`) so commented-out template markup (which Vue/Svelte use, unlike JSX) is never mis-flagged.
  A Vue/Svelte SFC `<style>` block is not yet linted as CSS (roadmap).
- **MCP server (`norma-mcp`)** — a zero-dependency Model Context Protocol server over stdio (JSON-RPC 2.0,
  no SDK) so an AI agent can use Norma in the loop: `lint_source` (lint an HTML/CSS/JSX string → findings),
  `list_rules` (the catalog, filterable by `domain`/`tag`), `get_rule` (one rule by id, with rationale +
  remediation). Shipped as a second bin in `norma-design-lint`.

### Changed

- **CLI package renamed `@norma/design-lint` → `norma-design-lint`** (unscoped public package). The `@norma`
  npm scope was unavailable, so the first npm release ships under the unscoped name; the CLI bins
  (`norma-design-lint`, `norma-mcp`) are unchanged, and the programmatic import is now
  `import { lintFiles } from "norma-design-lint"`.

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
  its own checkout, so a team can gate CI **today**, before `norma-design-lint` is published to npm.
  The README "Adopt in your project" now leads with it (EN + VI).
- **`RELEASING.md`** — a one-tag release runbook (verify → `git tag v1.1.0 && git push` → `publish.yml`
  publishes with provenance), plus the post-publish badge swap-back.

### Changed

- **Honest pre-publish docs.** The dead `npm/v` badge (rendered "not found" for the unpublished package,
  reading as abandoned) is now a static `coming soon` placeholder; the Quick start (EN + VI) leads with
  the paths that work **today** (the action, or from source) and demotes `npx norma-design-lint` to
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
`norma-design-lint` CLI (1.0.0).

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

### `norma-design-lint` (CLI 1.0.0)

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

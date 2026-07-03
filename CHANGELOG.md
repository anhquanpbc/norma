# Changelog

All notable changes to this project are documented here. The format is based on
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/). The **standard** is versioned in
`standard/VERSION`; the **CLI** (`@norma/design-lint`) is versioned in its own `package.json`.

## [Unreleased]

Nothing yet.

## [1.1.0] — 2026-07-03

Post-1.0.0 hardening from an independent multi-dimension audit, a **2026 currency refresh**, and the
rule-catalog gaps that audit proved the standard already promised (standard 1.0.0 → 1.1.0). The CLI was
never published, so everything below lands **before the first npm release**.

### Added

- **New rule `a11y.heading-order`** (📐 CONV, WCAG 1.3.1) — flags a skipped heading level (`h2 → h4`).
- **New static rules** — `a11y.meta-viewport` (🔒 error, WCAG 1.4.4: `user-scalable=no` /
  `maximum-scale<2` in the viewport meta), `a11y.control-name` (🔒 error, WCAG 4.1.2: every
  `button`/`a[href]`/`[role=button]` needs an accessible name), `responsive.viewport-meta` (📐 warn:
  full documents declare a viewport meta).
- **Agent-verified SPEC rules** (`check: manual` — the engine skips them; the design agent cites them):
  `a11y.focus-not-obscured` (2.4.11), `a11y.dragging-alternative` (2.5.7), `forms.redundant-entry`
  (3.3.7), `a11y.color-only-meaning` (1.4.1). The rules.yaml header now documents that severity is
  agent-weight-only for manual rules. **Catalog: 21 → 29 rules (16 SPEC 🔒 / 13 CONV 📐).**
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
  `check: manual` rule list instead of a wrong "off" list).
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
- **Tests** — **100 unit tests** (was 58); coverage 94% statements / 87% branches.

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

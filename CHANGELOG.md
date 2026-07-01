# Changelog

All notable changes to this project are documented here. The format is based on
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/). The **standard** is versioned in
`standard/VERSION`; the **CLI** (`@norma/design-lint`) is versioned in its own `package.json`.

## [Unreleased]

### Standard v1.0.0

- Extracted the machine-readable standard: `standard/tokens.tokens.json` (W3C DTCG v2025.10) and
  `standard/rules.yaml` (15 rules, 9 SPEC) → generated `standard/rules.json`, schema-validated.
- Added §14 "AI-era Design Anti-patterns" to `REFERENCE.md` (previously only in the site).
- Reconciled the domain count to 13 across README, the site, and the reference.

### Added

- **`@norma/design-lint`** (CLI v0.1.0): lints HTML/CSS against the standard — contrast (with `var()` +
  OKLCH resolution), single focus ring, reduced-motion, form labels, semantic controls, emoji-as-icon,
  image dimensions, target size, and the indigo-default tell. Bilingual (EN/VI) messages;
  stylish / json / sarif output; inline `norma-disable` suppression; 15 tests.
- **Design agent** projected from one canonical spec (`agents/norma-design-agent.md`) into 7 surfaces:
  Claude Code subagent, `CLAUDE.md`, Cursor `.mdc`, Copilot instructions (+ scoped `applyTo`),
  and a vendor-neutral `AGENTS.md`.
- **CI/CD**: build+test, anti-drift guard, dogfood-lint (SARIF), advisory pa11y WCAG2AA cross-check,
  GitHub Pages deploy, Dependabot.
- Dual license: MIT (code) + CC BY 4.0 (content).

### Changed

- **Language structure**: English is now the primary language. Each human-facing document is split into
  an English canonical file plus a Vietnamese `*.vi.md` sibling — `README` / `REFERENCE` / `CONTRIBUTING`
  / `packages/design-lint/README` — instead of inline EN+VI mixing. The generated agent-surface files
  (`AGENTS.md`, `CLAUDE.md`, Cursor, Copilot, `.github/instructions/*`) are now **English-only**, and
  `index.html` now **defaults to English** (the in-page EN/VI toggle stays). The rule catalog
  (`standard/rules.yaml`) keeps bilingual `title` / `rationale` / `remediation` for the linter's
  `--lang en|vi`.

### Fixed

- Six real WCAG AA contrast self-violations in the reference site's own chrome (gauge labels, target
  chips, footer source labels and fine print, and `.cc-fail` / `.badge.viol` — two of which were found
  by the linter dogfooding itself).
- Scroll-spy now recomputes the active section on window resize.
- Corrected the Vietnamese-typography note (accented characters span four Unicode blocks, not only Latin
  Extended Additional) and replaced a non-real phone-number example.

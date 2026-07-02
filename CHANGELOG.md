# Changelog

All notable changes to this project are documented here. The format is based on
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/). The **standard** is versioned in
`standard/VERSION`; the **CLI** (`@norma/design-lint`) is versioned in its own `package.json`.

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

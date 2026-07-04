**English** · [Tiếng Việt](README.vi.md)

# Norma — a web design standard for humans **and** AI

[![CI](https://github.com/anhquanpbc/norma/actions/workflows/ci.yml/badge.svg)](https://github.com/anhquanpbc/norma/actions/workflows/ci.yml)
[![npm](https://img.shields.io/badge/%40norma%2Fdesign--lint-coming%20soon-lightgrey)](packages/design-lint)
[![standard](https://img.shields.io/badge/standard-v1.6.0-informational)](standard/rules.yaml)
[![code: MIT](https://img.shields.io/badge/code-MIT-blue)](LICENSE)
[![content: CC BY 4.0](https://img.shields.io/badge/content-CC%20BY%204.0-lightgrey)](LICENSE-CONTENT)

An **enforceable** technical standard for modern app & website design — the concrete numbers you can
drop into an acceptance ticket, every value tagged as a published **mandate** (🔒) or an industry
**convention** (📐), plus the machinery to make **AI coding agents** build to it and a **linter** that
gates violations in CI.

See the standard in action: **[live reference site →](https://anhquanpbc.github.io/norma/)** — a single
self-contained, zero-network page that dogfoods every rule it documents (light/dark, EN/VI).

English is the primary language; a Vietnamese translation lives in
**[README.vi.md](README.vi.md)** and **[REFERENCE.vi.md](REFERENCE.vi.md)** (the reference's dense data
tables defer to the English block).

## Why

AI coding tools reliably emit two kinds of design defect: **objective WCAG/HIG violations**, and
aesthetic **"tells"** that scream machine-generated (the indigo gradient, glow spam, `<div onClick>`).
Norma turns the standard into three aligned artifacts so both people and agents build the same way:

1. **The reference** — what's correct, and why, with primary-source citations.
2. **The agent** — strict do/don't rules wired into Claude Code, Cursor, Copilot and any `AGENTS.md` tool.
3. **The linter** — `@norma/design-lint`, which fails the build on real violations.

## What's inside

| Path | Purpose |
|------|---------|
| [`index.html`](index.html) | Interactive, **self-contained** reference site (EN/VI toggle, defaults to English, live widgets, **zero network requests**). It passes its own linter and is a reference implementation of its own content. |
| [`REFERENCE.md`](REFERENCE.md) | The full written reference in English — 14 numbered sections (§0 *How to read* + the 13 content domains), primary-source cited. Vietnamese: [`REFERENCE.vi.md`](REFERENCE.vi.md). |
| [`standard/`](standard) | **The single source of truth**: `tokens.tokens.json` (DTCG v2025.10) + `rules.yaml` → `rules.json`. |
| [`agents/`](agents) | The canonical design-agent spec, projected into the surfaces below. |
| [`AGENTS.md`](AGENTS.md) · [`CLAUDE.md`](CLAUDE.md) · [`.cursor/rules`](.cursor/rules) · [`.github/copilot-instructions.md`](.github/copilot-instructions.md) | **Generated** agent rule files (English), one per AI surface. |
| [`packages/design-lint`](packages/design-lint) | `@norma/design-lint` — the CLI that enforces the standard. |
| [`examples/`](examples) | A clean starter that lints green + a seeded "before" page that trips 11 rules, with a copy-paste [CI recipe](examples/ci-recipe.yml). |
| [`action.yml`](action.yml) | A reusable GitHub Action (`uses: anhquanpbc/norma@v1`) — builds the linter from its checkout, so it gates CI even before the npm release. |

## Quick start

**Lint your project** against the standard. `@norma/design-lint` isn't on npm yet, so use whichever of
these works for you today:

- **In CI (one step)** — the reusable action builds Norma from its own checkout, no install:
  ```yaml
  - uses: anhquanpbc/norma@v1
    with: { globs: "**/*.{html,htm,css}" }   # lang: en|vi · format: stylish|json|sarif
  ```
  A ready-to-copy workflow is in [`examples/ci-recipe.yml`](examples/ci-recipe.yml).
- **Locally (from source)**:
  ```bash
  npm ci && npm run build
  node packages/design-lint/dist/cli.js "**/*.{html,css}"   # add --lang vi for Vietnamese messages
  ```
- **Once published** — `npx @norma/design-lint "**/*.{html,css}"`. Publishing is one tag away; see
  [RELEASING.md](RELEASING.md).

See [`examples/`](examples) for a clean starter and a broken "before" page.

**Point your AI agent at Norma** by copying the generated rule file for your tool into your project:
`AGENTS.md` (Codex/Cline/Gemini/…), `.cursor/rules/norma-design.mdc` (Cursor),
`.github/copilot-instructions.md` (Copilot), or `.claude/agents/design-guardian.md` (Claude Code).

**Read the reference:** open `index.html` in any browser (works offline), or read [`REFERENCE.md`](REFERENCE.md).

## Adopt in your project

**1. Gate CI with the linter** — fail the build on real violations. The quickest path is the reusable
GitHub Action, which builds Norma from its own checkout (so it works today, before the npm release):

```yaml
# .github/workflows/design-lint.yml
- uses: actions/checkout@v4
- uses: anhquanpbc/norma@v1
  with:
    globs: "src/**/*.{html,htm,css}"   # lang: en|vi · format: stylish|json|sarif
```

A ready-to-copy workflow is in [`examples/ci-recipe.yml`](examples/ci-recipe.yml). Or run the CLI directly
(once published: `npx @norma/design-lint "**/*.{html,css}"`; from source today: `npm ci && npm run build`
then `node packages/design-lint/dist/cli.js "**/*.{html,css}"`) — non-zero exit on any error-severity finding.
See [`examples/`](examples) for a clean starter and a broken "before" page.

**2. Wire your AI coding agent** — copy the generated rule file for your tool into your repo:

| Tool | File to copy |
|------|--------------|
| Claude Code | `.claude/agents/design-guardian.md` |
| Cursor | `.cursor/rules/norma-design.mdc` |
| GitHub Copilot | `.github/copilot-instructions.md` (+ scoped `.github/instructions/*`) |
| Codex / Cline / Gemini / any `AGENTS.md` tool | `AGENTS.md` |

**3. Verify the agent is wired** — ask it to review a component. A wired agent returns findings shaped like `[SPEC] a11y.focus-ring-single — …` and refuses to emit a mandate (🔒) violation; if it doesn't, the file isn't being read. All agent files are generated from one spec so they never drift — and `npx @norma/design-lint` is the ground truth regardless.

## Covers

13 domains: design tokens (W3C DTCG 2025.10) · spacing & the 8px grid · typography (incl. Vietnamese &
CJK) · color (OKLCH, WCAG/APCA contrast) · accessibility (WCAG 2.2 AA) · Core Web Vitals (INP) · motion
(Material 3 tokens) · platform guidelines (iOS HIG vs Material 3) · components & states · forms ·
responsive design · HCI mathematical laws (Fitts, Hick, Miller…) · **AI-era design anti-patterns**
(tagged VIOLATION vs TELL).

## How it stays consistent

`standard/rules.yaml` + `standard/tokens.tokens.json` are the **only** hand-edited rule sources. The rule
JSON, all agent files, and the linter config are **generated**; a CI job (`npm run check:drift`)
regenerates everything and fails if it diverges, if the brand color is inconsistent, or if a rule is
uncovered. To change a rule: edit the YAML, run `npm run build:rules && npm run gen`, commit.

## Develop

```bash
npm ci
npm run build        # compile rules.json + the linter
npm test             # unit tests + dogfood (index.html must lint clean)
npm run check:drift  # anti-drift guard
```

See [`CONTRIBUTING.md`](CONTRIBUTING.md).

## Sources

W3C WCAG 2.2 · W3C Design Tokens (DTCG) · Apple Human Interface Guidelines · Google Material Design 3 · web.dev / Chrome (Core Web Vitals) · HTTP Archive Web Almanac · Laws of UX. Full list inside [`REFERENCE.md`](REFERENCE.md).

## License

**Code** (tooling, scripts, `index.html` JS): [MIT](LICENSE). **Content** (the written standard, `REFERENCE.md`, site prose): [CC BY 4.0](LICENSE-CONTENT).

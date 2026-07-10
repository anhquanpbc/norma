**English** · [Tiếng Việt](README.vi.md)

# Norma — a web design standard for humans **and** AI

[![CI](https://github.com/anhquanpbc/norma/actions/workflows/ci.yml/badge.svg)](https://github.com/anhquanpbc/norma/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/norma-design-lint?label=norma-design-lint)](https://www.npmjs.com/package/norma-design-lint)
[![standard](https://img.shields.io/badge/standard-v1.12.0-informational)](standard/rules.yaml)
[![code: MIT](https://img.shields.io/badge/code-MIT-blue)](LICENSE)
[![content: CC BY 4.0](https://img.shields.io/badge/content-CC%20BY%204.0-lightgrey)](https://creativecommons.org/licenses/by/4.0/)

Norma is an **enforceable, bilingual (EN/VI) web design standard** for humans and AI coding agents — the
concrete WCAG 2.2, Core Web Vitals, and design-token numbers you can drop straight into an acceptance
ticket. It ships the machinery to make them stick: a **linter** that fails CI on real violations, and
**rule files** that make AI agents build to the same standard.

**[Open the live reference site →](https://anhquanpbc.github.io/norma/)** — one self-contained,
zero-network page that dogfoods every rule it documents (light/dark, EN/VI).

## Try it

```bash
npx norma-design-lint "**/*.{html,css}"   # add --lang vi for Vietnamese
```

```text
index.html
  13:  error  Contrast 2.85:1 for ".muted" is below 4.5:1.                 color.contrast.text
  11:  warn   Forbidden value "#667eea" — no default indigo/purple gradient  antipattern.indigo-default
  25:  error  <div onclick> is not a semantic control — use <button>/<a>.   a11y.semantic-control
✗ 2 errors, 1 warning
```

It exits non-zero on any error-severity finding, so it gates CI. Full CLI reference:
**[`norma-design-lint` on npm](https://www.npmjs.com/package/norma-design-lint)**.

## Why

AI coding tools reliably ship two kinds of design defect: **objective WCAG/HIG violations**, and
aesthetic **"tells"** that scream machine-generated — the indigo gradient, glow spam, `<div onClick>`.
Norma turns one standard into three aligned artifacts so people and agents build the same way:

1. **The reference** — what's correct and why, primary-source cited ([`REFERENCE.md`](REFERENCE.md) or the [live site](https://anhquanpbc.github.io/norma/)).
2. **The agent** — strict do/don't rules for Claude Code, Cursor, Copilot, and any `AGENTS.md` tool.
3. **The linter** — `norma-design-lint`, which fails the build on real violations.

## The six pillars

Norma is comprehensive *control* over design quality, not just a rule list — every pillar has working code:

| Pillar | What it does | How Norma ships it |
|--------|--------------|--------------------|
| **Define** | one source of truth | the rule catalog ([`standard/rules.yaml`](standard/rules.yaml)) + DTCG design tokens ([`tokens.tokens.json`](standard/tokens.tokens.json), v2025.10) |
| **Enforce** | fail the build on violations | the `norma-design-lint` CLI, a **Stylelint** plugin (`norma-design-lint/stylelint`), and an **ESLint** plugin (`norma-design-lint/eslint`) — run inside the linters you already have |
| **Generate** | derive every consumer artifact | per-tool agent rule files, a zero-dependency **MCP server** for AI agents, and compiled CSS variables ([`standard/tokens.css`](standard/tokens.css)) |
| **Govern** | deliver findings where teams work | enriched **SARIF 2.1.0** → GitHub code scanning (PR annotations + a Security-tab alert list) |
| **Sync** | adopt & stay in step, no drift | a `--baseline` ratchet (fail only on *new* debt), a **DTCG token validator** (`tokens validate`), and anti-drift guards that regenerate + diff every derived file |
| **Measure** | see the state of each run | a Markdown run summary (`--format markdown` → a GitHub Step Summary) + cross-commit trends via code scanning |

## Use it

**Gate CI.** Run the `npx` command above, or use the reusable GitHub Action — it builds Norma from the
checked-out version, so there's nothing to install and the rules are pinned to that version:

```yaml
# .github/workflows/design-lint.yml
- uses: actions/checkout@v4
- uses: anhquanpbc/norma@v1
  with: { globs: "src/**/*.{html,htm,css}" }   # lang: en|vi · format: stylish|json|sarif
```

A ready-to-copy workflow is in [`examples/ci-recipe.yml`](examples/ci-recipe.yml).

**Wire your AI coding agent.** Copy the generated rule file for your tool into your repo:

| Tool | File to copy |
|------|--------------|
| Claude Code | `.claude/agents/design-guardian.md` |
| Cursor | `.cursor/rules/norma-design.mdc` |
| GitHub Copilot | `.github/copilot-instructions.md` (+ scoped `.github/instructions/*`) |
| Codex / Cline / Gemini / any `AGENTS.md` tool | `AGENTS.md` |

**Read the reference.** Open [`index.html`](index.html) in any browser (works offline), or read
[`REFERENCE.md`](REFERENCE.md).

## What's inside

| Path | Purpose |
|------|---------|
| [`standard/`](standard) | **The single source of truth** — `tokens.tokens.json` (DTCG v2025.10) + `rules.yaml` → `rules.json`. |
| [`REFERENCE.md`](REFERENCE.md) | The full written standard (EN), primary-source cited. Vietnamese: [`REFERENCE.vi.md`](REFERENCE.vi.md). |
| [`index.html`](index.html) | The self-contained reference site — EN/VI, live widgets, zero network requests. |
| [`packages/design-lint`](packages/design-lint) | `norma-design-lint` — the CLI + MCP server that enforce the standard. |
| [`agents/`](agents) · [`AGENTS.md`](AGENTS.md) · [`.cursor/rules`](.cursor/rules) · [`.github/copilot-instructions.md`](.github/copilot-instructions.md) | The canonical agent spec + its generated per-tool rule files. |
| [`examples/`](examples) | A clean starter that lints green + a seeded "before" page, with a [CI recipe](examples/ci-recipe.yml). |
| [`action.yml`](action.yml) | The reusable GitHub Action (`uses: anhquanpbc/norma@v1`). |

Every value is tagged 🔒 **SPEC** (a published WCAG/platform mandate) or 📐 **CONV** (an industry
convention), so you always know whether a rule is a hard requirement or a strong default.

## Covers

**13 domains** — design tokens · spacing & the 8px grid · typography (incl. Vietnamese & CJK) · color
(OKLCH, WCAG/APCA contrast) · accessibility (WCAG 2.2 AA) · Core Web Vitals · motion (Material 3 tokens) ·
platform (iOS HIG vs Material 3) · components & states · forms · responsive design · HCI laws (Fitts,
Hick, Miller…) · **AI-era design anti-patterns**.

## Develop

```bash
npm ci
npm run build        # compile rules.json + the linter
npm test             # unit tests + dogfood (index.html must lint clean)
npm run check:drift  # anti-drift guard (regenerates and diffs every generated file)
```

`standard/rules.yaml` + `standard/tokens.tokens.json` are the only hand-edited rule sources; the rule
JSON, agent files, and linter config are generated. See [`CONTRIBUTING.md`](CONTRIBUTING.md) for the
generation pipeline and [`RELEASING.md`](RELEASING.md) for releases.

## Sources

W3C WCAG 2.2 · W3C Design Tokens (DTCG) · Apple Human Interface Guidelines · Google Material Design 3 ·
web.dev / Chrome (Core Web Vitals) · HTTP Archive Web Almanac · Laws of UX. Full list in
[`REFERENCE.md`](REFERENCE.md).

## License

**Code** (tooling, scripts, `index.html` JS) is [MIT](LICENSE). The **written standard and prose**
(`REFERENCE.md`, the human-readable text of `standard/rules.yaml`, and the documentary copy in
`index.html` and `README.md`) is [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) — please
attribute as *"Norma — a web design standard for humans and AI" by anhquanpbc and the Norma contributors*.

# Norma — a web design standard for humans **and** AI

[![CI](https://github.com/anhquanpbc/norma/actions/workflows/ci.yml/badge.svg)](https://github.com/anhquanpbc/norma/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/@norma/design-lint?label=%40norma%2Fdesign-lint)](https://www.npmjs.com/package/@norma/design-lint)
[![standard](https://img.shields.io/badge/standard-v1.0.0-informational)](standard/rules.yaml)
[![code: MIT](https://img.shields.io/badge/code-MIT-blue)](LICENSE)
[![content: CC BY 4.0](https://img.shields.io/badge/content-CC%20BY%204.0-lightgrey)](LICENSE-CONTENT)

A **bilingual (English + Tiếng Việt)**, **enforceable** technical standard for modern app & website
design — the concrete numbers you can drop into an acceptance ticket, every value tagged as a published
**mandate** (🔒) or an industry **convention** (📐), plus the machinery to make **AI coding agents**
build to it and a **linter** that gates violations in CI.

> *Một chuẩn thiết kế web **song ngữ Anh–Việt**, **thực thi được**: những con số cụ thể đưa thẳng vào tiêu
> chí nghiệm thu, mỗi giá trị gắn nhãn **bắt buộc** (🔒) hay **quy ước** (📐), kèm bộ công cụ để **agent AI**
> tuân theo và một **linter** chặn vi phạm trong CI.*

## Why · Vì sao

AI coding tools reliably emit two kinds of design defect: **objective WCAG/HIG violations**, and
aesthetic **"tells"** that scream machine-generated (the indigo gradient, glow spam, `<div onClick>`).
Norma turns the standard into three aligned artifacts so both people and agents build the same way:

1. **The reference** — what's correct, and why, with primary-source citations.
2. **The agent** — strict do/don't rules wired into Claude Code, Cursor, Copilot and any `AGENTS.md` tool.
3. **The linter** — `@norma/design-lint`, which fails the build on real violations.

## What's inside · Nội dung

| Path | Purpose · Mục đích |
|------|---------------------|
| [`index.html`](index.html) | Interactive, **self-contained** reference site (EN/VI toggle, live widgets, **zero network requests**). It passes its own linter and is a reference implementation of its own content. |
| [`REFERENCE.md`](REFERENCE.md) | The full written reference — 14 sections, bilingual, primary-source cited. |
| [`standard/`](standard) | **The single source of truth**: `tokens.tokens.json` (DTCG v2025.10) + `rules.yaml` → `rules.json`. |
| [`agents/`](agents) | The canonical design-agent spec, projected into the surfaces below. |
| [`AGENTS.md`](AGENTS.md) · [`CLAUDE.md`](CLAUDE.md) · [`.cursor/rules`](.cursor/rules) · [`.github/copilot-instructions.md`](.github/copilot-instructions.md) | **Generated** agent rule files, one per AI surface. |
| [`packages/design-lint`](packages/design-lint) | `@norma/design-lint` — the CLI that enforces the standard. |

## Quick start · Bắt đầu nhanh

**Lint your project** against the standard:

```bash
npx @norma/design-lint "**/*.{html,css}"      # add --lang vi for Vietnamese messages
```

**Point your AI agent at Norma** by copying the generated rule file for your tool into your project:
`AGENTS.md` (Codex/Cline/Gemini/…), `.cursor/rules/norma-design.mdc` (Cursor),
`.github/copilot-instructions.md` (Copilot), or `.claude/agents/design-guardian.md` (Claude Code).

**Read the reference:** open `index.html` in any browser (works offline), or read [`REFERENCE.md`](REFERENCE.md).

## Covers · Bao gồm

13 domains · 13 mảng: design tokens (W3C DTCG 2025.10) · spacing & the 8px grid · typography (incl. Vietnamese & CJK) · color (OKLCH, WCAG/APCA contrast) · accessibility (WCAG 2.2 AA) · Core Web Vitals (INP) · motion (Material 3 tokens) · platform guidelines (iOS HIG vs Material 3) · components & states · forms · responsive design · HCI mathematical laws (Fitts, Hick, Miller…) · **AI-era design anti-patterns** (tagged VIOLATION vs TELL).

## How it stays consistent · Cách giữ nhất quán

`standard/rules.yaml` + `standard/tokens.tokens.json` are the **only** hand-edited rule sources. The rule
JSON, all agent files, and the linter config are **generated**; a CI job (`npm run check:drift`)
regenerates everything and fails if it diverges, if the brand color is inconsistent, or if a rule is
uncovered. To change a rule: edit the YAML, run `npm run build:rules && npm run gen`, commit.

## Develop · Phát triển

```bash
npm ci
npm run build        # compile rules.json + the linter
npm test             # unit tests + dogfood (index.html must lint clean)
npm run check:drift  # anti-drift guard
```

See [`CONTRIBUTING.md`](CONTRIBUTING.md).

## Sources · Nguồn

W3C WCAG 2.2 · W3C Design Tokens (DTCG) · Apple Human Interface Guidelines · Google Material Design 3 · web.dev / Chrome (Core Web Vitals) · HTTP Archive Web Almanac · Laws of UX. Full list inside [`REFERENCE.md`](REFERENCE.md).

## License · Giấy phép

**Code** (tooling, scripts, `index.html` JS): [MIT](LICENSE). **Content** (the written standard, `REFERENCE.md`, site prose): [CC BY 4.0](LICENSE-CONTENT).

> *Mã nguồn: MIT · Nội dung: CC BY 4.0.*

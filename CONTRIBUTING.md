**English** · [Tiếng Việt](CONTRIBUTING.vi.md)

# Contributing to Norma

Thanks for helping make Norma better. This project is a **standard**, a **design agent**, and a
**linter** kept in sync from one source of truth — so the golden rule is about *where* you edit.

## The golden rule

**Never hand-edit a generated file.** The only hand-authored rule sources are:

- `standard/rules.yaml` — the rule catalog.
- `standard/tokens.tokens.json` — the design tokens (the brand color lives here and nowhere else).
- `agents/norma-design-agent.md` — the canonical agent behaviour.

Everything else — `standard/rules.json`, `AGENTS.md`, `CLAUDE.md`, `.claude/agents/design-guardian.md`,
`.cursor/rules/*`, `.github/copilot-instructions.md`, `.github/instructions/*` — is **generated**. After editing a source,
run:

```bash
npm run build:rules   # rules.yaml  -> rules.json
npm run gen           # spec + rules -> the 7 agent surface files
npm run check:drift   # must pass before you commit
```

CI runs `check:drift` and will fail the build if generated files are stale, if the brand color diverges
across files, if the domain count is inconsistent, or if a rule isn't covered by the agent spec.

## Adding or changing a rule

Edit `standard/rules.yaml`. Each rule needs: a stable `id`, EN + VI `title`, a `domain`, a `tag`
(`SPEC` for a published mandate — **must** include a primary-source `source_url`; `CONV` for a
convention), a `severity` (`error` | `warn` | `off`), bilingual `rationale` + `remediation`, and a
`check` block. If it should be machine-enforced, add a check implementation under
`packages/design-lint/src/checks.ts` with **pass and fail fixtures** in `packages/design-lint/test/`.

Prefer `off` for anything a static linter can't verify soundly (e.g. rendered target size) — the design
agent enforces those instead. Soundness over coverage: a false positive on the reference site breaks
`npm test`.

## Non-goals

A few directions are deliberately **cut** — recorded here so they don't get re-litigated. Don't
re-propose them without a genuinely new reason:

- **A Figma-plugin platform or hosted dashboard.** Norma is a code-owned, agent-native standard layer that
  runs *inside* the tools teams already have (ESLint / Stylelint, GitHub code scanning). A heavy design
  platform is the Backlight cautionary tale — undifferentiated, not the moat.
- **Style Dictionary for token compilation.** Its dependency tree fights the near-zero-dep ethos, and its
  generated var names clash with the site's hand-written ones. The ~50-line zero-dep
  `scripts/gen-tokens-css.ts` compiles `standard/tokens.css` instead.
- **A versioned rules API / rules server.** No consumer needs it — `version` + `--rules` / `NORMA_RULES`
  already pin a catalog; a hosted rules service is the platform trap again.
- **A `tokens.schema.json`.** It would duplicate the hand-rolled `validateTokens` (which also checks things
  a JSON Schema can't — alias-reference integrity, the oklch "Norma profile"), and an in-file `$schema` key
  trips Norma's own unknown-`$`-key warning.
- **Component state-coverage linting (loading / empty / error).** Statically ~undecidable — a
  false-positive machine. Left to a manual pass + the design agent.
- **A deeper AST-based JSX / Vue / Svelte extractor.** Three parsers + heavy deps vs the zero-dep ethos; the
  line-wise scan already catches the transferable component tells, and CSS-in-JS / deep Tailwind semantics
  belong to the agent layer by design.

The throughline: **orchestrate, don't reinvent** — and keep the dependency tree tiny.

## Language policy

**English is the canonical language.** Each human-facing document has an English version at its canonical
path (`README.md`, `REFERENCE.md`, `CONTRIBUTING.md`, `packages/design-lint/README.md`) and a Vietnamese
sibling with a `.vi.md` suffix (`README.vi.md`, `REFERENCE.vi.md`, …). The generated agent-surface files
(`AGENTS.md`, `CLAUDE.md`, `.claude/agents/design-guardian.md`, `.cursor/rules/*`,
`.github/copilot-instructions.md`, `.github/instructions/*`) are **English-only**, since AI tools consume them in English.

The rule catalog (`standard/rules.yaml`) keeps bilingual `title` / `rationale` / `remediation`, because
the linter emits findings in both languages via `--lang en|vi`; `index.html` keeps its in-page EN/VI
toggle (defaulting to English). When you change an English doc, update its `.vi.md` sibling in the same
PR — don't let the two drift.

## Commit & PR

- Run `npm ci && npm run build && npm test && npm run check:drift` locally; all must pass.
- Keep the site (`index.html`) **zero-dependency and offline** — no CDNs, fonts, or network requests.
- Fill in the PR template checklist (edited the sources, not generated files? `check:drift` green?).

## Versioning

The **standard** is versioned in `standard/VERSION` (SemVer), independently of the CLI:
MAJOR = a mandate is added/removed or a severity tightens; MINOR = a new convention or token;
PATCH = wording/citation. Record changes in [`CHANGELOG.md`](CHANGELOG.md).

By contributing you agree your code is licensed MIT and your prose CC BY 4.0.

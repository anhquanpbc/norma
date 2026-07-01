# Contributing to Norma · Đóng góp cho Norma

Thanks for helping make Norma better. This project is a **standard**, a **design agent**, and a
**linter** kept in sync from one source of truth — so the golden rule is about *where* you edit.

> *Cảm ơn bạn giúp Norma tốt hơn. Dự án gồm **chuẩn**, **agent thiết kế**, và **linter** được đồng bộ từ
> một nguồn duy nhất — nên quy tắc vàng là về *chỗ* bạn sửa.*

## The golden rule · Quy tắc vàng

**Never hand-edit a generated file.** The only hand-authored rule sources are:

- `standard/rules.yaml` — the rule catalog.
- `standard/tokens.tokens.json` — the design tokens (the brand color lives here and nowhere else).
- `agents/norma-design-agent.md` — the canonical agent behaviour.

Everything else — `standard/rules.json`, `AGENTS.md`, `CLAUDE.md`, `.cursor/rules/*`,
`.github/copilot-instructions.md`, `.github/instructions/*` — is **generated**. After editing a source,
run:

```bash
npm run build:rules   # rules.yaml  -> rules.json
npm run gen           # spec + rules -> the 7 agent surface files
npm run check:drift   # must pass before you commit
```

CI runs `check:drift` and will fail the build if generated files are stale, if the brand color diverges
across files, if the domain count is inconsistent, or if a rule isn't covered by the agent spec.

## Adding or changing a rule · Thêm/đổi một rule

Edit `standard/rules.yaml`. Each rule needs: a stable `id`, EN + VI `title`, a `domain`, a `tag`
(`SPEC` for a published mandate — **must** include a primary-source `source_url`; `CONV` for a
convention), a `severity` (`error` | `warn` | `off`), bilingual `rationale` + `remediation`, and a
`check` block. If it should be machine-enforced, add a check implementation under
`packages/design-lint/src/checks.ts` with **pass and fail fixtures** in `packages/design-lint/test/`.

Prefer `off` for anything a static linter can't verify soundly (e.g. rendered target size) — the design
agent enforces those instead. Soundness over coverage: a false positive on the reference site breaks
`npm test`.

## Bilingual policy · Chính sách song ngữ

Docs and rule descriptions are **bilingual (EN + VI)**. Code identifiers are English; linter messages
are bilingual. Keep the two languages at parity — don't let one drift.

## Commit & PR · Commit & PR

- Run `npm ci && npm run build && npm test && npm run check:drift` locally; all must pass.
- Keep the site (`index.html`) **zero-dependency and offline** — no CDNs, fonts, or network requests.
- Fill in the PR template checklist (regenerated? lint:self green?).

## Versioning · Đánh phiên bản

The **standard** is versioned in `standard/VERSION` (SemVer), independently of the CLI:
MAJOR = a mandate is added/removed or a severity tightens; MINOR = a new convention or token;
PATCH = wording/citation. Record changes in [`CHANGELOG.md`](CHANGELOG.md).

By contributing you agree your code is licensed MIT and your prose CC BY 4.0.

**English** · [Tiếng Việt](README.vi.md)

# norma-design-lint

Lint HTML/CSS against the [Norma](https://github.com/anhquanpbc/norma) web design standard —
contrast, focus rings, semantic HTML, form labels, reduced-motion, and the common
AI-generated design "tells". Bilingual (EN/VI) messages via `--lang`, SARIF output for GitHub.

## Usage

```bash
npx norma-design-lint "**/*.{html,css,jsx,tsx}"
npx norma-design-lint index.html --lang vi
npx norma-design-lint src --format sarif > design-lint.sarif
```

Exit code is non-zero when any `error`-severity finding is present, so it gates CI.

**Adopt on an existing codebase:** run `--update-baseline` once to freeze current findings into
`.norma-baseline.json` (commit it), then pass `--baseline .norma-baseline.json` so CI fails only on
**new** design debt. **GitHub code scanning:** `--format sarif` emits enriched SARIF 2.1.0 (rule
metadata, `helpUri`, line-independent fingerprints) — upload it with `github/codeql-action/upload-sarif`
for PR annotations and a Security-tab alert list (see [`examples/ci-recipe.yml`](https://github.com/anhquanpbc/norma/blob/main/examples/ci-recipe.yml)).

### Options

| Option | Description |
|---|---|
| `--format <stylish\|json\|sarif>` | Output format (default `stylish`). |
| `--lang <en\|vi>` | Message language (default `en`, or `NORMA_LANG`). |
| `--config <path>` | Config file (default `.normarc.json` if present). |
| `--rules <path>` | Rule catalog path (default: bundled `standard/rules.json`). |
| `--quiet` | Only report errors. |
| `--max-warnings <n>` | Exit non-zero if warnings exceed `n` (so CI can gate warn-severity rules, not just errors). |
| `--fix` | Auto-fix the deterministic rules in place, then lint the rest. |
| `--baseline <path>` | Suppress findings already in the baseline; fail only on NEW ones (adopt on legacy code). |
| `--update-baseline` | (Re)write the baseline from the current findings (path from `--baseline`, else `.norma-baseline.json`). |
| `-h`, `--help` | Show usage and exit. |

`--fix` only touches edits with **no judgement call**: physical→logical CSS properties
(`margin-left`→`margin-inline-start`, `text-align:left`→`start`, …) in `.css` files, and in HTML a
positive `tabindex`→`0` plus `rel="noopener noreferrer"` on an external `target="_blank"` link that has
no `rel`. Everything else (contrast, target size, labels, `lang`, alt text, dead hrefs) needs a human
decision and is reported, never rewritten. HTML edits are byte-surgical — the rest of the file is untouched.

### Config (`.normarc.json`)

```json
{ "lang": "vi", "rules": { "perf.img-dimensions": "error", "a11y.emoji-icon": "off" } }
```

### Disabling a rule inline

The reference site marks its intentional anti-pattern demos with a comment:

```css
/* norma-disable a11y.focus-ring-single -- intentional VIOLATION demo */
.demo:focus-visible { outline: 2px solid blue; box-shadow: 0 0 0 4px red; }
```

For HTML, add `data-norma-disable="rule.id"` to the element.

## What it checks

Sound, low-false-positive static checks mapped to the Norma rule catalog (`standard/rules.yaml`):
contrast (co-located resolvable pairs, incl. `var()` + OKLCH), single focus ring,
reduced-motion presence, form labels / placeholder-as-label, semantic controls (`<div onclick>`),
emoji-as-icon, image dimensions, target size, and the indigo-default gradient tell. Rules that
static analysis cannot verify soundly (the 8px spacing scale, the 16px body-text floor, runtime
performance budgets, and four agent-verified WCAG 2.2 mandates such as 2.4.11 Focus Not Obscured)
are `check: manual` in the catalog — the engine skips them and the Norma design agent enforces
them instead.

## What it can and cannot see

The linter fully parses **HTML and CSS** (including `<style>` blocks and inline `style="…"` attributes) —
every rule runs there.

**Component templates (`.jsx`/`.tsx`/`.vue`/`.svelte`) have partial support (MVP):** the source is
scanned, line-accurately, for the two tells that transfer cleanly without a full DOM — the
**indigo-default colour tell** (`antipattern.indigo-default`: `#667eea`/`#764ba2`/`indigo-500` in a
`class`/`className`/`:class`, `style` object, or arbitrary Tailwind value like `bg-[#667eea]`) and the
**click-on-a-`<div>` semantic-control tell** (`a11y.semantic-control`: a lowercase intrinsic element with
a click handler — `onClick` / `@click` / `v-on:click` / `on:click` — and no ARIA `role`; `<Component>`
wrappers are skipped). Structural a11y that depends on the rendered tree — landmarks, heading order,
labels, contrast — is **not** evaluated here, because a component file isn't a page; run those against
your built HTML/CSS. A Vue/Svelte SFC's `<style>` block is not yet linted as CSS.

CSS-in-JS and general Tailwind class semantics are still out of scope. For those, lean on the **agent
layer** (`AGENTS.md`, the Cursor/Copilot/Claude rule files) generated from the same catalog. A deeper
AST-based extractor is the next step.

## Validate design tokens

Beyond HTML/CSS, Norma validates a [W3C DTCG](https://tr.designtokens.org/format/) design-token file
against the **Norma profile** — DTCG structure (`$type` inheritance, group-vs-token, per-type value
shapes) plus **alias reference integrity** (a `{group.token}` that doesn't resolve, or a reference cycle,
is caught — a plain JSON Schema can't do that). Color is accepted as a CSS `oklch()`/hex string, Norma's
readable convention:

```bash
npx norma-design-lint tokens validate tokens.tokens.json
```

Exit code is 0 when valid, 1 on any structural error. A bad `$type`, a malformed dimension/duration, or a
dangling/cyclic alias is an error; an unknown `$`-prefixed key is a warning (forward-compatible with future
spec revisions).

## MCP server (for AI agents)

The package ships a zero-dependency [Model Context Protocol](https://modelcontextprotocol.io) server over
stdio, so an agent can query the standard and lint source in the loop. Point your MCP client at the
`norma-mcp` bin:

```json
{ "mcpServers": { "norma": { "command": "npx", "args": ["-y", "norma-design-lint", "norma-mcp"] } } }
```

Tools: **`lint_source`** (lint an HTML/CSS/JSX string → findings), **`list_rules`** (the catalog, filterable
by `domain`/`tag`), **`get_rule`** (one rule by id, with rationale + remediation), **`fix_source`**
(auto-fix the deterministic rules in an HTML/CSS string → fixed source + edit count, to close the
lint→fix→re-lint loop), and **`validate_tokens`** (validate a DTCG token JSON string → `{ valid,
tokenCount, errors, warnings }`).

## Programmatic API

```ts
import { lintFiles } from "norma-design-lint";
const { findings, errorCount } = lintFiles(["index.html"]);
```

## License

MIT.

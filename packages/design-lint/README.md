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
for PR annotations and a Security-tab alert list. **A run summary:** `--format markdown` prints a
by-domain / by-rule table (plus the baseline delta) — append it to `$GITHUB_STEP_SUMMARY` for a readable
per-run snapshot in the Actions UI (see [`examples/ci-recipe.yml`](https://github.com/anhquanpbc/norma/blob/main/examples/ci-recipe.yml)).

### Options

| Option | Description |
|---|---|
| `--format <stylish\|json\|sarif\|markdown>` | Output format (default `stylish`). `json` = a slim machine report (repo-relative paths, single-`--lang` messages). `markdown` = a by-domain / by-rule summary for a GitHub Step Summary or PR comment. |
| `--lang <en\|vi>` | Message language (default `en`, or `NORMA_LANG`). |
| `--config <path>` | Config file (default `.normarc.json` if present). |
| `--rules <path>` | Rule catalog path (default: bundled `standard/rules.json`). |
| `--tokens <path>` | DTCG token file → enable **token-binding**: flag a raw CSS value that literally duplicates a defined token (e.g. a hard-coded `oklch(…)` equal to `color.brand.azure`) and point at the token. Color-only for now; inert without this flag. |
| `--quiet` | Only report errors. |
| `--max-warnings <n>` | Exit non-zero if warnings exceed `n` (so CI can gate warn-severity rules, not just errors). |
| `--max-per-rule <n>` | Cap how many findings each rule LISTS in `stylish`/`json`, so one rule firing thousands of times can't flood an agent's context or a CI log. Counts + exit code stay the true totals; `json` adds a per-rule `truncated` map of what was hidden. The listing is a per-rule sample (it can omit whole files) — re-run without the cap for the exhaustive list. |
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

## Use inside Stylelint

Already run [Stylelint](https://stylelint.io)? Adopt Norma's CSS-family checks (contrast, focus rings,
reduced-motion, logical properties, the z-index ladder, the indigo-default tell, …) as one config line —
no separate CI tool. It lints whatever Stylelint parses: plain CSS, and **SCSS / Less** via `customSyntax`
(it runs on Stylelint's own parsed stylesheet). `stylelint` is an optional peer dependency; the plugin
ships as a subpath export.

```js
// stylelint.config.js
export default {
  plugins: ["norma-design-lint/stylelint"],
  rules: {
    "norma/design": true,
    // or pass options: [true, { lang: "vi", rules: { "color.contrast.text": "warn" } }]
  },
};
```

Each Norma finding becomes a Stylelint warning on the offending line, tagged with its rule id, at the
rule's own severity (error-severity Norma rules fail the build). The DOM-based checks (labels, landmarks,
headings, …) don't apply to stylesheets — run those against your HTML with the CLI above.

## Use inside ESLint

For JSX/TSX components, run Norma's two transferable design tells — the **indigo-default** colour tell and
the **`<div onClick>` non-semantic-control** tell — inside your existing ESLint (flat config):

```js
// eslint.config.js
import norma from "norma-design-lint/eslint";

export default [
  {
    files: ["**/*.{jsx,tsx}"],
    plugins: { norma },
    // or ["error", { lang: "vi", rules: { "antipattern.indigo-default": "off" } }]
    rules: { "norma/design": "error" },
  },
];
```

This block slots into your **existing** flat config — your project's JSX/TSX parser (`typescript-eslint`, or
espree with `languageOptions.parserOptions.ecmaFeatures.jsx`) does the parsing; the plugin only reads the
source text. `eslint` is an optional peer dependency; the plugin ships as a subpath export and imports
nothing from ESLint at runtime. Coverage here is deliberately narrow — a component isn't a rendered page, so structural
a11y (landmarks, labels, contrast, heading order) is **not** evaluated. Lint your built HTML with the CLI,
and your CSS with the Stylelint plugin, for the full rule set.

## Framework quickstart (React, Vue, Svelte)

A component-based app is linted in three layers — wire the ones your stack uses:

- **Components** (`.jsx` / `.tsx` / `.vue` / `.svelte`) — the **ESLint plugin** (above) flags the two
  transferable tells in-editor and in CI; the CLI catches the same (its default glob already includes these
  extensions).
- **Stylesheets & SFC `<style>` blocks** — the **Stylelint plugin** (above) runs the full CSS-family rule set.
- **Built / static HTML** — point the CLI at your build directory: `npx norma-design-lint ./dist` (or
  `./build` / `./out`). This runs the DOM-structural a11y rules — landmarks, labels, heading order — that a
  component file can't express. Pass the directory itself, **not** a `dist/**` glob: broad globs skip
  `dist`/`build` by design (so a stray `**/*.html` never lints stale build output).

**React / Next.js** — the ESLint rule from the [ESLint](#use-inside-eslint) section for components, plus a
CLI script for CSS and built output:

```jsonc
// package.json
"scripts": {
  "lint:design": "norma-design-lint \"**/*.{css,jsx,tsx}\""
}
```

**Vue / Svelte** — the Stylelint plugin lints the `<style>` blocks; point Stylelint's `customSyntax` at your
SFC format (e.g. `postcss-html`), then run the CLI over components and any built HTML.

**Pre-commit** — lint only what you're committing, with [lint-staged](https://github.com/lint-staged/lint-staged):

```jsonc
// package.json
"lint-staged": {
  "**/*.{html,htm,css,jsx,tsx,vue,svelte}": "norma-design-lint"
}
```

Trigger it from your existing `pre-commit` hook (husky or simple-git-hooks). Already on GitHub Actions?
`npx norma-design-lint init` drops in a ready-made workflow.

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

CSS-in-JS and general Tailwind class semantics are out of scope here **by design**: deep component-tree
semantics belong to the **agent layer** (`AGENTS.md`, the Cursor/Copilot/Claude rule files) generated from
the same catalog — not to a heavier parser inside the linter. Lint your built HTML/CSS with the CLI for the
full rule set.

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

## AI-agent rule files

**Fastest start:** `npx norma-design-lint init` scaffolds a `.normarc.json`, a CI workflow, and `AGENTS.md`
in one step (existing files are skipped unless `--force`).

Norma generates strict do/don't rule files for AI coding tools from the same catalog, and they ship
**inside this package** — no repo clone needed. Copy the one for your tool out of
`node_modules/norma-design-lint/dist/agents/`:

| Tool | File | Copy to |
|------|------|---------|
| Claude Code | `design-guardian.md` | `.claude/agents/` |
| Cursor | `norma-design.mdc` | `.cursor/rules/` |
| GitHub Copilot | `copilot-instructions.md` (+ scoped `css.instructions.md` / `html.instructions.md`) | `.github/` (+ `.github/instructions/`) |
| Codex / Cline / Gemini / any `AGENTS.md` tool | `AGENTS.md` | repo root |

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
lint→fix→re-lint loop), **`validate_tokens`** (validate a DTCG token JSON string → `{ valid,
tokenCount, errors, warnings }`), and **`get_tokens`** (the design tokens resolved for generation — each
token's CSS custom-property name + value + alias-resolved concrete, plus the light/dark theme map, so an
agent builds with the right token instead of a raw value; optionally filtered by `group`).

## Programmatic API

```ts
import { lintFiles } from "norma-design-lint";
const { findings, errorCount } = lintFiles(["index.html"]);
```

## License

MIT.

<!-- English · [Tiếng Việt](README.vi.md) -->
# Norma examples

Two tiny projects that show the linter working — copy the first, learn from the second.

| Folder | What it is | Linter result |
|--------|-----------|---------------|
| [`minimal-pass/`](minimal-pass) | A clean, well-formed starter page built to the standard (semantic HTML, one focus ring, token color, logical properties, honored reduced-motion). | **0 findings, exits 0** — copy this to start. |
| [`catches-violations/`](catches-violations) | An AI-scaffolded "before" page seeded with the most common defects. | **4 errors + 9 warnings across 13 rules, exits 1** — the "before", not the "after". |

## Run it

From source (works today, no npm needed):

```bash
npm ci && npm run build          # build the linter once, from the repo root
node packages/design-lint/dist/cli.js examples/minimal-pass/index.html       # ✓ clean
node packages/design-lint/dist/cli.js examples/catches-violations/index.html # ✗ non-zero exit
```

Once [`norma-design-lint`](../packages/design-lint) is published:

```bash
npx norma-design-lint examples/minimal-pass/index.html
```

## What `catches-violations/` teaches

Each block trips a specific rule, so the output maps defect → rule id → fix:

| Defect in the page | Rule | Type |
|---|---|---|
| `#667eea → #764ba2` indigo gradient | `antipattern.indigo-default` | TELL |
| Raw hex color literals in CSS | `tokens.color-only` | TELL |
| `background-clip: text` over a gradient | `antipattern.gradient-text` | TELL |
| `#999` text on `#fff` | `color.contrast.text` | VIOLATION (1.4.3) |
| `<div onclick>` used as a button | `a11y.semantic-control` | VIOLATION (4.1.2) |
| `placeholder` used as the only label | `a11y.form-label` | VIOLATION (3.3.2) |
| Emoji-only button, no label | `a11y.emoji-icon` | VIOLATION (1.1.1) |
| `<a href="#">` wired to nothing | `antipattern.dead-href` | TELL |
| `tabindex="3"` forces tab order | `a11y.no-positive-tabindex` | VIOLATION (2.4.3) |
| `<html>` has no `lang` | `i18n.html-lang` | VIOLATION (3.1.1) |
| No `<meta name="viewport">` | `responsive.viewport-meta` | CONV |
| "Learn more" link text | `a11y.generic-link-text` | VIOLATION (2.4.4) |
| No `<main>` landmark | `a11y.landmark-main` | CONV |

## Gate it in CI

Copy [`ci-recipe.yml`](ci-recipe.yml) into `.github/workflows/` — it fails the build on any error-severity
finding. Or use the reusable action from the repo root:

```yaml
- uses: anhquanpbc/norma@v1
  with:
    globs: "src/**/*.{html,htm,css}"
    lang: en          # or vi
    format: stylish   # or json | sarif
```

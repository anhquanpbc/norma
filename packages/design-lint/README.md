**English** · [Tiếng Việt](README.vi.md)

# @norma/design-lint

Lint HTML/CSS against the [Norma](https://github.com/anhquanpbc/norma) web design standard —
contrast, focus rings, semantic HTML, form labels, reduced-motion, and the common
AI-generated design "tells". Bilingual (EN/VI) messages via `--lang`, SARIF output for GitHub.

## Usage

```bash
npx @norma/design-lint "**/*.{html,css}"
npx @norma/design-lint index.html --lang vi
npx @norma/design-lint src --format sarif > design-lint.sarif
```

Exit code is non-zero when any `error`-severity finding is present, so it gates CI.

### Options

| Option | Description |
|---|---|
| `--format <stylish\|json\|sarif>` | Output format (default `stylish`). |
| `--lang <en\|vi>` | Message language (default `en`, or `NORMA_LANG`). |
| `--config <path>` | Config file (default `.normarc.json` if present). |
| `--rules <path>` | Rule catalog path (default: bundled `standard/rules.json`). |
| `--quiet` | Only report errors. |

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
performance budgets) are `check: manual` in the catalog — the engine skips them and the Norma
design agent enforces them instead.

## Programmatic API

```ts
import { lintFiles } from "@norma/design-lint";
const { findings, errorCount } = lintFiles(["index.html"]);
```

## License

MIT.

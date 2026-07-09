/**
 * gen-tokens-css.ts — compile the DTCG design tokens into a CSS custom-property view.
 *
 *   standard/tokens.tokens.json  ──▶  standard/tokens.css   (:root { --<token-path>: <value>; … })
 *
 * standard/tokens.css is GENERATED. Never hand-edit it. Run `npm run gen`. CI regenerates and diffs.
 * The custom-property name is `--` + the DTCG token path joined by `-` (e.g. `z.modal` → `--z-modal`,
 * which is exactly the z-index ladder's documented convention). DTCG aliases become `var()` references so
 * the semantic layer's cascade is preserved. The `$extensions` theme map is intentionally NOT emitted —
 * the dark ramp is already reachable as `--color-dark-*`; wiring a theme is the consumer's choice.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const stdDir = join(root, "standard");
const tokens = JSON.parse(readFileSync(join(stdDir, "tokens.tokens.json"), "utf8"));

const isObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);
const isAlias = (v: unknown): v is string => typeof v === "string" && /^\{[^{}]+\}$/.test(v);
const varName = (path: string[]): string => "--" + path.join("-");
const die = (msg: string): never => { console.error(`✗ gen-tokens-css: ${msg}`); process.exit(1); };
// A font-family member needs quoting in CSS when it contains whitespace.
const familyMember = (s: string): string => (/\s/.test(s) ? `"${s}"` : s);

function formatValue(path: string[], value: unknown, type: string | undefined): string {
  if (isAlias(value)) return `var(${varName(value.slice(1, -1).split("."))})`;
  switch (type) {
    case "color":
      if (typeof value === "string") return value;
      break;
    case "dimension":
    case "duration":
      if (isObject(value) && typeof value.value === "number" && typeof value.unit === "string") {
        return `${value.value}${value.unit}`;
      }
      break;
    case "number":
      if (typeof value === "number") return String(value);
      break;
    case "fontFamily":
      if (Array.isArray(value)) return value.map((v) => familyMember(String(v))).join(", ");
      if (typeof value === "string") return familyMember(value);
      break;
    case "cubicBezier":
      if (Array.isArray(value) && value.length === 4) return `cubic-bezier(${value.join(", ")})`;
      break;
  }
  return die(`cannot format ${varName(path)} (type ${type ?? "?"}, value ${JSON.stringify(value)})`);
}

interface Decl { name: string; value: string; }
const decls: Decl[] = [];
const seen = new Set<string>();

function walk(node: Record<string, unknown>, path: string[], inheritedType: string | undefined): void {
  const type = typeof node.$type === "string" ? node.$type : inheritedType;
  if ("$value" in node) {
    const name = varName(path);
    // Two token paths must never collide onto one custom property (mirrors build-rules.ts's duplicate-id
    // guard) — a silent duplicate would let one token clobber another.
    if (seen.has(name)) die(`two token paths collide on custom property ${name}`);
    seen.add(name);
    decls.push({ name, value: formatValue(path, node.$value, type) });
    return;
  }
  for (const [key, child] of Object.entries(node)) {
    if (key.startsWith("$")) continue; // skip $extensions, $description, $type, …
    if (isObject(child)) walk(child, [...path, key], type);
  }
}
walk(tokens, [], undefined);

if (!decls.length) die("no tokens found");
const width = Math.max(...decls.map((d) => d.name.length));
const body = decls.map((d) => `  ${d.name.padEnd(width)}: ${d.value};`).join("\n");
const out = `/* GENERATED from standard/tokens.tokens.json by scripts/gen-tokens-css.ts — do not edit.
   The CSS custom-property view of the Norma design tokens. Var name = "--" + the DTCG token path
   (e.g. z.modal -> --z-modal). Aliases are var() references; the $extensions theme map is not emitted
   (the dark ramp is available as --color-dark-*). Run \`npm run gen\` to regenerate. */
:root {
${body}
}
`;
writeFileSync(join(stdDir, "tokens.css"), out);
console.log(`✓ standard/tokens.css — ${decls.length} custom properties`);

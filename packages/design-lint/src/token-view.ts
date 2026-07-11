/**
 * token-view.ts — resolve the DTCG design tokens into a flat, agent-facing view for the MCP `get_tokens`
 * tool, so an agent can GENERATE UI that reaches for the right token instead of a raw value.
 *
 * Each token is projected to: its CSS custom-property name (`--color-brand-azure`), its CSS-writable value
 * (an alias stays a `var(--…)` reference), the fully alias-resolved concrete value, and its description.
 * The light/dark theme role map comes from `$extensions.org.norma.themes`.
 *
 * The value formatter (`formatCssValue`) + var-name mapping (`varName`) are the SAME ones
 * `scripts/gen-tokens-css.ts` uses to emit `standard/tokens.css`, so the MCP token view and the generated
 * stylesheet can never disagree on how a token renders (check:drift guards `tokens.css` byte-for-byte).
 */
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const isObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);
const isAlias = (v: unknown): v is string => typeof v === "string" && /^\{[^{}]+\}$/.test(v);
// A font-family member needs quoting in CSS when it contains whitespace.
const familyMember = (s: string): string => (/\s/.test(s) ? `"${s}"` : s);

/** CSS custom-property name for a DTCG token path: "--" + path joined by "-" (e.g. z.modal → --z-modal). */
export const varName = (path: string[]): string => "--" + path.join("-");

/**
 * Render a DTCG token $value as the CSS-writable string: an alias becomes a `var()` reference, a concrete
 * value is formatted per its $type. Throws on a value it cannot format (the caller decides how to report) —
 * the standard's own tokens always format, so this only fires on malformed input.
 */
export function formatCssValue(value: unknown, type: string | undefined): string {
  if (isAlias(value)) return `var(${varName(value.slice(1, -1).split("."))})`;
  switch (type) {
    case "color":
      if (typeof value === "string") return value;
      break;
    case "dimension":
    case "duration":
      if (isObject(value) && typeof value.value === "number" && typeof value.unit === "string") return `${value.value}${value.unit}`;
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
  throw new Error(`cannot format value ${JSON.stringify(value)} (type ${type ?? "?"})`);
}

export interface ResolvedToken {
  /** CSS custom-property name, e.g. "--color-brand-azure". */
  name: string;
  /** Dotted DTCG path, e.g. "color.brand.azure". */
  path: string;
  type: string;
  /** CSS-writable value — an alias is kept as `var(--…)`, a concrete token is the literal. */
  value: string;
  /** The concrete value after following aliases — present only when `value` is a `var()` reference. */
  resolved?: string;
  description?: string;
}
export interface ThemeRole {
  /** The token this role maps to, e.g. "color.surface.1". */
  token: string;
  name: string;
  value: string;
}
export interface TokenView {
  tokens: ResolvedToken[];
  /** Theme → role → resolved token, from $extensions.org.norma.themes (e.g. light.surface, dark.text). */
  themes: Record<string, Record<string, ThemeRole>>;
}

interface RawNode { path: string[]; value: unknown; type: string | undefined; description?: string; }

// DTCG token trees are shallow; this cap keeps the recursive walk from overflowing the stack on hostile
// input, mirroring validateTokens/colorTokenIndex in tokens.ts.
const MAX_DEPTH = 100;

/**
 * Resolve a parsed DTCG token document into the flat agent view. Never throws on structure — a non-object
 * doc yields an empty view, a dangling/cyclic alias simply gets no `resolved` value.
 */
export function resolveTokens(doc: unknown): TokenView {
  if (!isObject(doc)) return { tokens: [], themes: {} };

  const nodes: RawNode[] = [];
  const byPath = new Map<string, RawNode>();
  const walk = (node: Record<string, unknown>, path: string[], inheritedType: string | undefined, depth: number): void => {
    if (depth > MAX_DEPTH) return;
    const type = typeof node.$type === "string" ? node.$type : inheritedType;
    if ("$value" in node) {
      const n: RawNode = { path, value: node.$value, type, description: typeof node.$description === "string" ? node.$description : undefined };
      nodes.push(n);
      byPath.set(path.join("."), n);
      return;
    }
    for (const [k, child] of Object.entries(node)) {
      if (k.startsWith("$")) continue;
      if (isObject(child)) walk(child, [...path, k], type, depth + 1);
    }
  };
  walk(doc, [], undefined, 0);

  // Follow an alias chain to the first concrete node (cycle-safe); undefined if it dangles or loops.
  const concrete = (start: RawNode): RawNode | undefined => {
    const seen = new Set<string>([start.path.join(".")]);
    let cur = start;
    while (isAlias(cur.value)) {
      const next = byPath.get(cur.value.slice(1, -1));
      if (!next || seen.has(next.path.join("."))) return undefined;
      seen.add(next.path.join("."));
      cur = next;
    }
    return cur;
  };

  const tokens: ResolvedToken[] = nodes.map((n) => {
    const t: ResolvedToken = { name: varName(n.path), path: n.path.join("."), type: n.type ?? "", value: formatCssValue(n.value, n.type) };
    if (isAlias(n.value)) {
      const c = concrete(n);
      if (c) t.resolved = formatCssValue(c.value, c.type);
    }
    if (n.description) t.description = n.description;
    return t;
  });

  // Theme role map: each role is an alias to a token; resolve it to its concrete value + var name.
  const themes: Record<string, Record<string, ThemeRole>> = {};
  const ext = isObject(doc.$extensions) ? doc.$extensions["org.norma.themes"] : undefined;
  if (isObject(ext)) {
    for (const [themeName, roles] of Object.entries(ext)) {
      if (themeName.startsWith("$") || !isObject(roles)) continue;
      const roleMap: Record<string, ThemeRole> = {};
      for (const [role, ref] of Object.entries(roles)) {
        if (role.startsWith("$") || !isAlias(ref)) continue;
        const targetPath = ref.slice(1, -1);
        const target = byPath.get(targetPath);
        const c = target ? concrete(target) : undefined;
        roleMap[role] = { token: targetPath, name: varName(targetPath.split(".")), value: c ? formatCssValue(c.value, c.type) : ref };
      }
      themes[themeName] = roleMap;
    }
  }
  return { tokens, themes };
}

/** Locate the token file: the bundled copy next to this module (published) → the repo's standard/ (dev). */
function resolveTokensPath(): string | null {
  const here = dirname(fileURLToPath(import.meta.url));
  const bundled = join(here, "tokens.tokens.json");
  if (existsSync(bundled)) return bundled;
  let dir = here;
  for (let i = 0; i < 8; i++) {
    const p = join(dir, "standard", "tokens.tokens.json");
    if (existsSync(p)) return p;
    dir = dirname(dir);
  }
  return null;
}

/**
 * Load + resolve the bundled/standard token file into a view. Returns null when the file can't be found or
 * parsed, so the MCP `get_tokens` tool degrades to a clean "unavailable" error instead of crashing.
 */
export function loadTokenView(): TokenView | null {
  const p = resolveTokensPath();
  if (!p) return null;
  try { return resolveTokens(JSON.parse(readFileSync(p, "utf8"))); }
  catch { return null; }
}

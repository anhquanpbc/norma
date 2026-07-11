/**
 * A dependency-free validator for W3C DTCG (Design Tokens Community Group) Format Module token files,
 * in the "Norma profile":
 *   - strict DTCG *structure* — $value/$type, group-vs-token, $type inheritance down the tree, aliases,
 *     value shapes for color/dimension/number/fontFamily/fontWeight/cubicBezier/duration, $extensions
 *     treated as an opaque escape hatch;
 *   - Norma *color* convention — strict DTCG color is a hex string or a {colorSpace,components,…} object,
 *     but Norma stores CSS `oklch()` strings for human + CSS readability, so a color $value is accepted as
 *     a hex string, an `oklch()` string, or a DTCG color object.
 *
 * Pure: takes a parsed JSON value (untrusted — from an arbitrary file) and returns a structured report.
 * No file I/O — the CLI reads + JSON.parses, the MCP tool JSON.parses, tests pass a literal.
 */

export interface TokenProblem {
  /** Dotted token path, e.g. "color.brand.azure" or "space.1.$value.unit". */
  path: string;
  message: string;
}
export interface TokenValidationResult {
  /** True when there are no errors. Warnings do not make a file invalid. */
  valid: boolean;
  errors: TokenProblem[];
  warnings: TokenProblem[];
  /** How many tokens (nodes with a $value) were found. */
  tokenCount: number;
}

// The DTCG Format Module type set. Composite types are accepted structurally but not deeply validated
// (Norma uses none of them; validating their sub-shapes would be dead code — YAGNI).
const DTCG_TYPES = new Set([
  "color", "dimension", "number", "fontFamily", "fontWeight", "duration",
  "cubicBezier", "strokeStyle", "border", "transition", "shadow", "gradient", "typography",
]);
const RESERVED_KEYS = new Set(["$value", "$type", "$description", "$extensions", "$deprecated"]);
const DIMENSION_UNITS = new Set(["px", "rem"]);
const DURATION_UNITS = new Set(["ms", "s"]);
// DTCG token trees are shallow (a handful of levels); this cap keeps the recursive walk from overflowing
// the call stack on hostile/deeply-nested input, so validateTokens honours its "never throws" contract.
const MAX_DEPTH = 100;
const HEX = /^#([0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})$/i;
const OKLCH = /^oklch\(\s*[\d.]+%?\s+[\d.]+\s+[\d.]+\s*(\/\s*[\d.]+%?\s*)?\)$/i;

const isObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);
const isAlias = (v: unknown): v is string => typeof v === "string" && /^\{[^{}]+\}$/.test(v);
const typeName = (v: unknown): string => (Array.isArray(v) ? "array" : v === null ? "null" : typeof v);
const join = (path: string, seg: string): string => (path ? `${path}.${seg}` : seg);

interface TokenNode { path: string; value: unknown; type: string | undefined; }

/** Validate a parsed DTCG token document (Norma profile). Never throws. */
export function validateTokens(doc: unknown): TokenValidationResult {
  const errors: TokenProblem[] = [];
  const warnings: TokenProblem[] = [];
  const err = (path: string, message: string): void => { errors.push({ path: path || "(root)", message }); };
  const warn = (path: string, message: string): void => { warnings.push({ path: path || "(root)", message }); };

  if (!isObject(doc)) {
    return { valid: false, errors: [{ path: "(root)", message: `token document must be a JSON object, got ${typeName(doc)}` }], warnings: [], tokenCount: 0 };
  }

  const tokens: TokenNode[] = [];
  const byPath = new Map<string, TokenNode>();

  // Pass 1: walk groups + tokens, validate structure, collect tokens for alias resolution.
  const walk = (node: Record<string, unknown>, path: string, inheritedType: string | undefined, depth: number): void => {
    if (depth > MAX_DEPTH) { err(path, `token tree exceeds the maximum nesting depth of ${MAX_DEPTH}`); return; }
    let effectiveType = inheritedType;
    if (node.$type !== undefined) {
      if (typeof node.$type !== "string" || !DTCG_TYPES.has(node.$type)) {
        err(join(path, "$type"), `unknown $type ${JSON.stringify(node.$type)} (expected one of: ${[...DTCG_TYPES].join(", ")})`);
      } else {
        effectiveType = node.$type;
      }
    }
    // Unknown $-prefixed keys → warn (the $-namespace is reserved for future spec use; a hard fail could
    // break on a future minor revision, but this still catches typos like $val/$typ).
    for (const key of Object.keys(node)) {
      // `$schema` (a JSON-Schema pointer) is allowed ONLY at the root — DTCG 2025.10 files / DESIGN.md's
      // `export --format dtcg` carry one there; a `$schema` deeper in the tree is still a typo worth flagging.
      if (key.startsWith("$") && !RESERVED_KEYS.has(key) && !(key === "$schema" && path === "")) {
        warn(join(path, key), `unknown reserved ($-prefixed) property "${key}"`);
      }
    }
    if ("$deprecated" in node && !(typeof node.$deprecated === "boolean" || typeof node.$deprecated === "string")) {
      err(join(path, "$deprecated"), "$deprecated must be a boolean or a string message");
    }

    if ("$value" in node) {
      // A token. It must not also carry non-$ children ($value is the sole group-vs-token discriminator).
      const childKeys = Object.keys(node).filter((k) => !k.startsWith("$"));
      if (childKeys.length) err(path, `a token (has $value) must not also contain child members: ${childKeys.join(", ")}`);
      const t: TokenNode = { path, value: node.$value, type: effectiveType };
      tokens.push(t);
      byPath.set(path, t);
      return; // never recurse into a token
    }

    // A group. Recurse into non-$ children only — $extensions/$description/$type are never traversed
    // ($extensions is an opaque escape hatch; walking it would false-positive on its arbitrary contents).
    for (const [key, child] of Object.entries(node)) {
      if (key.startsWith("$")) continue;
      const childPath = join(path, key);
      if (/[.{}]/.test(key)) err(childPath, `token/group name "${key}" must not contain '.', '{' or '}'`);
      if (!isObject(child)) {
        err(childPath, `a group member must be a group or token (object), got ${typeName(child)}`);
        continue;
      }
      walk(child, childPath, effectiveType, depth + 1);
    }
  };
  walk(doc, "", undefined, 0);

  // Pass 2: validate each token's $value against its effective $type; resolve + type-check aliases.
  for (const tok of tokens) validateToken(tok, byPath, err);

  return { valid: errors.length === 0, errors, warnings, tokenCount: tokens.length };
}

function validateToken(tok: TokenNode, byPath: Map<string, TokenNode>, err: (p: string, m: string) => void): void {
  const { path, value, type } = tok;

  if (isAlias(value)) {
    const target = byPath.get(value.slice(1, -1));
    if (!target) { err(path, `alias ${value} does not resolve to a token`); return; }
    // Follow the chain to the first concrete token, detecting cycles.
    const seen = new Set([path]);
    let cur = target;
    while (isAlias(cur.value)) {
      if (seen.has(cur.path)) { err(path, `alias ${value} is part of a reference cycle`); return; }
      seen.add(cur.path);
      const next = byPath.get(cur.value.slice(1, -1));
      if (!next) { err(cur.path, `alias ${cur.value} does not resolve to a token`); return; }
      cur = next;
    }
    // An alias takes its type from its target; only a CONFLICTING explicit $type is an error (a redundant
    // matching $type re-declaration — as on color.text.* — is legal).
    if (type && cur.type && type !== cur.type) {
      err(path, `alias resolves to type "${cur.type}" but this token declares $type "${type}"`);
    }
    return;
  }

  if (!type) { err(path, "no $type is resolvable from this token or its ancestor groups"); return; }
  validateValueShape(path, type, value, err);
}

function validateValueShape(path: string, type: string, value: unknown, err: (p: string, m: string) => void): void {
  switch (type) {
    case "color":
      validateColor(path, value, err);
      return;
    case "dimension":
      validateMeasure(path, value, DIMENSION_UNITS, "dimension", err);
      return;
    case "duration":
      validateMeasure(path, value, DURATION_UNITS, "duration", err);
      return;
    case "number":
      if (typeof value !== "number") err(path, `number $value must be a number, got ${typeName(value)}`);
      return;
    case "fontFamily":
      if (typeof value === "string") { if (!value.trim()) err(path, "fontFamily string must be non-empty"); return; }
      if (Array.isArray(value)) {
        if (!value.length) err(path, "fontFamily array must be non-empty");
        else if (!value.every((v) => typeof v === "string")) err(path, "every fontFamily array element must be a string");
        return;
      }
      err(path, `fontFamily $value must be a string or a non-empty array of strings, got ${typeName(value)}`);
      return;
    case "fontWeight":
      if (typeof value === "number") { if (value < 1 || value > 1000) err(path, "fontWeight number must be within 1–1000"); return; }
      if (typeof value !== "string") err(path, `fontWeight $value must be a number (1–1000) or a keyword string, got ${typeName(value)}`);
      return;
    case "cubicBezier":
      if (!Array.isArray(value) || value.length !== 4 || !value.every((n) => typeof n === "number")) {
        err(path, "cubicBezier $value must be an array of 4 numbers");
        return;
      }
      if ((value[0] as number) < 0 || (value[0] as number) > 1 || (value[2] as number) < 0 || (value[2] as number) > 1) {
        err(path, "cubicBezier x-coordinates (indices 0 and 2) must be within [0,1]");
      }
      return;
    default:
      // Composite types (border, shadow, transition, gradient, typography, strokeStyle) — accepted
      // structurally; Norma uses none, so deep validation would be unreachable.
      return;
  }
}

function validateColor(path: string, value: unknown, err: (p: string, m: string) => void): void {
  if (typeof value === "string") {
    if (HEX.test(value) || OKLCH.test(value)) return;
    err(path, `invalid color ${JSON.stringify(value)} — expected a hex "#rrggbb" or a CSS oklch(L C H) string (Norma color profile)`);
    return;
  }
  // DTCG structured color object, accepted for forward-compat.
  if (isObject(value) && typeof value.colorSpace === "string" && Array.isArray(value.components)) return;
  err(path, `color $value must be a hex/oklch() string or a DTCG color object, got ${typeName(value)}`);
}

function validateMeasure(path: string, value: unknown, units: Set<string>, label: string, err: (p: string, m: string) => void): void {
  if (!isObject(value)) { err(path, `${label} $value must be an object { value, unit }, got ${typeName(value)}`); return; }
  if (typeof value.value !== "number") err(join(path, "$value.value"), `${label} .value must be a number`);
  if (typeof value.unit !== "string" || !units.has(value.unit)) {
    err(join(path, "$value.unit"), `${label} .unit must be one of ${[...units].join("/")}, got ${JSON.stringify(value.unit)}`);
  }
}

/**
 * Normalize a CSS color literal for exact-duplication comparison: lowercase, collapse whitespace, and
 * drop spaces around ( ) , / so `oklch( 0.58  0.16 252 )` and `oklch(0.58 0.16 252)` compare equal.
 */
export const normColor = (s: string): string =>
  s.toLowerCase().replace(/\s+/g, " ").replace(/\s*([(),/])\s*/g, "$1").trim();

/**
 * Reduce a DTCG color `$value` to a normalized CSS string for token-binding comparison. Handles Norma's own
 * hex/oklch STRING colors, and — for interop with DESIGN.md's `export --format dtcg` and other strict-DTCG
 * files — the structured color object `{ colorSpace, components, hex }`, via its `hex` fallback (preferred,
 * exact) or its sRGB components. Returns null for an alias (it references another token, not a raw value) or
 * a shape it can't reduce to a solid color (e.g. a non-sRGB object with no `hex`).
 */
function colorValueKey(value: unknown): string | null {
  if (typeof value === "string") return isAlias(value) ? null : normColor(value);
  if (isObject(value)) {
    if (typeof value.hex === "string") return normColor(value.hex);
    const comp = value.components;
    // Explicit index checks (not `.slice().every()`, which vacuously passes on a sparse array) so `as
    // number[]` is sound — components 0..2 must each be a real number.
    if (value.colorSpace === "srgb" && Array.isArray(comp) && [0, 1, 2].every((i) => typeof (comp as unknown[])[i] === "number")) {
      const c = comp as number[];
      const ch = (x: number): string => Math.round(Math.min(1, Math.max(0, x)) * 255).toString(16).padStart(2, "0");
      return normColor(`#${ch(c[0])}${ch(c[1])}${ch(c[2])}`);
    }
  }
  return null;
}

/**
 * Map each CONCRETE (non-alias) color token's normalized value → its dotted path, for the token-binding
 * check (which flags a raw CSS color that literally duplicates a defined token). Aliases are skipped —
 * they reference another token, not a raw value. Depth-capped for the same reason validateTokens is.
 */
export function colorTokenIndex(doc: unknown): Map<string, string> {
  const index = new Map<string, string>();
  if (!isObject(doc)) return index;
  const walk = (node: Record<string, unknown>, path: string[], inheritedType: string | undefined, depth: number): void => {
    if (depth > MAX_DEPTH) return;
    const type = typeof node.$type === "string" ? node.$type : inheritedType;
    if ("$value" in node) {
      if (type === "color") {
        const key = colorValueKey(node.$value);
        if (key && !index.has(key)) index.set(key, path.join("."));
      }
      return;
    }
    for (const [k, child] of Object.entries(node)) {
      if (k.startsWith("$")) continue;
      if (isObject(child)) walk(child, [...path, k], type, depth + 1);
    }
  };
  walk(doc, [], undefined, 0);
  return index;
}

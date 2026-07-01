import { parse as parseColor, wcagContrast } from "culori";

/** Recursively resolve `var(--x, fallback)` against a custom-property map. */
export function resolveVar(value: string, vars: Map<string, string>, depth = 0): string {
  if (depth > 10) return value;
  const m = value.match(/var\(\s*(--[\w-]+)\s*(?:,\s*([^()]*(?:\([^()]*\)[^()]*)*))?\)/);
  if (!m) return value;
  const replacement = vars.get(m[1]) ?? (m[2] != null ? m[2].trim() : undefined);
  if (replacement == null) return value;
  return resolveVar(value.replace(m[0], replacement), vars, depth + 1);
}

/** Parse a (possibly var-based) CSS color to a culori color, or null if not a solid color. */
export function toColor(value: string, vars: Map<string, string>) {
  const resolved = resolveVar(value.trim(), vars);
  // Skip gradients / images / keywords we can't treat as a flat color.
  if (/gradient|url\(|inherit|currentcolor|transparent/i.test(resolved)) return null;
  const c = parseColor(resolved);
  if (!c) return null;
  if (typeof c.alpha === "number" && c.alpha < 0.5) return null; // translucent: contrast is content-dependent
  return c;
}

/** WCAG contrast ratio between two CSS color values, or null if either is unresolvable. */
export function contrastRatio(a: string, b: string, vars: Map<string, string>): number | null {
  const ca = toColor(a, vars);
  const cb = toColor(b, vars);
  if (!ca || !cb) return null;
  const r = wcagContrast(ca, cb);
  return Number.isFinite(r) ? r : null;
}

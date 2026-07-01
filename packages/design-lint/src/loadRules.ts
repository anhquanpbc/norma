import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import type { Rule, Severity } from "./types.js";

function resolveRulesPath(explicit?: string): string {
  if (explicit) return explicit;
  if (process.env.NORMA_RULES) return process.env.NORMA_RULES;
  const here = dirname(fileURLToPath(import.meta.url));
  const bundled = join(here, "rules.json");
  if (existsSync(bundled)) return bundled;
  let dir = here;
  for (let i = 0; i < 8; i++) {
    const p = join(dir, "standard", "rules.json");
    if (existsSync(p)) return p;
    dir = dirname(dir);
  }
  throw new Error("Could not locate standard/rules.json (set NORMA_RULES).");
}

export interface LoadedCatalog { version: string; rules: Rule[]; }

export function loadRules(opts: { path?: string; overrides?: Record<string, Severity> } = {}): LoadedCatalog {
  const raw = JSON.parse(readFileSync(resolveRulesPath(opts.path), "utf8")) as LoadedCatalog;
  const rules = raw.rules.map((r) => {
    const sev = opts.overrides?.[r.id];
    return sev ? { ...r, severity: sev } : r;
  });
  return { version: raw.version, rules };
}

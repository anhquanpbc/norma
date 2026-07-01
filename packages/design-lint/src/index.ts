import { readFileSync } from "node:fs";
import { extname } from "node:path";
import type { Finding, FileType, Rule, Severity } from "./types.js";
import { loadRules } from "./loadRules.js";
import { buildContext } from "./parse.js";
import { lintContext } from "./engine.js";

export * from "./types.js";
export { loadRules } from "./loadRules.js";

export interface LintOptions {
  rulesPath?: string;
  overrides?: Record<string, Severity>;
  rules?: Rule[];
}
export interface LintResult {
  findings: Finding[];
  errorCount: number;
  warnCount: number;
  version: string;
  fileCount: number;
}

function typeOf(path: string): FileType | null {
  const ext = extname(path).toLowerCase();
  if (ext === ".html" || ext === ".htm") return "html";
  if (ext === ".css") return "css";
  return null;
}

/** Lint a set of HTML/CSS files against the Norma standard. */
export function lintFiles(paths: string[], opts: LintOptions = {}): LintResult {
  const catalog = opts.rules
    ? { version: "custom", rules: opts.rules }
    : loadRules({ path: opts.rulesPath, overrides: opts.overrides });
  const findings: Finding[] = [];
  let fileCount = 0;
  for (const path of paths) {
    const type = typeOf(path);
    if (!type) continue;
    fileCount++;
    const source = readFileSync(path, "utf8");
    const ctx = buildContext(path, source, type);
    findings.push(...lintContext(ctx, catalog.rules));
  }
  return {
    findings,
    errorCount: findings.filter((f) => f.severity === "error").length,
    warnCount: findings.filter((f) => f.severity === "warn").length,
    version: catalog.version,
    fileCount,
  };
}

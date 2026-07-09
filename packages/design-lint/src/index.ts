import { readFileSync } from "node:fs";
import { extname } from "node:path";
import type { Finding, FileType, Rule, Severity } from "./types.js";
import { loadRules } from "./loadRules.js";
import { buildContext } from "./parse.js";
import { lintContext } from "./engine.js";
import { validateTokens, colorTokenIndex } from "./tokens.js";

export * from "./types.js";
export { loadRules } from "./loadRules.js";
export { fixSource, type FixResult } from "./fix.js";
export { validateTokens, type TokenValidationResult, type TokenProblem } from "./tokens.js";

export interface LintOptions {
  rulesPath?: string;
  overrides?: Record<string, Severity>;
  rules?: Rule[];
  /** Path to a DTCG token file — enables the token-binding check (raw values that duplicate a token). */
  tokensPath?: string;
}
export interface LintResult {
  findings: Finding[];
  errorCount: number;
  warnCount: number;
  version: string;
  fileCount: number;
  /** Files that could not be read/parsed (unreadable, binary, malformed) — skipped, not fatal. */
  skipped: number;
}

function typeOf(path: string): FileType | null {
  const ext = extname(path).toLowerCase();
  if (ext === ".html" || ext === ".htm") return "html";
  if (ext === ".css") return "css";
  // .jsx/.tsx/.vue/.svelte are all component templates scanned the same lightweight way (the "jsx" strategy).
  if (ext === ".jsx" || ext === ".tsx" || ext === ".vue" || ext === ".svelte") return "jsx";
  return null;
}

/** Lint a set of HTML/CSS files against the Norma standard. */
export function lintFiles(paths: string[], opts: LintOptions = {}): LintResult {
  const catalog = opts.rules
    ? { version: "custom", rules: opts.rules }
    : loadRules({ path: opts.rulesPath, overrides: opts.overrides });
  // Optional token file → a color-value → token-path index the token-binding check consumes (loaded once).
  let tokenIndex: Map<string, string> | undefined;
  if (opts.tokensPath) {
    try {
      const doc: unknown = JSON.parse(readFileSync(opts.tokensPath, "utf8"));
      tokenIndex = colorTokenIndex(doc);
      const res = validateTokens(doc);
      if (!res.valid) {
        console.error(`Warning: token file ${opts.tokensPath} has ${res.errors.length} DTCG error(s) — run \`tokens validate\` to see them (token-binding uses its valid color tokens only).`);
      }
    } catch (e) {
      console.error(`Warning: cannot read/parse token file ${opts.tokensPath}: ${(e as Error).message} — token-binding disabled.`);
    }
  }
  const findings: Finding[] = [];
  let fileCount = 0;
  let skipped = 0;
  for (const path of paths) {
    const type = typeOf(path);
    if (!type) continue;
    // One unreadable/binary/malformed file must not abort the whole run — record it as skipped.
    try {
      const source = readFileSync(path, "utf8");
      const ctx = buildContext(path, source, type, tokenIndex);
      findings.push(...lintContext(ctx, catalog.rules));
      fileCount++;
    } catch (e) {
      skipped++;
      if (process.env.NORMA_DEBUG) console.error(`[norma] skipped ${path}: ${(e as Error).message}`);
    }
  }
  return {
    findings,
    errorCount: findings.filter((f) => f.severity === "error").length,
    warnCount: findings.filter((f) => f.severity === "warn").length,
    version: catalog.version,
    fileCount,
    skipped,
  };
}

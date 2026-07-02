#!/usr/bin/env node
import { readFileSync, existsSync, globSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { lintFiles } from "./index.js";
import { stylish, json, sarif, type Lang } from "./formatters.js";
import type { Severity } from "./types.js";

const HELP = `norma-design-lint — lint HTML/CSS against the Norma design standard

Usage:
  norma-design-lint [globs...] [options]

Options:
  --format <stylish|json|sarif>   output format (default: stylish)
  --lang <en|vi>                  message language (default: en, or NORMA_LANG)
  --config <path>                 config file (default: .normarc.json if present)
  --rules <path>                  rule catalog path (default: bundled standard/rules.json)
  --quiet                         only report errors
  -h, --help                      show this help

Exit code is non-zero when any error-severity finding is present.`;

interface Config { lang?: Lang; rules?: Record<string, Severity>; }

function expand(patterns: string[]): string[] {
  const files = new Set<string>();
  for (const p of patterns) {
    if (/[*?{[]/.test(p)) {
      try { for (const f of globSync(p)) files.add(f); } catch { /* ignore bad glob */ }
    } else if (existsSync(p)) {
      files.add(p);
    }
  }
  return [...files];
}

function main(argv: string[]): number {
  const args = argv.slice(2);
  if (args.includes("-h") || args.includes("--help")) { console.log(HELP); return 0; }

  const opt = (name: string): string | undefined => {
    const i = args.indexOf(name);
    return i >= 0 ? args[i + 1] : undefined;
  };
  const format = opt("--format") ?? "stylish";
  const configPath = opt("--config") ?? (existsSync(".normarc.json") ? ".normarc.json" : undefined);
  const config: Config = configPath && existsSync(configPath) ? JSON.parse(readFileSync(configPath, "utf8")) : {};
  const lang = (opt("--lang") ?? config.lang ?? process.env.NORMA_LANG ?? "en") as Lang;
  const quiet = args.includes("--quiet");

  const flagVals = new Set(["--format", "--lang", "--config", "--rules"]);
  const patterns = args.filter((a, i) => !a.startsWith("-") && !flagVals.has(args[i - 1]));
  const files = expand(patterns.length ? patterns : ["**/*.{html,htm,css}"]);

  if (!files.length) { console.error("No HTML/CSS files matched."); return 1; }

  let res = lintFiles(files, { rulesPath: opt("--rules"), overrides: config.rules });
  if (quiet) {
    res = { ...res, findings: res.findings.filter((f) => f.severity === "error"), warnCount: 0 };
  }

  if (format === "json") console.log(json(res));
  else if (format === "sarif") console.log(sarif(res));
  else console.log(stylish(res, lang));

  return res.errorCount > 0 ? 1 : 0;
}

export { main };

// Execute as a CLI only when invoked directly, so tests can import main() without exiting.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exit(main(process.argv));
}

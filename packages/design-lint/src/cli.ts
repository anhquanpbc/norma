#!/usr/bin/env node
import { readFileSync, existsSync, statSync, globSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { lintFiles, loadRules } from "./index.js";
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
  --max-warnings <n>              exit non-zero if warnings exceed n (default: unlimited)
  -h, --help                      show this help

Exit code is non-zero when any error-severity finding is present (or warnings exceed --max-warnings).`;

interface Config { lang?: Lang; rules?: Record<string, Severity>; }

// Never descend into vendored / build output — linting node_modules CSS the team can't fix
// (or, worse, silently linting a directory as zero files) is the #1 first-run footgun.
const EXCLUDE = (path: string): boolean =>
  /(^|[\\/])(node_modules|dist|build|coverage|\.git)([\\/]|$)/.test(path);

function expand(patterns: string[]): string[] {
  const files = new Set<string>();
  for (const p of patterns) {
    if (/[*?{[]/.test(p)) {
      try { for (const f of globSync(p, { exclude: EXCLUDE })) files.add(String(f)); } catch { /* ignore bad glob */ }
    } else if (existsSync(p)) {
      if (statSync(p).isDirectory()) {
        // A directory arg means "lint everything lintable under here" — expand it so the files
        // are actually inspected (a bare dir path is skipped by typeOf and would exit 0 = false green).
        try {
          for (const f of globSync("**/*.{html,htm,css}", { cwd: p, exclude: EXCLUDE })) files.add(join(p, String(f)));
        } catch { /* ignore */ }
      } else {
        files.add(p);
      }
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
  let config: Config = {};
  if (configPath && existsSync(configPath)) {
    try {
      config = JSON.parse(readFileSync(configPath, "utf8")) as Config;
    } catch (e) {
      console.error(`Invalid config ${configPath}: ${(e as Error).message}`);
      return 1;
    }
    for (const [id, sev] of Object.entries(config.rules ?? {})) {
      if (sev !== "error" && sev !== "warn" && sev !== "off") {
        console.error(`Invalid severity "${sev}" for rule ${id} in ${configPath} (use error|warn|off).`);
        return 1;
      }
    }
  }
  const lang = (opt("--lang") ?? config.lang ?? process.env.NORMA_LANG ?? "en") as Lang;
  const quiet = args.includes("--quiet");
  const maxWarningsRaw = opt("--max-warnings");
  const maxWarnings = maxWarningsRaw != null ? Number(maxWarningsRaw) : null;
  if (maxWarnings != null && !Number.isInteger(maxWarnings)) {
    console.error(`Invalid --max-warnings "${maxWarningsRaw}" — expected a non-negative integer.`);
    return 1;
  }
  const rulesPath = opt("--rules");

  // Warn (don't fail) on config overrides that name a rule id not in the catalog — a typo would
  // otherwise silently do nothing.
  if (config.rules && Object.keys(config.rules).length) {
    const known = new Set(loadRules({ path: rulesPath }).rules.map((r) => r.id));
    for (const id of Object.keys(config.rules)) {
      if (!known.has(id)) console.error(`Warning: unknown rule id "${id}" in ${configPath} — ignored.`);
    }
  }

  const flagVals = new Set(["--format", "--lang", "--config", "--rules", "--max-warnings"]);
  const patterns = args.filter((a, i) => !a.startsWith("-") && !flagVals.has(args[i - 1]));
  const files = expand(patterns.length ? patterns : ["**/*.{html,htm,css}"]);

  if (!files.length) { console.error("No HTML/CSS files matched."); return 1; }

  let res = lintFiles(files, { rulesPath, overrides: config.rules });
  if (quiet) {
    res = { ...res, findings: res.findings.filter((f) => f.severity === "error"), warnCount: 0 };
  }

  if (format === "json") console.log(json(res));
  else if (format === "sarif") console.log(sarif(res));
  else console.log(stylish(res, lang));

  const overWarnings = maxWarnings != null && res.warnCount > maxWarnings;
  if (overWarnings && format === "stylish") {
    console.error(lang === "vi"
      ? `✗ ${res.warnCount} cảnh báo vượt ngưỡng --max-warnings ${maxWarnings}.`
      : `✗ ${res.warnCount} warnings exceed the --max-warnings ${maxWarnings} threshold.`);
  }
  return res.errorCount > 0 || overWarnings ? 1 : 0;
}

export { main };

// Execute as a CLI only when invoked directly, so tests can import main() without exiting.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exit(main(process.argv));
}

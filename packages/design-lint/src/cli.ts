#!/usr/bin/env node
import { readFileSync, writeFileSync, existsSync, statSync, globSync } from "node:fs";
import { dirname, extname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { isMainModule } from "./is-main.js";
import { scaffold } from "./init.js";
import { lintFiles, loadRules, fixSource, validateTokens } from "./index.js";
import { fingerprints, splitByBaseline } from "./fingerprint.js";
import { stylish, json, sarif, markdown, type Lang } from "./formatters.js";
import type { Severity } from "./types.js";

const HELP = `norma-design-lint — lint HTML/CSS against the Norma design standard

Usage:
  norma-design-lint [globs...] [options]
  norma-design-lint tokens validate <file.json>

Options:
  --format <stylish|json|sarif|markdown>   output format (default: stylish; markdown → a GitHub Step Summary)
  --lang <en|vi>                  message language (default: en, or NORMA_LANG)
  --config <path>                 config file (default: .normarc.json if present)
  --rules <path>                  rule catalog path (default: bundled standard/rules.json)
  --tokens <path>                 DTCG token file → enable token-binding (flag raw values duplicating a token)
  --quiet                         only report errors
  --max-warnings <n>              exit non-zero if warnings exceed n (default: unlimited)
  --max-per-rule <n>              cap findings LISTED per rule in stylish/json (counts + exit stay true)
  --fix                           auto-fix the deterministic rules in place, then lint the rest
  --baseline <path>               suppress findings already in the baseline; fail only on NEW ones
  --update-baseline               (re)write the baseline from the current findings
                                  (path from --baseline <path>, else .norma-baseline.json)
  -h, --help                      show this help

Subcommands:
  tokens validate <file.json>     validate a DTCG token file (Norma profile: DTCG structure + oklch color)
  init [--force]                  scaffold .normarc.json + a CI workflow + AGENTS.md (skips existing files)

Exit code is non-zero when any error-severity finding is present (or warnings exceed --max-warnings).`;

interface Config { lang?: Lang; rules?: Record<string, Severity>; tokens?: string; }

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
          for (const f of globSync("**/*.{html,htm,css,jsx,tsx,vue,svelte}", { cwd: p, exclude: EXCLUDE })) files.add(join(p, String(f)));
        } catch { /* ignore */ }
      } else {
        files.add(p);
      }
    }
  }
  return [...files];
}

// `norma-design-lint tokens validate <file>` — validate a DTCG token file (Norma profile). Dispatched
// before the flat lint parser so `tokens`/`validate` are never mistaken for globs (which would expand to
// nothing and exit 0 = a silent false pass).
function runTokens(rest: string[]): number {
  const langI = rest.indexOf("--lang");
  const lang: Lang = (langI >= 0 ? rest[langI + 1] : process.env.NORMA_LANG) === "vi" ? "vi" : "en";
  const sub = rest[0];
  const file = rest.find((a, i) => !a.startsWith("-") && rest[i - 1] !== "--lang" && a !== sub);
  if (sub !== "validate" || !file) {
    console.error("Usage: norma-design-lint tokens validate <file.json>");
    return 1;
  }
  let doc: unknown;
  try {
    doc = JSON.parse(readFileSync(file, "utf8"));
  } catch (e) {
    console.error(`Cannot read/parse ${file}: ${(e as Error).message}`);
    return 1;
  }
  const res = validateTokens(doc);
  for (const w of res.warnings) console.log(`  warn  ${w.path}  ${w.message}`);
  if (res.valid) {
    console.log(lang === "vi"
      ? `✓ ${file}: ${res.tokenCount} token hợp lệ (DTCG, hồ sơ Norma).`
      : `✓ ${file}: ${res.tokenCount} tokens valid (DTCG, Norma profile).`);
    return 0;
  }
  console.log(`\n✗ ${file} — ${res.errors.length} problem(s):`);
  const pad = Math.min(44, Math.max(0, ...res.errors.map((e) => e.path.length)));
  for (const e of res.errors) console.log(`  ${e.path.padEnd(pad)}  ${e.message}`);
  return 1;
}

// `norma-design-lint init` — scaffold a project to adopt Norma: a .normarc.json, a CI workflow, and the
// vendor-neutral AGENTS.md rule file (copied from the bundled dist/agents). Non-interactive; existing files
// are skipped unless --force. Dispatched before the flat lint parser so `init` isn't mistaken for a glob.
function runInit(rest: string[]): number {
  const force = rest.includes("--force");
  const agentsDir = join(dirname(fileURLToPath(import.meta.url)), "..", "dist", "agents");
  const { written, skipped } = scaffold({ cwd: process.cwd(), agentsDir, force });
  for (const f of written) console.log(`  ✓ ${f}`);
  for (const f of skipped) console.log(`  • ${f} (exists — use --force to overwrite)`);
  console.log(written.length
    ? `\n✓ Scaffolded ${written.length} file(s). Commit them, then run \`npx norma-design-lint\`.`
    : `\nAll target files already exist — nothing written (use --force to overwrite).`);
  if (existsSync(agentsDir)) console.log(`  Rule files for other AI tools (Claude Code, Cursor, Copilot) are in ${agentsDir}`);
  return 0;
}

function main(argv: string[]): number {
  const args = argv.slice(2);
  // Options that consume the NEXT token as their value. A boolean-flag scan (--fix/--quiet/…) must skip
  // those value positions — else `--tokens --fix` (e.g. a forgotten token path) would read "--fix" as the
  // value AND fire the in-place fixer, a silent gate-bypass / file-mutation footgun.
  const flagVals = new Set(["--format", "--lang", "--config", "--rules", "--max-warnings", "--max-per-rule", "--baseline", "--tokens"]);
  const valueAt = new Set<number>();
  args.forEach((a, i) => { if (flagVals.has(a)) valueAt.add(i + 1); });
  const hasFlag = (name: string): boolean => args.some((a, i) => a === name && !valueAt.has(i));
  const opt = (name: string): string | undefined => {
    const i = args.indexOf(name);
    return i >= 0 && !valueAt.has(i) ? args[i + 1] : undefined;
  };

  if (hasFlag("-h") || hasFlag("--help")) { console.log(HELP); return 0; }
  if (args[0] === "tokens") return runTokens(args.slice(1));
  if (args[0] === "init") return runInit(args.slice(1));
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
  const quiet = hasFlag("--quiet");
  const maxWarningsRaw = opt("--max-warnings");
  const maxWarnings = maxWarningsRaw != null ? Number(maxWarningsRaw) : null;
  if (maxWarnings != null && (!Number.isInteger(maxWarnings) || maxWarnings < 0)) {
    console.error(`Invalid --max-warnings "${maxWarningsRaw}" — expected a non-negative integer.`);
    return 1;
  }
  const maxPerRuleRaw = opt("--max-per-rule");
  const maxPerRule = maxPerRuleRaw != null ? Number(maxPerRuleRaw) : null;
  if (maxPerRule != null && (!Number.isInteger(maxPerRule) || maxPerRule < 1)) {
    console.error(`Invalid --max-per-rule "${maxPerRuleRaw}" — expected a positive integer.`);
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

  const patterns = args.filter((a, i) => !a.startsWith("-") && !valueAt.has(i));
  const files = expand(patterns.length ? patterns : ["**/*.{html,htm,css,jsx,tsx,vue,svelte}"]);

  if (!files.length) { console.error("No HTML/CSS files matched."); return 1; }

  // --fix: apply the safe auto-fixes in place first, then lint what remains.
  if (hasFlag("--fix")) {
    let totalFixed = 0;
    for (const file of files) {
      const ext = extname(file).toLowerCase();
      const type = ext === ".html" || ext === ".htm" ? "html" : ext === ".css" ? "css" : null;
      if (!type) continue;
      try {
        const { output, fixed } = fixSource(readFileSync(file, "utf8"), type);
        if (fixed > 0) { writeFileSync(file, output); totalFixed += fixed; }
      } catch { /* skip unreadable/unwritable files, mirrors lintFiles resilience */ }
    }
    console.error(lang === "vi" ? `✓ Đã tự sửa ${totalFixed} vấn đề.` : `✓ Auto-fixed ${totalFixed} issue(s).`);
  }

  let res = lintFiles(files, { rulesPath, overrides: config.rules, tokensPath: opt("--tokens") ?? config.tokens });
  let suppressedCount = 0; // findings hidden by the baseline, surfaced in the markdown report
  let freshCount = res.findings.length; // baseline-fresh count, captured BEFORE --quiet can shrink res.findings

  // --baseline ratchet: snapshot or suppress known findings by fingerprint, so a team can adopt Norma on
  // an existing codebase and fail only on NEW design debt (not the whole legacy backlog on run one).
  const baselinePath = opt("--baseline") ?? ".norma-baseline.json";
  if (hasFlag("--update-baseline")) {
    const fps = [...new Set(fingerprints(res.findings))].sort();
    writeFileSync(baselinePath, JSON.stringify({ version: 1, fingerprints: fps }, null, 2) + "\n");
    console.error(lang === "vi"
      ? `✓ Đã ghi baseline ${fps.length} phát hiện vào ${baselinePath}.`
      : `✓ Wrote a baseline of ${fps.length} finding(s) to ${baselinePath}.`);
    return 0;
  }
  if (opt("--baseline")) {
    let base: Set<string>;
    try {
      const raw = JSON.parse(readFileSync(baselinePath, "utf8")) as { fingerprints?: string[] };
      base = new Set(Array.isArray(raw.fingerprints) ? raw.fingerprints : []);
    } catch (e) {
      console.error(`Cannot read baseline ${baselinePath}: ${(e as Error).message}`);
      return 1;
    }
    const { fresh, suppressed } = splitByBaseline(res.findings, base);
    suppressedCount = suppressed;
    freshCount = fresh.length;
    res = {
      ...res, findings: fresh,
      errorCount: fresh.filter((f) => f.severity === "error").length,
      warnCount: fresh.filter((f) => f.severity === "warn").length,
    };
    if (suppressed) console.error(lang === "vi"
      ? `(baseline: ẩn ${suppressed} phát hiện đã biết)`
      : `(baseline: ${suppressed} known finding(s) suppressed)`);
  }

  if (quiet) {
    res = { ...res, findings: res.findings.filter((f) => f.severity === "error"), warnCount: 0 };
  }

  // --max-per-rule only trims the per-finding formats; say so rather than silently no-op on the others.
  if (maxPerRule != null && (format === "sarif" || format === "markdown")) {
    console.error(`Note: --max-per-rule has no effect on --format ${format} (sarif stays complete for code scanning; markdown is already aggregated by rule).`);
  }

  if (format === "json") console.log(json(res, lang, maxPerRule));
  else if (format === "sarif") console.log(sarif(res, loadRules({ path: rulesPath, overrides: config.rules }).rules));
  else if (format === "markdown") console.log(markdown(res, loadRules({ path: rulesPath, overrides: config.rules }).rules, suppressedCount, freshCount));
  else console.log(stylish(res, lang, maxPerRule));

  const overWarnings = maxWarnings != null && res.warnCount > maxWarnings;
  if (overWarnings && format === "stylish") {
    console.error(lang === "vi"
      ? `✗ ${res.warnCount} cảnh báo vượt ngưỡng --max-warnings ${maxWarnings}.`
      : `✗ ${res.warnCount} warnings exceed the --max-warnings ${maxWarnings} threshold.`);
  }
  return res.errorCount > 0 || overWarnings ? 1 : 0;
}

export { main };

// Execute as a CLI only when this file is the entry point (incl. via a symlinked/shimmed bin —
// `npx norma-design-lint`), so tests can import main() without exiting. See isMainModule for why a
// raw URL compare is not enough.
if (isMainModule(import.meta.url)) {
  process.exit(main(process.argv));
}

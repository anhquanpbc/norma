import { relative } from "node:path";
import type { Finding, Rule } from "./types.js";
import type { LintResult } from "./index.js";
import { fingerprints } from "./fingerprint.js";

export type Lang = "en" | "vi";

/**
 * Cap the findings LISTED per ruleId to `max` (a global cap across all files, order preserved), so one rule
 * firing hundreds of times can't flood the per-finding output on a large repo. Only stylish/json list
 * findings, so only they cap; the true counts + exit code always come from the full set. Returns the kept
 * findings + how many were dropped.
 */
export function capByRule(findings: Finding[], max: number): { shown: Finding[]; hidden: number } {
  const count = new Map<string, number>();
  const shown: Finding[] = [];
  let hidden = 0;
  for (const f of findings) {
    const n = count.get(f.ruleId) ?? 0;
    if (n < max) { count.set(f.ruleId, n + 1); shown.push(f); }
    else hidden++;
  }
  return { shown, hidden };
}

/** Human-readable, grouped by file. `maxPerRule` caps how many findings each rule lists (counts stay true). */
export function stylish(res: LintResult, lang: Lang, maxPerRule?: number | null): string {
  const skip = res.skipped ? (lang === "vi" ? `, ${res.skipped} bỏ qua` : `, ${res.skipped} skipped`) : "";
  if (!res.findings.length) {
    return lang === "vi"
      ? `✓ Không có vi phạm (${res.fileCount} file${skip}, chuẩn v${res.version}).`
      : `✓ No violations (${res.fileCount} files${skip}, standard v${res.version}).`;
  }
  const { shown, hidden } = maxPerRule && maxPerRule > 0 ? capByRule(res.findings, maxPerRule) : { shown: res.findings, hidden: 0 };
  const byFile = new Map<string, Finding[]>();
  for (const f of shown) (byFile.get(f.file) ?? byFile.set(f.file, []).get(f.file)!).push(f);
  const lines: string[] = [];
  for (const [file, fs] of byFile) {
    lines.push("\n" + relative(process.cwd(), file));
    for (const f of fs) {
      const tag = f.severity === "error" ? "error" : "warn ";
      const msg = lang === "vi" ? f.message.vi : f.message.en;
      lines.push(`  ${String(f.line).padStart(4)}:  ${tag}  ${msg}  ${f.ruleId}`);
    }
  }
  const note = hidden
    ? "\n" + (lang === "vi"
        ? `  … ẩn ${hidden} phát hiện khác (--max-per-rule ${maxPerRule}); số liệu dưới là tổng thật`
        : `  … ${hidden} more finding(s) hidden (--max-per-rule ${maxPerRule}); the counts below are the true totals`)
    : "";
  const summary = lang === "vi"
    ? `\n✗ ${res.errorCount} lỗi, ${res.warnCount} cảnh báo${skip} (chuẩn v${res.version}).`
    : `\n✗ ${res.errorCount} errors, ${res.warnCount} warnings${skip} (standard v${res.version}).`;
  return lines.join("\n") + note + "\n" + summary;
}

/**
 * Machine-readable JSON. Slimmed for agents/large repos: `file` is repo-relative (forward-slashed), and
 * `message` is the single `lang` string (matching the MCP lint_source shape) instead of the `{en,vi}` object.
 * `maxPerRule` caps the listed findings per rule; `truncated` reports how many were hidden. The top-level
 * counts are always the true totals.
 */
export function json(res: LintResult, lang: Lang = "en", maxPerRule?: number | null): string {
  const { shown, hidden } = maxPerRule && maxPerRule > 0 ? capByRule(res.findings, maxPerRule) : { shown: res.findings, hidden: 0 };
  return JSON.stringify({
    version: res.version,
    errorCount: res.errorCount,
    warnCount: res.warnCount,
    fileCount: res.fileCount,
    skipped: res.skipped,
    findings: shown.map((f) => ({
      ruleId: f.ruleId,
      severity: f.severity,
      file: relative(process.cwd(), f.file).replace(/\\/g, "/"),
      line: f.line,
      ...(f.column != null ? { column: f.column } : {}),
      message: f.message[lang],
    })),
    truncated: hidden,
  }, null, 2);
}

/**
 * A stateless Markdown summary of a lint run — findings aggregated by domain, severity and rule, plus the
 * baseline delta — for a GitHub Step Summary or PR comment. Pass the rule catalog to resolve each finding's
 * domain (findings carry only a ruleId), exactly as sarif() does. NOT a dashboard or history store; the
 * cross-commit trend is delivered separately by SARIF → GitHub code scanning.
 */
// `newCount` is the baseline-fresh finding count; the caller passes it explicitly (defaulting to
// res.findings.length) so the "N new" delta stays on the same basis as `suppressed` even when a later
// filter like --quiet has since shrunk res.findings.
export function markdown(res: LintResult, rules: Rule[] = [], suppressed = 0, newCount = res.findings.length): string {
  const byId = new Map(rules.map((r) => [r.id, r]));
  const plural = (n: number, w: string): string => `${n} ${w}${n === 1 ? "" : "s"}`;
  const out: string[] = ["## Norma design lint", ""];

  if (!res.findings.length) {
    out.push(`✓ No violations — ${plural(res.fileCount, "file")}, standard v${res.version}.`);
    if (suppressed) out.push("", `_${plural(suppressed, "finding")} suppressed by baseline._`);
    return out.join("\n") + "\n";
  }

  out.push(`**${plural(res.errorCount, "error")} · ${plural(res.warnCount, "warning")}** across ${plural(res.fileCount, "file")} (standard v${res.version})`);
  if (suppressed) out.push("", `_${plural(newCount, "new finding")}, ${suppressed} suppressed by baseline._`);

  const byDomain = new Map<string, { error: number; warn: number }>();
  for (const f of res.findings) {
    const domain = byId.get(f.ruleId)?.domain ?? "other";
    const row = byDomain.get(domain) ?? { error: 0, warn: 0 };
    row[f.severity === "error" ? "error" : "warn"]++;
    byDomain.set(domain, row);
  }
  out.push("", "### By domain", "| Domain | Errors | Warnings |", "| --- | ---: | ---: |");
  for (const [domain, row] of [...byDomain].sort((a, b) => (b[1].error + b[1].warn) - (a[1].error + a[1].warn))) {
    out.push(`| ${domain} | ${row.error} | ${row.warn} |`);
  }

  const byRule = new Map<string, { severity: string; count: number }>();
  for (const f of res.findings) {
    const row = byRule.get(f.ruleId) ?? { severity: f.severity, count: 0 };
    row.count++;
    byRule.set(f.ruleId, row);
  }
  out.push("", "### By rule", "| Rule | Severity | Count |", "| --- | --- | ---: |");
  for (const [id, row] of [...byRule].sort((a, b) => b[1].count - a[1].count)) {
    out.push(`| \`${id}\` | ${row.severity} | ${row.count} |`);
  }
  return out.join("\n") + "\n";
}

const uri = (file: string): string => relative(process.cwd(), file).replace(/\\/g, "/");
const sarifLevel = (sev: string): "error" | "warning" | "note" =>
  sev === "error" ? "error" : sev === "warn" ? "warning" : "note";
// A WCAG success-criterion number (e.g. "1.4.3") from a rule's source citation, for a SARIF tag.
const wcagTag = (source: string): string | null => {
  const m = /\b(\d\.\d+\.\d+)\b/.exec(source);
  return m ? `WCAG-${m[1]}` : null;
};

/**
 * SARIF 2.1.0 for GitHub code scanning. Pass the rule catalog to enrich `tool.driver.rules` with names,
 * descriptions, `helpUri` (the primary source), level and SPEC/CONV + WCAG tags; each result carries a
 * line-independent `partialFingerprints` so alerts survive edits.
 */
export function sarif(res: LintResult, rules: Rule[] = []): string {
  const byId = new Map(rules.map((r) => [r.id, r]));
  const usedIds = [...new Set(res.findings.map((f) => f.ruleId))];
  const fps = fingerprints(res.findings);
  const doc = {
    version: "2.1.0",
    $schema: "https://json.schemastore.org/sarif-2.1.0.json",
    runs: [{
      tool: { driver: {
        name: "norma-design-lint",
        informationUri: "https://github.com/anhquanpbc/norma",
        version: res.version,
        rules: usedIds.map((id) => {
          const r = byId.get(id);
          if (!r) return { id };
          return {
            id,
            name: r.title.en,
            shortDescription: { text: r.title.en },
            fullDescription: { text: r.rationale.en },
            ...(r.source_url ? { helpUri: r.source_url } : {}),
            defaultConfiguration: { level: sarifLevel(r.severity) },
            properties: { tags: [r.tag, r.domain, wcagTag(r.source)].filter((t): t is string => !!t) },
          };
        }),
      } },
      results: res.findings.map((f, i) => ({
        ruleId: f.ruleId,
        level: sarifLevel(f.severity),
        message: { text: f.message.en },
        locations: [{ physicalLocation: {
          artifactLocation: { uri: uri(f.file) },
          region: { startLine: f.line, startColumn: f.column ?? 1 },
        } }],
        partialFingerprints: { "normaFingerprint/v1": fps[i] },
      })),
    }],
  };
  return JSON.stringify(doc, null, 2);
}

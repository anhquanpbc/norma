import { relative } from "node:path";
import type { Finding, Rule } from "./types.js";
import type { LintResult } from "./index.js";
import { fingerprints } from "./fingerprint.js";

export type Lang = "en" | "vi";

/** Human-readable, grouped by file. */
export function stylish(res: LintResult, lang: Lang): string {
  const skip = res.skipped ? (lang === "vi" ? `, ${res.skipped} bỏ qua` : `, ${res.skipped} skipped`) : "";
  if (!res.findings.length) {
    return lang === "vi"
      ? `✓ Không có vi phạm (${res.fileCount} file${skip}, chuẩn v${res.version}).`
      : `✓ No violations (${res.fileCount} files${skip}, standard v${res.version}).`;
  }
  const byFile = new Map<string, Finding[]>();
  for (const f of res.findings) (byFile.get(f.file) ?? byFile.set(f.file, []).get(f.file)!).push(f);
  const lines: string[] = [];
  for (const [file, fs] of byFile) {
    lines.push("\n" + relative(process.cwd(), file));
    for (const f of fs) {
      const tag = f.severity === "error" ? "error" : "warn ";
      const msg = lang === "vi" ? f.message.vi : f.message.en;
      lines.push(`  ${String(f.line).padStart(4)}:  ${tag}  ${msg}  ${f.ruleId}`);
    }
  }
  const summary = lang === "vi"
    ? `\n✗ ${res.errorCount} lỗi, ${res.warnCount} cảnh báo${skip} (chuẩn v${res.version}).`
    : `\n✗ ${res.errorCount} errors, ${res.warnCount} warnings${skip} (standard v${res.version}).`;
  return lines.join("\n") + "\n" + summary;
}

export function json(res: LintResult): string {
  return JSON.stringify(res, null, 2);
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

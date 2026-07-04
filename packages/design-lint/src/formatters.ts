import { relative } from "node:path";
import type { Finding } from "./types.js";
import type { LintResult } from "./index.js";

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

/** SARIF 2.1.0 for GitHub code scanning. */
export function sarif(res: LintResult): string {
  const ruleIds = [...new Set(res.findings.map((f) => f.ruleId))];
  const doc = {
    version: "2.1.0",
    $schema: "https://json.schemastore.org/sarif-2.1.0.json",
    runs: [{
      tool: { driver: {
        name: "norma-design-lint",
        informationUri: "https://github.com/anhquanpbc/norma",
        version: res.version,
        rules: ruleIds.map((id) => ({ id })),
      } },
      results: res.findings.map((f) => ({
        ruleId: f.ruleId,
        level: f.severity === "error" ? "error" : "warning",
        message: { text: f.message.en },
        locations: [{ physicalLocation: {
          artifactLocation: { uri: relative(process.cwd(), f.file) },
          region: { startLine: f.line, startColumn: f.column ?? 1 },
        } }],
      })),
    }],
  };
  return JSON.stringify(doc, null, 2);
}

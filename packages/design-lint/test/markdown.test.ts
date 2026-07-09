import { describe, it, expect } from "vitest";
import { markdown } from "../src/formatters.js";
import type { LintResult } from "../src/index.js";
import type { Finding, Rule } from "../src/types.js";

const F = (ruleId: string, severity: "error" | "warn"): Finding => ({
  ruleId, severity, file: "/x/a.html", line: 1, message: { en: "m", vi: "m" },
});
const R = (id: string, domain: string): Rule => ({
  id, domain, tag: "CONV", severity: "warn",
  title: { en: id, vi: id }, source: "", rationale: { en: "", vi: "" }, remediation: { en: "", vi: "" }, check: { type: "x" },
});
const res = (findings: Finding[]): LintResult => ({
  findings,
  errorCount: findings.filter((f) => f.severity === "error").length,
  warnCount: findings.filter((f) => f.severity === "warn").length,
  version: "1.9.0", fileCount: 2, skipped: 0,
});
const rules = [R("color.contrast.text", "color"), R("a11y.form-label", "a11y")];

describe("markdown report", () => {
  it("renders the no-violations branch with no tables", () => {
    const md = markdown(res([]), rules);
    expect(md).toContain("✓ No violations — 2 files, standard v1.9.0.");
    expect(md).not.toContain("### By domain");
  });

  it("aggregates by domain and by rule, sorted by count desc", () => {
    const md = markdown(res([F("color.contrast.text", "error"), F("a11y.form-label", "error"), F("a11y.form-label", "error")]), rules);
    expect(md).toContain("**3 errors · 0 warnings** across 2 files (standard v1.9.0)");
    expect(md).toMatch(/### By domain[\s\S]*\| a11y \| 2 \| 0 \|/);
    expect(md).toMatch(/### By rule[\s\S]*\| `a11y\.form-label` \| error \| 2 \|/);
    expect(md.indexOf("a11y.form-label")).toBeLessThan(md.indexOf("color.contrast.text")); // count 2 before count 1
  });

  it("shows the baseline delta when findings were suppressed", () => {
    const md = markdown(res([F("color.contrast.text", "error")]), rules, 4);
    expect(md).toContain("1 new finding, 4 suppressed by baseline");
  });

  it("uses the explicit new-count for the delta, not the (possibly --quiet-filtered) findings length", () => {
    // res.findings has been shrunk to 1 error, but 4 findings were fresh vs the baseline (pre-quiet).
    const md = markdown(res([F("color.contrast.text", "error")]), rules, 2, 4);
    expect(md).toContain("4 new findings, 2 suppressed by baseline");
  });

  it("labels an unknown rule's domain as `other`", () => {
    expect(markdown(res([F("unknown.rule", "warn")]), rules)).toMatch(/\| other \| 0 \| 1 \|/);
  });

  it("pluralizes counts", () => {
    expect(markdown(res([F("a11y.form-label", "warn")]), rules)).toContain("**0 errors · 1 warning**");
  });
});

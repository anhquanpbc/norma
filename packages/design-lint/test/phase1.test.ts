import { describe, it, expect } from "vitest";
import { fingerprints, splitByBaseline } from "../src/fingerprint.js";
import { sarif } from "../src/formatters.js";
import { callTool, type Catalog } from "../src/mcp.js";
import { loadRules } from "../src/loadRules.js";
import type { Finding } from "../src/types.js";
import type { LintResult } from "../src/index.js";

const F = (over: Partial<Finding> = {}): Finding => ({
  ruleId: "color.contrast.text",
  severity: "error",
  file: "/repo/index.html",
  line: 10,
  message: { en: "Contrast 2.85:1 for '.muted' is below 4.5:1.", vi: "…" },
  ...over,
});
const parse = (r: ReturnType<typeof callTool>) => JSON.parse(r.content[0].text as string);

describe("fingerprints (SARIF + baseline identity)", () => {
  it("is stable across line-number changes", () => {
    expect(fingerprints([F({ line: 10 })], "/repo")[0]).toBe(fingerprints([F({ line: 999 })], "/repo")[0]);
  });
  it("differs by rule, file, and message", () => {
    const base = fingerprints([F()], "/repo")[0];
    expect(fingerprints([F({ ruleId: "a11y.form-label" })], "/repo")[0]).not.toBe(base);
    expect(fingerprints([F({ file: "/repo/other.html" })], "/repo")[0]).not.toBe(base);
    expect(fingerprints([F({ message: { en: "different", vi: "x" } })], "/repo")[0]).not.toBe(base);
  });
  it("disambiguates two identical findings in one file", () => {
    const [a, b] = fingerprints([F(), F()], "/repo");
    expect(a).not.toBe(b);
  });
});

describe("splitByBaseline (ratchet)", () => {
  it("suppresses known findings and keeps new ones", () => {
    const known = F({ message: { en: "old debt", vi: "x" } });
    const fresh = F({ message: { en: "new debt", vi: "y" } });
    const baseline = new Set(fingerprints([known], "/repo"));
    const out = splitByBaseline([known, fresh], baseline, "/repo");
    expect(out.suppressed).toBe(1);
    expect(out.fresh).toHaveLength(1);
    expect(out.fresh[0].message.en).toBe("new debt");
  });
});

describe("sarif enrichment", () => {
  const { rules } = loadRules();
  const res: LintResult = { findings: [F()], errorCount: 1, warnCount: 0, version: "1.9.0", fileCount: 1, skipped: 0 };
  const doc = JSON.parse(sarif(res, rules));

  it("emits rule metadata: name, helpUri, level and SPEC/WCAG tags", () => {
    const rule = doc.runs[0].tool.driver.rules.find((r: { id: string }) => r.id === "color.contrast.text");
    expect(rule.name).toBeTruthy();
    expect(rule.helpUri).toContain("w3.org");
    expect(rule.defaultConfiguration.level).toBe("error");
    expect(rule.properties.tags).toContain("SPEC");
    expect(rule.properties.tags.some((t: string) => t.startsWith("WCAG-"))).toBe(true);
  });
  it("attaches a line-independent partialFingerprint to each result", () => {
    expect(doc.runs[0].results[0].partialFingerprints["normaFingerprint/v1"]).toMatch(/^[0-9a-f]{16}$/);
  });
  it("forward-slashes artifact URIs", () => {
    expect(doc.runs[0].results[0].locations[0].physicalLocation.artifactLocation.uri).not.toContain("\\");
  });
});

describe("mcp fix_source", () => {
  const catalog = loadRules() as Catalog;
  it("fixes a physical CSS property and reports the edit count", () => {
    const out = parse(callTool("fix_source", { source: ".x{ margin-left: 4px }", type: "css" }, catalog));
    expect(out.fixed).toBe(1);
    expect(out.output).toContain("margin-inline-start");
  });
  it("adds rel=noopener to an external target=_blank link", () => {
    const out = parse(callTool("fix_source", { source: `<a href="https://x.com" target="_blank">x</a>`, type: "html" }, catalog));
    expect(out.fixed).toBe(1);
    expect(out.output).toContain("noopener");
  });
  it("rejects an unsupported type", () => {
    const r = callTool("fix_source", { source: "x", type: "jsx" }, catalog);
    expect(r.isError).toBe(true);
  });
});

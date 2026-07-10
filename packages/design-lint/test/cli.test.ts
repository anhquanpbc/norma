import { describe, it, expect, vi } from "vitest";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { mkdtempSync, writeFileSync, readFileSync, existsSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { main } from "../src/cli.js";

const fx = (n: string) => join(dirname(fileURLToPath(import.meta.url)), "fixtures", n);

function run(args: string[]) {
  const out: string[] = [];
  const err: string[] = [];
  const logSpy = vi.spyOn(console, "log").mockImplementation((...a) => { out.push(a.join(" ")); });
  const errSpy = vi.spyOn(console, "error").mockImplementation((...a) => { err.push(a.join(" ")); });
  try {
    const code = main(["node", "cli", ...args]);
    return { code, out: out.join("\n"), err: err.join("\n") };
  } finally {
    logSpy.mockRestore();
    errSpy.mockRestore();
  }
}

describe("cli", () => {
  it("--help prints usage and exits 0", () => {
    const { code, out } = run(["--help"]);
    expect(code).toBe(0);
    expect(out).toContain("norma-design-lint");
  });

  it("exits 1 on a file with an error-severity finding", () => {
    const { code } = run([fx("bad.html")]);
    expect(code).toBe(1);
  });

  it("exits 0 on a clean file", () => {
    const { code } = run([fx("good.html")]);
    expect(code).toBe(0);
  });

  it("emits parseable JSON with --format json", () => {
    const { out } = run(["--format", "json", fx("bad.html")]);
    const parsed = JSON.parse(out);
    expect(parsed.errorCount).toBeGreaterThan(0);
  });

  it("emits parseable SARIF with --format sarif", () => {
    const { out } = run(["--format", "sarif", fx("bad.html")]);
    expect(JSON.parse(out).version).toBe("2.1.0");
  });

  it("--quiet drops warnings from the result", () => {
    const { out } = run(["--format", "json", "--quiet", fx("bad.html")]);
    expect(JSON.parse(out).warnCount).toBe(0);
  });

  it("returns 1 and reports when no files match", () => {
    const { code, err } = run(["definitely-nonexistent-xyz.html"]);
    expect(code).toBe(1);
    expect(err).toContain("No HTML/CSS files matched");
  });

  it("reports warnings without --quiet", () => {
    const { out } = run(["--format", "json", fx("bad.html")]);
    expect(JSON.parse(out).warnCount).toBeGreaterThan(0);
  });

  it("applies a --config severity override (error → warn drops the exit code)", () => {
    const { code } = run(["--config", fx("downgrade.normarc.json"), fx("bad.html")]);
    expect(code).toBe(0);
  });

  it("fails with a friendly message on invalid config JSON", () => {
    const { code, err } = run(["--config", fx("broken.normarc.json"), fx("good.html")]);
    expect(code).toBe(1);
    expect(err).toContain("Invalid config");
  });

  it("rejects an invalid override severity", () => {
    const { code, err } = run(["--config", fx("badsev.normarc.json"), fx("good.html")]);
    expect(code).toBe(1);
    expect(err).toContain("Invalid severity");
  });

  it("emits Vietnamese messages with --lang vi", () => {
    const { out } = run(["--lang", "vi", fx("bad.html")]);
    expect(out).toContain("lỗi"); // the VI stylish summary: "✗ N lỗi, M cảnh báo"
  });

  it("loads a custom catalog via --rules", () => {
    const { code } = run(["--rules", fx("only-semantic.rules.json"), fx("bad.html")]);
    expect(code).toBe(1);
  });

  it("lints files inside a directory argument (recursively), not just explicit files", () => {
    // tree/ = page.html (clean) + nested/bad.html (<div onclick>) + node_modules/vendor.css (excluded)
    const { out } = run(["--format", "json", fx("tree")]);
    const parsed = JSON.parse(out);
    expect(parsed.fileCount).toBe(2); // page.html + nested/bad.html — node_modules skipped
    expect(parsed.errorCount).toBeGreaterThan(0); // the nested <div onclick> is caught
  });

  it("excludes node_modules when a glob would otherwise match it", () => {
    // tree/**/*.css matches only node_modules/vendor.css, which must be excluded → nothing to lint
    const { code, err } = run([join(fx("tree"), "**", "*.css")]);
    expect(code).toBe(1);
    expect(err).toContain("No HTML/CSS files matched");
  });

  it("--max-warnings 0 fails a warnings-only file (exit 1)", () => {
    const { code } = run(["--max-warnings", "0", fx("warns.html")]);
    expect(code).toBe(1);
  });

  it("--max-warnings above the count passes a warnings-only file (exit 0)", () => {
    const { code } = run(["--max-warnings", "5", fx("warns.html")]);
    expect(code).toBe(0);
  });

  it("rejects a non-integer --max-warnings", () => {
    const { code, err } = run(["--max-warnings", "abc", fx("warns.html")]);
    expect(code).toBe(1);
    expect(err).toContain("Invalid --max-warnings");
  });

  it("warns (not fails) on an unknown rule id in the config", () => {
    const { err } = run(["--config", fx("unknownid.normarc.json"), fx("good.html")]);
    expect(err).toContain("unknown rule id");
    expect(err).toContain("a11y.nonexistent-rule");
  });

  it("reports skipped=0 for a normal file", () => {
    const { out } = run(["--format", "json", fx("good.html")]);
    expect(JSON.parse(out).skipped).toBe(0);
  });
});

// The baseline ratchet and --fix mutate the user's disk — the highest-risk CLI paths, previously untested.
describe("cli — baseline + --fix lifecycle (real file IO)", () => {
  it("--update-baseline writes a baseline, then --baseline suppresses those findings (exit 0)", () => {
    const dir = mkdtempSync(join(tmpdir(), "norma-cli-"));
    const bp = join(dir, "base.json");
    try {
      const w = run(["--update-baseline", "--baseline", bp, fx("bad.html")]);
      expect(w.code).toBe(0);
      expect(existsSync(bp)).toBe(true);
      const base = JSON.parse(readFileSync(bp, "utf8"));
      expect(base.fingerprints.length).toBeGreaterThan(0);
      // Re-lint the same file against its own baseline → every known finding is suppressed → exit 0.
      const b = run(["--baseline", bp, fx("bad.html")]);
      expect(b.code).toBe(0);
      expect(b.err).toContain("suppressed");
    } finally { rmSync(dir, { recursive: true, force: true }); }
  });

  it("an empty baseline lets a real error-severity finding through (exit 1)", () => {
    const dir = mkdtempSync(join(tmpdir(), "norma-cli-"));
    const bp = join(dir, "empty.json");
    try {
      writeFileSync(bp, JSON.stringify({ version: 1, fingerprints: [] }));
      const r = run(["--baseline", bp, fx("bad.html")]);
      expect(r.code).toBe(1); // bad.html has error-severity findings; none are in the baseline
    } finally { rmSync(dir, { recursive: true, force: true }); }
  });

  it("fails with a clear message on an unreadable baseline file", () => {
    const dir = mkdtempSync(join(tmpdir(), "norma-cli-"));
    try {
      const r = run(["--baseline", join(dir, "nope.json"), fx("bad.html")]);
      expect(r.code).toBe(1);
      expect(r.err).toMatch(/Cannot read baseline/i);
    } finally { rmSync(dir, { recursive: true, force: true }); }
  });

  it("--fix rewrites files in place (physical→logical, positive tabindex→0) and reports the count", () => {
    const dir = mkdtempSync(join(tmpdir(), "norma-cli-"));
    const css = join(dir, "x.css");
    const html = join(dir, "y.html");
    try {
      writeFileSync(css, ".a{ margin-left:8px }");
      writeFileSync(html, `<a href="/x" tabindex="3">go</a>`);
      const r = run(["--fix", css, html]);
      expect(r.err).toContain("Auto-fixed");
      expect(readFileSync(css, "utf8")).toContain("margin-inline-start:8px");
      expect(readFileSync(html, "utf8")).toContain(`tabindex="0"`);
    } finally { rmSync(dir, { recursive: true, force: true }); }
  });
});

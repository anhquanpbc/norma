import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { lintFiles } from "../src/index.js";

const fx = (n: string) => join(dirname(fileURLToPath(import.meta.url)), "fixtures", n);
let dir: string;
beforeEach(() => { dir = mkdtempSync(join(tmpdir(), "norma-lf-")); });
afterEach(() => { rmSync(dir, { recursive: true, force: true }); vi.restoreAllMocks(); }); // restore even if an assertion threw

describe("lintFiles — resilience at the IO boundary", () => {
  it("warns but keeps linting when the token file is unreadable / not JSON (token-binding disabled)", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const res = lintFiles([fx("bad.html")], { tokensPath: join(dir, "does-not-exist.json") });
    expect(res.findings.length).toBeGreaterThan(0); // linting proceeded despite the bad token file
    expect(spy.mock.calls.flat().join(" ")).toMatch(/token file .* token-binding disabled|cannot read/i);
    spy.mockRestore();
  });

  it("warns but keeps linting when the token file is valid JSON but invalid DTCG", () => {
    const bad = join(dir, "bad-tokens.json");
    writeFileSync(bad, JSON.stringify({ space: { x: { $type: "dimension", $value: "abc" } } })); // "abc" is not a dimension
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const res = lintFiles([fx("bad.html")], { tokensPath: bad });
    expect(res.findings.length).toBeGreaterThan(0);
    expect(spy.mock.calls.flat().join(" ")).toMatch(/DTCG error/i);
    spy.mockRestore();
  });

  it("skips an unreadable file (counts it, does not abort) and lints the good ones", () => {
    const res = lintFiles([join(dir, "ghost.html"), fx("bad.html")]);
    expect(res.skipped).toBe(1);   // ghost.html doesn't exist → readFileSync throws → skipped, not fatal
    expect(res.fileCount).toBe(1); // bad.html still linted
    expect(res.findings.length).toBeGreaterThan(0);
  });

  it("emits a debug line for a skipped file when NORMA_DEBUG is set", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const prev = process.env.NORMA_DEBUG;
    process.env.NORMA_DEBUG = "1";
    try {
      lintFiles([join(dir, "ghost.html")]);
      expect(spy.mock.calls.flat().join(" ")).toMatch(/\[norma\] skipped/);
    } finally {
      if (prev === undefined) delete process.env.NORMA_DEBUG; else process.env.NORMA_DEBUG = prev;
      spy.mockRestore();
    }
  });

  it("ignores a non-lintable extension without counting it as skipped", () => {
    writeFileSync(join(dir, "readme.md"), "# hi");
    const res = lintFiles([join(dir, "readme.md")]);
    expect(res.skipped).toBe(0);   // typeOf(.md) === null → `continue`, distinct from a read failure
    expect(res.fileCount).toBe(0);
  });
});

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { scaffold } from "../src/init.js";

let cwd: string;
let agentsDir: string;

beforeEach(() => {
  cwd = mkdtempSync(join(tmpdir(), "norma-init-cwd-"));
  agentsDir = mkdtempSync(join(tmpdir(), "norma-init-agents-"));
  writeFileSync(join(agentsDir, "AGENTS.md"), "# Norma AGENTS (fixture)\n");
});
afterEach(() => {
  rmSync(cwd, { recursive: true, force: true });
  rmSync(agentsDir, { recursive: true, force: true });
});

describe("scaffold (norma init)", () => {
  it("writes the config, CI workflow, and AGENTS.md into a fresh project", () => {
    const { written, skipped } = scaffold({ cwd, agentsDir, force: false });
    expect(written).toEqual([".normarc.json", ".github/workflows/design-lint.yml", "AGENTS.md"]);
    expect(skipped).toEqual([]);
    expect(existsSync(join(cwd, ".github/workflows/design-lint.yml"))).toBe(true);
    // the CI recipe must lint component templates too, matching the CLI's own default glob — not a
    // narrower html/css-only set that would be a false green for React/Vue/Svelte apps.
    expect(readFileSync(join(cwd, ".github/workflows/design-lint.yml"), "utf8")).toContain("jsx,tsx,vue,svelte");
    // .normarc.json is valid JSON with the expected default
    expect(JSON.parse(readFileSync(join(cwd, ".normarc.json"), "utf8"))).toEqual({ lang: "en" });
    // AGENTS.md is copied from the bundled agents dir, byte-for-byte
    expect(readFileSync(join(cwd, "AGENTS.md"), "utf8")).toBe(readFileSync(join(agentsDir, "AGENTS.md"), "utf8"));
  });

  it("is idempotent — a second run skips every existing file and writes nothing", () => {
    scaffold({ cwd, agentsDir, force: false });
    const { written, skipped } = scaffold({ cwd, agentsDir, force: false });
    expect(written).toEqual([]);
    expect(skipped).toEqual([".normarc.json", ".github/workflows/design-lint.yml", "AGENTS.md"]);
  });

  it("skips a single pre-existing file but writes the rest", () => {
    writeFileSync(join(cwd, ".normarc.json"), '{"lang":"vi"}\n');
    const { written, skipped } = scaffold({ cwd, agentsDir, force: false });
    expect(skipped).toEqual([".normarc.json"]);
    expect(written).toEqual([".github/workflows/design-lint.yml", "AGENTS.md"]);
    // the user's existing config is NOT clobbered
    expect(JSON.parse(readFileSync(join(cwd, ".normarc.json"), "utf8"))).toEqual({ lang: "vi" });
  });

  it("--force overwrites existing files", () => {
    writeFileSync(join(cwd, ".normarc.json"), '{"lang":"vi"}\n');
    const { written, skipped } = scaffold({ cwd, agentsDir, force: true });
    expect(skipped).toEqual([]);
    expect(written).toContain(".normarc.json");
    expect(JSON.parse(readFileSync(join(cwd, ".normarc.json"), "utf8"))).toEqual({ lang: "en" });
  });

  it("skips AGENTS.md when the bundled source is missing (no crash)", () => {
    rmSync(join(agentsDir, "AGENTS.md"));
    const { written } = scaffold({ cwd, agentsDir, force: false });
    expect(written).toEqual([".normarc.json", ".github/workflows/design-lint.yml"]);
    expect(existsSync(join(cwd, "AGENTS.md"))).toBe(false);
  });
});

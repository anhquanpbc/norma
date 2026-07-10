import { describe, it, expect } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { AGENT_FILES } from "../agent-files.mjs";

const pkg = join(dirname(fileURLToPath(import.meta.url)), ".."); // packages/design-lint
const repo = join(pkg, "..", "..");

describe("bundled agent files manifest", () => {
  it("bundles the 6 tool-facing agent surfaces and not CLAUDE.md (repo-specific)", () => {
    expect(AGENT_FILES).toHaveLength(6);
    expect(AGENT_FILES.some((f) => f.src.endsWith("CLAUDE.md"))).toBe(false);
  });

  it("every source exists in the repo; dest names are unique; each has a target + tool", () => {
    const dests = new Set<string>();
    for (const f of AGENT_FILES) {
      expect(existsSync(join(repo, f.src)), `source ${f.src} is missing`).toBe(true);
      expect(Boolean(f.target && f.tool), `${f.dest} needs a target + tool`).toBe(true);
      expect(dests.has(f.dest), `duplicate dest ${f.dest}`).toBe(false);
      dests.add(f.dest);
    }
  });

  it("after a build, each file is bundled into dist/agents and byte-matches the repo source", () => {
    const agentsDir = join(pkg, "dist", "agents");
    if (!existsSync(agentsDir)) return; // dist not built in this run — CI builds before `npm test`
    for (const f of AGENT_FILES) {
      const bundled = join(agentsDir, f.dest);
      expect(existsSync(bundled), `${f.dest} not bundled`).toBe(true);
      expect(readFileSync(bundled, "utf8")).toBe(readFileSync(join(repo, f.src), "utf8"));
    }
  });
});

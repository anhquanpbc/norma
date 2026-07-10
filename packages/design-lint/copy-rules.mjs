// Bundle the compiled rule catalog + the generated agent rule files into dist/ so the published CLI is
// self-contained and adopters can copy the agent files out of node_modules without cloning the repo.
import { copyFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { AGENT_FILES } from "./agent-files.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const repo = join(here, "..", "..");
mkdirSync(join(here, "dist"), { recursive: true });

copyFileSync(join(repo, "standard", "rules.json"), join(here, "dist", "rules.json"));
console.log("✓ bundled standard/rules.json → dist/rules.json");

const agentsDir = join(here, "dist", "agents");
mkdirSync(agentsDir, { recursive: true });
// copyFileSync throws if a source is missing, so a stale manifest path fails the build loudly.
for (const { src, dest } of AGENT_FILES) copyFileSync(join(repo, src), join(agentsDir, dest));
console.log(`✓ bundled ${AGENT_FILES.length} agent rule files → dist/agents/`);

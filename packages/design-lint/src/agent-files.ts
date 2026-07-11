// The generated AI-agent rule files that ship inside the npm package (under dist/agents/), so an adopter
// can `npm i norma-design-lint` and drop the file for their tool without cloning the repo. `src` is
// repo-root-relative (bundled by copy-rules.mjs → dist/agents/<dest>); `target` is where an adopter drops
// it; `tool` labels it; `agent` groups it for `norma-design-lint init --agent <agent>`.
// CLAUDE.md is intentionally NOT here — it's this repo's own project memory, not an adopter template.
export type Agent = "agents" | "claude" | "cursor" | "copilot";

export interface AgentFile {
  /** Repo-root-relative source, bundled into dist/agents/<dest> at build time. */
  src: string;
  /** Flattened filename under dist/agents/. */
  dest: string;
  /** Where an adopter installs it in their own project (used by `init --agent`). */
  target: string;
  /** Human label. */
  tool: string;
  /** Grouping key for `init --agent <agent>`. */
  agent: Agent;
}

export const AGENT_FILES: AgentFile[] = [
  { src: "AGENTS.md", dest: "AGENTS.md", target: "AGENTS.md", tool: "AGENTS.md tools (Codex, Cline, Gemini, …)", agent: "agents" },
  { src: ".claude/agents/design-guardian.md", dest: "design-guardian.md", target: ".claude/agents/design-guardian.md", tool: "Claude Code", agent: "claude" },
  { src: ".cursor/rules/norma-design.mdc", dest: "norma-design.mdc", target: ".cursor/rules/norma-design.mdc", tool: "Cursor", agent: "cursor" },
  { src: ".github/copilot-instructions.md", dest: "copilot-instructions.md", target: ".github/copilot-instructions.md", tool: "GitHub Copilot", agent: "copilot" },
  { src: ".github/instructions/css.instructions.md", dest: "css.instructions.md", target: ".github/instructions/css.instructions.md", tool: "GitHub Copilot (CSS-scoped)", agent: "copilot" },
  { src: ".github/instructions/html.instructions.md", dest: "html.instructions.md", target: ".github/instructions/html.instructions.md", tool: "GitHub Copilot (HTML-scoped)", agent: "copilot" },
];

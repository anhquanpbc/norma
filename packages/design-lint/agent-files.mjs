// The generated AI-agent rule files that ship inside the npm package (under dist/agents/), so an adopter
// can `npm i norma-design-lint` and copy the file for their tool without cloning the repo. `src` is
// repo-root-relative (bundled by copy-rules.mjs); `target` is where an adopter drops it; `tool` labels it.
// CLAUDE.md is intentionally NOT here — it's this repo's own project memory, not an adopter template.
export const AGENT_FILES = [
  { src: "AGENTS.md", dest: "AGENTS.md", target: "AGENTS.md", tool: "AGENTS.md tools (Codex, Cline, Gemini, …)" },
  { src: ".claude/agents/design-guardian.md", dest: "design-guardian.md", target: ".claude/agents/design-guardian.md", tool: "Claude Code" },
  { src: ".cursor/rules/norma-design.mdc", dest: "norma-design.mdc", target: ".cursor/rules/norma-design.mdc", tool: "Cursor" },
  { src: ".github/copilot-instructions.md", dest: "copilot-instructions.md", target: ".github/copilot-instructions.md", tool: "GitHub Copilot" },
  { src: ".github/instructions/css.instructions.md", dest: "css.instructions.md", target: ".github/instructions/css.instructions.md", tool: "GitHub Copilot (CSS-scoped)" },
  { src: ".github/instructions/html.instructions.md", dest: "html.instructions.md", target: ".github/instructions/html.instructions.md", tool: "GitHub Copilot (HTML-scoped)" },
];

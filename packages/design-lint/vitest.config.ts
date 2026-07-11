import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    coverage: {
      provider: "v8",
      include: ["src/**/*.ts"],
      // Type-only files carry no executable lines.
      exclude: ["src/culori.d.ts", "src/types.ts"],
      reporter: ["text-summary"],
      // Thresholds are a ratchet: raise them as coverage grows; CI fails if it drops below.
      thresholds: {
        lines: 80, functions: 80, branches: 80, statements: 80,
        // Per-file floors for the IO / orchestration modules the global aggregate would otherwise mask
        // (the checks/ modules near 100% inflate the average). Set just under current coverage — a per-module ratchet.
        "**/index.ts": { statements: 90, branches: 85, functions: 90, lines: 95 },
        "**/mcp.ts": { statements: 80, branches: 75, functions: 80, lines: 85 },
        "**/cli.ts": { statements: 70, branches: 68, functions: 65, lines: 72 },
      },
    },
  },
});

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
      thresholds: { lines: 80, functions: 80, branches: 80, statements: 80 },
    },
  },
});

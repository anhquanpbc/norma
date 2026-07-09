// An ESLint plugin (flat config) that runs Norma's component-level design tells on JSX/TSX (and Vue/Svelte
// when linted with the matching ESLint parser) — the indigo-default colour tell and the <div onClick>
// non-semantic-control tell — inside a team's existing ESLint run. It uses ESLint's OWN source text (no
// re-parse) and the exact engine the CLI uses on component files.
//
// Coverage is deliberately narrow: only the two tells that transfer WITHOUT a rendered DOM. Structural a11y
// that needs the DOM (landmarks, labels, contrast, heading order) is NOT evaluated here — a component isn't
// a page. Lint your built HTML with the CLI, and your CSS with `norma-design-lint/stylelint`, for the rest.
//
// Config (flat):  import norma from "norma-design-lint/eslint";
//                 export default [{ files: ["**/*.{jsx,tsx}"], plugins: { norma },
//                                   rules: { "norma/design": "error" } }];
//
// This module is a passive plugin object ESLint consumes; it imports nothing from "eslint" at runtime
// (only the type), so it never adds a runtime dependency for CLI/MCP users.
import type { Rule } from "eslint";
import { buildContext } from "./parse.js";
import { lintContext } from "./engine.js";
import { loadRules } from "./loadRules.js";
import type { Severity } from "./types.js";

interface NormaOptions {
  /** Message language (default: en). */
  lang?: "en" | "vi";
  /** Per-rule severity overrides, e.g. { "antipattern.indigo-default": "off" } — mirrors .normarc's rules. */
  rules?: Record<string, Severity>;
}

const design: Rule.RuleModule = {
  meta: {
    type: "problem",
    docs: {
      description:
        "Flag Norma component-level design tells (the indigo default and non-semantic <div> click targets) in JSX/TSX.",
      url: "https://github.com/anhquanpbc/norma/tree/main/packages/design-lint",
    },
    messages: { finding: "{{message}} ({{ruleId}})" },
    schema: [
      {
        type: "object",
        properties: {
          lang: { enum: ["en", "vi"] },
          rules: { type: "object", additionalProperties: { enum: ["error", "warn", "off"] } },
        },
        additionalProperties: false,
      },
    ],
  },
  create(context) {
    const opts = (context.options[0] ?? {}) as NormaOptions;
    const lang: "en" | "vi" = opts.lang === "vi" ? "vi" : "en";
    const { rules } = loadRules(opts.rules ? { overrides: opts.rules } : {});
    return {
      // Run once over the whole file. Only the JSX-aware checks (indigo-default, semantic-control) fire on a
      // "jsx" context — every DOM/CSS check guards on ctx.dom/ctx.css and no-ops — so we pass all rules and
      // let the engine filter, exactly as the CLI does on .jsx/.tsx/.vue/.svelte files.
      Program(): void {
        const ctx = buildContext(context.filename, context.sourceCode.getText(), "jsx");
        for (const finding of lintContext(ctx, rules)) {
          context.report({
            loc: { line: finding.line, column: Math.max(0, (finding.column ?? 1) - 1) },
            messageId: "finding",
            data: {
              message: lang === "vi" ? finding.message.vi : finding.message.en,
              ruleId: finding.ruleId,
            },
          });
        }
      },
    };
  },
};

const plugin = {
  meta: { name: "norma-design-lint/eslint" },
  rules: { design },
};

export default plugin;

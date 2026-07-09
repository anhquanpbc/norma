// A Stylelint plugin that runs Norma's CSS-family checks inside a team's existing Stylelint pipeline,
// so adopting the standard costs one config line instead of a separate CI tool. It reuses the exact
// engine the CLI uses — it lints Stylelint's ALREADY-PARSED stylesheet root (so it works with any syntax
// Stylelint parses: plain CSS, and SCSS/Less via `customSyntax`), runs lintContext filtered to the
// CSS-surface checks (SURFACE_BY_CHECK), and maps each Norma Finding onto a Stylelint warning.
//
// Config:  { plugins: ["norma-design-lint/stylelint"], rules: { "norma/design": true } }
import stylelint from "stylelint";
import type { Rule } from "stylelint";
import type { Node as PostcssNode } from "postcss";
import { cssContextFromRoot } from "./parse.js";
import { lintContext } from "./engine.js";
import { loadRules } from "./loadRules.js";
import { CSS_CHECK_TYPES } from "./surfaces.js";
import type { Severity } from "./types.js";

const ruleName = "norma/design";
const { createPlugin, utils } = stylelint;

const messages = utils.ruleMessages(ruleName, {
  finding: (message: string, id: string) => `${message} (${id})`,
});

const meta = { url: "https://github.com/anhquanpbc/norma/tree/main/packages/design-lint" };

interface NormaSecondaryOptions {
  /** Message language (default: en). */
  lang?: "en" | "vi";
  /** Per-rule severity overrides, e.g. { "color.contrast.text": "warn" } — mirrors .normarc's rules. */
  rules?: Record<string, Severity>;
}

const ruleFunction: Rule = (primary, secondaryOptions) => {
  return (root, result) => {
    const valid = utils.validateOptions(
      result,
      ruleName,
      { actual: primary, possible: [true] },
      { actual: secondaryOptions, possible: { lang: ["en", "vi"], rules: [() => true] }, optional: true },
    );
    if (!valid || primary !== true) return;

    const opts = (secondaryOptions ?? {}) as NormaSecondaryOptions;
    const lang = opts.lang === "vi" ? "vi" : "en";
    const source = root.source?.input.css ?? root.toString();
    const file = root.source?.input.file ?? "<input.css>";

    const { rules } = loadRules(opts.rules ? { overrides: opts.rules } : {});
    const cssRules = rules.filter((r) => CSS_CHECK_TYPES.has(r.check.type));
    const ctx = cssContextFromRoot(file, source, root);
    const findings = lintContext(ctx, cssRules);

    // Map absolute source line → the first PostCSS node on it (Stylelint's own parsed nodes), so each
    // finding reports on the real declaration/rule (Stylelint requires a node, and its `line` argument is
    // deprecated). Fall back to the stylesheet root if a line somehow has no node.
    const nodeByLine = new Map<number, PostcssNode>();
    for (const block of ctx.css) {
      block.root.walk((node) => {
        const line = node.source?.start?.line;
        if (line !== undefined && !nodeByLine.has(line)) nodeByLine.set(line, node);
      });
    }

    for (const finding of findings) {
      utils.report({
        result,
        ruleName,
        message: messages.finding(lang === "vi" ? finding.message.vi : finding.message.en, finding.ruleId),
        node: nodeByLine.get(finding.line) ?? root,
        severity: finding.severity === "error" ? "error" : "warning",
      });
    }
  };
};

ruleFunction.ruleName = ruleName;
ruleFunction.messages = messages;
ruleFunction.meta = meta;

export default createPlugin(ruleName, ruleFunction);

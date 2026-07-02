import type { FileContext, Finding, Rule } from "./types.js";
import { CHECKS } from "./checks.js";

/** Run every active check against one parsed file. */
export function lintContext(ctx: FileContext, rules: Rule[]): Finding[] {
  const active = rules.filter((r) => r.severity !== "off" && r.check.type !== "manual");
  const byType = new Map<string, Rule[]>();
  for (const r of active) {
    if (!CHECKS[r.check.type]) continue;
    (byType.get(r.check.type) ?? byType.set(r.check.type, []).get(r.check.type)!).push(r);
  }
  const findings: Finding[] = [];
  for (const [type, rs] of byType) {
    try {
      findings.push(...CHECKS[type](ctx, rs));
    } catch (e) {
      // a single misbehaving check should never abort the whole lint run; surface it under NORMA_DEBUG
      // so a check that silently always throws (and thus reports clean) is discoverable.
      if (process.env.NORMA_DEBUG) console.error(`[norma] check "${type}" threw: ${(e as Error).message}`);
    }
  }
  return findings.sort((a, b) => a.line - b.line || a.ruleId.localeCompare(b.ruleId));
}

/**
 * build-rules.ts — compile the hand-authored rule catalog into a machine artifact.
 *
 *   standard/rules.yaml  ──(validate against rules.schema.json)──▶  standard/rules.json
 *
 * rules.json is GENERATED. Never hand-edit it. Run `npm run build:rules` after
 * editing rules.yaml. CI regenerates and diffs to guarantee the two stay in sync.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { parse } from "yaml";
import Ajv from "ajv";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const stdDir = join(root, "standard");

const catalog = parse(readFileSync(join(stdDir, "rules.yaml"), "utf8"));
const schema = JSON.parse(readFileSync(join(stdDir, "rules.schema.json"), "utf8"));

const ajv = new Ajv({ allErrors: true });
const validate = ajv.compile(schema);

if (!validate(catalog)) {
  console.error("✗ rules.yaml failed schema validation:");
  for (const err of validate.errors ?? []) {
    console.error(`  ${err.instancePath || "/"} ${err.message}`);
  }
  process.exit(1);
}

// Extra invariants the JSON Schema can't express cleanly.
const ids = new Set<string>();
for (const rule of catalog.rules as Array<{ id: string; tag: string; source_url?: string }>) {
  if (ids.has(rule.id)) {
    console.error(`✗ duplicate rule id: ${rule.id}`);
    process.exit(1);
  }
  ids.add(rule.id);
  if (rule.tag === "SPEC" && !rule.source_url) {
    console.error(`✗ SPEC rule ${rule.id} is missing a source_url`);
    process.exit(1);
  }
}

const out = {
  $generated: "Do not edit. Generated from standard/rules.yaml by scripts/build-rules.ts.",
  version: catalog.version,
  rules: catalog.rules,
};
writeFileSync(join(stdDir, "rules.json"), JSON.stringify(out, null, 2) + "\n");

const specs = (catalog.rules as Array<{ tag: string }>).filter((r) => r.tag === "SPEC").length;
console.log(`✓ standard/rules.json — ${catalog.rules.length} rules (${specs} SPEC), version ${catalog.version}`);

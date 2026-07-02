/**
 * check-drift.ts — the anti-drift guard that CI runs. It fails the build if any
 * generated file is stale or if the invariants that previously drifted are violated:
 *   1. rules.json + all agent-surface files regenerate to exactly what is committed.
 *   2. the ONE brand OKLCH appears identically in tokens, index.html (x2) and REFERENCE.
 *   3. the domain count is stated consistently (and the old "14" never reappears).
 *   4. every rule id in rules.json is covered by the canonical agent spec.
 */
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (rel: string) => readFileSync(join(root, rel), "utf8");
const fail: string[] = [];

// 1. Regenerate and diff. On a clean tree this is a no-op; drift shows as a diff.
try {
  execSync("npm run build:rules && npm run gen", { cwd: root, stdio: "pipe" });
} catch (e) {
  fail.push("regeneration failed: " + (e as Error).message);
}
const GENERATED = [
  "standard/rules.json", ".claude/agents/design-guardian.md", ".cursor/rules/norma-design.mdc",
  ".github/copilot-instructions.md", ".github/instructions/css.instructions.md",
  ".github/instructions/html.instructions.md", "AGENTS.md", "CLAUDE.md",
];
try {
  execSync(`git diff --exit-code -- ${GENERATED.join(" ")}`, { cwd: root, stdio: "pipe" });
} catch {
  fail.push("generated files are out of sync — run `npm run build:rules && npm run gen` and commit the result");
}

// 2. Single brand-OKLCH constant.
const tokens = JSON.parse(read("standard/tokens.tokens.json"));
const brand: string = tokens.color.brand.azure.$value;
const html = read("index.html");
const ref = read("REFERENCE.md");
const htmlHits = html.split(brand).length - 1;
if (htmlHits < 2) fail.push(`index.html should contain the brand ${brand} at least twice (--azure + DTCG sample), found ${htmlHits}`);
if (!ref.includes(brand)) fail.push(`REFERENCE.md DTCG example should use the brand ${brand}`);

// 3. Consistent domain count.
const readme = read("README.md");
for (const [name, txt] of [["README.md", readme], ["index.html", html]] as const) {
  if (!txt.includes("13 domains")) fail.push(`${name} should state "13 domains"`);
  if (txt.includes("14 domains") || txt.includes("14 mảng")) fail.push(`${name} still says "14 domains/mảng"`);
}

// 4. Every rule id covered by the canonical agent spec.
const catalog = JSON.parse(read("standard/rules.json")) as { rules: { id: string }[] };
const canonical = read("agents/norma-design-agent.md");
for (const r of catalog.rules) {
  if (!canonical.includes(r.id)) fail.push(`rule ${r.id} is not referenced in agents/norma-design-agent.md`);
}

// 5. Section sync: index.html <h2> section titles must match REFERENCE.md sections (md <-> html).
const dec = (s: string) => s.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&#39;/g, "'").trim();
const htmlSections = [...html.matchAll(/<h2><span class="en">(.*?)<\/span>/g)].map((m) => dec(m[1]));
const mdSections = [...ref.matchAll(/^##\s+\d+\.\s+(.+)$/gm)].map((m) => m[1].trim()).filter((t) => !/^how to read/i.test(t));
if (htmlSections.join(" | ") !== mdSections.join(" | ")) {
  fail.push(
    "index.html <h2> sections and REFERENCE.md sections are out of sync:\n" +
    `    html (${htmlSections.length}): ${htmlSections.join(", ")}\n` +
    `    md   (${mdSections.length}): ${mdSections.join(", ")}`,
  );
}

// 5b. VI section sync: index.html VI <h2> titles must match REFERENCE.vi.md sections,
// so the Vietnamese half of the bilingual standard can't drift either.
const refVi = read("REFERENCE.vi.md");
const htmlSectionsVi = [...html.matchAll(/<h2><span class="en">.*?<\/span><span class="vi">(.*?)<\/span>/g)].map((m) => dec(m[1]));
const mdSectionsVi = [...refVi.matchAll(/^##\s+\d+\.\s+(.+)$/gm)].map((m) => m[1].trim()).filter((t) => !/^cách đọc/i.test(t));
if (htmlSectionsVi.join(" | ") !== mdSectionsVi.join(" | ")) {
  fail.push(
    "index.html VI <h2> sections and REFERENCE.vi.md sections are out of sync:\n" +
    `    html (${htmlSectionsVi.length}): ${htmlSectionsVi.join(", ")}\n` +
    `    vi   (${mdSectionsVi.length}): ${mdSectionsVi.join(", ")}`,
  );
}
if (mdSections.length !== mdSectionsVi.length) {
  fail.push(`REFERENCE.md has ${mdSections.length} sections but REFERENCE.vi.md has ${mdSectionsVi.length}`);
}

if (fail.length) {
  console.error("✗ drift check failed:");
  for (const f of fail) console.error("  - " + f);
  process.exit(1);
}
console.log(`✓ drift check passed — ${catalog.rules.length} rules, brand ${brand}, generated files in sync`);

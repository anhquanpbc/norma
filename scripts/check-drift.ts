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
import { onSurface } from "./surfaces.js";

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
// git diff --exit-code ignores UNTRACKED files, so a brand-new generated surface that was never
// committed would slip past. Fail on any untracked file under the generated trees.
try {
  const untracked = execSync(
    `git status --porcelain -- standard .github/instructions .cursor/rules .claude/agents AGENTS.md CLAUDE.md .github/copilot-instructions.md`,
    { cwd: root, stdio: "pipe" },
  ).toString().split("\n").filter((l) => l.startsWith("??"));
  if (untracked.length) fail.push("untracked generated files (add to GENERATED[] and commit):\n    " + untracked.join("\n    "));
} catch { /* git unavailable — the diff check above is the primary guard */ }

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

// 6. Every error-severity rule must appear in its scoped Copilot instruction file (surface derived
// from check.type in scripts/surfaces.ts), so the scoped agent surfaces can't silently omit a mandate.
const scoped = {
  css: read(".github/instructions/css.instructions.md"),
  html: read(".github/instructions/html.instructions.md"),
} as const;
for (const r of catalog.rules as unknown as { id: string; severity: string; check: { type: string } }[]) {
  for (const s of ["css", "html"] as const) {
    if (r.severity === "error" && onSurface(r.check.type, s) && !scoped[s].includes(r.id)) {
      fail.push(`.github/instructions/${s}.instructions.md is missing error-severity rule ${r.id}`);
    }
  }
}

// 7. Shared load-bearing facts must appear VERBATIM in every surface that states them — body-level
// content is hand-synced across three files, which is exactly how the 37%→55.8% arXiv stat once
// drifted apart. Add a fact here whenever a figure/citation is stated on more than one surface.
const surfaceText: Record<string, string> = { "REFERENCE.md": ref, "REFERENCE.vi.md": refVi, "index.html": html };
const FACTS: [string, (keyof typeof surfaceText)[]][] = [
  ["55.8%", ["REFERENCE.md", "REFERENCE.vi.md", "index.html"]],            // arXiv 2502.13499 v2 dark-pattern rate
  ["2502.13499", ["REFERENCE.md", "REFERENCE.vi.md", "index.html"]],       // the citation id itself
  ["86 success criteria (31 A, 24 AA, 31 AAA)", ["REFERENCE.md"]],         // WCAG 2.2 count (4.1.1 removed)
  ["86 tiêu chí (31 A, 24 AA, 31 AAA)", ["REFERENCE.vi.md"]],
  ["ISO/IEC 40500:2025", ["REFERENCE.md", "REFERENCE.vi.md", "index.html"]],
  ["2024-12-12", ["REFERENCE.md", "index.html"]],                          // WCAG 2.2 updated edition
];
for (const [needle, files] of FACTS) {
  for (const f of files) {
    if (!surfaceText[f].includes(needle)) fail.push(`${f} lost the shared fact "${needle}" (see FACTS in check-drift.ts)`);
  }
}

// 8. Version integrity: standard/VERSION is the standard's version; rules.json, the README badge and
// the site footer must all state the same string (two rule catalogs must never share a version).
const version = read("standard/VERSION").trim();
const catalogVersion = (JSON.parse(read("standard/rules.json")) as { version: string }).version;
if (catalogVersion !== version) fail.push(`standard/rules.json version ${catalogVersion} != standard/VERSION ${version} (bump rules.yaml + npm run build:rules)`);
if (!readme.includes(`standard-v${version}`)) fail.push(`README.md badge does not say standard-v${version}`);
if (!html.includes(`standard v${version}`)) fail.push(`index.html footer does not say "standard v${version}"`);

if (fail.length) {
  console.error("✗ drift check failed:");
  for (const f of fail) console.error("  - " + f);
  process.exit(1);
}
console.log(`✓ drift check passed — ${catalog.rules.length} rules, brand ${brand}, standard v${version}, facts + generated files in sync`);

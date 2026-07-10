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
import { onSurface } from "../packages/design-lint/src/surfaces.js";

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
  "standard/rules.json", "standard/tokens.css", ".claude/agents/design-guardian.md",
  ".cursor/rules/norma-design.mdc", ".github/copilot-instructions.md",
  ".github/instructions/css.instructions.md", ".github/instructions/html.instructions.md",
  "AGENTS.md", "CLAUDE.md",
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
  ["2024-12-12", ["REFERENCE.md", "REFERENCE.vi.md", "index.html"]],       // WCAG 2.2 updated edition
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
// The private root package.json tracks the standard version (the repo's headline artifact); the CLI
// package.json is a separate line and is intentionally NOT checked here.
const rootPkgVersion = (JSON.parse(read("package.json")) as { version?: string }).version;
if (rootPkgVersion !== version) fail.push(`root package.json version ${rootPkgVersion} != standard/VERSION ${version} (the root package tracks the standard version)`);
if (!readme.includes(`standard-v${version}`)) fail.push(`README.md badge does not say standard-v${version}`);
if (!read("README.vi.md").includes(`standard-v${version}`)) fail.push(`README.vi.md badge does not say standard-v${version}`);
if (!html.includes(`standard v${version}`)) fail.push(`index.html footer does not say "standard v${version}"`);

// 9. z-index ladder consistency. tokens.tokens.json is the source of truth for the layer ladder,
// but REFERENCE.md, REFERENCE.vi.md and index.html each restate it by hand — and the `fixed 1200`
// rung once silently vanished from index.html. Assert every token rung is present on all four surfaces.
const zLadder = (tokens as { z?: Record<string, { $value?: unknown }> }).z;
if (!zLadder) {
  fail.push("tokens.tokens.json is missing the z-index ladder group `z`");
} else {
  for (const [name, tok] of Object.entries(zLadder)) {
    if (name.startsWith("$")) continue;
    const value = tok.$value;
    if (typeof value !== "number") { fail.push(`tokens.tokens.json z.${name} has no numeric $value`); continue; }
    if (!ref.includes(`${name} ${value}`)) fail.push(`REFERENCE.md z-index ladder is missing the "${name} ${value}" rung`);
    if (!refVi.includes(`${name} ${value}`)) fail.push(`REFERENCE.vi.md z-index ladder is missing the "${name} ${value}" rung`);
    if (!html.includes(`>${value}</span><span>${name}</span>`)) fail.push(`index.html z-index ladder card is missing the "${name} ${value}" rung`);
  }
}

// 10. index.html consumes the generated token vars: every custom property it defines in :root (light) that
// standard/tokens.css also defines must carry the SAME value — so the reference site's tokens can't drift
// from the standard. (Site-specific vars and the [data-theme=dark] overrides are not in tokens.css, so they
// aren't checked; only the token-derived light values are.)
const normCss = (v: string): string => v.trim().toLowerCase().replace(/\s+/g, " ").replace(/\s*([(),/])\s*/g, "$1");
const tokenCss = new Map<string, string>();
for (const m of read("standard/tokens.css").matchAll(/(--[a-z0-9-]+)\s*:\s*([^;]+);/gi)) tokenCss.set(m[1], normCss(m[2]));
// Match `:root {` OR `:root{` and FAIL CLOSED if the block can't be located (a whitespace reformat must
// never silently void the guard — a drift check that no-ops is worse than none).
const rootMatch = html.match(/:root\s*\{/);
if (!rootMatch) {
  fail.push("check-drift item 10: could not locate the :root { block in index.html — token-value drift is unguarded");
} else {
  const rootBlock = html.slice(rootMatch.index!, html.indexOf("}", rootMatch.index!));
  let checked = 0;
  for (const m of rootBlock.matchAll(/(--[a-z0-9-]+)\s*:\s*([^;]+);/gi)) {
    const name = m[1], expected = tokenCss.get(name);
    if (expected === undefined) continue;
    checked++;
    if (normCss(m[2]) !== expected) {
      fail.push(`index.html :root ${name} = "${normCss(m[2])}" but standard/tokens.css has "${expected}" — the token value drifted (regenerate or re-sync)`);
    }
  }
  if (!checked) fail.push("check-drift item 10: no token-derived vars found in index.html :root — the site→tokens.css binding is unguarded (did the vars move or get renamed?)");
}

if (fail.length) {
  console.error("✗ drift check failed:");
  for (const f of fail) console.error("  - " + f);
  process.exit(1);
}
console.log(`✓ drift check passed — ${catalog.rules.length} rules, brand ${brand}, standard v${version}, facts + generated files in sync`);

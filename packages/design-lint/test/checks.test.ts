import { describe, it, expect } from "vitest";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { buildContext } from "../src/parse.js";
import { lintContext } from "../src/engine.js";
import { loadRules } from "../src/loadRules.js";
import { lintFiles } from "../src/index.js";
import type { FileType } from "../src/types.js";

const { rules } = loadRules();
function lint(source: string, type: FileType) {
  return lintContext(buildContext(`t.${type}`, source, type), rules);
}
const ids = (fs: { ruleId: string }[]) => fs.map((f) => f.ruleId);

describe("a11y.focus-ring-single", () => {
  it("flags stacked outline + box-shadow", () => {
    const f = lint(`a:focus-visible{ outline:2px solid blue; box-shadow:0 0 0 4px red; }`, "css");
    expect(ids(f)).toContain("a11y.focus-ring-single");
  });
  it("passes a single clean ring", () => {
    const f = lint(`a:focus-visible{ outline:2px solid blue; outline-offset:2px; }`, "css");
    expect(ids(f)).not.toContain("a11y.focus-ring-single");
  });
  it("flags outline:none with no replacement", () => {
    const f = lint(`button:focus-visible{ outline:none; }`, "css");
    expect(ids(f)).toContain("a11y.focus-ring-single");
  });
  it("respects a disable comment", () => {
    const f = lint(`/* norma-disable a11y.focus-ring-single */\na:focus-visible{ outline:1px solid blue; box-shadow:0 0 4px red; }`, "css");
    expect(ids(f)).not.toContain("a11y.focus-ring-single");
  });
});

describe("a11y.reduced-motion", () => {
  it("flags animation with no reduced-motion block", () => {
    const f = lint(`.x{ transition: all .3s ease; }`, "css");
    expect(ids(f)).toContain("a11y.reduced-motion");
  });
  it("passes when guarded", () => {
    const f = lint(`.x{ transition: all .3s ease; }\n@media (prefers-reduced-motion: reduce){ .x{ transition:none } }`, "css");
    expect(ids(f)).not.toContain("a11y.reduced-motion");
  });
});

describe("color.contrast", () => {
  it("flags a low-contrast co-located pair", () => {
    const f = lint(`.x{ color:#999; background:#fff; }`, "css");
    expect(ids(f)).toContain("color.contrast.text");
  });
  it("resolves var() and passes a strong pair", () => {
    const f = lint(`:root{ --fg:#111; --bg:#fff }\n.x{ color:var(--fg); background:var(--bg); }`, "css");
    expect(ids(f)).not.toContain("color.contrast.text");
  });
  it("uses the 3:1 threshold for large text", () => {
    const f = lint(`.h{ color:#767676; background:#fff; font-size:32px; font-weight:700; }`, "css");
    expect(ids(f)).not.toContain("color.contrast.large-ui");
  });
});

describe("html checks", () => {
  it("flags placeholder-as-label", () => {
    const f = lint(`<input type="text" placeholder="Email">`, "html");
    expect(ids(f)).toContain("a11y.form-label");
  });
  it("passes an input with an associated label", () => {
    const f = lint(`<label for="e">Email</label><input id="e" type="text">`, "html");
    expect(ids(f)).not.toContain("a11y.form-label");
  });
  it("flags a div with onclick", () => {
    const f = lint(`<div onclick="go()">Go</div>`, "html");
    expect(ids(f)).toContain("a11y.semantic-control");
  });
  it("passes a real button with onclick", () => {
    const f = lint(`<button onclick="go()">Go</button>`, "html");
    expect(ids(f)).not.toContain("a11y.semantic-control");
  });
});

describe("antipattern.indigo-default", () => {
  it("flags the indigo default gradient", () => {
    const f = lint(`.x{ background:linear-gradient(135deg,#667eea,#764ba2); }`, "css");
    expect(ids(f)).toContain("antipattern.indigo-default");
  });
});

describe("dogfood: index.html has zero errors", () => {
  it("lints the reference site clean", () => {
    const indexHtml = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "index.html");
    const res = lintFiles([indexHtml]);
    if (res.errorCount) console.error(res.findings.filter((x) => x.severity === "error"));
    expect(res.errorCount).toBe(0);
  });
});

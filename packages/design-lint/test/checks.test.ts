import { describe, it, expect } from "vitest";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { buildContext } from "../src/parse.js";
import { lintContext } from "../src/engine.js";
import { loadRules } from "../src/loadRules.js";
import { lintFiles } from "../src/index.js";
import { CHECKS } from "../src/checks.js";
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

describe("catalog integrity", () => {
  it("every non-manual rule maps to an implemented check", () => {
    const orphans = rules
      .filter((r) => r.check.type !== "manual" && !CHECKS[r.check.type])
      .map((r) => `${r.id} -> check.type '${r.check.type}'`);
    expect(orphans).toEqual([]);
  });
});

describe("a11y.target-size", () => {
  it("flags an interactive control below 24x24 CSS px", () => {
    const f = lint(`<button style="width:16px;height:16px">x</button>`, "html");
    expect(ids(f)).toContain("a11y.target-size");
  });
  it("passes a 44x44 control", () => {
    const f = lint(`<button style="width:44px;height:44px">x</button>`, "html");
    expect(ids(f)).not.toContain("a11y.target-size");
  });
});

describe("a11y.emoji-icon", () => {
  it("flags an emoji-only button with no label", () => {
    const f = lint(`<button>🔔</button>`, "html");
    expect(ids(f)).toContain("a11y.emoji-icon");
  });
  it("passes when an aria-label is present", () => {
    const f = lint(`<button aria-label="Alerts">🔔</button>`, "html");
    expect(ids(f)).not.toContain("a11y.emoji-icon");
  });
});

describe("perf.img-dimensions", () => {
  it("flags an <img> with no dimensions", () => {
    const f = lint(`<img src="a.png">`, "html");
    expect(ids(f)).toContain("perf.img-dimensions");
  });
  it("passes an <img> with width and height", () => {
    const f = lint(`<img src="a.png" width="80" height="80">`, "html");
    expect(ids(f)).not.toContain("perf.img-dimensions");
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

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
  it("passes a two-color outline + box-shadow ring (a valid single indicator)", () => {
    const f = lint(`a:focus-visible{ outline:2px solid #fff; box-shadow:0 0 0 4px #2563eb; }`, "css");
    expect(ids(f)).not.toContain("a11y.focus-ring-single");
  });
  it("passes a single clean ring", () => {
    const f = lint(`a:focus-visible{ outline:2px solid blue; outline-offset:2px; }`, "css");
    expect(ids(f)).not.toContain("a11y.focus-ring-single");
  });
  it("passes outline:none replaced by a border", () => {
    const f = lint(`button:focus-visible{ outline:none; border:2px solid #2563eb; }`, "css");
    expect(ids(f)).not.toContain("a11y.focus-ring-single");
  });
  it("flags outline:none with no visible replacement", () => {
    const f = lint(`button:focus-visible{ outline:none; }`, "css");
    expect(ids(f)).toContain("a11y.focus-ring-single");
  });
  it("respects a disable comment", () => {
    const f = lint(`/* norma-disable a11y.focus-ring-single */\nbutton:focus-visible{ outline:none; }`, "css");
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
  it("passes an emoji button that also has visible text", () => {
    const f = lint(`<button>🔔 Notifications</button>`, "html");
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

describe("a11y.img-alt", () => {
  it("flags an <img> with no alt attribute", () => {
    expect(ids(lint(`<img src="a.png">`, "html"))).toContain("a11y.img-alt");
  });
  it("passes descriptive alt and empty (decorative) alt", () => {
    expect(ids(lint(`<img src="a.png" alt="A cat">`, "html"))).not.toContain("a11y.img-alt");
    expect(ids(lint(`<img src="a.png" alt="">`, "html"))).not.toContain("a11y.img-alt");
  });
  it("passes an aria-hidden decorative image", () => {
    expect(ids(lint(`<img src="a.png" aria-hidden="true">`, "html"))).not.toContain("a11y.img-alt");
  });
});

describe("i18n.html-lang", () => {
  it("flags a document whose <html> has no lang", () => {
    const f = lint(`<html><body>hi</body></html>`, "html");
    expect(ids(f)).toContain("i18n.html-lang");
  });
  it("passes <html lang=...>", () => {
    const f = lint(`<html lang="en"><body>hi</body></html>`, "html");
    expect(ids(f)).not.toContain("i18n.html-lang");
  });
  it("ignores fragments with no <html>", () => {
    const f = lint(`<div>hi</div>`, "html");
    expect(ids(f)).not.toContain("i18n.html-lang");
  });
});

describe("i18n.logical-properties", () => {
  it("flags physical margin-left and text-align:left", () => {
    const f = lint(`.x{ margin-left:8px; text-align:left; }`, "css");
    expect(ids(f)).toContain("i18n.logical-properties");
  });
  it("passes the logical equivalents", () => {
    const f = lint(`.x{ margin-inline-start:8px; text-align:start; }`, "css");
    expect(ids(f)).not.toContain("i18n.logical-properties");
  });
});

describe("theme.color-scheme", () => {
  it("flags a :root with no color-scheme", () => {
    const f = lint(`:root{ --x:1px }`, "css");
    expect(ids(f)).toContain("theme.color-scheme");
  });
  it("passes when color-scheme is declared", () => {
    const f = lint(`:root{ color-scheme:light; --x:1px }`, "css");
    expect(ids(f)).not.toContain("theme.color-scheme");
  });
});

describe("tokens.color-only", () => {
  it("flags a raw chromatic hex in a color property", () => {
    const f = lint(`.x{ color:#3b82f6; }`, "css");
    expect(ids(f)).toContain("tokens.color-only");
  });
  it("exempts neutral black/white and custom-property definitions", () => {
    const f = lint(`:root{ --c:#3b82f6 }\n.x{ color:#fff; background:var(--c); }`, "css");
    expect(ids(f)).not.toContain("tokens.color-only");
  });
});

describe("antipattern.pure-dark-mode", () => {
  it("fires for pure #000/#fff inside a dark context", () => {
    const f = lint(`@media (prefers-color-scheme: dark){ body{ background:#000000; color:#ffffff; } }`, "css");
    expect(ids(f)).toContain("antipattern.pure-dark-mode");
  });
  it("does not fire in a light context", () => {
    const f = lint(`body{ background:#ffffff; color:#000000; }`, "css");
    expect(ids(f)).not.toContain("antipattern.pure-dark-mode");
  });
  it("catches 3-digit #000/#fff in a dark context", () => {
    const f = lint(`@media (prefers-color-scheme: dark){ body{ background:#000; color:#fff; } }`, "css");
    expect(ids(f)).toContain("antipattern.pure-dark-mode");
  });
  it("does not flag a translucent #0009 value as pure-dark", () => {
    const f = lint(`@media (prefers-color-scheme: dark){ .x{ box-shadow:0 0 4px #0009; background:#121212; } }`, "css");
    expect(ids(f)).not.toContain("antipattern.pure-dark-mode");
  });
});

describe("security.external-rel", () => {
  it("flags an external target=_blank without rel=noopener", () => {
    const f = lint(`<a href="https://x.example" target="_blank">x</a>`, "html");
    expect(ids(f)).toContain("security.external-rel");
  });
  it("passes with rel=noopener", () => {
    const f = lint(`<a href="https://x.example" target="_blank" rel="noopener">x</a>`, "html");
    expect(ids(f)).not.toContain("security.external-rel");
  });
  it("ignores internal (non-external) links", () => {
    const f = lint(`<a href="#s1" target="_blank">x</a>`, "html");
    expect(ids(f)).not.toContain("security.external-rel");
  });
});

describe("security.sri", () => {
  it("flags an external <script> with no integrity", () => {
    const f = lint(`<script src="https://cdn.example/x.js"></script>`, "html");
    expect(ids(f)).toContain("security.sri");
  });
  it("passes inline scripts and integrity-pinned externals", () => {
    const f = lint(`<script>var x=1</script>\n<script src="https://cdn.example/x.js" integrity="sha384-abc"></script>`, "html");
    expect(ids(f)).not.toContain("security.sri");
  });
});

describe("theme-aware var resolution", () => {
  it("resolves tokens from the base :root, not a later [data-theme] override", () => {
    // Light --fg (#111 on #fff) passes; the static contrast check must not pick up the dark override (#eee).
    const f = lint(`:root{ --fg:#111; --bg:#fff }\n[data-theme="dark"]{ --fg:#eee; --bg:#111 }\n.x{ color:var(--fg); background:var(--bg); }`, "css");
    expect(ids(f)).not.toContain("color.contrast.text");
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

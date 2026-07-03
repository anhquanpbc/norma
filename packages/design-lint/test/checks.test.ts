import { describe, it, expect } from "vitest";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { buildContext } from "../src/parse.js";
import { lintContext } from "../src/engine.js";
import { loadRules } from "../src/loadRules.js";
import { lintFiles } from "../src/index.js";
import { CHECKS } from "../src/checks.js";
import { contrastRatio } from "../src/color.js";
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
  it("passes an <img> sized with inline width/height styles", () => {
    const f = lint(`<img src="a.png" style="width:80px;height:80px">`, "html");
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

describe("color.contrast — large text sized via a token (regression: no false body-text error)", () => {
  it("holds token-sized large bold text to the 3:1 threshold, not 4.5:1", () => {
    // #8a8a8a on #fff = 3.45 — valid large text, invalid body text; font-size comes from a token.
    const f = lint(`:root{ --h1:2rem }\n.h{ color:#8a8a8a; background:#fff; font-size:var(--h1); font-weight:700 }`, "css");
    expect(ids(f)).not.toContain("color.contrast.text");
    expect(ids(f)).not.toContain("color.contrast.large-ui");
  });
  it("still flags genuinely low-contrast large text under large-ui (< 3:1)", () => {
    // #aaaaaa on #fff = 2.32 — fails even the 3:1 large-text threshold.
    const f = lint(`.h{ color:#aaaaaa; background:#fff; font-size:32px; font-weight:700 }`, "css");
    expect(ids(f)).toContain("color.contrast.large-ui");
  });
});

describe("inline styles are linted", () => {
  it("flags a low-contrast inline color/background pair", () => {
    expect(ids(lint(`<p style="color:#999;background:#fff">hi</p>`, "html"))).toContain("color.contrast.text");
  });
  it("flags a raw chromatic color in an inline style", () => {
    expect(ids(lint(`<div style="color:#3366ff">hi</div>`, "html"))).toContain("tokens.color-only");
  });
  it("honors data-norma-disable on the element for inline styles", () => {
    expect(ids(lint(`<p style="color:#999;background:#fff" data-norma-disable="color.contrast.text">hi</p>`, "html")))
      .not.toContain("color.contrast.text");
  });
});

describe("tokens.color-only — rgb()/hsl() as well as hex", () => {
  it("flags raw rgb()", () => { expect(ids(lint(`.x{ color: rgb(59,130,246) }`, "css"))).toContain("tokens.color-only"); });
  it("flags raw hsl()", () => { expect(ids(lint(`.x{ color: hsl(217,91%,60%) }`, "css"))).toContain("tokens.color-only"); });
  it("exempts a neutral grey rgb()", () => { expect(ids(lint(`.x{ color: rgb(20,20,20) }`, "css"))).not.toContain("tokens.color-only"); });
});

describe("a11y.target-size — either dimension below the minimum (|| not &&)", () => {
  it("flags a control that is narrow even if tall", () => {
    expect(ids(lint(`<button style="width:16px;height:100px">x</button>`, "html"))).toContain("a11y.target-size");
  });
  it("passes when min-width/min-height reach the minimum", () => {
    expect(ids(lint(`<button style="min-width:40px;min-height:40px">x</button>`, "html"))).not.toContain("a11y.target-size");
  });
});

describe("a11y.emoji-icon — broadened ranges & accessible-name sources", () => {
  it("flags a dingbat / misc-technical icon button", () => {
    expect(ids(lint(`<button>✅</button>`, "html"))).toContain("a11y.emoji-icon");
    expect(ids(lint(`<button>⌚</button>`, "html"))).toContain("a11y.emoji-icon");
  });
  it("passes when a title provides an accessible name", () => {
    expect(ids(lint(`<button title="Save">✅</button>`, "html"))).not.toContain("a11y.emoji-icon");
  });
  it("scans role=button elements too", () => {
    expect(ids(lint(`<span role="button">✨</span>`, "html"))).toContain("a11y.emoji-icon");
  });
});

describe("a11y.heading-order", () => {
  it("flags a skipped level (h2 → h4)", () => {
    expect(ids(lint(`<h1>a</h1><h2>b</h2><h4>c</h4>`, "html"))).toContain("a11y.heading-order");
  });
  it("passes an unbroken outline (h1 → h2 → h3)", () => {
    expect(ids(lint(`<h1>a</h1><h2>b</h2><h3>c</h3>`, "html"))).not.toContain("a11y.heading-order");
  });
  it("ignores files with no headings", () => {
    expect(ids(lint(`<p>hi</p>`, "html"))).not.toContain("a11y.heading-order");
  });
});

describe("i18n.logical-properties — float / clear", () => {
  it("flags float:left and clear:right", () => {
    expect(ids(lint(`.x{ float:left; clear:right }`, "css"))).toContain("i18n.logical-properties");
  });
});

describe("security.sri — external <link>", () => {
  it("flags an external stylesheet with no integrity", () => {
    expect(ids(lint(`<link rel="stylesheet" href="https://cdn.example/x.css">`, "html"))).toContain("security.sri");
  });
  it("passes an integrity-pinned external stylesheet", () => {
    expect(ids(lint(`<link rel="stylesheet" href="https://cdn.example/x.css" integrity="sha384-abc">`, "html"))).not.toContain("security.sri");
  });
});

describe("a11y.focus-ring-single — replacement after outline removal", () => {
  it("passes outline:none replaced by a box-shadow ring", () => {
    expect(ids(lint(`button:focus-visible{ outline:none; box-shadow:0 0 0 3px #2563eb }`, "css"))).not.toContain("a11y.focus-ring-single");
  });
  it("ignores :focus-within", () => {
    expect(ids(lint(`.x:focus-within{ outline:none }`, "css"))).not.toContain("a11y.focus-ring-single");
  });
});

describe("color: translucent foreground compositing", () => {
  it("composites a translucent foreground over the background instead of scoring it opaque", () => {
    const r = contrastRatio("rgba(0,0,0,0.7)", "#fff", new Map());
    expect(r).not.toBeNull();
    expect(r as number).toBeGreaterThan(4.5);
    expect(r as number).toBeLessThan(15); // not the 21:1 of opaque black
  });
  it("skips a translucent background (the backdrop is unknown)", () => {
    expect(contrastRatio("#000", "rgba(255,255,255,0.5)", new Map())).toBeNull();
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

describe("a11y.meta-viewport — zoom-blocking viewport", () => {
  const doc = (meta: string) =>
    `<!DOCTYPE html><html lang="en"><head><title>t</title>${meta}</head><body><p>x</p></body></html>`;
  it("flags user-scalable=no", () => {
    const f = lint(doc(`<meta name="viewport" content="width=device-width, initial-scale=1, user-scalable=no">`), "html");
    expect(ids(f)).toContain("a11y.meta-viewport");
  });
  it("flags maximum-scale below 2", () => {
    const f = lint(doc(`<meta name="viewport" content="width=device-width, maximum-scale=1">`), "html");
    expect(ids(f)).toContain("a11y.meta-viewport");
  });
  it("passes the standard viewport meta", () => {
    const f = lint(doc(`<meta name="viewport" content="width=device-width, initial-scale=1">`), "html");
    expect(ids(f)).not.toContain("a11y.meta-viewport");
    expect(ids(f)).not.toContain("responsive.viewport-meta");
  });
  it("allows maximum-scale >= 2", () => {
    const f = lint(doc(`<meta name="viewport" content="width=device-width, maximum-scale=5">`), "html");
    expect(ids(f)).not.toContain("a11y.meta-viewport");
  });
});

describe("responsive.viewport-meta — presence in full documents", () => {
  it("warns when a full document has no viewport meta", () => {
    const f = lint(`<!DOCTYPE html><html lang="en"><head><title>t</title></head><body><p>x</p></body></html>`, "html");
    expect(ids(f)).toContain("responsive.viewport-meta");
  });
  it("ignores fragments", () => {
    expect(ids(lint(`<p>snippet</p>`, "html"))).not.toContain("responsive.viewport-meta");
  });
});

describe("a11y.control-name — accessible names on controls", () => {
  it("flags an svg-only button with no accessible name", () => {
    const f = lint(`<button><svg viewBox="0 0 16 16"><path d="M0 0h16v16z"/></svg></button>`, "html");
    expect(ids(f)).toContain("a11y.control-name");
  });
  it("flags an empty link", () => {
    expect(ids(lint(`<a href="/x"></a>`, "html"))).toContain("a11y.control-name");
  });
  it("passes text content, aria-label, svg title, and img alt names", () => {
    const f = lint(
      `<button>Save</button><a href="/x" aria-label="Docs"></a>` +
      `<button><svg viewBox="0 0 16 16"><title>Close</title></svg></button>` +
      `<a href="/y"><img src="l.png" alt="Logo" width="10" height="10"></a>`, "html");
    expect(ids(f)).not.toContain("a11y.control-name");
  });
  it("respects data-norma-disable", () => {
    const f = lint(`<a href="/x" data-norma-disable="a11y.control-name"></a>`, "html");
    expect(ids(f)).not.toContain("a11y.control-name");
  });
});

describe("a11y.semantic-control — href-less <a onclick>", () => {
  it("flags <a onclick> without href (no link role, not focusable)", () => {
    expect(ids(lint(`<a onclick="go()">Go</a>`, "html"))).toContain("a11y.semantic-control");
  });
  it("passes <a href> with onclick", () => {
    expect(ids(lint(`<a href="/x" onclick="track()">Go</a>`, "html"))).not.toContain("a11y.semantic-control");
  });
});

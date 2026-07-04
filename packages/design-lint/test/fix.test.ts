import { describe, it, expect } from "vitest";
import { fixSource } from "../src/fix.js";
import { buildContext } from "../src/parse.js";
import { lintContext } from "../src/engine.js";
import { loadRules } from "../src/loadRules.js";
import type { FileType } from "../src/types.js";

const { rules } = loadRules();
const idsOf = (src: string, t: FileType) => lintContext(buildContext(`t.${t}`, src, t), rules).map((f) => f.ruleId);

describe("fixSource — CSS logical properties", () => {
  it("renames physical margin/padding/border to logical", () => {
    const { output, fixed } = fixSource(".x{ margin-left:8px; padding-right:4px; border-left:1px solid #000 }", "css");
    expect(output).toContain("margin-inline-start:8px");
    expect(output).toContain("padding-inline-end:4px");
    expect(output).toContain("border-inline-start:1px solid #000");
    expect(fixed).toBe(3);
    expect(idsOf(output, "css")).not.toContain("i18n.logical-properties");
  });
  it("renames text-align:left → start", () => {
    const { output } = fixSource(".x{ text-align:left }", "css");
    expect(output).toContain("text-align:start");
  });
  it("is a no-op on already-logical CSS", () => {
    const { fixed } = fixSource(".x{ margin-inline-start:8px }", "css");
    expect(fixed).toBe(0);
  });
});

describe("fixSource — HTML", () => {
  it("swaps a positive tabindex to 0 (preserving surrounding bytes)", () => {
    const { output, fixed } = fixSource(`<a href="/x" tabindex="3">Pricing</a>`, "html");
    expect(output).toBe(`<a href="/x" tabindex="0">Pricing</a>`);
    expect(fixed).toBe(1);
    expect(idsOf(output, "html")).not.toContain("a11y.no-positive-tabindex");
  });
  it("inserts rel=noopener on an external target=_blank link with no rel", () => {
    const { output } = fixSource(`<a href="https://x.com" target="_blank">x</a>`, "html");
    expect(output).toContain(`rel="noopener noreferrer"`);
    expect(idsOf(output, "html")).not.toContain("security.external-rel");
  });
  it("does not touch a link that already has a rel", () => {
    const src = `<a href="https://x.com" target="_blank" rel="nofollow">x</a>`;
    expect(fixSource(src, "html").fixed).toBe(0);
  });
  it("leaves an internal target=_blank link alone", () => {
    expect(fixSource(`<a href="/local" target="_blank">x</a>`, "html").fixed).toBe(0);
  });
  it("is idempotent (fixing twice makes no further change)", () => {
    const once = fixSource(`<a href="https://x.com" target="_blank" tabindex="2">x</a>`, "html").output;
    expect(fixSource(once, "html").fixed).toBe(0);
  });
});

describe("fixSource — corruption cases from adversarial review", () => {
  it("external-rel: a '>' inside an attribute value doesn't misplace the rel", () => {
    const { output } = fixSource(`<a title="x > y" href="https://z.com" target="_blank">t</a>`, "html");
    expect(output).toBe(`<a title="x > y" href="https://z.com" target="_blank" rel="noopener noreferrer">t</a>`);
  });
  it("external-rel: single-quoted attr with '>' handled", () => {
    const { output } = fixSource(`<a title='a > b' href="https://z.com" target="_blank">t</a>`, "html");
    expect(output).toContain(`target="_blank" rel="noopener noreferrer">`);
    expect(output).toContain(`title='a > b'`);
  });
  it("tabindex: does NOT touch data-tabindex, <pre> text, comments, or other attribute values", () => {
    expect(fixSource(`<div data-tabindex="3">x</div>`, "html").fixed).toBe(0);
    expect(fixSource(`<pre>tabindex="3"</pre>`, "html").fixed).toBe(0);
    expect(fixSource(`<!-- tabindex="3" -->`, "html").fixed).toBe(0);
    expect(fixSource(`<div title='set tabindex="3" here'>x</div>`, "html").fixed).toBe(0);
  });
  it("tabindex: still fixes a real positive tabindex attribute", () => {
    expect(fixSource(`<a href="/x" tabindex="3">go</a>`, "html").output).toContain(`tabindex="0"`);
  });
  it("tabindex: fixes the real attr even when a data-tabindex is also present", () => {
    const { output } = fixSource(`<div data-tabindex="5" tabindex="3">x</div>`, "html");
    expect(output).toBe(`<div data-tabindex="5" tabindex="0">x</div>`);
  });
});

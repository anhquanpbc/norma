import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { parse as parseHtml } from "node-html-parser";
import { fixSource } from "../src/fix.js";

// Generators that exercise the byte-offset HTML fixer's edit paths — a positive tabindex → "0", and
// rel="noopener noreferrer" inserted on an external target=_blank link with no rel. Attribute values
// deliberately include `>` and `<` to stress openTagCloseOffset (which must skip a `>` inside a quoted
// attribute), the exact corruption class an adversarial review once found by hand.
const href = fc.constantFrom("/local", "https://x.com", "http://y.org", "//cdn.z", "#", "");
const target = fc.constantFrom("", ` target="_blank"`, ` target="_self"`);
const rel = fc.constantFrom("", ` rel="nofollow"`, ` rel="noopener"`);
const tabindex = fc.constantFrom("", ` tabindex="0"`, ` tabindex="3"`, ` tabindex="-1"`, ` tabindex="7"`, ` tabindex="42"`, ` tabindex="100"`); // incl. multi-digit → the \d* regex branch
const title = fc.constantFrom("", ` title="ok"`, ` title="a > b"`, ` title="p < q"`, ` data-x="y > z"`);
const words = fc.stringMatching(/^[a-z ]{0,8}$/);

const anchor = fc.tuple(href, target, rel, tabindex, title, words)
  .map(([h, tg, r, ti, tt, w]) => `<a href="${h}"${tg}${r}${ti}${tt}>${w}</a>`);
const div = fc.tuple(tabindex, title, words).map(([ti, tt, w]) => `<div${ti}${tt}>${w}</div>`);
const html = fc.array(fc.oneof(anchor, div, fc.constant("<!-- note -->"), words), { maxLength: 8 })
  .map((parts) => parts.join(""));

const txt = (s: string) => parseHtml(s).textContent;
// Every element's tag + all attributes EXCEPT the two the fixer is allowed to change (tabindex, rel).
// Stronger than a bare element-count check: it catches a byte-offset splice that corrupts ANY other
// attribute (href, title, data-*) even when the tag boundaries and element count happen to survive.
const skeleton = (s: string) => parseHtml(s).querySelectorAll("*").map((el) => {
  const attrs = { ...el.attributes } as Record<string, string>;
  delete attrs.tabindex; delete attrs.rel;
  return `${el.tagName}[${Object.entries(attrs).sort().map(([k, v]) => `${k}=${v}`).join(",")}]`;
}).join("|");

describe("fixSource — property invariants", () => {
  it("HTML fix is idempotent: a second pass makes no further change", () => {
    fc.assert(fc.property(html, (src) => {
      const once = fixSource(src, "html").output;
      expect(fixSource(once, "html").fixed).toBe(0);
    }), { numRuns: 300 });
  });

  it("HTML fix never corrupts the document: structure, text, and every non-fixed attribute are preserved", () => {
    fc.assert(fc.property(html, (src) => {
      const { output } = fixSource(src, "html");
      expect(skeleton(output)).toBe(skeleton(src)); // structure + all attributes except tabindex/rel intact
      expect(txt(output)).toBe(txt(src));           // no text mangled — the splice stayed inside the tag
    }), { numRuns: 300 });
  });

  it("CSS fix is idempotent across arbitrary declaration mixes", () => {
    const decl = fc.constantFrom(
      "margin-left:8px", "padding-right:4px", "border-left:1px solid red", "text-align:left",
      "float:left", "clear:right", "margin-inline-start:8px", "color:red", "float:none", "text-align:center",
    );
    const css = fc.array(decl, { maxLength: 6 }).map((ds) => `.x{ ${ds.join("; ")} }`);
    fc.assert(fc.property(css, (src) => {
      const once = fixSource(src, "css").output;
      expect(fixSource(once, "css").fixed).toBe(0);
    }), { numRuns: 300 });
  });
});

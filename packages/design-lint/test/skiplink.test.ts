import { describe, it, expect } from "vitest";
import { buildContext } from "../src/parse.js";
import { lintContext } from "../src/engine.js";
import { loadRules } from "../src/loadRules.js";

const { rules } = loadRules();
const ids = (src: string) => lintContext(buildContext("t.html", src, "html"), rules).map((f) => f.ruleId);
const doc = (body: string) => `<!DOCTYPE html><html lang="en"><head><title>t</title></head><body>${body}</body></html>`;

describe("a11y.skip-link", () => {
  it("flags a full document that has a <main> but no skip link", () => {
    expect(ids(doc(`<nav>nav</nav><main><h1>x</h1></main>`))).toContain("a11y.skip-link");
  });

  it("passes when a skip link targets the <main> by id (the #main convention)", () => {
    expect(ids(doc(`<a href="#main">Skip to content</a><main id="main"><h1>x</h1></main>`))).not.toContain("a11y.skip-link");
  });

  it("passes when the skip link targets a wrapper AROUND main (ancestor target)", () => {
    expect(ids(doc(`<a href="#wrap">Skip</a><div id="wrap"><main><h1>x</h1></main></div>`))).not.toContain("a11y.skip-link");
  });

  it("passes when the skip link targets an element INSIDE main (descendant target)", () => {
    expect(ids(doc(`<a href="#start">Skip</a><main><h1 id="start">x</h1></main>`))).not.toContain("a11y.skip-link");
  });

  it("accepts role=main as the landmark", () => {
    expect(ids(doc(`<a href="#m">Skip</a><div role="main" id="m"><h1>x</h1></div>`))).not.toContain("a11y.skip-link");
  });

  it("still flags a bare href='#' (not a real bypass target)", () => {
    expect(ids(doc(`<a href="#">Skip</a><main><h1>x</h1></main>`))).toContain("a11y.skip-link");
  });

  it("still flags a skip link pointing at a non-existent id", () => {
    expect(ids(doc(`<a href="#nope">Skip</a><main><h1>x</h1></main>`))).toContain("a11y.skip-link");
  });

  it("ignores an off-page fragment link that is unrelated to main", () => {
    // A link to something outside/beside main is NOT a bypass to the main content.
    expect(ids(doc(`<a href="#footer">Go to footer</a><main><h1>x</h1></main><footer id="footer">f</footer>`))).toContain("a11y.skip-link");
  });

  it("does not fire when there is no <main> (a11y.landmark-main owns that gap)", () => {
    const got = ids(doc(`<a href="#x">Skip</a><section><h1>x</h1></section>`));
    expect(got).not.toContain("a11y.skip-link");
    expect(got).toContain("a11y.landmark-main");
  });

  it("does not fire on a fragment (not a full document)", () => {
    const got = lintContext(buildContext("t.html", `<main><h1>x</h1></main>`, "html"), rules).map((f) => f.ruleId);
    expect(got).not.toContain("a11y.skip-link");
  });

  it("respects data-norma-disable on the main", () => {
    expect(ids(doc(`<main data-norma-disable="a11y.skip-link"><h1>x</h1></main>`))).not.toContain("a11y.skip-link");
  });
});

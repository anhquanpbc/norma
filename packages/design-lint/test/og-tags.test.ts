import { describe, it, expect } from "vitest";
import { buildContext } from "../src/parse.js";
import { lintContext } from "../src/engine.js";
import { loadRules } from "../src/loadRules.js";

const { rules } = loadRules();
const ids = (src: string) => lintContext(buildContext("t.html", src, "html"), rules).map((f) => f.ruleId);
const doc = (head: string) => `<!DOCTYPE html><html lang="en"><head><title>t</title>${head}</head><body><main id="main"><a href="#main">s</a><h1>x</h1></main></body></html>`;

describe("seo.og-tags", () => {
  it("flags a full document with no Open Graph tags", () => {
    expect(ids(doc(""))).toContain("seo.og-tags");
  });

  it("passes when og:title is present (property=)", () => {
    expect(ids(doc(`<meta property="og:title" content="Hi">`))).not.toContain("seo.og-tags");
  });

  it("passes when only og:url is present", () => {
    expect(ids(doc(`<meta property="og:url" content="https://x.dev/">`))).not.toContain("seo.og-tags");
  });

  it("passes when only og:image is present", () => {
    expect(ids(doc(`<meta property="og:image" content="https://x.dev/i.png">`))).not.toContain("seo.og-tags");
  });

  it("accepts name= as well as property= (common mistake, avoid a false positive)", () => {
    expect(ids(doc(`<meta name="og:title" content="Hi">`))).not.toContain("seo.og-tags");
  });

  it("still flags when only non-core OG tags are present (no title/url/image)", () => {
    expect(ids(doc(`<meta property="og:type" content="website"><meta property="og:site_name" content="X">`))).toContain("seo.og-tags");
  });

  it("still flags an OG tag with empty content (not a real tag)", () => {
    expect(ids(doc(`<meta property="og:title" content="">`))).toContain("seo.og-tags");
  });

  it("does not count an OG tag inside a <template>", () => {
    expect(ids(doc(`<template><meta property="og:title" content="Hi"></template>`))).toContain("seo.og-tags");
  });

  it("does not fire on a fragment (not a full document)", () => {
    const got = lintContext(buildContext("t.html", `<section><h1>x</h1></section>`, "html"), rules).map((f) => f.ruleId);
    expect(got).not.toContain("seo.og-tags");
  });
});

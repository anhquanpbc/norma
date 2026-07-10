import { describe, it, expect } from "vitest";
import { buildContext } from "../src/parse.js";
import { lintContext } from "../src/engine.js";
import { loadRules } from "../src/loadRules.js";

const { rules } = loadRules();
const ids = (css: string) => lintContext(buildContext("t.css", css, "css"), rules).map((f) => f.ruleId);
const RULE = "responsive.viewport-units";

describe("responsive.viewport-units", () => {
  it("flags height:100vh", () => {
    expect(ids(`.x{ height:100vh }`)).toContain(RULE);
  });
  it("flags min-height:100vh (the full-height hero pattern)", () => {
    expect(ids(`.hero{ min-height:100vh }`)).toContain(RULE);
  });
  it("flags max-height:100vh", () => {
    expect(ids(`.x{ max-height:100vh }`)).toContain(RULE);
  });
  it("flags the logical block-size:100vh", () => {
    expect(ids(`.x{ block-size:100vh }`)).toContain(RULE);
  });
  it("flags calc(100vh - …)", () => {
    expect(ids(`.x{ min-height:calc(100vh - 60px) }`)).toContain(RULE);
  });
  it("does NOT flag 100dvh / 100svh (the modern fix)", () => {
    expect(ids(`.x{ min-height:100dvh }`)).not.toContain(RULE);
    expect(ids(`.x{ height:100svh }`)).not.toContain(RULE);
  });
  it("does NOT flag a non-100 vh value (e.g. an 80vh modal cap)", () => {
    expect(ids(`.modal{ max-height:80vh }`)).not.toContain(RULE);
  });
  it("does NOT flag 100vh on a non-height property or a custom property", () => {
    expect(ids(`.x{ width:100vh }`)).not.toContain(RULE);
    expect(ids(`:root{ --h:100vh }`)).not.toContain(RULE);
  });
  it("does NOT mis-match 1100vh (word-boundary safe)", () => {
    expect(ids(`.x{ height:1100vh }`)).not.toContain(RULE);
  });
  it("respects a norma-disable comment", () => {
    expect(ids(`.x{ /* norma-disable responsive.viewport-units */ height:100vh }`)).not.toContain(RULE);
  });
  it("does NOT flag a progressive-enhancement fallback (100vh then 100dvh on the same property)", () => {
    expect(ids(`.hero{ min-height:100vh; min-height:100dvh }`)).not.toContain(RULE);
    expect(ids(`.hero{ height:100vh; height:100svh }`)).not.toContain(RULE);
  });
  it("still flags 100vh when the dvh override is on a DIFFERENT property", () => {
    expect(ids(`.hero{ min-height:100vh; max-height:100dvh }`)).toContain(RULE);
  });
});

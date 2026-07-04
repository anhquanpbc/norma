import { describe, it, expect } from "vitest";
import { buildContext } from "../src/parse.js";
import { lintContext } from "../src/engine.js";
import { loadRules } from "../src/loadRules.js";

const { rules } = loadRules();
const findings = (src: string) => lintContext(buildContext("C.tsx", src, "jsx"), rules);
const ids = (src: string) => findings(src).map((f) => f.ruleId);

describe("jsx — antipattern.indigo-default (the AI tell transfers to className/style)", () => {
  it("flags the indigo hex in a style object", () => {
    expect(ids(`const C = () => <div style={{ background: "#667eea" }}/>;`)).toContain("antipattern.indigo-default");
  });
  it("flags a Tailwind indigo utility class", () => {
    expect(ids(`const C = () => <div className="bg-indigo-500 p-4"/>;`)).toContain("antipattern.indigo-default");
  });
  it("flags an arbitrary-hex Tailwind class", () => {
    expect(ids(`const C = () => <div className="bg-[#764ba2]"/>;`)).toContain("antipattern.indigo-default");
  });
  it("passes a clean component (no indigo, no raw brand hex)", () => {
    expect(ids(`const C = () => <div className="bg-slate-900 text-white"/>;`)).not.toContain("antipattern.indigo-default");
  });
});

describe("jsx — a11y.semantic-control (<div onClick>)", () => {
  it("flags a <div onClick> with no role", () => {
    expect(ids(`const C = () => <div onClick={() => go()}>x</div>;`)).toContain("a11y.semantic-control");
  });
  it("does not flag a real <button onClick>", () => {
    expect(ids(`const C = () => <button onClick={() => go()}>x</button>;`)).not.toContain("a11y.semantic-control");
  });
  it("does not flag a div carrying an ARIA retrofit (role)", () => {
    expect(ids(`const C = () => <div role="button" tabIndex={0} onClick={() => go()}>x</div>;`)).not.toContain("a11y.semantic-control");
  });
  it("does not flag a <Component onClick> — its semantics are unknown", () => {
    expect(ids(`const C = () => <MyButton onClick={() => go()}>x</MyButton>;`)).not.toContain("a11y.semantic-control");
  });
  it("is not fooled by a '>' inside the onClick handler (brace-aware tokenizer)", () => {
    expect(ids(`const C = () => <div onClick={() => a > b && go()}>x</div>;`)).toContain("a11y.semantic-control");
  });
});

describe("jsx — line accuracy & clean files", () => {
  it("reports the correct line", () => {
    const f = findings(`export function C() {\n  return (\n    <div className="bg-indigo-500"/>\n  );\n}`);
    expect(f.find((x) => x.ruleId === "antipattern.indigo-default")?.line).toBe(3);
  });
  it("a clean, semantic component produces no findings", () => {
    expect(ids(`export const C = () => (<button className="rounded bg-slate-800" onClick={save}>Save</button>);`)).toEqual([]);
  });
});

describe("jsx — false positives from adversarial review (scan only real tag regions, strip comments)", () => {
  it("indigo: NOT flagged in a code comment", () => {
    expect(ids(`export const C = () => {\n  // TODO: drop the old indigo-500 gradient\n  return <div className="card"/>;\n};`)).not.toContain("antipattern.indigo-default");
  });
  it("indigo: NOT flagged in a non-className string literal", () => {
    expect(ids(`const note = "don't use indigo-500 or #667eea"; export const C = () => <div>{note}</div>;`)).not.toContain("antipattern.indigo-default");
  });
  it("indigo: NOT flagged in JSX text or an import path", () => {
    expect(ids(`import x from "./indigo-500-legacy";\nexport const C = () => <p>We replaced indigo-500 with a token.</p>;`)).not.toContain("antipattern.indigo-default");
  });
  it("indigo: STILL flagged inside a real className / style / template-literal / clsx", () => {
    expect(ids(`const C = () => <div className="bg-indigo-500"/>;`)).toContain("antipattern.indigo-default");
    expect(ids(`const C = () => <div className={\`bg-indigo-500\`}/>;`)).toContain("antipattern.indigo-default");
    expect(ids(`const C = () => <div className={clsx("bg-indigo-500")}/>;`)).toContain("antipattern.indigo-default");
    expect(ids(`const C = () => <div style={{ background: "#667eea" }}/>;`)).toContain("antipattern.indigo-default");
  });
  it("semantic-control: NOT flagged inside a JSX block comment", () => {
    expect(ids(`export const B = () => (\n  <section>\n    {/* <div onClick={h}> */}\n    <span>hi</span>\n  </section>\n);`)).not.toContain("a11y.semantic-control");
  });
  it("semantic-control: NOT flagged inside a line comment", () => {
    expect(ids(`export const B = () => {\n  // legacy: <div onClick={go}>Go</div>\n  return <button type="button" onClick={go}>Go</button>;\n};`)).not.toContain("a11y.semantic-control");
  });
  it("semantic-control: NOT flagged when the tag is written as string text", () => {
    expect(ids(`export const A = () => <pre>{"<div onClick=...>"}</pre>;`)).not.toContain("a11y.semantic-control");
  });
});

describe("vue/svelte templates — the tells transfer", () => {
  const vue = (src: string) => lintContext(buildContext("C.vue", src, "jsx"), rules).map((f) => f.ruleId);
  const svelte = (src: string) => lintContext(buildContext("C.svelte", src, "jsx"), rules).map((f) => f.ruleId);
  it("flags a Vue <div @click> (and v-on:click)", () => {
    expect(vue(`<template><div @click="go">x</div></template>`)).toContain("a11y.semantic-control");
    expect(vue(`<template><div v-on:click="go">x</div></template>`)).toContain("a11y.semantic-control");
  });
  it("flags a Svelte <div on:click>", () => {
    expect(svelte(`<div on:click={go}>x</div>`)).toContain("a11y.semantic-control");
  });
  it("does not flag a real <button @click> or a <Component @click>", () => {
    expect(vue(`<template><button @click="go">x</button></template>`)).not.toContain("a11y.semantic-control");
    expect(vue(`<template><MyBtn @click="go">x</MyBtn></template>`)).not.toContain("a11y.semantic-control");
  });
  it("does not flag a div with a click handler + role (ARIA retrofit)", () => {
    expect(vue(`<template><div role="button" tabindex="0" @click="go">x</div></template>`)).not.toContain("a11y.semantic-control");
  });
  it("catches the indigo tell in a Vue class / :class / style attribute", () => {
    expect(vue(`<template><div class="bg-indigo-500"/></template>`)).toContain("antipattern.indigo-default");
    expect(vue(`<template><div :style="{ background: '#667eea' }"/></template>`)).toContain("antipattern.indigo-default");
  });
  it("a clean Svelte component produces no tells", () => {
    expect(svelte(`<button class="rounded bg-slate-800" on:click={save}>Save</button>`)).toEqual([]);
  });
});

describe("vue/svelte — HTML comments must be masked", () => {
  const vue = (src: string) => lintContext(buildContext("C.vue", src, "jsx"), rules).map((f) => f.ruleId);
  it("does not flag markup commented out with an HTML comment", () => {
    expect(vue(`<template><!-- <div @click="old" class="bg-indigo-500">x</div> --><button @click="go">Go</button></template>`)).toEqual([]);
  });
  it("still flags a live <div @click> next to a commented one", () => {
    expect(vue(`<template><!-- <span @click="a"/> --><div @click="b">x</div></template>`)).toContain("a11y.semantic-control");
  });
});

describe("vue/svelte — handler/role must be attribute NAMES, not string values (review FP+FN)", () => {
  const vue = (src: string) => lintContext(buildContext("C.vue", src, "jsx"), rules).map((f) => f.ruleId);
  const svelte = (src: string) => lintContext(buildContext("C.svelte", src, "jsx"), rules).map((f) => f.ruleId);
  it("does NOT flag @click / on:click appearing inside a quoted attribute value", () => {
    expect(vue(`<template><span title="Email us at hello@click.com">Contact</span></template>`)).not.toContain("a11y.semantic-control");
    expect(vue(`<template><div aria-label="Follow @click for news">Social</div></template>`)).not.toContain("a11y.semantic-control");
    expect(svelte(`<div data-tooltip="test@click.io">hover</div>`)).not.toContain("a11y.semantic-control");
  });
  it("does NOT let a role= inside a string value suppress a real handler (FN)", () => {
    expect(vue(`<template><div title="role=admin" @click="realHandler">x</div></template>`)).toContain("a11y.semantic-control");
  });
  it("still flags real handlers (with modifiers) and still honours a real role attribute", () => {
    expect(vue(`<template><div @click.stop="a">x</div></template>`)).toContain("a11y.semantic-control");
    expect(svelte(`<div on:click|preventDefault={h}>x</div>`)).toContain("a11y.semantic-control");
    expect(vue(`<template><div role="button" tabindex="0" @click="a">x</div></template>`)).not.toContain("a11y.semantic-control");
  });
});

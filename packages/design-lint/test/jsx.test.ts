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

import { describe, it, expect } from "vitest";
import { Linter } from "eslint";
import plugin from "../src/eslint.js";

const linter = new Linter();

function lint(code: string, filename = "C.jsx", opts: unknown[] = []) {
  return linter.verify(
    code,
    [
      {
        files: ["**/*.{js,jsx,ts,tsx}"],
        plugins: { norma: plugin },
        languageOptions: { ecmaVersion: "latest", sourceType: "module", parserOptions: { ecmaFeatures: { jsx: true } } },
        rules: { "norma/design": ["error", ...opts] },
      },
    ],
    { filename },
  );
}

describe("eslint plugin (norma/design)", () => {
  it("flags a <div> with onClick and no role (semantic-control)", () => {
    const m = lint(`const C = () => <div onClick={f}>x</div>;`);
    expect(m.some((x) => x.message.includes("a11y.semantic-control"))).toBe(true);
    expect(m.every((x) => x.ruleId === "norma/design")).toBe(true);
  });

  it("flags the indigo-default tell in className", () => {
    const m = lint(`const C = () => <div className="bg-indigo-500" />;`);
    expect(m.some((x) => x.message.includes("antipattern.indigo-default"))).toBe(true);
  });

  it("passes a semantic <button>", () => {
    const m = lint(`const C = () => <button onClick={f}>ok</button>;`);
    expect(m).toHaveLength(0);
  });

  it("reports the correct line", () => {
    const m = lint(`const A = 1;\nconst C = () => <div onClick={f}>x</div>;`);
    const sc = m.find((x) => x.message.includes("a11y.semantic-control"));
    expect(sc?.line).toBe(2);
  });

  it("honors the vi language option", () => {
    const en = lint(`const C = () => <div onClick={f}>x</div>;`)[0]?.message;
    const vi = lint(`const C = () => <div onClick={f}>x</div>;`, "C.jsx", [{ lang: "vi" }])[0]?.message;
    expect(vi).toBeDefined();
    expect(vi).not.toBe(en);
  });

  it("honors per-rule severity overrides (off)", () => {
    const m = lint(`const C = () => <div className="bg-indigo-500" />;`, "C.jsx", [{ rules: { "antipattern.indigo-default": "off" } }]);
    expect(m.some((x) => x.message.includes("antipattern.indigo-default"))).toBe(false);
  });

  it("does not false-positive on plain JS with no JSX", () => {
    const m = lint(`export const sum = (a, b) => a + b;`, "util.js");
    expect(m).toHaveLength(0);
  });

  it("does not false-positive on `indigo-500` outside a className (href / data-*)", () => {
    const indigo = (code: string) => lint(code).some((x) => x.message.includes("antipattern.indigo-default"));
    expect(indigo(`const C = () => <a href="/blog/indigo-500-apology">read</a>;`)).toBe(false);
    expect(indigo(`const C = () => <div data-track="indigo-500-campaign">x</div>;`)).toBe(false);
    // ...but a real className token is still flagged
    expect(indigo(`const C = () => <div className="bg-indigo-500" />;`)).toBe(true);
  });

  it("still flags the indigo hex anywhere in the tag (style prop)", () => {
    const m = lint(`const C = () => <div style={{ background: "#667eea" }}>x</div>;`);
    expect(m.some((x) => x.message.includes("antipattern.indigo-default"))).toBe(true);
  });
});

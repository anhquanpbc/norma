import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { validateTokens } from "../src/tokens.js";

const realTokens = JSON.parse(
  readFileSync(new URL("../../../standard/tokens.tokens.json", import.meta.url), "utf8"),
);

describe("validateTokens — the shipped standard (dogfood)", () => {
  it("Norma's own tokens.tokens.json is valid with no errors or warnings", () => {
    const res = validateTokens(realTokens);
    expect(res.errors).toEqual([]);
    expect(res.warnings).toEqual([]);
    expect(res.valid).toBe(true);
    expect(res.tokenCount).toBeGreaterThan(40);
  });
  it("the z-index ladder is present as real number tokens", () => {
    expect(realTokens.z.$type).toBe("number");
    expect(realTokens.z.modal.$value).toBe(1400);
    expect(validateTokens(realTokens).valid).toBe(true);
  });
});

describe("validateTokens — DESIGN.md / DTCG-2025.10 interop", () => {
  it("accepts a root $schema pointer + a structured sRGB color object without warning", () => {
    const res = validateTokens({
      $schema: "https://www.designtokens.org/schemas/2025.10/format.json",
      color: { $type: "color", a: { $value: { colorSpace: "srgb", components: [0, 0, 0], hex: "#000000" } } },
    });
    expect(res.warnings).toEqual([]);
    expect(res.errors).toEqual([]);
    expect(res.valid).toBe(true);
  });
});

describe("validateTokens — structure", () => {
  it("rejects a non-object document", () => {
    expect(validateTokens(42).valid).toBe(false);
    expect(validateTokens(null).valid).toBe(false);
    expect(validateTokens([]).valid).toBe(false);
  });
  it("flags a token that also carries child members", () => {
    const res = validateTokens({ g: { $type: "number", $value: 1, child: { $value: 2 } } });
    expect(res.valid).toBe(false);
    expect(res.errors.some((e) => /must not also contain child/.test(e.message))).toBe(true);
  });
  it("flags a token with no resolvable $type", () => {
    const res = validateTokens({ x: { $value: 5 } });
    expect(res.valid).toBe(false);
    expect(res.errors.some((e) => /no \$type/.test(e.message))).toBe(true);
  });
  it("inherits $type from an ancestor group (closest wins)", () => {
    const res = validateTokens({ nums: { $type: "number", a: { $value: 1 }, b: { $value: 2 } } });
    expect(res.valid).toBe(true);
    expect(res.tokenCount).toBe(2);
  });
  it("warns (does not error) on an unknown $-prefixed key", () => {
    const res = validateTokens({ n: { $type: "number", $value: 1, $foo: "x" } });
    expect(res.valid).toBe(true);
    expect(res.warnings.some((w) => /\$foo/.test(w.message))).toBe(true);
  });
  it("rejects a dotted token name (breaks reference addressing)", () => {
    expect(validateTokens({ "a.b": { $type: "number", $value: 1 } }).valid).toBe(false);
  });
  it("caps recursion depth instead of overflowing the stack on hostile input (never-throws)", () => {
    let deep: unknown = { $type: "number", $value: 1 };
    for (let i = 0; i < 5000; i++) deep = { g: deep };
    const res = validateTokens({ root: deep });
    expect(res.valid).toBe(false);
    expect(res.errors.some((e) => /nesting depth/.test(e.message))).toBe(true);
  });
});

describe("validateTokens — value shapes", () => {
  it("number requires a bare number (z-index style)", () => {
    expect(validateTokens({ z: { $type: "number", m: { $value: 1400 } } }).valid).toBe(true);
    expect(validateTokens({ z: { $type: "number", m: { $value: "1400" } } }).valid).toBe(false);
  });
  it("dimension requires an object with a px/rem unit — not a string, not em", () => {
    expect(validateTokens({ s: { $type: "dimension", a: { $value: { value: 8, unit: "px" } } } }).valid).toBe(true);
    expect(validateTokens({ s: { $type: "dimension", a: { $value: "8px" } } }).valid).toBe(false);
    expect(validateTokens({ s: { $type: "dimension", a: { $value: { value: 8, unit: "em" } } } }).valid).toBe(false);
  });
  it("duration requires an ms/s object", () => {
    expect(validateTokens({ d: { $type: "duration", a: { $value: { value: 300, unit: "ms" } } } }).valid).toBe(true);
    expect(validateTokens({ d: { $type: "duration", a: { $value: { value: 300, unit: "px" } } } }).valid).toBe(false);
  });
  it("fontFamily accepts a string or a non-empty string array", () => {
    expect(validateTokens({ f: { $type: "fontFamily", a: { $value: "Inter" } } }).valid).toBe(true);
    expect(validateTokens({ f: { $type: "fontFamily", a: { $value: ["Inter", "sans-serif"] } } }).valid).toBe(true);
    expect(validateTokens({ f: { $type: "fontFamily", a: { $value: [] } } }).valid).toBe(false);
    expect(validateTokens({ f: { $type: "fontFamily", a: { $value: [1] } } }).valid).toBe(false);
  });
  it("cubicBezier needs 4 numbers with x-coordinates in [0,1]", () => {
    expect(validateTokens({ c: { $type: "cubicBezier", a: { $value: [0.2, 0, 0, 1] } } }).valid).toBe(true);
    expect(validateTokens({ c: { $type: "cubicBezier", a: { $value: [0, 0, 1] } } }).valid).toBe(false);
    expect(validateTokens({ c: { $type: "cubicBezier", a: { $value: [1.5, 0, 0, 1] } } }).valid).toBe(false);
  });
  it("color accepts oklch()/hex, rejects a bare CSS keyword (Norma profile)", () => {
    expect(validateTokens({ c: { $type: "color", a: { $value: "oklch(0.58 0.16 252)" } } }).valid).toBe(true);
    expect(validateTokens({ c: { $type: "color", a: { $value: "#1a2b3c" } } }).valid).toBe(true);
    expect(validateTokens({ c: { $type: "color", a: { $value: "rebeccapurple" } } }).valid).toBe(false);
  });
  it("flags an unknown $type as an error", () => {
    expect(validateTokens({ c: { $type: "colour", a: { $value: "x" } } }).valid).toBe(false);
  });
});

describe("validateTokens — aliases", () => {
  it("resolves a valid alias", () => {
    const res = validateTokens({ color: { $type: "color", base: { $value: "oklch(0.58 0.16 252)" }, link: { $value: "{color.base}" } } });
    expect(res.valid).toBe(true);
  });
  it("flags a dangling alias", () => {
    const res = validateTokens({ color: { $type: "color", link: { $value: "{color.missing}" } } });
    expect(res.valid).toBe(false);
    expect(res.errors.some((e) => /does not resolve/.test(e.message))).toBe(true);
  });
  it("detects an alias reference cycle", () => {
    const res = validateTokens({ g: { $type: "number", a: { $value: "{g.b}" }, b: { $value: "{g.a}" } } });
    expect(res.valid).toBe(false);
    expect(res.errors.some((e) => /cycle/.test(e.message))).toBe(true);
  });
  it("flags an alias whose resolved type conflicts with a declared $type", () => {
    const res = validateTokens({
      color: { $type: "color", base: { $value: "oklch(0.58 0.16 252)" } },
      space: { $type: "dimension", weird: { $type: "dimension", $value: "{color.base}" } },
    });
    expect(res.valid).toBe(false);
    expect(res.errors.some((e) => /alias resolves to type/.test(e.message))).toBe(true);
  });
  it("does NOT flag a redundant matching $type on an alias token", () => {
    const res = validateTokens({ color: { $type: "color", ink: { $value: "oklch(0.2 0 0)" }, text: { $value: "{color.ink}", $type: "color" } } });
    expect(res.valid).toBe(true);
  });
});

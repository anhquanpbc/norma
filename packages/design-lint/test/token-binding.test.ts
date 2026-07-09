import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { buildContext } from "../src/parse.js";
import { lintContext } from "../src/engine.js";
import { loadRules } from "../src/loadRules.js";
import { colorTokenIndex, normColor } from "../src/tokens.js";

const doc = JSON.parse(readFileSync(new URL("../../../standard/tokens.tokens.json", import.meta.url), "utf8"));
const tokenIndex = colorTokenIndex(doc);
const { rules } = loadRules();
const tbRules = rules.filter((r) => r.check.type === "tokenBinding");

function lint(css: string, tokens: Map<string, string> | undefined = tokenIndex): string[] {
  const ctx = buildContext("x.css", css, "css", tokens);
  return lintContext(ctx, tbRules).map((f) => f.message.en);
}

describe("colorTokenIndex", () => {
  it("maps concrete color token values → paths and skips aliases", () => {
    expect(tokenIndex.get(normColor("oklch(0.58 0.16 252)"))).toBe("color.brand.azure");
    expect([...tokenIndex.values()]).not.toContain("color.text.link"); // an alias token — skipped
    expect(tokenIndex.size).toBeGreaterThan(20);
  });
});

describe("tokenBinding check", () => {
  it("catalog ships the rule (CONV/warn)", () => {
    expect(tbRules).toHaveLength(1);
    expect(tbRules[0].id).toBe("tokens.token-binding");
    expect(tbRules[0].severity).toBe("warn");
  });

  it("flags a raw oklch that duplicates a color token, naming the token path", () => {
    const m = lint(`.a { color: oklch(0.58 0.16 252); }`);
    expect(m).toHaveLength(1);
    expect(m[0]).toContain("color.brand.azure");
  });

  it("does not flag var() references or non-matching colors", () => {
    expect(lint(`.a { color: var(--azure); background: oklch(0.99 0 0); }`)).toHaveLength(0);
  });

  it("ignores custom-property definitions (the token file itself)", () => {
    expect(lint(`:root { --azure: oklch(0.58 0.16 252); }`)).toHaveLength(0);
  });

  it("normalizes whitespace when matching", () => {
    expect(lint(`.a { color: oklch(  0.58   0.16 252 ); }`)).toHaveLength(1);
  });

  it("matches a hex token value, case-insensitively", () => {
    const ctx = buildContext("x.css", `.a { color: #1A2B3C; }`, "css", new Map([["#1a2b3c", "color.x"]]));
    expect(lintContext(ctx, tbRules).some((f) => f.message.en.includes("color.x"))).toBe(true);
  });

  it("is inert without a token file", () => {
    // buildContext with no tokens arg → ctx.tokens undefined → the check no-ops.
    const ctx = buildContext("x.css", `.a { color: oklch(0.58 0.16 252); }`, "css");
    expect(lintContext(ctx, tbRules)).toHaveLength(0);
  });

  it("respects norma-disable", () => {
    expect(lint(`/* norma-disable tokens.token-binding */\n.a { color: oklch(0.58 0.16 252); }`)).toHaveLength(0);
  });

  it("does not flag color literals inside strings, url(), or data URIs", () => {
    const hex = new Map([["#a1b2c3", "color.brand"]]);
    const clean = (css: string) => lintContext(buildContext("x.css", css, "css", hex), tbRules);
    expect(clean(`.a::before { content: "#a1b2c3"; }`)).toHaveLength(0);
    expect(clean(`.a { background: url(#a1b2c3); }`)).toHaveLength(0);
    expect(clean(`.a { fill: url(#a1b2c3); }`)).toHaveLength(0);
    expect(clean(`.a { background: url("data:image/svg+xml,<rect fill='#a1b2c3'/>"); }`)).toHaveLength(0);
    // ...but a bare color literal in a real value position still fires
    expect(clean(`.a { color: #a1b2c3; }`)).toHaveLength(1);
  });

  it("does not flag an oklch string shown as text content (shipped oklch config)", () => {
    expect(lint(`.a::before { content: "oklch(0.58 0.16 252)"; }`)).toHaveLength(0);
  });
});

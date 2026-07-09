import { describe, it, expect } from "vitest";
import stylelint from "stylelint";
import normaPlugin from "../src/stylelint.js";

type Cfg = Parameters<typeof stylelint.lint>[0]["config"];
const base: Cfg = { plugins: [normaPlugin], rules: { "norma/design": true } };

async function warnings(code: string, config: Cfg = base) {
  const { results } = await stylelint.lint({ code, config });
  return results[0].warnings;
}

describe("stylelint plugin (norma/design)", () => {
  it("flags a CSS-family Norma violation (physical property) tagged with the ruleId", async () => {
    const w = await warnings(`.x { margin-left: 8px; }`);
    expect(w.length).toBeGreaterThan(0);
    expect(w.some((x) => x.text.includes("i18n.logical-properties"))).toBe(true);
    expect(w.every((x) => x.rule === "norma/design")).toBe(true);
  });

  it("flags a raw high z-index", async () => {
    const w = await warnings(`.y { z-index: 9999; }`);
    expect(w.some((x) => x.text.includes("tokens.zindex-scale"))).toBe(true);
  });

  it("reports the correct line", async () => {
    const w = await warnings(`.a { color: blue; }\n\n.y { z-index: 9999; }`);
    const z = w.find((x) => x.text.includes("tokens.zindex-scale"));
    expect(z?.line).toBe(3);
  });

  it("passes clean CSS with no warnings", async () => {
    const w = await warnings(`.a { display: flex; gap: 8px; }`);
    expect(w).toHaveLength(0);
  });

  it("maps an error-severity finding to Stylelint 'error'", async () => {
    const w = await warnings(`.z { color: #888; background-color: #fff; }`);
    const contrast = w.find((x) => x.text.includes("color.contrast.text"));
    expect(contrast).toBeDefined();
    expect(contrast?.severity).toBe("error");
  });

  it("honors the vi language option", async () => {
    const w = await warnings(`.y { z-index: 9999; }`, { plugins: [normaPlugin], rules: { "norma/design": [true, { lang: "vi" }] } });
    expect(w.some((x) => /tránh giá trị cao/.test(x.text))).toBe(true);
  });

  it("honors per-rule severity overrides", async () => {
    const off: Cfg = { plugins: [normaPlugin], rules: { "norma/design": [true, { rules: { "color.contrast.text": "off" } }] } };
    const w = await warnings(`.z { color: #888; background-color: #fff; }`, off);
    expect(w.some((x) => x.text.includes("color.contrast.text"))).toBe(false);
  });

  it("does nothing when the rule is disabled (false)", async () => {
    const w = await warnings(`.y { z-index: 9999; }`, { plugins: [normaPlugin], rules: { "norma/design": false } });
    expect(w).toHaveLength(0);
  });

  it("lints SCSS (postcss-scss) instead of silently passing", async () => {
    // Regression: the plugin must lint Stylelint's parsed root, not re-parse raw text with the default
    // CSS parser (which throws on //-comments and $vars, and would silently enforce nothing).
    const scss = `// tokens\n$brand: #ff3366;\n.card { margin-left: 12px; z-index: 9999; }`;
    const { results } = await stylelint.lint({
      code: scss,
      customSyntax: "postcss-scss",
      config: { plugins: [normaPlugin], rules: { "norma/design": true } },
    });
    const w = results[0].warnings;
    expect(results[0].parseErrors).toHaveLength(0);
    expect(w.some((x) => x.text.includes("i18n.logical-properties"))).toBe(true);
    expect(w.some((x) => x.text.includes("tokens.zindex-scale"))).toBe(true);
  });
});

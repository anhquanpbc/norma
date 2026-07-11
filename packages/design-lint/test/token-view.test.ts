import { describe, it, expect } from "vitest";
import { resolveTokens, formatCssValue, varName, loadTokenView } from "../src/token-view.js";

describe("token-view — resolveTokens", () => {
  it("formats concrete values and keeps aliases as var() with a resolved concrete", () => {
    const doc = {
      color: {
        $type: "color",
        ink: { "1": { $value: "oklch(0.2 0.02 258)", $description: "Primary text." } },
        text: { primary: { $value: "{color.ink.1}" } },
      },
      space: { $type: "dimension", "1": { $value: { value: 4, unit: "px" } } },
    };
    const v = resolveTokens(doc);

    const ink = v.tokens.find((t) => t.path === "color.ink.1")!;
    expect(ink).toMatchObject({ name: "--color-ink-1", type: "color", value: "oklch(0.2 0.02 258)", description: "Primary text." });
    expect(ink.resolved).toBeUndefined(); // concrete token → no separate resolved

    const prim = v.tokens.find((t) => t.path === "color.text.primary")!;
    expect(prim.value).toBe("var(--color-ink-1)"); // alias kept as a var() reference
    expect(prim.resolved).toBe("oklch(0.2 0.02 258)"); // + the concrete value it points at

    expect(v.tokens.find((t) => t.path === "space.1")!.value).toBe("4px");
  });

  it("builds the theme role map from $extensions.org.norma.themes", () => {
    const doc = {
      $extensions: {
        "org.norma.themes": {
          $description: "ignored",
          light: { text: "{color.ink.1}" },
          dark: { text: "{color.dark.ink.1}" },
        },
      },
      color: {
        $type: "color",
        ink: { "1": { $value: "oklch(0.2 0 0)" } },
        dark: { ink: { "1": { $value: "oklch(0.93 0 0)" } } },
      },
    };
    const v = resolveTokens(doc);
    expect(v.themes.light.text).toEqual({ token: "color.ink.1", name: "--color-ink-1", value: "oklch(0.2 0 0)" });
    expect(v.themes.dark.text.value).toBe("oklch(0.93 0 0)");
  });

  it("is defensive: a non-object doc, a dangling alias, and a cycle never throw", () => {
    expect(resolveTokens(null)).toEqual({ tokens: [], themes: {} });

    const dangling = resolveTokens({ c: { $type: "color", a: { $value: "{c.missing}" } } });
    expect(dangling.tokens[0].value).toBe("var(--c-missing)");
    expect(dangling.tokens[0].resolved).toBeUndefined();

    const cyclic = resolveTokens({ c: { $type: "color", a: { $value: "{c.b}" }, b: { $value: "{c.a}" } } });
    expect(cyclic.tokens.find((t) => t.path === "c.a")!.resolved).toBeUndefined();
  });

  it("formatCssValue handles every Norma token type; varName maps a path", () => {
    expect(varName(["z", "modal"])).toBe("--z-modal");
    expect(formatCssValue({ value: 16, unit: "rem" }, "dimension")).toBe("16rem");
    expect(formatCssValue({ value: 200, unit: "ms" }, "duration")).toBe("200ms");
    expect(formatCssValue(1400, "number")).toBe("1400");
    expect(formatCssValue(["a b", "c"], "fontFamily")).toBe('"a b", c');
    expect(formatCssValue("mono", "fontFamily")).toBe("mono");
    expect(formatCssValue([0.2, 0, 0, 1], "cubicBezier")).toBe("cubic-bezier(0.2, 0, 0, 1)");
    expect(() => formatCssValue({}, "color")).toThrow();
  });

  it("loadTokenView resolves the real bundled/standard tokens end to end", () => {
    const v = loadTokenView();
    expect(v).not.toBeNull();
    expect(v!.tokens.length).toBeGreaterThan(50);
    expect(v!.themes.light.brand.name).toBe("--color-brand-azure");
    // the brand hue is a concrete oklch token
    expect(v!.tokens.find((t) => t.path === "color.brand.azure")!.value).toMatch(/^oklch\(/);
    // color.text.link is an alias → var() + concrete
    const link = v!.tokens.find((t) => t.path === "color.text.link")!;
    expect(link.value).toBe("var(--color-brand-azure-ink)");
    expect(link.resolved).toMatch(/^oklch\(/);
  });
});

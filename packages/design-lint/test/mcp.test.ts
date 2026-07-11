import { describe, it, expect } from "vitest";
import { handleRpc, callTool, type Catalog } from "../src/mcp.js";
import { loadRules } from "../src/loadRules.js";
import { loadTokenView } from "../src/token-view.js";

const catalog = loadRules() as Catalog;
const tokenView = loadTokenView();

describe("MCP — JSON-RPC surface", () => {
  it("initialize returns the protocol version + server info", () => {
    const res = handleRpc({ jsonrpc: "2.0", id: 1, method: "initialize", params: {} }, catalog) as any;
    expect(res.result.protocolVersion).toBe("2024-11-05");
    expect(res.result.serverInfo.name).toBe("norma-design-lint");
    expect(res.result.capabilities.tools).toBeDefined();
  });
  it("tools/list advertises the six tools", () => {
    const res = handleRpc({ jsonrpc: "2.0", id: 2, method: "tools/list" }, catalog) as any;
    expect(res.result.tools.map((t: any) => t.name).sort()).toEqual(["fix_source", "get_rule", "get_tokens", "lint_source", "list_rules", "validate_tokens"]);
    for (const t of res.result.tools) expect(t.inputSchema.type).toBe("object");
  });
  it("a notification gets no reply", () => {
    expect(handleRpc({ jsonrpc: "2.0", method: "notifications/initialized" }, catalog)).toBeNull();
  });
  it("an unknown method returns JSON-RPC error -32601", () => {
    const res = handleRpc({ jsonrpc: "2.0", id: 3, method: "does/notexist" }, catalog) as any;
    expect(res.error.code).toBe(-32601);
  });
});

describe("MCP — tools", () => {
  it("lint_source reports a violation and counts", () => {
    const r = callTool("lint_source", { source: `<a href="/x" tabindex="3">x</a>`, type: "html" }, catalog);
    expect(r.isError).toBe(false);
    const payload = JSON.parse(r.content[0].text);
    expect(payload.findings.map((f: any) => f.ruleId)).toContain("a11y.no-positive-tabindex");
    expect(payload.standardVersion).toBe(catalog.version);
  });
  it("lint_source lints CSS and JSX too", () => {
    expect(JSON.parse(callTool("lint_source", { source: `.x{ margin-left:8px }`, type: "css" }, catalog).content[0].text).findings.length).toBeGreaterThan(0);
    expect(JSON.parse(callTool("lint_source", { source: `const C=()=><div className="bg-indigo-500"/>;`, type: "jsx" }, catalog).content[0].text).findings.map((f: any) => f.ruleId)).toContain("antipattern.indigo-default");
  });
  it("lint_source rejects a bad type", () => {
    const r = callTool("lint_source", { source: "x", type: "python" }, catalog);
    expect(r.isError).toBe(true);
  });
  it("list_rules filters by domain and tag", () => {
    const all = JSON.parse(callTool("list_rules", {}, catalog).content[0].text);
    expect(all.count).toBe(catalog.rules.length);
    const spec = JSON.parse(callTool("list_rules", { tag: "SPEC" }, catalog).content[0].text);
    expect(spec.rules.every((r: any) => r.tag === "SPEC")).toBe(true);
    const a11y = JSON.parse(callTool("list_rules", { domain: "a11y" }, catalog).content[0].text);
    expect(a11y.rules.every((r: any) => r.domain === "a11y")).toBe(true);
  });
  it("get_rule returns a rule, or an error for an unknown id", () => {
    const good = callTool("get_rule", { id: "a11y.target-size" }, catalog);
    expect(good.isError).toBe(false);
    expect(JSON.parse(good.content[0].text).id).toBe("a11y.target-size");
    expect(callTool("get_rule", { id: "a11y.nope" }, catalog).isError).toBe(true);
  });
  it("validate_tokens validates a token string and rejects bad input", () => {
    const good = callTool("validate_tokens", { tokens: `{"c":{"$type":"color","a":{"$value":"oklch(0.5 0.1 250)"}}}` }, catalog);
    expect(good.isError).toBe(false);
    expect(JSON.parse(good.content[0].text).valid).toBe(true);
    expect(callTool("validate_tokens", { tokens: "{not json" }, catalog).isError).toBe(true);
    expect(callTool("validate_tokens", { tokens: 42 }, catalog).isError).toBe(true);
  });
  it("validate_tokens never throws on hostile deeply-nested input", () => {
    // Build the payload as a STRING (JSON.stringify would itself overflow at this depth) — which is also
    // exactly how a hostile request arrives at the MCP boundary. callTool must return, not crash.
    let s = `{"$type":"number","$value":1}`;
    for (let i = 0; i < 8000; i++) s = `{"g":${s}}`;
    const r = callTool("validate_tokens", { tokens: s }, catalog);
    expect(r.isError).toBe(false);
    expect(JSON.parse(r.content[0].text).valid).toBe(false);
  });
  it("get_tokens returns the resolved palette + themes, and errors without a token catalog", () => {
    const r = callTool("get_tokens", {}, catalog, tokenView);
    expect(r.isError).toBe(false);
    const p = JSON.parse(r.content[0].text);
    expect(p.standardVersion).toBe(catalog.version);
    expect(p.count).toBeGreaterThan(0);
    const brand = p.tokens.find((t: any) => t.path === "color.brand.azure");
    expect(brand.name).toBe("--color-brand-azure");
    expect(brand.value).toMatch(/^oklch\(/);
    const link = p.tokens.find((t: any) => t.path === "color.text.link");
    expect(link.value).toBe("var(--color-brand-azure-ink)"); // alias kept as var()
    expect(link.resolved).toMatch(/^oklch\(/); // + concrete
    expect(p.themes.light.text.name).toBe("--color-ink-1");
    expect(p.themes.dark.surface.name).toBe("--color-dark-surface-1");
    expect(p.skipped).toEqual([]); // the standard's tokens all render cleanly
    // No token catalog available → graceful error, not a crash.
    expect(callTool("get_tokens", {}, catalog, null).isError).toBe(true);
  });
  it("get_tokens filters by group and rejects an unknown group", () => {
    const colors = JSON.parse(callTool("get_tokens", { group: "color" }, catalog, tokenView).content[0].text);
    expect(colors.tokens.length).toBeGreaterThan(0);
    expect(colors.tokens.every((t: any) => t.path.startsWith("color."))).toBe(true);
    expect(colors.count).toBeLessThan(tokenView!.tokens.length);
    expect(callTool("get_tokens", { group: "nope" }, catalog, tokenView).isError).toBe(true);
  });
});

import { describe, it, expect } from "vitest";
import { handleLine, type Catalog } from "../src/mcp.js";
import { loadRules } from "../src/loadRules.js";

const catalog = loadRules() as Catalog;
const rpc = (o: object) => handleLine(JSON.stringify(o), catalog);

describe("mcp handleLine — the stdio transport loop", () => {
  it("returns null for a blank line (no reply)", () => {
    expect(handleLine("   ", catalog)).toBeNull();
  });

  it("replies -32700 Parse error to a malformed line (id null) — does not throw", () => {
    const r = JSON.parse(handleLine("{ not json", catalog)!);
    expect(r.error.code).toBe(-32700);
    expect(r.id).toBeNull();
  });

  it("answers initialize with the protocol version and echoes the id", () => {
    const r = JSON.parse(rpc({ jsonrpc: "2.0", id: 1, method: "initialize" })!);
    expect(r.result.protocolVersion).toBeTruthy();
    expect(r.id).toBe(1);
  });

  it("returns null for a notification (no reply)", () => {
    expect(rpc({ jsonrpc: "2.0", method: "notifications/initialized" })).toBeNull();
  });

  it("returns -32601 Method not found for an unknown method with an id", () => {
    const r = JSON.parse(rpc({ jsonrpc: "2.0", id: 2, method: "does-not-exist" })!);
    expect(r.error.code).toBe(-32601);
  });

  it("converts a thrown handler into a -32603 Internal error — the server stays up", () => {
    // A structurally-broken catalog makes callTool throw (rules.filter on null); the loop must turn that
    // into a JSON-RPC error frame, never an uncaught exception that would kill the long-lived stdio server.
    const broken = { version: "x", rules: null } as unknown as Catalog;
    const out = handleLine(JSON.stringify({ jsonrpc: "2.0", id: 3, method: "tools/call", params: { name: "list_rules", arguments: {} } }), broken);
    const r = JSON.parse(out!);
    expect(r.error.code).toBe(-32603);
    expect(r.id).toBe(3);
  });
});

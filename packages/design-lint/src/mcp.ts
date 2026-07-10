#!/usr/bin/env node
// A zero-dependency Model Context Protocol server over stdio, so an AI agent can query the Norma rule
// catalog and lint source directly. Implements the minimal MCP server surface (initialize / tools/list /
// tools/call) as newline-delimited JSON-RPC 2.0 — no SDK, matching the project's dependency minimalism.
import { createInterface } from "node:readline";
import { isMainModule } from "./is-main.js";
import { loadRules } from "./loadRules.js";
import { buildContext } from "./parse.js";
import { lintContext } from "./engine.js";
import { fixSource } from "./fix.js";
import { validateTokens } from "./tokens.js";
import type { FileType, Rule } from "./types.js";

const PROTOCOL_VERSION = "2024-11-05";

interface Rpc { jsonrpc?: string; id?: string | number | null; method?: string; params?: Record<string, unknown>; }
type RpcResult = { jsonrpc: "2.0"; id: string | number | null; result: unknown };
type RpcError = { jsonrpc: "2.0"; id: string | number | null; error: { code: number; message: string } };

const ok = (id: Rpc["id"], result: unknown): RpcResult => ({ jsonrpc: "2.0", id: id ?? null, result });
const err = (id: Rpc["id"], code: number, message: string): RpcError => ({ jsonrpc: "2.0", id: id ?? null, error: { code, message } });
const text = (payload: unknown, isError = false) => ({ content: [{ type: "text", text: typeof payload === "string" ? payload : JSON.stringify(payload, null, 2) }], isError });

const TOOLS = [
  {
    name: "lint_source",
    description: "Lint an HTML, CSS, or JSX/TSX source string against the Norma design standard. Returns the findings (ruleId, severity, line, message) as JSON.",
    inputSchema: {
      type: "object",
      properties: {
        source: { type: "string", description: "The raw HTML, CSS, or JSX/TSX to lint." },
        type: { type: "string", enum: ["html", "css", "jsx"], description: "Which parser to use." },
      },
      required: ["source", "type"],
    },
  },
  {
    name: "list_rules",
    description: "List the Norma rule catalog (id, domain, tag, severity, title). Optionally filter by domain or tag.",
    inputSchema: {
      type: "object",
      properties: {
        domain: { type: "string", description: "Filter to one domain, e.g. a11y, color, responsive." },
        tag: { type: "string", enum: ["SPEC", "CONV"], description: "Filter to published mandates (SPEC) or conventions (CONV)." },
      },
    },
  },
  {
    name: "get_rule",
    description: "Get one Norma rule by id (e.g. a11y.target-size), including its rationale, source and remediation.",
    inputSchema: {
      type: "object",
      properties: { id: { type: "string", description: "The rule id, e.g. color.contrast.text." } },
      required: ["id"],
    },
  },
  {
    name: "fix_source",
    description: "Auto-fix the deterministic Norma rules in an HTML or CSS source string (physical→logical CSS properties, a positive tabindex→0, rel=noopener on an external target=_blank link). Returns the fixed source and the number of edits; everything needing a human decision (contrast, labels, alt text…) is left untouched. Re-run lint_source on the output to see what remains.",
    inputSchema: {
      type: "object",
      properties: {
        source: { type: "string", description: "The raw HTML or CSS to fix." },
        type: { type: "string", enum: ["html", "css"], description: "Which fixer to use." },
      },
      required: ["source", "type"],
    },
  },
  {
    name: "validate_tokens",
    description: "Validate a W3C DTCG design-token JSON string against the Norma profile (DTCG structure + Norma's CSS oklch() color convention): $type inheritance, group-vs-token, per-type value shapes, and alias reference integrity. Returns { valid, tokenCount, errors, warnings } where each problem is { path, message }.",
    inputSchema: {
      type: "object",
      properties: {
        tokens: { type: "string", description: "The DTCG token file contents as a JSON string." },
      },
      required: ["tokens"],
    },
  },
];

export interface Catalog { version: string; rules: Rule[]; }

/** Execute a tool call. Pure — validates its own arguments at the boundary and never throws. */
export function callTool(name: string, args: Record<string, unknown>, catalog: Catalog): ReturnType<typeof text> {
  if (name === "lint_source") {
    const source = args.source;
    const type = args.type;
    if (typeof source !== "string") return text('Invalid "source": expected a string.', true);
    if (type !== "html" && type !== "css" && type !== "jsx") return text('Invalid "type": expected "html", "css", or "jsx".', true);
    const findings = lintContext(buildContext(`source.${type}`, source, type as FileType), catalog.rules);
    return text({
      standardVersion: catalog.version,
      errorCount: findings.filter((f) => f.severity === "error").length,
      warnCount: findings.filter((f) => f.severity === "warn").length,
      findings: findings.map((f) => ({ ruleId: f.ruleId, severity: f.severity, line: f.line, message: f.message.en })),
    });
  }
  if (name === "list_rules") {
    const domain = typeof args.domain === "string" ? args.domain : undefined;
    const tag = args.tag === "SPEC" || args.tag === "CONV" ? args.tag : undefined;
    const rules = catalog.rules
      .filter((r) => (!domain || r.domain === domain) && (!tag || r.tag === tag))
      .map((r) => ({ id: r.id, domain: r.domain, tag: r.tag, severity: r.severity, title: r.title.en }));
    return text({ standardVersion: catalog.version, count: rules.length, rules });
  }
  if (name === "get_rule") {
    if (typeof args.id !== "string") return text('Invalid "id": expected a string.', true);
    const rule = catalog.rules.find((r) => r.id === args.id);
    if (!rule) return text(`No rule with id "${args.id}". Use list_rules to see all ${catalog.rules.length} ids.`, true);
    return text(rule);
  }
  if (name === "fix_source") {
    const source = args.source;
    const type = args.type;
    if (typeof source !== "string") return text('Invalid "source": expected a string.', true);
    if (type !== "html" && type !== "css") return text('Invalid "type": expected "html" or "css".', true);
    const { output, fixed } = fixSource(source, type as FileType);
    return text({ fixed, output });
  }
  if (name === "validate_tokens") {
    const src = args.tokens;
    if (typeof src !== "string") return text('Invalid "tokens": expected a JSON string.', true);
    let doc: unknown;
    try { doc = JSON.parse(src); }
    catch (e) { return text(`Invalid "tokens" JSON: ${(e as Error).message}`, true); }
    return text(validateTokens(doc));
  }
  return text(`Unknown tool "${name}".`, true);
}

/** Handle one JSON-RPC message. Returns a response, or null for notifications (which get no reply). */
export function handleRpc(msg: Rpc, catalog: Catalog): RpcResult | RpcError | null {
  const { id, method } = msg;
  if (method === "initialize") {
    return ok(id, { protocolVersion: PROTOCOL_VERSION, capabilities: { tools: {} }, serverInfo: { name: "norma-design-lint", version: catalog.version } });
  }
  if (method === "ping") return ok(id, {});
  if (method === "tools/list") return ok(id, { tools: TOOLS });
  if (method === "tools/call") {
    const params = msg.params ?? {};
    const name = typeof params.name === "string" ? params.name : "";
    const args = (params.arguments && typeof params.arguments === "object" ? params.arguments : {}) as Record<string, unknown>;
    return ok(id, callTool(name, args, catalog));
  }
  if (typeof method === "string" && method.startsWith("notifications/")) return null; // notification → no reply
  if (id === undefined || id === null) return null; // any other notification
  return err(id, -32601, `Method not found: ${method}`);
}

/**
 * Handle one line of stdin: parse + dispatch, returning the JSON response line to write, or null for a
 * blank line or a notification (which gets no reply). A malformed line (-32700) or a thrown handler
 * (-32603) becomes a JSON-RPC error frame — a single bad request must never take down the long-lived
 * stdio server. Extracted from the readline loop so the transport can be unit-tested directly.
 */
export function handleLine(line: string, catalog: Catalog): string | null {
  const trimmed = line.trim();
  if (!trimmed) return null;
  let msg: Rpc;
  try { msg = JSON.parse(trimmed) as Rpc; }
  catch { return JSON.stringify(err(null, -32700, "Parse error")); }
  let res: RpcResult | RpcError | null;
  try { res = handleRpc(msg, catalog); }
  catch (e) { res = err(msg.id ?? null, -32603, `Internal error: ${(e as Error).message}`); }
  return res ? JSON.stringify(res) : null;
}

function main(): void {
  const catalog = loadRules() as Catalog;
  const rl = createInterface({ input: process.stdin });
  rl.on("line", (line) => {
    const out = handleLine(line, catalog);
    if (out !== null) process.stdout.write(out + "\n");
  });
}

if (isMainModule(import.meta.url)) main();

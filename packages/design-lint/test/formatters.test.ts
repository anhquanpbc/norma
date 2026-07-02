import { describe, it, expect } from "vitest";
import Ajv from "ajv";
import { stylish, json, sarif } from "../src/formatters.js";
import type { LintResult } from "../src/index.js";

const res: LintResult = {
  version: "1.0.0",
  fileCount: 1,
  errorCount: 1,
  warnCount: 1,
  findings: [
    { ruleId: "color.contrast.text", severity: "error", file: process.cwd() + "/a.html", line: 5, message: { en: "low contrast", vi: "tương phản thấp" } },
    { ruleId: "perf.img-dimensions", severity: "warn", file: process.cwd() + "/a.html", line: 9, message: { en: "no dimensions", vi: "thiếu kích thước" } },
  ],
};

// Focused SARIF 2.1.0 structural schema — enough to catch a malformed report before CI uploads it.
const SARIF_SCHEMA = {
  type: "object",
  required: ["version", "runs"],
  properties: {
    version: { const: "2.1.0" },
    runs: {
      type: "array",
      minItems: 1,
      items: {
        type: "object",
        required: ["tool", "results"],
        properties: {
          tool: {
            type: "object",
            required: ["driver"],
            properties: {
              driver: {
                type: "object",
                required: ["name", "rules"],
                properties: { name: { type: "string" }, rules: { type: "array" } },
              },
            },
          },
          results: {
            type: "array",
            items: {
              type: "object",
              required: ["ruleId", "level", "message", "locations"],
              properties: {
                ruleId: { type: "string" },
                level: { enum: ["error", "warning", "note", "none"] },
                message: { type: "object", required: ["text"], properties: { text: { type: "string" } } },
                locations: {
                  type: "array",
                  minItems: 1,
                  items: {
                    type: "object",
                    required: ["physicalLocation"],
                    properties: {
                      physicalLocation: { type: "object", required: ["artifactLocation", "region"] },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  },
};

describe("formatters", () => {
  it("stylish summarizes counts in EN and VI", () => {
    expect(stylish(res, "en")).toContain("1 errors, 1 warnings");
    expect(stylish(res, "vi")).toContain("1 lỗi, 1 cảnh báo");
  });

  it("stylish reports a clean result", () => {
    const clean: LintResult = { ...res, findings: [], errorCount: 0, warnCount: 0 };
    expect(stylish(clean, "en")).toContain("No violations");
  });

  it("json round-trips the result", () => {
    expect(JSON.parse(json(res)).errorCount).toBe(1);
  });

  it("sarif validates against the SARIF 2.1.0 schema", () => {
    const doc = JSON.parse(sarif(res));
    const validate = new Ajv({ allErrors: true }).compile(SARIF_SCHEMA);
    validate(doc);
    expect(validate.errors ?? []).toEqual([]);
  });

  it("sarif maps severities and preserves line numbers", () => {
    const { runs } = JSON.parse(sarif(res));
    expect(runs[0].results.map((r: { level: string }) => r.level)).toEqual(["error", "warning"]);
    expect(runs[0].results[0].locations[0].physicalLocation.region.startLine).toBe(5);
  });
});

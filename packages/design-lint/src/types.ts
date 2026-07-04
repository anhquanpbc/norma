import type { HTMLElement } from "node-html-parser";
import type { Root } from "postcss";

export type Severity = "error" | "warn" | "off";
export type FileType = "html" | "css" | "jsx";

export interface I18n { en: string; vi: string; }

export interface Rule {
  id: string;
  tag: "SPEC" | "CONV";
  severity: Severity;
  domain: string;
  title: I18n;
  source: string;
  source_url?: string;
  rationale: I18n;
  remediation: I18n;
  check: { type: string; [k: string]: unknown };
}

export interface Finding {
  ruleId: string;
  severity: "error" | "warn";
  file: string;
  line: number;
  column?: number;
  message: I18n;
}

export interface CssBlock {
  root: Root;
  /** 1-based line in the file where this CSS block's first line lives. */
  startLine: number;
}

export interface FileContext {
  file: string;
  type: FileType;
  source: string;
  /** Parsed DOM for HTML inputs. */
  dom?: HTMLElement;
  /** All CSS blocks: standalone file, or every <style> in an HTML file. */
  css: CssBlock[];
  /** All CSS custom properties declared anywhere in the file: name -> raw value. */
  vars: Map<string, string>;
}

/** A check receives the file context and the active rules that use its check.type. */
export type Check = (ctx: FileContext, rules: Rule[]) => Finding[];

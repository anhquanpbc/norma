// culori ships no type declarations; we only use parse() and wcagContrast().
declare module "culori" {
  export function parse(color: string): { alpha?: number; [k: string]: unknown } | undefined;
  export function wcagContrast(a: unknown, b: unknown): number;
}

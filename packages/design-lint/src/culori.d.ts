// culori ships no type declarations; we only use parse(), wcagContrast() and rgb().
declare module "culori" {
  export function parse(color: string): { alpha?: number; [k: string]: unknown } | undefined;
  export function wcagContrast(a: unknown, b: unknown): number;
  export function rgb(color: unknown): { mode: "rgb"; r: number; g: number; b: number; alpha?: number } | undefined;
}

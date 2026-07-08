import { describe, it, expect } from "vitest";
import { mkdtempSync, writeFileSync, symlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { isMainModule } from "../src/is-main.js";

// Guards the `npx norma-design-lint` / installed-bin regression: the old raw-URL check treated a
// symlinked bin as "not main", so the CLI silently no-op'd and exited 0.
describe("isMainModule (bin / npx entrypoint detection)", () => {
  const saved = process.argv[1];
  const restore = () => { process.argv[1] = saved; };

  it("recognises the module as main when launched via a symlinked bin", () => {
    const dir = mkdtempSync(join(tmpdir(), "norma-main-"));
    const real = join(dir, "cli.js");
    writeFileSync(real, "// entry\n");
    const link = join(dir, "bin-link");
    try { symlinkSync(real, link); }
    catch { return; } // creating symlinks needs admin on Windows — the ubuntu CI exercises this path
    try {
      process.argv[1] = link; // launched through the bin symlink, exactly like npx
      expect(isMainModule(pathToFileURL(real).href)).toBe(true);
    } finally { restore(); }
  });

  it("is false when a different file is the entry point", () => {
    const dir = mkdtempSync(join(tmpdir(), "norma-main-"));
    const real = join(dir, "cli.js"); writeFileSync(real, "//\n");
    const other = join(dir, "other.js"); writeFileSync(other, "//\n");
    try {
      process.argv[1] = other;
      expect(isMainModule(pathToFileURL(real).href)).toBe(false);
    } finally { restore(); }
  });

  it("is false (never throws) when there is no entry or it can't be resolved", () => {
    try {
      process.argv[1] = "";
      expect(isMainModule("file:///whatever.js")).toBe(false);
      process.argv[1] = join(tmpdir(), "norma-does-not-exist.js");
      expect(isMainModule("file:///also/missing.js")).toBe(false);
    } finally { restore(); }
  });
});

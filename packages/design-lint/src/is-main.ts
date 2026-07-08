import { realpathSync } from "node:fs";
import { fileURLToPath } from "node:url";

/**
 * True when the module identified by `moduleUrl` (pass `import.meta.url`) is the process entry point —
 * whether it was run directly (`node dist/cli.js`) OR through a symlinked / shimmed bin
 * (`npx norma-design-lint`, the installed `.bin/norma-design-lint`).
 *
 * The naive `import.meta.url === pathToFileURL(process.argv[1]).href` check silently fails for the bin
 * case: `process.argv[1]` is then the bin symlink, not this file, so the URLs differ and the CLI/server
 * no-op'd and exited 0 — a false pass (a linter that appears to run but does nothing). Comparing the
 * REAL paths fixes it: `realpathSync` resolves the bin symlink to its target and normalises Windows
 * drive-letter casing, so both sides collapse to the same canonical path when this file is the entry.
 */
export function isMainModule(moduleUrl: string): boolean {
  const entry = process.argv[1];
  if (!entry) return false;
  try {
    return realpathSync(fileURLToPath(moduleUrl)) === realpathSync(entry);
  } catch {
    return false; // a path that can't be resolved is not the entry point
  }
}

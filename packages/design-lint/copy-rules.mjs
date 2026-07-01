// Bundle the compiled rule catalog into dist/ so the published CLI is self-contained.
import { copyFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
mkdirSync(join(here, "dist"), { recursive: true });
copyFileSync(join(here, "..", "..", "standard", "rules.json"), join(here, "dist", "rules.json"));
console.log("✓ bundled standard/rules.json → dist/rules.json");

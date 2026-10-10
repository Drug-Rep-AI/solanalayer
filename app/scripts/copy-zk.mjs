// Copies the prover artifacts (committed once under circuits/build) and the
// snarkjs browser bundle into public/zk so the app can prove in the browser.
import { copyFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const out = join(here, "..", "public", "zk");
const build = join(here, "..", "..", "circuits", "build");
mkdirSync(out, { recursive: true });
for (const f of ["trial_match.wasm", "trial_match_final.zkey", "verification_key.json"]) {
  copyFileSync(join(build, f), join(out, f));
}
// snarkjs does not export its package.json, so locate the dependency directly.
const snarkjsDir = join(here, "..", "node_modules", "snarkjs");
copyFileSync(join(snarkjsDir, "build", "snarkjs.min.js"), join(out, "snarkjs.min.js"));
console.log("zk artifacts copied to public/zk");

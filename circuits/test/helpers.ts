import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { commitDataset, commitPredictions, type LabRecord, type RunExport } from "@drugrep/sdk";

const here = dirname(fileURLToPath(import.meta.url));
export const BUILD = join(here, "..", "build");
export const WASM = join(BUILD, "trial_match.wasm");
export const ZKEY = join(BUILD, "trial_match_final.zkey");
export const VK = JSON.parse(readFileSync(join(BUILD, "verification_key.json"), "utf8"));

const fixtures = join(here, "..", "..", "engine-bridge", "fixtures");
export const DEMO_RUN: RunExport = JSON.parse(readFileSync(join(fixtures, "demo-run.json"), "utf8"));
export const DEMO_LAB: LabRecord[] = JSON.parse(readFileSync(join(fixtures, "demo-lab-records.json"), "utf8")).records;

/** Fixed salts so test vectors are reproducible. */
export const fixedSalts = (seed: bigint, n = 32) => Array.from({ length: n }, (_, i) => seed * 1_000_003n + BigInt(i) + 1n);

export async function demoCommitments(runOverride?: Partial<RunExport>) {
  const run = { ...DEMO_RUN, ...runOverride } as RunExport;
  const pred = await commitPredictions(run, fixedSalts(7n));
  const ds = await commitDataset(DEMO_LAB, { salts: fixedSalts(11n), labSecret: 123456789n });
  return { run, pred, ds };
}

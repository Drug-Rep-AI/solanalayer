/**
 * Writes real Groth16 proofs for the verifier program tests:
 *   programs/drugrep_verifier/tests/fixtures/vectors.json
 * Vector "a" and vector "b" use the same demo lab dataset with two different
 * prediction salts, so they have different predictions roots (two runs).
 *
 * usage: pnpm --filter @drugrep/circuits exec tsx scripts/make-test-vectors.ts
 */
import { writeFileSync } from "node:fs";
import { join } from "node:path";
// @ts-expect-error snarkjs ships no types
import * as snarkjs from "snarkjs";
import {
  buildTrialMatchInput,
  commitDataset,
  commitPredictions,
  encodeProof,
  encodePublicSignals,
  fieldToHex,
  type SnarkjsProof,
} from "@drugrep/sdk";
import { DEMO_LAB, DEMO_RUN, WASM, ZKEY, fixedSalts } from "../test/helpers";

const hex = (bytes: number[]) => Buffer.from(bytes).toString("hex");

async function vector(saltSeed: bigint) {
  const pred = await commitPredictions(DEMO_RUN, fixedSalts(saltSeed));
  const ds = await commitDataset(DEMO_LAB, { salts: fixedSalts(11n), labSecret: 123456789n });
  const { input, public: pub } = await buildTrialMatchInput(pred, ds);
  const { proof, publicSignals } = await snarkjs.groth16.fullProve(input, WASM, ZKEY);
  const enc = encodeProof(proof as SnarkjsProof);
  return {
    predictions_root: fieldToHex(pred.root),
    dataset_root: fieldToHex(ds.root),
    top_k: pred.topK,
    record_count: ds.count,
    hits: pub.hits,
    proof: { a: hex(enc.a), b: hex(enc.b), c: hex(enc.c) },
    public_inputs: encodePublicSignals(publicSignals).map(hex),
  };
}

const out = { a: await vector(7n), b: await vector(8n) };
const path = join(import.meta.dirname, "..", "..", "programs", "drugrep_verifier", "tests", "fixtures", "vectors.json");
writeFileSync(path, JSON.stringify(out, null, 2) + "\n");
console.log(`wrote ${path}: hits ${out.a.hits}/${out.a.top_k}`);
process.exit(0);

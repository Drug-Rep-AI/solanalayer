import { describe, expect, it } from "vitest";
// @ts-expect-error snarkjs ships no types
import * as snarkjs from "snarkjs";
import {
  FQ_MODULUS,
  buildTrialMatchInput,
  bytesToBigint,
  computeNullifier,
  encodeProof,
  encodePublicSignals,
  merkleRoot,
  poseidonHasher,
  type SnarkjsProof,
} from "@drugrep/sdk";
import { DEMO_RUN, VK, WASM, ZKEY, demoCommitments } from "./helpers";

async function witnessFails(input: Record<string, unknown>) {
  await expect(snarkjs.wtns.calculate(input, WASM, { type: "mem" })).rejects.toThrow();
}

describe("trial_match circuit", () => {
  it("proves the correct hit count and verifies", async () => {
    const { pred, ds } = await demoCommitments();
    const { input, public: pub } = await buildTrialMatchInput(pred, ds);
    expect(pub.k).toBe(20);
    expect(pub.hits).toBe(8); // demo fixture: 8 of the top 20 are confirmed positives

    const t0 = Date.now();
    const { proof, publicSignals } = await snarkjs.groth16.fullProve(input, WASM, ZKEY);
    console.log(`proof generated in ${Date.now() - t0} ms`);
    expect(publicSignals).toEqual([
      pub.predictionsRoot.toString(),
      pub.datasetRoot.toString(),
      "8",
      "20",
      pub.nullifier.toString(),
    ]);
    expect(await snarkjs.groth16.verify(VK, publicSignals, proof)).toBe(true);
  });

  it("counts hits only inside the top k", async () => {
    const { pred, ds } = await demoCommitments();
    const { input, public: pub } = await buildTrialMatchInput(pred, ds, 5);
    expect(pub.hits).toBe(3); // ranks 1, 2 and 4
    await snarkjs.wtns.calculate(input, WASM, { type: "mem" }); // throws if any constraint fails
  });

  it("rejects a wrong hit count", async () => {
    const { pred, ds } = await demoCommitments();
    const { input } = await buildTrialMatchInput(pred, ds);
    await witnessFails({ ...input, hits: "9" });
    await witnessFails({ ...input, hits: "7" });
  });

  it("rejects a tampered predictions root", async () => {
    const { pred, ds } = await demoCommitments();
    const { input } = await buildTrialMatchInput(pred, ds);
    await witnessFails({ ...input, predictions_root: (pred.root + 1n).toString() });
  });

  it("rejects a tampered dataset root or a flipped private label", async () => {
    const { pred, ds } = await demoCommitments();
    const { input } = await buildTrialMatchInput(pred, ds);
    await witnessFails({ ...input, dataset_root: (ds.root + 1n).toString() });
    const flipped = [...input.label_outcomes];
    flipped[8] = "1"; // losartan / Marfan: 0 -> 1 without changing the committed root
    await witnessFails({ ...input, label_outcomes: flipped, hits: "9" });
  });

  it("rejects a wrong nullifier or lab secret", async () => {
    const { pred, ds } = await demoCommitments();
    const { input } = await buildTrialMatchInput(pred, ds);
    await witnessFails({ ...input, nullifier: "42" });
    await witnessFails({ ...input, lab_secret: "987654321" });
  });

  it("produces the same nullifier for the same dataset and run, so a replay is detectable", async () => {
    const { pred, ds } = await demoCommitments();
    const a = (await buildTrialMatchInput(pred, ds)).public.nullifier;
    const again = await demoCommitments();
    expect(await computeNullifier(again.ds.root, again.pred.root, again.ds.labSecret)).toBe(a);
    // A different run gives a different nullifier, so one dataset can validate many runs once each.
    expect(await computeNullifier(ds.root, pred.root + 1n, ds.labSecret)).not.toBe(a);
  });

  it("rejects k = 0, k > 32 and duplicated active predictions", async () => {
    const { pred, ds } = await demoCommitments();
    const { input } = await buildTrialMatchInput(pred, ds);
    await witnessFails({ ...input, k: "0", hits: "0" });
    await witnessFails({ ...input, k: "33" });
    // Duplicate rank 1 into rank 3 (and fix the root) to try to double count.
    const dupPred = { ...pred, pairIds: [...pred.pairIds], salts: [...pred.salts] };
    dupPred.pairIds[2] = dupPred.pairIds[0];
    const h = await poseidonHasher();
    dupPred.root = await merkleRoot(dupPred.pairIds.map((id, i) => h([id, dupPred.salts[i]])));
    const dup = await buildTrialMatchInput(dupPred, ds);
    await witnessFails(dup.input);
  });

  it("encodes the proof for groth16-solana with proof A negated", async () => {
    const { pred, ds } = await demoCommitments();
    const { input } = await buildTrialMatchInput(pred, ds);
    const { proof, publicSignals } = await snarkjs.groth16.fullProve(input, WASM, ZKEY);
    const enc = encodeProof(proof as SnarkjsProof);
    expect(enc.a).toHaveLength(64);
    expect(enc.b).toHaveLength(128);
    expect(enc.c).toHaveLength(64);
    const negY = bytesToBigint(Uint8Array.from(enc.a.slice(32)));
    expect((negY + BigInt(proof.pi_a[1])) % FQ_MODULUS).toBe(0n);
    const pubs = encodePublicSignals(publicSignals);
    expect(pubs).toHaveLength(5);
    expect(bytesToBigint(Uint8Array.from(pubs[2]))).toBe(8n);
    expect(DEMO_RUN.demo).toBe(true);
  });
});

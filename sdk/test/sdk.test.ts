import { describe, expect, it } from "vitest";
import {
  FR_MODULUS,
  bigintToBytes32,
  bytesToBigint,
  canonicalJson,
  commitDataset,
  computeRunHashes,
  encodeProof,
  merkleRoot,
  pairId,
  pda,
  poseidonHasher,
  toHex,
} from "../src/index";
import demoRun from "../../engine-bridge/fixtures/demo-run.json";
import type { RunExport } from "../src/types";

describe("hashing", () => {
  it("canonical JSON ignores key order", () => {
    expect(canonicalJson({ b: 1, a: { d: 2, c: 3 } })).toBe(canonicalJson({ a: { c: 3, d: 2 }, b: 1 }));
  });

  it("per layer hashes are deterministic and independent", () => {
    const run = demoRun as RunExport;
    const h1 = computeRunHashes(run);
    const h2 = computeRunHashes(JSON.parse(JSON.stringify(run)));
    expect(toHex(h1.layer3Hash)).toBe(toHex(h2.layer3Hash));
    const edited = { ...run, layer3: { ...run.layer3, top_k: 19 } };
    const h3 = computeRunHashes(edited);
    expect(toHex(h3.layer3Hash)).not.toBe(toHex(h1.layer3Hash));
    expect(toHex(h3.layer1Hash)).toBe(toHex(h1.layer1Hash));
  });

  it("pair ids fit in the BN254 scalar field", () => {
    const id = pairId("DB00203", "15924");
    expect(id).toBeLessThan(FR_MODULUS);
    expect(id).toBe(pairId(" DB00203 ", "15924"));
    expect(id).not.toBe(pairId("DB00820", "15924"));
  });
});

describe("commitments", () => {
  it("merkle root matches a manual two level tree", async () => {
    const h = await poseidonHasher();
    const leaves = [1n, 2n, 3n, 4n];
    expect(await merkleRoot(leaves)).toBe(h([h([1n, 2n]), h([3n, 4n])]));
  });

  it("dataset root binds the lab secret", async () => {
    const records = [{ drugbank_id: "DB00203", primekg_id: "15924", outcome: 1 as const }];
    const a = await commitDataset(records, { salts: [5n], labSecret: 1n });
    const b = await commitDataset(records, { salts: [5n], labSecret: 2n });
    expect(a.labelsRoot).toBe(b.labelsRoot);
    expect(a.root).not.toBe(b.root);
  });

  it("rejects duplicate lab records", async () => {
    const r = { drugbank_id: "DB00203", primekg_id: "15924", outcome: 1 as const };
    await expect(commitDataset([r, r])).rejects.toThrow(/duplicate/);
  });
});

describe("encoding", () => {
  it("round trips 32 byte big endian values", () => {
    const v = FR_MODULUS - 1n;
    expect(bytesToBigint(bigintToBytes32(v))).toBe(v);
  });

  it("orders G2 coordinates as c1, c0 for alt_bn128", () => {
    const enc = encodeProof({ pi_a: ["1", "2", "1"], pi_b: [["3", "4"], ["5", "6"], ["1", "0"]], pi_c: ["7", "8", "1"] });
    const b = Uint8Array.from(enc.b);
    expect(bytesToBigint(b.slice(0, 32))).toBe(4n);
    expect(bytesToBigint(b.slice(32, 64))).toBe(3n);
    expect(bytesToBigint(b.slice(64, 96))).toBe(6n);
    expect(bytesToBigint(b.slice(96, 128))).toBe(5n);
  });

  it("derives stable PDAs", () => {
    const runId = new Uint8Array(32).fill(1);
    expect(pda.run(runId).toBase58()).toBe(pda.run(runId).toBase58());
  });
});

describe("poseidon", () => {
  it("matches circomlibjs (the reference for circomlib's circuit Poseidon)", async () => {
    // @ts-expect-error circomlibjs ships no types
    const { buildPoseidon } = await import("circomlibjs");
    const ref = await buildPoseidon();
    const h = await poseidonHasher();
    for (const inputs of [[1n], [1n, 2n], [3n, 4n, 5n], [FR_MODULUS - 1n, 7n]]) {
      expect(h(inputs)).toBe(ref.F.toObject(ref(inputs)));
    }
  });
});

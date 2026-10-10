import { MAX_LABELS, MAX_PREDICTIONS } from "./constants";
import { bigintToBytes32, fieldToHex, randomFieldElement } from "./bytes";
import { hashJson, pairId, sha256Bytes } from "./hashing";
import { merkleRoot } from "./merkle";
import { poseidon, poseidonHasher } from "./poseidon";
import type { LabRecord, RunExport } from "./types";

export interface RunHashes {
  runId: Uint8Array;
  modelVersionHash: Uint8Array;
  inputHash: Uint8Array;
  layer1Hash: Uint8Array;
  layer2Hash: Uint8Array;
  layer3Hash: Uint8Array;
}

/** sha256 of each part of a run export, so each layer is traceable on its own. */
export function computeRunHashes(run: RunExport): RunHashes {
  return {
    runId: sha256Bytes(run.run_id),
    modelVersionHash: hashJson(run.model),
    inputHash: hashJson(run.inputs),
    layer1Hash: hashJson(run.layer1),
    layer2Hash: hashJson(run.layer2),
    layer3Hash: hashJson(run.layer3),
  };
}

export interface PredictionCommitment {
  /** Ranked pair ids, padded with 0 to MAX_PREDICTIONS. */
  pairIds: bigint[];
  /** One salt per slot (padding slots use 0). Shared privately with the lab. */
  salts: bigint[];
  root: bigint;
  topK: number;
  count: number;
}

/** Poseidon root over the ranked predictions: leaf = Poseidon(pair_id, salt). */
export async function commitPredictions(
  run: RunExport,
  salts?: bigint[],
): Promise<PredictionCommitment> {
  const preds = [...run.layer3.predictions].sort((a, b) => a.rank - b.rank);
  if (preds.length > MAX_PREDICTIONS) throw new Error(`at most ${MAX_PREDICTIONS} predictions`);
  const topK = run.layer3.top_k;
  if (topK < 1 || topK > preds.length) throw new Error("top_k must be between 1 and the prediction count");
  const pairIds: bigint[] = [];
  const s: bigint[] = [];
  for (let i = 0; i < MAX_PREDICTIONS; i++) {
    if (i < preds.length) {
      pairIds.push(pairId(preds[i].drugbank_id, preds[i].primekg_id));
      s.push(salts?.[i] ?? randomFieldElement());
    } else {
      pairIds.push(0n);
      s.push(0n);
    }
  }
  const h = await poseidonHasher();
  const leaves = pairIds.map((id, i) => h([id, s[i]]));
  return { pairIds, salts: s, root: await merkleRoot(leaves), topK, count: preds.length };
}

export interface LabDataset {
  records: LabRecord[];
  labelIds: bigint[];
  salts: bigint[];
  outcomes: number[];
  labSecret: bigint;
  labelsRoot: bigint;
  secretCommitment: bigint;
  /** dataset_root = Poseidon(labels_root, Poseidon(lab_secret)). Only this goes on chain. */
  root: bigint;
  count: number;
}

export async function commitDataset(
  records: LabRecord[],
  opts: { salts?: bigint[]; labSecret?: bigint } = {},
): Promise<LabDataset> {
  if (records.length > MAX_LABELS) throw new Error(`at most ${MAX_LABELS} records`);
  const seen = new Set<bigint>();
  const labelIds: bigint[] = [];
  const salts: bigint[] = [];
  const outcomes: number[] = [];
  for (let i = 0; i < MAX_LABELS; i++) {
    if (i < records.length) {
      const r = records[i];
      const id = pairId(r.drugbank_id, r.primekg_id);
      if (seen.has(id)) throw new Error(`duplicate record ${r.drugbank_id}|${r.primekg_id}`);
      seen.add(id);
      labelIds.push(id);
      salts.push(opts.salts?.[i] ?? randomFieldElement());
      outcomes.push(r.outcome ? 1 : 0);
    } else {
      labelIds.push(0n);
      salts.push(0n);
      outcomes.push(0);
    }
  }
  const labSecret = opts.labSecret ?? randomFieldElement();
  const h = await poseidonHasher();
  const leaves = labelIds.map((id, i) => h([id, salts[i], BigInt(outcomes[i])]));
  const labelsRoot = await merkleRoot(leaves);
  const secretCommitment = h([labSecret]);
  const root = h([labelsRoot, secretCommitment]);
  return { records, labelIds, salts, outcomes, labSecret, labelsRoot, secretCommitment, root, count: records.length };
}

export async function computeNullifier(datasetRoot: bigint, predictionsRoot: bigint, labSecret: bigint) {
  return poseidon([datasetRoot, predictionsRoot, labSecret]);
}

/** Number of top k predictions that match a positive label. */
export function countHits(pred: PredictionCommitment, ds: LabDataset, k: number): number {
  const positives = new Set(ds.labelIds.filter((_, j) => ds.outcomes[j] === 1));
  let hits = 0;
  for (let i = 0; i < k; i++) if (positives.has(pred.pairIds[i])) hits++;
  return hits;
}

export interface TrialMatchPublic {
  predictionsRoot: bigint;
  datasetRoot: bigint;
  hits: number;
  k: number;
  nullifier: bigint;
}

/** Witness input for trial_match.circom plus the expected public signals. */
export async function buildTrialMatchInput(pred: PredictionCommitment, ds: LabDataset, k = pred.topK) {
  const hits = countHits(pred, ds, k);
  const nullifier = await computeNullifier(ds.root, pred.root, ds.labSecret);
  const s = (xs: (bigint | number)[]) => xs.map((x) => x.toString());
  const input = {
    predictions_root: pred.root.toString(),
    dataset_root: ds.root.toString(),
    hits: hits.toString(),
    k: k.toString(),
    nullifier: nullifier.toString(),
    pred_ids: s(pred.pairIds),
    pred_salts: s(pred.salts),
    label_ids: s(ds.labelIds),
    label_salts: s(ds.salts),
    label_outcomes: s(ds.outcomes),
    lab_secret: ds.labSecret.toString(),
  };
  const pub: TrialMatchPublic = { predictionsRoot: pred.root, datasetRoot: ds.root, hits, k, nullifier };
  return { input, public: pub };
}

/** Serializable private sidecars (never sent on chain). */
export function serializePredictionSecrets(runId: string, pred: PredictionCommitment) {
  return { run_id: runId, top_k: pred.topK, count: pred.count, salts: pred.salts.map(fieldToHex) };
}

export function serializeDataset(ds: LabDataset) {
  return {
    records: ds.records,
    salts: ds.salts.slice(0, ds.count).map(fieldToHex),
    lab_secret: fieldToHex(ds.labSecret),
    dataset_root: fieldToHex(ds.root),
  };
}

export function rootBytes(root: bigint): Uint8Array {
  return bigintToBytes32(root);
}

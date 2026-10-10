import type { PublicKey } from "@solana/web3.js";
import {
  commitPredictionRunIx,
  commitPredictions,
  computeRunHashes,
  fieldToHex,
  pda,
  rootFromField,
  sendIxs,
  serializePredictionSecrets,
  toHex,
  type PredictionCommitment,
  type Programs,
  type RunExport,
  type RunHashes,
} from "@drugrep/sdk";

export interface PreparedRun {
  run: RunExport;
  hashes: RunHashes;
  predictions: PredictionCommitment;
}

/** Hashes every layer and builds the Poseidon predictions root. No network. */
export async function prepareRun(run: RunExport, salts?: bigint[]): Promise<PreparedRun> {
  return { run, hashes: computeRunHashes(run), predictions: await commitPredictions(run, salts) };
}

export function describePrepared(p: PreparedRun) {
  return {
    run_id: p.run.run_id,
    demo: p.run.demo,
    run_id_hash: toHex(p.hashes.runId),
    model_version_hash: toHex(p.hashes.modelVersionHash),
    input_hash: toHex(p.hashes.inputHash),
    layer1_hash: toHex(p.hashes.layer1Hash),
    layer2_hash: toHex(p.hashes.layer2Hash),
    layer3_hash: toHex(p.hashes.layer3Hash),
    predictions_root: fieldToHex(p.predictions.root),
    top_k: p.predictions.topK,
    run_account: pda.run(p.hashes.runId).toBase58(),
  };
}

/** Anchors the run with commit_prediction_run. */
export async function commitRun(programs: Programs, authority: PublicKey, p: PreparedRun) {
  const ix = commitPredictionRunIx(
    programs,
    authority,
    p.hashes,
    rootFromField(p.predictions.root),
    p.predictions.topK,
  );
  const sent = await sendIxs(programs, [ix]);
  const account = await programs.registry.account.predictionRun.fetch(pda.run(p.hashes.runId));
  return { ...sent, runAccount: pda.run(p.hashes.runId), account };
}

/** Private sidecar shared off chain with the lab so it can prove against the run. */
export function predictionSecrets(p: PreparedRun) {
  return serializePredictionSecrets(p.run.run_id, p.predictions);
}

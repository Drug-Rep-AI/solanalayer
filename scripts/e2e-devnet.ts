/**
 * End to end flow of the DrugRep Proof Layer, printed with Explorer links.
 *
 *   pnpm e2e:devnet                       # devnet (default)
 *   RPC_URL=http://127.0.0.1:8899 pnpm e2e:devnet
 *
 * Steps
 *   1. DrugRep commits a prediction run (demo fixture, unique run id)
 *   2. A separate lab wallet registers and commits only its dataset root
 *   3. The lab proves the match with Groth16 and verify_match checks it on chain
 *   4. Replaying the same proof is rejected (nullifier PDA already exists)
 *   5. A run committed after the dataset verifies without "predicted first"
 *   6. The lab revokes the dataset; records read as revoked, new proofs fail
 *
 * DEMO DATA only. Uses SOLANA_KEYPAIR (default ~/.config/solana/id.json) as the
 * DrugRep engine wallet and fee payer.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { Connection, Keypair, LAMPORTS_PER_SOL, PublicKey, SystemProgram, Transaction, sendAndConfirmTransaction } from "@solana/web3.js";
// @ts-expect-error snarkjs ships no types
import * as snarkjs from "snarkjs";
import {
  VERIFY_COMPUTE_UNITS,
  buildTrialMatchInput,
  encodeProof,
  encodePublicSignals,
  explorer,
  fieldToHex,
  getPrograms,
  pda,
  sendIxs,
  syncRevocationIx,
  toPublicInputs,
  verifyMatchIx,
  type LabDataset,
  type Programs,
  type SnarkjsProof,
} from "@drugrep/sdk";
import { keypairWallet, loadKeypair, rpcUrl } from "@drugrep/sdk/node";
import { commitRun, freshDemoRun, prepareRun, type PreparedRun } from "@drugrep/engine-bridge";
import { commitLabDataset, generateLabDataset, revokeLabDataset } from "@drugrep/lab-sim";

const BUILD = join(import.meta.dirname, "..", "circuits", "build");
const WASM = join(BUILD, "trial_match.wasm");
const ZKEY = join(BUILD, "trial_match_final.zkey");
const VK = JSON.parse(readFileSync(join(BUILD, "verification_key.json"), "utf8"));

const rpc = rpcUrl();
const cluster = rpc.includes("devnet") ? "devnet" : rpc.includes("mainnet") ? "mainnet-beta" : "localnet";
const connection = new Connection(rpc, "confirmed");
const tx = (sig: string) => explorer.tx(sig, cluster, rpc);
const addr = (a: PublicKey) => explorer.address(a, cluster, rpc);
// The public devnet RPC rate limits bursts, so steps are paced and 429s retried.
const pause = (ms = 2000) => new Promise((r) => setTimeout(r, ms));
const step = async (n: number, title: string) => {
  await pause();
  console.log(`\n[${n}] ${title}`);
};

async function withRetry<T>(fn: () => Promise<T>, tries = 5): Promise<T> {
  for (let i = 0; ; i++) {
    try {
      return await fn();
    } catch (e) {
      const msg = String((e as Error).message ?? e);
      if (i >= tries - 1 || !msg.includes("429")) throw e;
      await pause(3000 * (i + 1));
    }
  }
}

async function prove(prepared: PreparedRun, ds: LabDataset) {
  const { input, public: pub } = await buildTrialMatchInput(prepared.predictions, ds);
  const t0 = Date.now();
  const { proof, publicSignals } = await snarkjs.groth16.fullProve(input, WASM, ZKEY);
  const ms = Date.now() - t0;
  if (!(await snarkjs.groth16.verify(VK, publicSignals, proof))) throw new Error("local proof check failed");
  return { pub, ms, proof: encodeProof(proof as SnarkjsProof), inputs: toPublicInputs(encodePublicSignals(publicSignals)) };
}

async function verify(p: Programs, payer: PublicKey, run: PublicKey, dataset: PublicKey, pr: Awaited<ReturnType<typeof prove>>) {
  const sent = await sendIxs(p, [verifyMatchIx(p, payer, run, dataset, pr.proof, pr.inputs)], {
    computeUnits: VERIFY_COMPUTE_UNITS,
  });
  const key = pda.validation(Uint8Array.from(pr.inputs.nullifier));
  return { sent, key, record: await p.verifier.account.validationRecord.fetch(key) };
}

async function main() {
  const engine = loadKeypair();
  const lab = Keypair.generate();
  const engineP = getPrograms(connection, keypairWallet(engine));
  const labP = getPrograms(connection, keypairWallet(lab));
  console.log(`DrugRep Proof Layer end to end (${cluster}, ${rpc})`);
  console.log("DEMO DATA: fixture predictions and simulated lab labels, not real model output or trial data.");
  console.log(`engine wallet ${engine.publicKey.toBase58()}  balance ${(await connection.getBalance(engine.publicKey)) / LAMPORTS_PER_SOL} SOL`);

  // Fund a fresh lab wallet from the engine wallet so the two parties are distinct.
  await sendAndConfirmTransaction(
    connection,
    new Transaction().add(SystemProgram.transfer({ fromPubkey: engine.publicKey, toPubkey: lab.publicKey, lamports: 0.1 * LAMPORTS_PER_SOL })),
    [engine],
  );

  await step(1, "DrugRep commits a prediction run");
  const runA = await prepareRun(freshDemoRun(`e2e-a-${Date.now().toString(36)}`));
  const a = await commitRun(engineP, engine.publicKey, runA);
  console.log(`  run ${a.runAccount.toBase58()}  slot ${a.account.slot}  top_k ${a.account.topK}`);
  console.log(`  predictions_root ${fieldToHex(runA.predictions.root)}`);
  console.log(`  tx ${tx(a.signature)}`);

  await step(2, "Lab commits only the root of its private labels");
  const ds = await generateLabDataset();
  const d = await commitLabDataset(labP, lab.publicKey, ds, "DrugRep e2e demo lab");
  console.log(`  dataset ${d.dataset.toBase58()}  slot ${d.account.slot}  records ${d.account.recordCount}`);
  console.log(`  dataset_root ${fieldToHex(ds.root)} (labels, salts and lab secret stay local)`);
  console.log(`  tx ${tx(d.signature)}`);

  await step(3, "Lab proves the match with Groth16, verifier program checks it on chain");
  const prA = await prove(runA, ds);
  console.log(`  proof generated in ${prA.ms} ms: hits ${prA.pub.hits} of top ${prA.pub.k}`);
  const vA = await verify(labP, lab.publicKey, a.runAccount, d.dataset, prA);
  console.log(`  ValidationRecord ${vA.key.toBase58()}`);
  console.log(`  hits ${vA.record.hits}/${vA.record.k}  hit rate ${(vA.record.hitRateBps / 100).toFixed(2)}%  predicted_first ${vA.record.predictedFirst}`);
  console.log(`  nullifier ${Buffer.from(vA.record.nullifier).toString("hex")}`);
  console.log(`  tx ${tx(vA.sent.signature)}`);
  if (!vA.record.predictedFirst) throw new Error("expected predicted_first = true");

  await step(4, "Replay of the same proof is rejected");
  try {
    await verify(engineP, engine.publicKey, a.runAccount, d.dataset, prA);
    throw new Error("replay unexpectedly succeeded");
  } catch (e) {
    if ((e as Error).message.includes("unexpectedly")) throw e;
    console.log("  rejected: nullifier account already exists");
  }

  await step(5, "A run committed after the dataset gets no 'predicted first' badge");
  const runB = await prepareRun(freshDemoRun(`e2e-b-${Date.now().toString(36)}`));
  const b = await commitRun(engineP, engine.publicKey, runB);
  const vB = await verify(labP, lab.publicKey, b.runAccount, d.dataset, await prove(runB, ds));
  console.log(`  run slot ${b.account.slot} > dataset slot ${d.account.slot}: predicted_first ${vB.record.predictedFirst}`);
  console.log(`  tx ${tx(vB.sent.signature)}`);
  if (vB.record.predictedFirst) throw new Error("expected predicted_first = false");

  await step(6, "Lab revokes the dataset");
  const r = await revokeLabDataset(labP, lab.publicKey, d.dataset);
  console.log(`  revoke tx ${tx(r.signature)}`);
  await pause();
  const sync = await withRetry(() =>
    sendIxs(engineP, [syncRevocationIx(engineP, vA.key, d.dataset), syncRevocationIx(engineP, vB.key, d.dataset)]),
  );
  const recA = await withRetry(() => engineP.verifier.account.validationRecord.fetch(vA.key));
  console.log(`  records synced (tx ${tx(sync.signature)}): revoked ${recA.revoked}`);
  const runC = await prepareRun(freshDemoRun(`e2e-c-${Date.now().toString(36)}`));
  await pause();
  const c = await withRetry(() => commitRun(engineP, engine.publicKey, runC));
  await pause();
  try {
    await verify(labP, lab.publicKey, c.runAccount, d.dataset, await prove(runC, ds));
    throw new Error("proof against a revoked dataset unexpectedly succeeded");
  } catch (e) {
    if ((e as Error).message.includes("unexpectedly")) throw e;
    console.log("  new proof against the revoked dataset rejected (DatasetRevoked)");
  }

  console.log("\nSummary");
  console.log(`  registry program  ${addr(engineP.registry.programId)}`);
  console.log(`  verifier program  ${addr(engineP.verifier.programId)}`);
  console.log(`  validation (A)    ${addr(vA.key)}`);
  console.log(`  validation (B)    ${addr(vB.key)}`);
  console.log("All checks passed.");
}

main().then(
  () => process.exit(0),
  (e) => {
    console.error(e);
    process.exit(1);
  },
);

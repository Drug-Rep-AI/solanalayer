import { AnchorProvider, BN, Program, type Wallet } from "@anchor-lang/core";
import {
  ComputeBudgetProgram,
  Connection,
  PublicKey,
  Transaction,
  type TransactionInstruction,
} from "@solana/web3.js";
import registryIdl from "./idl/drugrep_registry.json" with { type: "json" };
import verifierIdl from "./idl/drugrep_verifier.json" with { type: "json" };
import type { DrugrepRegistry } from "./idl/drugrep_registry.js";
import type { DrugrepVerifier } from "./idl/drugrep_verifier.js";
import { REGISTRY_PROGRAM_ID, SEEDS, VERIFIER_PROGRAM_ID, LABEL_SCHEMA_VERSION } from "./constants.js";
import type { RunHashes } from "./commitments.js";
import type { SolanaProof } from "./proof.js";
import { bigintToBytes32 } from "./bytes.js";

export type { DrugrepRegistry, DrugrepVerifier };
export { registryIdl, verifierIdl };

export const REGISTRY_ID = new PublicKey(REGISTRY_PROGRAM_ID);
export const VERIFIER_ID = new PublicKey(VERIFIER_PROGRAM_ID);

const enc = new TextEncoder();
const seed = (s: string) => enc.encode(s);
const arr = (b: Uint8Array | number[]) => Array.from(b);

export const pda = {
  lab: (authority: PublicKey) =>
    PublicKey.findProgramAddressSync([seed(SEEDS.lab), authority.toBytes()], REGISTRY_ID)[0],
  dataset: (lab: PublicKey, root: Uint8Array) =>
    PublicKey.findProgramAddressSync([seed(SEEDS.dataset), lab.toBytes(), root], REGISTRY_ID)[0],
  run: (runId: Uint8Array) => PublicKey.findProgramAddressSync([seed(SEEDS.run), runId], REGISTRY_ID)[0],
  nullifier: (n: Uint8Array) => PublicKey.findProgramAddressSync([seed(SEEDS.nullifier), n], VERIFIER_ID)[0],
  validation: (n: Uint8Array) => PublicKey.findProgramAddressSync([seed(SEEDS.validation), n], VERIFIER_ID)[0],
};

/** Read only wallet for fetching accounts without a signer. */
const readOnlyWallet: Wallet = {
  publicKey: PublicKey.default,
  signTransaction: async () => {
    throw new Error("read only");
  },
  signAllTransactions: async () => {
    throw new Error("read only");
  },
} as unknown as Wallet;

export interface Programs {
  provider: AnchorProvider;
  registry: Program<DrugrepRegistry>;
  verifier: Program<DrugrepVerifier>;
}

export function getPrograms(connection: Connection, wallet?: Wallet): Programs {
  const provider = new AnchorProvider(connection, wallet ?? readOnlyWallet, { commitment: "confirmed" });
  return {
    provider,
    registry: new Program<DrugrepRegistry>(registryIdl as DrugrepRegistry, provider),
    verifier: new Program<DrugrepVerifier>(verifierIdl as DrugrepVerifier, provider),
  };
}

// ---------- instruction builders ----------

export function registerLabIx(p: Programs, authority: PublicKey, nameHash: Uint8Array) {
  return p.registry.methods
    .registerLab(arr(nameHash))
    .accountsPartial({ authority, lab: pda.lab(authority) })
    .instruction();
}

export function commitDatasetIx(p: Programs, authority: PublicKey, root: Uint8Array, recordCount: number) {
  const lab = pda.lab(authority);
  return p.registry.methods
    .commitDataset(arr(root), recordCount, LABEL_SCHEMA_VERSION)
    .accountsPartial({ authority, lab, dataset: pda.dataset(lab, root) })
    .instruction();
}

export function commitPredictionRunIx(
  p: Programs,
  authority: PublicKey,
  hashes: RunHashes,
  predictionsRoot: Uint8Array,
  topK: number,
) {
  return p.registry.methods
    .commitPredictionRun(
      arr(hashes.runId),
      arr(hashes.modelVersionHash),
      arr(hashes.inputHash),
      arr(hashes.layer1Hash),
      arr(hashes.layer2Hash),
      arr(hashes.layer3Hash),
      arr(predictionsRoot),
      topK,
    )
    .accountsPartial({ authority, run: pda.run(hashes.runId) })
    .instruction();
}

export function revokeDatasetIx(p: Programs, authority: PublicKey, dataset: PublicKey) {
  return p.registry.methods
    .revokeDataset()
    .accountsPartial({ authority, lab: pda.lab(authority), dataset })
    .instruction();
}

export interface EncodedPublicInputs {
  predictionsRoot: number[];
  datasetRoot: number[];
  hits: number[];
  k: number[];
  nullifier: number[];
}

/** From the 5 encoded public signals (circuit order). */
export function toPublicInputs(signals: number[][]): EncodedPublicInputs {
  if (signals.length !== 5) throw new Error("expected 5 public signals");
  const [predictionsRoot, datasetRoot, hits, k, nullifier] = signals;
  return { predictionsRoot, datasetRoot, hits, k, nullifier };
}

export function verifyMatchIx(
  p: Programs,
  submitter: PublicKey,
  run: PublicKey,
  dataset: PublicKey,
  proof: SolanaProof,
  inputs: EncodedPublicInputs,
) {
  const n = Uint8Array.from(inputs.nullifier);
  return p.verifier.methods
    .verifyMatch(proof, inputs)
    .accountsPartial({
      submitter,
      run,
      dataset,
      nullifier: pda.nullifier(n),
      validation: pda.validation(n),
    })
    .instruction();
}

export function syncRevocationIx(p: Programs, validation: PublicKey, dataset: PublicKey) {
  return p.verifier.methods.syncRevocation().accountsPartial({ validation, dataset }).instruction();
}

// ---------- sending ----------

export interface SentTx {
  signature: string;
  slot: number;
}

/** Signs with the provider wallet, sends and confirms. Adds a compute limit when asked. */
export async function sendIxs(
  p: Programs,
  ixs: (TransactionInstruction | Promise<TransactionInstruction>)[],
  opts: { computeUnits?: number } = {},
): Promise<SentTx> {
  const resolved = await Promise.all(ixs);
  const tx = new Transaction();
  if (opts.computeUnits) tx.add(ComputeBudgetProgram.setComputeUnitLimit({ units: opts.computeUnits }));
  tx.add(...resolved);
  const signature = await p.provider.sendAndConfirm(tx, [], { commitment: "confirmed" });
  const status = await p.provider.connection.getSignatureStatus(signature);
  return { signature, slot: status.value?.slot ?? 0 };
}

/** Compute limit used for verify_match (measured about 130k CU in tests). */
export const VERIFY_COMPUTE_UNITS = 400_000;

// ---------- reading ----------

export type ProgramAccount<T> = { publicKey: PublicKey; account: T };

export async function fetchAll(p: Programs) {
  const [labs, datasets, runs, validations] = await Promise.all([
    p.registry.account.lab.all(),
    p.registry.account.dataset.all(),
    p.registry.account.predictionRun.all(),
    p.verifier.account.validationRecord.all(),
  ]);
  return { labs, datasets, runs, validations };
}

export const bnToNumber = (v: BN | number) => (typeof v === "number" ? v : v.toNumber());

export function rootFromField(root: bigint) {
  return bigintToBytes32(root);
}

// ---------- explorer links ----------

export type Cluster = "devnet" | "localnet" | "mainnet-beta";

function clusterQuery(cluster: Cluster, rpcUrl?: string) {
  if (cluster === "mainnet-beta") return "";
  if (cluster === "localnet") return `?cluster=custom&customUrl=${encodeURIComponent(rpcUrl ?? "http://127.0.0.1:8899")}`;
  return `?cluster=${cluster}`;
}

export const explorer = {
  tx: (sig: string, cluster: Cluster = "devnet", rpcUrl?: string) =>
    `https://explorer.solana.com/tx/${sig}${clusterQuery(cluster, rpcUrl)}`,
  address: (addr: string | PublicKey, cluster: Cluster = "devnet", rpcUrl?: string) =>
    `https://explorer.solana.com/address/${addr.toString()}${clusterQuery(cluster, rpcUrl)}`,
};

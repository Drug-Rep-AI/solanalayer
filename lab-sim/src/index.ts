import type { PublicKey } from "@solana/web3.js";
import {
  commitDataset,
  commitDatasetIx,
  fromHex,
  bytesToBigint,
  pda,
  registerLabIx,
  revokeDatasetIx,
  rootFromField,
  sendIxs,
  serializeDataset,
  sha256Bytes,
  type LabDataset,
  type LabRecord,
  type Programs,
} from "@drugrep/sdk";
import demoLab from "../../engine-bridge/fixtures/demo-lab-records.json" with { type: "json" };

/** DEMO DATA: simulated lab labels, not real trial or patient data. */
export const DEMO_LAB_RECORDS = demoLab.records as LabRecord[];

/** Builds a salted private label set and its root. Runs fully offline. */
export function generateLabDataset(records: LabRecord[] = DEMO_LAB_RECORDS): Promise<LabDataset> {
  return commitDataset(records);
}

/** Rebuilds a dataset from its private file (salts and lab secret included). */
export async function loadLabDataset(file: ReturnType<typeof serializeDataset>): Promise<LabDataset> {
  const ds = await commitDataset(file.records, {
    salts: file.salts.map((h) => bytesToBigint(fromHex(h))),
    labSecret: bytesToBigint(fromHex(file.lab_secret)),
  });
  if (rootFromField(ds.root).toString() !== fromHex(file.dataset_root).toString()) {
    throw new Error("private dataset file does not reproduce its recorded root");
  }
  return ds;
}

export const labNameHash = (name: string) => sha256Bytes(`drugrep-lab:${name}`);

/** Registers the lab if needed, then commits only the dataset root on chain. */
export async function commitLabDataset(programs: Programs, authority: PublicKey, ds: LabDataset, labName: string) {
  const labKey = pda.lab(authority);
  const existing = await programs.provider.connection.getAccountInfo(labKey);
  const ixs = [];
  if (!existing) ixs.push(registerLabIx(programs, authority, labNameHash(labName)));
  const root = rootFromField(ds.root);
  ixs.push(commitDatasetIx(programs, authority, root, ds.count));
  const sent = await sendIxs(programs, ixs);
  const datasetKey = pda.dataset(labKey, root);
  const account = await programs.registry.account.dataset.fetch(datasetKey);
  return { ...sent, lab: labKey, dataset: datasetKey, account };
}

export async function revokeLabDataset(programs: Programs, authority: PublicKey, dataset: PublicKey) {
  return sendIxs(programs, [revokeDatasetIx(programs, authority, dataset)]);
}

export { serializeDataset };

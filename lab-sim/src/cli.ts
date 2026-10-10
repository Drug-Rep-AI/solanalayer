/**
 * Simulated lab.
 *
 *   tsx src/cli.ts generate [--records file.json]   # salted labels -> private/dataset.json
 *   tsx src/cli.ts commit [--file private/dataset.json] [--lab-name "Demo Lab"]
 *   tsx src/cli.ts revoke --dataset <address>
 *
 * The raw labels, salts and lab secret only ever live in lab-sim/private/.
 * Only the Poseidon root and the record count are sent to chain.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { Connection, PublicKey } from "@solana/web3.js";
import { explorer, fieldToHex, getPrograms, type LabRecord } from "@drugrep/sdk";
import { keypairWallet, loadKeypair, rpcUrl } from "@drugrep/sdk/node";
import { commitLabDataset, generateLabDataset, loadLabDataset, revokeLabDataset, serializeDataset } from "./index.js";

const here = dirname(fileURLToPath(import.meta.url));
const [cmd, ...args] = process.argv.slice(2);
const flag = (name: string) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
};
const privDir = join(here, "..", "private");
const defaultFile = join(privDir, "dataset.json");
const rpc = rpcUrl();
const cluster = rpc.includes("devnet") ? "devnet" : "localnet";

function programs() {
  const kp = loadKeypair();
  return { kp, p: getPrograms(new Connection(rpc, "confirmed"), keypairWallet(kp)) };
}

if (cmd === "generate") {
  const records: LabRecord[] | undefined = flag("--records")
    ? JSON.parse(readFileSync(flag("--records")!, "utf8")).records
    : undefined;
  const ds = await generateLabDataset(records);
  mkdirSync(privDir, { recursive: true });
  writeFileSync(defaultFile, JSON.stringify(serializeDataset(ds), null, 2));
  console.log(`DEMO DATA: ${ds.count} simulated records (${ds.outcomes.filter((o) => o === 1).length} positive)`);
  console.log(`private file: ${defaultFile}`);
  console.log(`dataset_root: ${fieldToHex(ds.root)}  <- the only value that will go on chain`);
} else if (cmd === "commit") {
  const file = flag("--file") ?? defaultFile;
  if (!existsSync(file)) throw new Error(`no private dataset at ${file}; run "generate" first`);
  const ds = await loadLabDataset(JSON.parse(readFileSync(file, "utf8")));
  const { kp, p } = programs();
  const res = await commitLabDataset(p, kp.publicKey, ds, flag("--lab-name") ?? "DrugRep demo lab");
  console.log(`committed dataset ${res.dataset.toBase58()} (lab ${res.lab.toBase58()})`);
  console.log(`  root ${fieldToHex(ds.root)}, ${ds.count} records, slot ${res.account.slot.toString()}`);
  console.log(`  tx ${explorer.tx(res.signature, cluster, rpc)}`);
} else if (cmd === "revoke") {
  const dataset = new PublicKey(flag("--dataset") ?? "");
  const { kp, p } = programs();
  const res = await revokeLabDataset(p, kp.publicKey, dataset);
  console.log(`revoked ${dataset.toBase58()}  tx ${explorer.tx(res.signature, cluster, rpc)}`);
} else {
  console.log("usage: tsx src/cli.ts generate|commit|revoke");
  process.exit(1);
}

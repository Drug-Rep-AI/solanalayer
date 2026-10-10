/**
 * DrugRep engine bridge CLI.
 *
 *   pnpm bridge:commit                       # demo fixture, unique run id, devnet
 *   pnpm --filter @drugrep/engine-bridge hash  # print hashes only, no transaction
 *   tsx src/cli.ts --fixture path/to/run.json
 *   tsx src/cli.ts --engine-url https://engine.example --run-id abc
 *
 * env: RPC_URL (default devnet), SOLANA_KEYPAIR (default ~/.config/solana/id.json)
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { Connection } from "@solana/web3.js";
import { explorer, getPrograms } from "@drugrep/sdk";
import { keypairWallet, loadKeypair, rpcUrl } from "@drugrep/sdk/node";
import { FixtureEngineSource, HttpEngineSource, type EngineSource } from "./engine.js";
import { commitRun, describePrepared, predictionSecrets, prepareRun } from "./bridge.js";

const here = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const flag = (name: string) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
};
const dryRun = args.includes("--dry-run");

const source: EngineSource = flag("--engine-url")
  ? new HttpEngineSource(flag("--engine-url")!, flag("--run-id") ?? "latest")
  : new FixtureEngineSource(flag("--fixture") ?? join(here, "..", "fixtures", "demo-run.json"));

const run = await source.loadRun();
if (!flag("--engine-url") && !args.includes("--keep-run-id")) run.run_id = `${run.run_id}-${Date.now().toString(36)}`;
if (run.demo) console.log("NOTE: this is DEMO DATA, not real model output.\n");

const prepared = await prepareRun(run);
console.log(`source: ${source.name}`);
console.log(JSON.stringify(describePrepared(prepared), null, 2));

const outDir = join(here, "..", "private");
mkdirSync(outDir, { recursive: true });
const secretsPath = join(outDir, `${run.run_id}.secrets.json`);
writeFileSync(secretsPath, JSON.stringify(predictionSecrets(prepared), null, 2));
console.log(`\nprivate prediction salts written to ${secretsPath} (share only with the lab, never on chain)`);

if (dryRun) process.exit(0);

const rpc = rpcUrl();
const cluster = rpc.includes("devnet") ? "devnet" : "localnet";
const kp = loadKeypair();
const programs = getPrograms(new Connection(rpc, "confirmed"), keypairWallet(kp));
const res = await commitRun(programs, kp.publicKey, prepared);
console.log(`\ncommitted run ${res.runAccount.toBase58()}`);
console.log(`  slot ${res.account.slot.toString()}  time ${new Date(res.account.timestamp.toNumber() * 1000).toISOString()}`);
console.log(`  tx      ${explorer.tx(res.signature, cluster, rpc)}`);
console.log(`  account ${explorer.address(res.runAccount, cluster, rpc)}`);

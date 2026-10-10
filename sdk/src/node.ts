// Node only helpers (file system keypairs). Not imported by the browser app.
import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { Keypair, Transaction, VersionedTransaction } from "@solana/web3.js";
import type { Wallet } from "@anchor-lang/core";

export function loadKeypair(path = process.env.SOLANA_KEYPAIR ?? `${homedir()}/.config/solana/id.json`): Keypair {
  const p = path.replace(/^~/, homedir());
  return Keypair.fromSecretKey(Uint8Array.from(JSON.parse(readFileSync(p, "utf8"))));
}

export function keypairWallet(kp: Keypair): Wallet {
  const sign = <T extends Transaction | VersionedTransaction>(tx: T): T => {
    if (tx instanceof VersionedTransaction) tx.sign([kp]);
    else tx.partialSign(kp);
    return tx;
  };
  return {
    publicKey: kp.publicKey,
    payer: kp,
    signTransaction: async (tx) => sign(tx),
    signAllTransactions: async (txs) => txs.map(sign),
  } as Wallet;
}

export function rpcUrl(): string {
  return process.env.RPC_URL ?? "https://api.devnet.solana.com";
}

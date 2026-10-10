import type { Cluster } from "@drugrep/sdk";

export const CLUSTER = (process.env.NEXT_PUBLIC_CLUSTER ?? "devnet") as Cluster;
export const RPC_URL =
  process.env.NEXT_PUBLIC_RPC_URL ?? (CLUSTER === "localnet" ? "http://127.0.0.1:8899" : "https://api.devnet.solana.com");
export const REPO_URL = "https://github.com/Drug-Rep-AI/solanalayer";
export const MOTTO = "Every drug deserves a second chance.";

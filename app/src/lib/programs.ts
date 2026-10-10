"use client";
import { useMemo } from "react";
import { useAnchorWallet, useConnection } from "@solana/wallet-adapter-react";
import { getPrograms } from "@drugrep/sdk";

export function usePrograms() {
  const { connection } = useConnection();
  const wallet = useAnchorWallet();
  return useMemo(() => getPrograms(connection, wallet as never), [connection, wallet]);
}

/** Readable message from a failed transaction or simulation. */
export function errorMessage(e: unknown): string {
  const err = e as { message?: string; logs?: string[]; error?: { errorMessage?: string } };
  const anchorMsg = err?.error?.errorMessage;
  if (anchorMsg) return anchorMsg;
  const logs = err?.logs ?? [];
  const errLog = logs.find((l) => l.includes("Error Message:"));
  if (errLog) return errLog.split("Error Message:")[1].trim();
  const msg = err?.message ?? String(e);
  if (msg.includes("already in use")) return "This proof was already used: its nullifier exists on chain.";
  if (msg.includes("insufficient") || msg.includes("0x1")) return `${msg} (the wallet may need devnet SOL)`;
  return msg;
}

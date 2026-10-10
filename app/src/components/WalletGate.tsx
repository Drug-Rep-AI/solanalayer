"use client";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { LAMPORTS_PER_SOL } from "@solana/web3.js";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { CLUSTER } from "@/lib/config";
import { Hash } from "./Hash";

/** Shows a connect prompt, or the wallet's devnet balance with an airdrop helper. */
export function WalletGate({ children, need = 0.02 }: { children: ReactNode; need?: number }) {
  const { publicKey } = useWallet();
  const { connection } = useConnection();
  const { setVisible } = useWalletModal();
  const [balance, setBalance] = useState<number | null>(null);
  const [airdrop, setAirdrop] = useState<"idle" | "loading" | "error" | "done">("idle");

  const refresh = useCallback(async () => {
    if (!publicKey) return;
    try {
      setBalance((await connection.getBalance(publicKey)) / LAMPORTS_PER_SOL);
    } catch {
      setBalance(null);
    }
  }, [connection, publicKey]);

  useEffect(() => {
    const first = setTimeout(refresh, 0);
    const id = setInterval(refresh, 15000);
    return () => {
      clearTimeout(first);
      clearInterval(id);
    };
  }, [refresh]);

  if (!publicKey) {
    return (
      <div className="panel stack--sm">
        <strong>Connect a devnet wallet to continue</strong>
        <p className="small muted">
          Any Solana wallet set to devnet works. No wallet? Pick “Demo wallet (devnet burner)”: it lives in this browser
          only.
        </p>
        <div>
          <button type="button" className="btn" onClick={() => setVisible(true)}>
            Connect wallet
          </button>
        </div>
      </div>
    );
  }

  const low = balance !== null && balance < need;
  return (
    <>
      {low && (
        <div className="notice" role="status">
          <div className="stack--sm">
            <span>
              This wallet has {balance?.toFixed(3)} SOL on {CLUSTER}. Each step costs a few thousandths of a SOL in rent
              and fees.
            </span>
            <div className="row">
              <Hash value={publicKey.toBase58()} label="wallet address" full />
              <button
                type="button"
                className="btn btn--ghost btn--small"
                data-state={airdrop === "loading" ? "loading" : undefined}
                disabled={airdrop === "loading"}
                onClick={async () => {
                  setAirdrop("loading");
                  try {
                    const sig = await connection.requestAirdrop(publicKey, LAMPORTS_PER_SOL);
                    await connection.confirmTransaction(sig, "confirmed");
                    setAirdrop("done");
                    refresh();
                  } catch {
                    setAirdrop("error");
                  }
                }}
              >
                {airdrop === "loading" ? <span className="spinner" aria-hidden /> : null}
                Request 1 {CLUSTER} SOL
              </button>
              <a href="https://faucet.solana.com" target="_blank" rel="noreferrer" className="small">
                Open the devnet faucet
              </a>
            </div>
            {airdrop === "error" && (
              <span className="small">The airdrop was rate limited. Paste the address into the faucet instead.</span>
            )}
          </div>
        </div>
      )}
      {children}
    </>
  );
}

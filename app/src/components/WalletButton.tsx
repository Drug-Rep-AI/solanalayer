"use client";
import { useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { shortAddress } from "./Hash";

export function WalletButton() {
  const { publicKey, disconnect, connecting, wallet } = useWallet();
  const { setVisible } = useWalletModal();
  if (publicKey) {
    return (
      <button
        type="button"
        className="btn btn--ghost btn--small"
        onClick={() => disconnect()}
        title={`${wallet?.adapter.name ?? "Wallet"} · click to disconnect`}
      >
        <span className="mono">{shortAddress(publicKey.toBase58())}</span>
      </button>
    );
  }
  return (
    <button
      type="button"
      className="btn btn--small"
      data-state={connecting ? "loading" : undefined}
      onClick={() => setVisible(true)}
      data-testid="connect-wallet"
    >
      {connecting ? "Connecting…" : "Connect wallet"}
    </button>
  );
}

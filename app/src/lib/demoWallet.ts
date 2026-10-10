import {
  BaseSignerWalletAdapter,
  WalletNotConnectedError,
  WalletReadyState,
  type TransactionOrVersionedTransaction,
  type WalletName,
} from "@solana/wallet-adapter-base";
import { Keypair, VersionedTransaction, type PublicKey, type TransactionVersion } from "@solana/web3.js";

export const DemoWalletName = "Demo wallet (devnet burner)" as WalletName<"Demo wallet (devnet burner)">;
export const DEMO_WALLET_KEY = "drugrep.demoWallet.v1";

const ICON =
  "data:image/svg+xml;base64," +
  (typeof btoa === "function"
    ? btoa(
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="8" fill="#036C4D"/><path d="M10 9h7a7 7 0 0 1 0 14h-7z" fill="none" stroke="#F7F9F4" stroke-width="2.5"/></svg>',
      )
    : "");

/**
 * A devnet only burner wallet kept in this browser's localStorage, so judges
 * can try the flow without installing a wallet. Never use it for real funds.
 */
export class DemoWalletAdapter extends BaseSignerWalletAdapter {
  name = DemoWalletName;
  url = "https://github.com/Drug-Rep-AI/solanalayer";
  icon = ICON;
  supportedTransactionVersions: ReadonlySet<TransactionVersion> = new Set(["legacy", 0] as TransactionVersion[]);

  private keypair: Keypair | null = null;

  get publicKey(): PublicKey | null {
    return this.keypair?.publicKey ?? null;
  }
  get connecting() {
    return false;
  }
  get readyState() {
    return typeof window === "undefined" ? WalletReadyState.Unsupported : WalletReadyState.Loadable;
  }

  async connect(): Promise<void> {
    let kp: Keypair | null = null;
    try {
      const saved = window.localStorage.getItem(DEMO_WALLET_KEY);
      if (saved) kp = Keypair.fromSecretKey(Uint8Array.from(JSON.parse(saved)));
    } catch {
      kp = null;
    }
    if (!kp) {
      kp = Keypair.generate();
      try {
        window.localStorage.setItem(DEMO_WALLET_KEY, JSON.stringify(Array.from(kp.secretKey)));
      } catch {
        /* storage blocked: keep an in memory burner */
      }
    }
    this.keypair = kp;
    this.emit("connect", kp.publicKey);
  }

  async disconnect(): Promise<void> {
    this.keypair = null;
    this.emit("disconnect");
  }

  async signTransaction<T extends TransactionOrVersionedTransaction<this["supportedTransactionVersions"]>>(tx: T): Promise<T> {
    if (!this.keypair) throw new WalletNotConnectedError();
    if (tx instanceof VersionedTransaction) tx.sign([this.keypair]);
    else tx.partialSign(this.keypair);
    return tx;
  }
}

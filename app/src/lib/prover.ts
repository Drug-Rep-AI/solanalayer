"use client";
// Loads the snarkjs browser bundle from /zk and proves trial_match in the browser.
// The private witness (predictions, salts, labels, lab secret) never leaves this tab.

interface SnarkjsGlobal {
  groth16: {
    fullProve(input: unknown, wasm: string, zkey: string): Promise<{ proof: unknown; publicSignals: string[] }>;
    verify(vk: unknown, signals: string[], proof: unknown): Promise<boolean>;
  };
}

declare global {
  interface Window {
    snarkjs?: SnarkjsGlobal;
  }
}

let loading: Promise<SnarkjsGlobal> | null = null;

export function loadSnarkjs(): Promise<SnarkjsGlobal> {
  if (window.snarkjs) return Promise.resolve(window.snarkjs);
  if (!loading) {
    loading = new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = "/zk/snarkjs.min.js";
      s.async = true;
      s.onload = () => (window.snarkjs ? resolve(window.snarkjs) : reject(new Error("snarkjs failed to load")));
      s.onerror = () => {
        loading = null;
        reject(new Error("could not load /zk/snarkjs.min.js"));
      };
      document.head.appendChild(s);
    });
  }
  return loading;
}

export async function proveInBrowser(input: Record<string, unknown>) {
  const snarkjs = await loadSnarkjs();
  const t0 = performance.now();
  const { proof, publicSignals } = await snarkjs.groth16.fullProve(input, "/zk/trial_match.wasm", "/zk/trial_match_final.zkey");
  const ms = Math.round(performance.now() - t0);
  const vk = await fetch("/zk/verification_key.json").then((r) => r.json());
  const locallyValid = await snarkjs.groth16.verify(vk, publicSignals, proof);
  return { proof, publicSignals, ms, locallyValid };
}

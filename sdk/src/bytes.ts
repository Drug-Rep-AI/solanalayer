import { FR_MODULUS } from "./constants";

export function bigintToBytes32(value: bigint): Uint8Array {
  if (value < 0n) throw new Error("negative value");
  const out = new Uint8Array(32);
  let v = value;
  for (let i = 31; i >= 0; i--) {
    out[i] = Number(v & 0xffn);
    v >>= 8n;
  }
  if (v !== 0n) throw new Error("value does not fit in 32 bytes");
  return out;
}

export function bytesToBigint(bytes: Uint8Array): bigint {
  let v = 0n;
  for (const b of bytes) v = (v << 8n) | BigInt(b);
  return v;
}

export function toHex(bytes: Uint8Array): string {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

export function fromHex(hex: string): Uint8Array {
  const clean = hex.startsWith("0x") ? hex.slice(2) : hex;
  if (clean.length % 2 !== 0) throw new Error("odd hex length");
  const out = new Uint8Array(clean.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16);
  return out;
}

export function fieldToHex(value: bigint): string {
  return toHex(bigintToBytes32(value));
}

/** Uniform random element of the BN254 scalar field (rejection sampled). */
export function randomFieldElement(): bigint {
  const buf = new Uint8Array(32);
  for (;;) {
    globalThis.crypto.getRandomValues(buf);
    buf[0] &= 0x3f; // < 2^254
    const v = bytesToBigint(buf);
    if (v < FR_MODULUS) return v;
  }
}

export function shortHex(hex: string, n = 6): string {
  const h = hex.startsWith("0x") ? hex.slice(2) : hex;
  return h.length <= n * 2 ? h : `${h.slice(0, n)}…${h.slice(-n)}`;
}

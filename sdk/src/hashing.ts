import { sha256 } from "@noble/hashes/sha2.js";
import { bytesToBigint, toHex } from "./bytes";

const enc = new TextEncoder();

/** Deterministic JSON: object keys sorted, no whitespace. */
export function canonicalJson(value: unknown): string {
  return JSON.stringify(sortKeys(value));
}

function sortKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortKeys);
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(value as Record<string, unknown>).sort()) {
      const v = (value as Record<string, unknown>)[key];
      if (v !== undefined) out[key] = sortKeys(v);
    }
    return out;
  }
  return value;
}

export function sha256Bytes(data: string | Uint8Array): Uint8Array {
  return sha256(typeof data === "string" ? enc.encode(data) : data);
}

export function sha256Hex(data: string | Uint8Array): string {
  return toHex(sha256Bytes(data));
}

/** sha256 over canonical JSON. Used for every per layer hash. */
export function hashJson(value: unknown): Uint8Array {
  return sha256Bytes(canonicalJson(value));
}

/**
 * Field encoding of a drug-disease pair: the first 31 bytes of
 * sha256("<drugbank_id>|<primekg_id>"), so it always fits in BN254.
 */
export function pairId(drugbankId: string, primekgId: string): bigint {
  const digest = sha256Bytes(`${drugbankId.trim()}|${primekgId.trim()}`);
  return bytesToBigint(digest.slice(0, 31));
}

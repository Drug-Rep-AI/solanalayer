import { FQ_MODULUS } from "./constants";
import { bigintToBytes32 } from "./bytes";

/** snarkjs Groth16 proof JSON. */
export interface SnarkjsProof {
  pi_a: string[];
  pi_b: string[][];
  pi_c: string[];
  protocol?: string;
  curve?: string;
}

export interface SolanaProof {
  a: number[]; // 64 bytes, already negated
  b: number[]; // 128 bytes
  c: number[]; // 64 bytes
}

function g1(x: string, y: string): Uint8Array {
  const out = new Uint8Array(64);
  out.set(bigintToBytes32(BigInt(x)), 0);
  out.set(bigintToBytes32(BigInt(y)), 32);
  return out;
}

/** alt_bn128 G2 encoding: x.c1 | x.c0 | y.c1 | y.c0, each 32 bytes big endian. */
function g2(x: string[], y: string[]): Uint8Array {
  const out = new Uint8Array(128);
  out.set(bigintToBytes32(BigInt(x[1])), 0);
  out.set(bigintToBytes32(BigInt(x[0])), 32);
  out.set(bigintToBytes32(BigInt(y[1])), 64);
  out.set(bigintToBytes32(BigInt(y[0])), 96);
  return out;
}

/**
 * Converts a snarkjs proof into the byte layout groth16-solana expects.
 * groth16-solana checks e(-A, B) * e(alpha, beta) * e(L, gamma) * e(C, delta) == 1,
 * so proof A is negated here (y -> q - y).
 */
export function encodeProof(proof: SnarkjsProof): SolanaProof {
  const ay = BigInt(proof.pi_a[1]);
  const negY = ay === 0n ? 0n : (FQ_MODULUS - (ay % FQ_MODULUS)) % FQ_MODULUS;
  const a = g1(proof.pi_a[0], negY.toString());
  const b = g2(proof.pi_b[0], proof.pi_b[1]);
  const c = g1(proof.pi_c[0], proof.pi_c[1]);
  return { a: Array.from(a), b: Array.from(b), c: Array.from(c) };
}

/** Public signals (decimal strings from snarkjs) to 32 byte big endian arrays. */
export function encodePublicSignals(signals: string[]): number[][] {
  return signals.map((s) => Array.from(bigintToBytes32(BigInt(s))));
}

export interface SnarkjsVk {
  nPublic: number;
  vk_alpha_1: string[];
  vk_beta_2: string[][];
  vk_gamma_2: string[][];
  vk_delta_2: string[][];
  IC: string[][];
}

export function encodeVk(vk: SnarkjsVk) {
  return {
    alpha: g1(vk.vk_alpha_1[0], vk.vk_alpha_1[1]),
    beta: g2(vk.vk_beta_2[0], vk.vk_beta_2[1]),
    gamma: g2(vk.vk_gamma_2[0], vk.vk_gamma_2[1]),
    delta: g2(vk.vk_delta_2[0], vk.vk_delta_2[1]),
    ic: vk.IC.map((p) => g1(p[0], p[1])),
  };
}

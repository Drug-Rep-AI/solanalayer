// circomlibjs Poseidon matches circomlib's Poseidon template exactly.
// @ts-expect-error circomlibjs ships no types
import { buildPoseidon } from "circomlibjs";

type PoseidonFn = ((inputs: bigint[]) => unknown) & { F: { toObject(x: unknown): bigint } };
let poseidonPromise: Promise<PoseidonFn> | null = null;

export function getPoseidon(): Promise<PoseidonFn> {
  if (!poseidonPromise) poseidonPromise = buildPoseidon() as Promise<PoseidonFn>;
  return poseidonPromise;
}

export async function poseidon(inputs: bigint[]): Promise<bigint> {
  const p = await getPoseidon();
  return p.F.toObject(p(inputs));
}

/** Synchronous hasher once Poseidon is loaded (for hot loops). */
export async function poseidonHasher(): Promise<(inputs: bigint[]) => bigint> {
  const p = await getPoseidon();
  return (inputs) => p.F.toObject(p(inputs));
}

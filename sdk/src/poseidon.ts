// poseidon-lite implements the same Poseidon (BN254, circomlib constants) as
// circomlib's Poseidon template; sdk/test cross-checks it against circomlibjs.
// It is synchronous and dependency free, so it runs the same in Node and the browser.
import { poseidon1, poseidon2, poseidon3 } from "poseidon-lite";

export function poseidonSync(inputs: bigint[]): bigint {
  switch (inputs.length) {
    case 1:
      return poseidon1(inputs);
    case 2:
      return poseidon2(inputs);
    case 3:
      return poseidon3(inputs);
    default:
      throw new Error(`unsupported Poseidon arity ${inputs.length}`);
  }
}

export async function poseidon(inputs: bigint[]): Promise<bigint> {
  return poseidonSync(inputs);
}

/** Kept async for API stability; returns the synchronous hasher. */
export async function poseidonHasher(): Promise<(inputs: bigint[]) => bigint> {
  return poseidonSync;
}

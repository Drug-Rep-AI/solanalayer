import { poseidonHasher } from "./poseidon.js";

/**
 * Binary Poseidon Merkle root, level by level. Mirrors `MerkleRoot(DEPTH)`
 * in trial_match.circom: node N+i = Poseidon(node 2i, node 2i+1).
 */
export async function merkleRoot(leaves: bigint[]): Promise<bigint> {
  const n = leaves.length;
  if (n === 0 || (n & (n - 1)) !== 0) throw new Error("leaf count must be a power of two");
  const h = await poseidonHasher();
  let level = leaves.slice();
  while (level.length > 1) {
    const next: bigint[] = [];
    for (let i = 0; i < level.length; i += 2) next.push(h([level[i], level[i + 1]]));
    level = next;
  }
  return level[0];
}

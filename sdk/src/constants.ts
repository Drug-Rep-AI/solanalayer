/** Circuit sizes. Must match `TrialMatch(5, 5)` in circuits/trial_match.circom. */
export const PRED_DEPTH = 5;
export const LABEL_DEPTH = 5;
export const MAX_PREDICTIONS = 1 << PRED_DEPTH; // 32
export const MAX_LABELS = 1 << LABEL_DEPTH; // 32

/** BN254 scalar field (Poseidon inputs and public signals live here). */
export const FR_MODULUS =
  21888242871839275222246405745257275088548364400416034343698204186575808495617n;
/** BN254 base field (G1/G2 coordinates). Used to negate proof A. */
export const FQ_MODULUS =
  21888242871839275222246405745257275088696311157297823662689037894645226208583n;

export const REGISTRY_PROGRAM_ID = "Heqv7iDHvG2YGsiMnXMNSTgMxAAcWja1QoFx4fGnd7xt";
export const VERIFIER_PROGRAM_ID = "HkJreUgMDofiQJAZ4pRj8vt4pZ3hVkJ8hSmSULcf3qij";

export const SEEDS = {
  lab: "lab",
  dataset: "dataset",
  run: "run",
  nullifier: "nullifier",
  validation: "validation",
} as const;

/** Version tag of the label leaf schema: Poseidon(pair_id, salt, outcome). */
export const LABEL_SCHEMA_VERSION = 1;

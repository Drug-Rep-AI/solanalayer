# Build notes

Decisions and library quirks found while building the POC. Newest last.

## Toolchain

- Anchor CLI 1.2.1 (via avm), Agave / Solana CLI 4.1.2 (the pairing Anchor 1.2 is tested with), circom 2.2.3 (built from source with cargo; the only macOS release binary is x86), snarkjs 0.7.6, circomlib 2.0.5.
- Anchor 1.2.1 builds SBPF v3 by default (`anchor build --arch v3`). Devnet has SBPF v3 deployment and execution enabled (feature `5cC3foj77CWun58pC51ebHFUWavHWKarWyR5UUik7dnC`), so we keep the default.
- The `anchor init` template pins `litesvm = 0.10`, which cannot load SBPF v3 programs (`InvalidAccountData` from `add_program`). We use `litesvm = 0.18` with the 4.x `solana-message` / `solana-transaction` crates in dev-dependencies. litesvm 0.18 needs rustc 1.97.1+, so `rust-toolchain.toml` pins the host toolchain to 1.99.0. The on chain program is still compiled by the platform tools toolchain, so the program MSRV is unaffected.
- pnpm 11 blocks dependency build scripts by default; `pnpm-workspace.yaml` allows the four that need them (`esbuild`, `blake-hash`, `bufferutil`, `utf-8-validate`).

## Circuit

- `trial_match.circom` uses full arrays (32 prediction slots, 32 label slots) rather than Merkle paths. With full arrays the prover recomputes both roots, so every slot is bound and there is no path ordering to get wrong.
- Compiled with `--O2`: 36,519 constraints. Without `--O2` it was 77,066 (linear constraints not folded), which would need a 2^17 powers of tau. 2^16 is enough with `--O2`.
- `dataset_root = Poseidon(labels_root, Poseidon(lab_secret))` rather than the bare labels root. This binds the lab secret to the committed dataset, so `nullifier = Poseidon(dataset_root, predictions_root, lab_secret)` is unique per (dataset, run) pair. With an unbound secret a lab could mint a fresh nullifier for the same pair at will.
- Hits are counted only for active slots (`i < k`). `matched[i]` is constrained to 0 or 1, so duplicated positive labels cannot inflate the count, and active predictions must be pairwise distinct, so a repeated prediction cannot be counted twice.
- Pair ids are the first 31 bytes of `sha256("<drugbank_id>|<primekg_id>")`, which always fits in the BN254 scalar field.
- `k` is a public input and the verifier program requires `k == run.top_k`, so nobody can pick a flattering cutoff after seeing the data.

## Trusted setup

- `circuits/scripts/setup.sh` runs a local, single contributor powers of tau (2^16) and phase 2. This is a POC setup and is not secure: whoever ran it could forge proofs. Production needs a public phase 1 and a multi party phase 2.
- The final zkey, wasm and verification key are committed under `circuits/build/` because the on chain verifying key (`programs/drugrep_verifier/src/verifying_key.rs`) must match them exactly. Rerunning setup changes all three and requires a program upgrade.
- The app copies the prover artifacts from `circuits/build/` into `app/public/zk/` at build time, so the 22 MB zkey is stored in git once.

## groth16-solana

- We use the crates.io release `groth16-solana = 0.2.0`. Its `Groth16Verifier::verify` expects proof A already negated (it checks `e(-A, B) * e(alpha, beta) * e(L, gamma) * e(C, delta) = 1`). The negation is done in the client (`sdk/src/proof.ts`, `y -> q - y` over the BN254 base field) and tested.
- G2 points (proof B and the VK's beta, gamma, delta) use the alt_bn128 syscall layout `x.c1 | x.c0 | y.c1 | y.c0`, each 32 bytes big endian. snarkjs lists them as `[c0, c1]`, so the coordinates are swapped. `scripts/vk-to-rust.ts` does the same swap for the VK.

## Programs

- "Called it first": the verifier records `predicted_first = run.slot < dataset.slot` on the ValidationRecord rather than rejecting late runs. A run committed after the dataset still gets a record, but the UI shows no "predicted before outcome" badge for it. This keeps the attestation honest in both directions.
- `PredictionRun` is permissionless and records its committer (`authority`). The UI and README show the committer; production would gate this behind an engine authority or a Solana Attestation Service credential.
- Revocation: `revoke_dataset` flips the Dataset. Because a program cannot enumerate every record that used a dataset, the verifier has a permissionless `sync_revocation` instruction that copies the flag onto a ValidationRecord, and the app also treats a record as revoked whenever its dataset is revoked.
- `Dataset` PDA seeds are `["dataset", lab, dataset_root]` (per lab), so another wallet cannot squat a lab's root before the lab commits it.

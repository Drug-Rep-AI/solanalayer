#!/usr/bin/env bash
# POC TRUSTED SETUP. NOT FOR PRODUCTION.
#
# Runs a local Groth16 ceremony for trial_match:
#   phase 1: powers of tau (BN254, 2^16) with one local contribution
#   phase 2: circuit specific setup with one local contribution
# A single party knows all the toxic waste here, so anyone holding it could
# forge proofs. Production needs a multi party ceremony (or a public
# phase 1 such as the Perpetual Powers of Tau) plus an audited phase 2.
#
# Outputs (committed so the on chain verifying key matches the app):
#   build/trial_match.wasm, build/trial_match_final.zkey, build/verification_key.json
#   programs/drugrep_verifier/src/verifying_key.rs
#   app/public/zk/*
set -euo pipefail
cd "$(dirname "$0")/.."
POWER=16
B=build
bash scripts/compile.sh

if [ ! -f "$B/pot${POWER}_final.ptau" ]; then
  npx snarkjs powersoftau new bn128 $POWER $B/pot${POWER}_0000.ptau
  npx snarkjs powersoftau contribute $B/pot${POWER}_0000.ptau $B/pot${POWER}_0001.ptau \
    --name="DrugRep POC phase 1 (not production)" -e="$(head -c 64 /dev/urandom | xxd -p | tr -d '\n')"
  npx snarkjs powersoftau prepare phase2 $B/pot${POWER}_0001.ptau $B/pot${POWER}_final.ptau
  rm -f $B/pot${POWER}_0000.ptau $B/pot${POWER}_0001.ptau
fi

npx snarkjs groth16 setup $B/trial_match.r1cs $B/pot${POWER}_final.ptau $B/trial_match_0000.zkey
npx snarkjs zkey contribute $B/trial_match_0000.zkey $B/trial_match_final.zkey \
  --name="DrugRep POC phase 2 (not production)" -e="$(head -c 64 /dev/urandom | xxd -p | tr -d '\n')"
rm -f $B/trial_match_0000.zkey
npx snarkjs zkey verify $B/trial_match.r1cs $B/pot${POWER}_final.ptau $B/trial_match_final.zkey
npx snarkjs zkey export verificationkey $B/trial_match_final.zkey $B/verification_key.json

# Convert the verifying key into the groth16-solana Rust format.
npx tsx ../scripts/vk-to-rust.ts $B/verification_key.json ../programs/drugrep_verifier/src/verifying_key.rs

# Ship the prover artifacts to the browser app.
mkdir -p ../app/public/zk
cp $B/trial_match.wasm $B/trial_match_final.zkey $B/verification_key.json ../app/public/zk/
shasum -a 256 $B/trial_match.wasm $B/trial_match_final.zkey $B/verification_key.json | tee $B/SHA256SUMS
echo "Setup complete (POC only, not production)."

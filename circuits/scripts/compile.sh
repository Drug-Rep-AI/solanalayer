#!/usr/bin/env bash
# Compile trial_match.circom to R1CS + WASM witness generator.
set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p build
circom trial_match.circom --r1cs --wasm --sym --O2 -o build -l node_modules
cp build/trial_match_js/trial_match.wasm build/trial_match.wasm
npx snarkjs r1cs info build/trial_match.r1cs

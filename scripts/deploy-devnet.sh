#!/usr/bin/env bash
# Builds and deploys both programs to devnet, then reads the program accounts back.
# Needs: the program keypairs in target/deploy/ (kept out of git) and a funded
# wallet at ~/.config/solana/id.json (about 3 SOL for both programs).
set -euo pipefail
cd "$(dirname "$0")/.."
CLUSTER="${CLUSTER:-devnet}"
NO_DNA=1 anchor build
bash scripts/sync-idl.sh
for p in drugrep_registry drugrep_verifier; do
  id=$(solana-keygen pubkey target/deploy/$p-keypair.json)
  echo "== deploying $p ($id) to $CLUSTER"
  solana program deploy target/deploy/$p.so --program-id target/deploy/$p-keypair.json -u "$CLUSTER" --with-compute-unit-price 1000
  solana program show "$id" -u "$CLUSTER"
done

#!/usr/bin/env bash
# Copies the IDLs and TS types produced by `anchor build` into the SDK.
set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p sdk/src/idl
for p in drugrep_registry drugrep_verifier; do
  cp target/idl/$p.json sdk/src/idl/$p.json
  cp target/types/$p.ts sdk/src/idl/$p.ts
done
echo "IDLs synced to sdk/src/idl"

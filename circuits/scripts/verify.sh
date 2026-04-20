#!/bin/bash
# Verify a Groth16 proof for dungeon_position (off-chain)
set -e

BUILD_DIR="$(dirname "$0")/../dungeon_position/build"
ZK_DIR="$(dirname "$0")/../../zk"
SNARKJS="node $ZK_DIR/node_modules/.bin/snarkjs"

echo "==> Verifying proof..."
$SNARKJS groth16 verify \
  "$BUILD_DIR/verification_key.json" \
  "$BUILD_DIR/public.json" \
  "$BUILD_DIR/proof.json"

echo "==> Proof verified OK"

#!/bin/bash
# Phase 2 trusted setup for dungeon_position (Groth16)
# Reuses pot12 from commit_reveal if available.
set -e

CIRCUIT_DIR="$(dirname "$0")/../dungeon_position"
BUILD_DIR="$CIRCUIT_DIR/build"
ZK_DIR="$(dirname "$0")/../../zk"
SNARKJS="node $ZK_DIR/node_modules/.bin/snarkjs"

mkdir -p "$BUILD_DIR"

POT_FILE="$BUILD_DIR/pot12_final.ptau"

# Check for existing pot12 from commit_reveal circuit
EXISTING_POT="$ZK_DIR/build/pot12_final.ptau"
if [ -f "$EXISTING_POT" ]; then
  echo "==> Reusing existing pot12 from $EXISTING_POT"
  cp "$EXISTING_POT" "$POT_FILE"
else
  echo "==> Generating new pot12 (this takes a moment)..."
  $SNARKJS powersoftau new bn128 12 "$BUILD_DIR/pot12_0000.ptau" -v
  $SNARKJS powersoftau contribute "$BUILD_DIR/pot12_0000.ptau" "$BUILD_DIR/pot12_0001.ptau" \
    --name="0xARK Phase 1" -e="$(date +%s%N)"
  $SNARKJS powersoftau prepare phase2 "$BUILD_DIR/pot12_0001.ptau" "$POT_FILE" -v
fi

echo "==> Phase 2 setup..."
$SNARKJS groth16 setup \
  "$BUILD_DIR/dungeon_position.r1cs" \
  "$POT_FILE" \
  "$BUILD_DIR/dungeon_position_0000.zkey"

$SNARKJS zkey contribute \
  "$BUILD_DIR/dungeon_position_0000.zkey" \
  "$BUILD_DIR/dungeon_position_final.zkey" \
  --name="0xARK Phase 2" -e="$(date +%s%N)"

$SNARKJS zkey export verificationkey \
  "$BUILD_DIR/dungeon_position_final.zkey" \
  "$BUILD_DIR/verification_key.json"

echo "==> Done."
echo "    zkey: $BUILD_DIR/dungeon_position_final.zkey"
echo "    vkey: $BUILD_DIR/verification_key.json"

#!/bin/bash
# Generate a Groth16 proof for dungeon_position
# Usage: ./prove.sh [input.json]
set -e

CIRCUIT_DIR="$(dirname "$0")/../dungeon_position"
BUILD_DIR="$CIRCUIT_DIR/build"
ZK_DIR="$(dirname "$0")/../../zk"
SNARKJS="node $ZK_DIR/node_modules/.bin/snarkjs"

INPUT="${1:-$CIRCUIT_DIR/input.example.json}"

if [ ! -f "$INPUT" ]; then
  echo "ERROR: input file not found: $INPUT"
  exit 1
fi

echo "==> Computing witness..."
node "$BUILD_DIR/dungeon_position_js/generate_witness.js" \
  "$BUILD_DIR/dungeon_position_js/dungeon_position.wasm" \
  "$INPUT" \
  "$BUILD_DIR/witness.wtns"

echo "==> Generating Groth16 proof..."
$SNARKJS groth16 prove \
  "$BUILD_DIR/dungeon_position_final.zkey" \
  "$BUILD_DIR/witness.wtns" \
  "$BUILD_DIR/proof.json" \
  "$BUILD_DIR/public.json"

echo "==> Done."
echo "    proof:   $BUILD_DIR/proof.json"
echo "    public:  $BUILD_DIR/public.json"

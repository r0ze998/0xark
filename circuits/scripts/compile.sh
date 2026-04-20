#!/bin/bash
# Compile dungeon_position circuit → r1cs + wasm + sym
set -e

CIRCUIT_DIR="$(dirname "$0")/../dungeon_position"
OUT_DIR="$(dirname "$0")/../dungeon_position/build"
CIRCOM="circom"
NODE_MODULES="$(dirname "$0")/../../zk/node_modules"

mkdir -p "$OUT_DIR"

echo "==> Compiling dungeon_position.circom..."
"$CIRCOM" \
  "$CIRCUIT_DIR/dungeon_position.circom" \
  --r1cs \
  --wasm \
  --sym \
  -o "$OUT_DIR" \
  -l "$NODE_MODULES"

echo "==> Done."
echo "    r1cs: $OUT_DIR/dungeon_position.r1cs"
echo "    wasm: $OUT_DIR/dungeon_position_js/dungeon_position.wasm"
echo "    sym:  $OUT_DIR/dungeon_position.sym"

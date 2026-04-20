# dungeon_position Circuit

Proves a valid dungeon move in 0xARK without revealing position.

## What it proves

Given `old_commitment` and `new_commitment` (public, on-chain), the prover
demonstrates knowledge of `(x, y, area, salt_old, dx, dy, darea, salt_new)` such that:

1. `Poseidon(x, y, area, salt_old) == old_commitment`
2. `Poseidon(x+dx, y+dy, area+darea, salt_new) == new_commitment`
3. `|dx| + |dy| + |darea| == 1` — exactly one step
4. `new_x, new_y ∈ [0, 15]`, `new_area ∈ [0, 2]`

## Build

```bash
# Install deps (from project root)
cd ../../   # project root
npm install --prefix zk  # circomlib + snarkjs

# Compile
cd circuits
bash scripts/compile.sh

# Trusted setup (one-time per circuit)
bash scripts/setup.sh

# Generate example proof
bash scripts/prove.sh

# Verify proof
bash scripts/verify.sh
```

## Files

```
dungeon_position.circom  — circuit source
input.example.json       — example inputs (commitments must be computed first)
```

## Constraint count estimate

~600 constraints — fits within pot12 (2^12 = 4096).

## Notes

- `old_commitment` must already be stored on-chain from a previous `commit_action`
- `salt_new` should be a fresh random 64-bit value each move
- See `../../docs/_scratch/ZK_CIRCUIT_DESIGN.md` for full design spec

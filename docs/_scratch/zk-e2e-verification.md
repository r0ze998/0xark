# ZK E2E Verification — Handoff

**Tag:** `v-phd-zk-verified-e2e`  
**Date:** 2026-04-24  
**Status:** All 6 tests pass

## Summary

Three Groth16/BN254 circuits verified end-to-end via LiteSVM in-process tests.
Each circuit has a positive test (real proof → Ok) and a negative test (tampered proof_a → InvalidProof err).
All CU budgets are comfortably under the 200k limit.

## Test Results

| Test | Result | CU consumed |
|---|---|---|
| `test_verify_dungeon_move_valid_proof` | PASS | 101,617 |
| `test_verify_dungeon_move_tampered_proof` | PASS | — |
| `test_verify_zk_proof_valid` | PASS | 94,219 |
| `test_verify_zk_proof_tampered` | PASS | — |
| `test_commit_hand_valid_proof` | PASS | 129,993 |
| `test_commit_hand_tampered_proof` | PASS | — |

## Circuits

### dungeon_position (625 constraints)

- **Instruction:** `verify_dungeon_move`
- **Public inputs:** `[old_commitment (32B), new_commitment (32B)]` — 64 bytes total
- **Trusted setup:** `pot12_final.ptau`
- **VK location:** `programs/oxark/src/instructions/verify_dungeon_move.rs`
- **Test inputs:** old=4493193..., new=18052127...

### commit_reveal (277 constraints)

- **Instruction:** `verify_zk_proof`
- **Public inputs:** `[commitHash (32B)]` — Poseidon(actionType, targetArea, salt)
- **Trusted setup:** `pot12_final.ptau` (regenerated — see VK fix below)
- **VK location:** `programs/oxark/src/instructions/verify_zk_proof.rs`
- **Test inputs:** actionType=2, targetArea=1, salt=12345678901234567890123456789012

### hand_commitment (576 constraints)

- **Instruction:** `commit_hand`
- **Public inputs:** `[commitment, round, pubkey_lo, pubkey_hi]` — 4×32 bytes
- **Trusted setup:** `pot12_final.ptau`
- **VK location:** `programs/oxark/src/instructions/commit_hand.rs`
- **Test inputs:** round=1, pubkey split into lo/hi 128-bit halves

## VK Fix (commit_reveal)

The original `commit_reveal_final.zkey` in the repo was generated from a different ptau than
`pot12_final.ptau` used by the other two circuits. The Rust VK constants in `verify_zk_proof.rs`
matched a since-lost zkey.

**Fix applied:**
1. Recompiled `commit_reveal.circom` from source (wasm was stale — 610 witnesses vs 628 expected)
2. Generated new zkey: `snarkjs groth16 setup` + `beacon` from `pot12_final.ptau`
3. Updated VK constants in `verify_zk_proof.rs` to match new zkey
4. Regenerated proof for test inputs; verified OK with `snarkjs g16v`

New proof artifacts: `/tmp/cr_final.zkey`, `/tmp/cr_proof_new.json`, `/tmp/cr_public_new.json`
(not committed to repo — regenerate from circom source + pot12_final.ptau if needed)

## G2 Encoding Note

snarkjs JSON represents G2 points imaginary-first: `[[x_im, x_re], [y_im, y_re]]`.
Solana's `alt_bn128_pairing` (EIP-197) expects real-first: `x_re||x_im||y_re||y_im`.
Test byte arrays and Rust VK constants all use the real-first encoding.

## File Locations

| File | Purpose |
|---|---|
| `programs/oxark/tests/test_game.rs` | 6 ZK tests + helpers |
| `programs/oxark/src/instructions/verify_dungeon_move.rs` | dungeon_position verifier + VK |
| `programs/oxark/src/instructions/verify_zk_proof.rs` | commit_reveal verifier + VK (updated) |
| `programs/oxark/src/instructions/commit_hand.rs` | hand_commitment verifier + VK |

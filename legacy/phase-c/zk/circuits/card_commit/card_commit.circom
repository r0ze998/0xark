pragma circom 2.1.0;

include "circomlib/circuits/poseidon.circom";
include "circomlib/circuits/comparators.circom";

// 0xARK Card Commit Circuit — Axis C (MEGA4 T83)
//
// Proves: "I know the (card_id, salt) that hashes to the committed value"
//         without revealing which card was chosen until reveal phase.
//
// Public inputs:  commitment  — Poseidon(card_id, salt), stored on-chain
// Private inputs: card_id     — which card the player chose (1-60)
//                 salt        — random 253-bit nonce
//
// Constraints:
//   1. Poseidon(card_id, salt) === commitment
//   2. card_id ∈ [1, 60]  (valid card range)
//
// Approximate constraint count: ~250 (Poseidon-5 + range checks)
// Proving time: < 1s in browser WASM with snarkjs
//
// Usage:
//   compile:  circom card_commit.circom --r1cs --wasm --sym
//   setup:    snarkjs groth16 setup card_commit.r1cs pot.ptau card_commit.zkey
//   prove:    snarkjs groth16 fullProve {card_id, salt} card_commit.wasm card_commit.zkey

template CardCommit() {
    // ── Private inputs (hidden from on-chain observers) ───────────────────────
    signal input card_id;   // Which card the player chose (1-60)
    signal input salt;      // Random 253-bit nonce (chosen by player)

    // ── Public input (stored on-chain in CardCommitRecord) ───────────────────
    signal input commitment; // Poseidon(card_id, salt)

    // ── Range check: 1 ≤ card_id ≤ 60 ────────────────────────────────────────
    // 6 bits covers [0, 63], sufficient for card_id in [1, 60]
    component cardMin = GreaterEqThan(6);
    cardMin.in[0] <== card_id;
    cardMin.in[1] <== 1;
    cardMin.out === 1;

    component cardMax = LessEqThan(6);
    cardMax.in[0] <== card_id;
    cardMax.in[1] <== 60;
    cardMax.out === 1;

    // ── Hash constraint ───────────────────────────────────────────────────────
    component poseidon = Poseidon(2);
    poseidon.inputs[0] <== card_id;
    poseidon.inputs[1] <== salt;

    // Constrain: computed hash must equal the committed hash
    commitment === poseidon.out;
}

component main { public [commitment] } = CardCommit();

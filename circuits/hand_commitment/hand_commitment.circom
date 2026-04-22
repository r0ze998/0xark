pragma circom 2.1.6;

include "circomlib/circuits/poseidon.circom";

// 0xARK Hand Commitment Circuit v1
//
// Commits a player's hand of up to 10 cards using Poseidon hash.
// Used in ZK commit-reveal: player commits at Lock In, reveals after battle.
//
// Input packing:
//   card_ids[10] : each card catalog ID (u64), one BN254 field element each
//   salt_lo      : lower 16 bytes of 32-byte salt as u128 → field element
//   salt_hi      : upper 16 bytes of 32-byte salt as u128 → field element
//   round        : round number 1-5 (u8)
//   pubkey_lo    : lower 16 bytes of Solana pubkey as u128 → field element
//   pubkey_hi    : upper 16 bytes of Solana pubkey as u128 → field element
//
// Total inputs: 10 + 2 + 1 + 2 = 15  →  Poseidon(15), t=16 (supported by circomlib)
//
// Public inputs (visible on-chain): round, pubkey_lo, pubkey_hi
// Private inputs (witness): card_ids[10], salt_lo, salt_hi
// Output: commitment (single BN254 field element)

template HandCommitment() {
    // ── Public inputs ─────────────────────────────────────────────────────────
    signal input round;         // round number 1-5
    signal input pubkey_lo;     // lower 16 bytes of player pubkey as u128
    signal input pubkey_hi;     // upper 16 bytes of player pubkey as u128

    // ── Private inputs ────────────────────────────────────────────────────────
    signal input card_ids[10];  // card catalog IDs, 0 = empty slot
    signal input salt_lo;       // lower 16 bytes of 32-byte random salt
    signal input salt_hi;       // upper 16 bytes of 32-byte random salt

    // ── Output ────────────────────────────────────────────────────────────────
    signal output commitment;

    // ── Hash all 15 inputs via Poseidon(15) ──────────────────────────────────
    // Input order:
    //   [0]    = round
    //   [1]    = pubkey_lo
    //   [2]    = pubkey_hi
    //   [3..12] = card_ids[0..9]
    //   [13]   = salt_lo
    //   [14]   = salt_hi
    component hasher = Poseidon(15);
    hasher.inputs[0]  <== round;
    hasher.inputs[1]  <== pubkey_lo;
    hasher.inputs[2]  <== pubkey_hi;
    for (var i = 0; i < 10; i++) {
        hasher.inputs[3 + i] <== card_ids[i];
    }
    hasher.inputs[13] <== salt_lo;
    hasher.inputs[14] <== salt_hi;

    commitment <== hasher.out;
}

component main { public [round, pubkey_lo, pubkey_hi] } = HandCommitment();

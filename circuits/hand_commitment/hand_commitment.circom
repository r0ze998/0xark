pragma circom 2.1.6;

include "circomlib/circuits/poseidon.circom";
include "circomlib/circuits/comparators.circom";

// 0xARK Hand Commitment Circuit v2
//
// Commits a player's hand of up to 10 cards using Poseidon hash.
// Used in ZK commit-reveal: player commits at Lock In, reveals after battle.
//
// Input packing:
//   card_ids[10] : each card catalog ID (u64), one BN254 field element each
//                  card_ids[0..4] = 5 active field cards (1-60, must be unique)
//                  card_ids[5..9] = padding (0 = empty slot, unchecked)
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
//
// Constraints on card_ids[0..4] (5 active cards):
//   - range:     1 <= card_id <= 60
//   - uniqueness: all 5 card_ids are pairwise distinct (5C2 = 10 pairs)

template HandCommitment() {
    // ── Public inputs ─────────────────────────────────────────────────────────
    signal input round;         // round number 1-5
    signal input pubkey_lo;     // lower 16 bytes of player pubkey as u128
    signal input pubkey_hi;     // upper 16 bytes of player pubkey as u128

    // ── Private inputs ────────────────────────────────────────────────────────
    signal input card_ids[10];  // card catalog IDs; [0..4] active, [5..9] padding
    signal input salt_lo;       // lower 16 bytes of 32-byte random salt
    signal input salt_hi;       // upper 16 bytes of 32-byte random salt

    // ── Output ────────────────────────────────────────────────────────────────
    signal output commitment;

    // ── Range check: 1 <= card_id <= 60 for card_ids[0..4] ──────────────────
    // 7 bits covers 0-127, sufficient for card IDs 1-60.
    component gte_check[5];
    component lt_check[5];
    for (var i = 0; i < 5; i++) {
        gte_check[i] = GreaterEqThan(7);
        gte_check[i].in[0] <== card_ids[i];
        gte_check[i].in[1] <== 1;
        gte_check[i].out === 1;

        lt_check[i] = LessThan(7);
        lt_check[i].in[0] <== card_ids[i];
        lt_check[i].in[1] <== 61;
        lt_check[i].out === 1;
    }

    // ── Uniqueness check: all card_ids[0..4] are pairwise distinct ───────────
    // 5C2 = 10 pairs; IsEqual().out === 0 asserts the pair is NOT equal.
    component is_eq[10];
    var pair_idx = 0;
    for (var i = 0; i < 5; i++) {
        for (var j = i + 1; j < 5; j++) {
            is_eq[pair_idx] = IsEqual();
            is_eq[pair_idx].in[0] <== card_ids[i];
            is_eq[pair_idx].in[1] <== card_ids[j];
            is_eq[pair_idx].out === 0;
            pair_idx++;
        }
    }

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

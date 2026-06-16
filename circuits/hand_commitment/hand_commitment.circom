pragma circom 2.1.6;

include "circomlib/circuits/poseidon.circom";
include "circomlib/circuits/comparators.circom";

// 0xARK Hand Commitment Circuit v3 (YKK-33: syscall-friendly Poseidon)
//
// v2 hashed 15 inputs via Poseidon(15) (t=16). Recomputing that on-chain in
// pure-Rust ark-bn254 cost >8M CU — over Solana's 1.4M/tx limit — so reveal_hand
// could never run on devnet. The `sol_poseidon` syscall only supports 1..12
// inputs (t=2..13), so v3 folds the 10 card_ids into a single field element and
// hashes 6 inputs via Poseidon(6) (t=7). On-chain cost via the syscall is
// 61*6^2 + 542 = 2,738 CU.
//
// Card packing:
//   card_ids[0..4] = 5 active cards (1-60, unique), each < 64 -> fits in 6 bits
//   card_ids[5..9] = padding, forced to 0
//   cards_packed   = sum card_ids[i] * 2^(6*i)  (60-bit value, injective because
//                    every card_id < 64 and padding is 0)
//
// Poseidon(6) input order:
//   [round, pubkey_lo, pubkey_hi, cards_packed, salt_lo, salt_hi]
//
// Public inputs (unchanged): round, pubkey_lo, pubkey_hi  -> snarkjs nPublic = 4
// (commitment output + 3 public inputs). The commitment VALUE differs from v2,
// so this needs a fresh trusted setup / zkey / VK (not a drop-in).

template HandCommitment() {
    // -- Public inputs ----------------------------------------------------------
    signal input round;         // round number 1-5
    signal input pubkey_lo;     // lower 16 bytes of player pubkey as u128
    signal input pubkey_hi;     // upper 16 bytes of player pubkey as u128

    // -- Private inputs ---------------------------------------------------------
    signal input card_ids[10];  // card catalog IDs; [0..4] active, [5..9] padding
    signal input salt_lo;       // lower 16 bytes of 32-byte random salt
    signal input salt_hi;       // upper 16 bytes of 32-byte random salt

    // -- Output -----------------------------------------------------------------
    signal output commitment;

    // -- Range check: 1 <= card_id <= 60 for card_ids[0..4] --------------------
    // 7 bits covers 0-127; the < 61 bound also guarantees each active card < 64,
    // so it occupies at most 6 bits and the packing below cannot carry/collide.
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

    // -- Padding check: card_ids[5..9] must be exactly 0 ----------------------
    // v2 left these unchecked; v3 forces them to 0 so the packing is well-defined
    // (a nonzero padding slot would silently shift bits into another card's lane).
    for (var i = 5; i < 10; i++) {
        card_ids[i] === 0;
    }

    // -- Uniqueness check: all card_ids[0..4] are pairwise distinct -----------
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

    // -- Pack card_ids into a single field element -----------------------------
    // cards_packed = sum card_ids[i] * 2^(6*i). Linear constraint; the 6-bit
    // bound on each card (from the range/padding checks above) makes it injective.
    var lc = 0;
    for (var i = 0; i < 10; i++) {
        lc += card_ids[i] * (2 ** (6 * i));
    }
    signal cards_packed;
    cards_packed <== lc;

    // -- Hash 6 inputs via Poseidon(6) (t=7, syscall-compatible) --------------
    component hasher = Poseidon(6);
    hasher.inputs[0] <== round;
    hasher.inputs[1] <== pubkey_lo;
    hasher.inputs[2] <== pubkey_hi;
    hasher.inputs[3] <== cards_packed;
    hasher.inputs[4] <== salt_lo;
    hasher.inputs[5] <== salt_hi;

    commitment <== hasher.out;
}

component main { public [round, pubkey_lo, pubkey_hi] } = HandCommitment();

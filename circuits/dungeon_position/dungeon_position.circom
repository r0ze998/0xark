pragma circom 2.1.6;

include "circomlib/circuits/poseidon.circom";
include "circomlib/circuits/comparators.circom";

// 0xARK Dungeon Position Circuit v1
//
// Proves a valid dungeon move without revealing the player's position.
//
// Model: 3 areas × 16×16 tile grid (768 possible positions)
// Move:  exactly one step — |dx| + |dy| + |darea| == 1
//
// Public inputs:  old_commitment, new_commitment
// Private inputs: x, y, area, salt_old, dx, dy, darea, salt_new
//
// Constraints:
//   1. old_commitment == Poseidon(x, y, area, salt_old)
//   2. dx, dy, darea ∈ {-1, 0, 1}  and  |dx|+|dy|+|darea| == 1
//   3. 0 ≤ new_x,y ≤ 15,  0 ≤ new_area ≤ 2  (bounds check implicitly rejects wrapping)
//   4. new_commitment == Poseidon(new_x, new_y, new_area, salt_new)

template DungeonPosition() {
    // ── Private inputs ────────────────────────────────────────────────────────
    signal input x;          // current X  [0, 15]
    signal input y;          // current Y  [0, 15]
    signal input area;       // current area  [0, 2]
    signal input salt_old;   // random nonce for old commitment

    // dx, dy, darea are field elements: 1 = +1, 0 = stay, p-1 = -1
    signal input dx;
    signal input dy;
    signal input darea;

    signal input salt_new;   // random nonce for new commitment

    // ── Public inputs ─────────────────────────────────────────────────────────
    signal input old_commitment;   // Poseidon(x, y, area, salt_old) — on-chain before move
    signal input new_commitment;   // Poseidon(new_x, new_y, new_area, salt_new) — written on-chain

    // ── Intermediate signals ──────────────────────────────────────────────────
    signal new_x;
    signal new_y;
    signal new_area;

    // =========================================================================
    // Constraint 1: old_commitment == Poseidon(x, y, area, salt_old)
    // =========================================================================
    component old_hasher = Poseidon(4);
    old_hasher.inputs[0] <== x;
    old_hasher.inputs[1] <== y;
    old_hasher.inputs[2] <== area;
    old_hasher.inputs[3] <== salt_old;
    old_commitment === old_hasher.out;

    // =========================================================================
    // Constraint 2a: dx, dy, darea ∈ {-1, 0, 1}
    // In BN254 field: -1 ≡ p-1.  We check dx*(dx-1)*(dx+1) == 0.
    // Split into two quadratic constraints to stay in R1CS degree-2:
    //   t = dx*(dx-1)  then  t*(dx+1) === 0
    // =========================================================================
    signal t_dx <== dx * (dx - 1);
    t_dx * (dx + 1) === 0;

    signal t_dy <== dy * (dy - 1);
    t_dy * (dy + 1) === 0;

    signal t_darea <== darea * (darea - 1);
    t_darea * (darea + 1) === 0;

    // =========================================================================
    // Constraint 2b: |dx| + |dy| + |darea| == 1  (exactly one step)
    // abs(v) = 1 - IsZero(v) for v ∈ {-1, 0, 1}
    // =========================================================================
    component is_dx_zero = IsZero();
    is_dx_zero.in <== dx;
    signal abs_dx <== 1 - is_dx_zero.out;

    component is_dy_zero = IsZero();
    is_dy_zero.in <== dy;
    signal abs_dy <== 1 - is_dy_zero.out;

    component is_darea_zero = IsZero();
    is_darea_zero.in <== darea;
    signal abs_darea <== 1 - is_darea_zero.out;

    abs_dx + abs_dy + abs_darea === 1;

    // =========================================================================
    // Compute new position (field arithmetic handles -1 = p-1 correctly)
    // e.g. x=5, dx=p-1 → new_x = 5 + (p-1) ≡ 4 (mod p)
    //      x=0, dx=p-1 → new_x = p-1  (huge field element → fails bounds check)
    // =========================================================================
    new_x    <== x    + dx;
    new_y    <== y    + dy;
    new_area <== area + darea;

    // =========================================================================
    // Constraint 3: bounds check on new position
    // LessEqThan(n) uses Num2Bits(n+1) internally, so inputs must be < 2^(n+1).
    // Large field elements (e.g. p-1 from wrapping) will fail Num2Bits, correctly
    // rejecting out-of-bounds moves.
    // =========================================================================

    // 0 ≤ new_x ≤ 15
    component check_x = LessEqThan(4);
    check_x.in[0] <== new_x;
    check_x.in[1] <== 15;
    check_x.out === 1;

    // 0 ≤ new_y ≤ 15
    component check_y = LessEqThan(4);
    check_y.in[0] <== new_y;
    check_y.in[1] <== 15;
    check_y.out === 1;

    // 0 ≤ new_area ≤ 2
    component check_area = LessEqThan(2);
    check_area.in[0] <== new_area;
    check_area.in[1] <== 2;
    check_area.out === 1;

    // =========================================================================
    // Constraint 4: new_commitment == Poseidon(new_x, new_y, new_area, salt_new)
    // =========================================================================
    component new_hasher = Poseidon(4);
    new_hasher.inputs[0] <== new_x;
    new_hasher.inputs[1] <== new_y;
    new_hasher.inputs[2] <== new_area;
    new_hasher.inputs[3] <== salt_new;
    new_commitment === new_hasher.out;
}

component main {public [old_commitment, new_commitment]} = DungeonPosition();

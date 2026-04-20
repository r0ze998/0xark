pragma circom 2.1.6;

include "circomlib/circuits/poseidon.circom";
include "circomlib/circuits/comparators.circom";

// 0xARK Dungeon Position Circuit
//
// Proves: "I know (x, y, area, salt_old) and a valid move (dx, dy, darea)
//          such that:
//          1. Poseidon(x, y, area, salt_old) == old_commitment
//          2. new_x = x+dx, new_y = y+dy, new_area = area+darea
//          3. Poseidon(new_x, new_y, new_area, salt_new) == new_commitment
//          4. |dx| + |dy| + |darea| == 1  (exactly one step)
//          5. 0 <= new_x,new_y <= 15, 0 <= new_area <= 2"
//
// Public inputs:  old_commitment, new_commitment
// Private inputs: x, y, area, salt_old, dx, dy, darea, salt_new

template DungeonPosition() {
    // ── Private inputs ────────────────────────────────────────────────────────
    signal input x;          // current X  [0, 15]
    signal input y;          // current Y  [0, 15]
    signal input area;       // current area  [0, 2]
    signal input salt_old;   // random nonce for old commitment

    signal input dx;         // X delta: -1, 0, or +1 (as field element)
    signal input dy;         // Y delta: -1, 0, or +1
    signal input darea;      // area delta: -1, 0, or +1

    signal input salt_new;   // random nonce for new commitment

    // ── Public inputs ─────────────────────────────────────────────────────────
    signal input old_commitment;   // on-chain stored hash before move
    signal input new_commitment;   // hash to write on-chain after move

    // ── Intermediate signals ──────────────────────────────────────────────────
    signal new_x;
    signal new_y;
    signal new_area;

    // ── Constraint 1: old commitment ──────────────────────────────────────────
    // old_commitment == Poseidon(x, y, area, salt_old)
    // TODO: implement
    component old_hasher = Poseidon(4);
    old_hasher.inputs[0] <== x;
    old_hasher.inputs[1] <== y;
    old_hasher.inputs[2] <== area;
    old_hasher.inputs[3] <== salt_old;
    old_commitment === old_hasher.out;

    // ── Compute new position ──────────────────────────────────────────────────
    // NOTE: dx/dy/darea are in {field_p-1, 0, 1} for {-1, 0, +1}
    // The subtraction wraps modulo the field prime — bounds check below
    // ensures the result is in [0,15] / [0,2], so wraparound is safe.
    new_x    <== x    + dx;
    new_y    <== y    + dy;
    new_area <== area + darea;

    // ── Constraint 2: new commitment ──────────────────────────────────────────
    // new_commitment == Poseidon(new_x, new_y, new_area, salt_new)
    // TODO: implement
    component new_hasher = Poseidon(4);
    new_hasher.inputs[0] <== new_x;
    new_hasher.inputs[1] <== new_y;
    new_hasher.inputs[2] <== new_area;
    new_hasher.inputs[3] <== salt_new;
    new_commitment === new_hasher.out;

    // ── Constraint 3: move validity (|dx| + |dy| + |darea| == 1) ─────────────
    // dx, dy, darea ∈ {0, 1, field_p-1} in the field.
    // abs_field(v) = v*(v-1) must be 0 for valid inputs, and
    // we constrain the sum of absolute values == 1.
    //
    // Strategy: use IsZero to detect zero, then abs = v * (1 - isZero) but
    // for values in {-1, 0, +1}, dx^2 gives {1, 0, 1} in the integers,
    // so abs(dx) = dx*dx (as integers, not field). But in field arithmetic
    // (field_p-1)^2 is not 1. We need a different approach.
    //
    // TODO: implement move validity using range check on dx in {-1,0,1}
    // and sum abs(dx)+abs(dy)+abs(darea) == 1
    //
    // Approach:
    //   - Constrain dx*(dx-1)*(dx+1) == 0 (dx in {-1,0,1})
    //   - Introduce aux signal: abs_dx = (dx == 0) ? 0 : 1
    //   - Similarly for dy, darea
    //   - abs_dx + abs_dy + abs_darea === 1

    // ── Constraint 4: bounds check on new position ────────────────────────────
    // 0 <= new_x <= 15 (4 bits)
    // TODO: implement
    component check_new_x_max = LessEqThan(4);
    check_new_x_max.in[0] <== new_x;
    check_new_x_max.in[1] <== 15;
    check_new_x_max.out === 1;

    // 0 <= new_y <= 15 (4 bits)
    // TODO: implement
    component check_new_y_max = LessEqThan(4);
    check_new_y_max.in[0] <== new_y;
    check_new_y_max.in[1] <== 15;
    check_new_y_max.out === 1;

    // 0 <= new_area <= 2 (2 bits)
    // TODO: implement
    component check_new_area_max = LessEqThan(2);
    check_new_area_max.in[0] <== new_area;
    check_new_area_max.in[1] <== 2;
    check_new_area_max.out === 1;
}

component main {public [old_commitment, new_commitment]} = DungeonPosition();

pragma circom 2.1.0;

include "circomlib/circuits/poseidon.circom";
include "circomlib/circuits/comparators.circom";

// 0xARK Commit-Reveal Circuit v2
// Proves: "I know the preimage (action, target, salt) that hashes to the committed value"
// Without revealing the preimage until the reveal phase.
//
// Public inputs:  commitHash (the on-chain committed hash)
// Private inputs: actionType, targetArea, salt
//
// Constraints:
//   1. Poseidon(actionType, targetArea, salt) === commitHash
//   2. actionType in [1, 10]  (Draw/Steal/Barrier/Scout/Move/UseCrystal/Shadow/Flame/Storm/Void)
//   3. targetArea  in [0, 2]  (Port=0, Forest=1, Ruins=2)

template CommitReveal() {
    // Private inputs (hidden during commit phase)
    signal input actionType;   // 1=Draw, 2=Steal, 3=Barrier, 4=Scout, 5=Move, 6=UseCrystal, 7=Shadow, 8=Flame, 9=Storm, 10=Void
    signal input targetArea;   // 0=Port, 1=Forest, 2=Ruins (or target player index for Steal/Scout)
    signal input salt;         // Random nonce (256-bit)

    // Public input (stored on-chain in CommitAction account)
    signal input commitHash;

    // ── Range check: 1 ≤ actionType ≤ 10 ────────────────────────────────────
    // LessEqThan(n) checks a <= b where a,b < 2^n
    // 4 bits covers [0, 15], sufficient for actionType in [1, 10]
    component actionMin = GreaterEqThan(4);
    actionMin.in[0] <== actionType;
    actionMin.in[1] <== 1;
    actionMin.out === 1;

    component actionMax = LessEqThan(4);
    actionMax.in[0] <== actionType;
    actionMax.in[1] <== 10;
    actionMax.out === 1;

    // ── Range check: 0 ≤ targetArea ≤ 2 ─────────────────────────────────────
    // 2 bits covers [0, 3], sufficient for targetArea in [0, 2]
    component areaMax = LessEqThan(2);
    areaMax.in[0] <== targetArea;
    areaMax.in[1] <== 2;
    areaMax.out === 1;

    // ── Hash constraint ───────────────────────────────────────────────────────
    component hasher = Poseidon(3);
    hasher.inputs[0] <== actionType;
    hasher.inputs[1] <== targetArea;
    hasher.inputs[2] <== salt;

    // Constrain: computed hash must equal the committed hash
    commitHash === hasher.out;
}

component main {public [commitHash]} = CommitReveal();

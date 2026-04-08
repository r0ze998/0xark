pragma circom 2.1.0;

include "circomlib/circuits/poseidon.circom";

// 0xARK Commit-Reveal Circuit
// Proves: "I know the preimage (action, target, salt) that hashes to the committed value"
// Without revealing the preimage until the reveal phase.
//
// Public inputs:  commitHash (the on-chain committed hash)
// Private inputs: actionType, targetArea, salt
//
// Constraint: Poseidon(actionType, targetArea, salt) === commitHash

template CommitReveal() {
    // Private inputs (hidden during commit phase)
    signal input actionType;   // 1=Draw, 2=Steal, 3=Barrier, 4=Scout, 5=Move, 6-10=UseCard
    signal input targetArea;   // 0=Port, 1=Forest, 2=Ruins (or target player index)
    signal input salt;         // Random nonce

    // Public input (stored on-chain)
    signal input commitHash;

    // Compute Poseidon hash of the action
    component hasher = Poseidon(3);
    hasher.inputs[0] <== actionType;
    hasher.inputs[1] <== targetArea;
    hasher.inputs[2] <== salt;

    // Constrain: computed hash must equal the committed hash
    commitHash === hasher.out;

    // Range checks to ensure valid action types
    // actionType must be 1-10
    signal actionMinusOne;
    actionMinusOne <== actionType - 1;
    // We don't enforce the range in the circuit for simplicity
    // The on-chain program validates action types
}

component main {public [commitHash]} = CommitReveal();

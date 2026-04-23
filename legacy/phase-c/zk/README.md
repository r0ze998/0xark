# 0xARK ZK Circuits

## Commit-Reveal Circuit

Proves knowledge of the preimage `(actionType, targetArea, salt)` that hashes to a committed value, without revealing the preimage.

### How It Works

1. **Commit Phase**: Player computes `hash = Poseidon(actionType, targetArea, salt)` and submits the hash on-chain
2. **Reveal Phase**: Player submits a Groth16 proof that they know the preimage, along with the revealed values
3. **On-chain Verification**: The Solana program verifies the proof using groth16-solana (<200K compute units)

### Build

```bash
# Install dependencies
npm install circomlib snarkjs

# Compile circuit
circom circuits/commit_reveal.circom --r1cs --wasm --sym

# Powers of Tau ceremony (use existing for production)
snarkjs powersoftau new bn128 12 pot12_0000.ptau
snarkjs powersoftau contribute pot12_0000.ptau pot12_final.ptau
snarkjs powersoftau prepare phase2 pot12_final.ptau pot12_final_prep.ptau

# Generate proving/verification keys
snarkjs groth16 setup commit_reveal.r1cs pot12_final_prep.ptau commit_reveal_0000.zkey
snarkjs zkey contribute commit_reveal_0000.zkey commit_reveal_final.zkey
snarkjs zkey export verificationkey commit_reveal_final.zkey verification_key.json

# Generate proof (client-side)
snarkjs groth16 prove commit_reveal_final.zkey witness.wtns proof.json public.json

# Verify proof (can also be done on-chain)
snarkjs groth16 verify verification_key.json public.json proof.json
```

### On-Chain Verification

Uses [groth16-solana](https://github.com/Lightprotocol/groth16-solana) for <200K CU verification on Solana.

### Circuit Stats
- Constraints: ~250 (Poseidon hash is lightweight)
- Proof generation: <1 second
- Verification: <200K compute units on Solana

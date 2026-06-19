use ark_bn254::Fr;
use ark_ff::PrimeField;
/// T-D13-A0: On-chain Poseidon(15) matching circuits/hand_commitment/hand_commitment.circom
///
/// Circuit input order:
///   [round, pubkey_lo, pubkey_hi, card_ids[0..10], salt_lo, salt_hi]
///
/// JS client encoding (03-zk-prove.js _splitSalt) and the circuit both take the
/// LOW half from the FIRST 16 bytes:
///   pubkey_lo = bytesToBigInt(pubkeyBytes.slice(0, 16))   ← bytes 0-15  (big-endian)
///   pubkey_hi = bytesToBigInt(pubkeyBytes.slice(16, 32))  ← bytes 16-31 (big-endian)
///   salt_lo   = bytesToBigInt(salt.slice(0, 16))
///   salt_hi   = bytesToBigInt(salt.slice(16, 32))
///
/// This module replicates that encoding so on-chain hash == circuit commitment.
use pso_poseidon::{Poseidon, PoseidonParameters};

use crate::poseidon_t16_constants::{
    POSEIDON_T16_ALPHA, POSEIDON_T16_ARK, POSEIDON_T16_FULL_ROUNDS, POSEIDON_T16_MDS,
    POSEIDON_T16_PARTIAL_ROUNDS, POSEIDON_T16_WIDTH,
};

/// Build the Poseidon(15) hasher using hardcoded t=16 circomlib constants.
fn build_poseidon_t16() -> Poseidon<Fr> {
    let ark: Vec<Fr> = POSEIDON_T16_ARK
        .iter()
        .map(|b| Fr::from_le_bytes_mod_order(b))
        .collect();

    let mds: Vec<Vec<Fr>> = POSEIDON_T16_MDS
        .iter()
        .map(|row| row.iter().map(|b| Fr::from_le_bytes_mod_order(b)).collect())
        .collect();

    let params = PoseidonParameters::new(
        ark,
        mds,
        POSEIDON_T16_FULL_ROUNDS,
        POSEIDON_T16_PARTIAL_ROUNDS,
        POSEIDON_T16_WIDTH,
        POSEIDON_T16_ALPHA,
    );
    Poseidon::new(params)
}

/// Interpret a 16-byte big-endian slice as u128 (matching JS bytesToBigInt).
fn bytes_to_u128_be(bytes: &[u8]) -> u128 {
    let mut arr = [0u8; 16];
    arr.copy_from_slice(bytes);
    u128::from_be_bytes(arr)
}

/// Compute Poseidon(15) hand commitment matching the circuit.
///
/// Input order matches hand_commitment.circom exactly:
///   inputs[0]    = round
///   inputs[1]    = pubkey_lo  (bytes 0-15 of pubkey,  big-endian u128)
///   inputs[2]    = pubkey_hi  (bytes 16-31 of pubkey, big-endian u128)
///   inputs[3..13] = card_ids[0..10]
///   inputs[13]   = salt_lo   (bytes 0-15 of salt)
///   inputs[14]   = salt_hi   (bytes 16-31 of salt)
///
/// Returns 32-byte little-endian representation of the commitment field element.
pub fn compute_hand_commitment(
    round: u8,
    pubkey_bytes: &[u8; 32],
    card_ids: &[u64; 10],
    salt_bytes: &[u8; 32],
) -> Result<[u8; 32], PoseidonHashError> {
    // Match client/circuit: lo = first 16 bytes, hi = last 16 bytes
    let pubkey_lo = bytes_to_u128_be(&pubkey_bytes[0..16]);
    let pubkey_hi = bytes_to_u128_be(&pubkey_bytes[16..32]);

    let salt_lo = bytes_to_u128_be(&salt_bytes[0..16]);
    let salt_hi = bytes_to_u128_be(&salt_bytes[16..32]);

    let mut inputs: Vec<Fr> = Vec::with_capacity(15);
    inputs.push(Fr::from(round as u64));
    inputs.push(Fr::from(pubkey_lo));
    inputs.push(Fr::from(pubkey_hi));
    for &id in card_ids.iter() {
        inputs.push(Fr::from(id));
    }
    inputs.push(Fr::from(salt_lo));
    inputs.push(Fr::from(salt_hi));

    let mut hasher = build_poseidon_t16();

    use pso_poseidon::PoseidonHasher;
    let commitment = hasher.hash(&inputs).map_err(|_| PoseidonHashError)?;

    // Serialize to 32-byte little-endian (matches commitment bytes sent by client)
    let bigint = commitment.into_bigint();
    use ark_ff::BigInteger;
    let le_bytes = bigint.to_bytes_le();
    let mut result = [0u8; 32];
    let copy_len = le_bytes.len().min(32);
    result[..copy_len].copy_from_slice(&le_bytes[..copy_len]);
    Ok(result)
}

/// Opaque error returned when Poseidon computation fails.
#[derive(Debug)]
pub struct PoseidonHashError;

// ─── Tests ───────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;

    /// T-D13-A0: Verify Rust Poseidon(15) matches the circom circuit output.
    ///
    /// HONEST vector — pubkey_bytes / salt_bytes are laid out exactly as a real
    /// Solana pubkey / salt reaches `compute_hand_commitment` (lo = first 16
    /// bytes, hi = last 16 bytes). The previous version of this test pre-swapped
    /// the halves to match the helper's (buggy) reversed read, so the two errors
    /// cancelled and it passed even while every honest reveal_hand failed
    /// CommitmentMismatch. With the natural layout below, a reversed-read helper
    /// produces the wrong commitment and this test fails — catching the bug.
    ///
    /// Circuit vector (regenerated from hand_commitment.circom):
    ///   round      = 1
    ///   card_ids   = [1, 5, 23, 47, 2, 0, 0, 0, 0, 0]
    ///   pubkey_lo  = 147573952589676412927   (bytes 0-15  of pubkey, BE u128)
    ///   pubkey_hi  = 295147905179352825855   (bytes 16-31 of pubkey, BE u128)
    ///   salt_lo    = 147573952589676412927   (bytes 0-15  of salt)
    ///   salt_hi    = 295147905179352825855   (bytes 16-31 of salt)
    ///   commitment = 17463847584621727651010613540357406880358104918389010558000377047778559303304
    #[test]
    fn poseidon_match_circuit_commitment() {
        // lo = 147573952589676412927 = 0x0000000000000007FFFFFFFFFFFFFFFF
        let lo: [u8; 16] = [
            0, 0, 0, 0, 0, 0, 0, 7, 255, 255, 255, 255, 255, 255, 255, 255,
        ];
        // hi = 295147905179352825855 = 0x000000000000000FFFFFFFFFFFFFFFFF
        let hi: [u8; 16] = [
            0, 0, 0, 0, 0, 0, 0, 15, 255, 255, 255, 255, 255, 255, 255, 255,
        ];

        // Natural layout: bytes[0..16] = lo, bytes[16..32] = hi (NO pre-swap).
        let mut pubkey_bytes = [0u8; 32];
        pubkey_bytes[0..16].copy_from_slice(&lo);
        pubkey_bytes[16..32].copy_from_slice(&hi);

        let mut salt_bytes = [0u8; 32];
        salt_bytes[0..16].copy_from_slice(&lo);
        salt_bytes[16..32].copy_from_slice(&hi);

        let card_ids: [u64; 10] = [1, 5, 23, 47, 2, 0, 0, 0, 0, 0];

        let result = compute_hand_commitment(1, &pubkey_bytes, &card_ids, &salt_bytes)
            .expect("poseidon computation should succeed");

        // LE bytes of commitment decimal
        // 17463847584621727651010613540357406880358104918389010558000377047778559303304
        let expected_le: [u8; 32] = [
            136, 158, 32, 139, 134, 208, 171, 167, 140, 10, 22, 229, 193, 225, 110, 74, 64, 138,
            29, 181, 254, 90, 211, 100, 229, 52, 102, 193, 252, 47, 156, 38,
        ];

        assert_eq!(
            result, expected_le,
            "Rust Poseidon(15) does not match circuit commitment.\n\
             Got:      {:?}\n\
             Expected: {:?}",
            result, expected_le
        );
    }

    /// DEF-16 cheat test: commit to card_ids A but reveal card_ids B → CommitmentMismatch.
    /// This test lives in the reveal_hand integration tests; here we just verify
    /// that different inputs produce different commitments.
    #[test]
    fn poseidon_different_inputs_different_outputs() {
        let pubkey = [0u8; 32];
        let salt = [1u8; 32];
        let cards_a: [u64; 10] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
        let cards_b: [u64; 10] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 99];

        let h_a = compute_hand_commitment(1, &pubkey, &cards_a, &salt).unwrap();
        let h_b = compute_hand_commitment(1, &pubkey, &cards_b, &salt).unwrap();

        assert_ne!(
            h_a, h_b,
            "Different card_ids must produce different commitments"
        );
    }

    /// Determinism: same inputs always produce same output.
    #[test]
    fn poseidon_deterministic() {
        let pubkey = [42u8; 32];
        let salt = [7u8; 32];
        let cards: [u64; 10] = [10, 20, 30, 0, 0, 0, 0, 0, 0, 0];

        let h1 = compute_hand_commitment(2, &pubkey, &cards, &salt).unwrap();
        let h2 = compute_hand_commitment(2, &pubkey, &cards, &salt).unwrap();

        assert_eq!(h1, h2, "Poseidon must be deterministic");
    }
}

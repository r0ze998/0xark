/// T-D13-A0: On-chain Poseidon(15) matching circuits/hand_commitment/hand_commitment.circom
///
/// Circuit input order:
///   [round, pubkey_lo, pubkey_hi, card_ids[0..10], salt_lo, salt_hi]
///
/// JS client encoding (08-duel-scene.js generateHandCommitmentProof):
///   pubkey_lo = bytesToBigInt(pubkeyBytes.slice(16, 32))  ← bytes 16-31 (big-endian)
///   pubkey_hi = bytesToBigInt(pubkeyBytes.slice(0, 16))   ← bytes 0-15  (big-endian)
///   salt_lo   = bytesToBigInt(salt.slice(16, 32))
///   salt_hi   = bytesToBigInt(salt.slice(0, 16))
///
/// This module replicates that encoding so on-chain hash == circuit commitment.

use pso_poseidon::{Poseidon, PoseidonParameters};
use ark_bn254::Fr;
use ark_ff::PrimeField;

use crate::poseidon_t16_constants::{
    POSEIDON_T16_ARK,
    POSEIDON_T16_MDS,
    POSEIDON_T16_FULL_ROUNDS,
    POSEIDON_T16_PARTIAL_ROUNDS,
    POSEIDON_T16_WIDTH,
    POSEIDON_T16_ALPHA,
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
///   inputs[1]    = pubkey_lo  (bytes 16-31 of pubkey, big-endian u128)
///   inputs[2]    = pubkey_hi  (bytes 0-15 of pubkey,  big-endian u128)
///   inputs[3..13] = card_ids[0..10]
///   inputs[13]   = salt_lo   (bytes 16-31 of salt)
///   inputs[14]   = salt_hi   (bytes 0-15 of salt)
///
/// Returns 32-byte little-endian representation of the commitment field element.
pub fn compute_hand_commitment(
    round: u8,
    pubkey_bytes: &[u8; 32],
    card_ids: &[u64; 10],
    salt_bytes: &[u8; 32],
) -> Result<[u8; 32], PoseidonHashError> {
    // Match JS: pubkey_lo = bytes 16-31, pubkey_hi = bytes 0-15
    let pubkey_lo = bytes_to_u128_be(&pubkey_bytes[16..32]);
    let pubkey_hi = bytes_to_u128_be(&pubkey_bytes[0..16]);

    // Match JS: salt_lo = bytes 16-31, salt_hi = bytes 0-15
    let salt_lo = bytes_to_u128_be(&salt_bytes[16..32]);
    let salt_hi = bytes_to_u128_be(&salt_bytes[0..16]);

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
    let commitment = hasher
        .hash(&inputs)
        .map_err(|_| PoseidonHashError)?;

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
    /// Test vector from Day 12 proof.json/public.json (hand_commitment circuit):
    ///   round      = 1
    ///   pubkey_lo  = 147573952589676412927   (bytes 16-31 of pubkey, BE u128)
    ///   pubkey_hi  = 295147905179352825855   (bytes 0-15  of pubkey, BE u128)
    ///   card_ids   = [1, 5, 23, 47, 2, 0, 0, 0, 0, 0]
    ///   salt_lo    = 39614081257132168796771975168   (bytes 16-31 of salt)
    ///   salt_hi    = 79228162514264337593543950335   (bytes 0-15  of salt)
    ///   commitment = 10100113277745503718751020503234026402412313156239001215309700981685679881829
    ///
    /// The expected LE bytes were computed from the decimal commitment via:
    ///   buf[i] = (commitment >> i*8) & 0xFF
    #[test]
    fn poseidon_match_circuit_commitment() {
        // Build pubkey_bytes: [pubkey_hi BE | pubkey_lo BE]
        let mut pubkey_bytes = [0u8; 32];
        // pubkey_hi (bytes 0..16): 295147905179352825855 = 0x00000000000000_0F_FFFFFFFFFFFFFFFF
        pubkey_bytes[0..16].copy_from_slice(&[0, 0, 0, 0, 0, 0, 0, 15, 255, 255, 255, 255, 255, 255, 255, 255]);
        // pubkey_lo (bytes 16..32): 147573952589676412927 = 0x00000000000000_07_FFFFFFFFFFFFFF
        pubkey_bytes[16..32].copy_from_slice(&[0, 0, 0, 0, 0, 0, 0, 7, 255, 255, 255, 255, 255, 255, 255, 255]);

        // Build salt_bytes: [salt_hi BE | salt_lo BE]
        let mut salt_bytes = [0u8; 32];
        // salt_hi (bytes 0..16): 79228162514264337593543950335 = 2^96 - 1
        salt_bytes[0..16].copy_from_slice(&[0, 0, 0, 0, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255]);
        // salt_lo (bytes 16..32): 39614081257132168796771975168 = 2^95
        salt_bytes[16..32].copy_from_slice(&[0, 0, 0, 0, 128, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);

        let card_ids: [u64; 10] = [1, 5, 23, 47, 2, 0, 0, 0, 0, 0];

        let result = compute_hand_commitment(1, &pubkey_bytes, &card_ids, &salt_bytes)
            .expect("poseidon computation should succeed");

        // Expected LE bytes of commitment decimal
        // 10100113277745503718751020503234026402412313156239001215309700981685679881829
        let expected_le: [u8; 32] = [
            101, 254, 20, 78, 171, 229, 171, 10,
            239, 99, 224, 42, 72, 213, 240, 241,
            156, 199, 190, 29, 65, 187, 243, 72,
            65, 52, 174, 236, 38, 118, 84, 22,
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

        assert_ne!(h_a, h_b, "Different card_ids must produce different commitments");
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

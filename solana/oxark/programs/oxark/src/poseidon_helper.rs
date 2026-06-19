/// YKK-33: On-chain Poseidon(6) via the `sol_poseidon` syscall, matching
/// circuits/hand_commitment/hand_commitment.circom v3.
///
/// v2 hashed 15 inputs with a pure-Rust ark-bn254 Poseidon(15), which cost >8M CU
/// on-chain (over Solana's 1.4M/tx limit) so reveal_hand could never run. The
/// `sol_poseidon` syscall only supports 1..12 inputs, so v3 packs the 10 card_ids
/// into one field element and hashes 6 inputs. Syscall cost: 61*6^2 + 542 = 2,738 CU.
///
/// Circuit input order (Poseidon(6)):
///   [round, pubkey_lo, pubkey_hi, cards_packed, salt_lo, salt_hi]
///
/// Half-splitting matches the client (03-zk-prove.js _splitSalt) and the circuit —
/// the LOW half is the FIRST 16 bytes (big-endian), preserved from PR #19:
///   pubkey_lo = pubkey_bytes[0..16]   pubkey_hi = pubkey_bytes[16..32]
///   salt_lo   = salt_bytes[0..16]     salt_hi   = salt_bytes[16..32]
///
/// Card packing (must match the circuit exactly):
///   cards_packed = Σ card_ids[i] * 2^(6*i)   for i in 0..10
/// Each active card is < 64 (range 1..60) and padding slots are 0, so the packing
/// is injective.
///
/// Endianness: we hash with `Endianness::LittleEndian`, so each input is encoded
/// LE and the output is the commitment field element in LITTLE-endian — the
/// representation reveal_hand expects (it reverses to big-endian before comparing
/// against the stored commitment, which is the big-endian snarkjs publicSignals[0]).
use solana_poseidon::{hashv, Endianness, Parameters};

/// Interpret a 16-byte big-endian slice as u128 (matching JS bytesToBigInt).
fn bytes_to_u128_be(bytes: &[u8]) -> u128 {
    let mut arr = [0u8; 16];
    arr.copy_from_slice(bytes);
    u128::from_be_bytes(arr)
}

/// Encode a field-element value (< 2^128) as a 32-byte little-endian buffer for
/// the syscall (low 16 bytes carry the value, high 16 bytes are zero).
fn field_le(value: u128) -> [u8; 32] {
    let mut out = [0u8; 32];
    out[..16].copy_from_slice(&value.to_le_bytes());
    out
}

/// Pack card_ids into a single field element: Σ card_ids[i] * 2^(6*i).
/// Mirrors `cards_packed` in hand_commitment.circom v3.
fn pack_cards(card_ids: &[u64; 10]) -> u128 {
    let mut packed: u128 = 0;
    for (i, &id) in card_ids.iter().enumerate() {
        packed += (id as u128) << (6 * i as u32);
    }
    packed
}

/// Compute the Poseidon(6) hand commitment matching the circuit.
///
/// Returns the 32-byte little-endian representation of the commitment field
/// element (same contract as the previous helper; reveal_hand reverses it to
/// big-endian for comparison with the stored commitment).
pub fn compute_hand_commitment(
    round: u8,
    pubkey_bytes: &[u8; 32],
    card_ids: &[u64; 10],
    salt_bytes: &[u8; 32],
) -> Result<[u8; 32], PoseidonHashError> {
    // Match client/circuit: lo = first 16 bytes, hi = last 16 bytes.
    let pubkey_lo = bytes_to_u128_be(&pubkey_bytes[0..16]);
    let pubkey_hi = bytes_to_u128_be(&pubkey_bytes[16..32]);
    let salt_lo = bytes_to_u128_be(&salt_bytes[0..16]);
    let salt_hi = bytes_to_u128_be(&salt_bytes[16..32]);
    let cards_packed = pack_cards(card_ids);

    // Poseidon(6) input order — must match the circuit.
    let round_fe = field_le(round as u128);
    let pubkey_lo_fe = field_le(pubkey_lo);
    let pubkey_hi_fe = field_le(pubkey_hi);
    let cards_fe = field_le(cards_packed);
    let salt_lo_fe = field_le(salt_lo);
    let salt_hi_fe = field_le(salt_hi);

    let hash = hashv(
        Parameters::Bn254X5,
        Endianness::LittleEndian,
        &[
            &round_fe,
            &pubkey_lo_fe,
            &pubkey_hi_fe,
            &cards_fe,
            &salt_lo_fe,
            &salt_hi_fe,
        ],
    )
    .map_err(|_| PoseidonHashError)?;

    Ok(hash.to_bytes())
}

/// Opaque error returned when Poseidon computation fails.
#[derive(Debug)]
pub struct PoseidonHashError;

// ─── Tests ───────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;

    /// YKK-33: verify the syscall-backed Poseidon(6) matches the circom circuit.
    ///
    /// Vector is the circuit's own build/input.json + build/public.json
    /// (`snarkjs groth16 prove` over hand_commitment v3), so a divergence between
    /// `solana_poseidon` (light-poseidon) and circomlib would fail here. Byte
    /// layout is honest — lo = first 16 bytes, hi = last 16 bytes — so a reversed
    /// half-split would also fail.
    ///
    ///   round      = 1
    ///   card_ids   = [1, 5, 23, 47, 2, 0, 0, 0, 0, 0]   (cards_packed = 45969729)
    ///   pubkey_lo  = 147573952589676412927   (bytes 0-15)
    ///   pubkey_hi  = 295147905179352825855   (bytes 16-31)
    ///   salt_lo    = 39614081257132168796771975168   (bytes 0-15, = 2^95)
    ///   salt_hi    = 79228162514264337593543950335   (bytes 16-31, = 2^96 - 1)
    ///   commitment = 14285745838617790439054859270532057028964433313491577385583955020491773167721
    #[test]
    fn poseidon_match_circuit_commitment() {
        let mut pubkey_bytes = [0u8; 32];
        // lo (bytes 0..16) = 147573952589676412927 = 0x07FF_FFFF_FFFF_FFFF
        pubkey_bytes[0..16].copy_from_slice(&[
            0, 0, 0, 0, 0, 0, 0, 7, 255, 255, 255, 255, 255, 255, 255, 255,
        ]);
        // hi (bytes 16..32) = 295147905179352825855 = 0x0FFF_FFFF_FFFF_FFFF
        pubkey_bytes[16..32].copy_from_slice(&[
            0, 0, 0, 0, 0, 0, 0, 15, 255, 255, 255, 255, 255, 255, 255, 255,
        ]);

        let mut salt_bytes = [0u8; 32];
        // lo (bytes 0..16) = 2^95
        salt_bytes[0..16].copy_from_slice(&[0, 0, 0, 0, 128, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
        // hi (bytes 16..32) = 2^96 - 1
        salt_bytes[16..32].copy_from_slice(&[
            0, 0, 0, 0, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255,
        ]);

        let card_ids: [u64; 10] = [1, 5, 23, 47, 2, 0, 0, 0, 0, 0];

        let result = compute_hand_commitment(1, &pubkey_bytes, &card_ids, &salt_bytes)
            .expect("poseidon computation should succeed");

        // LE bytes of the commitment decimal above.
        let expected_le: [u8; 32] = [
            105, 200, 183, 233, 196, 189, 41, 113, 111, 35, 159, 92, 32, 54, 123, 254, 201, 132,
            19, 185, 204, 80, 6, 116, 205, 37, 77, 81, 19, 114, 149, 31,
        ];

        assert_eq!(
            result, expected_le,
            "syscall Poseidon(6) does not match circuit commitment.\n\
             Got:      {:?}\n\
             Expected: {:?}",
            result, expected_le
        );
    }

    /// Card packing must match the circuit: cards_packed = Σ card_ids[i]*2^(6i).
    #[test]
    fn pack_cards_matches_circuit_formula() {
        let card_ids: [u64; 10] = [1, 5, 23, 47, 2, 0, 0, 0, 0, 0];
        assert_eq!(pack_cards(&card_ids), 45_969_729);
    }

    /// Different card_ids must produce different commitments.
    #[test]
    fn poseidon_different_inputs_different_outputs() {
        let pubkey = [0u8; 32];
        let salt = [1u8; 32];
        let cards_a: [u64; 10] = [1, 2, 3, 4, 5, 0, 0, 0, 0, 0];
        let cards_b: [u64; 10] = [1, 2, 3, 4, 6, 0, 0, 0, 0, 0];

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

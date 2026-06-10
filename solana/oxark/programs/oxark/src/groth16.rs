//! Shared BN254 / Groth16 verification primitives.
//!
//! Used by `verify_zk_proof` (hand_commitment v2, 4096 constraints) and
//! `commit_hand` (hand_commitment, 576 constraints). The two instructions
//! verify proofs from DIFFERENT trusted setups, so the verification-key
//! constants stay embedded in each instruction file — this module holds
//! only the circuit-agnostic math and field-element encoding helpers.

use anchor_lang::prelude::*;
use solana_bn254::prelude::{alt_bn128_addition, alt_bn128_multiplication, alt_bn128_pairing};

use crate::error::ErrorCode;

/// Pairing-side verification key points (everything except the IC array).
pub struct Groth16Vk<'a> {
    pub alpha_g1: &'a [u8; 64],
    pub beta_g2: &'a [u8; 128],
    pub gamma_g2: &'a [u8; 128],
    pub delta_g2: &'a [u8; 128],
}

/// Negate a G1 point on BN254 (modular negation of the y-coordinate).
/// BN254 field prime p = 21888242871839275222246405745257275088696311157297823662689037894645226208583
pub fn negate_g1(pt: &[u8; 64]) -> [u8; 64] {
    const P: [u64; 4] = [
        0x3c208c16d87cfd47,
        0x97816a916871ca8d,
        0xb85045b68181585d,
        0x30644e72e131a029,
    ];
    let mut neg = [0u8; 64];
    neg[..32].copy_from_slice(&pt[..32]);

    let mut y = [0u64; 4];
    for i in 0..4 {
        let off = 32 + (3 - i) * 8;
        y[i] = u64::from_be_bytes(pt[off..off + 8].try_into().unwrap());
    }
    if y == [0u64; 4] {
        neg[32..].copy_from_slice(&pt[32..]);
        return neg;
    }
    let mut borrow = 0u64;
    let mut result = [0u64; 4];
    for i in 0..4 {
        let (r, b1) = P[i].overflowing_sub(y[i]);
        let (r2, b2) = r.overflowing_sub(borrow);
        result[i] = r2;
        borrow = (b1 || b2) as u64;
    }
    for i in 0..4 {
        let off = 32 + (3 - i) * 8;
        neg[off..off + 8].copy_from_slice(&result[i].to_be_bytes());
    }
    neg
}

/// Scalar-multiply a G1 point via the alt_bn128 syscall.
pub fn scale_g1(point: &[u8; 64], scalar: &[u8; 32]) -> Result<[u8; 64]> {
    let mut input = [0u8; 96];
    input[..64].copy_from_slice(point);
    input[64..].copy_from_slice(scalar);
    let scaled = alt_bn128_multiplication(&input).map_err(|_| error!(ErrorCode::ZkProofInvalid))?;
    let mut out = [0u8; 64];
    out.copy_from_slice(&scaled);
    Ok(out)
}

/// Add two G1 points via the alt_bn128 syscall.
pub fn add_g1(a: &[u8; 64], b: &[u8; 64]) -> Result<[u8; 64]> {
    let mut input = [0u8; 128];
    input[..64].copy_from_slice(a);
    input[64..].copy_from_slice(b);
    let result = alt_bn128_addition(&input).map_err(|_| error!(ErrorCode::ZkProofInvalid))?;
    let mut out = [0u8; 64];
    out.copy_from_slice(&result);
    Ok(out)
}

/// Compute vk_x = IC[0] + Σ signals[i] * IC[i+1].
///
/// `ic_rest` is [IC[1], ..., IC[n]] and must be the same length as `signals`.
pub fn compute_vk_x(
    ic0: &[u8; 64],
    ic_rest: &[&[u8; 64]],
    signals: &[[u8; 32]],
) -> Result<[u8; 64]> {
    require!(ic_rest.len() == signals.len(), ErrorCode::ZkProofInvalid);
    let mut vk_x = *ic0;
    for (ic, sig) in ic_rest.iter().zip(signals.iter()) {
        let scaled = scale_g1(ic, sig)?;
        vk_x = add_g1(&vk_x, &scaled)?;
    }
    Ok(vk_x)
}

/// Full Groth16 pairing check: e(A,B) * e(-α,β) * e(-vk_x,γ) * e(-C,δ) == 1
pub fn groth16_verify(
    vk: &Groth16Vk,
    proof_a: &[u8; 64],
    proof_b: &[u8; 128],
    proof_c: &[u8; 64],
    vk_x: &[u8; 64],
) -> Result<bool> {
    let neg_alpha = negate_g1(vk.alpha_g1);
    let neg_vk_x = negate_g1(vk_x);
    let neg_c = negate_g1(proof_c);

    let mut pairing_input = [0u8; 768];
    pairing_input[0..64].copy_from_slice(proof_a);
    pairing_input[64..192].copy_from_slice(proof_b);
    pairing_input[192..256].copy_from_slice(&neg_alpha);
    pairing_input[256..384].copy_from_slice(vk.beta_g2);
    pairing_input[384..448].copy_from_slice(&neg_vk_x);
    pairing_input[448..576].copy_from_slice(vk.gamma_g2);
    pairing_input[576..640].copy_from_slice(&neg_c);
    pairing_input[640..768].copy_from_slice(vk.delta_g2);

    let result =
        alt_bn128_pairing(&pairing_input).map_err(|_| error!(ErrorCode::ZkProofInvalid))?;

    let mut one = [0u8; 32];
    one[31] = 1;
    Ok(result == one)
}

/// Split a 32-byte Solana pubkey into two 16-byte halves encoded as 32-byte
/// BN254 field elements (big-endian zero-padded).
///
/// Must match the client-side packing used in the circom witness:
///   pubkey_lo = BigInt from pubkeyBytes[0..16]
///   pubkey_hi = BigInt from pubkeyBytes[16..32]
pub fn split_pubkey(pubkey: &Pubkey) -> ([u8; 32], [u8; 32]) {
    let bytes = pubkey.to_bytes();
    let mut lo = [0u8; 32];
    let mut hi = [0u8; 32];
    lo[16..32].copy_from_slice(&bytes[0..16]);
    hi[16..32].copy_from_slice(&bytes[16..32]);
    (lo, hi)
}

/// Encode a u64 as a 32-byte BN254 field element (big-endian zero-padded).
pub fn u64_to_field(n: u64) -> [u8; 32] {
    let mut out = [0u8; 32];
    out[24..32].copy_from_slice(&n.to_be_bytes());
    out
}

/// Verification key for the hand_commitment v2 circuit
/// (circuits/hand_commitment/hand_commitment.circom — Poseidon(15) over
/// round, pubkey_lo, pubkey_hi, card_ids[10], salt_lo, salt_hi, plus range
/// and uniqueness constraints; 4096-constraint pot12 trusted setup).
///
/// Shared by `verify_zk_proof` and `commit_hand` — both verify proofs from
/// the SAME zkey (solana/client/hand_commitment_final.zkey ==
/// circuits/hand_commitment/build/hc_final.zkey).
/// Public signals (snarkjs order): [commitment, round, pubkey_lo, pubkey_hi].
pub mod hand_commitment_vk {
    use super::Groth16Vk;

    /// VK α point (G1, 64 bytes: x||y big-endian)
    pub const ALPHA_G1: [u8; 64] = [
        13, 58, 172, 32, 177, 216, 235, 208, 183, 197, 110, 70, 31, 229, 53, 155, 63, 214, 137, 1,
        218, 228, 83, 211, 21, 131, 44, 40, 52, 13, 123, 187, 40, 111, 8, 171, 21, 188, 128, 206,
        167, 191, 183, 30, 41, 233, 189, 48, 58, 111, 49, 217, 63, 251, 80, 241, 160, 228, 15, 209,
        219, 150, 238, 66,
    ];

    /// VK β point (G2, 128 bytes: x1||x0||y1||y0 big-endian)
    pub const BETA_G2: [u8; 128] = [
        42, 235, 231, 89, 194, 244, 191, 107, 20, 166, 221, 165, 96, 69, 244, 75, 116, 216, 250,
        209, 156, 90, 171, 236, 166, 226, 144, 63, 137, 230, 112, 51, 18, 78, 231, 105, 214, 69,
        237, 7, 200, 253, 80, 199, 198, 126, 188, 220, 116, 2, 244, 57, 125, 203, 217, 78, 162, 98,
        242, 82, 35, 68, 185, 252, 25, 18, 34, 172, 185, 14, 120, 142, 67, 49, 175, 48, 232, 205,
        34, 213, 234, 164, 102, 93, 103, 143, 1, 69, 151, 166, 5, 55, 71, 147, 137, 54, 28, 211,
        42, 28, 34, 168, 29, 207, 111, 80, 158, 142, 60, 206, 183, 67, 218, 45, 200, 53, 121, 246,
        252, 97, 148, 244, 61, 38, 115, 142, 176, 84,
    ];

    /// VK γ point (G2, 128 bytes) — standard BN254 G2 generator
    pub const GAMMA_G2: [u8; 128] = [
        25, 142, 147, 147, 146, 13, 72, 58, 114, 96, 191, 183, 49, 251, 93, 37, 241, 170, 73, 51,
        53, 169, 231, 18, 151, 228, 133, 183, 174, 243, 18, 194, 24, 0, 222, 239, 18, 31, 30, 118,
        66, 106, 0, 102, 94, 92, 68, 121, 103, 67, 34, 212, 247, 94, 218, 221, 70, 222, 189, 92,
        217, 146, 246, 237, 9, 6, 137, 208, 88, 95, 240, 117, 236, 158, 153, 173, 105, 12, 51, 149,
        188, 75, 49, 51, 112, 179, 142, 243, 85, 172, 218, 220, 209, 34, 151, 91, 18, 200, 94, 165,
        219, 140, 109, 235, 74, 171, 113, 128, 141, 203, 64, 143, 227, 209, 231, 105, 12, 67, 211,
        123, 76, 230, 204, 1, 102, 250, 125, 170,
    ];

    /// VK δ point (G2, 128 bytes) — circuit-specific, hand_commitment v2
    pub const DELTA_G2: [u8; 128] = [
        20, 240, 89, 229, 101, 154, 207, 46, 168, 230, 92, 111, 116, 62, 55, 252, 225, 97, 224,
        195, 173, 34, 197, 220, 199, 120, 17, 126, 27, 86, 20, 13, 21, 20, 8, 190, 164, 119, 233,
        63, 113, 32, 93, 33, 251, 34, 209, 162, 26, 8, 193, 57, 123, 206, 173, 44, 75, 128, 160,
        222, 249, 48, 31, 73, 2, 1, 65, 126, 69, 226, 241, 86, 144, 225, 216, 134, 132, 231, 9,
        148, 133, 88, 29, 153, 10, 248, 158, 66, 247, 17, 181, 133, 186, 101, 177, 213, 12, 236,
        47, 50, 26, 33, 233, 125, 35, 157, 116, 80, 209, 54, 41, 203, 127, 57, 118, 41, 233, 58,
        191, 254, 126, 49, 161, 35, 111, 136, 41, 137,
    ];

    /// IC[0] — contribution from constant 1
    pub const IC0: [u8; 64] = [
        29, 196, 105, 161, 42, 10, 42, 5, 24, 115, 12, 126, 127, 151, 177, 41, 116, 76, 103, 240,
        155, 94, 102, 167, 7, 216, 146, 78, 7, 219, 72, 230, 25, 212, 215, 36, 168, 132, 71, 52, 7,
        114, 188, 122, 217, 54, 51, 248, 12, 6, 190, 149, 28, 63, 159, 103, 123, 180, 46, 100, 96,
        3, 118, 174,
    ];

    /// IC[1] — contribution from public_inputs[0] = commitment
    pub const IC1: [u8; 64] = [
        37, 60, 27, 104, 10, 234, 113, 152, 104, 245, 168, 107, 237, 203, 1, 57, 128, 254, 81, 25,
        134, 237, 156, 119, 233, 228, 136, 91, 174, 239, 69, 216, 39, 105, 225, 178, 36, 73, 212,
        27, 45, 209, 76, 51, 146, 203, 150, 37, 253, 110, 186, 63, 239, 35, 83, 242, 17, 197, 25,
        160, 199, 231, 39, 208,
    ];

    /// IC[2] — contribution from public_inputs[1] = round
    pub const IC2: [u8; 64] = [
        46, 113, 129, 70, 61, 211, 128, 155, 82, 142, 208, 81, 123, 239, 154, 2, 228, 165, 63, 45,
        167, 216, 232, 196, 114, 127, 56, 101, 229, 185, 187, 21, 0, 97, 59, 83, 64, 16, 144, 9,
        185, 25, 50, 242, 143, 221, 198, 120, 123, 39, 97, 32, 25, 92, 243, 138, 107, 68, 109, 190,
        253, 235, 205, 234,
    ];

    /// IC[3] — contribution from public_inputs[2] = pubkey_lo
    pub const IC3: [u8; 64] = [
        29, 107, 142, 110, 48, 246, 148, 225, 177, 104, 205, 85, 213, 141, 213, 148, 247, 208, 101,
        95, 158, 26, 208, 149, 35, 30, 220, 173, 174, 80, 228, 173, 44, 62, 253, 165, 254, 154, 6,
        22, 47, 208, 51, 52, 247, 43, 95, 35, 222, 113, 194, 43, 96, 235, 79, 76, 226, 82, 164, 77,
        100, 109, 197, 125,
    ];

    /// IC[4] — contribution from public_inputs[3] = pubkey_hi
    pub const IC4: [u8; 64] = [
        26, 10, 170, 21, 171, 232, 1, 4, 207, 226, 157, 145, 149, 73, 31, 38, 70, 204, 68, 244,
        242, 75, 32, 226, 50, 162, 28, 57, 141, 88, 119, 38, 13, 233, 4, 126, 8, 95, 117, 165, 58,
        31, 191, 181, 102, 233, 117, 17, 40, 38, 40, 103, 123, 206, 105, 246, 221, 75, 243, 156,
        33, 149, 189, 178,
    ];

    /// Pairing-side VK points.
    pub const VK: Groth16Vk<'static> = Groth16Vk {
        alpha_g1: &ALPHA_G1,
        beta_g2: &BETA_G2,
        gamma_g2: &GAMMA_G2,
        delta_g2: &DELTA_G2,
    };

    /// IC[1..=4] — one point per public signal.
    pub const IC_REST: [&[u8; 64]; 4] = [&IC1, &IC2, &IC3, &IC4];
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn negate_g1_is_involutive() {
        let mut pt = [0u8; 64];
        pt[31] = 7; // x = 7
        pt[63] = 1; // y = 1
        let neg = negate_g1(&pt);
        assert_eq!(neg[..32], pt[..32], "x-coordinate must be unchanged");
        assert_ne!(neg[32..], pt[32..], "y-coordinate must change for y != 0");
        assert_eq!(
            negate_g1(&neg),
            pt,
            "double negation must return the original point"
        );
    }

    #[test]
    fn negate_g1_keeps_point_at_infinity() {
        let zero = [0u8; 64];
        assert_eq!(negate_g1(&zero), zero);
    }

    #[test]
    fn u64_to_field_encodes_big_endian_tail() {
        let fe = u64_to_field(0x0102030405060708);
        assert_eq!(&fe[..24], &[0u8; 24]);
        assert_eq!(&fe[24..], &[1, 2, 3, 4, 5, 6, 7, 8]);
    }

    #[test]
    fn split_pubkey_halves_match_client_packing() {
        let bytes: [u8; 32] = core::array::from_fn(|i| i as u8);
        let pk = Pubkey::new_from_array(bytes);
        let (lo, hi) = split_pubkey(&pk);
        assert_eq!(&lo[..16], &[0u8; 16]);
        assert_eq!(&lo[16..], &bytes[..16]);
        assert_eq!(&hi[..16], &[0u8; 16]);
        assert_eq!(&hi[16..], &bytes[16..]);
    }
}

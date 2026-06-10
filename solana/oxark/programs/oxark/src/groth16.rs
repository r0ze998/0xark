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

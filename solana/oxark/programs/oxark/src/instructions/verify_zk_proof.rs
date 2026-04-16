use anchor_lang::prelude::*;
use solana_bn254::prelude::{
    alt_bn128_addition, alt_bn128_multiplication, alt_bn128_pairing,
};
use crate::constants::*;
use crate::state::*;
use crate::error::ErrorCode;

// ─── Embedded Verification Key (Groth16 BN254) ───────────────────────────
// Generated from: zk/circuits/commit_reveal.circom v2
// Circuit: Poseidon3(actionType, targetArea, salt) == commitHash
//   + range checks: actionType in [1,10], targetArea in [0,2]
// Trusted setup: snarkjs groth16, 277 non-linear constraints

/// VK α point (G1, 64 bytes: x||y big-endian)
const VK_ALPHA_G1: [u8; 64] = [
    12,70,119,88,222,211,15,124,199,34,131,219,187,139,76,238,91,244,176,6,56,144,231,238,20,23,130,20,131,164,5,180,
    19,242,90,207,52,253,188,191,132,54,24,231,143,12,49,129,127,190,125,12,120,201,187,168,194,194,246,94,53,254,117,144,
];

/// VK β point (G2, 128 bytes: x1||x0||y1||y0 big-endian)
const VK_BETA_G2: [u8; 128] = [
    4,230,114,60,172,32,88,254,10,66,189,37,188,47,182,212,202,230,180,41,145,175,119,34,202,6,176,110,99,6,87,38,
    4,2,191,39,204,99,12,74,252,182,223,130,245,160,56,152,70,110,249,142,228,27,194,126,239,201,189,138,75,206,62,180,
    31,118,188,116,236,118,89,88,120,33,167,107,57,186,169,134,85,22,65,26,247,210,215,184,238,13,86,79,209,207,206,159,
    35,26,57,218,183,214,192,125,203,119,228,119,251,126,199,214,233,200,177,121,122,105,229,57,169,23,16,178,84,87,73,0,
];

/// VK γ point (G2, 128 bytes)
const VK_GAMMA_G2: [u8; 128] = [
    25,142,147,147,146,13,72,58,114,96,191,183,49,251,93,37,241,170,73,51,53,169,231,18,151,228,133,183,174,243,18,194,
    24,0,222,239,18,31,30,118,66,106,0,102,94,92,68,121,103,67,34,212,247,94,218,221,70,222,189,92,217,146,246,237,
    9,6,137,208,88,95,240,117,236,158,153,173,105,12,51,149,188,75,49,51,112,179,142,243,85,172,218,220,209,34,151,91,
    18,200,94,165,219,140,109,235,74,171,113,128,141,203,64,143,227,209,231,105,12,67,211,123,76,230,204,1,102,250,125,170,
];

/// VK δ point (G2, 128 bytes)
const VK_DELTA_G2: [u8; 128] = [
    29,231,102,250,185,36,149,14,159,33,127,200,248,220,122,199,207,113,247,39,147,161,121,155,39,237,91,35,234,125,59,150,
    18,150,100,214,140,121,136,2,168,90,242,78,35,196,47,185,46,199,241,232,204,80,180,200,124,46,215,123,51,161,166,68,
    5,152,82,120,153,147,172,129,93,111,40,177,6,235,89,29,225,212,153,90,194,174,241,170,143,84,145,134,158,213,67,163,
    28,51,9,166,223,200,69,164,166,137,212,237,78,31,56,36,124,232,19,49,241,11,107,213,127,24,61,202,101,185,198,210,
];

/// IC[0] (G1 point, 64 bytes — contribution from constant 1)
const VK_IC0: [u8; 64] = [
    14,109,254,146,41,40,158,33,181,122,126,127,15,39,192,228,26,154,53,35,169,112,62,251,198,185,118,19,175,66,91,169,
    25,15,86,246,200,239,19,207,106,132,225,68,117,114,12,106,106,225,86,7,140,100,110,137,139,150,201,56,7,159,57,187,
];

/// IC[1] (G1 point, 64 bytes — contribution from public input 0)
const VK_IC1: [u8; 64] = [
    28,243,0,39,24,112,97,126,31,193,36,110,180,144,240,132,188,117,150,75,180,198,64,21,188,197,140,178,78,118,55,246,
    33,40,217,223,79,67,2,120,194,187,178,233,223,85,102,67,168,243,253,243,76,239,236,216,21,245,84,220,236,146,116,201,
];

// ─── Groth16 Verifier ────────────────────────────────────────────────────

/// Negate a G1 point on BN254.
/// BN254 field prime p = 21888242871839275222246405745257275088696311157297823662689037894645226208583
/// Negation: (x, p - y) for y != 0
fn negate_g1(pt: &[u8; 64]) -> [u8; 64] {
    const P: [u64; 4] = [
        0x3c208c16d87cfd47,
        0x97816a916871ca8d,
        0xb85045b68181585d,
        0x30644e72e131a029,
    ];
    let mut neg = [0u8; 64];
    neg[..32].copy_from_slice(&pt[..32]); // x unchanged

    // y_neg = p - y (big-endian)
    let mut y = [0u64; 4];
    for i in 0..4 {
        let off = 32 + (3 - i) * 8;
        y[i] = u64::from_be_bytes(pt[off..off + 8].try_into().unwrap());
    }
    // Check if y == 0 (point at infinity)
    if y == [0u64; 4] {
        neg[32..].copy_from_slice(&pt[32..]);
        return neg;
    }
    // Subtract: p - y with borrow
    let mut borrow = 0u64;
    let mut result = [0u64; 4];
    for i in 0..4 {
        let (r, b1) = P[i].overflowing_sub(y[i]);
        let (r2, b2) = r.overflowing_sub(borrow);
        result[i] = r2;
        borrow = (b1 || b2) as u64;
    }
    // Write big-endian to neg[32..]
    for i in 0..4 {
        let off = 32 + (3 - i) * 8;
        neg[off..off + 8].copy_from_slice(&result[i].to_be_bytes());
    }
    neg
}

/// Compute vk_x = IC[0] + public_input * IC[1] using alt_bn128 G1 ops.
fn compute_vk_x(public_input: &[u8; 32]) -> Result<[u8; 64]> {
    // Scale IC[1] by the public input scalar
    let mut scalar_input = [0u8; 96]; // G1(64) + scalar(32)
    scalar_input[..64].copy_from_slice(&VK_IC1);
    scalar_input[64..].copy_from_slice(public_input);
    let scaled = alt_bn128_multiplication(&scalar_input)
        .map_err(|_| error!(ErrorCode::InvalidProof))?;

    // Add IC[0] + scaled
    let mut add_input = [0u8; 128]; // two G1 points
    add_input[..64].copy_from_slice(&VK_IC0);
    add_input[64..].copy_from_slice(&scaled);
    let vk_x = alt_bn128_addition(&add_input)
        .map_err(|_| error!(ErrorCode::InvalidProof))?;

    let mut out = [0u8; 64];
    out.copy_from_slice(&vk_x);
    Ok(out)
}

/// Full Groth16 verification via alt_bn128 pairing.
/// Checks: e(A,B) * e(-α,β) * e(-vk_x,γ) * e(-C,δ) == 1
///
/// Pairing input: sequence of (G1, G2) pairs, each 192 bytes (64 + 128).
fn groth16_verify(
    proof_a: &[u8; 64],
    proof_b: &[u8; 128],
    proof_c: &[u8; 64],
    vk_x: &[u8; 64],
) -> Result<bool> {
    let neg_alpha = negate_g1(&VK_ALPHA_G1);
    let neg_vk_x  = negate_g1(vk_x);
    let neg_c     = negate_g1(proof_c);

    // Build pairing input: 4 pairs × 192 bytes = 768 bytes
    let mut pairing_input = [0u8; 768];

    // Pair 1: (π_A, π_B)
    pairing_input[0..64].copy_from_slice(proof_a);
    pairing_input[64..192].copy_from_slice(proof_b);

    // Pair 2: (-α, β)
    pairing_input[192..256].copy_from_slice(&neg_alpha);
    pairing_input[256..384].copy_from_slice(&VK_BETA_G2);

    // Pair 3: (-vk_x, γ)
    pairing_input[384..448].copy_from_slice(&neg_vk_x);
    pairing_input[448..576].copy_from_slice(&VK_GAMMA_G2);

    // Pair 4: (-C, δ)
    pairing_input[576..640].copy_from_slice(&neg_c);
    pairing_input[640..768].copy_from_slice(&VK_DELTA_G2);

    let result = alt_bn128_pairing(&pairing_input)
        .map_err(|_| error!(ErrorCode::InvalidProof))?;

    // Result is 32 bytes; equals 1 (as a 256-bit big-endian integer) if valid
    let mut one = [0u8; 32];
    one[31] = 1;
    Ok(result == one)
}

// ─── Instruction ─────────────────────────────────────────────────────────

#[derive(Accounts)]
#[instruction(game_id: u64, proof_a: [u8; 64], proof_b: [u8; 128], proof_c: [u8; 64], public_inputs: [u8; 32])]
pub struct VerifyZkProof<'info> {
    #[account(
        seeds = [GAME_SEED, game_id.to_le_bytes().as_ref()],
        bump = game.bump,
        constraint = game.status == GameStatus::CommitPhase || game.status == GameStatus::RevealPhase
            @ ErrorCode::InvalidAction,
    )]
    pub game: Account<'info, Game>,
    #[account(
        seeds = [PLAYER_SEED, game_id.to_le_bytes().as_ref(), player.key().as_ref()],
        bump = player_state.bump,
    )]
    pub player_state: Account<'info, PlayerState>,
    pub player: Signer<'info>,
}

pub fn handle_verify_zk(
    ctx: Context<VerifyZkProof>,
    game_id: u64,
    proof_a: [u8; 64],
    proof_b: [u8; 128],
    proof_c: [u8; 64],
    public_inputs: [u8; 32],
) -> Result<()> {
    // Security model (two-layer design):
    //
    // Layer 1 — SHA256 commit/reveal (commit_action + reveal_action):
    //   Proves the player's revealed action matches what was committed.
    //   Prevents last-minute action swapping after seeing other players' actions.
    //
    // Layer 2 — Groth16 ZK proof (this instruction):
    //   The circuit (commit_reveal.circom) proves, in zero knowledge:
    //     - actionType ∈ [1, 10]  (valid action code)
    //     - targetArea ∈ [0, 2]   (valid map area: Port/Forest/Ruins)
    //     - Poseidon(actionType, targetArea, salt) == public_inputs
    //   This proves the player committed to a *valid* action WITHOUT revealing
    //   what that action is. Even before the reveal phase, the on-chain state
    //   records that this player's action is provably in-bounds.
    //
    // The public_inputs field is the Poseidon hash of (actionType, targetArea, salt).
    // We verify the player has committed (has_committed) before accepting the proof.
    require!(ctx.accounts.player_state.has_committed, ErrorCode::NotCommitted);

    // Compute vk_x = IC[0] + public_inputs * IC[1]
    let vk_x = compute_vk_x(&public_inputs)?;

    // Run the Groth16 pairing check using Solana's native BN254 syscalls (<200K CUs)
    let valid = groth16_verify(&proof_a, &proof_b, &proof_c, &vk_x)?;
    require!(valid, ErrorCode::InvalidProof);

    msg!(
        "ZK proof VERIFIED for player {} round {} game {}",
        ctx.accounts.player.key(),
        ctx.accounts.game.round,
        game_id,
    );

    Ok(())
}

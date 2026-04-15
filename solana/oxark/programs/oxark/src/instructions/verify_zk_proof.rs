use anchor_lang::prelude::*;
use anchor_lang::solana_program::alt_bn128::prelude::*;
use crate::constants::*;
use crate::state::*;
use crate::error::ErrorCode;

// ─── Embedded Verification Key (Groth16 BN254) ───────────────────────────
// Generated from: zk/circuits/commit_reveal.circom
// Circuit: Poseidon3(actionType, targetArea, salt) == commitHash

/// VK α point (G1, 64 bytes: x||y big-endian)
const VK_ALPHA_G1: [u8; 64] = [
    19,43,105,56,232,109,128,250,118,74,242,111,5,109,19,227,232,177,84,155,119,172,194,182,116,204,171,27,59,178,235,206,
    46,19,80,17,152,217,108,117,179,128,147,24,205,242,32,140,50,199,158,235,41,96,138,178,67,206,35,83,154,76,154,232,
];

/// VK β point (G2, 128 bytes: x1||x0||y1||y0 big-endian)
const VK_BETA_G2: [u8; 128] = [
    35,50,152,132,171,146,144,101,238,92,35,128,48,134,62,49,90,10,119,238,1,97,114,254,191,73,189,13,102,178,183,45,
    38,208,148,56,59,207,34,151,49,18,206,233,165,179,42,44,213,233,64,115,63,197,112,108,101,171,193,89,213,142,61,25,
    21,109,234,173,97,206,251,203,197,138,219,2,101,23,247,7,208,21,24,216,37,98,61,125,89,114,152,78,4,200,48,64,
    21,52,153,65,123,7,215,187,20,104,40,221,210,106,85,59,62,229,70,16,214,117,158,175,246,7,184,106,226,202,236,156,
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
    33,64,60,222,57,97,225,7,220,79,116,160,74,251,99,149,58,221,172,132,24,183,52,127,169,195,16,70,130,209,42,55,
    47,181,201,11,78,3,73,10,27,7,129,86,134,56,206,1,1,166,48,35,79,164,77,211,245,249,150,205,230,58,97,70,
    42,233,219,19,194,56,189,7,130,228,216,186,111,81,250,197,114,219,71,118,84,25,251,93,105,74,22,251,240,140,154,229,
    6,68,3,78,95,239,83,146,130,38,230,213,71,19,35,26,59,213,234,50,48,138,73,4,13,153,190,17,19,139,42,222,
];

/// IC[0] (G1 point, 64 bytes — contribution from constant 1)
const VK_IC0: [u8; 64] = [
    22,242,135,105,31,243,136,89,18,65,175,175,42,117,211,249,187,7,178,105,72,149,94,151,240,108,242,153,12,77,171,110,
    28,104,133,179,240,233,91,152,99,252,36,223,151,114,85,249,164,195,179,208,123,83,112,24,66,238,45,220,93,250,16,216,
];

/// IC[1] (G1 point, 64 bytes — contribution from public input 0)
const VK_IC1: [u8; 64] = [
    46,48,100,79,196,219,19,80,249,128,102,8,153,44,94,10,117,137,23,128,224,242,21,129,91,213,216,77,250,27,201,204,
    36,228,118,148,57,203,237,208,159,194,246,247,244,42,131,252,27,148,115,176,43,239,155,213,101,246,69,90,215,115,204,243,
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
    )]
    pub game: Account<'info, Game>,
    #[account(
        seeds = [PLAYER_SEED, game_id.to_le_bytes().as_ref(), player.key().as_ref()],
        bump = player_state.bump,
    )]
    pub player_state: Account<'info, PlayerState>,
    #[account(
        seeds = [COMMIT_SEED, game_id.to_le_bytes().as_ref(), game.round.to_le_bytes().as_ref(), player.key().as_ref()],
        bump = commit.bump,
    )]
    pub commit: Account<'info, CommitAction>,
    pub player: Signer<'info>,
}

pub fn handle_verify_zk(
    ctx: Context<VerifyZkProof>,
    _game_id: u64,
    proof_a: [u8; 64],
    proof_b: [u8; 128],
    proof_c: [u8; 64],
    public_inputs: [u8; 32],
) -> Result<()> {
    // 1. Verify the public input matches the on-chain commit hash
    require!(
        public_inputs == ctx.accounts.commit.hash,
        ErrorCode::HashMismatch
    );

    // 2. Compute vk_x = IC[0] + public_input[0] * IC[1]
    let vk_x = compute_vk_x(&public_inputs)?;

    // 3. Run the Groth16 pairing check
    let valid = groth16_verify(&proof_a, &proof_b, &proof_c, &vk_x)?;
    require!(valid, ErrorCode::InvalidProof);

    msg!(
        "ZK proof VERIFIED for player {} round {}",
        ctx.accounts.player.key(),
        ctx.accounts.game.round
    );

    Ok(())
}

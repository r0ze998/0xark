use anchor_lang::prelude::*;
use solana_bn254::prelude::{
    alt_bn128_addition, alt_bn128_multiplication, alt_bn128_pairing,
};
use crate::constants::{GAME_SEED, PLAYER_SEED};
use crate::state::{Game, PlayerState};
use crate::error::ErrorCode;

// ─── Embedded Verification Key (Groth16 BN254) ───────────────────────────
// Circuit: circuits/dungeon_position/dungeon_position.circom
// Public inputs: [old_commitment, new_commitment]  (2 × BN254 field elements)
// Constraints: 625 non-linear (Poseidon×2 + bounds + move validity)
// Trusted setup: snarkjs groth16, pot12

/// VK α point (G1, 64 bytes: x||y big-endian)
const VK_ALPHA_G1: [u8; 64] = [
    13,58,172,32,177,216,235,208,183,197,110,70,31,229,53,155,63,214,137,1,218,228,83,211,21,131,44,40,52,13,123,187,
    40,111,8,171,21,188,128,206,167,191,183,30,41,233,189,48,58,111,49,217,63,251,80,241,160,228,15,209,219,150,238,66,
];

/// VK β point (G2, 128 bytes: x1||x0||y1||y0 big-endian)
const VK_BETA_G2: [u8; 128] = [
    18,78,231,105,214,69,237,7,200,253,80,199,198,126,188,220,116,2,244,57,125,203,217,78,162,98,242,82,35,68,185,252,
    42,235,231,89,194,244,191,107,20,166,221,165,96,69,244,75,116,216,250,209,156,90,171,236,166,226,144,63,137,230,112,51,
    28,211,42,28,34,168,29,207,111,80,158,142,60,206,183,67,218,45,200,53,121,246,252,97,148,244,61,38,115,142,176,84,
    25,18,34,172,185,14,120,142,67,49,175,48,232,205,34,213,234,164,102,93,103,143,1,69,151,166,5,55,71,147,137,54,
];

/// VK γ point (G2, 128 bytes)
const VK_GAMMA_G2: [u8; 128] = [
    24,0,222,239,18,31,30,118,66,106,0,102,94,92,68,121,103,67,34,212,247,94,218,221,70,222,189,92,217,146,246,237,
    25,142,147,147,146,13,72,58,114,96,191,183,49,251,93,37,241,170,73,51,53,169,231,18,151,228,133,183,174,243,18,194,
    18,200,94,165,219,140,109,235,74,171,113,128,141,203,64,143,227,209,231,105,12,67,211,123,76,230,204,1,102,250,125,170,
    9,6,137,208,88,95,240,117,236,158,153,173,105,12,51,149,188,75,49,51,112,179,142,243,85,172,218,220,209,34,151,91,
];

/// VK δ point (G2, 128 bytes)
const VK_DELTA_G2: [u8; 128] = [
    37,216,246,215,121,217,176,87,178,211,248,130,33,146,34,113,94,39,51,103,208,226,253,189,112,211,37,189,244,247,86,136,
    20,80,139,195,107,126,131,222,116,29,255,92,83,45,122,237,177,208,219,150,201,245,48,227,251,64,252,216,186,104,198,36,
    19,97,243,169,15,159,167,236,131,177,209,212,110,21,254,253,184,157,146,1,197,196,150,77,27,198,203,239,133,202,162,214,
    25,101,98,110,33,157,102,22,144,58,99,76,200,79,98,64,241,75,17,168,231,68,85,165,222,96,106,71,156,136,18,5,
];

/// IC[0] — constant contribution (G1, 64 bytes)
const VK_IC0: [u8; 64] = [
    9,145,103,140,168,34,85,180,219,122,245,68,124,187,200,121,228,125,150,130,64,196,129,128,189,129,3,255,98,156,36,105,
    3,197,24,139,167,247,15,170,12,61,72,255,90,117,56,230,72,45,88,49,47,237,196,237,155,48,224,62,181,151,245,93,
];

/// IC[1] — old_commitment contribution (G1, 64 bytes)
const VK_IC1: [u8; 64] = [
    2,122,235,243,228,220,196,168,193,38,129,208,60,148,181,189,228,186,7,117,91,88,106,218,128,69,248,132,12,146,202,109,
    8,242,132,47,47,121,90,133,143,150,26,213,77,217,180,19,187,61,153,54,20,97,8,41,213,70,56,120,4,66,160,118,
];

/// IC[2] — new_commitment contribution (G1, 64 bytes)
const VK_IC2: [u8; 64] = [
    10,162,175,78,162,242,143,213,89,163,151,251,172,147,216,8,61,5,5,66,0,114,6,54,167,213,177,163,223,180,34,232,
    28,155,111,96,61,147,163,160,123,19,196,25,55,252,112,231,55,110,203,168,36,135,228,25,226,242,131,142,69,83,36,253,
];

// ─── G1 negation ────────────────────────────────────────────────────────────

fn negate_g1(pt: &[u8; 64]) -> [u8; 64] {
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

// ─── vk_x computation for 2 public inputs ───────────────────────────────────
// vk_x = IC[0] + old_commitment * IC[1] + new_commitment * IC[2]

fn compute_vk_x(old_commitment: &[u8; 32], new_commitment: &[u8; 32]) -> Result<[u8; 64]> {
    // IC[1] * old_commitment
    let mut s1_input = [0u8; 96];
    s1_input[..64].copy_from_slice(&VK_IC1);
    s1_input[64..].copy_from_slice(old_commitment);
    let scaled1 = alt_bn128_multiplication(&s1_input)
        .map_err(|_| error!(ErrorCode::InvalidProof))?;

    // IC[2] * new_commitment
    let mut s2_input = [0u8; 96];
    s2_input[..64].copy_from_slice(&VK_IC2);
    s2_input[64..].copy_from_slice(new_commitment);
    let scaled2 = alt_bn128_multiplication(&s2_input)
        .map_err(|_| error!(ErrorCode::InvalidProof))?;

    // IC[0] + scaled1
    let mut add1 = [0u8; 128];
    add1[..64].copy_from_slice(&VK_IC0);
    add1[64..].copy_from_slice(&scaled1);
    let sum1 = alt_bn128_addition(&add1)
        .map_err(|_| error!(ErrorCode::InvalidProof))?;

    // sum1 + scaled2
    let mut add2 = [0u8; 128];
    add2[..64].copy_from_slice(&sum1);
    add2[64..].copy_from_slice(&scaled2);
    let vk_x = alt_bn128_addition(&add2)
        .map_err(|_| error!(ErrorCode::InvalidProof))?;

    let mut out = [0u8; 64];
    out.copy_from_slice(&vk_x);
    Ok(out)
}

// ─── Groth16 verifier ────────────────────────────────────────────────────────

fn groth16_verify(
    proof_a: &[u8; 64],
    proof_b: &[u8; 128],
    proof_c: &[u8; 64],
    vk_x: &[u8; 64],
) -> Result<bool> {
    let neg_alpha = negate_g1(&VK_ALPHA_G1);
    let neg_vk_x  = negate_g1(vk_x);
    let neg_c     = negate_g1(proof_c);

    let mut pairing_input = [0u8; 768];
    pairing_input[0..64].copy_from_slice(proof_a);
    pairing_input[64..192].copy_from_slice(proof_b);
    pairing_input[192..256].copy_from_slice(&neg_alpha);
    pairing_input[256..384].copy_from_slice(&VK_BETA_G2);
    pairing_input[384..448].copy_from_slice(&neg_vk_x);
    pairing_input[448..576].copy_from_slice(&VK_GAMMA_G2);
    pairing_input[576..640].copy_from_slice(&neg_c);
    pairing_input[640..768].copy_from_slice(&VK_DELTA_G2);

    let result = alt_bn128_pairing(&pairing_input)
        .map_err(|_| error!(ErrorCode::InvalidProof))?;

    let mut one = [0u8; 32];
    one[31] = 1;
    Ok(result == one)
}

// ─── Instruction ─────────────────────────────────────────────────────────────

#[derive(Accounts)]
#[instruction(game_id: u64)]
pub struct VerifyDungeonMove<'info> {
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

    pub player: Signer<'info>,
}

/// Verify a Groth16 proof that the player made a valid dungeon move.
///
/// Public inputs layout (64 bytes total):
///   [0..32]  old_commitment — Poseidon(x, y, area, salt_old) before move
///   [32..64] new_commitment — Poseidon(new_x, new_y, new_area, salt_new) after move
///
/// The instruction verifies only the ZK proof.  Position state updates
/// are deferred to Phase C-2 when PlayerState gains a position_commitment field.
pub fn handle_verify_dungeon_move(
    ctx: Context<VerifyDungeonMove>,
    game_id: u64,
    proof_a: [u8; 64],
    proof_b: [u8; 128],
    proof_c: [u8; 64],
    public_inputs: [u8; 64],
) -> Result<()> {
    let old_commitment: &[u8; 32] = public_inputs[0..32].try_into().unwrap();
    let new_commitment: &[u8; 32] = public_inputs[32..64].try_into().unwrap();

    let vk_x = compute_vk_x(old_commitment, new_commitment)?;

    let valid = groth16_verify(&proof_a, &proof_b, &proof_c, &vk_x)?;
    require!(valid, ErrorCode::InvalidProof);

    msg!(
        "DungeonMove ZK proof VERIFIED: player {} game {} old={} new={}",
        ctx.accounts.player.key(),
        game_id,
        old_commitment.iter().map(|b| format!("{:02x}", b)).collect::<String>(),
        new_commitment.iter().map(|b| format!("{:02x}", b)).collect::<String>(),
    );

    Ok(())
}

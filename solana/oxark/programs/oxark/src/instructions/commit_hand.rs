use anchor_lang::prelude::*;
use solana_bn254::prelude::{
    alt_bn128_addition, alt_bn128_multiplication, alt_bn128_pairing,
};
use crate::state::{DuelState, HandCommitted};
use crate::error::ErrorCode;
use crate::instructions::init_duel::DUEL_SEED;

// ─── Embedded Verification Key (Groth16 BN254) ───────────────────────────────
// Circuit: circuits/hand_commitment/hand_commitment.circom
// nPublic: 4 (commitment output + round + pubkey_lo + pubkey_hi)
// Non-linear constraints: 576
// Trusted setup: snarkjs groth16, pot12 (reused from dungeon_position)
//
// Public signals order (snarkjs): [commitment, round, pubkey_lo, pubkey_hi]
// vk_x = IC[0] + commitment*IC[1] + round*IC[2] + pubkey_lo*IC[3] + pubkey_hi*IC[4]

const VK_HC_ALPHA_G1: [u8; 64] = [
    13,58,172,32,177,216,235,208,183,197,110,70,31,229,53,155,63,214,137,1,218,228,83,211,21,131,44,40,52,13,123,187,
    40,111,8,171,21,188,128,206,167,191,183,30,41,233,189,48,58,111,49,217,63,251,80,241,160,228,15,209,219,150,238,66,
];

const VK_HC_BETA_G2: [u8; 128] = [
    42,235,231,89,194,244,191,107,20,166,221,165,96,69,244,75,116,216,250,209,156,90,171,236,166,226,144,63,137,230,112,51,
    18,78,231,105,214,69,237,7,200,253,80,199,198,126,188,220,116,2,244,57,125,203,217,78,162,98,242,82,35,68,185,252,
    25,18,34,172,185,14,120,142,67,49,175,48,232,205,34,213,234,164,102,93,103,143,1,69,151,166,5,55,71,147,137,54,
    28,211,42,28,34,168,29,207,111,80,158,142,60,206,183,67,218,45,200,53,121,246,252,97,148,244,61,38,115,142,176,84,
];

const VK_HC_GAMMA_G2: [u8; 128] = [
    25,142,147,147,146,13,72,58,114,96,191,183,49,251,93,37,241,170,73,51,53,169,231,18,151,228,133,183,174,243,18,194,
    24,0,222,239,18,31,30,118,66,106,0,102,94,92,68,121,103,67,34,212,247,94,218,221,70,222,189,92,217,146,246,237,
    9,6,137,208,88,95,240,117,236,158,153,173,105,12,51,149,188,75,49,51,112,179,142,243,85,172,218,220,209,34,151,91,
    18,200,94,165,219,140,109,235,74,171,113,128,141,203,64,143,227,209,231,105,12,67,211,123,76,230,204,1,102,250,125,170,
];

const VK_HC_DELTA_G2: [u8; 128] = [
    28,19,210,173,36,148,143,250,29,242,173,209,159,185,144,103,154,210,71,88,34,178,204,40,214,24,122,134,88,160,208,222,
    9,125,133,35,110,109,101,184,56,3,250,98,209,209,56,102,113,33,163,203,163,80,242,14,133,232,61,119,120,229,211,90,
    47,215,79,0,242,195,157,218,147,183,247,52,80,64,249,21,228,96,196,192,142,84,163,10,55,195,72,205,246,117,108,225,
    22,117,241,234,6,194,26,84,171,156,193,202,139,140,29,157,90,64,177,146,242,77,85,154,23,40,14,231,141,152,211,34,
];

/// IC[0] — constant contribution
const VK_HC_IC0: [u8; 64] = [
    27,174,203,67,248,178,60,199,92,58,207,28,196,127,75,92,166,44,180,134,247,198,244,71,107,11,254,162,72,53,209,225,
    45,68,54,243,200,213,168,149,53,38,121,182,10,125,112,10,19,130,123,132,234,25,54,156,246,151,43,155,204,71,228,205,
];

/// IC[1] — commitment (output signal, index 0 in public signals)
const VK_HC_IC1: [u8; 64] = [
    32,248,112,79,73,130,127,157,108,236,118,47,250,192,68,151,48,144,78,254,17,73,184,43,32,195,201,9,95,234,222,77,
    46,231,59,226,228,68,239,129,149,181,151,159,83,68,34,134,20,178,36,132,73,114,45,198,194,164,94,212,183,87,249,155,
];

/// IC[2] — round (public input 0)
const VK_HC_IC2: [u8; 64] = [
    42,189,220,242,234,227,222,10,243,179,73,160,6,186,242,142,170,220,35,62,43,142,65,228,11,34,135,173,211,182,118,187,
    12,87,99,91,181,98,123,9,49,8,209,26,211,71,248,1,127,179,85,80,97,211,118,209,213,51,19,40,227,126,229,91,
];

/// IC[3] — pubkey_lo (public input 1)
const VK_HC_IC3: [u8; 64] = [
    45,3,235,249,24,39,107,12,142,187,30,175,188,205,7,113,214,254,240,125,235,128,147,13,110,101,59,74,37,146,189,248,
    31,207,128,61,232,105,236,60,222,86,5,49,152,48,244,198,93,47,129,173,116,228,100,59,44,75,237,174,244,162,209,44,
];

/// IC[4] — pubkey_hi (public input 2)
const VK_HC_IC4: [u8; 64] = [
    13,88,114,166,177,44,206,223,156,166,114,167,16,204,102,212,150,168,225,44,138,67,136,154,97,9,149,215,67,213,36,210,
    23,22,124,7,24,46,77,133,108,6,5,40,168,156,177,30,85,241,9,37,167,21,138,150,47,68,79,168,152,40,68,41,
];

// ─── BN254 helpers (shared pattern with verify_zk_proof.rs) ──────────────────

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

fn scale_g1(point: &[u8; 64], scalar: &[u8; 32]) -> Result<[u8; 64]> {
    let mut input = [0u8; 96];
    input[..64].copy_from_slice(point);
    input[64..].copy_from_slice(scalar);
    let scaled = alt_bn128_multiplication(&input)
        .map_err(|_| error!(ErrorCode::InvalidProof))?;
    let mut out = [0u8; 64];
    out.copy_from_slice(&scaled);
    Ok(out)
}

fn add_g1(a: &[u8; 64], b: &[u8; 64]) -> Result<[u8; 64]> {
    let mut input = [0u8; 128];
    input[..64].copy_from_slice(a);
    input[64..].copy_from_slice(b);
    let result = alt_bn128_addition(&input)
        .map_err(|_| error!(ErrorCode::InvalidProof))?;
    let mut out = [0u8; 64];
    out.copy_from_slice(&result);
    Ok(out)
}

/// Compute vk_x for 4 public signals:
/// vk_x = IC[0] + sig[0]*IC[1] + sig[1]*IC[2] + sig[2]*IC[3] + sig[3]*IC[4]
/// public_signals: [[u8; 32]; 4] — snarkjs order: [commitment, round, pubkey_lo, pubkey_hi]
fn compute_vk_x_hc(public_signals: &[[u8; 32]; 4]) -> Result<[u8; 64]> {
    let s0 = scale_g1(&VK_HC_IC1, &public_signals[0])?; // commitment
    let s1 = scale_g1(&VK_HC_IC2, &public_signals[1])?; // round
    let s2 = scale_g1(&VK_HC_IC3, &public_signals[2])?; // pubkey_lo
    let s3 = scale_g1(&VK_HC_IC4, &public_signals[3])?; // pubkey_hi

    let sum = add_g1(&VK_HC_IC0, &s0)?;
    let sum = add_g1(&sum, &s1)?;
    let sum = add_g1(&sum, &s2)?;
    add_g1(&sum, &s3)
}

fn groth16_verify_hc(
    proof_a: &[u8; 64],
    proof_b: &[u8; 128],
    proof_c: &[u8; 64],
    vk_x: &[u8; 64],
) -> Result<bool> {
    let neg_alpha = negate_g1(&VK_HC_ALPHA_G1);
    let neg_vk_x  = negate_g1(vk_x);
    let neg_c     = negate_g1(proof_c);

    let mut pairing_input = [0u8; 768];
    pairing_input[0..64].copy_from_slice(proof_a);
    pairing_input[64..192].copy_from_slice(proof_b);
    pairing_input[192..256].copy_from_slice(&neg_alpha);
    pairing_input[256..384].copy_from_slice(&VK_HC_BETA_G2);
    pairing_input[384..448].copy_from_slice(&neg_vk_x);
    pairing_input[448..576].copy_from_slice(&VK_HC_GAMMA_G2);
    pairing_input[576..640].copy_from_slice(&neg_c);
    pairing_input[640..768].copy_from_slice(&VK_HC_DELTA_G2);

    let result = alt_bn128_pairing(&pairing_input)
        .map_err(|_| error!(ErrorCode::InvalidProof))?;

    let mut one = [0u8; 32];
    one[31] = 1;
    Ok(result == one)
}

// ─── Instruction ─────────────────────────────────────────────────────────────

#[derive(Accounts)]
#[instruction(duel_id: Pubkey)]
pub struct CommitHand<'info> {
    #[account(
        mut,
        seeds = [DUEL_SEED, duel_id.as_ref()],
        bump = duel.bump,
    )]
    pub duel: Account<'info, DuelState>,

    pub player: Signer<'info>,
}

/// Commit a player's hand for the current round via Groth16 ZK proof.
///
/// The player generates proof off-chain (snarkjs browser WASM) and submits:
///   - proof_a/b/c: Groth16 proof points
///   - public_signals: [commitment, round, pubkey_lo, pubkey_hi] (snarkjs order)
///
/// On-chain: verifies proof, then stores commitment in DuelState for this round.
pub fn handle_commit_hand(
    ctx: Context<CommitHand>,
    duel_id: Pubkey,
    round: u8,
    proof_a: [u8; 64],
    proof_b: [u8; 128],
    proof_c: [u8; 64],
    // Public signals in snarkjs output order: [commitment, round, pubkey_lo, pubkey_hi]
    public_signals: [[u8; 32]; 4],
) -> Result<()> {
    let duel = &mut ctx.accounts.duel;

    require!(duel.id == duel_id, ErrorCode::WrongDuel);
    require!(duel.ended_at == 0, ErrorCode::DuelOver);
    require!(duel.round == round, ErrorCode::WrongRound);
    require!(round >= 1 && round <= 5, ErrorCode::WrongRound);

    // Verify ZK circuit's round signal matches the instruction round argument.
    let mut round_field = [0u8; 32];
    round_field[31] = round; // round is u8, fits in last byte of 32-byte BE field element
    require!(public_signals[1] == round_field, ErrorCode::InvalidPublicSignal);

    let player_key = ctx.accounts.player.key();
    let is_p1 = player_key == duel.player_1;
    let is_p2 = player_key == duel.player_2;
    require!(is_p1 || is_p2, ErrorCode::NotADuelParticipant);

    // Guard: reject double-commit for the same round (before expensive ZK verify)
    let round_idx = (round - 1) as usize;
    let prior_commit = if is_p1 { duel.player_1_commitment[round_idx] }
                       else      { duel.player_2_commitment[round_idx] };
    require!(prior_commit == [0u8; 32], ErrorCode::AlreadyCommitted);

    // Verify the ZK proof
    let vk_x = compute_vk_x_hc(&public_signals)?;
    let valid = groth16_verify_hc(&proof_a, &proof_b, &proof_c, &vk_x)?;
    require!(valid, ErrorCode::InvalidProof);

    // Extract commitment (index 0 in public_signals — snarkjs output order)
    let commitment: [u8; 32] = public_signals[0];
    if is_p1 {
        duel.player_1_commitment[round_idx] = commitment;
        duel.player_1_zk_verified[round_idx] = true;
    } else {
        duel.player_2_commitment[round_idx] = commitment;
        duel.player_2_zk_verified[round_idx] = true;
    }

    emit!(HandCommitted {
        duel_id,
        player: player_key,
        round,
        commitment,
    });

    msg!(
        "Hand committed: player={} duel={} round={}",
        player_key,
        duel_id,
        round,
    );

    Ok(())
}

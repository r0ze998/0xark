use crate::error::ErrorCode;
use crate::groth16::{self, hand_commitment_vk};
use crate::instructions::init_duel::DUEL_SEED;
use crate::state::{DuelState, HandCommitted};
use anchor_lang::prelude::*;

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
    require!(
        public_signals[1] == groth16::u64_to_field(round as u64),
        ErrorCode::ZkRoundMismatch
    );

    let player_key = ctx.accounts.player.key();
    let is_p1 = player_key == duel.player_1;
    let is_p2 = player_key == duel.player_2;
    require!(is_p1 || is_p2, ErrorCode::NotADuelParticipant);

    // Verify the proof is bound to the signer: public_signals[2..3] carry the
    // prover's pubkey halves. Without this check a player could replay the
    // opponent's proof and mirror their commitment (copy attack).
    let (expected_lo, expected_hi) = groth16::split_pubkey(&player_key);
    require!(
        public_signals[2] == expected_lo,
        ErrorCode::ZkPubkeyMismatch
    );
    require!(
        public_signals[3] == expected_hi,
        ErrorCode::ZkPubkeyMismatch
    );

    // Guard: reject double-commit for the same round (before expensive ZK verify)
    let round_idx = (round - 1) as usize;
    let prior_commit = if is_p1 {
        duel.player_1_commitment[round_idx]
    } else {
        duel.player_2_commitment[round_idx]
    };
    require!(prior_commit == [0u8; 32], ErrorCode::AlreadyCommitted);

    // Verify the ZK proof
    let vk_x = groth16::compute_vk_x(
        &hand_commitment_vk::IC0,
        &hand_commitment_vk::IC_REST,
        &public_signals,
    )?;
    let valid =
        groth16::groth16_verify(&hand_commitment_vk::VK, &proof_a, &proof_b, &proof_c, &vk_x)?;
    require!(valid, ErrorCode::ZkProofInvalid);

    // Extract commitment (index 0 in public_signals — snarkjs output order)
    let commitment: [u8; 32] = public_signals[0];
    if is_p1 {
        duel.player_1_commitment[round_idx] = commitment;
        duel.player_1_zk_verified[round_idx] = true;
    } else {
        duel.player_2_commitment[round_idx] = commitment;
        duel.player_2_zk_verified[round_idx] = true;
    }

    // Stall-timeout clock: every successful commit is progress.
    duel.last_progress_at = Clock::get()?.unix_timestamp;

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

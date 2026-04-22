use anchor_lang::prelude::*;
use crate::state::{DuelState, HandRevealed};
use crate::error::ErrorCode;
use crate::instructions::init_duel::DUEL_SEED;

// ─── Instruction ─────────────────────────────────────────────────────────────

#[derive(Accounts)]
#[instruction(duel_id: Pubkey)]
pub struct RevealHand<'info> {
    #[account(
        mut,
        seeds = [DUEL_SEED, duel_id.as_ref()],
        bump = duel.bump,
    )]
    pub duel: Account<'info, DuelState>,

    pub player: Signer<'info>,
}

/// Reveal a player's hand after battle resolution for a given round.
///
/// The player submits:
///   - card_ids: the 10 card slots (0 = empty) matching what was committed
///   - commitment_hash: the Poseidon(15) hash recomputed client-side
///     (must match the stored commitment from commit_hand)
///
/// Security note (Day 12 MVP):
///   On-chain verification checks that client-supplied commitment_hash
///   matches the stored commitment. Full on-chain Poseidon(15) recomputation
///   via light-poseidon is tracked as DEF-16 (Day 13).
///   The ZK proof at commit time already ensures card_ids are valid.
pub fn handle_reveal_hand(
    ctx: Context<RevealHand>,
    duel_id: Pubkey,
    round: u8,
    card_ids: [u64; 10],
    // Client recomputes Poseidon(15) off-chain and passes the result.
    // On-chain: compare against stored commitment from commit_hand.
    commitment_hash: [u8; 32],
) -> Result<()> {
    let duel = &mut ctx.accounts.duel;

    require!(duel.id == duel_id, ErrorCode::WrongDuel);
    require!(duel.ended_at == 0, ErrorCode::DuelOver);
    require!(round >= 1 && round <= 5, ErrorCode::WrongRound);

    let player_key = ctx.accounts.player.key();
    let is_p1 = player_key == duel.player_1;
    let is_p2 = player_key == duel.player_2;
    require!(is_p1 || is_p2, ErrorCode::NotADuelParticipant);

    let round_idx = (round - 1) as usize;

    // Check commitment was set (non-zero)
    let stored_commitment = if is_p1 {
        duel.player_1_commitment[round_idx]
    } else {
        duel.player_2_commitment[round_idx]
    };

    // Guard: commitment must have been stored (non-zero)
    require!(
        stored_commitment != [0u8; 32],
        ErrorCode::CommitmentNotSet,
    );

    // Guard: already revealed check (revealed slot has non-zero card_id or explicit flag)
    let already_revealed = if is_p1 {
        duel.player_1_revealed[round_idx] != [0u64; 10]
    } else {
        duel.player_2_revealed[round_idx] != [0u64; 10]
    };
    // Allow re-reveal only if all zeros (not previously set)
    require!(!already_revealed, ErrorCode::HandAlreadyRevealed);

    // Verify commitment match (client recomputed Poseidon off-chain)
    // DEF-16: replace with on-chain Poseidon(15) via light-poseidon in Day 13
    require!(
        commitment_hash == stored_commitment,
        ErrorCode::CommitmentMismatch,
    );

    // Store revealed cards
    if is_p1 {
        duel.player_1_revealed[round_idx] = card_ids;
    } else {
        duel.player_2_revealed[round_idx] = card_ids;
    }

    emit!(HandRevealed {
        duel_id,
        player: player_key,
        round,
        card_ids,
    });

    msg!(
        "Hand revealed: player={} duel={} round={}",
        player_key,
        duel_id,
        round,
    );

    Ok(())
}

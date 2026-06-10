use crate::constants::*;
use crate::error::ErrorCode;
use crate::state::*;
use anchor_lang::prelude::*;

#[derive(Accounts)]
#[instruction(game_id: u64, hash: [u8; 32])]
pub struct CommitActionCtx<'info> {
    #[account(
        mut,
        seeds = [GAME_SEED, game_id.to_le_bytes().as_ref()],
        bump = game.bump,
    )]
    pub game: Account<'info, Game>,
    #[account(
        mut,
        seeds = [PLAYER_SEED, game_id.to_le_bytes().as_ref(), player.key().as_ref()],
        bump = player_state.bump,
    )]
    pub player_state: Account<'info, PlayerState>,
    #[account(
        init,
        payer = player,
        space = CommitAction::SIZE,
        seeds = [COMMIT_SEED, game_id.to_le_bytes().as_ref(), game.round.to_le_bytes().as_ref(), player.key().as_ref()],
        bump,
    )]
    pub commit: Account<'info, CommitAction>,
    #[account(mut)]
    pub player: Signer<'info>,
    pub system_program: Program<'info, System>,
}

/// Commit a hidden action hash for the current round.
///
/// Reborn Day 8: `phase` and `played_cards` are now primary params.
///   phase: 0=Draw, 1=Energy, 2=Summon, 3=Battle
///   played_cards: up to 3 card IDs committed this phase (empty = legacy/no cards)
///
/// commitment = SHA-256(card_ids_le_bytes || salt || round || phase)
pub fn handle_commit(
    ctx: Context<CommitActionCtx>,
    game_id: u64,
    hash: [u8; 32],
    phase: u8,
    played_cards: Vec<u64>,
) -> Result<()> {
    let game = &mut ctx.accounts.game;
    require!(
        game.status == GameStatus::CommitPhase,
        ErrorCode::NotCommitPhase
    );

    let ps = &mut ctx.accounts.player_state;
    require!(!ps.has_committed, ErrorCode::AlreadyCommitted);

    // Clamp played_cards to 3 slots
    let card_count = played_cards.len().min(3);
    let mut cards_arr = [0u64; 3];
    for i in 0..card_count {
        cards_arr[i] = played_cards[i];
    }

    let commit = &mut ctx.accounts.commit;
    commit.game_id = game_id;
    commit.round = game.round;
    commit.player = ctx.accounts.player.key();
    commit.hash = hash;
    commit.bump = ctx.bumps.commit;
    commit.round_number = game.round;
    commit.phase = phase;
    commit.played_cards = cards_arr;
    commit.played_cards_len = card_count as u8;

    ps.has_committed = true;
    game.commit_count += 1;

    if game.commit_count == game.player_count {
        game.status = GameStatus::RevealPhase;
    }

    msg!(
        "Player {} committed phase={} cards={} for round {}",
        ctx.accounts.player.key(),
        phase,
        card_count,
        game.round,
    );
    Ok(())
}

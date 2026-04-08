use anchor_lang::prelude::*;
use crate::constants::*;
use crate::state::*;
use crate::error::ErrorCode;

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

pub fn handle_commit(ctx: Context<CommitActionCtx>, game_id: u64, hash: [u8; 32]) -> Result<()> {
    let game = &mut ctx.accounts.game;
    require!(game.status == GameStatus::CommitPhase, ErrorCode::NotCommitPhase);

    let ps = &mut ctx.accounts.player_state;
    require!(!ps.has_committed, ErrorCode::AlreadyCommitted);

    let commit = &mut ctx.accounts.commit;
    commit.game_id = game_id;
    commit.round = game.round;
    commit.player = ctx.accounts.player.key();
    commit.hash = hash;
    commit.bump = ctx.bumps.commit;

    ps.has_committed = true;
    game.commit_count += 1;

    // If all players committed, transition to reveal phase
    if game.commit_count == game.player_count {
        game.status = GameStatus::RevealPhase;
    }

    msg!("Player {} committed action for round {}", ctx.accounts.player.key(), game.round);
    Ok(())
}

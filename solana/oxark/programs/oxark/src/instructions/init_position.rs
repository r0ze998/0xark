use anchor_lang::prelude::*;
use crate::constants::{GAME_SEED, PLAYER_SEED};
use crate::state::{Game, PlayerState};
use crate::error::ErrorCode;

// ─── Instruction ─────────────────────────────────────────────────────────────
//
// Called by the client immediately after join_game.
// Records the player's initial dungeon position as a ZK commitment:
//   commitment = Poseidon(x, y, area, salt)  (computed off-chain, not revealed)
//
// Can only be called once per PlayerState.

#[derive(Accounts)]
#[instruction(game_id: u64)]
pub struct InitPosition<'info> {
    #[account(
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

    pub player: Signer<'info>,
}

pub fn handle_init_position(
    ctx: Context<InitPosition>,
    _game_id: u64,
    commitment: [u8; 32],
) -> Result<()> {
    let ps = &mut ctx.accounts.player_state;

    require!(
        !ps.position_commitment_initialized,
        ErrorCode::AlreadyInitialized
    );

    ps.position_commitment = commitment;
    ps.position_commitment_initialized = true;

    msg!(
        "InitPosition: player {} commitment set",
        ctx.accounts.player.key()
    );

    Ok(())
}

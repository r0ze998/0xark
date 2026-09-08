// reset_player_state — Admin devnet testing instruction.
// Clears deposit_amount so the player can re-register on devnet.
// NOT for production use — intended only for demo/test resets.

use crate::constants::ADMIN_PUBKEY;
use crate::error::ErrorCode;
use crate::state::{GameWorld, PlayerState};
use anchor_lang::prelude::*;

#[derive(Accounts)]
pub struct ResetPlayerState<'info> {
    #[account(
        mut,
        constraint = admin.key() == ADMIN_PUBKEY @ ErrorCode::NotAdmin,
    )]
    pub admin: Signer<'info>,

    #[account(
        mut,
        seeds = [b"player", player.key().as_ref()],
        bump,
    )]
    pub player_state: Account<'info, PlayerState>,

    /// CHECK: the player whose state is being reset
    pub player: AccountInfo<'info>,
    #[account(seeds = [GameWorld::SEED], bump = game_world.bump)]
    pub game_world: Account<'info, GameWorld>,

}

pub fn handle_reset_player_state(ctx: Context<ResetPlayerState>) -> Result<()> {
    require!(ctx.accounts.game_world.game_status == 0
        && ctx.accounts.game_world.total_participants == 0,
        ErrorCode::CollectionFrozen);
    require!(ctx.accounts.player_state.deposit_amount == 0, ErrorCode::AlreadyRegistered);

    let ps = &mut ctx.accounts.player_state;
    ps.deposit_amount = 0;
    ps.vault_bitmap = [0u8; 8];
    ps.win_streak = 0;
    ps.max_win_streak = 0;
    ps.total_matches = 0;
    ps.last_action_type = 0;
    ps.consecutive_diff_actiontype = 0;
    ps.x402_total_spend = 0;
    ps.peek_unique_targets = [0u8; 8];
    ps.no_x402_win_streak = 0;
    ps.legendary_progress = [false; 6];
    ps.vault_size_max = 0;
    ps.vault_size_min = 0;
    ps.last_drop_to_tier5_timestamp = 0;
    msg!("reset_player_state: {} cleared", ctx.accounts.player.key());
    Ok(())
}

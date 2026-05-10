// set_waitlist_deadline — Admin emergency instruction.
// Allows the admin to push or reset the waitlist close timestamp.

use anchor_lang::prelude::*;
use crate::state::GameWorld;
use crate::error::ErrorCode;
use crate::constants::ADMIN_PUBKEY;

#[derive(Accounts)]
pub struct SetWaitlistDeadline<'info> {
    #[account(
        mut,
        constraint = admin.key() == ADMIN_PUBKEY @ ErrorCode::NotAdmin,
    )]
    pub admin: Signer<'info>,

    #[account(
        mut,
        seeds = [b"game_world"],
        bump = game_world.bump,
    )]
    pub game_world: Account<'info, GameWorld>,
}

pub fn handle_set_waitlist_deadline(
    ctx: Context<SetWaitlistDeadline>,
    new_deadline: i64,
) -> Result<()> {
    ctx.accounts.game_world.waitlist_close_timestamp = new_deadline;
    msg!("set_waitlist_deadline: waitlist_close_timestamp → {}", new_deadline);
    Ok(())
}

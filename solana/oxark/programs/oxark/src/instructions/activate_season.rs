// activate_season — YKK season state machine: waitlist (0) -> active (1).
//
// Admin-only. Allowed once the waitlist window has closed. Makes the
// 0 -> 1 -> 2 transitions explicit so each settlement instruction can assert its
// precondition by status value (finalize requires 1; end requires 1 + full tally).

use crate::constants::ADMIN_PUBKEY;
use crate::error::ErrorCode;
use crate::state::GameWorld;
use anchor_lang::prelude::*;

#[derive(Accounts)]
pub struct ActivateSeason<'info> {
    #[account(mut, seeds = [GameWorld::SEED], bump = game_world.bump)]
    pub game_world: Account<'info, GameWorld>,

    #[account(constraint = admin.key() == ADMIN_PUBKEY @ ErrorCode::NotAdmin)]
    pub admin: Signer<'info>,
}

pub fn handle_activate_season(ctx: Context<ActivateSeason>) -> Result<()> {
    let world = &mut ctx.accounts.game_world;
    require!(world.game_status == 0, ErrorCode::SeasonWrongStatus);

    let now = Clock::get()?.unix_timestamp;
    require!(
        now >= world.waitlist_close_timestamp,
        ErrorCode::WaitlistStillOpen
    );

    world.game_status = 1;
    msg!(
        "ActivateSeason: status 0->1 (active), participants={}",
        world.total_participants
    );
    Ok(())
}

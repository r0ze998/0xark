use anchor_lang::prelude::*;
use crate::state::GameWorld;
use crate::error::ErrorCode;
use crate::constants::ADMIN_PUBKEY;

/// Phase 15: One-time GameWorld PDA initialization.
///
/// Creates the global Season 1 singleton. Only the admin key may call this.
/// Sets up season timestamps and initializes all counters to zero.
///
/// Timeline:
///   waitlist_close = game_start - 14 days  (waitlist window closes)
///   game_start                              (status → 1 via separate ix)
///   end           = game_start + 14 days   (status → 2 via separate ix)
///
/// PDA seeds: ["game_world"]
#[derive(Accounts)]
pub struct InitGameWorld<'info> {
    #[account(
        init,
        payer = authority,
        space = GameWorld::SIZE,
        seeds = [GameWorld::SEED],
        bump,
    )]
    pub game_world: Account<'info, GameWorld>,

    #[account(
        mut,
        constraint = authority.key() == ADMIN_PUBKEY @ ErrorCode::Unauthorized,
    )]
    pub authority: Signer<'info>,

    pub system_program: Program<'info, System>,
}

pub fn handle_init_game_world(
    ctx: Context<InitGameWorld>,
    game_start_timestamp: i64,
) -> Result<()> {
    let world = &mut ctx.accounts.game_world;
    let bump  = ctx.bumps.game_world;

    world.start_timestamp          = game_start_timestamp;
    world.end_timestamp            = game_start_timestamp + GameWorld::SEASON_DURATION_SECS;
    world.waitlist_close_timestamp = game_start_timestamp - GameWorld::WAITLIST_WINDOW_SECS;
    world.total_participants       = 0;
    world.total_prize_pool         = 0;
    world.total_ops_revenue        = 0;
    world.legendary_acquired_count = [0u8; 6];
    world.winner_60_count          = 0;
    world.game_status              = 0;   // waitlist phase
    world.tier2_total_vault        = 0;
    world.tier3_total_vault        = 0;
    world.tier4_total_vault        = 0;
    world.tier5_total_vault        = 0;
    world.bump                     = bump;

    msg!(
        "InitGameWorld: start={} waitlist_close={} end={} bump={}",
        world.start_timestamp,
        world.waitlist_close_timestamp,
        world.end_timestamp,
        bump,
    );
    Ok(())
}

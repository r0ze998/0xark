use crate::constants::ADMIN_PUBKEY;
use crate::error::ErrorCode;
use crate::state::GameWorld;
use anchor_lang::prelude::*;

/// Phase 15: One-time GameWorld PDA initialization.
///
/// Creates the global Season 1 singleton. Only the admin key may call this.
/// Sets up season timestamps and initializes all counters to zero.
///
/// Timeline:
///   game_start                              (pass current time to open registration now)
///   waitlist_close = game_start + 14 days  (waitlist window closes at season end)
///   end            = game_start + 14 days   (status → 2 via finalize ix)
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

    /// Prize-pool PDA vault (YKK-38). Lamports-only, System-owned; created lazily
    /// on the first deposit. Here we only derive it to record its address + bump
    /// into the GameWorld so `claim_prize_v2` can sign payouts via invoke_signed.
    #[account(
        seeds = [GameWorld::PRIZE_POOL_SEED],
        bump,
    )]
    pub prize_pool: SystemAccount<'info>,

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
    ops_treasury: Pubkey,
) -> Result<()> {
    let bump = ctx.bumps.game_world;
    // YKK-38: the prize pool is now a program-derived vault, not an external key.
    let prize_pool = ctx.accounts.prize_pool.key();
    let prize_pool_bump = ctx.bumps.prize_pool;
    let world = &mut ctx.accounts.game_world;

    world.start_timestamp = game_start_timestamp;
    world.end_timestamp = game_start_timestamp + GameWorld::SEASON_DURATION_SECS;
    world.waitlist_close_timestamp = game_start_timestamp + GameWorld::WAITLIST_WINDOW_SECS;
    world.total_participants = 0;
    world.total_prize_pool = 0;
    world.total_ops_revenue = 0;
    world.legendary_acquired_count = [0u8; 6];
    world.winner_60_count = 0;
    world.game_status = 0; // waitlist phase
    world.tier2_total_vault = 0;
    world.tier3_total_vault = 0;
    world.tier4_total_vault = 0;
    world.tier5_total_vault = 0;
    world.bump = bump;
    // Phase 20-B shop defaults
    world.ops_treasury = ops_treasury;
    world.prize_pool = prize_pool;
    world.prize_pool_bump = prize_pool_bump;
    world.shop_phase_threshold_seconds = GameWorld::DEFAULT_SHOP_PHASE_THRESHOLD;
    world.legendary_drop_rate_phase1 = GameWorld::DEFAULT_LEGENDARY_RATE_PHASE1;
    world.legendary_drop_rate_phase2 = GameWorld::DEFAULT_LEGENDARY_RATE_PHASE2;
    world.rare_drop_rate_phase1 = GameWorld::DEFAULT_RARE_RATE_PHASE1;
    world.rare_drop_rate_phase2 = GameWorld::DEFAULT_RARE_RATE_PHASE2;
    world.uncommon_drop_rate = GameWorld::DEFAULT_UNCOMMON_RATE;
    // Prize-settlement finalize fields (populated by finalize_season_tally).
    world.max_vault = 0;
    world.max_vault_count = 0;
    world.finalize_processed = 0;
    world.finalize_cursor = Pubkey::default();

    msg!(
        "InitGameWorld: start={} waitlist_close={} end={} bump={} ops={} pool={}",
        world.start_timestamp,
        world.waitlist_close_timestamp,
        world.end_timestamp,
        bump,
        ops_treasury,
        prize_pool,
    );
    Ok(())
}

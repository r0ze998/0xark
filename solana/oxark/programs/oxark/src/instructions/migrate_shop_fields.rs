// migrate_shop_fields — Phase 20-B migration.
// Reallocates the GameWorld PDA to the new SIZE and initializes shop defaults.
// Call once after program upgrade; idempotent (setting defaults again is safe).

use anchor_lang::prelude::*;
use crate::state::GameWorld;
use crate::error::ErrorCode;
use crate::constants::ADMIN_PUBKEY;

#[derive(Accounts)]
pub struct MigrateShopFields<'info> {
    #[account(
        mut,
        realloc = GameWorld::SIZE,
        realloc::payer = admin,
        realloc::zero = false,
        seeds = [GameWorld::SEED],
        bump = game_world.bump,
    )]
    pub game_world: Account<'info, GameWorld>,

    #[account(
        mut,
        constraint = admin.key() == ADMIN_PUBKEY @ ErrorCode::NotAdmin,
    )]
    pub admin: Signer<'info>,

    pub system_program: Program<'info, System>,
}

pub fn handle_migrate_shop_fields(
    ctx: Context<MigrateShopFields>,
    ops_treasury:  Pubkey,
    prize_pool:    Pubkey,
) -> Result<()> {
    let gw = &mut ctx.accounts.game_world;

    gw.ops_treasury                   = ops_treasury;
    gw.prize_pool                      = prize_pool;
    gw.shop_phase_threshold_seconds   = GameWorld::DEFAULT_SHOP_PHASE_THRESHOLD;
    gw.legendary_drop_rate_phase1     = GameWorld::DEFAULT_LEGENDARY_RATE_PHASE1;
    gw.legendary_drop_rate_phase2     = GameWorld::DEFAULT_LEGENDARY_RATE_PHASE2;
    gw.rare_drop_rate_phase1          = GameWorld::DEFAULT_RARE_RATE_PHASE1;
    gw.rare_drop_rate_phase2          = GameWorld::DEFAULT_RARE_RATE_PHASE2;
    gw.uncommon_drop_rate             = GameWorld::DEFAULT_UNCOMMON_RATE;

    msg!(
        "migrate_shop_fields: ops={} pool={} threshold={}",
        ops_treasury, prize_pool, gw.shop_phase_threshold_seconds
    );
    Ok(())
}

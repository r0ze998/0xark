// migrate_shop_fields — Phase 20-B migration.
// Resizes the GameWorld PDA to the new SIZE and initializes shop defaults.
// Call once after program upgrade; idempotent (writing defaults again is safe).
//
// Uses UncheckedAccount + manual realloc because Anchor cannot deserialize the
// pre-Phase-20-B account (it's 93 bytes, the new struct expects 185).

use anchor_lang::prelude::*;
use crate::state::GameWorld;
use crate::error::ErrorCode;
use crate::constants::ADMIN_PUBKEY;

#[derive(Accounts)]
pub struct MigrateShopFields<'info> {
    /// CHECK: validated by seeds; manually resized and patched below.
    #[account(
        mut,
        seeds = [GameWorld::SEED],
        bump,
    )]
    pub game_world: UncheckedAccount<'info>,

    #[account(
        mut,
        constraint = admin.key() == ADMIN_PUBKEY @ ErrorCode::NotAdmin,
    )]
    pub admin: Signer<'info>,

    pub system_program: Program<'info, System>,
}

pub fn handle_migrate_shop_fields(
    ctx: Context<MigrateShopFields>,
    ops_treasury: Pubkey,
    prize_pool: Pubkey,
) -> Result<()> {
    let ai = ctx.accounts.game_world.to_account_info();

    // 1. Realloc to new size, funding from admin if account is too small.
    let target = GameWorld::SIZE;
    let current = ai.data_len();
    if current < target {
        let rent = Rent::get()?;
        let needed = rent.minimum_balance(target).saturating_sub(ai.lamports());
        if needed > 0 {
            anchor_lang::system_program::transfer(
                CpiContext::new(
                    ctx.accounts.system_program.key(),
                    anchor_lang::system_program::Transfer {
                        from: ctx.accounts.admin.to_account_info(),
                        to:   ai.clone(),
                    },
                ),
                needed,
            )?;
        }
        ai.resize(target)?;
        // Zero the newly added bytes so they don't contain garbage.
        let mut data = ai.data.borrow_mut();
        for b in &mut data[current..target] {
            *b = 0;
        }
    }

    // 2. Write Phase 20-B fields at their byte offsets (after 93 bytes of old data).
    // Layout after discriminator (8 bytes):
    //   start_timestamp(8)+end_timestamp(8)+waitlist_close_timestamp(8)
    //   +total_participants(4)+total_prize_pool(8)+total_ops_revenue(8)
    //   +legendary_acquired_count(6)+winner_60_count(1)+game_status(1)
    //   +tier2..5_total_vault(8×4)+bump(1) = 93 bytes total (including disc)
    // Phase 20-B additions start at byte 93:
    //   ops_treasury(32) prize_pool(32) shop_phase_threshold(8)
    //   legendary_rate_p1(4) legendary_rate_p2(4) rare_p1(4) rare_p2(4) uncommon(4)
    const OPS_OFF:   usize = 93;
    const POOL_OFF:  usize = 93 + 32;
    const THRESH_OFF: usize = 93 + 32 + 32;
    const LR1_OFF:   usize = THRESH_OFF + 8;
    const LR2_OFF:   usize = LR1_OFF + 4;
    const RR1_OFF:   usize = LR2_OFF + 4;
    const RR2_OFF:   usize = RR1_OFF + 4;
    const UR_OFF:    usize = RR2_OFF + 4;

    let threshold   = GameWorld::DEFAULT_SHOP_PHASE_THRESHOLD;
    let leg_rate1   = GameWorld::DEFAULT_LEGENDARY_RATE_PHASE1;
    let leg_rate2   = GameWorld::DEFAULT_LEGENDARY_RATE_PHASE2;
    let rare_rate1  = GameWorld::DEFAULT_RARE_RATE_PHASE1;
    let rare_rate2  = GameWorld::DEFAULT_RARE_RATE_PHASE2;
    let uncommon    = GameWorld::DEFAULT_UNCOMMON_RATE;

    {
        let mut data = ai.data.borrow_mut();
        data[OPS_OFF..OPS_OFF+32].copy_from_slice(ops_treasury.as_ref());
        data[POOL_OFF..POOL_OFF+32].copy_from_slice(prize_pool.as_ref());
        data[THRESH_OFF..THRESH_OFF+8].copy_from_slice(&threshold.to_le_bytes());
        data[LR1_OFF..LR1_OFF+4].copy_from_slice(&leg_rate1.to_le_bytes());
        data[LR2_OFF..LR2_OFF+4].copy_from_slice(&leg_rate2.to_le_bytes());
        data[RR1_OFF..RR1_OFF+4].copy_from_slice(&rare_rate1.to_le_bytes());
        data[RR2_OFF..RR2_OFF+4].copy_from_slice(&rare_rate2.to_le_bytes());
        data[UR_OFF..UR_OFF+4].copy_from_slice(&uncommon.to_le_bytes());
    }

    msg!(
        "migrate_shop_fields: ops={} pool={} threshold={}",
        ops_treasury, prize_pool, threshold
    );
    Ok(())
}

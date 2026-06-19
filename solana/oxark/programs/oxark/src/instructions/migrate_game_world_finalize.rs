// migrate_game_world_finalize — REFERENCE ONLY (kept for a future mainnet where an
// existing GameWorld must be preserved). NOT wired into lib.rs / not dispatchable.
//
// For this devnet rollout the GameWorld is created fresh via `init_game_world`
// (which already includes the finalize fields), so no migration runs. If a
// pre-existing GameWorld (SIZE 185) ever needs the +41 finalize bytes, wire this
// into lib.rs and call it once after upgrade.
//
// The appended fields (max_vault u8, max_vault_count u32, finalize_processed u32,
// finalize_cursor Pubkey) are zero-initialized by the realloc zero-fill, which is
// exactly their correct default — no explicit writes needed.

use crate::constants::ADMIN_PUBKEY;
use crate::error::ErrorCode;
use crate::state::GameWorld;
use anchor_lang::prelude::*;

#[derive(Accounts)]
pub struct MigrateGameWorldFinalize<'info> {
    /// CHECK: validated by seeds; manually resized below.
    #[account(mut, seeds = [GameWorld::SEED], bump)]
    pub game_world: UncheckedAccount<'info>,

    #[account(mut, constraint = admin.key() == ADMIN_PUBKEY @ ErrorCode::NotAdmin)]
    pub admin: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[allow(dead_code)]
pub fn handle_migrate_game_world_finalize(ctx: Context<MigrateGameWorldFinalize>) -> Result<()> {
    let ai = ctx.accounts.game_world.to_account_info();
    let target = GameWorld::SIZE; // 226 (includes the +41 finalize bytes)
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
                        to: ai.clone(),
                    },
                ),
                needed,
            )?;
        }
        ai.resize(target)?;
        // Zero the appended bytes — correct defaults for the four finalize fields.
        let mut data = ai.data.borrow_mut();
        for b in &mut data[current..target] {
            *b = 0;
        }
    }
    msg!(
        "migrate_game_world_finalize: resized {} -> {}",
        current,
        target
    );
    Ok(())
}

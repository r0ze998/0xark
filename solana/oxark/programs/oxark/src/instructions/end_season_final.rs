// end_season_final — YKK season-end prize settlement (step 3 of 3): active (1) -> ended (2).
//
// Admin-only. Opens claim_prize_v2. Hard precondition: the full participant tally
// must be complete (finalize_processed == total_participants) — this is the
// invariant that prevents claims opening on partial tallies (the bug class).
//
// Timeout settlement: when no one collected all 60 cards (winner_60_count == 0),
// the top collector(s) (vault == max_vault) receive the Tier-1 50% pool. They were
// accumulated into their natural proportional band during finalize, so we remove
// their contribution from that band here — they are paid as Tier-1 champions, not
// twice. claim_prize_v2's empty-band carry-over handles any band emptied this way.

use crate::constants::ADMIN_PUBKEY;
use crate::error::ErrorCode;
use crate::state::GameWorld;
use anchor_lang::prelude::*;

#[derive(Accounts)]
pub struct EndSeasonFinal<'info> {
    #[account(mut, seeds = [GameWorld::SEED], bump = game_world.bump)]
    pub game_world: Account<'info, GameWorld>,

    #[account(constraint = admin.key() == ADMIN_PUBKEY @ ErrorCode::NotAdmin)]
    pub admin: Signer<'info>,
}

pub fn handle_end_season_final(ctx: Context<EndSeasonFinal>) -> Result<()> {
    let world = &mut ctx.accounts.game_world;
    require!(world.game_status == 1, ErrorCode::SeasonWrongStatus);
    require!(
        world.finalize_processed == world.total_participants,
        ErrorCode::TallyIncomplete
    );

    // Timeout: remove champions from their natural band (they take Tier-1 instead).
    if world.winner_60_count == 0 && world.max_vault > 0 {
        let champ_total = world.max_vault as u64 * world.max_vault_count as u64;
        match GameWorld::band_of(world.max_vault as u64) {
            2 => world.tier2_total_vault = world.tier2_total_vault.saturating_sub(champ_total),
            3 => world.tier3_total_vault = world.tier3_total_vault.saturating_sub(champ_total),
            4 => world.tier4_total_vault = world.tier4_total_vault.saturating_sub(champ_total),
            _ => world.tier5_total_vault = world.tier5_total_vault.saturating_sub(champ_total),
        }
    }

    world.game_status = 2;
    msg!(
        "EndSeasonFinal: status 1->2 (ended). winner60={} timeout={} max_vault={} max_count={}",
        world.winner_60_count,
        world.winner_60_count == 0,
        world.max_vault,
        world.max_vault_count,
    );
    Ok(())
}

use anchor_lang::prelude::*;
use crate::state::PlayerBattleStats;

/// Record the outcome of a card battle round for combo tracking.
///
/// `is_super_effective`: true when the player's attack had element advantage (×1.5).
///   - true  → combo_count += 1, update max_combo, set xp_2x_flag when count ≥ 7
///   - false → combo_count = 0, clear xp_2x_flag (streak broken)
///
/// Combo tiers (for client banners):
///   3+ → "PERFECT!"      (damage +20%)
///   5+ → "LEGENDARY!"    (HP regen +10%)
///   7+ → "UNSTOPPABLE!"  (next battle XP ×2)
///
/// PDA seeds: `["player_battle_stats", player_pubkey]` (init_if_needed)
#[derive(Accounts)]
pub struct RecordBattleResult<'info> {
    #[account(
        init_if_needed,
        payer = player,
        space = PlayerBattleStats::SIZE,
        seeds = [b"player_battle_stats", player.key().as_ref()],
        bump,
    )]
    pub player_battle_stats: Account<'info, PlayerBattleStats>,

    #[account(mut)]
    pub player: Signer<'info>,

    pub system_program: Program<'info, System>,
}

pub fn handle_record_battle_result(
    ctx: Context<RecordBattleResult>,
    is_super_effective: bool,
) -> Result<()> {
    let stats = &mut ctx.accounts.player_battle_stats;
    if stats.owner == Pubkey::default() {
        stats.owner = ctx.accounts.player.key();
        stats.combo_count = 0;
        stats.max_combo = 0;
        stats.xp_2x_flag = false;
        stats.bump = ctx.bumps.player_battle_stats;
    }

    if is_super_effective {
        stats.combo_count = stats.combo_count.saturating_add(1);
        if stats.combo_count > stats.max_combo {
            stats.max_combo = stats.combo_count;
        }
        if stats.combo_count >= 7 {
            stats.xp_2x_flag = true;
        }
        let tier = PlayerBattleStats::combo_tier(stats.combo_count);
        msg!(
            "COMBO x{} (tier={}) for {} — max={} xp2x={}",
            stats.combo_count, tier,
            ctx.accounts.player.key(),
            stats.max_combo, stats.xp_2x_flag
        );
    } else {
        stats.combo_count = 0;
        stats.xp_2x_flag = false;
        msg!("Combo reset for {}", ctx.accounts.player.key());
    }

    Ok(())
}

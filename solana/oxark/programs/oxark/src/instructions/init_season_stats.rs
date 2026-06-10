use crate::state::SeasonStats;
use anchor_lang::prelude::*;

#[derive(Accounts)]
#[instruction(season_id: u32)]
pub struct InitSeasonStats<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,

    #[account(
        init,
        payer = payer,
        space = SeasonStats::LEN,
        seeds = [SeasonStats::SEASON_STATS_SEED, season_id.to_le_bytes().as_ref()],
        bump,
    )]
    pub season_stats: Account<'info, SeasonStats>,

    pub system_program: Program<'info, System>,
}

/// v3.0-plus: Initialize the SeasonStats PDA for a given season.
///
/// Must be called once at season start before any Burn/Evolve/Steal instructions.
/// Seeds: ["season_stats", season_id_le]
pub fn handle_init_season_stats(ctx: Context<InitSeasonStats>, season_id: u32) -> Result<()> {
    let stats = &mut ctx.accounts.season_stats;
    stats.season_id = season_id;
    stats.total_burned = 0;
    stats.total_minted = 0;
    stats.total_evolved = 0;
    stats.total_stolen = 0;
    stats.bump = ctx.bumps.season_stats;

    msg!("SeasonStats initialized for season {}", season_id);
    Ok(())
}

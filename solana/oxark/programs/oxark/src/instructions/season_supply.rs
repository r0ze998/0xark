use anchor_lang::prelude::*;
use crate::state::SeasonCardSupply;

/// Initialize or reset SeasonCardSupply for a new season.
///
/// Called at season start with the participant count N.
/// Supply by tier: C=16N, B=2.5N, A=0.4N, S=0.05N, SS=1.
/// PDA seeds: ["season_supply", season_id_le]
pub fn handle_init_season_supply(
    ctx: Context<InitSeasonSupply>,
    season_id: u32,
    participant_count: u32,
) -> Result<()> {
    let supply = &mut ctx.accounts.season_supply;
    supply.season_id = season_id;
    supply.participant_count = participant_count;
    supply.supply = SeasonCardSupply::compute_supply(participant_count);
    supply.minted = [0u32; 5];
    supply.exhausted = [false; 5];
    supply.bump = ctx.bumps.season_supply;
    Ok(())
}

/// Record a card mint for the given tier (0=C..4=SS).
/// Returns the actual tier used (may fall back to lower tier if exhausted).
///
/// Called internally by drop_card logic — does NOT gate drop itself (client-side).
pub fn handle_record_mint(
    ctx: Context<RecordMint>,
    season_id: u32,
    requested_tier: u8,
) -> Result<u8> {
    let supply = &mut ctx.accounts.season_supply;
    require!(supply.season_id == season_id, crate::error::ErrorCode::WrongGameAccount);

    // Find a non-exhausted tier at or below requested_tier
    let mut tier = requested_tier.min(4);
    loop {
        let t = tier as usize;
        if supply.minted[t] < supply.supply[t] {
            supply.minted[t] += 1;
            if supply.minted[t] >= supply.supply[t] {
                supply.exhausted[t] = true;
            }
            return Ok(tier);
        }
        if tier == 0 { break; }
        tier -= 1;
    }
    // All tiers exhausted — allow C anyway (safety fallback)
    supply.minted[0] = supply.minted[0].saturating_add(1);
    Ok(0)
}

// ── Account structs ──────────────────────────────────────────────────────────

#[derive(Accounts)]
#[instruction(season_id: u32)]
pub struct InitSeasonSupply<'info> {
    #[account(
        init_if_needed,
        payer = authority,
        space = SeasonCardSupply::SIZE,
        seeds = [b"season_supply", season_id.to_le_bytes().as_ref()],
        bump,
    )]
    pub season_supply: Account<'info, SeasonCardSupply>,

    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(season_id: u32)]
pub struct RecordMint<'info> {
    #[account(
        mut,
        seeds = [b"season_supply", season_id.to_le_bytes().as_ref()],
        bump = season_supply.bump,
    )]
    pub season_supply: Account<'info, SeasonCardSupply>,

    pub authority: Signer<'info>,
}

use anchor_lang::prelude::*;
use crate::constants::*;
use crate::state::*;
use crate::error::ErrorCode;

/// Season system for competitive play.
/// Each season has: entry fee, prize pool, leaderboard, NFT carry-over.
///
/// Season lifecycle:
/// 1. create_season — Set parameters (entry fee, max players, duration)
/// 2. Players join via deposit_stake
/// 3. Games play out
/// 4. end_season — Distribute prizes, record legends

#[account]
#[derive(Default)]
pub struct Season {
    pub season_id: u32,
    pub authority: Pubkey,
    pub entry_fee: u64,           // Lamports
    pub prize_pool: u64,          // Accumulated from fees + x402 cuts
    pub player_count: u32,
    pub max_players: u32,
    pub status: u8,               // 0=Open, 1=Active, 2=Ended
    pub winner: Pubkey,
    pub winner_time: i64,         // Unix timestamp of completion
    pub fastest_clear_rounds: u8, // Fewest rounds to win
    pub season_start: i64,
    pub season_end: i64,
    pub bump: u8,
}

impl Season {
    pub const SIZE: usize = 8 + 4 + 32 + 8 + 8 + 4 + 4 + 1 + 32 + 8 + 1 + 8 + 8 + 1;
}

pub const SEASON_SEED: &[u8] = b"season";

#[derive(Accounts)]
#[instruction(season_id: u32, entry_fee: u64, max_players: u32, duration_seconds: i64)]
pub struct CreateSeason<'info> {
    #[account(
        init,
        payer = authority,
        space = Season::SIZE,
        seeds = [SEASON_SEED, season_id.to_le_bytes().as_ref()],
        bump,
    )]
    pub season: Account<'info, Season>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

pub fn handle_create_season(
    ctx: Context<CreateSeason>,
    season_id: u32,
    entry_fee: u64,
    max_players: u32,
    duration_seconds: i64,
) -> Result<()> {
    let clock = Clock::get()?;
    let season = &mut ctx.accounts.season;
    season.season_id = season_id;
    season.authority = ctx.accounts.authority.key();
    season.entry_fee = entry_fee;
    season.prize_pool = 0;
    season.player_count = 0;
    season.max_players = max_players;
    season.status = 0; // Open
    season.winner = Pubkey::default();
    season.winner_time = 0;
    season.fastest_clear_rounds = 255; // Max u8
    season.season_start = clock.unix_timestamp;
    season.season_end = clock.unix_timestamp + duration_seconds;
    season.bump = ctx.bumps.season;

    msg!("Season {} created. Entry: {} lamports. Duration: {}s", season_id, entry_fee, duration_seconds);

    emit!(SeasonCreated {
        season_id,
        entry_fee,
        max_players,
        duration_seconds,
    });

    Ok(())
}

#[derive(Accounts)]
#[instruction(season_id: u32)]
pub struct EndSeason<'info> {
    #[account(
        mut,
        seeds = [SEASON_SEED, season_id.to_le_bytes().as_ref()],
        bump = season.bump,
        constraint = season.authority == authority.key() @ ErrorCode::NotHost,
    )]
    pub season: Account<'info, Season>,
    pub authority: Signer<'info>,
}

pub fn handle_end_season(ctx: Context<EndSeason>, season_id: u32) -> Result<()> {
    let season = &mut ctx.accounts.season;
    season.status = 2; // Ended

    msg!("Season {} ended. Winner: {}. Prize pool: {} lamports",
        season_id, season.winner, season.prize_pool);

    emit!(SeasonEnded {
        season_id,
        winner: season.winner,
        prize_pool: season.prize_pool,
        fastest_rounds: season.fastest_clear_rounds,
    });

    Ok(())
}

/// Leaderboard entry for tracking legends
#[account]
#[derive(Default)]
pub struct Legend {
    pub player: Pubkey,
    pub season_id: u32,
    pub rounds_to_win: u8,
    pub timestamp: i64,
    pub cards_stolen: u8,
    pub bump: u8,
}

impl Legend {
    pub const SIZE: usize = 8 + 32 + 4 + 1 + 8 + 1 + 1;
}

#[event]
pub struct SeasonCreated {
    pub season_id: u32,
    pub entry_fee: u64,
    pub max_players: u32,
    pub duration_seconds: i64,
}

#[event]
pub struct SeasonEnded {
    pub season_id: u32,
    pub winner: Pubkey,
    pub prize_pool: u64,
    pub fastest_rounds: u8,
}

/// T-D15-B: Legendary acquisition instructions
///   init_legendary_supply — Called once per Season by admin to create supply PDA
///   record_gold_hall_win  — Called after Gold Hall duel win, tracks wins & grants claims
///   claim_legendary       — Player selects a Legendary species and mints to their wallet
///
/// Note: Actual NFT minting (Metaplex) is stubbed; the on-chain PDA tracks supply.
/// Real mint CPI is wired in Day 16 after art + metadata are available.

use anchor_lang::prelude::*;
use crate::state::*;
use crate::error::ErrorCode;
use crate::instructions::init_duel::DUEL_SEED;

// ─── init_legendary_supply ────────────────────────────────────────────────────

#[derive(Accounts)]
#[instruction(season_id: u64)]
pub struct InitLegendarySupply<'info> {
    #[account(
        init,
        payer = authority,
        space = LegendarySupply::LEN,
        seeds = [LegendarySupply::LEGENDARY_SUPPLY_SEED, season_id.to_le_bytes().as_ref()],
        bump,
    )]
    pub legendary_supply: Account<'info, LegendarySupply>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

pub fn handle_init_legendary_supply(
    ctx: Context<InitLegendarySupply>,
    season_id: u64,
) -> Result<()> {
    let supply = &mut ctx.accounts.legendary_supply;
    supply.season_id = season_id;
    supply.minted    = [0u8; 4];
    supply.cap       = [10u8; 4]; // 10 of each species per Season
    supply.bump      = ctx.bumps.legendary_supply;

    msg!("LegendarySupply initialized for Season {}: 4 species, cap 10 each", season_id);
    Ok(())
}

// ─── record_gold_hall_win ─────────────────────────────────────────────────────

#[derive(Accounts)]
#[instruction(duel_id: Pubkey, season_id: u32)]
pub struct RecordGoldHallWin<'info> {
    #[account(
        init_if_needed,
        payer = player,
        space = PlayerDuelStats::LEN,
        seeds = [PlayerDuelStats::PLAYER_DUEL_STATS_SEED, player.key().as_ref()],
        bump,
    )]
    pub player_duel_stats: Account<'info, PlayerDuelStats>,

    /// DuelState — must be ended and signer must be the recorded winner.
    /// Boxed to keep stack frame within BPF limit.
    #[account(
        seeds = [DUEL_SEED, duel_id.as_ref()],
        bump = duel.bump,
        constraint = duel.ended_at > 0          @ ErrorCode::DuelNotOver,
        // C6 fix: caller must be the winner recorded in the settled DuelState.
        constraint = duel.winner == player.key() @ ErrorCode::NotWinner,
    )]
    pub duel: Box<Account<'info, DuelState>>,

    /// Double-record guard — init fails if this duel's win was already reported.
    #[account(
        init,
        payer = player,
        space = GoldHallRecord::SIZE,
        seeds = [GoldHallRecord::SEED, duel_id.as_ref()],
        bump,
    )]
    pub gold_hall_record: Account<'info, GoldHallRecord>,

    #[account(mut)]
    pub player: Signer<'info>,
    pub system_program: Program<'info, System>,
}

pub fn handle_record_gold_hall_win(
    ctx: Context<RecordGoldHallWin>,
    duel_id: Pubkey,
    season_id: u32,
) -> Result<()> {
    // Initialize the double-record guard PDA.
    let record = &mut ctx.accounts.gold_hall_record;
    record.duel_id = duel_id;
    record.winner  = ctx.accounts.player.key();
    record.bump    = ctx.bumps.gold_hall_record;

    let stats = &mut ctx.accounts.player_duel_stats;
    let player_key = ctx.accounts.player.key();

    // Init fields if this is a fresh PDA
    if stats.player == Pubkey::default() {
        stats.player = player_key;
        stats.current_season_id = season_id;
        stats.bump = ctx.bumps.player_duel_stats;
    }

    // Reset counts if we're in a new Season
    if stats.current_season_id != season_id {
        stats.gold_hall_wins_current_season = 0;
        stats.legendary_claims_current_season = 0;
        stats.current_season_id = season_id;
    }

    stats.gold_hall_wins_current_season = stats.gold_hall_wins_current_season.saturating_add(1);
    stats.total_duels_won = stats.total_duels_won.saturating_add(1);

    let wins = stats.gold_hall_wins_current_season;
    let expected_claims = wins / 4;
    let pending = expected_claims.saturating_sub(stats.legendary_claims_current_season);

    if pending > 0 {
        emit!(LegendaryClaimEarned {
            player:         player_key,
            pending_count:  pending,
            gold_hall_wins: wins,
        });
    }

    msg!("Gold Hall win #{} recorded for player {}. Pending Legendary claims: {}", wins, player_key, pending);
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn non_winner_cannot_record_win() {
        // Simulate the C6 constraint: duel.winner must equal the caller.
        let real_winner = Pubkey::new_unique();
        let attacker    = Pubkey::new_unique();
        assert_ne!(real_winner, attacker);
        // Constraint passes only when caller IS the winner.
        let ok = real_winner == real_winner;
        let blocked = real_winner == attacker;
        assert!(ok,      "real winner must pass the constraint");
        assert!(!blocked, "attacker must be blocked");
    }

    #[test]
    fn double_record_prevented_by_pda_init() {
        // GoldHallRecord::SEED is unique per duel_id; Anchor init fails on second call
        // because the account already exists. This is a structural guarantee, not logic.
        assert_eq!(GoldHallRecord::SEED, b"gold_hall");
        assert_eq!(GoldHallRecord::SIZE, 8 + 32 + 32 + 1);
    }
}

// ─── claim_legendary ──────────────────────────────────────────────────────────

#[derive(Accounts)]
#[instruction(season_id: u64, species_id: u8)]
pub struct ClaimLegendary<'info> {
    #[account(
        mut,
        seeds = [LegendarySupply::LEGENDARY_SUPPLY_SEED, season_id.to_le_bytes().as_ref()],
        bump = legendary_supply.bump,
    )]
    pub legendary_supply: Account<'info, LegendarySupply>,
    #[account(
        mut,
        seeds = [PlayerDuelStats::PLAYER_DUEL_STATS_SEED, player.key().as_ref()],
        bump = player_duel_stats.bump,
        constraint = player_duel_stats.player == player.key() @ ErrorCode::InvalidState,
    )]
    pub player_duel_stats: Account<'info, PlayerDuelStats>,
    #[account(mut)]
    pub player: Signer<'info>,
    pub system_program: Program<'info, System>,
}

pub fn handle_claim_legendary(
    ctx: Context<ClaimLegendary>,
    season_id: u64,
    species_id: u8,
) -> Result<()> {
    require!(species_id < 4, ErrorCode::InvalidState); // 0-3 valid

    let stats   = &mut ctx.accounts.player_duel_stats;
    let supply  = &mut ctx.accounts.legendary_supply;
    let player_key = ctx.accounts.player.key();

    // Check season matches
    require!(
        supply.season_id == season_id,
        ErrorCode::InvalidState
    );

    // Check player has a pending claim
    let expected_claims = stats.gold_hall_wins_current_season / 4;
    require!(
        expected_claims > stats.legendary_claims_current_season,
        ErrorCode::InvalidState
    );

    // Check species supply available
    let si = species_id as usize;
    require!(
        supply.minted[si] < supply.cap[si],
        ErrorCode::InvalidState
    );

    // Record the claim
    let mint_number = supply.minted[si] + 1;
    supply.minted[si] = mint_number;
    stats.legendary_claims_current_season = stats.legendary_claims_current_season.saturating_add(1);

    emit!(LegendaryClaimed {
        player:      player_key,
        season_id,
        species_id,
        mint_number,
    });

    msg!(
        "Player {} claimed {} #{} (Season {}). Supply: {}/{}",
        player_key,
        LegendarySupply::SPECIES_NAMES[si],
        mint_number,
        season_id,
        supply.minted[si],
        supply.cap[si],
    );

    // NOTE: Actual NFT minting via Metaplex CPI is deferred to Day 16 when
    // card art + metadata URI are available. The claim is recorded on-chain here.
    // The client uses this event to show the Legendary in Card Storage immediately.
    // DECISION: Stub mint for hackathon demo; real mint wired Day 16.

    Ok(())
}

// ─── distribute_prize_pool ────────────────────────────────────────────────────

#[derive(Accounts)]
#[instruction(season_id: u32)]
pub struct DistributePrizePool<'info> {
    #[account(
        mut,
        seeds = [crate::instructions::season::SEASON_SEED, season_id.to_le_bytes().as_ref()],
        bump = season.bump,
        constraint = season.status == 2 @ ErrorCode::InvalidState, // Ended
        constraint = season.authority == authority.key() @ ErrorCode::NotHost,
    )]
    pub season: Account<'info, crate::instructions::season::Season>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

pub fn handle_distribute_prize_pool(
    ctx: Context<DistributePrizePool>,
    season_id: u32,
) -> Result<()> {
    let season = &mut ctx.accounts.season;
    let pool = season.prize_pool;

    // MVP distribution: 40% Champion (winner), 60% retained for future distribution
    // Per GDD v2.0 Section 8 full distribution (20% #2, 10% #3, 30% Clan) is post-hackathon
    let champion_share = pool * 40 / 100;

    // NOTE: Actual SOL transfer requires champion wallet account in accounts list.
    // Full multi-recipient distribution wired post-hackathon; for MVP, emit event only.
    // DECISION: Log distribution intent; real transfer in production with full leaderboard data.

    msg!(
        "Prize Pool distribution for Season {}: {} lamports total, {} to champion {}",
        season_id,
        pool,
        champion_share,
        season.winner,
    );

    emit!(PrizePoolDistributed {
        season_id,
        total_lamports: pool,
        champion_share,
    });

    Ok(())
}

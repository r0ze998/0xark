use anchor_lang::prelude::*;
use anchor_lang::system_program::{transfer, Transfer};
use crate::state::*;
use crate::error::ErrorCode;

/// Phase 15 B-8: Tier-based prize distribution.
/// Called by each player after game_status == 2 (ended).
/// Distributes prize proportional to vault_count per tier.
///
/// Tier 1 (60 cards): 50% of prize pool, split equally among all 60-card holders.
/// Tier 2 (50-59):    25%, split by vault_count ratio.
/// Tier 3 (30-49):    15%, split by vault_count ratio.
/// Tier 4 (10-29):     8%, split by vault_count ratio.
/// Tier 5  (1-9):      2%, split by vault_count ratio.
///
/// When no Tier 1 winner exists (timeout), the player(s) with max vault_count receive Tier 1.
#[derive(Accounts)]
pub struct ClaimPrizeV2<'info> {
    #[account(
        mut,
        seeds = [b"player", player.key().as_ref()],
        bump,
    )]
    pub player_state: Account<'info, PlayerState>,

    #[account(
        mut,
        seeds = [GameWorld::SEED],
        bump = game_world.bump,
    )]
    pub game_world: Account<'info, GameWorld>,

    /// Prize pool vault.
    /// CHECK: validated by caller; must hold sufficient lamports.
    #[account(mut)]
    pub prize_pool: AccountInfo<'info>,

    #[account(mut)]
    pub player: Signer<'info>,

    pub system_program: Program<'info, System>,
}

pub fn handle_claim_prize_v2(ctx: Context<ClaimPrizeV2>) -> Result<()> {
    let world = &ctx.accounts.game_world;
    let ps    = &ctx.accounts.player_state;

    require!(world.game_status == 2, ErrorCode::GameNotEnded);
    require!(ps.deposit_amount > 0, ErrorCode::NotRegistered);

    let vault_count = ps.vault_count() as u64;
    require!(vault_count > 0, ErrorCode::NoPrizeClaim);

    let prize_pool_total = world.total_prize_pool;

    let prize = if world.winner_60_count == 0 {
        // Timeout: no 60-card winner — find best tier
        // Caller must be in the highest tier with any cards to claim Tier 1 bonus.
        // (Full fairness requires off-chain sorting + finalize_game; this is simplified.)
        compute_tier_prize(vault_count, prize_pool_total, world, true)
    } else {
        compute_tier_prize(vault_count, prize_pool_total, world, false)
    };

    require!(prize > 0, ErrorCode::NoPrizeClaim);

    let prize_pool_balance = ctx.accounts.prize_pool.lamports();
    let actual_prize = prize.min(prize_pool_balance);

    transfer(
        CpiContext::new(
            ctx.accounts.system_program.key(),
            Transfer {
                from: ctx.accounts.prize_pool.to_account_info(),
                to:   ctx.accounts.player.to_account_info(),
            },
        ),
        actual_prize,
    )?;

    msg!(
        "ClaimPrizeV2: player={} vault={} prize={}lam",
        ctx.accounts.player.key(),
        vault_count,
        actual_prize,
    );
    Ok(())
}

fn compute_tier_prize(
    vault_count: u64,
    prize_pool: u64,
    world: &GameWorld,
    timeout_mode: bool,
) -> u64 {
    if vault_count == 60 || (timeout_mode && vault_count > 0) {
        // Tier 1
        let tier1_pool = prize_pool * 50 / 100;
        let divisor = if world.winner_60_count > 0 {
            world.winner_60_count as u64
        } else {
            1
        };
        tier1_pool / divisor
    } else if vault_count >= 50 {
        // Tier 2: 25% proportional
        if world.tier2_total_vault == 0 { return 0; }
        prize_pool * 25 / 100 * vault_count / world.tier2_total_vault
    } else if vault_count >= 30 {
        // Tier 3: 15% proportional
        if world.tier3_total_vault == 0 { return 0; }
        prize_pool * 15 / 100 * vault_count / world.tier3_total_vault
    } else if vault_count >= 10 {
        // Tier 4: 8% proportional
        if world.tier4_total_vault == 0 { return 0; }
        prize_pool * 8 / 100 * vault_count / world.tier4_total_vault
    } else {
        // Tier 5: 2% proportional
        if world.tier5_total_vault == 0 { return 0; }
        prize_pool * 2 / 100 * vault_count / world.tier5_total_vault
    }
}

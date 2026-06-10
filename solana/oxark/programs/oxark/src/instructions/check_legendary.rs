use crate::error::ErrorCode;
use crate::state::*;
use anchor_lang::prelude::*;

/// Phase 15 B-6: Realtime Legendary card acquisition judgment.
/// Called after each battle, x402 payment, or peek action.
/// Checks all 6 Legendary conditions and awards cards to eligible players.
///
/// PDA seeds for player_state: ["player", player.key]
/// PDA seeds for game_world:   ["game_world"]
#[derive(Accounts)]
pub struct CheckLegendary<'info> {
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

    pub player: Signer<'info>,
}

pub fn handle_check_legendary(ctx: Context<CheckLegendary>) -> Result<()> {
    let world = &mut ctx.accounts.game_world;
    let ps = &mut ctx.accounts.player_state;
    let player = ctx.accounts.player.key();
    let now = Clock::get()?.unix_timestamp;

    require!(world.game_status == 1, ErrorCode::GameNotActive);

    check_all_legendaries(ps, world, player, now);
    Ok(())
}

/// Check all 6 Legendary conditions for the given player and award if eligible.
/// All checks are O(1) using pre-tracked counters on PlayerState.
pub fn check_all_legendaries(
    ps: &mut PlayerState,
    world: &mut GameWorld,
    player: Pubkey,
    now: i64,
) {
    // Legendary 0: Sentinel (Knight, id=10) — Conqueror: 5-win streak
    check_legendary_condition(ps, world, player, now, 0, 10, ps.win_streak >= 5);

    // Legendary 1: Magnate (Merchant, id=20) — Patron: 1 SOL cumulative x402 spend
    check_legendary_condition(
        ps,
        world,
        player,
        now,
        1,
        20,
        ps.x402_total_spend >= 1_000_000_000,
    );

    // Legendary 2: Marauder (Pirate, id=30) — Phoenix: dropped to Tier5 in last 3 days AND now Tier3+
    {
        let secs_3_days = 3i64 * 24 * 3600;
        let phoenix_cond = ps.last_drop_to_tier5_timestamp > 0
            && (now - ps.last_drop_to_tier5_timestamp) <= secs_3_days
            && ps.vault_count() >= 30;
        check_legendary_condition(ps, world, player, now, 2, 30, phoenix_cond);
    }

    // Legendary 3: Oracle (Scholar, id=40) — Detective: peeked 10+ unique wallets
    {
        let unique_peek_count: u32 = ps.peek_unique_targets.iter().map(|b| b.count_ones()).sum();
        check_legendary_condition(ps, world, player, now, 3, 40, unique_peek_count >= 10);
    }

    // Legendary 4: Ascetic (Monk, id=50) — Hermit: 5-win streak with zero x402 spend
    check_legendary_condition(ps, world, player, now, 4, 50, ps.no_x402_win_streak >= 5);

    // Legendary 5: Architect (Engineer, id=60) — Sage: 10 consecutive matches with different ActionType
    check_legendary_condition(
        ps,
        world,
        player,
        now,
        5,
        60,
        ps.total_matches >= 10 && ps.consecutive_diff_actiontype >= 10,
    );
}

/// Award Legendary card_id (index idx) if condition is met and slots remain.
fn check_legendary_condition(
    ps: &mut PlayerState,
    world: &mut GameWorld,
    player: Pubkey,
    now: i64,
    idx: usize,
    card_id: u8,
    condition: bool,
) {
    if ps.legendary_progress[idx] {
        return;
    } // already acquired
    if !condition {
        return;
    }
    if world.legendary_acquired_count[idx] >= GameWorld::LEGENDARY_MAX_CLAIMANTS {
        return;
    }

    // Award the Legendary card
    ps.set_vault_card(card_id);
    ps.legendary_progress[idx] = true;
    world.legendary_acquired_count[idx] += 1;

    let claimant_num = world.legendary_acquired_count[idx];
    msg!(
        "LegendaryAcquired: player={} legendary_id={} idx={} claimant={}",
        player,
        card_id,
        idx,
        claimant_num
    );

    emit!(LegendaryAcquired {
        player,
        legendary_id: card_id,
        legendary_idx: idx as u8,
        claimant_num,
        timestamp: now,
    });
}

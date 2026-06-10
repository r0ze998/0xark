use crate::error::ErrorCode;
use crate::state::{
    CardBattleHistory, CardOwnerChanged, LeaseReturnedEvent, LeaseStealEvent, SeasonStats,
    StealType, LEASE_DURATION_SEC,
};
use anchor_lang::prelude::*;

// Hall tier constants (matches DuelState.hall_tier)
pub const HALL_BRONZE: u8 = 0;
pub const HALL_SILVER: u8 = 1;
pub const HALL_GOLD: u8 = 2;

/// Canonical seed lives on the struct in state.rs; this alias keeps the
/// `#[account(seeds = ...)]` attributes below readable.
const CARD_BATTLE_HISTORY_SEED: &[u8] = CardBattleHistory::CARD_BATTLE_HISTORY_SEED;

// ─── Accounts ─────────────────────────────────────────────────────────────────

#[derive(Accounts)]
#[instruction(card_mint: Pubkey)]
pub struct RecordCardOwnerChange<'info> {
    #[account(
        init_if_needed,
        payer = payer,
        space = CardBattleHistory::LEN,
        seeds = [CARD_BATTLE_HISTORY_SEED, card_mint.as_ref()],
        bump,
    )]
    pub card_battle_history: Account<'info, CardBattleHistory>,

    /// The current owner being displaced.
    pub current_owner: Signer<'info>,

    #[account(mut)]
    pub payer: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(card_mint: Pubkey)]
pub struct RecordCardOwnerChangeWithStats<'info> {
    #[account(
        init_if_needed,
        payer = payer,
        space = CardBattleHistory::LEN,
        seeds = [CARD_BATTLE_HISTORY_SEED, card_mint.as_ref()],
        bump,
    )]
    pub card_battle_history: Account<'info, CardBattleHistory>,

    pub current_owner: Signer<'info>,

    #[account(mut)]
    pub payer: Signer<'info>,

    #[account(mut)]
    pub season_stats: Account<'info, SeasonStats>,

    pub system_program: Program<'info, System>,
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

fn push_owner_to_ring(history: &mut CardBattleHistory, old_owner: Pubkey) {
    if (history.owners_history_len as usize) < 10 {
        let len = history.owners_history_len as usize;
        for i in (1..=len).rev() {
            history.owners_history[i] = history.owners_history[i - 1];
        }
        history.owners_history[0] = old_owner;
        history.owners_history_len += 1;
    } else {
        for i in (1..10).rev() {
            history.owners_history[i] = history.owners_history[i - 1];
        }
        history.owners_history[0] = old_owner;
        history.owners_dropped_count = history.owners_dropped_count.saturating_add(1);
    }
}

// ─── Handler: simple ownership change (no steal) ─────────────────────────────

/// T-D13-A3: Record a card ownership change (duel win, P2P trade, shop).
///
/// Maintains a ring buffer of the last 10 owners. On StealType::None / standard
/// transfer, this is the correct entry point.
pub fn handle_record_card_owner_change(
    ctx: Context<RecordCardOwnerChange>,
    card_mint: Pubkey,
    new_owner: Pubkey,
    source: u8, // 0=mint, 1=shop, 2=duel_won, 3=p2p_trade
) -> Result<()> {
    let history = &mut ctx.accounts.card_battle_history;
    let old_owner = ctx.accounts.current_owner.key();
    let now = Clock::get()?.unix_timestamp;

    history.ensure_initialized(card_mint, now, ctx.bumps.card_battle_history);

    // Lazy lease-return: if the lease expired, clear lease state before recording new owner
    if history.lease_is_expired(now) {
        emit!(LeaseReturnedEvent {
            card_mint,
            returned_to: history.lease_returns_to,
            returned_from: old_owner,
            timestamp: now,
        });
        history.has_active_lease = false;
        history.lease_expires_at = 0;
        history.lease_returns_to = Pubkey::default();
    }

    push_owner_to_ring(history, old_owner);
    history.acquisition_source = source;
    history.current_owner_since = now;

    emit!(CardOwnerChanged {
        card_mint,
        old_owner,
        new_owner,
        source,
        timestamp: history.current_owner_since,
    });

    msg!(
        "CardOwnerChanged: mint={} old={} new={} source={}",
        card_mint,
        old_owner,
        new_owner,
        source,
    );
    Ok(())
}

// ─── Handler: steal with type (v3.0-plus extension) ──────────────────────────

/// v3.0-plus: Record an owner change that is the result of a Steal action.
///
/// `steal_type` determines lease vs. permanent transfer:
///   Lease    → records lease expiry + return address, source=5
///   Ransom   → pending (duel must resolve); treated as temporary, source=6
///   HandPeek → permanent, Gold Hall only, source=7
///   Legendary → permanent, Gold Hall + Legendary kill required, source=8
///
/// `hall_tier` (0=Bronze, 1=Silver, 2=Gold) is validated for Gold-only steals.
/// `is_starter_card` must be false — starter cards cannot be stolen.
///
/// Actual NFT token transfer is performed by the client / separate CPI;
/// this instruction records the on-chain history and lease parameters.
pub fn handle_record_card_owner_change_with_steal(
    ctx: Context<RecordCardOwnerChangeWithStats>,
    card_mint: Pubkey,
    new_owner: Pubkey,
    steal_type: StealType,
    hall_tier: u8,
    is_starter_card: bool,
    is_legendary: bool,
) -> Result<()> {
    // Starter deck protection
    require!(!is_starter_card, ErrorCode::StarterCardProtected);

    // Legendary protection against non-Legendary steal types
    if is_legendary {
        require!(
            steal_type == StealType::Legendary,
            ErrorCode::LegendaryRequiresLegendarySteal
        );
        require!(hall_tier == HALL_GOLD, ErrorCode::LegendaryRequiresGoldHall);
    }

    // Gold-Hall-only steal types
    match steal_type {
        StealType::HandPeek | StealType::Legendary => {
            require!(
                hall_tier == HALL_GOLD,
                ErrorCode::PermanentStealRequiresGoldHall
            );
        }
        _ => {}
    }

    let history = &mut ctx.accounts.card_battle_history;
    let old_owner = ctx.accounts.current_owner.key();
    let now = Clock::get()?.unix_timestamp;

    history.ensure_initialized(card_mint, now, ctx.bumps.card_battle_history);

    // Lazy lease-return for any prior lease
    if history.lease_is_expired(now) {
        emit!(LeaseReturnedEvent {
            card_mint,
            returned_to: history.lease_returns_to,
            returned_from: old_owner,
            timestamp: now,
        });
        history.has_active_lease = false;
        history.lease_expires_at = 0;
        history.lease_returns_to = Pubkey::default();
    }

    push_owner_to_ring(history, old_owner);

    let source = match steal_type {
        StealType::Lease => 5,
        StealType::Ransom => 6,
        StealType::HandPeek => 7,
        StealType::Legendary => 8,
    };
    history.acquisition_source = source;
    history.current_owner_since = now;

    // Record lease parameters for Lease-Steal
    if steal_type == StealType::Lease {
        history.has_active_lease = true;
        history.lease_expires_at = now + LEASE_DURATION_SEC;
        history.lease_returns_to = old_owner;

        emit!(LeaseStealEvent {
            card_mint,
            from: old_owner,
            to: new_owner,
            expires_at: history.lease_expires_at,
            timestamp: now,
        });
    }

    // Update SeasonStats
    ctx.accounts.season_stats.total_stolen =
        ctx.accounts.season_stats.total_stolen.saturating_add(1);

    emit!(CardOwnerChanged {
        card_mint,
        old_owner,
        new_owner,
        source,
        timestamp: now,
    });

    msg!(
        "CardOwnerChanged (steal={:?}): mint={} old={} new={}",
        steal_type,
        card_mint,
        old_owner,
        new_owner,
    );
    Ok(())
}

// promote_card — YKK-45: provenance-driven single-card promotion (design v3 §2).
//
// One card is promoted in place: the rarity stored in its CardMintRecord PDA is
// raised, keeping the SAME SPL mint (no burn, no new mint). Because CardBattleHistory
// is keyed by the same card_mint, the card's full battle/provenance record carries
// over unbroken. This is the opposite of the old `evolve_cards` (2-burn → new mint),
// which severed history and is therefore unwired (kept for reference only).
//
// Full tier ladder (design v3 §2, thresholds are §6 placeholders):
//   Common    → Uncommon : wins ≥ 10
//   Uncommon  → Rare      : wins ≥ 25 AND (legendary_kills ≥ 1 OR owners_dropped_count ≥ 1)
//   Rare      → Legendary : wins ≥ 50 AND acquisition_source == duel_won AND kos ≥ 30
// Every gate reads only existing CardBattleHistory fields — no new storage. The gate
// logic lives in the pure `evaluate_promotion` helper (unit-tested without accounts).
//
// Token/SOL promotion cost (the supply sink in §2) is NOT applied here — that is
// YKK-43's economy work; this instruction only enforces the history gates. Adding a
// cost later is an account + transfer in this same handler, gate logic unchanged.
use crate::constants::{
    ACQUISITION_DUEL_WON, PROMOTE_COMMON_TO_UNCOMMON_WINS,
    PROMOTE_COST_COMMON_TO_UNCOMMON_LAMPORTS, PROMOTE_COST_RARE_TO_LEGENDARY_LAMPORTS,
    PROMOTE_COST_UNCOMMON_TO_RARE_LAMPORTS, PROMOTE_RARE_TO_LEGENDARY_KOS,
    PROMOTE_RARE_TO_LEGENDARY_WINS, PROMOTE_UNCOMMON_TO_RARE_WINS, RARITY_COMMON, RARITY_LEGENDARY,
    RARITY_RARE, RARITY_UNCOMMON,
};
use crate::error::ErrorCode;
use crate::state::{CardBattleHistory, CardMintRecord, GameWorld};
use anchor_lang::prelude::*;
use anchor_lang::system_program::{transfer, Transfer};
use anchor_spl::token::{Mint, TokenAccount};

#[derive(Accounts)]
#[instruction(card_mint: Pubkey)]
pub struct PromoteCard<'info> {
    /// The card holder requesting the promotion (pays the promotion fee).
    #[account(mut)]
    pub owner: Signer<'info>,

    /// The card's SPL mint; pinned to the `card_mint` argument used in the PDA seeds.
    #[account(constraint = card_mint_account.key() == card_mint @ ErrorCode::InvalidAccount)]
    pub card_mint_account: Account<'info, Mint>,

    /// Proves `owner` actually holds this card (the NFT lives in their ATA).
    #[account(
        associated_token::mint = card_mint_account,
        associated_token::authority = owner,
        constraint = owner_token_account.amount >= 1 @ ErrorCode::InvalidAction,
    )]
    pub owner_token_account: Account<'info, TokenAccount>,

    /// On-chain rarity record (the thing we update in place).
    #[account(
        mut,
        seeds = [CardMintRecord::SEED, card_mint.as_ref()],
        bump = card_mint_record.bump,
    )]
    pub card_mint_record: Account<'info, CardMintRecord>,

    /// Provenance record (read-only here — the promotion gate reads `wins`).
    #[account(
        seeds = [CardBattleHistory::CARD_BATTLE_HISTORY_SEED, card_mint.as_ref()],
        bump,
    )]
    pub card_battle_history: Account<'info, CardBattleHistory>,

    /// Holds the canonical ops_treasury address the fee is checked against.
    #[account(seeds = [b"game_world"], bump = game_world.bump)]
    pub game_world: Account<'info, GameWorld>,

    /// CHECK: verified against game_world.ops_treasury (same pattern as buy_pack).
    #[account(mut, constraint = ops_treasury.key() == game_world.ops_treasury @ ErrorCode::Unauthorized)]
    pub ops_treasury: AccountInfo<'info>,

    pub system_program: Program<'info, System>,
}

#[event]
pub struct CardPromoted {
    pub card_mint: Pubkey,
    pub from_rarity: u8,
    pub to_rarity: u8,
    pub wins: u32,
}

pub fn handle_promote_card(ctx: Context<PromoteCard>, card_mint: Pubkey) -> Result<()> {
    let record = &mut ctx.accounts.card_mint_record;

    // Pin the record to the mint (YKK-32 pattern): the record's stored mint must match
    // the seed argument, so a caller can't aim the update at someone else's record.
    require!(record.card_mint == card_mint, ErrorCode::InvalidAccount);

    // Provenance gate: history is keyed by the same mint, so it reflects this exact
    // card's full record. The target tier is decided purely from the current rarity
    // and the history counters (unit-tested in `evaluate_promotion`).
    let h = &ctx.accounts.card_battle_history;
    let from = record.rarity;
    let target = evaluate_promotion(
        from,
        h.wins,
        h.kos,
        h.legendary_kills,
        h.owners_dropped_count,
        h.acquisition_source,
    )?;

    // Promotion fee (YKK-43 sink): pay the tier-step cost to ops_treasury. Charged
    // only after the gate passes, so a rejected promotion is free.
    let fee = promotion_cost_lamports(from);
    if fee > 0 {
        transfer(
            CpiContext::new(
                ctx.accounts.system_program.key(),
                Transfer {
                    from: ctx.accounts.owner.to_account_info(),
                    to: ctx.accounts.ops_treasury.to_account_info(),
                },
            ),
            fee,
        )?;
    }

    // In-place promotion: same mint, history untouched, only rarity rises.
    let wins = h.wins;
    record.rarity = target;

    emit!(CardPromoted {
        card_mint,
        from_rarity: from,
        to_rarity: target,
        wins,
    });
    msg!(
        "promote_card: mint={} rarity {}->{} wins={} fee={}lamports (same mint, history continuous)",
        card_mint,
        from,
        target,
        wins,
        fee,
    );
    Ok(())
}

/// SOL fee (lamports) for promoting a card that is currently at `from_rarity`.
/// Escalates with tier; anything at/above Legendary or unknown pays 0 (it can't
/// promote anyway — `evaluate_promotion` rejects it before this is charged).
/// Placeholder amounts pending the YKK-43 economy sim.
pub(crate) fn promotion_cost_lamports(from_rarity: u8) -> u64 {
    match from_rarity {
        RARITY_COMMON => PROMOTE_COST_COMMON_TO_UNCOMMON_LAMPORTS,
        RARITY_UNCOMMON => PROMOTE_COST_UNCOMMON_TO_RARE_LAMPORTS,
        RARITY_RARE => PROMOTE_COST_RARE_TO_LEGENDARY_LAMPORTS,
        _ => 0,
    }
}

// ── Pure promotion gate (unit-tested; no accounts/SVM needed) ────────────────

/// Decide the target rarity for a promotion from the card's current rarity and its
/// provenance counters, or return the specific gate error that blocks it. Thresholds
/// are design-v3 §6 placeholders; the *structure* (history-only gates, one tier per
/// call, in-place) is the fixed design.
///
/// Returns `ErrorCode` (not `anchor_lang::Error`) so it composes cleanly with `?` in
/// the handler (Anchor provides `From<ErrorCode>`), while staying trivially unit-testable.
pub(crate) fn evaluate_promotion(
    current_rarity: u8,
    wins: u32,
    kos: u32,
    legendary_kills: u32,
    owners_dropped_count: u32,
    acquisition_source: u8,
) -> std::result::Result<u8, ErrorCode> {
    match current_rarity {
        RARITY_COMMON => {
            if wins < PROMOTE_COMMON_TO_UNCOMMON_WINS {
                return Err(ErrorCode::InsufficientWinsForPromotion);
            }
            Ok(RARITY_UNCOMMON)
        }
        RARITY_UNCOMMON => {
            if wins < PROMOTE_UNCOMMON_TO_RARE_WINS {
                return Err(ErrorCode::InsufficientWinsForPromotion);
            }
            // Deep-provenance mark: a legendary kill OR having been dropped/stolen
            // from a prior owner. Either proves the card has a real combat/ownership
            // history, not just a win count.
            if legendary_kills < 1 && owners_dropped_count < 1 {
                return Err(ErrorCode::MissingRareProvenance);
            }
            Ok(RARITY_RARE)
        }
        RARITY_RARE => {
            if wins < PROMOTE_RARE_TO_LEGENDARY_WINS {
                return Err(ErrorCode::InsufficientWinsForPromotion);
            }
            // The apex tier can only be reached by a card that was itself won in a
            // duel — bought/minted/traded cards cannot buy their way to Legendary.
            if acquisition_source != ACQUISITION_DUEL_WON {
                return Err(ErrorCode::NotDuelWonAcquisition);
            }
            if kos < PROMOTE_RARE_TO_LEGENDARY_KOS {
                return Err(ErrorCode::InsufficientKosForPromotion);
            }
            Ok(RARITY_LEGENDARY)
        }
        // Legendary (max) or any unexpected value: nothing above to promote to.
        _ => Err(ErrorCode::AlreadyMaxRarity),
    }
}

#[cfg(test)]
mod tests {
    use super::{evaluate_promotion, promotion_cost_lamports};
    use crate::constants::{
        ACQUISITION_DUEL_WON, PROMOTE_COST_COMMON_TO_UNCOMMON_LAMPORTS,
        PROMOTE_COST_RARE_TO_LEGENDARY_LAMPORTS, PROMOTE_COST_UNCOMMON_TO_RARE_LAMPORTS,
        RARITY_COMMON, RARITY_LEGENDARY, RARITY_RARE, RARITY_UNCOMMON,
    };
    use crate::error::ErrorCode;

    // Common → Uncommon: wins gate only.
    #[test]
    fn common_promotes_at_ten_wins() {
        assert!(matches!(
            evaluate_promotion(RARITY_COMMON, 10, 0, 0, 0, 0),
            Ok(r) if r == RARITY_UNCOMMON
        ));
    }
    #[test]
    fn common_blocked_below_ten_wins() {
        assert!(matches!(
            evaluate_promotion(RARITY_COMMON, 9, 99, 9, 9, 2),
            Err(ErrorCode::InsufficientWinsForPromotion)
        ));
    }

    // Uncommon → Rare: wins AND (legendary_kills OR owners_dropped).
    #[test]
    fn uncommon_promotes_with_legendary_kill() {
        assert!(matches!(
            evaluate_promotion(RARITY_UNCOMMON, 25, 0, 1, 0, 0),
            Ok(r) if r == RARITY_RARE
        ));
    }
    #[test]
    fn uncommon_promotes_with_owner_drop() {
        assert!(matches!(
            evaluate_promotion(RARITY_UNCOMMON, 25, 0, 0, 1, 0),
            Ok(r) if r == RARITY_RARE
        ));
    }
    #[test]
    fn uncommon_blocked_without_deep_provenance() {
        // Enough wins, but no legendary kill and never dropped → blocked.
        assert!(matches!(
            evaluate_promotion(RARITY_UNCOMMON, 40, 5, 0, 0, 2),
            Err(ErrorCode::MissingRareProvenance)
        ));
    }
    #[test]
    fn uncommon_blocked_below_win_gate() {
        assert!(matches!(
            evaluate_promotion(RARITY_UNCOMMON, 24, 0, 1, 1, 2),
            Err(ErrorCode::InsufficientWinsForPromotion)
        ));
    }

    // Rare → Legendary: wins AND duel_won AND kos.
    #[test]
    fn rare_promotes_when_all_gates_met() {
        assert!(matches!(
            evaluate_promotion(RARITY_RARE, 50, 30, 0, 0, ACQUISITION_DUEL_WON),
            Ok(r) if r == RARITY_LEGENDARY
        ));
    }
    #[test]
    fn rare_blocked_when_not_duel_won() {
        // Bought card (source=shop=1) can't reach Legendary even with the stats.
        assert!(matches!(
            evaluate_promotion(RARITY_RARE, 80, 80, 0, 0, 1),
            Err(ErrorCode::NotDuelWonAcquisition)
        ));
    }
    #[test]
    fn rare_blocked_below_kos_gate() {
        assert!(matches!(
            evaluate_promotion(RARITY_RARE, 50, 29, 0, 0, ACQUISITION_DUEL_WON),
            Err(ErrorCode::InsufficientKosForPromotion)
        ));
    }
    #[test]
    fn rare_blocked_below_win_gate() {
        assert!(matches!(
            evaluate_promotion(RARITY_RARE, 49, 99, 0, 0, ACQUISITION_DUEL_WON),
            Err(ErrorCode::InsufficientWinsForPromotion)
        ));
    }

    // Legendary is the ceiling.
    #[test]
    fn legendary_cannot_promote_further() {
        assert!(matches!(
            evaluate_promotion(RARITY_LEGENDARY, 999, 999, 9, 9, ACQUISITION_DUEL_WON),
            Err(ErrorCode::AlreadyMaxRarity)
        ));
    }

    // Promotion fee escalates by tier; max/unknown pays nothing.
    #[test]
    fn cost_escalates_by_tier() {
        assert_eq!(
            promotion_cost_lamports(RARITY_COMMON),
            PROMOTE_COST_COMMON_TO_UNCOMMON_LAMPORTS
        );
        assert_eq!(
            promotion_cost_lamports(RARITY_UNCOMMON),
            PROMOTE_COST_UNCOMMON_TO_RARE_LAMPORTS
        );
        assert_eq!(
            promotion_cost_lamports(RARITY_RARE),
            PROMOTE_COST_RARE_TO_LEGENDARY_LAMPORTS
        );
        assert!(
            PROMOTE_COST_COMMON_TO_UNCOMMON_LAMPORTS < PROMOTE_COST_UNCOMMON_TO_RARE_LAMPORTS
                && PROMOTE_COST_UNCOMMON_TO_RARE_LAMPORTS < PROMOTE_COST_RARE_TO_LEGENDARY_LAMPORTS
        );
    }
    #[test]
    fn cost_zero_for_legendary_and_unknown() {
        assert_eq!(promotion_cost_lamports(RARITY_LEGENDARY), 0);
        assert_eq!(promotion_cost_lamports(99), 0);
    }
}

// promote_card — YKK-45: provenance-driven single-card promotion (design v3 §2).
//
// One card is promoted in place: the rarity stored in its CardMintRecord PDA is
// raised, keeping the SAME SPL mint (no burn, no new mint). Because CardBattleHistory
// is keyed by the same card_mint, the card's full battle/provenance record carries
// over unbroken. This is the opposite of the old `evolve_cards` (2-burn → new mint),
// which severed history and is therefore unwired (kept for reference only).
//
// First step (this ticket): Common → Uncommon only, gated on `wins >= N`. Token cost
// (YKK-43) and the higher tiers (Uncommon→Rare→Legendary, which add steal-derived
// gates) come later.
use crate::constants::{PROMOTE_COMMON_TO_UNCOMMON_WINS, RARITY_COMMON, RARITY_UNCOMMON};
use crate::error::ErrorCode;
use crate::state::{CardBattleHistory, CardMintRecord};
use anchor_lang::prelude::*;
use anchor_spl::token::{Mint, TokenAccount};

#[derive(Accounts)]
#[instruction(card_mint: Pubkey)]
pub struct PromoteCard<'info> {
    /// The card holder requesting the promotion.
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

    // This step promotes Common → Uncommon only; other tiers are a later ticket.
    require!(record.rarity == RARITY_COMMON, ErrorCode::PromoteWrongTier);

    // Provenance gate: the card must have earned enough wins (history is keyed by the
    // same mint, so it reflects this exact card's full record).
    let wins = ctx.accounts.card_battle_history.wins;
    require!(
        wins >= PROMOTE_COMMON_TO_UNCOMMON_WINS,
        ErrorCode::InsufficientWinsForPromotion
    );

    // In-place promotion: same mint, history untouched, only rarity rises.
    let from = record.rarity;
    record.rarity = RARITY_UNCOMMON;

    emit!(CardPromoted {
        card_mint,
        from_rarity: from,
        to_rarity: record.rarity,
        wins,
    });
    msg!(
        "promote_card: mint={} rarity {}->{} wins={} (same mint, history continuous)",
        card_mint,
        from,
        record.rarity,
        wins,
    );
    Ok(())
}

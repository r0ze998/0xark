use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Mint, Burn};
use crate::error::ErrorCode;
use crate::state::{CardBattleHistory, CardMintRecord, SeasonStats, CardBurnedEvent};

// Rarity constants (matches client CARDS[i].rarity)
pub const RARITY_COMMON:    u8 = 0;
pub const RARITY_UNCOMMON:  u8 = 1;
pub const RARITY_RARE:      u8 = 2;
pub const RARITY_LEGENDARY: u8 = 3;

// ─── Accounts ─────────────────────────────────────────────────────────────────

#[derive(Accounts)]
#[instruction(card_mint: Pubkey)]
pub struct BurnCard<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,

    /// CHECK: The mint address of the card NFT being burned.
    #[account(mut)]
    pub card_mint_account: Account<'info, Mint>,

    /// Owner's ATA for this NFT mint.
    #[account(
        mut,
        associated_token::mint  = card_mint_account,
        associated_token::authority = owner,
        constraint = card_token_account.amount == 1 @ ErrorCode::InvalidAction,
    )]
    pub card_token_account: Account<'info, TokenAccount>,

    #[account(
        init_if_needed,
        payer = owner,
        space = CardBattleHistory::LEN,
        seeds = [CardBattleHistory::CARD_BATTLE_HISTORY_SEED, card_mint.as_ref()],
        bump,
    )]
    pub card_history: Account<'info, CardBattleHistory>,

    // C5 fix: rarity is read from this on-chain record, not trusted from the caller.
    #[account(
        seeds = [CardMintRecord::SEED, card_mint.as_ref()],
        bump  = card_mint_record.bump,
    )]
    pub card_mint_record: Account<'info, CardMintRecord>,

    #[account(
        mut,
        seeds = [SeasonStats::SEASON_STATS_SEED, &card_history.created_at.to_le_bytes()],
        bump = season_stats.bump,
    )]
    pub season_stats: Account<'info, SeasonStats>,

    pub token_program:      Program<'info, Token>,
    pub system_program:     Program<'info, System>,
    pub associated_token_program: Program<'info, anchor_spl::associated_token::AssociatedToken>,
    pub rent:               Sysvar<'info, Rent>,
}

// ─── Handler ─────────────────────────────────────────────────────────────────

/// v3.0-plus: Permanently burn an NFT card via SPL Token CPI.
///
/// Protection rules:
///   Legendary (rarity=3) → always blocked
///   Rare      (rarity=2) → blocked in Season 1
///   Common/Uncommon      → allowed
///
/// Rarity is read from the on-chain CardMintRecord PDA (C5 fix).
pub fn handle_burn_card(
    ctx: Context<BurnCard>,
    card_mint: Pubkey,
) -> Result<()> {
    // C5 fix: rarity sourced from on-chain record, not from caller argument.
    let rarity = ctx.accounts.card_mint_record.rarity;

    // 1. Rarity protection gate
    require!(
        rarity != RARITY_LEGENDARY,
        ErrorCode::LegendariesAreProtectedFromBurn
    );
    require!(
        rarity != RARITY_RARE,
        ErrorCode::RareRequiresConditionalBurn
    );

    // 2. Lazy lease-return check — if this card is on active lease from another owner,
    //    the current owner cannot burn it (they are the lessee, not the true owner).
    let history = &ctx.accounts.card_history;
    let now = Clock::get()?.unix_timestamp;
    if history.has_active_lease && !history.lease_is_expired(now) {
        return Err(ErrorCode::InvalidState.into());
    }

    // 3. SPL Token burn — destroys the 1 token in the ATA
    token::burn(
        CpiContext::new(
            ctx.accounts.token_program.key(),
            Burn {
                mint:      ctx.accounts.card_mint_account.to_account_info(),
                from:      ctx.accounts.card_token_account.to_account_info(),
                authority: ctx.accounts.owner.to_account_info(),
            },
        ),
        1,
    )?;

    // 4. Update CardBattleHistory
    let history = &mut ctx.accounts.card_history;
    if history.card_mint == Pubkey::default() {
        history.card_mint  = card_mint;
        history.created_at = now;
        history.bump       = ctx.bumps.card_history;
    }
    history.burn_count = history.burn_count.saturating_add(1);
    // Clear any expired lease state
    if history.lease_is_expired(now) {
        history.has_active_lease = false;
        history.lease_expires_at = 0;
    }

    // 5. Update SeasonStats
    ctx.accounts.season_stats.total_burned =
        ctx.accounts.season_stats.total_burned.saturating_add(1);

    emit!(CardBurnedEvent {
        card_mint,
        owner: ctx.accounts.owner.key(),
        rarity,
        timestamp: now,
    });

    msg!(
        "CardBurned: mint={} owner={} rarity={}",
        card_mint, ctx.accounts.owner.key(), rarity,
    );
    Ok(())
}

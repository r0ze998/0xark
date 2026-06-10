use crate::error::ErrorCode;
use crate::state::{CardLoreShards, LoreShardUnlocked};
use anchor_lang::prelude::*;

/// Shard indices for a card's lore progression (3 shards per card):
///   0 = Shard 1 — auto-unlocked on first card acquisition (record_mint)
///   1 = Shard 2 — unlocked by playing a duel with the card in deck
///   2 = Shard 3 — unlocked via Gold Hall win or x402 direct payment (Day 15)
///
/// Method codes:
///   0 = auto         (program-internal, e.g. on mint)
///   1 = condition_met (duel participation, achievement trigger)
///   2 = x402_payment  (direct unlock via micropayment)
pub const SHARD_COUNT: u8 = 3;

#[derive(Accounts)]
#[instruction(card_mint: Pubkey, shard_index: u8)]
pub struct UnlockLoreShard<'info> {
    #[account(
        init_if_needed,
        payer = owner,
        space = CardLoreShards::SIZE,
        seeds = [b"card_lore_shards", card_mint.as_ref(), owner.key().as_ref()],
        bump,
    )]
    pub card_lore_shards: Account<'info, CardLoreShards>,

    #[account(mut)]
    pub owner: Signer<'info>,

    pub system_program: Program<'info, System>,
}

pub fn handle_unlock_lore_shard(
    ctx: Context<UnlockLoreShard>,
    card_mint: Pubkey,
    shard_index: u8,
    method: u8,
) -> Result<()> {
    require!(shard_index < SHARD_COUNT, ErrorCode::InvalidAction);

    let cls = &mut ctx.accounts.card_lore_shards;
    let now = Clock::get()?.unix_timestamp;

    // Initialize on first use
    if cls.card_mint == Pubkey::default() {
        cls.card_mint = card_mint;
        cls.owner = ctx.accounts.owner.key();
        cls.shards_found = [false; 3];
        cls.unlock_timestamps = [0i64; 3];
        cls.bump = ctx.bumps.card_lore_shards;
    }

    // Verify ownership matches
    require!(
        cls.owner == ctx.accounts.owner.key(),
        ErrorCode::InvalidAction
    );

    // Idempotent — already unlocked is a no-op
    if cls.shards_found[shard_index as usize] {
        msg!(
            "Shard {} already unlocked for card {}",
            shard_index,
            card_mint
        );
        return Ok(());
    }

    cls.shards_found[shard_index as usize] = true;
    cls.unlock_timestamps[shard_index as usize] = now;

    emit!(LoreShardUnlocked {
        card_mint,
        owner: ctx.accounts.owner.key(),
        shard_index,
        method,
        timestamp: now,
    });

    msg!(
        "Lore Shard {} unlocked for card {} (method={}, owner={})",
        shard_index,
        card_mint,
        method,
        ctx.accounts.owner.key()
    );

    Ok(())
}

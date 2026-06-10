use crate::error::ErrorCode;
use crate::state::PlayerDeck;
use anchor_lang::prelude::*;

/// Lock the player's deck for 1 hour (3600 seconds).
///
/// A locked deck cannot be modified via `save_deck` until the timer expires.
/// Locking is required before entering the dungeon — the client enforces this
/// by checking `locked_until > now` before the dungeon gate transition.
///
/// Re-locking while already locked extends the timer from *now* (simple refresh).
pub fn handle_lock_deck(ctx: Context<LockDeck>) -> Result<()> {
    let deck = &mut ctx.accounts.player_deck;
    let clock = Clock::get()?;

    // Must have at least 1 card saved before locking
    require!(deck.card_count >= 1, ErrorCode::InvalidDeckComposition);

    deck.locked_until = clock.unix_timestamp + 3600;
    deck.last_modified = clock.unix_timestamp;

    Ok(())
}

#[derive(Accounts)]
pub struct LockDeck<'info> {
    #[account(
        mut,
        seeds = [b"player_deck", player.key().as_ref()],
        bump = player_deck.bump,
        constraint = player_deck.owner == player.key() @ ErrorCode::InvalidDeckComposition,
    )]
    pub player_deck: Account<'info, PlayerDeck>,

    #[account(mut)]
    pub player: Signer<'info>,
}

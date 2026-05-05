// cancel_listing — Phase 20-C: cancel an active listing and return the card.
//
// Only the original seller may cancel. The card is returned to their vault.
// The TradeListing PDA is closed and rent is refunded to the seller.

use anchor_lang::prelude::*;
use crate::state::{PlayerState, TradeListing, ListingCancelledEvent};
use crate::error::ErrorCode;

#[derive(Accounts)]
#[instruction(card_id: u8)]
pub struct CancelListing<'info> {
    #[account(mut)]
    pub seller: Signer<'info>,

    #[account(
        mut,
        seeds = [b"player", seller.key().as_ref()],
        bump,
    )]
    pub seller_state: Account<'info, PlayerState>,

    #[account(
        mut,
        seeds = [b"trade", seller.key().as_ref(), &[card_id]],
        bump,
        close = seller,
        constraint = listing.seller == seller.key() @ ErrorCode::NotSeller,
        constraint = listing.active             @ ErrorCode::ListingInactive,
    )]
    pub listing: Account<'info, TradeListing>,
}

pub fn handle_cancel_listing(ctx: Context<CancelListing>, card_id: u8) -> Result<()> {
    // Return escrowed card to seller vault
    ctx.accounts.seller_state.add_card(card_id)?;

    emit!(ListingCancelledEvent {
        seller:  ctx.accounts.seller.key(),
        card_id,
        slot: Clock::get()?.slot,
    });

    msg!("cancel_listing: seller={} card={}", ctx.accounts.seller.key(), card_id);
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn trade_seed_matches_state() {
        assert_eq!(TradeListing::TRADE_SEED, b"trade");
    }
}

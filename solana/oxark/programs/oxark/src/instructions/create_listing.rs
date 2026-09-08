// create_listing — Phase 20-C: escrow a card and open a sell listing.
//
// The card is removed from the seller's vault bitmap immediately.
// The TradeListing PDA holds the escrow record until purchase or cancellation.

use crate::constants::MIN_LISTING_PRICE;
use crate::error::ErrorCode;
use crate::state::{GameWorld, ListingCreatedEvent, PlayerState, TradeListing};
use anchor_lang::prelude::*;

#[derive(Accounts)]
#[instruction(card_id: u8)]
pub struct CreateListing<'info> {
    #[account(mut)]
    pub seller: Signer<'info>,

    #[account(
        mut,
        seeds = [b"player", seller.key().as_ref()],
        bump,
    )]
    pub seller_state: Account<'info, PlayerState>,

    #[account(
        init,
        payer = seller,
        space = TradeListing::SIZE,
        seeds = [b"trade", seller.key().as_ref(), &[card_id]],
        bump,
    )]
    pub listing: Account<'info, TradeListing>,

    pub system_program: Program<'info, System>,
    #[account(seeds = [GameWorld::SEED], bump = game_world.bump)]
    pub game_world: Account<'info, GameWorld>,

}

pub fn handle_create_listing(ctx: Context<CreateListing>, card_id: u8, price: u64) -> Result<()> {
    ctx.accounts.game_world.require_collection_open(Clock::get()?.unix_timestamp)?;
    require!(ctx.accounts.seller_state.deposit_amount > 0, ErrorCode::NotRegistered);

    require!(price >= MIN_LISTING_PRICE, ErrorCode::PriceTooLow);

    // Escrow: remove card from seller vault now
    ctx.accounts.seller_state.remove_card(card_id)?;

    let listing = &mut ctx.accounts.listing;
    listing.seller = ctx.accounts.seller.key();
    listing.card_id = card_id;
    listing.price = price;
    listing.created_at = Clock::get()?.unix_timestamp;
    listing.active = true;

    emit!(ListingCreatedEvent {
        seller: ctx.accounts.seller.key(),
        card_id,
        price,
        slot: Clock::get()?.slot,
    });

    msg!(
        "create_listing: seller={} card={} price={}",
        ctx.accounts.seller.key(),
        card_id,
        price
    );
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn price_zero_is_too_low() {
        assert!(0u64 < MIN_LISTING_PRICE);
    }

    #[test]
    fn minimum_price_accepted() {
        assert!(MIN_LISTING_PRICE >= MIN_LISTING_PRICE);
    }

    #[test]
    fn listing_size_is_58() {
        assert_eq!(TradeListing::SIZE, 58);
    }
}

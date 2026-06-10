// accept_listing — Phase 20-C: purchase a listed card.
//
// Buyer pays the listed SOL price directly to the seller (0% platform fee).
// The card is transferred to the buyer's vault.
// The TradeListing PDA is closed (close = seller) — rent refund goes to seller.

use crate::error::ErrorCode;
use crate::state::{ListingAcceptedEvent, PlayerState, TradeListing};
use anchor_lang::prelude::*;
use anchor_lang::system_program::{transfer, Transfer};

#[derive(Accounts)]
#[instruction(seller_pubkey: Pubkey, card_id: u8)]
pub struct AcceptListing<'info> {
    #[account(mut)]
    pub buyer: Signer<'info>,

    #[account(
        mut,
        seeds = [b"player", buyer.key().as_ref()],
        bump,
    )]
    pub buyer_state: Account<'info, PlayerState>,

    #[account(
        mut,
        seeds = [b"trade", seller_pubkey.as_ref(), &[card_id]],
        bump,
        close = seller,
        constraint = listing.seller == seller_pubkey @ ErrorCode::WrongSeller,
        constraint = listing.active                  @ ErrorCode::ListingInactive,
    )]
    pub listing: Account<'info, TradeListing>,

    /// CHECK: validated by address constraint (matches seller_pubkey instruction arg)
    #[account(mut, address = seller_pubkey)]
    pub seller: AccountInfo<'info>,

    pub system_program: Program<'info, System>,
}

pub fn handle_accept_listing(
    ctx: Context<AcceptListing>,
    _seller_pubkey: Pubkey,
    card_id: u8,
) -> Result<()> {
    let price = ctx.accounts.listing.price;
    let seller = ctx.accounts.listing.seller;

    // Transfer SOL: buyer → seller (0% fee, no platform cut)
    transfer(
        CpiContext::new(
            ctx.accounts.system_program.key(),
            Transfer {
                from: ctx.accounts.buyer.to_account_info(),
                to: ctx.accounts.seller.clone(),
            },
        ),
        price,
    )?;

    // Grant card to buyer vault
    ctx.accounts.buyer_state.add_card(card_id)?;

    // PDA close = seller handles rent refund automatically

    emit!(ListingAcceptedEvent {
        buyer: ctx.accounts.buyer.key(),
        seller,
        card_id,
        price,
        slot: Clock::get()?.slot,
    });

    msg!(
        "accept_listing: buyer={} seller={} card={} price={}",
        ctx.accounts.buyer.key(),
        seller,
        card_id,
        price
    );
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn listing_size_correct() {
        // SIZE = 8 disc + 32 seller + 1 card_id + 8 price + 8 created_at + 1 active
        assert_eq!(TradeListing::SIZE, 58);
    }

    #[test]
    fn listing_seed_bytes() {
        assert_eq!(TradeListing::TRADE_SEED, b"trade");
    }
}

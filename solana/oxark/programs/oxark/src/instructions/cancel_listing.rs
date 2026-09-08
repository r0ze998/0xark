// cancel_listing — Phase 20-C: cancel an active listing and return the card.
//
// Only the original seller may cancel. The card is returned to their vault.
// The TradeListing PDA is closed and rent is refunded to the seller.

use crate::error::ErrorCode;
use crate::state::{GameWorld, ListingCancelledEvent, PlayerState, TradeListing};
use anchor_lang::prelude::*;

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
    #[account(seeds = [GameWorld::SEED], bump = game_world.bump)]
    pub game_world: Account<'info, GameWorld>,

}

pub fn handle_cancel_listing(ctx: Context<CancelListing>, card_id: u8) -> Result<()> {
    let world = &ctx.accounts.game_world;
    if world.game_status == 2 {
        require!(world.finalize_processed == world.total_participants, ErrorCode::TallyIncomplete);
        let ps = &mut ctx.accounts.seller_state;
        if ps.deposit_amount > 0 {
            // A zero-entitlement player must also be able to recover escrow.
            // Consume that zero claim BEFORE returning a card, so it cannot
            // create a new entitlement against an already fixed denominator.
            let count = ps.vault_count() as u64;
            let amount = if count == 0 { 0 } else {
                crate::instructions::claim_prize_v2::compute_tier_prize(
                    count, world.total_prize_pool, world, world.winner_60_count == 0)
            };
            require!(amount == 0, ErrorCode::CollectionFrozen);
            ps.deposit_amount = 0;
        }
    } else {
        world.require_collection_open(Clock::get()?.unix_timestamp)?;
    }
    // Return escrowed card to seller vault
    ctx.accounts.seller_state.add_card(card_id)?;

    emit!(ListingCancelledEvent {
        seller: ctx.accounts.seller.key(),
        card_id,
        slot: Clock::get()?.slot,
    });

    msg!(
        "cancel_listing: seller={} card={}",
        ctx.accounts.seller.key(),
        card_id
    );
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

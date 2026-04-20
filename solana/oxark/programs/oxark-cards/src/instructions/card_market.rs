use anchor_lang::prelude::*;
use crate::errors::CardsError;

pub const CARD_LISTING_SEED: &[u8] = b"card_listing";
pub const CARD_SALE_SEED:    &[u8] = b"card_sale";

/// On-chain record of a card listed for P2P sale.
///
/// PDA seeds: `["card_listing", seller, card_id_u8]`
///
/// `active` is set to false after a successful purchase (or seller cancels).
/// Kept on-chain for audit history rather than closed.
#[account]
pub struct CardListing {
    pub seller:          Pubkey,   // Wallet listing the card
    pub card_id:         u8,       // 1-60 card ID
    pub price_lamports:  u64,      // Ask price in lamports
    pub active:          bool,     // false after purchase / cancellation
    pub bump:            u8,
}

impl Default for CardListing {
    fn default() -> Self {
        Self {
            seller:         Pubkey::default(),
            card_id:        0,
            price_lamports: 0,
            active:         false,
            bump:           0,
        }
    }
}

impl CardListing {
    /// disc[8] + seller[32] + card_id[1] + price[8] + active[1] + bump[1]
    pub const SIZE: usize = 8 + 32 + 1 + 8 + 1 + 1;
}

/// On-chain record of a completed card sale (write-once audit trail).
///
/// PDA seeds: `["card_sale", buyer, card_id_u8, seller]`
///
/// `payment_tx_lo/hi` store the first/last 32 bytes of the Solana tx sig
/// that carried the x402 SOL payment — linking the on-chain record to
/// the off-chain facilitator verification.
#[account]
pub struct CardSaleRecord {
    pub seller:         Pubkey,
    pub buyer:          Pubkey,
    pub card_id:        u8,
    pub price_lamports: u64,
    pub sold_at:        i64,       // Unix timestamp
    pub payment_tx_lo:  [u8; 32],
    pub payment_tx_hi:  [u8; 32],
    pub bump:           u8,
}

impl Default for CardSaleRecord {
    fn default() -> Self {
        Self {
            seller:         Pubkey::default(),
            buyer:          Pubkey::default(),
            card_id:        0,
            price_lamports: 0,
            sold_at:        0,
            payment_tx_lo:  [0u8; 32],
            payment_tx_hi:  [0u8; 32],
            bump:           0,
        }
    }
}

impl CardSaleRecord {
    /// disc[8] + seller[32] + buyer[32] + card_id[1] + price[8] + sold_at[8] + tx_lo[32] + tx_hi[32] + bump[1]
    pub const SIZE: usize = 8 + 32 + 32 + 1 + 8 + 8 + 32 + 32 + 1;
}

// ─── list_card ────────────────────────────────────────────────────────────────

#[derive(Accounts)]
#[instruction(card_id: u8, _price_lamports: u64)]
pub struct ListCard<'info> {
    #[account(
        init,
        payer = seller,
        space = CardListing::SIZE,
        seeds = [CARD_LISTING_SEED, seller.key().as_ref(), &[card_id]],
        bump,
    )]
    pub listing: Account<'info, CardListing>,

    #[account(mut)]
    pub seller: Signer<'info>,

    pub system_program: Program<'info, System>,
}

pub fn handle_list_card(
    ctx: Context<ListCard>,
    card_id: u8,
    price_lamports: u64,
) -> Result<()> {
    require!(card_id >= 1 && card_id <= 60, CardsError::InvalidCardId);
    require!(price_lamports > 0, CardsError::InvalidPrice);

    let listing = &mut ctx.accounts.listing;
    listing.seller         = ctx.accounts.seller.key();
    listing.card_id        = card_id;
    listing.price_lamports = price_lamports;
    listing.active         = true;
    listing.bump           = ctx.bumps.listing;

    msg!(
        "CardListing created: seller={} card_id={} price={}",
        listing.seller, card_id, price_lamports,
    );

    emit!(CardListed {
        seller: listing.seller,
        card_id,
        price_lamports,
    });

    Ok(())
}

// ─── buy_card ─────────────────────────────────────────────────────────────────

#[derive(Accounts)]
#[instruction(card_id: u8, seller_key: Pubkey)]
pub struct BuyCard<'info> {
    /// CardListing — must be active; marked inactive after purchase.
    #[account(
        mut,
        seeds = [CARD_LISTING_SEED, seller_key.as_ref(), &[card_id]],
        bump = listing.bump,
        constraint = listing.active @ CardsError::ListingNotActive,
        constraint = listing.seller == seller_key @ CardsError::SellerMismatch,
        constraint = listing.card_id == card_id @ CardsError::InvalidCardId,
    )]
    pub listing: Account<'info, CardListing>,

    /// Write-once sale audit record.
    #[account(
        init,
        payer = buyer,
        space = CardSaleRecord::SIZE,
        seeds = [CARD_SALE_SEED, buyer.key().as_ref(), &[card_id], seller_key.as_ref()],
        bump,
    )]
    pub sale_record: Account<'info, CardSaleRecord>,

    #[account(mut)]
    pub buyer: Signer<'info>,

    pub clock: Sysvar<'info, Clock>,
    pub system_program: Program<'info, System>,
}

pub fn handle_buy_card(
    ctx: Context<BuyCard>,
    card_id: u8,
    seller_key: Pubkey,
    payment_tx_lo: [u8; 32],
    payment_tx_hi: [u8; 32],
) -> Result<()> {
    // Deactivate listing
    let listing = &mut ctx.accounts.listing;
    listing.active = false;

    // Write sale record
    let sale = &mut ctx.accounts.sale_record;
    sale.seller         = seller_key;
    sale.buyer          = ctx.accounts.buyer.key();
    sale.card_id        = card_id;
    sale.price_lamports = listing.price_lamports;
    sale.sold_at        = ctx.accounts.clock.unix_timestamp;
    sale.payment_tx_lo  = payment_tx_lo;
    sale.payment_tx_hi  = payment_tx_hi;
    sale.bump           = ctx.bumps.sale_record;

    msg!(
        "CardSale: buyer={} card_id={} price={}",
        ctx.accounts.buyer.key(), card_id, sale.price_lamports,
    );

    emit!(CardSold {
        seller: seller_key,
        buyer:  ctx.accounts.buyer.key(),
        card_id,
        price_lamports: sale.price_lamports,
    });

    Ok(())
}

// ─── cancel_listing ───────────────────────────────────────────────────────────

#[derive(Accounts)]
#[instruction(card_id: u8)]
pub struct CancelListing<'info> {
    #[account(
        mut,
        seeds = [CARD_LISTING_SEED, seller.key().as_ref(), &[card_id]],
        bump = listing.bump,
        constraint = listing.seller == seller.key() @ CardsError::SellerMismatch,
        constraint = listing.active @ CardsError::ListingNotActive,
    )]
    pub listing: Account<'info, CardListing>,

    #[account(mut)]
    pub seller: Signer<'info>,

    pub system_program: Program<'info, System>,
}

pub fn handle_cancel_listing(ctx: Context<CancelListing>, _card_id: u8) -> Result<()> {
    ctx.accounts.listing.active = false;
    msg!("CardListing cancelled: card_id={}", ctx.accounts.listing.card_id);
    Ok(())
}

// ─── Events ───────────────────────────────────────────────────────────────────

#[event]
pub struct CardListed {
    pub seller:         Pubkey,
    pub card_id:        u8,
    pub price_lamports: u64,
}

#[event]
pub struct CardSold {
    pub seller:         Pubkey,
    pub buyer:          Pubkey,
    pub card_id:        u8,
    pub price_lamports: u64,
}

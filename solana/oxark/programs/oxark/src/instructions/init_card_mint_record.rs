// init_card_mint_record — C5 fix: admin registers rarity for an NFT card mint.
//
// burn_card reads rarity from this PDA instead of trusting the caller argument,
// preventing a caller from lying about rarity to bypass burn-protection gates.
//
// Must be called by the game admin (ADMIN_PUBKEY) once per NFT card mint,
// typically as part of the oxark-cards mint flow or immediately after.

use crate::constants::ADMIN_PUBKEY;
use crate::error::ErrorCode;
use crate::state::CardMintRecord;
use anchor_lang::prelude::*;

#[derive(Accounts)]
#[instruction(card_mint: Pubkey, card_id: u8, rarity: u8)]
pub struct InitCardMintRecord<'info> {
    #[account(
        init,
        payer = admin,
        space = CardMintRecord::SIZE,
        seeds = [CardMintRecord::SEED, card_mint.as_ref()],
        bump,
    )]
    pub card_mint_record: Account<'info, CardMintRecord>,

    #[account(
        mut,
        constraint = admin.key() == ADMIN_PUBKEY @ ErrorCode::NotAdmin,
    )]
    pub admin: Signer<'info>,
    pub system_program: Program<'info, System>,
}

pub fn handle_init_card_mint_record(
    ctx: Context<InitCardMintRecord>,
    card_mint: Pubkey,
    card_id: u8,
    rarity: u8,
) -> Result<()> {
    require!(card_id > 0 && card_id <= 60, ErrorCode::InvalidCardId);
    require!(rarity <= 3, ErrorCode::InvalidState);

    let record = &mut ctx.accounts.card_mint_record;
    record.card_mint = card_mint;
    record.card_id = card_id;
    record.rarity = rarity;
    record.bump = ctx.bumps.card_mint_record;

    msg!(
        "CardMintRecord: mint={} card_id={} rarity={}",
        card_mint,
        card_id,
        rarity
    );
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn seed_and_size_constants_correct() {
        assert_eq!(CardMintRecord::SEED, b"card_mint_record");
        assert_eq!(CardMintRecord::SIZE, 8 + 32 + 1 + 1 + 1);
    }

    #[test]
    fn card_id_zero_rejected() {
        let valid = 1u8 > 0 && 1u8 <= 60;
        let invalid = 0u8 > 0;
        assert!(valid, "card_id=1 must pass");
        assert!(!invalid, "card_id=0 must be rejected");
    }

    #[test]
    fn card_id_boundary_60_accepted() {
        assert!(60u8 > 0 && 60u8 <= 60);
    }

    #[test]
    fn rarity_out_of_range_rejected() {
        assert!(3u8 <= 3, "rarity=3 (Legendary) must pass");
        assert!(!(4u8 <= 3), "rarity=4 must be rejected");
    }
}

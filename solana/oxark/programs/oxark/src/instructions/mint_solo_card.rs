#![cfg(feature = "mint")]
use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token::{self, Mint, MintTo, Token, TokenAccount},
};

pub const SOLO_CARD_SEED: &[u8] = b"solo_card";

/// Mint a card NFT as solo proof-of-collection (no game completion required).
/// Any wallet can mint any card_id (1-60) exactly once.
/// Seeds: ["solo_card", player_pubkey, &[card_id]]
///
/// Mint authority is set to the player so that the client can atomically:
///   1. Call this instruction (create mint + ATA + mint 1 token)
///   2. Create Metaplex Token Metadata via CPI in the same transaction
///   3. Burn the mint authority (SPL Token set_authority → None)
/// All three steps are sent as a single atomic transaction from onchain.js.
#[derive(Accounts)]
#[instruction(card_id: u8)]
pub struct MintSoloCard<'info> {
    #[account(
        init,
        payer = player,
        mint::decimals = 0,
        mint::authority = player,   // player holds authority so client can add Metaplex CPI
        seeds = [SOLO_CARD_SEED, player.key().as_ref(), &[card_id]],
        bump,
    )]
    pub card_mint: Account<'info, Mint>,

    #[account(
        init,
        payer = player,
        associated_token::mint = card_mint,
        associated_token::authority = player,
    )]
    pub player_token_account: Account<'info, TokenAccount>,

    #[account(mut)]
    pub player: Signer<'info>,

    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

pub fn handle_mint_solo_card(ctx: Context<MintSoloCard>, card_id: u8) -> Result<()> {
    require!(card_id >= 1 && card_id <= 60, crate::error::ErrorCode::InvalidAction);

    // player is the mint authority — no PDA signer seeds needed
    token::mint_to(
        CpiContext::new(
            ctx.accounts.token_program.key(),
            MintTo {
                mint: ctx.accounts.card_mint.to_account_info(),
                to: ctx.accounts.player_token_account.to_account_info(),
                authority: ctx.accounts.player.to_account_info(),
            },
        ),
        1,
    )?;

    // Authority burn + Metaplex metadata creation are handled client-side
    // in the same atomic transaction (see mintCardWithMetadata in onchain.js).

    emit!(SoloCardMinted {
        player: ctx.accounts.player.key(),
        card_id,
        mint: ctx.accounts.card_mint.key(),
    });

    msg!("0xARK card minted: id={} mint={} owner={}", card_id, ctx.accounts.card_mint.key(), ctx.accounts.player.key());
    Ok(())
}

#[event]
pub struct SoloCardMinted {
    pub player: Pubkey,
    pub card_id: u8,
    pub mint: Pubkey,
}

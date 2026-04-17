use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token::{self, Mint, MintTo, SetAuthority, Token, TokenAccount},
};

pub const SOLO_CARD_SEED: &[u8] = b"solo_card";

/// Mint a card NFT as solo proof-of-collection (no game completion required).
/// Any wallet can mint any card_id (1-60) exactly once.
/// Seeds: ["solo_card", player_pubkey, &[card_id]]
#[derive(Accounts)]
#[instruction(card_id: u8)]
pub struct MintSoloCard<'info> {
    #[account(
        init,
        payer = player,
        mint::decimals = 0,
        mint::authority = card_mint,
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

    let card_id_bytes = [card_id];
    let player_key = ctx.accounts.player.key();
    let player_bytes = player_key.as_ref();
    let bump = ctx.bumps.card_mint;
    let signer_seeds: &[&[&[u8]]] = &[&[
        SOLO_CARD_SEED,
        player_bytes,
        &card_id_bytes,
        &[bump],
    ]];

    // Mint exactly 1 token
    token::mint_to(
        CpiContext::new_with_signer(
            ctx.accounts.token_program.key(),
            MintTo {
                mint: ctx.accounts.card_mint.to_account_info(),
                to: ctx.accounts.player_token_account.to_account_info(),
                authority: ctx.accounts.card_mint.to_account_info(),
            },
            signer_seeds,
        ),
        1,
    )?;

    // Burn mint authority — makes this provably a 1-of-1 NFT
    token::set_authority(
        CpiContext::new_with_signer(
            ctx.accounts.token_program.key(),
            SetAuthority {
                current_authority: ctx.accounts.card_mint.to_account_info(),
                account_or_mint: ctx.accounts.card_mint.to_account_info(),
            },
            signer_seeds,
        ),
        anchor_spl::token::spl_token::instruction::AuthorityType::MintTokens,
        None,
    )?;

    emit!(SoloCardMinted {
        player: ctx.accounts.player.key(),
        card_id,
        mint: ctx.accounts.card_mint.key(),
    });

    msg!("0xARK solo card minted: card={} mint={} owner={}", card_id, ctx.accounts.card_mint.key(), ctx.accounts.player.key());
    Ok(())
}

#[event]
pub struct SoloCardMinted {
    pub player: Pubkey,
    pub card_id: u8,
    pub mint: Pubkey,
}

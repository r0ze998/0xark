use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token::{self, Mint, MintTo, SetAuthority, Token, TokenAccount},
};
use crate::constants::*;
use crate::state::*;
use crate::error::ErrorCode;

/// Seed for deterministic card mint PDAs: ["card_mint", game_id_le8, card_id]
pub const CARD_MINT_SEED: &[u8] = b"card_mint";

/// Mint a card as an SPL NFT (supply=1, decimals=0, frozen authority).
/// Only the game winner can call this. Creates one unique token per card_id per game.
///
/// Client must derive the PDA and ATA before sending this instruction.
#[derive(Accounts)]
#[instruction(game_id: u64, card_id: u8)]
pub struct MintCardNft<'info> {
    /// Verify game is finished and caller is the winner
    #[account(
        seeds = [GAME_SEED, game_id.to_le_bytes().as_ref()],
        bump = game.bump,
        constraint = game.status == GameStatus::Finished @ ErrorCode::GameFinished,
        constraint = game.winner == player.key() @ ErrorCode::NotHost,
    )]
    pub game: Account<'info, Game>,

    /// Verify player actually participated in this game
    #[account(
        seeds = [PLAYER_SEED, game_id.to_le_bytes().as_ref(), player.key().as_ref()],
        bump = player_state.bump,
    )]
    pub player_state: Account<'info, PlayerState>,

    /// Deterministic SPL Mint PDA — one per (game_id, card_id)
    #[account(
        init,
        payer = player,
        mint::decimals = 0,
        mint::authority = card_mint,  // PDA self-authority for CPI mint_to
        seeds = [CARD_MINT_SEED, game_id.to_le_bytes().as_ref(), &[card_id]],
        bump,
    )]
    pub card_mint: Account<'info, Mint>,

    /// Player's associated token account for this card mint
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

pub fn handle_mint_card_nft(
    ctx: Context<MintCardNft>,
    game_id: u64,
    card_id: u8,
) -> Result<()> {
    let game_id_bytes = game_id.to_le_bytes();
    let card_id_bytes = [card_id];
    let bump = ctx.bumps.card_mint;
    let signer_seeds: &[&[&[u8]]] = &[&[
        CARD_MINT_SEED,
        &game_id_bytes,
        &card_id_bytes,
        &[bump],
    ]];

    // 1. Mint exactly 1 token to the player's ATA (PDA signs as mint authority)
    token::mint_to(
        CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            MintTo {
                mint: ctx.accounts.card_mint.to_account_info(),
                to: ctx.accounts.player_token_account.to_account_info(),
                authority: ctx.accounts.card_mint.to_account_info(),
            },
            signer_seeds,
        ),
        1,
    )?;

    // 2. Remove mint authority (freeze — no more can ever be minted)
    token::set_authority(
        CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            SetAuthority {
                current_authority: ctx.accounts.card_mint.to_account_info(),
                account_or_mint: ctx.accounts.card_mint.to_account_info(),
            },
            signer_seeds,
        ),
        anchor_spl::token::spl_token::instruction::AuthorityType::MintTokens,
        None, // remove mint authority permanently
    )?;

    emit!(CardNftMinted {
        game_id,
        player: ctx.accounts.player.key(),
        card_id,
    });

    msg!(
        "0xARK NFT minted: game={} card={} mint={} player={}",
        game_id,
        card_id,
        ctx.accounts.card_mint.key(),
        ctx.accounts.player.key()
    );

    Ok(())
}

#[event]
pub struct CardNftMinted {
    pub game_id: u64,
    pub player: Pubkey,
    pub card_id: u8,
}

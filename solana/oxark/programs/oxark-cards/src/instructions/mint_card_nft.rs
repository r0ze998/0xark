use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token::{self, Mint, MintTo, SetAuthority, Token, TokenAccount},
};
use crate::state::{Game, GameStatus, PlayerState};
use crate::errors::CardsError;

/// Program ID of the main oxark game program — used to verify account ownership.
pub const OXARK_PROGRAM_ID: &str = "5i37jWBiA7bV9XmokyDWHQxjJ5s1sBnSEkPSB4J2XfmN";

pub const CARD_MINT_SEED: &[u8] = b"card_mint";

/// Mint a card as a Token-2022 NFT (supply=1, decimals=0, mint authority removed post-mint).
/// Only callable by the game winner after game completes.
/// Reads Game and PlayerState accounts owned by the main oxark program.
#[derive(Accounts)]
#[instruction(game_id: u64, card_id: u8)]
pub struct MintCardNft<'info> {
    /// Game account owned by the main oxark program — verified via seeds + constraint.
    /// seeds::program points to the oxark program ID to validate PDA derivation.
    #[account(
        seeds = [b"game", game_id.to_le_bytes().as_ref()],
        bump = game.bump,
        seeds::program = crate::OXARK_PROGRAM,
        constraint = game.status == GameStatus::Finished @ CardsError::GameNotFinished,
        constraint = game.winner == player.key() @ CardsError::NotWinner,
    )]
    pub game: Account<'info, Game>,

    /// PlayerState account owned by the main oxark program
    #[account(
        seeds = [b"player", game_id.to_le_bytes().as_ref(), player.key().as_ref()],
        bump = player_state.bump,
        seeds::program = crate::OXARK_PROGRAM,
    )]
    pub player_state: Account<'info, PlayerState>,

    /// Deterministic SPL Mint PDA — one per (game_id, card_id), globally unique
    #[account(
        init,
        payer = player,
        mint::decimals = 0,
        mint::authority = card_mint,
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
    require!(card_id >= 1 && card_id <= 60, CardsError::InvalidCardId);

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

    // 2. Remove mint authority permanently — provably 1-of-1 NFT
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

    emit!(CardNftMinted {
        game_id,
        player: ctx.accounts.player.key(),
        card_id,
        mint: ctx.accounts.card_mint.key(),
    });

    msg!(
        "0xARK NFT minted: game={} card={} mint={} owner={}",
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
    pub player:  Pubkey,
    pub card_id: u8,
    pub mint:    Pubkey,
}

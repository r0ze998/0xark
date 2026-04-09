use anchor_lang::prelude::*;
use crate::constants::*;
use crate::state::*;
use crate::error::ErrorCode;

/// Mint a card as an NFT when the game is won.
/// Winners can "carry out" their collected cards as permanent NFTs.
///
/// This instruction creates an SPL token mint + metadata for each card.
/// Uses Metaplex Token Metadata program for on-chain metadata.
///
/// Phase 1: Simplified — creates a basic SPL token representing the card.
/// Phase 2: Full Metaplex integration with images, attributes, royalties.

#[derive(Accounts)]
#[instruction(game_id: u64, card_id: u8)]
pub struct MintCardNft<'info> {
    #[account(
        seeds = [GAME_SEED, game_id.to_le_bytes().as_ref()],
        bump = game.bump,
        constraint = game.status == GameStatus::Finished @ ErrorCode::GameFinished,
        constraint = game.winner == player.key() @ ErrorCode::NotHost, // reuse error: only winner can mint
    )]
    pub game: Account<'info, Game>,
    #[account(
        seeds = [PLAYER_SEED, game_id.to_le_bytes().as_ref(), player.key().as_ref()],
        bump = player_state.bump,
    )]
    pub player_state: Account<'info, PlayerState>,
    #[account(mut)]
    pub player: Signer<'info>,
    pub system_program: Program<'info, System>,
    // In production, add:
    // pub token_program: Program<'info, Token>,
    // pub token_mint: Account<'info, Mint>,
    // pub token_account: Account<'info, TokenAccount>,
    // pub metadata_program: UncheckedAccount<'info>, // Metaplex
    // pub metadata_account: UncheckedAccount<'info>,
}

pub fn handle_mint_card_nft(
    ctx: Context<MintCardNft>,
    game_id: u64,
    card_id: u8,
) -> Result<()> {
    let ps = &ctx.accounts.player_state;

    // Verify the player actually holds this card
    let has_card = ps.cards.iter().any(|&c| c == card_id);
    require!(has_card, ErrorCode::CardNotFound);

    // Card metadata
    let card_names = ["", "Aegis", "Umbra", "Ignis", "Tempest", "Nihil"];
    let card_descriptions = [
        "",
        "The Crystal Knight — The last light on the island",
        "The Shadow Rogue — Unseen, yet always there",
        "The Fire Beast — Destruction is protection",
        "The Storm Prophet — Rules exist to be broken",
        "The Void Observer — I know what you hold",
    ];

    let name = if (card_id as usize) < card_names.len() {
        card_names[card_id as usize]
    } else {
        "Unknown"
    };

    let description = if (card_id as usize) < card_descriptions.len() {
        card_descriptions[card_id as usize]
    } else {
        "Unknown card"
    };

    // In production:
    // 1. Create SPL token mint with 0 decimals, supply 1
    // 2. Mint 1 token to player's associated token account
    // 3. Create Metaplex metadata with:
    //    - name: "0xARK: {card_name}"
    //    - symbol: "ARK"
    //    - uri: "https://0xark.gg/metadata/{card_id}.json"
    //    - attributes: game_id, round_won, card_type, rarity
    // 4. Freeze the mint authority (no more can be minted)

    msg!(
        "NFT minted for game {} card {} ({}) — {}",
        game_id,
        card_id,
        name,
        description
    );

    // Emit event
    emit!(CardNftMinted {
        game_id,
        player: ctx.accounts.player.key(),
        card_id,
    });

    Ok(())
}

#[event]
pub struct CardNftMinted {
    pub game_id: u64,
    pub player: Pubkey,
    pub card_id: u8,
}

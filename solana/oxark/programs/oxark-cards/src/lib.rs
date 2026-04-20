use anchor_lang::prelude::*;

pub mod errors;
pub mod instructions;
pub mod state;

use instructions::mint_card_nft::*;
use instructions::mint_solo_card::*;

declare_id!("236FNPRbJr5W7qeV9fJCYsxDEkruSK6fnNAipf47Mq1S");

/// Main oxark game program — account ownership anchor for cross-program reads.
pub const OXARK_PROGRAM: Pubkey = pubkey!("5i37jWBiA7bV9XmokyDWHQxjJ5s1sBnSEkPSB4J2XfmN");

#[program]
pub mod oxark_cards {
    use super::*;

    /// Mint a card NFT for the game winner. Reads game state from the main oxark program.
    /// Each (game_id, card_id) pair produces a unique PDA mint — no duplicates possible.
    /// Mint authority is burned after minting exactly 1 token (provably 1-of-1).
    pub fn mint_card_nft(ctx: Context<MintCardNft>, game_id: u64, card_id: u8) -> Result<()> {
        instructions::mint_card_nft::handle_mint_card_nft(ctx, game_id, card_id)
    }

    /// Mint a card NFT as solo proof-of-collection (no game required).
    /// Seeds: ["solo_card", player, card_id] — one per wallet per card_id.
    /// Authority burn + Metaplex metadata creation handled client-side in same tx.
    pub fn mint_solo_card(ctx: Context<MintSoloCard>, card_id: u8) -> Result<()> {
        instructions::mint_solo_card::handle_mint_solo_card(ctx, card_id)
    }
}

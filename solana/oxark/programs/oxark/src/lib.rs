pub mod constants;
pub mod error;
pub mod instructions;
pub mod state;

use anchor_lang::prelude::*;

pub use error::ErrorCode;
pub use instructions::*;
pub use state::*;

declare_id!("3QEaocNMYiAMSqxXhnyBSzpcn3kjnzumrfGS67Gbbwum");

#[program]
pub mod oxark {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        instructions::initialize::handle_initialize(ctx)
    }

    pub fn create_game(ctx: Context<CreateGame>, game_id: u64, max_players: u8) -> Result<()> {
        instructions::create_game::handle_create_game(ctx, game_id, max_players)
    }

    pub fn join_game(ctx: Context<JoinGame>, game_id: u64) -> Result<()> {
        instructions::join_game::handle_join_game(ctx, game_id)
    }

    pub fn start_game(ctx: Context<StartGame>, game_id: u64) -> Result<()> {
        instructions::start_game::handle_start_game(ctx, game_id)
    }

    pub fn commit_action(ctx: Context<CommitActionCtx>, game_id: u64, hash: [u8; 32]) -> Result<()> {
        instructions::commit_action::handle_commit(ctx, game_id, hash)
    }

    pub fn reveal_action(
        ctx: Context<RevealActionCtx>,
        game_id: u64,
        action_type: u8,
        target: Pubkey,
        salt: [u8; 32],
    ) -> Result<()> {
        instructions::reveal_action::handle_reveal(ctx, game_id, action_type, target, salt)
    }

    pub fn resolve_round(ctx: Context<ResolveRound>, game_id: u64) -> Result<()> {
        instructions::resolve_round::handle_resolve(ctx, game_id)
    }

    pub fn verify_zk_proof(
        ctx: Context<VerifyZkProof>,
        game_id: u64,
        proof_a: [u8; 64],
        proof_b: [u8; 128],
        proof_c: [u8; 64],
        public_inputs: [u8; 32],
    ) -> Result<()> {
        instructions::verify_zk_proof::handle_verify_zk(ctx, game_id, proof_a, proof_b, proof_c, public_inputs)
    }

    pub fn mint_card_nft(ctx: Context<MintCardNft>, game_id: u64, card_id: u8) -> Result<()> {
        instructions::mint_card_nft::handle_mint_card_nft(ctx, game_id, card_id)
    }
}

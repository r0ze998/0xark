pub mod constants;
pub mod error;
pub mod instructions;
pub mod state;

use anchor_lang::prelude::*;

pub use error::ErrorCode;
pub use instructions::*;
pub use state::*;

declare_id!("2gMYzenV6HQoTJA2899XxnLgzTbaWdVmegLqL7nMpVS3");

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

    // NOTE: verify_zk_proof, mint_card_nft, stake_entry, season, agent_registry removed for devnet deploy size.
    // ZK verification demonstrated via off-chain circom circuit. Re-added for mainnet.
    // These will be re-added post-hackathon when mainnet budget allows larger program.
}

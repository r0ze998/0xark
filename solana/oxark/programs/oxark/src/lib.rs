//! # 0xARK — On-Chain ZK Card PvP
//!
//! A Solana program for decentralized card-battle PvP with hidden information.
//!
//! ## Architecture
//!
//! The program implements a **commit-reveal** protocol to hide player actions
//! until both parties have committed, preventing frontrunning and copy-cat play:
//!
//! ```text
//! Lobby → CommitPhase → RevealPhase → [verify_zk_proof] → resolve_round → (repeat)
//!                                                                        → Finished
//! ```
//!
//! ### PDA Scheme
//!
//! | Account        | Seeds                                            |
//! |----------------|--------------------------------------------------|
//! | `game`         | `["game", game_id_le]`                           |
//! | `card_pool`    | `["card_pool", game_id_le]`                      |
//! | `player_state` | `["player", game_id_le, player_pubkey]`          |
//! | `commit`       | `["commit", game_id_le, round_u8, player_pubkey]`|
//! | `stake_vault`  | `["stake_vault", game_id_le]`                    |
//!
//! Including `round` in the commit seed prevents replay attacks — a commit
//! from round N cannot be reused in round M (the PDA address would differ).
//!
//! ### Security Properties
//!
//! - **Reentrancy**: checks-effects-interactions pattern; all CPIs execute last.
//! - **Overflow**: `overflow-checks = true` in release profile.
//! - **Commit binding**: SHA-256(action | target | salt) prevents action-switching.
//! - **ZK binding**: Groth16 public inputs include the commitment hash.
//! - **No admin key**: program has no upgrade authority on devnet deploy.
//!
//! Program ID: `2gMYzenV6HQoTJA2899XxnLgzTbaWdVmegLqL7nMpVS3`

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

    /// One-time program initializer (idempotent; can be skipped in production).
    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        instructions::initialize::handle_initialize(ctx)
    }

    /// Create a new game session.
    ///
    /// - Allocates `game` PDA and `card_pool` PDA.
    /// - Sets `status = Lobby`, `round = 0`.
    /// - `max_players` must be 2–4.
    ///
    /// Caller becomes the host; only the host may call `start_game`.
    pub fn create_game(ctx: Context<CreateGame>, game_id: u64, max_players: u8) -> Result<()> {
        instructions::create_game::handle_create_game(ctx, game_id, max_players)
    }

    /// Join an open game session.
    ///
    /// - Allocates a `player_state` PDA for the signer.
    /// - Fails if `game.status != Lobby` or `game.player_count == game.max_players`.
    /// - Initializes starting hand: 1 random card drawn from the pool.
    pub fn join_game(ctx: Context<JoinGame>, game_id: u64) -> Result<()> {
        instructions::join_game::handle_join_game(ctx, game_id)
    }

    /// Start the game and deal opening hands.
    ///
    /// - Restricted to the game host.
    /// - Transitions `status: Lobby → CommitPhase`.
    /// - Shuffles `card_pool` using recent slot hash as PRNG seed.
    /// - Deals 3 cards to each player; remaining cards stay in pool.
    pub fn start_game(ctx: Context<StartGame>, game_id: u64) -> Result<()> {
        instructions::start_game::handle_start_game(ctx, game_id)
    }

    /// Commit a hidden action for the current round.
    ///
    /// `hash = SHA-256(action_type_u8 | target_pubkey_32 | salt_32)`
    ///
    /// The hash is stored in a per-round `commit` PDA. When all players commit,
    /// the game transitions to `RevealPhase` automatically.
    ///
    /// A player cannot change their committed action — the hash binds them.
    pub fn commit_action(ctx: Context<CommitActionCtx>, game_id: u64, hash: [u8; 32]) -> Result<()> {
        instructions::commit_action::handle_commit(ctx, game_id, hash)
    }

    /// Reveal the previously committed action.
    ///
    /// Re-derives `SHA-256(action_type | target | salt)` on-chain and asserts it
    /// matches the stored `commit.hash`. Rejects any mismatch (`ErrorCode::HashMismatch`).
    ///
    /// After all players reveal, the program waits for `resolve_round` (or optionally
    /// `verify_zk_proof` for ZK-attested reveals).
    pub fn reveal_action(
        ctx: Context<RevealActionCtx>,
        game_id: u64,
        action_type: u8,
        target: Pubkey,
        salt: [u8; 32],
    ) -> Result<()> {
        instructions::reveal_action::handle_reveal(ctx, game_id, action_type, target, salt)
    }

    /// Resolve the current round after all players have revealed.
    ///
    /// Resolution order (simultaneous semantics, caller-triggered):
    /// 1. BARRIER — players raising barriers are flagged.
    /// 2. STEAL — transfers a random card from victim to stealer; blocked if victim has BARRIER.
    /// 3. DRAW — gives caller the top card from the shared pool for their area.
    /// 4. SCOUT — records target's revealed action for client-side intel display.
    /// 5. MOVE — updates `player_state.area`.
    /// 6. USE_CARD — applies card effect; removes card from hand.
    ///
    /// Emits `RoundResolved` event. Transitions back to `CommitPhase` for next round,
    /// or to `Finished` if win condition met (player holds all 5 unique card types).
    pub fn resolve_round(ctx: Context<ResolveRound>, game_id: u64) -> Result<()> {
        instructions::resolve_round::handle_resolve(ctx, game_id)
    }

    /// Verify a Groth16 ZK proof for a committed action.
    ///
    /// The proof attests that `Poseidon(action, target, salt) == commitment_hash`
    /// without revealing `action`, `target`, or `salt` on-chain.
    ///
    /// - Circuit: `zk/circuits/commit_reveal.circom` (277 constraints, BN254 curve)
    /// - Proving key: `zk/build/commit_reveal_final.zkey`
    /// - Verification key: `zk/build/verification_key.json`
    ///
    /// This instruction is optional — standard `reveal_action` provides the same
    /// correctness guarantee. ZK proof adds an additional privacy layer when the
    /// client wishes to hide action metadata from on-chain observers.
    ///
    /// Approximate CU cost: 80,000–200,000 (BN254 pairing). Budget 300,000.
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

    /// Mint a card as a 1-of-1 NFT on Solana.
    ///
    /// - Restricted to players who have collected the card in their on-chain vault.
    /// - Uses Metaplex token standard; mint authority is burned after minting.
    /// - Each `(game_id, card_id)` pair maps to a unique mint PDA.
    ///
    /// Approximate CU cost: ~25,000 (SPL Token + Metaplex CPI).
    pub fn mint_card_nft(ctx: Context<MintCardNft>, game_id: u64, card_id: u8) -> Result<()> {
        instructions::mint_card_nft::handle_mint_card_nft(ctx, game_id, card_id)
    }

    /// Deposit entry stake (0.5 SOL) into the game's prize vault PDA.
    ///
    /// - Callable by any participant before or during the game.
    /// - Funds are held in `stake_vault` PDA owned by the program.
    /// - No EOA can withdraw directly — only `claim_prize` can release funds.
    ///
    /// Approximate CU cost: ~3,500 (SystemProgram::transfer CPI).
    pub fn deposit_stake(ctx: Context<DepositStake>, game_id: u64) -> Result<()> {
        instructions::stake_entry::handle_deposit_stake(ctx, game_id)
    }

    /// Claim the full prize pool after winning a game.
    ///
    /// - Verifies `game.status == Finished` and `game.winner == signer`.
    /// - Transfers entire `stake_vault` balance to the winner.
    /// - Uses PDA signer (no admin key required).
    pub fn claim_prize(ctx: Context<ClaimPrize>, game_id: u64) -> Result<()> {
        instructions::stake_entry::handle_claim_prize(ctx, game_id)
    }

    /// Create a competitive season with a shared entry fee and prize pool.
    ///
    /// Seasons run for `duration_seconds` wall-clock time. Players pay `entry_fee`
    /// lamports to register; the accumulated pool is distributed at `end_season`.
    pub fn create_season(
        ctx: Context<CreateSeason>,
        season_id: u32,
        entry_fee: u64,
        max_players: u32,
        duration_seconds: i64,
    ) -> Result<()> {
        instructions::season::handle_create_season(ctx, season_id, entry_fee, max_players, duration_seconds)
    }

    /// End a season, compute leaderboard, and emit results.
    ///
    /// Emits final standings so clients can display the leaderboard.
    /// Prize distribution logic is handled off-chain based on emitted events.
    pub fn end_season(ctx: Context<EndSeason>, season_id: u32) -> Result<()> {
        instructions::season::handle_end_season(ctx, season_id)
    }

    /// Register an AI agent in the on-chain agent marketplace.
    ///
    /// Agents are identified by a `name_hash` (SHA-256 of human-readable name).
    /// `strategy_hash` and `endpoint_hash` let clients discover agent capabilities
    /// without revealing the agent's internal logic or private endpoint URL.
    ///
    /// `price_per_query` is in lamports — paid via x402 micropayment protocol.
    pub fn register_agent(
        ctx: Context<RegisterAgent>,
        agent_id: u32,
        name_hash: [u8; 32],
        strategy_hash: [u8; 32],
        endpoint_hash: [u8; 32],
        price_per_query: u64,
    ) -> Result<()> {
        instructions::agent_registry::handle_register_agent(
            ctx, agent_id, name_hash, strategy_hash, endpoint_hash, price_per_query,
        )
    }

    /// Deactivate an AI agent listing (soft-delete; agent data is preserved).
    ///
    /// Only the agent's original registrant may deactivate. Deactivated agents
    /// are hidden from discovery but remain on-chain for audit purposes.
    pub fn deactivate_agent(ctx: Context<DeactivateAgent>, agent_id: u32) -> Result<()> {
        instructions::agent_registry::handle_deactivate_agent(ctx, agent_id)
    }

    /// Mint a card as proof-of-collection without requiring game completion.
    /// Any player wallet can mint any card_id (1-60) exactly once per wallet.
    /// Seeds: ["solo_card", player_pubkey, &[card_id]]
    pub fn mint_solo_card(ctx: Context<MintSoloCard>, card_id: u8) -> Result<()> {
        instructions::mint_solo_card::handle_mint_solo_card(ctx, card_id)
    }
}

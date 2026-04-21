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
//! Program ID: `5i37jWBiA7bV9XmokyDWHQxjJ5s1sBnSEkPSB4J2XfmN` (devnet, Phase C fresh deploy)

pub mod constants;
pub mod error;
pub mod instructions;
pub mod state;

use anchor_lang::prelude::*;

pub use error::ErrorCode;
pub use instructions::*;
pub use state::*;

declare_id!("5i37jWBiA7bV9XmokyDWHQxjJ5s1sBnSEkPSB4J2XfmN");

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

    /// Delegate game + player_state accounts to the MagicBlock Ephemeral Rollup.
    ///
    /// Must be called on base layer before routing transactions via the Magic Router.
    /// After delegation, `commit_action` and `reveal_action` should be sent to the
    /// ER validator (via Magic Router) for 10-50ms latency instead of ~400ms.
    ///
    /// Calls the MagicBlock Delegation Program CPI for both `game` and `player_state` PDAs.
    pub fn delegate_session(ctx: Context<DelegateSession>, game_id: u64) -> Result<()> {
        instructions::delegate_session::handle_delegate_session(ctx, game_id)
    }

    /// Schedule commit + undelegate for game + player_state via the Magic Program.
    ///
    /// Must be sent to the ER validator (not base layer). The ER processes this,
    /// commits all pending state diffs to base layer, then calls the Delegation
    /// Program's Undelegate instruction to restore account ownership to this program.
    pub fn undelegate_session(ctx: Context<UndelegateSession>, game_id: u64) -> Result<()> {
        instructions::undelegate_session::handle_undelegate_session(ctx, game_id)
    }

    /// Set a player's initial dungeon position commitment.
    /// Called once after join_game.  commitment = Poseidon(x, y, area, salt).
    pub fn init_position(
        ctx: Context<InitPosition>,
        game_id: u64,
        commitment: [u8; 32],
    ) -> Result<()> {
        instructions::init_position::handle_init_position(ctx, game_id, commitment)
    }

    /// Register an on-chain AgentHireSession after x402 payment verification.
    ///
    /// The hirer calls this after the x402 facilitator confirms the 0.05 SOL
    /// payment. `payment_tx` links the session to the Solana payment tx for
    /// audit purposes. The AgentListing must be active.
    ///
    /// PDA seeds: `["agent_hire", hirer_pubkey, agent_id_le_bytes]`
    pub fn register_agent_hire(
        ctx: Context<RegisterAgentHire>,
        agent_id: u32,
        duration_seconds: i64,
        payment_tx_lo: [u8; 32],
        payment_tx_hi: [u8; 32],
    ) -> Result<()> {
        instructions::agent_hire::handle_register_agent_hire(ctx, agent_id, duration_seconds, payment_tx_lo, payment_tx_hi)
    }

    /// Verify a Groth16 ZK proof that the player made a valid dungeon move.
    ///
    /// Circuit: dungeon_position.circom (625 constraints, BN254 / Groth16)
    /// Public inputs (64 bytes): old_commitment[0..32] || new_commitment[32..64]
    /// Proof generation: snarkjs in browser WASM (<1s for 625 constraints)
    pub fn verify_dungeon_move(
        ctx: Context<VerifyDungeonMove>,
        game_id: u64,
        proof_a: [u8; 64],
        proof_b: [u8; 128],
        proof_c: [u8; 64],
        public_inputs: [u8; 64],
    ) -> Result<()> {
        instructions::verify_dungeon_move::handle_verify_dungeon_move(
            ctx, game_id, proof_a, proof_b, proof_c, public_inputs,
        )
    }

    // ── Deck system (軸 A) ────────────────────────────────────────────────────

    /// Save or update the player's prepared battle deck.
    ///
    /// PDA seeds: `["player_deck", player_pubkey]` (init_if_needed)
    ///
    /// Validates composition before storing:
    ///   - card IDs 1-60 only; 0 = empty (rejected)
    ///   - total cost ≤ 30  (Common=1, Rare=2, Legendary=5)
    ///   - Legendary cards ≤ 2
    ///   - Rare cards ≤ 6
    ///   - Common cards ≥ 12
    ///   - deck must be unlocked (locked_until == 0 OR now ≥ locked_until)
    pub fn save_deck(ctx: Context<SaveDeck>, cards: Vec<u8>) -> Result<()> {
        instructions::save_deck::handle_save_deck(ctx, cards)
    }

    /// Lock the player's deck for 1 hour (3600 seconds).
    ///
    /// A locked deck cannot be modified until the timer expires.
    /// The client requires `locked_until > now` before allowing dungeon entry.
    /// Re-locking refreshes the timer from *now* (not from the old expiry).
    pub fn lock_deck(ctx: Context<LockDeck>) -> Result<()> {
        instructions::lock_deck::handle_lock_deck(ctx)
    }

    // ── ZK Card Commit (軸 C) ──────────────────────────────────────────────────

    /// Submit a ZK card commitment for the 2-phase bluff battle.
    ///
    /// The player computes `commitment = SHA256(card_id | salt)` in the browser
    /// and sends it before seeing the opponent's choice. Both players commit
    /// before either reveals — preventing last-mover advantage.
    ///
    /// PDA seeds: `["card_commit", player_pubkey, game_id_le, round_u8]`
    pub fn commit_card(
        ctx: Context<CommitCard>,
        game_id: u64,
        commitment: [u8; 32],
    ) -> Result<()> {
        instructions::commit_card::handle_commit_card(ctx, game_id, commitment)
    }

    /// Initialize or reset season card supply for N participants.
    /// PDA: ["season_supply", season_id_le]
    pub fn init_season_supply(
        ctx: Context<InitSeasonSupply>,
        season_id: u32,
        participant_count: u32,
    ) -> Result<()> {
        instructions::season_supply::handle_init_season_supply(ctx, season_id, participant_count)
    }

    /// Record a card mint against the season supply, with tier fallback.
    /// Returns the tier actually used (may be lower than requested if exhausted).
    pub fn record_mint(
        ctx: Context<RecordMint>,
        season_id: u32,
        requested_tier: u8,
    ) -> Result<()> {
        instructions::season_supply::handle_record_mint(ctx, season_id, requested_tier)?;
        Ok(())
    }

    /// Register a card species in the player's permanent registry (GI rule).
    ///
    /// First time a player acquires card species X → registered[X] = true (permanent).
    /// Subsequent copies → does not change registry (card is battle-consumable extra).
    /// When count reaches 60 → season_complete = true.
    ///
    /// PDA seeds: `["player_registry", player_pubkey]` (init_if_needed)
    pub fn register_card(ctx: Context<RegisterCardCtx>, card_id: u8) -> Result<()> {
        instructions::register_card::handle_register_card(ctx, card_id)
    }

    /// Reveal the previously committed card.
    ///
    /// On-chain verifies `SHA256(card_id | salt) == stored_commitment`.
    /// After both players reveal, `resolve_round` fires with element multipliers.
    ///
    /// Full Groth16/Poseidon ZK verification targets Mainnet v1 —
    /// the circuit `card_commit.circom` is ready; MVP uses SHA-256.
    pub fn reveal_card(
        ctx: Context<RevealCard>,
        game_id: u64,
        card_id: u8,
        salt: [u8; 32],
    ) -> Result<()> {
        instructions::reveal_card::handle_reveal_card(ctx, game_id, card_id, salt)
    }

    // ── T110: Combo System ────────────────────────────────────────────────────

    /// Record a card battle outcome for combo tracking.
    ///
    /// `is_super_effective = true` increments the combo streak.
    /// Hitting 3/5/7 unlocks combo tiers (PERFECT/LEGENDARY/UNSTOPPABLE).
    /// At 7+ the xp_2x_flag is set for the next add_xp call.
    ///
    /// PDA seeds: `["player_battle_stats", player_pubkey]` (init_if_needed)
    pub fn record_battle_result(ctx: Context<RecordBattleResult>, is_super_effective: bool) -> Result<()> {
        instructions::record_battle_result::handle_record_battle_result(ctx, is_super_effective)
    }

    // ── T98: XP + Level System ────────────────────────────────────────────────

    /// Add XP to a player's progression account.
    ///
    /// `reason` codes: 1=battle_win(50), 2=battle_loss(15), 3=card_collect(10),
    ///   4=super_effective(20), 5=zk_cycle(30), 6=deathrattle(15), 7=chain(15)
    ///
    /// Level is recomputed from total XP using xpForLevel(n) = floor((n-1)*n*55).
    /// PDA seeds: `["player_level", player_pubkey]` (init_if_needed)
    pub fn add_xp(ctx: Context<AddXp>, reason: u8) -> Result<()> {
        instructions::add_xp::handle_add_xp(ctx, reason)
    }

    // ── T99: Achievement System ───────────────────────────────────────────────

    /// Unlock an achievement for the calling player.
    ///
    /// Achievement indices 0-9:
    ///   0=first_blood, 1=collector_10, 2=collector_30, 3=full_set,
    ///   4=chain_master, 5=dr_survived, 6=zk_committed, 7=super_x5,
    ///   8=dungeon_floor5, 9=season_top
    ///
    /// Already-unlocked achievements are a no-op (idempotent).
    /// PDA seeds: `["player_achievements", player_pubkey]` (init_if_needed)
    pub fn unlock_achievement(ctx: Context<UnlockAchievement>, idx: u8) -> Result<()> {
        instructions::unlock_achievement::handle_unlock_achievement(ctx, idx)
    }

    // ── T100: Title System ────────────────────────────────────────────────────

    /// Unlock a title badge for the calling player.
    ///
    /// Title indices 0-7:
    ///   0=Traveler (always on), 1=Card Hunter, 2=Chain Wizard,
    ///   3=Dread Pirate, 4=ZK Mystic, 5=Half-Deck, 6=The Collector, 7=Champion
    ///
    /// PDA seeds: `["player_title", player_pubkey]` (init_if_needed)
    pub fn unlock_title(ctx: Context<UnlockTitle>, title_idx: u8) -> Result<()> {
        instructions::set_title::handle_unlock_title(ctx, title_idx)
    }

    /// Equip a previously unlocked title.
    ///
    /// Fails with InvalidAction if the title is not yet unlocked.
    /// PDA seeds: `["player_title", player_pubkey]` (init_if_needed)
    pub fn set_title(ctx: Context<SetTitle>, title_idx: u8) -> Result<()> {
        instructions::set_title::handle_set_title(ctx, title_idx)
    }
}

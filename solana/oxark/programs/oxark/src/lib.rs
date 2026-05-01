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
pub mod poseidon_t16_constants;  // T-D13-A0: auto-generated circomlib t=16 constants
pub mod poseidon_helper;         // T-D13-A0: on-chain Poseidon(15) for reveal_hand

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
    /// `hash = SHA-256(card_ids_le_bytes || salt || round || phase)` (Reborn)
    ///       or SHA-256(action_type | target | salt) (Phase C legacy).
    ///
    /// Reborn Day 8: `phase` and `played_cards` are now explicit params.
    ///   phase: 0=Draw, 1=Energy, 2=Summon, 3=Battle
    ///   played_cards: card IDs committed this phase (up to 3; empty for legacy)
    pub fn commit_action(
        ctx: Context<CommitActionCtx>,
        game_id: u64,
        hash: [u8; 32],
        phase: u8,
        played_cards: Vec<u64>,
    ) -> Result<()> {
        instructions::commit_action::handle_commit(ctx, game_id, hash, phase, played_cards)
    }

    /// Reveal the previously committed action and verify hash.
    ///
    /// Reborn path (played_cards non-empty):
    ///   SHA-256(card_ids_le_bytes || salt || round || phase)
    ///   Verified played_cards written into CommitAction for lane resolution.
    ///
    /// Legacy path (played_cards empty):
    ///   SHA-256(action_type | target | salt)
    pub fn reveal_action(
        ctx: Context<RevealActionCtx>,
        game_id: u64,
        action_type: u8,
        target: Pubkey,
        salt: [u8; 32],
        played_cards: Vec<u64>,
    ) -> Result<()> {
        instructions::reveal_action::handle_reveal(ctx, game_id, action_type, target, salt, played_cards)
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
    ///   GDD v1.2: exactly 20 cards, max 2 copies of any card_id.
    ///   lane_assignments: 0=Front 1=Middle 2=Back 255=Any; empty vec → all 255.
    ///   deck must be unlocked (locked_until == 0 OR now ≥ locked_until)
    pub fn save_deck(ctx: Context<SaveDeck>, cards: Vec<u8>, lane_assignments: Vec<u8>) -> Result<()> {
        instructions::save_deck::handle_save_deck(ctx, cards, lane_assignments)
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

    // ── D4 Reborn: Matchmaking Queue ──────────────────────────────────────────

    /// Enter the matchmaking queue for the given tier (0=Bronze, 1=Silver, 2=Gold).
    ///
    /// Tier gates:
    ///   Bronze (0): open
    ///   Silver (1): requires wins_at_tier[0] >= 5
    ///   Gold   (2): requires wins_at_tier[1] >= 3
    ///
    /// Emits QueueMatchReady when queue length reaches 2.
    /// PDA seeds: `["queue", tier_u8, season_le_u16]` (init_if_needed)
    pub fn enter_queue(ctx: Context<EnterQueue>, tier: u8, season: u16) -> Result<()> {
        instructions::enter_queue::handle_enter_queue(ctx, tier, season)
    }

    /// Leave the matchmaking queue for the given tier.
    ///
    /// Fails with NotInQueue if the player is not currently in the queue.
    /// PDA seeds: `["queue", tier_u8, season_le_u16]`
    pub fn leave_queue(ctx: Context<LeaveQueue>, tier: u8, season: u16) -> Result<()> {
        instructions::leave_queue::handle_leave_queue(ctx, tier, season)
    }

    // ── D11: Lore Shard System ────────────────────────────────────────────────

    /// Unlock a lore shard for a card the player owns.
    ///
    /// Shard indices:
    ///   0 = Shard 1 — auto-unlocked on card acquisition
    ///   1 = Shard 2 — unlocked by duel participation with card in deck
    ///   2 = Shard 3 — unlocked via Gold Hall win or x402 payment
    ///
    /// Method codes: 0=auto, 1=condition_met, 2=x402_payment
    ///
    /// Idempotent: calling for an already-unlocked shard is a no-op.
    /// Emits `LoreShardUnlocked` event.
    ///
    /// PDA seeds: `["card_lore_shards", card_mint, owner_pubkey]` (init_if_needed)
    pub fn unlock_lore_shard(
        ctx: Context<UnlockLoreShard>,
        card_mint: Pubkey,
        shard_index: u8,
        method: u8,
    ) -> Result<()> {
        instructions::unlock_lore_shard::handle_unlock_lore_shard(ctx, card_mint, shard_index, method)
    }

    // ── D12: ZK Duel (hand commitment / reveal) ──────────────────────────────

    pub fn init_duel(
        ctx: Context<InitDuel>,
        duel_id: Pubkey,
        hall_tier: u8,
        ante: u64,
    ) -> Result<()> {
        instructions::init_duel::handle_init_duel(ctx, duel_id, hall_tier, ante)
    }

    pub fn commit_hand(
        ctx: Context<CommitHand>,
        duel_id: Pubkey,
        round: u8,
        proof_a: [u8; 64],
        proof_b: [u8; 128],
        proof_c: [u8; 64],
        public_signals: [[u8; 32]; 4],
    ) -> Result<()> {
        instructions::commit_hand::handle_commit_hand(
            ctx, duel_id, round, proof_a, proof_b, proof_c, public_signals,
        )
    }

    pub fn reveal_hand(
        ctx: Context<RevealHand>,
        duel_id: Pubkey,
        round: u8,
        card_ids: [u64; 10],
        salt: [u8; 32],
    ) -> Result<()> {
        instructions::reveal_hand::handle_reveal_hand(
            ctx, duel_id, round, card_ids, salt,
        )
    }

    // ─── T-D13-A: CardBattleHistory ───────────────────────────────────────────

    pub fn update_card_battle_history(
        ctx: Context<UpdateCardBattleHistory>,
        card_mint: Pubkey,
        wins_delta: u32,
        losses_delta: u32,
        kos_delta: u32,
        dmg_delta: u64,
        summon_delta: u32,
    ) -> Result<()> {
        instructions::update_card_battle_history::handle_update_card_battle_history(
            ctx, card_mint, wins_delta, losses_delta, kos_delta, dmg_delta, summon_delta,
        )
    }

    pub fn record_card_owner_change(
        ctx: Context<RecordCardOwnerChange>,
        card_mint: Pubkey,
        new_owner: Pubkey,
        source: u8,
    ) -> Result<()> {
        instructions::record_card_owner_change::handle_record_card_owner_change(
            ctx, card_mint, new_owner, source,
        )
    }

    /// v3.0-plus: Record owner change with Steal semantics (Lease/Ransom/HandPeek/Legendary).
    pub fn record_card_owner_change_with_steal(
        ctx: Context<RecordCardOwnerChangeWithStats>,
        card_mint: Pubkey,
        new_owner: Pubkey,
        steal_type: StealType,
        hall_tier: u8,
        is_starter_card: bool,
        is_legendary: bool,
    ) -> Result<()> {
        instructions::record_card_owner_change::handle_record_card_owner_change_with_steal(
            ctx, card_mint, new_owner, steal_type, hall_tier, is_starter_card, is_legendary,
        )
    }

    // ── v3.0-plus: Burn / Evolve / Season Stats ───────────────────────────────

    /// v3.0-plus: Permanently burn a Common or Uncommon NFT card.
    ///
    /// Legendary (rarity=3) and Rare (rarity=2) are protected.
    /// Updates CardBattleHistory.burn_count and SeasonStats.total_burned.
    /// Seeds for season_stats PDA: ["season_stats", season_id_le].
    pub fn burn_card(
        ctx: Context<BurnCard>,
        card_mint: Pubkey,
        rarity: u8,
    ) -> Result<()> {
        instructions::burn_card::handle_burn_card(ctx, card_mint, rarity)
    }

    /// v3.0-plus: Evolve two Common parent NFTs into one Uncommon child NFT.
    ///
    /// Burns parent_a and parent_b via SPL Token CPI.
    /// Inits child CardBattleHistory with provenance (evolved_from_a/b,
    /// cumulative_wins, Evolved+EvolvedHalo imprints).
    /// Updates SeasonStats (+2 burned, +1 evolved, +1 minted).
    pub fn evolve_cards(
        ctx: Context<EvolveCards>,
        parent_a_mint: Pubkey,
        parent_b_mint: Pubkey,
        child_mint: Pubkey,
        target_species_id: u16,
        parent_a_rarity: u8,
        parent_b_rarity: u8,
        target_rarity: u8,
    ) -> Result<()> {
        instructions::evolve_cards::handle_evolve_cards(
            ctx, parent_a_mint, parent_b_mint, child_mint,
            target_species_id, parent_a_rarity, parent_b_rarity, target_rarity,
        )
    }

    /// v3.0-plus: Initialize the SeasonStats PDA for a new season.
    ///
    /// Must be called once before Burn/Evolve/Steal instructions.
    /// Seeds: ["season_stats", season_id_le]
    pub fn init_season_stats(
        ctx: Context<InitSeasonStats>,
        season_id: u32,
    ) -> Result<()> {
        instructions::init_season_stats::handle_init_season_stats(ctx, season_id)
    }

    /// v3.0-plus: Grant an Imprint to a card's battle history.
    ///
    /// Cosmetic Imprints have no cap. Stat Imprints are capped by rarity:
    ///   Common/Uncommon → 3, Rare → 4, Legendary → 5.
    pub fn grant_imprint(
        ctx: Context<GrantImprint>,
        card_mint: Pubkey,
        imprint_key_val: u8,
        is_cosmetic: bool,
        rarity: u8,
        duel_id: u64,
    ) -> Result<()> {
        instructions::update_card_battle_history::handle_grant_imprint(
            ctx, card_mint, imprint_key_val, is_cosmetic, rarity, duel_id,
        )
    }

    // ── T-D15-B: Legendary acquisition ────────────────────────────────────────

    pub fn init_legendary_supply(
        ctx: Context<InitLegendarySupply>,
        season_id: u64,
    ) -> Result<()> {
        instructions::legendary::handle_init_legendary_supply(ctx, season_id)
    }

    pub fn record_gold_hall_win(
        ctx: Context<RecordGoldHallWin>,
        season_id: u32,
    ) -> Result<()> {
        instructions::legendary::handle_record_gold_hall_win(ctx, season_id)
    }

    pub fn claim_legendary(
        ctx: Context<ClaimLegendary>,
        season_id: u64,
        species_id: u8,
    ) -> Result<()> {
        instructions::legendary::handle_claim_legendary(ctx, season_id, species_id)
    }

    pub fn distribute_prize_pool(
        ctx: Context<DistributePrizePool>,
        season_id: u32,
    ) -> Result<()> {
        instructions::legendary::handle_distribute_prize_pool(ctx, season_id)
    }

    // ── Phase 15: Season v2 ───────────────────────────────────────────────────

    /// Register on the Season 1 waitlist.
    ///
    /// Deposits 0.5 SOL (85% → prize_pool, 15% → ops_treasury).
    /// Initializes PlayerState v2 fields and distributes 5 starter cards.
    /// Callable only while `game_world.waitlist_close_timestamp > now`.
    ///
    /// PDA seeds: `["player", player_pubkey]` (init_if_needed)
    pub fn register_waitlist(ctx: Context<RegisterWaitlist>) -> Result<()> {
        instructions::register_waitlist::handle_register_waitlist(ctx)
    }

    /// Check all 6 Legendary acquisition conditions for the calling player.
    ///
    /// Called after each battle, x402 payment, or peek action.
    /// Awards up to one Legendary card per condition that becomes satisfied.
    /// O(1) per condition — uses pre-tracked counters on PlayerState.
    ///
    /// Requires game_status == 1 (active season).
    pub fn check_legendary_v2(ctx: Context<CheckLegendary>) -> Result<()> {
        instructions::check_legendary::handle_check_legendary(ctx)
    }

    /// Claim tier-based prize after season ends (game_status == 2).
    ///
    /// Distributes prize proportional to vault_count:
    ///   Tier 1 (60 cards): 50% / winner_60_count
    ///   Tier 2 (50-59):    25% × vault_count / tier2_total_vault
    ///   Tier 3 (30-49):    15% × vault_count / tier3_total_vault
    ///   Tier 4 (10-29):     8% × vault_count / tier4_total_vault
    ///   Tier 5  (1-9):      2% × vault_count / tier5_total_vault
    ///
    /// If no Tier 1 winner (timeout), player with highest vault_count gets Tier 1.
    pub fn claim_prize_v2(ctx: Context<ClaimPrizeV2>) -> Result<()> {
        instructions::claim_prize_v2::handle_claim_prize_v2(ctx)
    }
}

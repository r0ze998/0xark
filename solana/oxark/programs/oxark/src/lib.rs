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

pub mod card_data; // D12+: static 60-card table for on-chain damage_calc
pub mod constants;
pub mod damage_calc; // D12+: Phase 15 battle resolver (Rust port of damage-calc.js)
pub mod error;
pub mod groth16; // shared BN254/Groth16 math (VK constants stay per-instruction)
pub mod instructions;
pub mod poseidon_helper; // YKK-33: on-chain Poseidon(6) via sol_poseidon syscall
pub mod state;

use anchor_lang::prelude::*;

pub use error::ErrorCode;
pub use instructions::*;
pub use state::*;

declare_id!("5i37jWBiA7bV9XmokyDWHQxjJ5s1sBnSEkPSB4J2XfmN");

// Poseidon(15) with ark-bn254 needs ~45KB heap; default SBF heap is 32KB.
// custom-heap disables Anchor's default BumpAllocator so we can provide 256KB.
// Clients must include RequestHeapFrame(262144) for reveal_hand transactions.
#[cfg(all(feature = "custom-heap", target_os = "solana"))]
#[global_allocator]
static HEAP: anchor_lang::solana_program::entrypoint::BumpAllocator = unsafe {
    anchor_lang::solana_program::entrypoint::BumpAllocator::with_fixed_address_range(
        anchor_lang::solana_program::entrypoint::HEAP_START_ADDRESS as usize,
        256 * 1024,
    )
};

#[program]
pub mod oxark {
    use super::*;

    /// One-time program initializer (idempotent; can be skipped in production).
    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        instructions::initialize::handle_initialize(ctx)
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
        instructions::season::handle_create_season(
            ctx,
            season_id,
            entry_fee,
            max_players,
            duration_seconds,
        )
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
            ctx,
            agent_id,
            name_hash,
            strategy_hash,
            endpoint_hash,
            price_per_query,
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
        instructions::agent_hire::handle_register_agent_hire(
            ctx,
            agent_id,
            duration_seconds,
            payment_tx_lo,
            payment_tx_hi,
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
    pub fn save_deck(
        ctx: Context<SaveDeck>,
        cards: Vec<u8>,
        lane_assignments: Vec<u8>,
    ) -> Result<()> {
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
    pub fn record_mint(ctx: Context<RecordMint>, season_id: u32, requested_tier: u8) -> Result<()> {
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


    // ── T110: Combo System ────────────────────────────────────────────────────

    /// Record a card battle outcome for combo tracking.
    ///
    /// `is_super_effective = true` increments the combo streak.
    /// Hitting 3/5/7 unlocks combo tiers (PERFECT/LEGENDARY/UNSTOPPABLE).
    /// At 7+ the xp_2x_flag is set for the next add_xp call.
    ///
    /// PDA seeds: `["player_battle_stats", player_pubkey]` (init_if_needed)
    pub fn record_battle_result(
        ctx: Context<RecordBattleResult>,
        is_super_effective: bool,
    ) -> Result<()> {
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
        instructions::unlock_lore_shard::handle_unlock_lore_shard(
            ctx,
            card_mint,
            shard_index,
            method,
        )
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
            ctx,
            duel_id,
            round,
            proof_a,
            proof_b,
            proof_c,
            public_signals,
        )
    }

    pub fn reveal_hand(
        ctx: Context<RevealHand>,
        duel_id: Pubkey,
        round: u8,
        card_ids: [u64; 10],
        salt: [u8; 32],
    ) -> Result<()> {
        instructions::reveal_hand::handle_reveal_hand(ctx, duel_id, round, card_ids, salt)
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
            ctx,
            card_mint,
            wins_delta,
            losses_delta,
            kos_delta,
            dmg_delta,
            summon_delta,
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
            ctx,
            card_mint,
            new_owner,
            steal_type,
            hall_tier,
            is_starter_card,
            is_legendary,
        )
    }

    // ── v3.0-plus: Burn / Evolve / Season Stats ───────────────────────────────

    /// v3.0-plus: Permanently burn a Common or Uncommon NFT card.
    ///
    /// Legendary (rarity=3) and Rare (rarity=2) are protected.
    /// Updates CardBattleHistory.burn_count and SeasonStats.total_burned.
    /// Seeds for season_stats PDA: ["season_stats", season_id_le].
    /// Rarity is read from the on-chain CardMintRecord PDA (C5 fix).
    pub fn burn_card(ctx: Context<BurnCard>, card_mint: Pubkey) -> Result<()> {
        instructions::burn_card::handle_burn_card(ctx, card_mint)
    }

    /// C5 fix: Admin registers the on-chain rarity record for an NFT card mint.
    ///
    /// Must be called once per NFT card mint before burn_card can be invoked.
    /// Only ADMIN_PUBKEY can call this instruction.
    pub fn init_card_mint_record(
        ctx: Context<InitCardMintRecord>,
        card_mint: Pubkey,
        card_id: u8,
        rarity: u8,
    ) -> Result<()> {
        instructions::init_card_mint_record::handle_init_card_mint_record(
            ctx, card_mint, card_id, rarity,
        )
    }

    // YKK-45: `evolve_cards` (2-burn → new mint) is UNWIRED. The 2-card merge severs
    // a card's history (new mint = new CardBattleHistory key), which contradicts the
    // provenance-driven design. It is superseded by `promote_card` (in-place single-card
    // promotion: same mint, history continuous). The module is retained for reference
    // only (see instructions::evolve_cards); removing it from here drops it from the IDL.

    /// YKK-45: Provenance-gated single-card promotion (design v3 §2). Raises a card's
    /// rarity in place (Common → Uncommon) — same SPL mint, no burn — gated on the
    /// card's `wins`. Holder-only. Token cost (YKK-43) and higher tiers come later.
    pub fn promote_card(ctx: Context<PromoteCard>, card_mint: Pubkey) -> Result<()> {
        instructions::promote_card::handle_promote_card(ctx, card_mint)
    }

    /// Trustless CardBattleHistory settlement: derives one card's win/loss credit
    /// from a FINISHED on-chain DuelState (participant + revealed-hand membership
    /// + per-duel dedup bitmap) instead of trusting caller-supplied deltas. This
    /// is the player-facing write path that feeds `promote_card`'s wins gate;
    /// `update_card_battle_history` is now ADMIN-only (see that instruction).
    /// One card per call — clients batch several into a single transaction.
    pub fn settle_duel_history(
        ctx: Context<SettleDuelHistory>,
        duel_id: Pubkey,
        card_mint: Pubkey,
    ) -> Result<()> {
        instructions::settle_duel_history::handle_settle_duel_history(ctx, duel_id, card_mint)
    }

    /// Stall-timeout guard: after `DUEL_STALL_TIMEOUT_SECONDS` without progress,
    /// the participant who has done their part for the current round may end a
    /// duel whose opponent refuses to commit/reveal, taking the win. Must exist
    /// before YKK-44 escrow, or a reveal-refuser could lock escrowed cards forever.
    pub fn claim_timeout_win(ctx: Context<ClaimTimeoutWin>, duel_id: Pubkey) -> Result<()> {
        instructions::claim_timeout_win::handle_claim_timeout_win(ctx, duel_id)
    }

    /// Refill energy to full for SOL (YKK-44 anti-whale gate / YKK-43 sink).
    /// The regen/spend math lives in `instructions::refill_energy`; the duel-entry
    /// consumption point is a separate change (the duel flow loads no PlayerState yet).
    pub fn refill_energy(ctx: Context<RefillEnergy>) -> Result<()> {
        instructions::refill_energy::handle_refill_energy(ctx)
    }

    /// v3.0-plus: Initialize the SeasonStats PDA for a new season.
    ///
    /// Must be called once before Burn/Evolve/Steal instructions.
    /// Seeds: ["season_stats", season_id_le]
    pub fn init_season_stats(ctx: Context<InitSeasonStats>, season_id: u32) -> Result<()> {
        instructions::init_season_stats::handle_init_season_stats(ctx, season_id)
    }

    /// v3.0-plus: Grant an Imprint to a card's battle history.
    ///
    /// Cosmetic Imprints have no cap. Stat Imprints are capped by rarity:
    ///   Common/Uncommon → 3, Rare → 4, Legendary → 5.
    /// Rarity is read on-chain from CardMintRecord (C5 fix, YKK-32).
    pub fn grant_imprint(
        ctx: Context<GrantImprint>,
        card_mint: Pubkey,
        imprint_key_val: u8,
        is_cosmetic: bool,
        duel_id: u64,
    ) -> Result<()> {
        instructions::update_card_battle_history::handle_grant_imprint(
            ctx,
            card_mint,
            imprint_key_val,
            is_cosmetic,
            duel_id,
        )
    }

    // ── T-D15-B: Legendary acquisition ────────────────────────────────────────

    pub fn init_legendary_supply(ctx: Context<InitLegendarySupply>, season_id: u64) -> Result<()> {
        instructions::legendary::handle_init_legendary_supply(ctx, season_id)
    }

    pub fn record_gold_hall_win(
        ctx: Context<RecordGoldHallWin>,
        duel_id: Pubkey,
        season_id: u32,
    ) -> Result<()> {
        instructions::legendary::handle_record_gold_hall_win(ctx, duel_id, season_id)
    }

    pub fn claim_legendary(
        ctx: Context<ClaimLegendary>,
        season_id: u64,
        species_id: u8,
    ) -> Result<()> {
        instructions::legendary::handle_claim_legendary(ctx, season_id, species_id)
    }

    pub fn distribute_prize_pool(ctx: Context<DistributePrizePool>, season_id: u32) -> Result<()> {
        instructions::legendary::handle_distribute_prize_pool(ctx, season_id)
    }

    // ── Phase 15: Season v2 ───────────────────────────────────────────────────

    /// Initialize the Season 1 GameWorld singleton PDA.
    ///
    /// Admin-only (ADMIN_PUBKEY). Can only be called once (init constraint).
    ///
    /// `game_start_timestamp`: Unix timestamp when the game goes active.
    ///   waitlist_close = game_start - 14 days
    ///   end            = game_start + 14 days
    ///
    /// PDA seeds: ["game_world"]
    pub fn init_game_world(
        ctx: Context<InitGameWorld>,
        game_start_timestamp: i64,
        ops_treasury: Pubkey,
    ) -> Result<()> {
        instructions::init_game_world::handle_init_game_world(
            ctx,
            game_start_timestamp,
            ops_treasury,
        )
    }

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

    // ─── YKK season-end prize settlement (finalize → end → claim) ─────────────

    /// Season state: waitlist (0) → active (1). Admin-only, after the waitlist window.
    pub fn activate_season(ctx: Context<ActivateSeason>) -> Result<()> {
        instructions::activate_season::handle_activate_season(ctx)
    }

    /// Tally a batch of participants into the GameWorld tier totals (admin crank).
    /// `players` must be strictly increasing and > `finalize_cursor`; their
    /// PlayerState PDAs are passed as remaining_accounts in the same order.
    pub fn finalize_season_tally(
        ctx: Context<FinalizeSeasonTally>,
        players: Vec<Pubkey>,
    ) -> Result<()> {
        instructions::finalize_season_tally::handle_finalize_season_tally(ctx, players)
    }

    /// Season state: active (1) → ended (2). Admin-only; requires the full tally
    /// (finalize_processed == total_participants) so claims open on complete data.
    pub fn end_season_final(ctx: Context<EndSeasonFinal>) -> Result<()> {
        instructions::end_season_final::handle_end_season_final(ctx)
    }

    /// Claim 1 random card from loser's battle field (on-chain loot via SlotHashes).
    /// `duel_id`:     unique Pubkey for this duel (prevents double-claim via PDA init).
    /// `loser_pubkey`: the loser's wallet pubkey.
    /// `loser_field`:  the 5 card IDs the loser had on the field (0 = empty slot).
    pub fn claim_battle_loot(
        ctx: Context<ClaimBattleLoot>,
        duel_id: Pubkey,
        loser_pubkey: Pubkey,
        loser_field: [u8; 5],
    ) -> Result<()> {
        instructions::claim_battle_loot::handle_claim_battle_loot(
            ctx,
            duel_id,
            loser_pubkey,
            loser_field,
        )
    }

    // ── Phase 20-B: Shop ──────────────────────────────────────────────────────

    /// Purchase a card pack (Standard: 5 cards / Premium: 3 cards + Uncommon guarantee).
    ///
    /// Transfers SOL 50/50 to ops_treasury and prize_pool.
    /// Uses SlotHashes sysvar for on-chain verifiable randomness.
    /// Drop rates are admin-adjustable via update_game_params.
    pub fn buy_pack(ctx: Context<BuyPack>, pack_type: u8) -> Result<()> {
        instructions::buy_pack::handle_buy_pack(ctx, pack_type)
    }

    /// Admin-only: adjust shop drop rates and phase threshold.
    ///
    /// All rate params are in ppm (parts per million out of 1_000_000).
    /// Pass `None` for any param to leave it unchanged.
    /// Legendary rates are validated ≤ 100_000 (10%).
    pub fn update_game_params(
        ctx: Context<UpdateGameParams>,
        legendary_rate_phase1: Option<u32>,
        legendary_rate_phase2: Option<u32>,
        rare_rate_phase1: Option<u32>,
        rare_rate_phase2: Option<u32>,
        uncommon_rate: Option<u32>,
        threshold_seconds: Option<u64>,
    ) -> Result<()> {
        instructions::update_game_params::handle_update_game_params(
            ctx,
            legendary_rate_phase1,
            legendary_rate_phase2,
            rare_rate_phase1,
            rare_rate_phase2,
            uncommon_rate,
            threshold_seconds,
        )
    }

    /// Admin-only: override waitlist_close_timestamp in-place.
    ///
    /// Use when the GameWorld is already on-chain but the deadline must be extended.
    /// Pass `new_deadline = Clock::get().unix_timestamp + 14 * 24 * 3600` to open
    /// registration for 14 more days from now.
    pub fn set_waitlist_deadline(
        ctx: Context<SetWaitlistDeadline>,
        new_deadline: i64,
    ) -> Result<()> {
        instructions::set_waitlist_deadline::handle_set_waitlist_deadline(ctx, new_deadline)
    }

    /// Admin-only: reset a player's season state for devnet re-registration testing.
    pub fn reset_player_state(ctx: Context<ResetPlayerState>) -> Result<()> {
        instructions::reset_player_state::handle_reset_player_state(ctx)
    }

    // YKK-39: `migrate_shop_fields` entrypoint removed. It wrote `world.prize_pool`
    // from an external arg WITHOUT setting `prize_pool_bump`, which (post YKK-38)
    // would desync the PDA vault address from its bump and lock all prize/deposit
    // flows. It was never called from any client or test; the fresh-init path
    // (YKK-34/38) makes it unnecessary. The module is retained for reference only
    // (see instructions::migrate_shop_fields), not dispatched.

    // ── Phase 20-C: Trade Floor ────────────────────────────────────────────────

    /// Create a sell listing, escrowing the card from the seller's vault.
    ///
    /// - card_id must be owned by seller (vault bitmap check)
    /// - price must be ≥ 0.001 SOL (1_000_000 lamports)
    /// - A TradeListing PDA is initialized; card is removed from vault immediately
    pub fn create_listing(ctx: Context<CreateListing>, card_id: u8, price: u64) -> Result<()> {
        instructions::create_listing::handle_create_listing(ctx, card_id, price)
    }

    /// Cancel an active listing and return the escrowed card to the seller.
    ///
    /// - Only the original seller may cancel
    /// - TradeListing PDA is closed; rent refunded to seller
    pub fn cancel_listing(ctx: Context<CancelListing>, card_id: u8) -> Result<()> {
        instructions::cancel_listing::handle_cancel_listing(ctx, card_id)
    }

    /// Purchase a listed card.
    ///
    /// - Buyer pays price in SOL directly to seller (0% fee)
    /// - Card is added to buyer's vault
    /// - TradeListing PDA is closed; rent refunded to seller
    pub fn accept_listing(
        ctx: Context<AcceptListing>,
        seller_pubkey: Pubkey,
        card_id: u8,
    ) -> Result<()> {
        instructions::accept_listing::handle_accept_listing(ctx, seller_pubkey, card_id)
    }
}

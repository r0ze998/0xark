use anchor_lang::prelude::*;

/// Card types (1-indexed, 0 = empty)
/// 1=Aegis (Crystal Knight), 2=Umbra (Shadow Rogue), 3=Ignis (Fire Beast), 4=Tempest (Storm Prophet), 5=Nihil (Void Observer)
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, Debug, Default)]
pub enum GameStatus {
    #[default]
    Lobby,
    CommitPhase,
    RevealPhase,
    Finished,
}

/// Area IDs: 0=Port, 1=Forest, 2=Ruins
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, Debug, Default)]
pub enum Area {
    #[default]
    Port,
    Forest,
    Ruins,
}

impl From<u8> for Area {
    fn from(v: u8) -> Self {
        match v {
            1 => Area::Forest,
            2 => Area::Ruins,
            _ => Area::Port,
        }
    }
}

/// Phase 15 v2 ActionType (6 types — None/Draw/Steal/Scout/Move removed).
/// 0=UseCrystal, 1=Barrier, 2=UseFlame, 3=UseStorm, 4=UseShadow, 5=UseVoid
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, Debug, Default)]
pub enum ActionType {
    #[default]
    UseCrystal, // 0
    Barrier,   // 1
    UseFlame,  // 2
    UseStorm,  // 3
    UseShadow, // 4
    UseVoid,   // 5
}

impl From<u8> for ActionType {
    fn from(v: u8) -> Self {
        match v {
            1 => ActionType::Barrier,
            2 => ActionType::UseFlame,
            3 => ActionType::UseStorm,
            4 => ActionType::UseShadow,
            5 => ActionType::UseVoid,
            _ => ActionType::UseCrystal, // 0 + unknown → UseCrystal
        }
    }
}

impl From<ActionType> for u8 {
    fn from(a: ActionType) -> u8 {
        match a {
            ActionType::UseCrystal => 0,
            ActionType::Barrier => 1,
            ActionType::UseFlame => 2,
            ActionType::UseStorm => 3,
            ActionType::UseShadow => 4,
            ActionType::UseVoid => 5,
        }
    }
}

#[account]
#[derive(Default)]
pub struct Game {
    pub game_id: u64,
    pub host: Pubkey,
    pub status: GameStatus,
    pub round: u8,
    pub max_rounds: u8,
    pub player_count: u8,
    pub max_players: u8,
    pub cards_in_pool: u8,
    pub winner: Pubkey,
    pub commit_count: u8,
    pub reveal_count: u8,
    pub bump: u8,
    // C3 fix: stores registered player pubkeys so resolve_round can validate PDAs.
    pub players: [Pubkey; 3], // MAX_PLAYERS = 3
}

impl Game {
    // Original: 8 + 8 + 32 + 1*6 + 32 + 1*3 = 89
    // C3 addition: [Pubkey; 3] = 96 → total 185
    pub const SIZE: usize = 8 + 8 + 32 + 1 + 1 + 1 + 1 + 1 + 1 + 32 + 1 + 1 + 1 + (3 * 32);

    /// 0-based index of `key` among the joined players, or None.
    /// Only the first `player_count` slots are live; trailing slots are
    /// Pubkey::default() until join_game fills them.
    pub fn player_index(&self, key: &Pubkey) -> Option<usize> {
        self.players[..self.player_count as usize]
            .iter()
            .position(|p| p == key)
    }

    /// Whether `key` has joined this game (C3 whitelist membership).
    pub fn is_participant(&self, key: &Pubkey) -> bool {
        self.player_index(key).is_some()
    }
}

#[account]
#[derive(Default)]
pub struct PlayerState {
    pub game_id: u64,
    pub player: Pubkey,
    pub player_index: u8,
    pub area: u8, // 0=Port, 1=Forest, 2=Ruins
    /// Cards held: array of 5 slots, value = card_id (1-5), 0 = empty
    pub cards: [u8; 5],
    pub card_count: u8,
    pub steal_count: u8,
    pub barrier_count: u8,
    pub scout_count: u8,
    pub has_committed: bool,
    pub has_revealed: bool,
    /// Revealed action (stored after reveal, used during resolution)
    pub revealed_action: u8,
    pub revealed_target: Pubkey,
    /// Move target area (if action is Move)
    pub move_target: u8,
    /// Solana clock timestamp when each card slot was acquired (0 = empty/unset)
    pub card_timestamps: [i64; 5],
    pub bump: u8,
    // ── ZK position commitment (Phase C C-2) ─────────────────────────────────
    /// Poseidon(x, y, area, salt) — set by init_position, updated by verify_dungeon_move
    pub position_commitment: [u8; 32],
    pub position_commitment_initialized: bool,
    // ── D4 Reborn: Matchmaking queue tracking (pre-approved layout extension) ──
    /// Pubkey of the MatchmakingQueue PDA this player is currently in, or None.
    pub current_queue: Option<Pubkey>,

    // ── Phase 15: Season-wide progression fields ──────────────────────────────
    /// Bitmask of owned card IDs (1-60). Bit (id-1) set = owned.
    pub vault_bitmap: [u8; 8],
    /// Initial deposit in lamports (0.5 SOL = 500_000_000).
    pub deposit_amount: u64,
    /// Current win streak (resets on loss).
    pub win_streak: u8,
    /// All-time max win streak this season.
    pub max_win_streak: u8,
    /// Total matches played (for Sage / Architect legendary judgment).
    pub total_matches: u8,
    /// action_type of the last committed action (u8, ActionType value).
    pub last_action_type: u8,
    /// Consecutive matches where action_type differed from the previous match.
    pub consecutive_diff_actiontype: u8,
    /// Cumulative x402 spend in lamports (for Patron / Magnate judgment).
    pub x402_total_spend: u64,
    /// Bitmap of unique peek target wallets (simplified: hash mod 64).
    pub peek_unique_targets: [u8; 8],
    /// Win streak with zero x402 spend (for Hermit / Ascetic judgment).
    pub no_x402_win_streak: u8,
    /// Legendary acquisition flags (index = Legendary index 0-5).
    pub legendary_progress: [bool; 6],
    /// Max vault size reached this season (for Phoenix / Marauder judgment).
    pub vault_size_max: u8,
    /// Min vault size reached after reaching max (for Phoenix judgment).
    pub vault_size_min: u8,
    /// Unix timestamp of last time player dropped to Tier 5 (for Phoenix).
    pub last_drop_to_tier5_timestamp: i64,
}

impl PlayerState {
    // Original: 8 (disc) + 8 (game_id) + 32 (player) + 1 (index) + 1 (area)
    //   + 5 (cards) + 1 (card_count) + 1 (steal) + 1 (barrier) + 1 (scout)
    //   + 1 (committed) + 1 (revealed) + 1 (revealed_action) + 32 (revealed_target)
    //   + 1 (move_target) + 40 (card_timestamps: 5×i64) + 1 (bump)
    //   + 32 (position_commitment) + 1 (position_commitment_initialized)
    //   + 1 (Option disc) + 32 (Option<Pubkey>)
    // Phase 15 additions: 8+8+1+1+1+1+1+8+8+1+6+1+1+8 = 55
    pub const SIZE: usize = 8
        + 8
        + 32
        + 1
        + 1
        + 5
        + 1
        + 1
        + 1
        + 1
        + 1
        + 1
        + 1
        + 32
        + 1
        + 40
        + 1
        + 32
        + 1
        + 1
        + 32
        + 8
        + 8
        + 1
        + 1
        + 1
        + 1
        + 1
        + 8
        + 8
        + 1
        + 6
        + 1
        + 1
        + 8; // 258 total

    /// Count how many vault_bitmap bits are set (cards owned).
    pub fn vault_count(&self) -> u8 {
        self.vault_bitmap.iter().map(|b| b.count_ones() as u8).sum()
    }

    /// Check if card_id (1-60) is in vault_bitmap.
    pub fn has_vault_card(&self, card_id: u8) -> bool {
        if card_id == 0 || card_id > 60 {
            return false;
        }
        let idx = (card_id - 1) as usize;
        let byte = idx / 8;
        let bit = idx % 8;
        (self.vault_bitmap[byte] >> bit) & 1 == 1
    }

    /// Set card_id (1-60) in vault_bitmap.
    pub fn set_vault_card(&mut self, card_id: u8) {
        if card_id == 0 || card_id > 60 {
            return;
        }
        let idx = (card_id - 1) as usize;
        let byte = idx / 8;
        let bit = idx % 8;
        self.vault_bitmap[byte] |= 1 << bit;
    }

    /// Clear card_id (1-60) from vault_bitmap (looted by opponent).
    pub fn clear_vault_card(&mut self, card_id: u8) {
        if card_id == 0 || card_id > 60 {
            return;
        }
        let idx = (card_id - 1) as usize;
        let byte = idx / 8;
        let bit = idx % 8;
        self.vault_bitmap[byte] &= !(1 << bit);
    }

    // ── claim_battle_loot helpers ───────────────────────────────────────

    pub fn has_card(&self, card_id: u8) -> bool {
        self.has_vault_card(card_id)
    }

    pub fn add_card(&mut self, card_id: u8) -> anchor_lang::Result<()> {
        use crate::error::ErrorCode;
        require!(card_id > 0 && card_id <= 60, ErrorCode::InvalidCardId);
        self.set_vault_card(card_id);
        Ok(())
    }

    pub fn remove_card(&mut self, card_id: u8) -> anchor_lang::Result<()> {
        use crate::error::ErrorCode;
        require!(card_id > 0 && card_id <= 60, ErrorCode::InvalidCardId);
        require!(self.has_vault_card(card_id), ErrorCode::CardNotOwned);
        self.clear_vault_card(card_id);
        Ok(())
    }
}

#[account]
#[derive(Default)]
pub struct CardPool {
    pub game_id: u64,
    /// Remaining cards per type: index 0 = Crystal, 1 = Shadow, etc.
    pub remaining: [u8; 5],
    pub bump: u8,
}

impl CardPool {
    pub const SIZE: usize = 8 + 8 + 5 + 1;
}

#[account]
#[derive(Default)]
pub struct CommitAction {
    pub game_id: u64,
    pub round: u8,
    pub player: Pubkey,
    pub hash: [u8; 32],
    pub bump: u8,
    // ── Reborn: Duel phase tracking ───────────────────────────────────────
    /// Round number from Game.round at commit time (Reborn: 0-based round index).
    pub round_number: u8,
    /// Duel phase at commit time: 0=Draw, 1=Energy, 2=Summon, 3=Battle.
    pub phase: u8,
    /// Cards played in this phase commit (up to 3 card IDs; 0 = empty slot).
    /// Reborn: commitment = SHA-256(played_cards + nonce + round + phase).
    pub played_cards: [u64; 3],
    /// Number of valid card IDs stored in played_cards (0-3).
    pub played_cards_len: u8,
}

impl CommitAction {
    // Legacy SIZE (Phase C) + Reborn fields: round_number(1) + phase(1) + played_cards(24) + played_cards_len(1)
    pub const SIZE: usize = 8 + 8 + 1 + 32 + 32 + 1 + 1 + 1 + 24 + 1;
}

/// ZK card commitment record for 2-phase bluff battle (Axis C).
/// PDA seeds: ["card_commit", player_pubkey, game_id_le, round_u8]
///
/// Phase 1 (COMMIT): player sends commitment = Poseidon(card_id, salt).
/// Phase 2 (REVEAL): player sends (card_id, salt, zk_proof); on-chain
///   verifies Poseidon(card_id, salt) == stored commitment before revealing.
#[account]
#[derive(Default)]
pub struct CardCommitRecord {
    pub game_id: u64,
    pub player: Pubkey,
    pub round: u8,
    /// Poseidon(card_id, salt) — 32-byte big-endian field element.
    pub commitment: [u8; 32],
    /// Set to true after reveal_card verifies the ZK proof.
    pub revealed: bool,
    /// 0 until reveal phase; populated after valid reveal.
    pub card_id: u8,
    pub bump: u8,
}

impl CardCommitRecord {
    // 8 disc + 8 game_id + 32 player + 1 round + 32 commitment + 1 revealed + 1 card_id + 1 bump
    pub const SIZE: usize = 8 + 8 + 32 + 1 + 32 + 1 + 1 + 1;
}

/// Player's prepared battle deck (up to 20 cards).
/// PDA seeds: ["player_deck", player_pubkey]
///
/// Composition rules (GDD v1.2 — simplified from Phase C):
///   - exactly 20 cards
///   - max 2 copies of any single card
///   (Phase C cost cap + rarity balance removed)
///
/// DECISION (2026-04-22): Added lane_assignments [u8; 20] field.
///   Values: 0=Front, 1=Middle, 2=Back, 255=Any (default).
///   Existing accounts that were init_if_needed before this change have
///   zero-padding in the new bytes, which is treated as Front (0). Clients
///   should write 255 (Any) for all lanes when saving a deck without lane data.
///   SIZE updated from 78 → 98 bytes; new accounts created after this deploy
///   will be allocated correctly via init_if_needed.
#[account]
pub struct PlayerDeck {
    pub owner: Pubkey,
    /// Card IDs in deck (0 = empty slot). Always exactly 20 entries.
    pub deck_cards: [u8; 20],
    pub card_count: u8,
    /// Unix timestamp until which the deck is locked (0 = not locked).
    pub locked_until: i64,
    pub last_modified: i64,
    pub bump: u8,
    /// Lane assignment per deck slot. 0=Front, 1=Middle, 2=Back, 255=Any.
    /// Defaults to 255 (Any) when not explicitly set.
    pub lane_assignments: [u8; 20],
}

impl PlayerDeck {
    // 8 disc + 32 owner + 20 cards + 1 count + 8 locked + 8 modified + 1 bump + 20 lanes
    pub const SIZE: usize = 8 + 32 + 20 + 1 + 8 + 8 + 1 + 20;
}

// === T94: Dynamic Supply System ===

/// Tracks per-season card supply limits derived from participant count.
/// PDA seeds: ["season_supply", season_id_le]
#[account]
#[derive(Default)]
pub struct SeasonCardSupply {
    pub season_id: u32,
    pub participant_count: u32,
    /// Max mintable cards per tier [C, B, A, S, SS]
    pub supply: [u32; 5],
    /// Cards minted per tier so far
    pub minted: [u32; 5],
    /// true when a tier's supply is exhausted
    pub exhausted: [bool; 5],
    pub bump: u8,
}

impl SeasonCardSupply {
    // 8 disc + 4 season_id + 4 participant + 5*4 supply + 5*4 minted + 5 exhausted + 1 bump
    pub const SIZE: usize = 8 + 4 + 4 + 20 + 20 + 5 + 1;

    /// Compute initial supply for N participants.
    pub fn compute_supply(n: u32) -> [u32; 5] {
        [
            (n * 16).max(8),      // C: 16×N, min 8
            ((n * 5) / 2).max(4), // B: 2.5×N, min 4
            ((n * 2) / 5).max(2), // A: 0.4×N, min 2
            (n / 20).max(1),      // S: 0.05×N, min 1
            1,                    // SS: always 1 per season
        ]
    }
}

// === T95: Player Registry (GI Rule) ===

/// Per-player permanent card species registry.
/// First acquisition of species X sets registered[X-1] = true (permanent).
/// PDA seeds: ["player_registry", player_pubkey]
#[account]
pub struct PlayerRegistry {
    pub owner: Pubkey,
    /// registered[i] = true means card_id i+1 has been seen at least once
    pub registered: [bool; 60],
    /// unix timestamp of first registration, 0 if not registered
    pub registered_at: [i64; 60],
    /// total distinct species registered
    pub count: u8,
    /// true when count == 60 (all species collected)
    pub season_complete: bool,
    pub bump: u8,
}

impl Default for PlayerRegistry {
    fn default() -> Self {
        Self {
            owner: Pubkey::default(),
            registered: [false; 60],
            registered_at: [0i64; 60],
            count: 0,
            season_complete: false,
            bump: 0,
        }
    }
}

impl PlayerRegistry {
    // 8 disc + 32 owner + 60 registered + 60*8 registered_at + 1 count + 1 season_complete + 1 bump
    pub const SIZE: usize = 8 + 32 + 60 + 480 + 1 + 1 + 1;
}

// === Anchor Events ===

#[event]
pub struct CardDrawn {
    pub game_id: u64,
    pub player: Pubkey,
    pub card_id: u8,
    pub area: u8,
}

#[event]
pub struct CardStolen {
    pub game_id: u64,
    pub stealer: Pubkey,
    pub victim: Pubkey,
    pub card_id: u8,
}

#[event]
pub struct RoundResolved {
    pub game_id: u64,
    pub round: u8,
}

#[event]
pub struct GameFinishedEvent {
    pub game_id: u64,
    pub winner: Pubkey,
    pub round: u8,
}

#[event]
pub struct PlayerMoved {
    pub game_id: u64,
    pub player: Pubkey,
    pub from_area: u8,
    pub to_area: u8,
}

// === T110: Battle Stats (Combo System) ===

/// Per-player battle combo and streak tracking.
/// combo_count resets on non-SUPER-EFFECTIVE battle outcome.
/// PDA seeds: ["player_battle_stats", player_pubkey]
#[account]
#[derive(Default)]
pub struct PlayerBattleStats {
    pub owner: Pubkey,
    pub combo_count: u8,  // current consecutive SUPER EFFECTIVE streak
    pub max_combo: u8,    // all-time max combo this player has reached
    pub xp_2x_flag: bool, // true when combo hit 7+ (next battle XP doubled)
    pub bump: u8,
    // ── D4 Reborn: Tier win tracking (pre-approved layout extension) ──────────
    /// Wins per matchmaking tier: [0]=Bronze, [1]=Silver, [2]=Gold.
    /// Used to gate access: Silver requires wins_at_tier[0] >= 5, Gold requires wins_at_tier[1] >= 3.
    pub wins_at_tier: [u8; 3],
}

impl PlayerBattleStats {
    // 8 disc + 32 owner + 1 combo + 1 max_combo + 1 xp_2x + 1 bump + 3 wins_at_tier
    pub const SIZE: usize = 8 + 32 + 1 + 1 + 1 + 1 + 3;

    /// Combo tier for visual effects. Returns 0 (none), 3 (PERFECT), 5 (LEGENDARY), 7 (UNSTOPPABLE).
    pub fn combo_tier(count: u8) -> u8 {
        if count >= 7 {
            7
        } else if count >= 5 {
            5
        } else if count >= 3 {
            3
        } else {
            0
        }
    }
}

// === T98: XP + Level System ===

/// Per-player XP and level progression.
/// xpForLevel(n) = floor((n-1)*n*55), 60 levels.
/// PDA seeds: ["player_level", player_pubkey]
#[account]
#[derive(Default)]
pub struct PlayerLevel {
    pub owner: Pubkey,
    pub xp_total: u64,
    pub level: u8, // 1-60
    pub bump: u8,
}

impl PlayerLevel {
    // 8 disc + 32 owner + 8 xp_total + 1 level + 1 bump
    pub const SIZE: usize = 8 + 32 + 8 + 1 + 1;

    /// XP threshold to reach level n (n >= 1).
    /// xpForLevel(n) = floor((n-1)*n*55)
    pub fn xp_for_level(n: u8) -> u64 {
        let n = n as u64;
        (n.saturating_sub(1)).wrapping_mul(n).wrapping_mul(55)
    }

    /// Recompute level from total XP. Returns level 1-60.
    pub fn level_from_xp(xp: u64) -> u8 {
        let mut lv = 1u8;
        while lv < 60 {
            if xp < Self::xp_for_level(lv + 1) {
                break;
            }
            lv += 1;
        }
        lv
    }
}

// XP reward constants (matches client XP_REWARDS)
pub const XP_BATTLE_WIN: u64 = 50;
pub const XP_BATTLE_LOSS: u64 = 15;
pub const XP_CARD_COLLECT: u64 = 10;
pub const XP_SUPER_EFFECTIVE: u64 = 20;
pub const XP_ZK_CYCLE: u64 = 30;
pub const XP_DEATHRATTLE: u64 = 15;
pub const XP_CHAIN: u64 = 15;

// === T99: Achievement System ===

/// Per-player achievement flags (10 achievements, bitmask in u16).
/// Bit i = achievement index i unlocked.
/// PDA seeds: ["player_achievements", player_pubkey]
///
/// Achievement indices:
///   0=first_blood, 1=collector_10, 2=collector_30, 3=full_set,
///   4=chain_master, 5=dr_survived, 6=zk_committed, 7=super_x5,
///   8=dungeon_floor5, 9=season_top
#[account]
#[derive(Default)]
pub struct PlayerAchievements {
    pub owner: Pubkey,
    pub flags: u16, // bitmask, bit i = achievement i unlocked
    pub bump: u8,
}

impl PlayerAchievements {
    // 8 disc + 32 owner + 2 flags + 1 bump
    pub const SIZE: usize = 8 + 32 + 2 + 1;

    pub fn is_unlocked(&self, idx: u8) -> bool {
        idx < 16 && (self.flags & (1u16 << idx)) != 0
    }

    pub fn unlock(&mut self, idx: u8) -> bool {
        if idx >= 16 || self.is_unlocked(idx) {
            return false;
        }
        self.flags |= 1u16 << idx;
        true
    }
}

// === T100: Title System ===

/// Per-player equipped title (0-7) and unlocked title bitmask.
/// PDA seeds: ["player_title", player_pubkey]
///
/// Title indices:
///   0=Traveler, 1=Card Hunter, 2=Chain Wizard, 3=Dread Pirate,
///   4=ZK Mystic, 5=Half-Deck, 6=The Collector, 7=Champion
#[account]
#[derive(Default)]
pub struct PlayerTitle {
    pub owner: Pubkey,
    pub equipped: u8, // 0-7, currently equipped title index
    pub unlocked: u8, // bitmask, bit i = title i available (always has bit 0)
    pub bump: u8,
}

impl PlayerTitle {
    // 8 disc + 32 owner + 1 equipped + 1 unlocked + 1 bump
    pub const SIZE: usize = 8 + 32 + 1 + 1 + 1;

    pub fn is_title_unlocked(&self, idx: u8) -> bool {
        idx < 8 && (self.unlocked & (1u8 << idx)) != 0
    }

    pub fn unlock_title(&mut self, idx: u8) -> bool {
        if idx >= 8 || self.is_title_unlocked(idx) {
            return false;
        }
        self.unlocked |= 1u8 << idx;
        true
    }
}

// === D4 Reborn: Matchmaking Queue ===

/// FIFO queue per tier per season. Max 64 players.
/// When queue length reaches 2 after a push, emits QueueMatchReady.
/// PDA seeds: ["queue", tier_u8, season_le_u16]
#[account]
pub struct MatchmakingQueue {
    pub tier: u8,             // 0=Bronze, 1=Silver, 2=Gold
    pub season: u16,          // current season number
    pub players: Vec<Pubkey>, // FIFO, max 64
    pub created_at: i64,
    pub bump: u8,
}

impl MatchmakingQueue {
    pub const MAX_PLAYERS: usize = 64;
    // 8 disc + 1 tier + 2 season + 4 (vec len prefix) + 64*32 (players) + 8 created_at + 1 bump
    pub const SIZE: usize = 8 + 1 + 2 + 4 + (Self::MAX_PLAYERS * 32) + 8 + 1;
}

impl Default for MatchmakingQueue {
    fn default() -> Self {
        Self {
            tier: 0,
            season: 1,
            players: Vec::new(),
            created_at: 0,
            bump: 0,
        }
    }
}

/// Emitted when a matchmaking queue slot reaches 2 players.
#[event]
pub struct QueueMatchReady {
    pub tier: u8,
    pub season: u16,
    pub player_a: Pubkey,
    pub player_b: Pubkey,
}

// === D11: Lore Shard System ===

/// Per-card lore discovery tracker (3 shards per card).
///
/// Shard 0: Auto-unlocked on first acquisition.
/// Shard 1: Unlocked by playing a duel with this card in the active deck.
/// Shard 2: Unlocked via Gold Hall win or direct x402 payment.
///
/// PDA seeds: ["card_lore_shards", card_mint, owner_pubkey]
#[account]
pub struct CardLoreShards {
    pub card_mint: Pubkey,
    pub owner: Pubkey,
    pub shards_found: [bool; 3],
    pub unlock_timestamps: [i64; 3],
    pub bump: u8,
}

impl CardLoreShards {
    // 8 disc + 32 card_mint + 32 owner + 3 shards_found + 3*8 unlock_timestamps + 1 bump
    pub const SIZE: usize = 8 + 32 + 32 + 3 + (3 * 8) + 1;

    pub fn shards_unlocked_count(&self) -> u8 {
        self.shards_found.iter().filter(|&&f| f).count() as u8
    }

    pub fn is_complete(&self) -> bool {
        self.shards_found.iter().all(|&f| f)
    }
}

impl Default for CardLoreShards {
    fn default() -> Self {
        Self {
            card_mint: Pubkey::default(),
            owner: Pubkey::default(),
            shards_found: [false; 3],
            unlock_timestamps: [0i64; 3],
            bump: 0,
        }
    }
}

/// Emitted when a lore shard is unlocked for a card.
#[event]
pub struct LoreShardUnlocked {
    pub card_mint: Pubkey,
    pub owner: Pubkey,
    pub shard_index: u8,
    pub method: u8, // 0=auto, 1=condition_met, 2=x402_payment
    pub timestamp: i64,
}

// === D12: ZK Duel State (Hand Commitment / Reveal) ===

/// Per-duel on-chain state for commit-reveal ZK hand system.
///
/// Both players commit their hands via Groth16 ZK proof at Lock In,
/// then reveal after battle resolves.
///
/// PDA seeds: ["duel", duel_id.as_ref()]
#[account]
pub struct DuelState {
    /// Unique duel identifier (random Pubkey generated at matchmaking)
    pub id: Pubkey,
    pub player_1: Pubkey,
    pub player_2: Pubkey,
    pub hall_tier: u8, // 0=Bronze, 1=Silver, 2=Gold
    pub round: u8,     // current round (1-5)
    pub phase: u8,     // 0=Draw, 1=Energy, 2=Summon, 3=Battle
    pub ante: u64,     // lamports per player
    pub started_at: i64,
    pub ended_at: i64, // 0 until duel ends
    pub winner: Pubkey,
    /// Poseidon commitment per round per player (index: [round-1], 0-indexed)
    /// Stored as 32-byte big-endian BN254 field element
    pub player_1_commitment: [[u8; 32]; 5],
    pub player_2_commitment: [[u8; 32]; 5],
    /// Revealed card IDs after battle (10 cards × 5 rounds)
    pub player_1_revealed: [[u64; 10]; 5],
    pub player_2_revealed: [[u64; 10]; 5],
    /// Salt used during commit_hand per round — stored on first reveal so
    /// the second player's reveal_hand call can compute the deterministic
    /// SHA-256 seed for damage_calc: sha256(p1_salt || p2_salt || round).
    pub player_1_salt: [[u8; 32]; 5],
    pub player_2_salt: [[u8; 32]; 5],
    /// Set to true in commit_hand after Groth16 verification passes.
    /// reveal_hand requires the corresponding flag to be true (ZK gate).
    pub player_1_zk_verified: [bool; 5],
    pub player_2_zk_verified: [bool; 5],
    pub bump: u8,
    // ── YKK-41: best-of-3 round-win tally (5 rounds, first to 3 wins) ─────────
    /// Rounds won by player 1 so far this duel.
    pub player_1_round_wins: u8,
    /// Rounds won by player 2 so far this duel.
    pub player_2_round_wins: u8,
    // ── Stall timeout (reveal-refusal griefing guard) ─────────────────────────
    /// Unix timestamp of the last state-advancing action on this duel
    /// (init_duel / commit_hand / reveal_hand). `claim_timeout_win` compares
    /// `now - last_progress_at` against `DUEL_STALL_TIMEOUT_SECONDS` to let the
    /// non-stalling player end a duel the opponent refuses to progress.
    pub last_progress_at: i64,
}

impl DuelState {
    /// Rounds a player must win to take the duel (best-of-5, 3-win majority).
    pub const ROUNDS_TO_WIN: u8 = 3;
    // 8 disc + 32 id + 32 p1 + 32 p2 + 1 tier + 1 round + 1 phase + 8 ante
    // + 8 started_at + 8 ended_at + 32 winner
    // + 5*32 p1_commit + 5*32 p2_commit
    // + 5*10*8 p1_reveal + 5*10*8 p2_reveal
    // + 5*32 p1_salt + 5*32 p2_salt
    // + 5 p1_zk_verified + 5 p2_zk_verified
    // + 1 bump
    // + 1 p1_round_wins + 1 p2_round_wins  (YKK-41)
    // + 8 last_progress_at  (stall timeout)
    pub const SIZE: usize = 8
        + 32
        + 32
        + 32
        + 1
        + 1
        + 1
        + 8
        + 8
        + 8
        + 32
        + (5 * 32)
        + (5 * 32)
        + (5 * 10 * 8)
        + (5 * 10 * 8)
        + (5 * 32)
        + (5 * 32)
        + 5
        + 5
        + 1
        + 1
        + 1
        + 8;
}

impl Default for DuelState {
    fn default() -> Self {
        Self {
            id: Pubkey::default(),
            player_1: Pubkey::default(),
            player_2: Pubkey::default(),
            hall_tier: 0,
            round: 1,
            phase: 0,
            ante: 0,
            started_at: 0,
            ended_at: 0,
            winner: Pubkey::default(),
            player_1_commitment: [[0u8; 32]; 5],
            player_2_commitment: [[0u8; 32]; 5],
            player_1_revealed: [[0u64; 10]; 5],
            player_2_revealed: [[0u64; 10]; 5],
            player_1_salt: [[0u8; 32]; 5],
            player_2_salt: [[0u8; 32]; 5],
            player_1_zk_verified: [false; 5],
            player_2_zk_verified: [false; 5],
            bump: 0,
            player_1_round_wins: 0,
            player_2_round_wins: 0,
            last_progress_at: 0,
        }
    }
}

// D12 events

#[event]
pub struct DuelInitialized {
    pub duel_id: Pubkey,
    pub player_1: Pubkey,
    pub player_2: Pubkey,
}

// ─── DuelLootRecord PDA ────────────────────────────────────────────────────
// Seeds: ["duel_loot", duel_id.as_ref()]
// Created (init) on first and only successful claim_battle_loot call.
// Its existence proves loot was already claimed — no loot_claimed flag needed.
#[account]
pub struct DuelLootRecord {
    pub duel_id: Pubkey,      // 32
    pub winner: Pubkey,       // 32
    pub loser: Pubkey,        // 32
    pub loser_field: [u8; 5], // 5  — the 5 card IDs loser had on field
    pub stolen_card_id: u8,   // 1  — winner's prize
    pub bump: u8,             // 1
}

impl DuelLootRecord {
    pub const SEED: &'static [u8] = b"duel_loot";
    // 8 disc + 32 + 32 + 32 + 5 + 1 + 1
    pub const SIZE: usize = 8 + 32 + 32 + 32 + 5 + 1 + 1;
}

// ─── GoldHallRecord PDA ────────────────────────────────────────────────────────
// Seeds: ["gold_hall", duel_id.as_ref()]
// Created (init) on first and only successful record_gold_hall_win call.
// Its existence prevents the same duel from being reported twice.
#[account]
pub struct GoldHallRecord {
    pub duel_id: Pubkey, // 32
    pub winner: Pubkey,  // 32
    pub bump: u8,        // 1
}

impl GoldHallRecord {
    pub const SEED: &'static [u8] = b"gold_hall";
    // 8 disc + 32 + 32 + 1
    pub const SIZE: usize = 8 + 32 + 32 + 1;
}

// ─── CardMintRecord PDA ────────────────────────────────────────────────────────
// Seeds: ["card_mint_record", card_mint.as_ref()]
// Created (init) by admin when an NFT card is minted via the oxark-cards program.
// burn_card reads rarity from this PDA instead of trusting the caller (C5 fix).
#[account]
pub struct CardMintRecord {
    pub card_mint: Pubkey, // 32
    pub card_id: u8,       // 1
    pub rarity: u8,        // 1  — 0=Common, 1=Uncommon, 2=Rare, 3=Legendary
    pub bump: u8,          // 1
}

impl CardMintRecord {
    pub const SEED: &'static [u8] = b"card_mint_record";
    // 8 disc + 32 + 1 + 1 + 1
    pub const SIZE: usize = 8 + 32 + 1 + 1 + 1;
}

#[event]
pub struct HandCommitted {
    pub duel_id: Pubkey,
    pub player: Pubkey,
    pub round: u8,
    pub commitment: [u8; 32],
}

#[event]
pub struct HandRevealed {
    pub duel_id: Pubkey,
    pub player: Pubkey,
    pub round: u8,
    pub card_ids: [u64; 10],
}

// ─── v3.0-plus: Imprint System ───────────────────────────────────────────────

/// Imprint types recorded permanently on an NFT's battle history.
/// Order determines Borsh index (0=None, 1=Veteran, ..., 11=PerfectRecord).
/// Keep in this exact order — changing it is a breaking schema change.
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, Debug, Default)]
#[repr(u8)]
pub enum ImprintKey {
    #[default]
    None, // 0
    // Stat Imprints
    Veteran,    // 1  +1 BP permanent (10 cumulative wins)
    Elder,      // 2  +1 HP permanent (50 cumulative wins)
    Kingslayer, // 3  +2 BP vs Legendary only
    Burner,     // 4  Burn energy cost −1
    Evolved,    // 5  Dual On-Summon from parent lineage
    // Cosmetic Imprints (is_cosmetic = true, value = 0)
    ElderFrame,      // 6  gold card frame
    KingslayerCrest, // 7 crown icon on card
    LineageMark,     // 8  lineage icon (≥3 previous owners)
    EvolvedHalo,     // 9  ambient glow (Evolve origin)
    AshMark,         // 10 ash stripe (Burn ×10)
    PerfectRecord,   // 11 ripple effect (10-win streak)
}

impl From<u8> for ImprintKey {
    fn from(v: u8) -> Self {
        match v {
            1 => Self::Veteran,
            2 => Self::Elder,
            3 => Self::Kingslayer,
            4 => Self::Burner,
            5 => Self::Evolved,
            6 => Self::ElderFrame,
            7 => Self::KingslayerCrest,
            8 => Self::LineageMark,
            9 => Self::EvolvedHalo,
            10 => Self::AshMark,
            11 => Self::PerfectRecord,
            _ => Self::None,
        }
    }
}

/// Single imprint entry — 22 bytes (fixed-size).
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, Debug, Default)]
pub struct Imprint {
    pub key: u8,    // ImprintKey enum value
    pub value: i32, // stat delta (0 for cosmetic)
    pub is_cosmetic: bool,
    pub acquired_at: i64,
    pub duel_id: u64,
}

impl Imprint {
    pub const SIZE: usize = 1 + 4 + 1 + 8 + 8; // 22
}

// ─── v3.0-plus: Steal-Lease System ───────────────────────────────────────────

/// Steal type determines ownership transfer semantics.
/// LEASE_DURATION_SEC = 1800 (30 min, ≈3 duels); set via constant below.
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, Debug)]
pub enum StealType {
    Lease,     // temporary (auto-return after LEASE_DURATION_SEC)
    Ransom,    // win to keep, lose to return
    HandPeek,  // Gold Hall only, permanent
    Legendary, // Gold Hall Legendary kill, permanent
}

pub const LEASE_DURATION_SEC: i64 = 1800;

// ─── T-D13-A: CardBattleHistory PDA ──────────────────────────────────────────

/// Per-NFT battle statistics PDA (v3.0-plus extended).
/// Seed: ["card_battle_history", card_mint]
/// v3.0-plus: added burn/evolve/imprint/lease fields at end.
/// Devnet: existing PDAs must be closed and re-initted post-deploy (r0ze approved).
#[account]
pub struct CardBattleHistory {
    // ── original fields (Day 13) ──────────────────────────────────────────
    pub card_mint: Pubkey,            // 32
    pub wins: u32,                    // 4
    pub losses: u32,                  // 4
    pub kos: u32,                     // 4  — enemies destroyed
    pub dmg_dealt: u64,               // 8  — cumulative BP damage
    pub times_summoned: u32,          // 4
    pub owners_history: [Pubkey; 10], // 320 — ring buffer (index 0 = most recent)
    pub owners_history_len: u8,       // 1
    pub owners_dropped_count: u32,    // 4
    pub acquisition_source: u8,       // 1   — 0=mint,1=shop,2=duel_won,3=p2p_trade
    pub current_owner_since: i64,     // 8
    pub created_at: i64,              // 8
    pub bump: u8,                     // 1
    // ── v3.0-plus additions ───────────────────────────────────────────────
    pub burn_count: u32,          // 4  — Burn abilities this card has triggered
    pub souls_collected: u32,     // 4  — Soul-Binder soul accumulator
    pub legendary_kills: u32,     // 4  — Kingslayer trigger counter
    pub imprints: [Imprint; 5],   // 110 — max 5 imprints (rarity-gated)
    pub imprint_count: u8,        // 1
    pub evolved_from_a: Pubkey,   // 32 — parent A mint (zero if not evolved)
    pub evolved_from_b: Pubkey,   // 32 — parent B mint (zero if not evolved)
    pub is_evolved: bool,         // 1
    pub lease_expires_at: i64,    // 8  — 0 if no active lease
    pub lease_returns_to: Pubkey, // 32 — original owner pubkey during lease
    pub has_active_lease: bool,   // 1
}

impl CardBattleHistory {
    pub const CARD_BATTLE_HISTORY_SEED: &'static [u8] = b"card_battle_history";

    // Original 407 + new 229 = 636 bytes total
    pub const LEN: usize = 8          // discriminator
        + 32 + 4 + 4 + 4 + 8 + 4  // card_mint, wins, losses, kos, dmg_dealt, times_summoned
        + (32 * 10) + 1 + 4 + 1 + 8 + 8 + 1  // owners_history, len, dropped, source, since, created_at, bump
        // v3.0-plus
        + 4 + 4 + 4                            // burn_count, souls_collected, legendary_kills
        + (Imprint::SIZE * 5) + 1              // imprints[5], imprint_count
        + 32 + 32 + 1                          // evolved_from_a/b, is_evolved
        + 8 + 32 + 1; // lease_expires_at, lease_returns_to, has_active_lease

    /// Max stat imprints by rarity (0=Common, 1=Uncommon, 2=Rare, 3=Legendary).
    pub fn max_stat_imprints(rarity: u8) -> usize {
        match rarity {
            crate::constants::RARITY_RARE => 4,
            crate::constants::RARITY_LEGENDARY => 5,
            _ => 3,
        }
    }

    /// Check if a lease is active and expired; caller should handle the return transfer.
    pub fn lease_is_expired(&self, now: i64) -> bool {
        self.has_active_lease && self.lease_expires_at > 0 && now >= self.lease_expires_at
    }

    /// Lazy-init guard for `init_if_needed` handlers: sets the identity fields
    /// exactly once, when the account is still zero-initialized. Safe to call
    /// on every write path that may create the PDA.
    pub fn ensure_initialized(&mut self, card_mint: Pubkey, now: i64, bump: u8) {
        if self.card_mint == Pubkey::default() {
            self.card_mint = card_mint;
            self.created_at = now;
            self.bump = bump;
        }
    }
}

// T-D13-A4: events
#[event]
pub struct CardBattleHistoryUpdated {
    pub card_mint: Pubkey,
    pub wins: u32,
    pub losses: u32,
    pub kos: u32,
    pub dmg_dealt: u64,
}

// ─── v3.0-plus: SeasonStats PDA ──────────────────────────────────────────────

/// Aggregate season-level burn/evolve/steal counters.
/// Seed: ["season_stats", season_id_le]
#[account]
#[derive(Default)]
pub struct SeasonStats {
    pub season_id: u32,
    pub total_burned: u32,
    pub total_minted: u32,
    pub total_evolved: u32,
    pub total_stolen: u32,
    pub bump: u8,
}

impl SeasonStats {
    pub const SEASON_STATS_SEED: &'static [u8] = b"season_stats";
    // 8 disc + 4 + 4 + 4 + 4 + 4 + 1 = 29
    pub const LEN: usize = 8 + 4 + 4 + 4 + 4 + 4 + 1;
}

// ─── v3.0-plus: events ───────────────────────────────────────────────────────

#[event]
pub struct CardBurnedEvent {
    pub card_mint: Pubkey,
    pub owner: Pubkey,
    pub rarity: u8,
    pub timestamp: i64,
}

#[event]
pub struct CardEvolvedEvent {
    pub parent_a: Pubkey,
    pub parent_b: Pubkey,
    pub child_mint: Pubkey,
    pub target_species_id: u16,
    pub cumulative_wins: u32,
    pub timestamp: i64,
}

#[event]
pub struct ImprintGrantedEvent {
    pub card_mint: Pubkey,
    pub imprint_key: u8,
    pub is_cosmetic: bool,
    pub duel_id: u64,
    pub timestamp: i64,
}

#[event]
pub struct LeaseStealEvent {
    pub card_mint: Pubkey,
    pub from: Pubkey,
    pub to: Pubkey,
    pub expires_at: i64,
    pub timestamp: i64,
}

#[event]
pub struct LeaseReturnedEvent {
    pub card_mint: Pubkey,
    pub returned_to: Pubkey,
    pub returned_from: Pubkey,
    pub timestamp: i64,
}

#[event]
pub struct CardOwnerChanged {
    pub card_mint: Pubkey,
    pub old_owner: Pubkey,
    pub new_owner: Pubkey,
    pub source: u8,
    pub timestamp: i64,
}

// ─── T-D15-A: Season Champion / Prize Pool ────────────────────────────────────

#[event]
pub struct ChampionDeclared {
    pub season_id: u32,
    pub champion: Pubkey,
    pub timestamp: i64,
}

#[event]
pub struct PrizePoolDistributed {
    pub season_id: u32,
    pub total_lamports: u64,
    pub champion_share: u64,
}

// ─── T-D15-B: Legendary Supply PDA ───────────────────────────────────────────

/// Per-season Legendary supply PDA.
/// Seed: ["legendary_supply", season_id.to_le_bytes()]
/// Tracks 4 Legendary species: Sceptre(0), Nameless Blade(1), Elyon Crown(2), Kingmaker's Ring(3)
#[account]
#[derive(Default)]
pub struct LegendarySupply {
    pub season_id: u64,
    /// minted[i] = how many of species i have been minted (0-10)
    pub minted: [u8; 4],
    /// cap[i]    = max allowed per species per season (default 10)
    pub cap: [u8; 4],
    pub bump: u8,
}

impl LegendarySupply {
    pub const LEGENDARY_SUPPLY_SEED: &'static [u8] = b"legendary_supply";
    /// 8 disc + 8 season_id + 4 minted + 4 cap + 1 bump
    pub const LEN: usize = 8 + 8 + 4 + 4 + 1;
    /// Species indices
    pub const SPECIES_SCEPTRE: u8 = 0;
    pub const SPECIES_BLADE: u8 = 1;
    pub const SPECIES_CROWN: u8 = 2;
    pub const SPECIES_RING: u8 = 3;
    pub const SPECIES_NAMES: [&'static str; 4] = [
        "Sceptre of Valerius",
        "Nameless Blade",
        "Elyon Crown",
        "Kingmaker's Ring",
    ];
}

// ─── T-D15-B: PlayerDuelStats PDA ─────────────────────────────────────────────

/// Per-player duel statistics for current season.
/// Separate from PlayerRegistry to avoid size extension migration issues.
/// Seed: ["player_duel_stats", player_pubkey]
#[account]
#[derive(Default)]
pub struct PlayerDuelStats {
    pub player: Pubkey,
    pub gold_hall_wins_current_season: u32,
    pub legendary_claims_current_season: u32,
    pub total_duels_won: u32,
    pub total_duels_lost: u32,
    pub current_season_id: u32,
    pub bump: u8,
}

impl PlayerDuelStats {
    pub const PLAYER_DUEL_STATS_SEED: &'static [u8] = b"player_duel_stats";
    /// 8 disc + 32 + 4 + 4 + 4 + 4 + 4 + 1
    pub const LEN: usize = 8 + 32 + 4 + 4 + 4 + 4 + 4 + 1;
}

#[event]
pub struct LegendaryClaimEarned {
    pub player: Pubkey,
    pub pending_count: u32,
    pub gold_hall_wins: u32,
}

#[event]
pub struct LegendaryClaimed {
    pub player: Pubkey,
    pub season_id: u64,
    pub species_id: u8,
    pub mint_number: u8,
}

// === Phase 15: Game World + Legendary Realtime Judgment ===

/// Global singleton for Season 1 state.
/// PDA seeds: ["game_world"]
#[account]
pub struct GameWorld {
    pub start_timestamp: i64,
    pub end_timestamp: i64,            // start + 14 days
    pub waitlist_close_timestamp: i64, // start - 14 days
    pub total_participants: u32,
    pub total_prize_pool: u64,  // accumulated (lamports)
    pub total_ops_revenue: u64, // accumulated (lamports)
    /// How many players have acquired each Legendary (max 10 each).
    pub legendary_acquired_count: [u8; 6],
    pub winner_60_count: u8,
    /// 0=waitlist, 1=active, 2=ended
    pub game_status: u8,
    /// Tier participant counts (set during finalize_game for claim_prize).
    pub tier2_total_vault: u64, // sum of vault_count for tier-2 players
    pub tier3_total_vault: u64,
    pub tier4_total_vault: u64,
    pub tier5_total_vault: u64,
    pub bump: u8,
    // ── Phase 20-B: Shop config (admin adjustable) ──────────────────────────
    pub ops_treasury: Pubkey,
    pub prize_pool: Pubkey,
    /// Seconds after game_start at which Phase 2 drop rates activate (default 7 days).
    pub shop_phase_threshold_seconds: u64,
    /// Drop rates in ppm (parts per million, out of 1_000_000). u32 required for uncommon (180000).
    pub legendary_drop_rate_phase1: u32, // default 0
    pub legendary_drop_rate_phase2: u32, // default 15000 (1.5%)
    pub rare_drop_rate_phase1: u32,      // default 20000 (2%)
    pub rare_drop_rate_phase2: u32,      // default 25000 (2.5%)
    pub uncommon_drop_rate: u32,         // default 180000 (18%)
    // ── Prize-settlement finalize (YKK season-end tally) ─────────────────────
    /// Highest vault_count seen during finalize (timeout-champion tier).
    pub max_vault: u8,
    /// How many players share `max_vault` (timeout Tier-1 divisor).
    pub max_vault_count: u32,
    /// Participants tallied so far; `end_season_final` requires == total_participants.
    pub finalize_processed: u32,
    /// Last PlayerState owner tallied; the crank must pass strictly-increasing
    /// pubkeys so each participant is counted exactly once across batches.
    pub finalize_cursor: Pubkey,
    // ── YKK-38: prize-pool PDA vault ─────────────────────────────────────────
    /// Bump for the prize-pool PDA (seeds = [b"prize_pool"]). The pool is a
    /// program-owned System account; `claim_prize_v2` signs payouts with this.
    pub prize_pool_bump: u8,
}

impl GameWorld {
    pub const SEED: &'static [u8] = b"game_world";
    /// Seeds for the single prize-pool PDA vault (YKK-38).
    pub const PRIZE_POOL_SEED: &'static [u8] = b"prize_pool";
    // Original: 8 disc + 8+8+8+4+8+8+6+1+1+8+8+8+8+1 = 93
    // Phase 20-B additions: +32+32+8+4+4+4+4+4 = +92 → 185
    // Finalize additions: +1 (max_vault) +4 (max_vault_count) +4 (finalize_processed)
    //                     +32 (finalize_cursor) = +41 → 226
    // YKK-38 addition: +1 (prize_pool_bump) → 227
    pub const SIZE: usize = 8
        + 8
        + 8
        + 8
        + 4
        + 8
        + 8
        + 6
        + 1
        + 1
        + 8
        + 8
        + 8
        + 8
        + 1
        + 32
        + 32
        + 8
        + 4
        + 4
        + 4
        + 4
        + 4
        + 1
        + 4
        + 4
        + 32
        + 1;

    pub const LEGENDARY_MAX_CLAIMANTS: u8 = 10;
    pub const DEPOSIT_LAMPORTS: u64 = 500_000_000; // 0.5 SOL
    pub const PRIZE_POOL_BPS: u64 = 8500; // 85%
    pub const OPS_REVENUE_BPS: u64 = 1500; // 15%
    pub const SEASON_DURATION_SECS: i64 = 14 * 24 * 3600;
    pub const WAITLIST_WINDOW_SECS: i64 = 14 * 24 * 3600;

    // Shop defaults
    pub const DEFAULT_SHOP_PHASE_THRESHOLD: u64 = 7 * 24 * 3600; // 7 days
    pub const DEFAULT_LEGENDARY_RATE_PHASE1: u32 = 0;
    pub const DEFAULT_LEGENDARY_RATE_PHASE2: u32 = 15_000; // 1.5%
    pub const DEFAULT_RARE_RATE_PHASE1: u32 = 20_000; // 2.0%
    pub const DEFAULT_RARE_RATE_PHASE2: u32 = 25_000; // 2.5%
    pub const DEFAULT_UNCOMMON_RATE: u32 = 180_000; // 18.0%

    pub fn is_waitlist_open(&self, now: i64) -> bool {
        self.game_status == 0 && now < self.waitlist_close_timestamp
    }

    /// Proportional tier band for a vault_count: 2/3/4/5. (Band 1 = the 60-card
    /// or timeout-champion tier, handled separately.) `vault_count` is assumed > 0.
    pub fn band_of(vault_count: u64) -> u8 {
        if vault_count >= 60 {
            1
        } else if vault_count >= 50 {
            2
        } else if vault_count >= 30 {
            3
        } else if vault_count >= 10 {
            4
        } else {
            5
        }
    }
}

impl Default for GameWorld {
    fn default() -> Self {
        Self {
            start_timestamp: 0,
            end_timestamp: 0,
            waitlist_close_timestamp: 0,
            total_participants: 0,
            total_prize_pool: 0,
            total_ops_revenue: 0,
            legendary_acquired_count: [0u8; 6],
            winner_60_count: 0,
            game_status: 0,
            tier2_total_vault: 0,
            tier3_total_vault: 0,
            tier4_total_vault: 0,
            tier5_total_vault: 0,
            bump: 0,
            ops_treasury: Pubkey::default(),
            prize_pool: Pubkey::default(),
            shop_phase_threshold_seconds: GameWorld::DEFAULT_SHOP_PHASE_THRESHOLD,
            legendary_drop_rate_phase1: GameWorld::DEFAULT_LEGENDARY_RATE_PHASE1,
            legendary_drop_rate_phase2: GameWorld::DEFAULT_LEGENDARY_RATE_PHASE2,
            rare_drop_rate_phase1: GameWorld::DEFAULT_RARE_RATE_PHASE1,
            rare_drop_rate_phase2: GameWorld::DEFAULT_RARE_RATE_PHASE2,
            uncommon_drop_rate: GameWorld::DEFAULT_UNCOMMON_RATE,
            max_vault: 0,
            max_vault_count: 0,
            finalize_processed: 0,
            finalize_cursor: Pubkey::default(),
            prize_pool_bump: 0,
        }
    }
}

// ── Phase 20-B: Shop Events ──────────────────────────────────────────────────

#[event]
pub struct PackOpenedEvent {
    pub buyer: Pubkey,
    pub pack_type: u8,
    pub card_ids: Vec<u8>,
    pub slot: u64,
}

#[event]
pub struct GameParamsUpdatedEvent {
    pub legendary_rate_phase1: u32,
    pub legendary_rate_phase2: u32,
    pub rare_rate_phase1: u32,
    pub rare_rate_phase2: u32,
    pub uncommon_rate: u32,
    pub threshold_seconds: u64,
}

/// Emitted when a player acquires a Legendary card (realtime judgment).
#[event]
pub struct LegendaryAcquired {
    pub player: Pubkey,
    pub legendary_id: u8,  // card id (10, 20, 30, 40, 50, 60)
    pub legendary_idx: u8, // 0-5 (index into legendary_acquired_count)
    pub claimant_num: u8,  // which claimant (1-10)
    pub timestamp: i64,
}

/// Legendary IDs by index (0-5).
pub const LEGENDARY_CARD_IDS: [u8; 6] = [10, 20, 30, 40, 50, 60];

// ── Phase 20-C: Trade Floor ──────────────────────────────────────────────────

/// Active trade listing PDA. Card is escrowed (removed from seller vault on creation).
/// Seeds: ["trade", seller_pubkey, card_id_byte]
#[account]
pub struct TradeListing {
    pub seller: Pubkey,  // 32
    pub card_id: u8,     // 1
    pub price: u64,      // 8
    pub created_at: i64, // 8
    pub active: bool,    // 1
}

impl TradeListing {
    pub const TRADE_SEED: &'static [u8] = b"trade";
    // 8 disc + 32 + 1 + 8 + 8 + 1 = 58
    pub const SIZE: usize = 8 + 32 + 1 + 8 + 8 + 1;
}

impl Default for TradeListing {
    fn default() -> Self {
        Self {
            seller: Pubkey::default(),
            card_id: 0,
            price: 0,
            created_at: 0,
            active: false,
        }
    }
}

#[event]
pub struct ListingCreatedEvent {
    pub seller: Pubkey,
    pub card_id: u8,
    pub price: u64,
    pub slot: u64,
}

#[event]
pub struct ListingCancelledEvent {
    pub seller: Pubkey,
    pub card_id: u8,
    pub slot: u64,
}

#[event]
pub struct ListingAcceptedEvent {
    pub buyer: Pubkey,
    pub seller: Pubkey,
    pub card_id: u8,
    pub price: u64,
    pub slot: u64,
}

/// ZK proof record — created on first successful verify, prevents replay.
///
/// PDA seeds: ["zk_proof", duel_pda_pubkey, round_le, signer_pubkey]
#[account]
pub struct ZkProofRecord {
    pub duel_id: Pubkey,
    pub round: u64,
    pub signer: Pubkey,
    pub commit: [u8; 32],
    pub verified_at: u64,
    pub bump: u8,
}

impl ZkProofRecord {
    pub const SEED: &'static [u8] = b"zk_proof";
    // 8 disc + 32 + 8 + 32 + 32 + 8 + 1
    pub const SIZE: usize = 8 + 32 + 8 + 32 + 32 + 8 + 1;
}

/// Per-(duel, player) settlement ledger for `settle_duel_history`.
///
/// Prevents the same duel from crediting a player's card history more than once
/// per card species: bit `card_id` of `settled_bitmap` is set on settlement.
/// Created lazily (init_if_needed) on the player's first settle call for a duel.
///
/// PDA seeds: ["duel_settle", duel_id, player]
#[account]
pub struct DuelSettleRecord {
    /// Duel this record belongs to (defense-in-depth vs seed confusion).
    pub duel_id: Pubkey,
    /// Player whose settlements this record tracks.
    pub player: Pubkey,
    /// Bit `i` set ⇔ card_id `i` already settled for this (duel, player).
    /// Card ids are 0..59, so a single u64 covers the full catalog.
    pub settled_bitmap: u64,
    pub bump: u8,
}

impl DuelSettleRecord {
    pub const SEED: &'static [u8] = b"duel_settle";
    // 8 disc + 32 + 32 + 8 + 1
    pub const SIZE: usize = 8 + 32 + 32 + 8 + 1;
}

/// Emitted by `settle_duel_history` for each card credited.
#[event]
pub struct DuelHistorySettled {
    pub duel_id: Pubkey,
    pub player: Pubkey,
    pub card_mint: Pubkey,
    pub card_id: u8,
    /// true = credited as a win, false = credited as a loss (draws credit neither).
    pub won: bool,
}

/// Emitted by `claim_timeout_win` when a stalled duel is force-ended.
#[event]
pub struct DuelTimeoutClaimed {
    pub duel_id: Pubkey,
    pub winner: Pubkey,
    pub loser: Pubkey,
    /// Round the duel was stuck on when claimed.
    pub round: u8,
    /// Seconds the duel had been stalled when claimed.
    pub stalled_for: i64,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn game_player_index_only_scans_joined_slots() {
        let p1 = Pubkey::new_unique();
        let p2 = Pubkey::new_unique();
        let ghost = Pubkey::new_unique();
        let game = Game {
            player_count: 2,
            players: [p1, p2, ghost], // slot 2 not joined (player_count = 2)
            ..Game::default()
        };

        assert_eq!(game.player_index(&p1), Some(0));
        assert_eq!(game.player_index(&p2), Some(1));
        assert_eq!(
            game.player_index(&ghost),
            None,
            "slots beyond player_count must be ignored"
        );
        assert!(game.is_participant(&p2));
        assert!(!game.is_participant(&ghost));
    }

    #[test]
    fn game_player_index_ignores_default_pubkey_slots() {
        let game = Game::default(); // player_count = 0, all slots default
        assert_eq!(game.player_index(&Pubkey::default()), None);
        assert!(!game.is_participant(&Pubkey::default()));
    }
}

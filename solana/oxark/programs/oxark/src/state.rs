use anchor_lang::prelude::*;

/// Card types (1-indexed, 0 = empty)
/// 1=Aegis (Crystal Knight), 2=Umbra (Shadow Rogue), 3=Ignis (Fire Beast), 4=Tempest (Storm Prophet), 5=Nihil (Void Observer)
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, Debug)]
#[derive(Default)]
pub enum GameStatus {
    #[default]
    Lobby,
    CommitPhase,
    RevealPhase,
    Finished,
}


/// Action types for commit-reveal
/// 0=None, 1=Draw, 2=Steal, 3=Barrier, 4=Scout,
/// 5=UseCrystal, 6=UseShadow, 7=UseFlame, 8=UseStorm, 9=UseVoid
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
        match v { 1 => Area::Forest, 2 => Area::Ruins, _ => Area::Port }
    }
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, Debug)]
pub enum ActionType {
    None,
    Draw,
    Steal,
    Barrier,
    Scout,
    Move,         // NEW: move to adjacent area
    UseCrystal,
    UseShadow,
    UseFlame,
    UseStorm,
    UseVoid,
}

impl From<u8> for ActionType {
    fn from(v: u8) -> Self {
        match v {
            1 => ActionType::Draw,
            2 => ActionType::Steal,
            10 => ActionType::Move,
            3 => ActionType::Barrier,
            4 => ActionType::Scout,
            5 => ActionType::UseCrystal,
            6 => ActionType::UseShadow,
            7 => ActionType::UseFlame,
            8 => ActionType::UseStorm,
            9 => ActionType::UseVoid,
            _ => ActionType::None,
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
}

impl Game {
    pub const SIZE: usize = 8 + 8 + 32 + 1 + 1 + 1 + 1 + 1 + 1 + 32 + 1 + 1 + 1;
}

#[account]
#[derive(Default)]
pub struct PlayerState {
    pub game_id: u64,
    pub player: Pubkey,
    pub player_index: u8,
    pub area: u8,  // 0=Port, 1=Forest, 2=Ruins
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
}

impl PlayerState {
    // Original fields: 8 (disc) + 8 (game_id) + 32 (player) + 1 (index) + 1 (area)
    //   + 5 (cards) + 1 (card_count) + 1 (steal) + 1 (barrier) + 1 (scout)
    //   + 1 (committed) + 1 (revealed) + 1 (revealed_action) + 32 (revealed_target)
    //   + 1 (move_target) + 40 (card_timestamps: 5 * i64) + 1 (bump)
    //   + 32 (position_commitment) + 1 (position_commitment_initialized)
    //   + 1 (Option discriminant) + 32 (Pubkey in Option<Pubkey>)
    //   NOTE: existing devnet PlayerState accounts need migration (pre-approved by r0ze, Day 4).
    pub const SIZE: usize = 8 + 8 + 32 + 1 + 1 + 5 + 1 + 1 + 1 + 1 + 1 + 1 + 1 + 32 + 1 + 40 + 1 + 32 + 1 + 1 + 32;
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
    pub game_id:    u64,
    pub player:     Pubkey,
    pub round:      u8,
    /// Poseidon(card_id, salt) — 32-byte big-endian field element.
    pub commitment: [u8; 32],
    /// Set to true after reveal_card verifies the ZK proof.
    pub revealed:   bool,
    /// 0 until reveal phase; populated after valid reveal.
    pub card_id:    u8,
    pub bump:       u8,
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
    pub owner:            Pubkey,
    /// Card IDs in deck (0 = empty slot). Always exactly 20 entries.
    pub deck_cards:       [u8; 20],
    pub card_count:       u8,
    /// Unix timestamp until which the deck is locked (0 = not locked).
    pub locked_until:     i64,
    pub last_modified:    i64,
    pub bump:             u8,
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
    pub season_id:         u32,
    pub participant_count: u32,
    /// Max mintable cards per tier [C, B, A, S, SS]
    pub supply:            [u32; 5],
    /// Cards minted per tier so far
    pub minted:            [u32; 5],
    /// true when a tier's supply is exhausted
    pub exhausted:         [bool; 5],
    pub bump:              u8,
}

impl SeasonCardSupply {
    // 8 disc + 4 season_id + 4 participant + 5*4 supply + 5*4 minted + 5 exhausted + 1 bump
    pub const SIZE: usize = 8 + 4 + 4 + 20 + 20 + 5 + 1;

    /// Compute initial supply for N participants.
    pub fn compute_supply(n: u32) -> [u32; 5] {
        [
            (n * 16).max(8),                     // C: 16×N, min 8
            ((n * 5) / 2).max(4),                // B: 2.5×N, min 4
            ((n * 2) / 5).max(2),                // A: 0.4×N, min 2
            (n / 20).max(1),                     // S: 0.05×N, min 1
            1,                                   // SS: always 1 per season
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
    pub owner:        Pubkey,
    pub combo_count:  u8,    // current consecutive SUPER EFFECTIVE streak
    pub max_combo:    u8,    // all-time max combo this player has reached
    pub xp_2x_flag:   bool,  // true when combo hit 7+ (next battle XP doubled)
    pub bump:         u8,
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
        if count >= 7 { 7 } else if count >= 5 { 5 } else if count >= 3 { 3 } else { 0 }
    }
}

// === T98: XP + Level System ===

/// Per-player XP and level progression.
/// xpForLevel(n) = floor((n-1)*n*55), 60 levels.
/// PDA seeds: ["player_level", player_pubkey]
#[account]
#[derive(Default)]
pub struct PlayerLevel {
    pub owner:       Pubkey,
    pub xp_total:    u64,
    pub level:       u8,   // 1-60
    pub bump:        u8,
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
            if xp < Self::xp_for_level(lv + 1) { break; }
            lv += 1;
        }
        lv
    }
}

// XP reward constants (matches client XP_REWARDS)
pub const XP_BATTLE_WIN:       u64 = 50;
pub const XP_BATTLE_LOSS:      u64 = 15;
pub const XP_CARD_COLLECT:     u64 = 10;
pub const XP_SUPER_EFFECTIVE:  u64 = 20;
pub const XP_ZK_CYCLE:         u64 = 30;
pub const XP_DEATHRATTLE:      u64 = 15;
pub const XP_CHAIN:            u64 = 15;

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
    pub owner:    Pubkey,
    pub flags:    u16,   // bitmask, bit i = achievement i unlocked
    pub bump:     u8,
}

impl PlayerAchievements {
    // 8 disc + 32 owner + 2 flags + 1 bump
    pub const SIZE: usize = 8 + 32 + 2 + 1;

    pub fn is_unlocked(&self, idx: u8) -> bool {
        idx < 16 && (self.flags & (1u16 << idx)) != 0
    }

    pub fn unlock(&mut self, idx: u8) -> bool {
        if idx >= 16 || self.is_unlocked(idx) { return false; }
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
    pub owner:    Pubkey,
    pub equipped: u8,    // 0-7, currently equipped title index
    pub unlocked: u8,    // bitmask, bit i = title i available (always has bit 0)
    pub bump:     u8,
}

impl PlayerTitle {
    // 8 disc + 32 owner + 1 equipped + 1 unlocked + 1 bump
    pub const SIZE: usize = 8 + 32 + 1 + 1 + 1;

    pub fn is_title_unlocked(&self, idx: u8) -> bool {
        idx < 8 && (self.unlocked & (1u8 << idx)) != 0
    }

    pub fn unlock_title(&mut self, idx: u8) -> bool {
        if idx >= 8 || self.is_title_unlocked(idx) { return false; }
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
    pub tier:       u8,         // 0=Bronze, 1=Silver, 2=Gold
    pub season:     u16,        // current season number
    pub players:    Vec<Pubkey>, // FIFO, max 64
    pub created_at: i64,
    pub bump:       u8,
}

impl MatchmakingQueue {
    pub const MAX_PLAYERS: usize = 64;
    // 8 disc + 1 tier + 2 season + 4 (vec len prefix) + 64*32 (players) + 8 created_at + 1 bump
    pub const SIZE: usize = 8 + 1 + 2 + 4 + (Self::MAX_PLAYERS * 32) + 8 + 1;
}

impl Default for MatchmakingQueue {
    fn default() -> Self {
        Self {
            tier:       0,
            season:     1,
            players:    Vec::new(),
            created_at: 0,
            bump:       0,
        }
    }
}

/// Emitted when a matchmaking queue slot reaches 2 players.
#[event]
pub struct QueueMatchReady {
    pub tier:     u8,
    pub season:   u16,
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
    pub card_mint:          Pubkey,
    pub owner:              Pubkey,
    pub shards_found:       [bool; 3],
    pub unlock_timestamps:  [i64; 3],
    pub bump:               u8,
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
            card_mint:         Pubkey::default(),
            owner:             Pubkey::default(),
            shards_found:      [false; 3],
            unlock_timestamps: [0i64; 3],
            bump:              0,
        }
    }
}

/// Emitted when a lore shard is unlocked for a card.
#[event]
pub struct LoreShardUnlocked {
    pub card_mint:   Pubkey,
    pub owner:       Pubkey,
    pub shard_index: u8,
    pub method:      u8,   // 0=auto, 1=condition_met, 2=x402_payment
    pub timestamp:   i64,
}

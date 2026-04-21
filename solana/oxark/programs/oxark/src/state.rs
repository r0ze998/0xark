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
}

impl PlayerState {
    // Original fields: 8 (disc) + 8 (game_id) + 32 (player) + 1 (index) + 1 (area)
    //   + 5 (cards) + 1 (card_count) + 1 (steal) + 1 (barrier) + 1 (scout)
    //   + 1 (committed) + 1 (revealed) + 1 (revealed_action) + 32 (revealed_target)
    //   + 1 (move_target) + 40 (card_timestamps: 5 * i64) + 1 (bump)
    //   + 32 (position_commitment) + 1 (position_commitment_initialized)
    pub const SIZE: usize = 8 + 8 + 32 + 1 + 1 + 5 + 1 + 1 + 1 + 1 + 1 + 1 + 1 + 32 + 1 + 40 + 1 + 32 + 1;
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
}

impl CommitAction {
    pub const SIZE: usize = 8 + 8 + 1 + 32 + 32 + 1;
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
/// Composition rules (validated in save_deck):
///   - total cost cap ≤ 30 points (Legendary=5, Rare=2, Common=1)
///   - Legendary cards ≤ 2
///   - Rare cards ≤ 6
///   - Common cards ≥ 12
#[account]
pub struct PlayerDeck {
    pub owner:         Pubkey,
    /// Card IDs in deck (0 = empty slot). Supports up to 20 cards.
    pub deck_cards:    [u8; 20],
    pub card_count:    u8,
    /// Unix timestamp until which the deck is locked (0 = not locked).
    pub locked_until:  i64,
    pub last_modified: i64,
    pub bump:          u8,
}

impl PlayerDeck {
    // 8 disc + 32 owner + 20 cards + 1 count + 8 locked + 8 modified + 1 bump
    pub const SIZE: usize = 8 + 32 + 20 + 1 + 8 + 8 + 1;
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

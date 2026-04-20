/// State types mirrored from the main oxark program.
/// Discriminators are identical because Anchor uses sha256("account:<TypeName>")[..8].
/// These are read-only references — oxark-cards never writes to Game or PlayerState.
use anchor_lang::prelude::*;

// ─── T61: Card Metadata ──────────────────────────────────────────────────────
//
// 3-tier rarity (CARD_SYSTEM_DESIGN.md §2):
//   0 = Common    (r1–r2, drop rate 70%)
//   1 = Rare      (r3–r4, drop rate 25%)
//   2 = Legendary (r5,    drop rate  5%)
//
// 4-axis stats (§3):
//   power:    1–10  — effect magnitude
//   speed:    1–5   — resolve_round priority
//   cost:     0–3   — SOL lamport tier to play
//   duration: 1–3   — rounds the effect persists
//
// CardMetadata is a PDA: seeds = ["card_meta", card_id_le_u8]
// One account per card template (60 total), initialized by program authority.
// Migration: existing games are not affected — these are lookup accounts only.

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, Debug, Default)]
pub enum CardRarity {
    #[default]
    Common,
    Rare,
    Legendary,
}

#[account]
#[derive(Default)]
pub struct CardMetadata {
    /// Card ID (1–60) — mirrors CD[] index in the frontend
    pub card_id: u8,
    /// 3-tier rarity
    pub rarity: CardRarity,
    /// Effect magnitude (1–10)
    pub power: u8,
    /// resolve_round priority (1–5, 5 = fastest)
    pub speed: u8,
    /// SOL cost tier (0 = free, 1 = 0.001 SOL, 2 = 0.005 SOL, 3 = 0.01 SOL)
    pub cost: u8,
    /// Effect duration in rounds (1–3)
    pub duration: u8,
    pub bump: u8,
}

impl CardMetadata {
    pub const SIZE: usize = 8 + 1 + 1 + 1 + 1 + 1 + 1 + 1; // disc + fields + bump
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, Debug, Default)]
pub enum GameStatus {
    #[default]
    Lobby,
    CommitPhase,
    RevealPhase,
    Finished,
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

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, Debug, Default)]
pub enum ActionType {
    #[default]
    None,
    Draw,
    Steal,
    Barrier,
    Scout,
    Move,
    UseCrystal,
    UseShadow,
    UseFlame,
    UseStorm,
    UseVoid,
}

#[account]
#[derive(Default)]
pub struct PlayerState {
    pub game_id: u64,
    pub player: Pubkey,
    pub player_index: u8,
    pub area: u8,
    pub cards: [u8; 5],
    pub card_count: u8,
    pub steal_count: u8,
    pub barrier_count: u8,
    pub scout_count: u8,
    pub has_committed: bool,
    pub has_revealed: bool,
    pub revealed_action: u8,
    pub revealed_target: Pubkey,
    pub move_target: u8,
    pub card_timestamps: [i64; 5],
    pub bump: u8,
    pub position_commitment: [u8; 32],
    pub position_commitment_initialized: bool,
}

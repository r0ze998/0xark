/// State types mirrored from the main oxark program.
/// Discriminators are identical because Anchor uses sha256("account:<TypeName>")[..8].
/// These are read-only references — oxark-cards never writes to Game or PlayerState.
use anchor_lang::prelude::*;

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

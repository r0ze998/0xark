use anchor_lang::prelude::*;

/// Card types (1-indexed, 0 = empty)
/// 1=Crystal, 2=Shadow, 3=Flame, 4=Storm, 5=Void
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, Debug)]
pub enum GameStatus {
    Lobby,
    CommitPhase,
    RevealPhase,
    Finished,
}

impl Default for GameStatus {
    fn default() -> Self {
        GameStatus::Lobby
    }
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
    pub bump: u8,
}

impl PlayerState {
    pub const SIZE: usize = 8 + 8 + 32 + 1 + 1 + 5 + 1 + 1 + 1 + 1 + 1 + 1 + 1 + 32 + 1 + 1;
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

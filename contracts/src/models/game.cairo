use starknet::ContractAddress;

#[derive(Serde, Copy, Drop, Introspect, PartialEq, Debug, DojoStore, Default)]
pub enum GameStatus {
    #[default]
    Lobby,
    CommitPhase,
    RevealPhase,
    Resolving,
    Finished,
}

#[derive(Copy, Drop, Serde, Debug)]
#[dojo::model]
pub struct Game {
    #[key]
    pub game_id: u32,
    pub host: ContractAddress,
    pub status: GameStatus,
    pub round: u8,
    pub max_rounds: u8,
    pub player_count: u8,
    pub max_players: u8,
    pub cards_in_pool: u8,
    pub winner: ContractAddress,
    pub commit_count: u8,
    pub reveal_count: u8,
}

#[derive(Copy, Drop, Serde, Debug)]
#[dojo::model]
pub struct GamePlayer {
    #[key]
    pub game_id: u32,
    #[key]
    pub index: u8,
    pub address: ContractAddress,
}

#[derive(Copy, Drop, Serde, Debug)]
#[dojo::model]
pub struct GameCounter {
    #[key]
    pub id: u32, // always 1
    pub next_game_id: u32,
}

// Constants
pub const TOTAL_CARD_TYPES: u8 = 5;
pub const CARDS_PER_TYPE: u8 = 3;
pub const TOTAL_CARDS: u8 = 15;
pub const MAX_ROUNDS: u8 = 20;
pub const INITIAL_HAND_SIZE: u8 = 2;
pub const INITIAL_STEAL_SPELLS: u8 = 3;
pub const INITIAL_BARRIER_SPELLS: u8 = 2;
pub const INITIAL_SCOUT_SPELLS: u8 = 1;
pub const REVEAL_TIMEOUT_BLOCKS: u64 = 10;

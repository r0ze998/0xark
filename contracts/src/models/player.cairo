use starknet::ContractAddress;

#[derive(Copy, Drop, Serde, Debug)]
#[dojo::model]
pub struct PlayerState {
    #[key]
    pub game_id: u32,
    #[key]
    pub player: ContractAddress,
    pub player_index: u8,
    pub card_count: u8,
    pub steal_count: u8,
    pub barrier_count: u8,
    pub scout_count: u8,
    pub has_committed: bool,
    pub has_revealed: bool,
}

/// Each player has 5 designated card slots (0-4).
/// card_id: 1-5 for the 5 card types, 0 = empty.
#[derive(Copy, Drop, Serde, Debug)]
#[dojo::model]
pub struct PlayerCard {
    #[key]
    pub game_id: u32,
    #[key]
    pub player: ContractAddress,
    #[key]
    pub slot: u8,
    pub card_id: u8,
}

/// Lookup: maps player address to game_id (for finding which game a player is in)
#[derive(Copy, Drop, Serde, Debug)]
#[dojo::model]
pub struct PlayerLookup {
    #[key]
    pub player: ContractAddress,
    pub game_id: u32,
}

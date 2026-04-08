use anchor_lang::prelude::*;

#[constant]
pub const GAME_SEED: &[u8] = b"game";
#[constant]
pub const PLAYER_SEED: &[u8] = b"player";
#[constant]
pub const CARD_POOL_SEED: &[u8] = b"card_pool";
#[constant]
pub const COMMIT_SEED: &[u8] = b"commit";

pub const TOTAL_CARD_TYPES: u8 = 5;
pub const MAX_PLAYERS: u8 = 3;
pub const MAX_ROUNDS: u8 = 30;
pub const NUM_AREAS: u8 = 3; // Port=0, Forest=1, Ruins=2
pub const INITIAL_HAND_SIZE: u8 = 2;

// Area card tables: which card IDs are available in each area
// Port: Crystal(1), Shadow(2)
// Forest: Flame(3), Storm(4)
// Ruins: Void(5), Crystal(1)
pub const AREA_CARDS: [[u8; 2]; 3] = [
    [1, 2], // Port
    [3, 4], // Forest
    [5, 1], // Ruins
];
pub const INITIAL_STEAL_SPELLS: u8 = 3;
pub const INITIAL_BARRIER_SPELLS: u8 = 2;
pub const INITIAL_SCOUT_SPELLS: u8 = 1;

// Cards per type in pool: Crystal=3, Shadow=2, Flame=3, Storm=3, Void=2
pub const CARDS_PER_TYPE: [u8; 5] = [3, 2, 3, 3, 2];
pub const TOTAL_CARDS: u8 = 13;

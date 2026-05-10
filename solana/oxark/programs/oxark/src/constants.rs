use anchor_lang::prelude::*;

// Game admin (program deployer / Season 1 operator)
// DPMPhnVezSq5im35p4w3bC6XjpNZuuvCDVSAVxw4Q28R
pub const ADMIN_PUBKEY: Pubkey = Pubkey::new_from_array([
    184,   6,  19, 220, 138, 154,  47,  19,
    180, 112, 248, 182,  84,  24, 145,  15,
    107, 160,  88,  67, 202,  30, 232,  14,
    241, 152, 239, 100, 147, 100, 240,  26,
]);

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
// ── Phase 20-B: Shop ─────────────────────────────────────────────────────────

pub const PACK_STANDARD: u8 = 0;
pub const PACK_PREMIUM:  u8 = 1;
pub const STANDARD_PACK_PRICE: u64 = 50_000_000;   // 0.05 SOL
pub const PREMIUM_PACK_PRICE:  u64 = 150_000_000;  // 0.15 SOL

// SlotHashes sysvar address bytes (SysvarS1otHashes111111111111111111111111111)
pub const SLOT_HASHES_ID_BYTES: [u8; 32] = [
    6, 167, 213, 23, 25, 47, 10, 175, 198, 242, 101, 227, 251, 119, 204, 122,
    218, 130, 197, 41, 208, 190, 59, 19, 110, 45, 0, 85, 32, 0, 0, 0,
];

// ── Phase 20-C: Trade Floor ──────────────────────────────────────────────────
pub const MIN_LISTING_PRICE: u64 = 1_000_000;  // 0.001 SOL minimum

pub const INITIAL_STEAL_SPELLS: u8 = 3;
pub const INITIAL_BARRIER_SPELLS: u8 = 2;
pub const INITIAL_SCOUT_SPELLS: u8 = 1;

// Cards per type in pool: Crystal=3, Shadow=2, Flame=3, Storm=3, Void=2
pub const CARDS_PER_TYPE: [u8; 5] = [3, 2, 3, 3, 2];
pub const TOTAL_CARDS: u8 = 13;

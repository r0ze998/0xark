use anchor_lang::prelude::*;

// Game admin (program deployer / Season 1 operator)
// DPMPhnVezSq5im35p4w3bC6XjpNZuuvCDVSAVxw4Q28R
pub const ADMIN_PUBKEY: Pubkey = Pubkey::new_from_array([
    184, 6, 19, 220, 138, 154, 47, 19, 180, 112, 248, 182, 84, 24, 145, 15, 107, 160, 88, 67, 202,
    30, 232, 14, 241, 152, 239, 100, 147, 100, 240, 26,
]);

#[constant]
pub const GAME_SEED: &[u8] = b"game";
#[constant]
pub const PLAYER_SEED: &[u8] = b"player";
#[constant]
pub const CARD_POOL_SEED: &[u8] = b"card_pool";
#[constant]
pub const COMMIT_SEED: &[u8] = b"commit";

// Card rarity scale (matches client CARDS[i].rarity and CardMintRecord.rarity)
pub const RARITY_COMMON: u8 = 0;
pub const RARITY_UNCOMMON: u8 = 1;
pub const RARITY_RARE: u8 = 2;
pub const RARITY_LEGENDARY: u8 = 3;

// YKK-45: provenance-gated single-card promotion. Wins a card must have earned to
// promote Common → Uncommon. Placeholder value pending balancing (design v3 §2 / §6).
pub const PROMOTE_COMMON_TO_UNCOMMON_WINS: u32 = 10;

// Higher-tier promotion gates (design v3 §2, たたき台 — all placeholders pending §6).
// Uncommon → Rare: enough wins AND at least one "deep provenance" mark
// (a legendary kill, or having been dropped/stolen from a prior owner).
pub const PROMOTE_UNCOMMON_TO_RARE_WINS: u32 = 25;
// Rare → Legendary: heavy win history AND the card was itself won in a duel
// (acquisition_source == duel_won) AND enough enemies destroyed.
pub const PROMOTE_RARE_TO_LEGENDARY_WINS: u32 = 50;
pub const PROMOTE_RARE_TO_LEGENDARY_KOS: u32 = 30;

// acquisition_source values (mirror CardBattleHistory::acquisition_source encoding:
// 0=mint, 1=shop, 2=duel_won, 3=p2p_trade). Named so the promotion gate isn't a
// bare magic number.
pub const ACQUISITION_DUEL_WON: u8 = 2;

// ── Energy system (YKK-44 anti-whale gate / YKK-43 SOL sink) ─────────────────
// Duel participation is energy-gated so time-invested ≠ pay-to-win: casual and
// hardcore players reach a similar card count. Energy regenerates on a clock and
// can be refilled for SOL (the "buy time back" sink).
/// Max energy a player can hold.
pub const ENERGY_MAX: u8 = 5;
/// Seconds per natural +1 regen (4h → 6/day at full uptime).
pub const ENERGY_REGEN_INTERVAL_SECONDS: i64 = 4 * 60 * 60;
/// Energy consumed to enter one duel (spent once per duel, not per round).
/// (Used by the pending commit_hand duel-entry gate.)
#[allow(dead_code)]
pub const ENERGY_COST_PER_DUEL: u8 = 1;
/// SOL cost to refill energy to full. Placeholder pending YKK-43 balancing
/// (design v3 §6 / economy sim): 0.001–0.01 SOL range → start at 0.003 SOL.
pub const ENERGY_REFILL_COST_LAMPORTS: u64 = 3_000_000;

// Stall timeout: seconds without duel progress (commit/reveal) after which the
// non-stalling participant may call `claim_timeout_win` and take the duel.
// Placeholder pending balancing — long enough for proof generation + network
// hiccups, short enough that a reveal-refuser can't hold the duel hostage.
pub const DUEL_STALL_TIMEOUT_SECONDS: i64 = 600;

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
pub const PACK_PREMIUM: u8 = 1;
pub const STANDARD_PACK_PRICE: u64 = 50_000_000; // 0.05 SOL
pub const PREMIUM_PACK_PRICE: u64 = 150_000_000; // 0.15 SOL

// SlotHashes sysvar address bytes (SysvarS1otHashes111111111111111111111111111)
pub const SLOT_HASHES_ID_BYTES: [u8; 32] = [
    6, 167, 213, 23, 25, 47, 10, 175, 198, 242, 101, 227, 251, 119, 204, 122, 218, 130, 197, 41,
    208, 190, 59, 19, 110, 45, 0, 85, 32, 0, 0, 0,
];

// ── Phase 20-C: Trade Floor ──────────────────────────────────────────────────
pub const MIN_LISTING_PRICE: u64 = 1_000_000; // 0.001 SOL minimum

pub const INITIAL_STEAL_SPELLS: u8 = 3;
pub const INITIAL_BARRIER_SPELLS: u8 = 2;
pub const INITIAL_SCOUT_SPELLS: u8 = 1;

// Cards per type in pool: Crystal=3, Shadow=2, Flame=3, Storm=3, Void=2
pub const CARDS_PER_TYPE: [u8; 5] = [3, 2, 3, 3, 2];
pub const TOTAL_CARDS: u8 = 13;

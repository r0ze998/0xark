// card_data.rs — Static card table (60 cards, Phase 15 v2 design)
// Mirrors solana/client/src/lib/cards.js CARD_DATA and CARD_ABILITIES.
//
// Layout: [id, faction, rarity, bp, hp, ini, action_type, is_legendary]
// AbilityKind encodes the 6 passive effects used by damage_calc.
// Burn abilities are future work (burn_card instruction not yet wired).

/// Faction identifiers (matches JS Faction enum)
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum Faction {
    Knight = 0,
    Merchant = 1,
    Pirate = 2,
    Scholar = 3,
    Monk = 4,
    Engineer = 5,
}

/// ActionType identifiers (matches JS ActionType enum)
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum ActionType {
    UseCrystal = 0,
    Barrier = 1,
    UseFlame = 2,
    UseStorm = 3,
    UseShadow = 4,
    UseVoid = 5,
}

/// Passive ability variants (6 Rare cards, one per faction)
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum PassiveAbility {
    KnightAura,          // id  9: other Knight cards +1 BP
    MerchantGoldAura,    // id 19: own cards +1 BP when any Legendary present
    PirateIntimidate,    // id 29: opposing card same slot -3 HP pre-combat
    ScholarImprintScale, // id 39: +1 BP per stat imprint (max 3)
    MonkSoulHarvest,     // id 49: all own cards gain barrierUp
    EngineerOverclock,   // id 59: own Engineer cards +2 BP when 3+ on field
}

#[derive(Clone, Copy, Debug)]
pub struct CardData {
    pub id: u8,
    pub faction: u8, // 0-5
    pub rarity: u8,  // 0=Common 1=Uncommon 2=Rare 3=Legendary
    pub bp: u8,
    pub hp: u8,
    pub ini: u8,
    pub action_type: u8, // 0-5
    pub is_legendary: bool,
    pub passive: Option<PassiveAbility>,
}

// ─── Static card table ────────────────────────────────────────────────────────
// Index 0 is unused (cards are 1-indexed).
// Option<CardData> allows card_by_id(0) → None.

const fn card(
    id: u8,
    faction: u8,
    rarity: u8,
    bp: u8,
    hp: u8,
    ini: u8,
    action_type: u8,
    is_legendary: bool,
    passive: Option<PassiveAbility>,
) -> CardData {
    CardData {
        id,
        faction,
        rarity,
        bp,
        hp,
        ini,
        action_type,
        is_legendary,
        passive,
    }
}

pub static CARDS: [Option<CardData>; 61] = [
    None, // index 0 unused
    // ── Knight (faction=0, id 1-10) ──────────────────────────────────────────
    Some(card(1, 0, 0, 5, 8, 2, 1, false, None)), // Squire
    Some(card(2, 0, 0, 6, 9, 2, 1, false, None)), // Guard
    Some(card(3, 0, 0, 6, 10, 3, 0, false, None)), // Soldier
    Some(card(4, 0, 0, 7, 10, 2, 1, false, None)), // Paladin
    Some(card(5, 0, 0, 7, 11, 3, 0, false, None)), // Champion (burn)
    Some(card(6, 0, 1, 8, 11, 2, 1, false, None)), // Warden
    Some(card(7, 0, 1, 8, 12, 3, 1, false, None)), // Crusader
    Some(card(8, 0, 1, 8, 12, 3, 0, false, None)), // Ironclad
    Some(card(
        9,
        0,
        2,
        8,
        12,
        3,
        5,
        false,
        Some(PassiveAbility::KnightAura),
    )), // Vanguard
    Some(card(10, 0, 3, 8, 12, 3, 1, true, None)), // Sentinel (Legendary)
    // ── Merchant (faction=1, id 11-20) ───────────────────────────────────────
    Some(card(11, 1, 0, 5, 5, 2, 0, false, None)), // Peddler
    Some(card(12, 1, 0, 5, 6, 2, 3, false, None)), // Trader
    Some(card(13, 1, 0, 6, 6, 3, 0, false, None)), // Broker
    Some(card(14, 1, 0, 6, 7, 2, 3, false, None)), // Merchant
    Some(card(15, 1, 0, 7, 7, 3, 0, false, None)), // Banker (burn)
    Some(card(16, 1, 1, 7, 7, 3, 5, false, None)), // Magnifier
    Some(card(17, 1, 1, 8, 8, 2, 0, false, None)), // Speculator
    Some(card(18, 1, 1, 8, 8, 3, 3, false, None)), // Cartel
    Some(card(
        19,
        1,
        2,
        8,
        8,
        3,
        5,
        false,
        Some(PassiveAbility::MerchantGoldAura),
    )), // Monopolist
    Some(card(20, 1, 3, 8, 8, 3, 0, true, None)),  // Magnate (Legendary)
    // ── Pirate (faction=2, id 21-30) ─────────────────────────────────────────
    Some(card(21, 2, 0, 8, 3, 4, 2, false, None)), // Cutthroat
    Some(card(22, 2, 0, 9, 4, 4, 4, false, None)), // Raider
    Some(card(23, 2, 0, 9, 4, 5, 2, false, None)), // Corsair
    Some(card(24, 2, 0, 10, 4, 4, 4, false, None)), // Buccaneer
    Some(card(25, 2, 0, 10, 5, 5, 2, false, None)), // Swashbuckler (burn)
    Some(card(26, 2, 1, 10, 5, 4, 4, false, None)), // Privateer
    Some(card(27, 2, 1, 11, 5, 5, 2, false, None)), // Freebooter
    Some(card(28, 2, 1, 11, 5, 5, 4, false, None)), // Reaver
    Some(card(
        29,
        2,
        2,
        12,
        5,
        5,
        2,
        false,
        Some(PassiveAbility::PirateIntimidate),
    )), // Dreadnaught
    Some(card(30, 2, 3, 12, 5, 5, 4, true, None)), // Marauder (Legendary)
    // ── Scholar (faction=3, id 31-40) ────────────────────────────────────────
    Some(card(31, 3, 0, 3, 5, 4, 5, false, None)), // Apprentice
    Some(card(32, 3, 0, 3, 6, 4, 3, false, None)), // Archivist
    Some(card(33, 3, 0, 4, 6, 5, 5, false, None)), // Mage
    Some(card(34, 3, 0, 4, 7, 4, 3, false, None)), // Sage
    Some(card(35, 3, 0, 5, 7, 5, 5, false, None)), // Wizard (burn)
    Some(card(36, 3, 1, 5, 7, 5, 3, false, None)), // Diviner
    Some(card(37, 3, 1, 5, 8, 4, 5, false, None)), // Arcanist
    Some(card(38, 3, 1, 5, 8, 5, 3, false, None)), // Augur
    Some(card(
        39,
        3,
        2,
        5,
        8,
        5,
        5,
        false,
        Some(PassiveAbility::ScholarImprintScale),
    )), // Seer
    Some(card(40, 3, 3, 5, 8, 5, 5, true, None)),  // Oracle (Legendary)
    // ── Monk (faction=4, id 41-50) ───────────────────────────────────────────
    Some(card(41, 4, 0, 5, 8, 0, 1, false, None)), // Novice
    Some(card(42, 4, 0, 6, 9, 1, 1, false, None)), // Initiate
    Some(card(43, 4, 0, 6, 10, 0, 5, false, None)), // Acolyte
    Some(card(44, 4, 0, 7, 10, 1, 1, false, None)), // Disciple
    Some(card(45, 4, 0, 7, 11, 0, 5, false, None)), // Recluse (burn)
    Some(card(46, 4, 1, 7, 11, 1, 1, false, None)), // Devotee
    Some(card(47, 4, 1, 8, 11, 1, 5, false, None)), // Contemplator
    Some(card(48, 4, 1, 8, 12, 0, 1, false, None)), // Abbot
    Some(card(
        49,
        4,
        2,
        8,
        12,
        1,
        5,
        false,
        Some(PassiveAbility::MonkSoulHarvest),
    )), // Elder
    Some(card(50, 4, 3, 8, 12, 1, 5, true, None)), // Ascetic (Legendary)
    // ── Engineer (faction=5, id 51-60) ───────────────────────────────────────
    Some(card(51, 5, 0, 8, 5, 2, 0, false, None)), // Tinkerer
    Some(card(52, 5, 0, 9, 5, 2, 3, false, None)), // Mechanic
    Some(card(53, 5, 0, 9, 6, 3, 0, false, None)), // Forger
    Some(card(54, 5, 0, 10, 6, 2, 3, false, None)), // Inventor
    Some(card(55, 5, 0, 10, 7, 3, 0, false, None)), // Artisan (burn)
    Some(card(56, 5, 1, 10, 7, 3, 3, false, None)), // Schematic
    Some(card(57, 5, 1, 11, 7, 2, 0, false, None)), // Constructor
    Some(card(58, 5, 1, 11, 8, 3, 3, false, None)), // Machinist
    Some(card(
        59,
        5,
        2,
        12,
        8,
        3,
        0,
        false,
        Some(PassiveAbility::EngineerOverclock),
    )), // Colossus
    Some(card(60, 5, 3, 12, 8, 3, 0, true, None)), // Architect (Legendary)
];

/// Look up a card by ID (1-indexed, 1-60). Returns None for id 0 or out of range.
pub fn card_by_id(id: u8) -> Option<&'static CardData> {
    if id == 0 || id > 60 {
        return None;
    }
    CARDS[id as usize].as_ref()
}

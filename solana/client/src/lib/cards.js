// cards.js — Phase 15: 60-card dataset (v2 design, 6 factions)
// Layout: [id, faction, rarity, bp, hp, ini, actionType, isLegendary]
//   id:         1-60 (1-indexed; id = (faction * 10) + slot + 1)
//   faction:    0=Knight 1=Merchant 2=Pirate 3=Scholar 4=Monk 5=Engineer
//   rarity:     0=Common 1=Uncommon 2=Rare 3=Legendary
//   bp/hp/ini:  integer stats per faction profile (game-design-v2 §4)
//   actionType: 0=UseCrystal 1=Barrier 2=UseFlame 3=UseStorm 4=UseShadow 5=UseVoid
//   isLegendary: bool (true only for rarity=3 cards)
//
// Faction stat profiles:
//   Knight   bp 5-8  hp 8-12 ini 2-3
//   Merchant bp 5-8  hp 5-8  ini 2-3
//   Pirate   bp 8-12 hp 3-5  ini 4-5
//   Scholar  bp 3-5  hp 5-8  ini 4-5
//   Monk     bp 5-8  hp 8-12 ini 0-1
//   Engineer bp 8-12 hp 5-8  ini 2-3

export const CARD_DATA = [
  // ── Knight (clan=0, id 1-10) ──────────────────────────────────────────────
  // Common ×5
  [  1, 0, 0,  5,  8, 2, 1, false ],  // Squire      — Barrier
  [  2, 0, 0,  6,  9, 2, 1, false ],  // Guard       — Barrier
  [  3, 0, 0,  6, 10, 3, 0, false ],  // Soldier     — UseCrystal
  [  4, 0, 0,  7, 10, 2, 1, false ],  // Paladin     — Barrier
  [  5, 0, 0,  7, 11, 3, 0, false ],  // Champion    — UseCrystal
  // Uncommon ×3
  [  6, 0, 1,  8, 11, 2, 1, false ],  // Warden      — Barrier
  [  7, 0, 1,  8, 12, 3, 1, false ],  // Crusader    — Barrier
  [  8, 0, 1,  8, 12, 3, 0, false ],  // Ironclad    — UseCrystal
  // Rare ×1
  [  9, 0, 2,  8, 12, 3, 5, false ],  // Vanguard    — UseVoid
  // Legendary ×1
  [ 10, 0, 3,  8, 12, 3, 1,  true ],  // Sentinel    — Barrier (hp+3 on start, T-10)

  // ── Merchant (clan=1, id 11-20) ───────────────────────────────────────────
  // Common ×5
  [ 11, 1, 0,  5,  5, 2, 0, false ],  // Peddler     — UseCrystal
  [ 12, 1, 0,  5,  6, 2, 3, false ],  // Trader      — UseStorm
  [ 13, 1, 0,  6,  6, 3, 0, false ],  // Broker      — UseCrystal
  [ 14, 1, 0,  6,  7, 2, 3, false ],  // Merchant    — UseStorm
  [ 15, 1, 0,  7,  7, 3, 0, false ],  // Banker      — UseCrystal
  // Uncommon ×3
  [ 16, 1, 1,  7,  7, 3, 5, false ],  // Magnifier   — UseVoid
  [ 17, 1, 1,  8,  8, 2, 0, false ],  // Speculator  — UseCrystal
  [ 18, 1, 1,  8,  8, 3, 3, false ],  // Cartel      — UseStorm
  // Rare ×1
  [ 19, 1, 2,  8,  8, 3, 5, false ],  // Monopolist  — UseVoid
  // Legendary ×1
  [ 20, 1, 3,  8,  8, 3, 0,  true ],  // Magnate     — UseCrystal (AT +50%, T-10)

  // ── Pirate (clan=2, id 21-30) ─────────────────────────────────────────────
  // Common ×5
  [ 21, 2, 0,  8,  3, 4, 2, false ],  // Cutthroat   — UseFlame
  [ 22, 2, 0,  9,  4, 4, 4, false ],  // Raider      — UseShadow
  [ 23, 2, 0,  9,  4, 5, 2, false ],  // Corsair     — UseFlame
  [ 24, 2, 0, 10,  4, 4, 4, false ],  // Buccaneer   — UseShadow
  [ 25, 2, 0, 10,  5, 5, 2, false ],  // Swashbuckler— UseFlame
  // Uncommon ×3
  [ 26, 2, 1, 10,  5, 4, 4, false ],  // Privateer   — UseShadow
  [ 27, 2, 1, 11,  5, 5, 2, false ],  // Freebooter  — UseFlame
  [ 28, 2, 1, 11,  5, 5, 4, false ],  // Reaver      — UseShadow
  // Rare ×1
  [ 29, 2, 2, 12,  5, 5, 2, false ],  // Dreadnaught — UseFlame
  // Legendary ×1
  [ 30, 2, 3, 12,  5, 5, 4,  true ],  // Marauder    — UseShadow (extra loot, T-10)

  // ── Scholar (clan=3, id 31-40) ────────────────────────────────────────────
  // Common ×5
  [ 31, 3, 0,  3,  5, 4, 5, false ],  // Apprentice  — UseVoid
  [ 32, 3, 0,  3,  6, 4, 3, false ],  // Archivist   — UseStorm
  [ 33, 3, 0,  4,  6, 5, 5, false ],  // Mage        — UseVoid
  [ 34, 3, 0,  4,  7, 4, 3, false ],  // Sage        — UseStorm
  [ 35, 3, 0,  5,  7, 5, 5, false ],  // Wizard      — UseVoid
  // Uncommon ×3
  [ 36, 3, 1,  5,  7, 5, 3, false ],  // Diviner     — UseStorm
  [ 37, 3, 1,  5,  8, 4, 5, false ],  // Arcanist    — UseVoid
  [ 38, 3, 1,  5,  8, 5, 3, false ],  // Augur       — UseStorm
  // Rare ×1
  [ 39, 3, 2,  5,  8, 5, 5, false ],  // Seer        — UseVoid
  // Legendary ×1
  [ 40, 3, 3,  5,  8, 5, 5,  true ],  // Oracle      — UseVoid (reveal hand, T-10)

  // ── Monk (clan=4, id 41-50) ───────────────────────────────────────────────
  // Common ×5
  [ 41, 4, 0,  5,  8, 0, 1, false ],  // Novice      — Barrier
  [ 42, 4, 0,  6,  9, 1, 1, false ],  // Initiate    — Barrier
  [ 43, 4, 0,  6, 10, 0, 5, false ],  // Acolyte     — UseVoid
  [ 44, 4, 0,  7, 10, 1, 1, false ],  // Disciple    — Barrier
  [ 45, 4, 0,  7, 11, 0, 5, false ],  // Recluse     — UseVoid
  // Uncommon ×3
  [ 46, 4, 1,  7, 11, 1, 1, false ],  // Devotee     — Barrier
  [ 47, 4, 1,  8, 11, 1, 5, false ],  // Contemplator— UseVoid
  [ 48, 4, 1,  8, 12, 0, 1, false ],  // Abbot       — Barrier
  // Rare ×1
  [ 49, 4, 2,  8, 12, 1, 5, false ],  // Elder       — UseVoid
  // Legendary ×1
  [ 50, 4, 3,  8, 12, 1, 5,  true ],  // Ascetic     — UseVoid (AT nullify, T-10)

  // ── Engineer (clan=5, id 51-60) ───────────────────────────────────────────
  // Common ×5
  [ 51, 5, 0,  8,  5, 2, 0, false ],  // Tinkerer    — UseCrystal
  [ 52, 5, 0,  9,  5, 2, 3, false ],  // Mechanic    — UseStorm
  [ 53, 5, 0,  9,  6, 3, 0, false ],  // Forger      — UseCrystal
  [ 54, 5, 0, 10,  6, 2, 3, false ],  // Inventor    — UseStorm
  [ 55, 5, 0, 10,  7, 3, 0, false ],  // Artisan     — UseCrystal
  // Uncommon ×3
  [ 56, 5, 1, 10,  7, 3, 3, false ],  // Schematic   — UseStorm
  [ 57, 5, 1, 11,  7, 2, 0, false ],  // Constructor — UseCrystal
  [ 58, 5, 1, 11,  8, 3, 3, false ],  // Machinist   — UseStorm
  // Rare ×1
  [ 59, 5, 2, 12,  8, 3, 0, false ],  // Colossus    — UseCrystal
  // Legendary ×1
  [ 60, 5, 3, 12,  8, 3, 0,  true ],  // Architect   — UseCrystal (dual AT, T-10)
];

// ─── Indexed lookup ───────────────────────────────────────────────────────────
// cardById[id] → row (id is 1-indexed; index 0 is null)
export const cardById = (() => {
  const map = new Array(61).fill(null);
  for (const row of CARD_DATA) map[row[0]] = row;
  return map;
})();

// ─── Phase 16: Card abilities (v3.0-plus mechanics) ──────────────────────────
// Maps card ID → ability descriptor. Only 12 cards have abilities:
//   - Burn-capable Commons (the 5th Common per faction)
//   - Rare passive abilities (one per faction)
export const CARD_ABILITIES = {
  // Burn-capable Commons
   5: { type: 'burn', effect: 'knight_bp_boost',      description: 'Burn: other Knight cards get +3 BP this battle' },
  15: { type: 'burn', effect: 'merchant_bp_scale',    description: 'Burn: own BP total ×1.2 (rounded down) this battle' },
  25: { type: 'burn', effect: 'pirate_aoe_dmg',       description: 'Burn: deal 3 damage to all enemy cards' },
  35: { type: 'burn', effect: 'scholar_hand_reveal',  description: 'Burn: reveal opponent hand' },
  45: { type: 'burn', effect: 'monk_barrier_all',     description: 'Burn: all own cards gain Barrier this battle' },
  55: { type: 'burn', effect: 'engineer_bp_boost',    description: 'Burn: other Engineer cards get +5 BP this battle' },
  // Rare passive abilities
   9: { type: 'passive', effect: 'knight_aura',           description: 'Passive: other Knight cards on field get +1 BP' },
  19: { type: 'passive', effect: 'merchant_gold_aura',    description: 'Passive: own BP total +5 when Magnate is in pool' },
  29: { type: 'passive', effect: 'pirate_intimidate',     description: 'Passive: on kill, burn top card from opponent field' },
  39: { type: 'passive', effect: 'scholar_imprint_scale', description: 'Passive: +1 BP per own stat imprint (max 3)' },
  49: { type: 'passive', effect: 'monk_soul_harvest',     description: 'Passive: on destroy, reduce all enemy BP by 1' },
  59: { type: 'passive', effect: 'engineer_overclock',    description: 'Passive: own Engineer cards get +2 BP when 3+ present' },
};

// ─── Phase 16: Merge recipes (Uncommon-only via merge) ───────────────────────
// Maps merge-only Uncommon ID → two-Common recipe.
export const MERGE_RECIPES = {
   8: { result:  8, recipe: [ 1,  2], name: 'Knight Champion'      },
  18: { result: 18, recipe: [11, 12], name: 'Merchant Magnate'     },
  28: { result: 28, recipe: [21, 22], name: 'Pirate Quartermaster' },
  38: { result: 38, recipe: [31, 32], name: 'Scholar Lorekeeper'   },
  48: { result: 48, recipe: [41, 42], name: 'Monk Ascender'        },
  58: { result: 58, recipe: [51, 52], name: 'Engineer Forgemaster' },
};

// Set of merge-only IDs for fast lookup
export const MERGE_ONLY_IDS = new Set(Object.keys(MERGE_RECIPES).map(Number));

/** True if card can be burned (Common only; ids 5,15,25,35,45,55) */
export function isBurnable(id) {
  return id in CARD_ABILITIES && CARD_ABILITIES[id].type === 'burn';
}

/** True if card is only obtainable via merge (not through battle loot) */
export function isMergeOnly(id) {
  return MERGE_ONLY_IDS.has(id);
}

/** Get merge recipe for a card, or null */
export function getMergeRecipe(id) {
  return MERGE_RECIPES[id] ?? null;
}

// ─── Card field accessors ─────────────────────────────────────────────────────
export function getCard(id) {
  const row = cardById[id];
  if (!row) return null;
  return {
    id:          row[0],
    faction:     row[1],
    rarity:      row[2],
    bp:          row[3],
    hp:          row[4],
    ini:         row[5],
    actionType:  row[6],
    isLegendary: row[7],
    ability:     CARD_ABILITIES[id] ?? null,
    mergeOnly:   MERGE_ONLY_IDS.has(id),
    mergeRecipe: MERGE_RECIPES[id] ?? null,
  };
}

// Legendary card IDs (one per faction, rarity=3)
export const LEGENDARY_IDS = CARD_DATA
  .filter(row => row[7] === true)
  .map(row => row[0]);

// All 60 card IDs
export const ALL_CARD_IDS = CARD_DATA.map(row => row[0]);

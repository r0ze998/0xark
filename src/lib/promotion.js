// promotion.js — single client source for the card-promotion gate ladder.
//
// MIRROR of the on-chain gate. Do NOT inline these numbers per screen (spec §5.2).
//   Rust: solana/oxark/programs/oxark/src/instructions/promote_card.rs
//         → evaluate_promotion() + promotion_cost_lamports()
//   Rust: solana/oxark/programs/oxark/src/constants.rs (thresholds/costs/enums)
//
// Ladder (one tier per promotion, in place — same SPL mint, history continuous):
//   Common(0)    → Uncommon(1) : wins ≥ 10
//   Uncommon(1)  → Rare(2)     : wins ≥ 25 AND (legendary_kills ≥ 1 OR owners_dropped ≥ 1)
//   Rare(2)      → Legendary(3): wins ≥ 50 AND acquisition == duel_won(2) AND kos ≥ 30
// The chain is authoritative at promote time; this module drives the UI (progress
// bars, enable/disable, cost label) and must stay in lock-step with the Rust.

export const RARITY = { COMMON: 0, UNCOMMON: 1, RARE: 2, LEGENDARY: 3 };
export const RARITY_LABEL = ['Common', 'Uncommon', 'Rare', 'Legendary'];

// mirror constants.rs
export const PROMOTE_COMMON_TO_UNCOMMON_WINS = 10;
export const PROMOTE_UNCOMMON_TO_RARE_WINS   = 25;
export const PROMOTE_RARE_TO_LEGENDARY_WINS  = 50;
export const PROMOTE_RARE_TO_LEGENDARY_KOS   = 30;
export const ACQUISITION_DUEL_WON            = 2; // 0=mint 1=shop 2=duel_won 3=p2p_trade

// mirror constants.rs (lamports) → SOL for display
const PROMOTE_COST_LAMPORTS = [10_000_000, 30_000_000, 100_000_000]; // C→U, U→R, R→L
const LAMPORTS_PER_SOL = 1_000_000_000;

export function promotionCostSol(fromRarity) {
  const l = PROMOTE_COST_LAMPORTS[fromRarity];
  return l ? l / LAMPORTS_PER_SOL : 0;
}

// evaluatePromotion — pure UI mirror of evaluate_promotion(). Returns the per-
// condition breakdown for `fromRarity`, whether all gates are met, the target
// tier, and the SOL cost. `cbh` is a getCardBattleHistory() result.
export function evaluatePromotion(cbh, fromRarity) {
  const wins    = cbh?.wins ?? 0;
  const kos     = cbh?.kos ?? 0;
  const legKills = cbh?.legendaryKills ?? 0;
  const dropped  = cbh?.ownersDroppedCount ?? 0;
  const acq      = cbh?.acquisitionSource ?? 0;

  if (fromRarity >= RARITY.LEGENDARY) {
    return { maxTier: true, allMet: false, nextTier: null, costSol: 0, conditions: [] };
  }

  let conditions;
  let nextTier;
  if (fromRarity === RARITY.COMMON) {
    nextTier = RARITY.UNCOMMON;
    conditions = [winsCond(wins, PROMOTE_COMMON_TO_UNCOMMON_WINS)];
  } else if (fromRarity === RARITY.UNCOMMON) {
    nextTier = RARITY.RARE;
    conditions = [
      winsCond(wins, PROMOTE_UNCOMMON_TO_RARE_WINS),
      // deep-provenance mark: legendary kill OR having been dropped/stolen
      boolCond('deep provenance', legKills >= 1 || dropped >= 1,
        legKills >= 1 ? `legendary kill ×${legKills}`
          : dropped >= 1 ? `dropped ×${dropped}`
          : 'need 1 legendary kill or 1 prior-owner drop'),
    ];
  } else { // RARE → LEGENDARY
    nextTier = RARITY.LEGENDARY;
    conditions = [
      winsCond(wins, PROMOTE_RARE_TO_LEGENDARY_WINS),
      boolCond('won in a duel', acq === ACQUISITION_DUEL_WON,
        acq === ACQUISITION_DUEL_WON ? 'acquired: duel win' : 'must have been won in a duel'),
      countCond('kos', kos, PROMOTE_RARE_TO_LEGENDARY_KOS),
    ];
  }

  const allMet = conditions.every(c => c.met);
  return { maxTier: false, allMet, nextTier, costSol: promotionCostSol(fromRarity), conditions };
}

// ── condition builders ──
// { label, met, current, required, kind, note }
function winsCond(current, required) {
  return { label: 'wins', kind: 'progress', current, required, met: current >= required };
}
function countCond(label, current, required) {
  return { label, kind: 'progress', current, required, met: current >= required };
}
function boolCond(label, met, note) {
  return { label, kind: 'bool', met, note };
}

// abilities.js — Phase 16 card ability handlers
// Called by damage-calc.js Step 0.5 before combat resolution.
// All arithmetic is integer-only to maintain determinism.
//
// NOTE: Faction is inlined here (NOT imported from damage-calc.js) to avoid
// a circular dependency: damage-calc.js imports this module.

const Faction = Object.freeze({
  Knight:   0,
  Merchant: 1,
  Pirate:   2,
  Scholar:  3,
  Monk:     4,
  Engineer: 5,
});

// ─── Burn ability dispatch ─────────────────────────────────────────────────────
// burnEffects: array of { effect, ownSide } where ownSide is 'p1'|'p2'
// p1Work/p2Work: mutable card arrays from damage-calc (with bpMod, hpMod, barrierUp)
// effects: string[] to push event strings into

export function applyBurnEffects(p1Work, p2Work, burnEffects, effects) {
  for (const { effect, ownSide } of (burnEffects ?? [])) {
    const ownField = ownSide === 'p1' ? p1Work : p2Work;
    const oppField = ownSide === 'p1' ? p2Work : p1Work;
    const handler  = BURN_HANDLERS[effect];
    if (handler) handler(ownField, oppField, effects, ownSide);
  }
}

// ─── Passive ability dispatch ──────────────────────────────────────────────────
// Applied once before combat — cards on field with passive abilities activate.

export function applyPassiveAbilities(p1Work, p2Work, effects) {
  for (const [side, field] of [['p1', p1Work], ['p2', p2Work]]) {
    const opp = side === 'p1' ? p2Work : p1Work;
    for (const c of field) {
      const ab = c.ability;
      if (!ab || ab.type !== 'passive') continue;
      const handler = PASSIVE_HANDLERS[ab.effect];
      if (handler) handler(c, field, opp, effects, side);
    }
  }
}

// ─── Burn handlers ────────────────────────────────────────────────────────────

const BURN_HANDLERS = {
  // id 5: Sacrificial Squire — other Knight cards +3 BP
  knight_bp_boost(ownField, _oppField, effects, side) {
    let count = 0;
    for (const c of ownField) {
      if (c.faction === Faction.Knight) { c.bpMod += 3; count++; }
    }
    if (count > 0) effects.push(`${side}_burn_knight_bp_boost`);
  },

  // id 15: Coin Burner — own BP total ×1.2 (integer: +20%, each card +1 per 5 bp)
  merchant_bp_scale(ownField, _oppField, effects, side) {
    let boosted = false;
    for (const c of ownField) {
      const base  = Math.max(0, c.bp + c.bpMod);
      const bonus = Math.floor((base * 2) / 10); // +20% rounded down
      if (bonus > 0) { c.bpMod += bonus; boosted = true; }
    }
    if (boosted) effects.push(`${side}_burn_merchant_bp_scale`);
  },

  // id 25: Powder Charge — deal 3 damage to all enemy cards (pre-combat)
  pirate_aoe_dmg(_ownField, oppField, effects, side) {
    for (const c of oppField) c.hpMod -= 3;
    effects.push(`${side}_burn_pirate_aoe_dmg`);
  },

  // id 35: Burning Tome — reveal opponent hand (event only, no stat change in calc)
  scholar_hand_reveal(_ownField, _oppField, effects, side) {
    effects.push(`${side}_burn_scholar_hand_reveal`);
  },

  // id 45: Mantra Burner — all own cards gain Barrier
  monk_barrier_all(ownField, _oppField, effects, side) {
    for (const c of ownField) c.barrierUp = true;
    effects.push(`${side}_burn_monk_barrier_all`);
  },

  // id 55: Forge Worker — other Engineer cards +5 BP
  engineer_bp_boost(ownField, _oppField, effects, side) {
    let count = 0;
    for (const c of ownField) {
      if (c.faction === Faction.Engineer) { c.bpMod += 5; count++; }
    }
    if (count > 0) effects.push(`${side}_burn_engineer_bp_boost`);
  },
};

// ─── Passive handlers ──────────────────────────────────────────────────────────

const PASSIVE_HANDLERS = {
  // id 9: Vanguard — other Knight cards on field +1 BP
  knight_aura(self, ownField, _oppField, effects, side) {
    let count = 0;
    for (const c of ownField) {
      if (c !== self && c.faction === Faction.Knight) { c.bpMod += 1; count++; }
    }
    if (count > 0) effects.push(`${side}_passive_knight_aura`);
  },

  // id 19: Monopolist — own BP total +5 when any Legendary is in own field
  merchant_gold_aura(self, ownField, _oppField, effects, side) {
    const hasLgd = ownField.some(c => c.isLegendary);
    if (hasLgd) {
      for (const c of ownField) c.bpMod += 1;
      effects.push(`${side}_passive_merchant_gold_aura`);
    }
  },

  // id 29: Dreadnaught — opposing card in same slot loses 3 HP pre-combat
  pirate_intimidate(self, ownField, oppField, effects, side) {
    const idx = ownField.indexOf(self);
    if (idx >= 0 && idx < oppField.length) {
      oppField[idx].hpMod -= 3;
      effects.push(`${side}_passive_pirate_intimidate_pair_${idx}`);
    }
  },

  // id 39: Seer — +1 BP per stat imprint this card carries (max 3).
  // Phase 15 demo: relies on optional `_imprintCount` field on the card.
  scholar_imprint_scale(self, _ownField, _oppField, effects, side) {
    const bonus = Math.min(3, self._imprintCount ?? 0);
    if (bonus > 0) {
      self.bpMod += bonus;
      effects.push(`${side}_passive_scholar_imprint_scale`);
    }
  },

  // id 49: Elder — when Elder is present, all own cards get barrierUp (Monk protection aura)
  monk_soul_harvest(self, ownField, _oppField, effects, side) {
    for (const c of ownField) c.barrierUp = true;
    effects.push(`${side}_passive_monk_soul_harvest`);
  },

  // id 59: Colossus — if 3+ Engineer on field, each gets +2 BP
  engineer_overclock(self, ownField, _oppField, effects, side) {
    const engCount = ownField.filter(c => c.faction === Faction.Engineer).length;
    if (engCount >= 3) {
      for (const c of ownField) {
        if (c.faction === Faction.Engineer) c.bpMod += 2;
      }
      effects.push(`${side}_passive_engineer_overclock`);
    }
  },
};

// ─── Imprint trigger helpers (called from loot.js, not damage-calc) ───────────

/** Returns array of imprint keys earned by the winner after a battle. */
export function computePostBattleImprints({
  isFirstWin, p1Cards, p2Cards, winner,
  p1Destroyed = [], p2Destroyed = [],
}) {
  const imprints   = [];
  const myCards    = winner === 'p1' ? p1Cards : p2Cards;
  const oppCards   = winner === 'p1' ? p2Cards : p1Cards;
  const myDestIds  = new Set(winner === 'p1' ? p1Destroyed : p2Destroyed);
  const oppDestIds = new Set(winner === 'p1' ? p2Destroyed : p1Destroyed);

  const isDestroyed = (card, destSet) => card.destroyed || destSet.has(card.id);

  if (isFirstWin) imprints.push({ key: 'FirstBlood', description: 'First battle victory', is_cosmetic: false, value: 1 });

  if (myCards.every(c => !isDestroyed(c, myDestIds))) {
    imprints.push({ key: 'FlawlessVictory', description: 'Won without losing a card', is_cosmetic: true, value: 0 });
  }

  if (oppCards.some(c => (c.rarity === 3 || c.isLegendary) && isDestroyed(c, oppDestIds))) {
    imprints.push({ key: 'LegendaryDefeat', description: 'Defeated a Legendary card', is_cosmetic: false, value: 2 });
  }

  return imprints;
}

export { BURN_HANDLERS, PASSIVE_HANDLERS };

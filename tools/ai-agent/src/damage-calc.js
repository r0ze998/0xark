// damage-calc.js — deterministic round damage calculator (ε-full Phase 11)
// ESM module for Node. Identical logic in solana/client/src/lib/damage-calc.js (browser ESM).

import { createHash } from 'crypto';

// ─── ActionType enum (ε-full — Move=10 removed) ──────────────────────────────
export const ActionType = Object.freeze({
  None:       0,
  Draw:       1,
  Steal:      2,
  Barrier:    3,
  Scout:      4,
  UseCrystal: 5,
  UseShadow:  6,
  UseFlame:   7,
  UseStorm:   8,
  UseVoid:    9,
});

// ─── cardData helpers ─────────────────────────────────────────────────────────
function getCardBP(cardId, cardData) {
  if (!cardData || cardId < 1 || cardId > cardData.length) return 0;
  const row = cardData[cardId - 1];
  return (row && typeof row[2] === 'number') ? row[2] : 0;
}

function sumCardBP(cardIds, cardData) {
  let total = 0;
  for (const item of cardIds) {
    const id = typeof item === 'object' && item !== null ? item.id : item;
    const bp = typeof item === 'object' && item !== null && typeof item.bp === 'number'
      ? item.bp
      : getCardBP(id, cardData);
    total += bp;
  }
  return total;
}

// ─── damageCalc ──────────────────────────────────────────────────────────────

/**
 * Compute HP deltas for one battle round.
 *
 * @param {object} input
 * @param {number}   input.round
 * @param {object}   input.player1   { action, cards, barrier }
 * @param {object}   input.player2
 * @param {number[][]} input.cardData  CARD_V3_DATA (optional)
 * @param {Uint8Array|Buffer|number[]} input.seed  32-byte deterministic seed
 * @returns {{ p1HpDelta: number, p2HpDelta: number, effects: string[] }}
 */
export function damageCalc({ round, player1, player2, cardData = [], seed } = {}) {
  const a1 = (player1.action | 0);
  const a2 = (player2.action | 0);
  const effects = [];

  // Step 1: Shadow
  const p1Shadow = (a1 === ActionType.UseShadow);
  const p2Shadow = (a2 === ActionType.UseShadow);
  if (p1Shadow) effects.push('p1_shadow');
  if (p2Shadow) effects.push('p2_shadow');

  // Step 2: Storm
  const stormActive = (a1 === ActionType.UseStorm) || (a2 === ActionType.UseStorm);
  if (stormActive) effects.push('storm_active');

  // Step 3: Barrier
  const p1BarrierRaised = (a1 === ActionType.Barrier) && !stormActive;
  const p2BarrierRaised = (a2 === ActionType.Barrier) && !stormActive;
  const p1Protected = !stormActive && (!!player1.barrier || p1BarrierRaised);
  const p2Protected = !stormActive && (!!player2.barrier || p2BarrierRaised);
  if (p1BarrierRaised) effects.push('p1_barrier');
  if (p2BarrierRaised) effects.push('p2_barrier');
  if ((a1 === ActionType.Barrier || player1.barrier) && stormActive) effects.push('p1_barrier_swept');
  if ((a2 === ActionType.Barrier || player2.barrier) && stormActive) effects.push('p2_barrier_swept');

  let dmgTo1 = 0;
  let dmgTo2 = 0;

  // Step 4: Steal + Crystal
  if (a1 === ActionType.Steal) {
    if (!p2Protected && !p2Shadow) { dmgTo2 += 1; effects.push('p1_steal_hit'); }
    else effects.push('p1_steal_blocked');
  }
  if (a2 === ActionType.Steal) {
    if (!p1Protected && !p1Shadow) { dmgTo1 += 1; effects.push('p2_steal_hit'); }
    else effects.push('p2_steal_blocked');
  }
  if (a1 === ActionType.UseCrystal) {
    const bp = sumCardBP(player1.cards || [], cardData);
    const dmg = bp > 0 ? Math.max(1, (bp / 4) | 0) : 1;
    if (!p2Protected) { dmgTo2 += dmg; effects.push(`p1_crystal_${dmg}`); }
    else effects.push('p1_crystal_blocked');
  }
  if (a2 === ActionType.UseCrystal) {
    const bp = sumCardBP(player2.cards || [], cardData);
    const dmg = bp > 0 ? Math.max(1, (bp / 4) | 0) : 1;
    if (!p1Protected) { dmgTo1 += dmg; effects.push(`p2_crystal_${dmg}`); }
    else effects.push('p2_crystal_blocked');
  }

  // Step 5: Flame — shadow makes the TARGET invisible (blocks incoming flame)
  if (a1 === ActionType.UseFlame) {
    if (!p2Protected && !p2Shadow) { dmgTo2 += 1; effects.push('p1_flame_hit'); }
    else effects.push('p1_flame_blocked');
  }
  if (a2 === ActionType.UseFlame) {
    if (!p1Protected && !p1Shadow) { dmgTo1 += 1; effects.push('p2_flame_hit'); }
    else effects.push('p2_flame_blocked');
  }

  // Step 6: Scout
  if (a1 === ActionType.Scout) effects.push('p1_scout');
  if (a2 === ActionType.Scout) effects.push('p2_scout');

  // Step 7: Draw
  if (a1 === ActionType.Draw) effects.push('p1_draw');
  if (a2 === ActionType.Draw) effects.push('p2_draw');

  // Step 8: Void
  if (a1 === ActionType.UseVoid) {
    if (dmgTo1 > 0) effects.push(`p1_void_negated_${dmgTo1}`);
    dmgTo1 = 0;
    effects.push('p1_void');
  }
  if (a2 === ActionType.UseVoid) {
    if (dmgTo2 > 0) effects.push(`p2_void_negated_${dmgTo2}`);
    dmgTo2 = 0;
    effects.push('p2_void');
  }

  return { p1HpDelta: 0 - dmgTo1, p2HpDelta: 0 - dmgTo2, effects };
}

/**
 * Compute the deterministic round seed from two player salts and round number.
 * Node sync implementation.
 *
 * @param {Buffer|Uint8Array} salt1
 * @param {Buffer|Uint8Array} salt2
 * @param {number} round
 * @returns {Buffer} 32-byte seed
 */
export function computeSeed(salt1, salt2, round) {
  return createHash('sha256')
    .update(Buffer.concat([Buffer.from(salt1), Buffer.from(salt2), Buffer.from([round & 0xff])]))
    .digest();
}

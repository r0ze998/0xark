// damage-calc.js — deterministic round damage calculator (ε-full Phase 11)
// ESM module for browser. Identical logic in tools/ai-agent/src/damage-calc.js (Node ESM).
//
// Determinism contract:
//   - Integer arithmetic only (no floats)
//   - No Math.random(), Date.now(), or external state
//   - Given identical inputs, always produces identical outputs
//   - seed must be pre-computed: SHA-256(salt_p1 || salt_p2 || [round & 0xff])

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
// CARD_V3_DATA layout: [clan, rarity, bp, cardHp, ini, ability_key]
// card IDs are 1-indexed; CARD_V3_DATA is 0-indexed (id=1 → index 0)

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

// ─── deterministic index from seed ───────────────────────────────────────────
// seedByte: a single byte from the seed array; len: number of options
function seedIndex(seedByte, len) {
  if (len <= 0) return 0;
  return (seedByte & 0xff) % len;
}

// ─── damageCalc ──────────────────────────────────────────────────────────────

/**
 * Compute HP deltas for one battle round.
 *
 * @param {object} input
 * @param {number}   input.round     - round number 1..5
 * @param {object}   input.player1   - see PlayerRoundState below
 * @param {object}   input.player2
 * @param {number[][]} input.cardData - CARD_V3_DATA (optional; used for crystal BP)
 * @param {Uint8Array|Buffer|number[]} input.seed - 32-byte deterministic seed;
 *        if omitted an all-zero seed is used (suitable for non-random rounds)
 *
 * PlayerRoundState:
 *   action      {number}   ActionType enum value
 *   cards       {number[]|{id,bp}[]}  cards in hand this round
 *   barrier     {boolean}  barrier carried from previous round
 *   salt        unused here — caller pre-computes seed from salts
 *
 * @returns {{ p1HpDelta: number, p2HpDelta: number, effects: string[] }}
 *   p1HpDelta / p2HpDelta are ≤ 0 (negative = damage taken)
 */
export function damageCalc({ round, player1, player2, cardData = [], seed } = {}) {
  const s = seed ? Array.from(seed) : new Array(32).fill(0);

  const a1 = (player1.action | 0);
  const a2 = (player2.action | 0);
  const effects = [];

  // ── Step 1: Shadow ──────────────────────────────────────────────────────────
  // Shadow makes the user invisible — cannot be targeted by Steal, Flame, Scout.
  const p1Shadow = (a1 === ActionType.UseShadow);
  const p2Shadow = (a2 === ActionType.UseShadow);
  if (p1Shadow) effects.push('p1_shadow');
  if (p2Shadow) effects.push('p2_shadow');

  // ── Step 2: Storm ──────────────────────────────────────────────────────────
  // Storm sweeps ALL barriers (carried + this round), including both players'.
  const p1Storm = (a1 === ActionType.UseStorm);
  const p2Storm = (a2 === ActionType.UseStorm);
  const stormActive = p1Storm || p2Storm;
  if (stormActive) effects.push('storm_active');

  // ── Step 3: Barrier ────────────────────────────────────────────────────────
  // Barrier raised this round is nullified by Storm.
  // Barrier carried from previous round is also swept by Storm.
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

  // ── Step 4: Steal + Crystal ────────────────────────────────────────────────
  if (a1 === ActionType.Steal) {
    if (!p2Protected && !p2Shadow) {
      dmgTo2 += 1;
      effects.push('p1_steal_hit');
    } else {
      effects.push('p1_steal_blocked');
    }
  }
  if (a2 === ActionType.Steal) {
    if (!p1Protected && !p1Shadow) {
      dmgTo1 += 1;
      effects.push('p2_steal_hit');
    } else {
      effects.push('p2_steal_blocked');
    }
  }
  if (a1 === ActionType.UseCrystal) {
    const bp = sumCardBP(player1.cards || [], cardData);
    const dmg = bp > 0 ? Math.max(1, (bp / 4) | 0) : 1;
    if (!p2Protected) {
      dmgTo2 += dmg;
      effects.push(`p1_crystal_${dmg}`);
    } else {
      effects.push('p1_crystal_blocked');
    }
  }
  if (a2 === ActionType.UseCrystal) {
    const bp = sumCardBP(player2.cards || [], cardData);
    const dmg = bp > 0 ? Math.max(1, (bp / 4) | 0) : 1;
    if (!p1Protected) {
      dmgTo1 += dmg;
      effects.push(`p2_crystal_${dmg}`);
    } else {
      effects.push('p2_crystal_blocked');
    }
  }

  // ── Step 5: Flame ──────────────────────────────────────────────────────────
  // Shadow makes the TARGET invisible (blocks incoming flame).
  if (a1 === ActionType.UseFlame) {
    if (!p2Protected && !p2Shadow) {
      dmgTo2 += 1;
      effects.push('p1_flame_hit');
    } else {
      effects.push('p1_flame_blocked');
    }
  }
  if (a2 === ActionType.UseFlame) {
    if (!p1Protected && !p1Shadow) {
      dmgTo1 += 1;
      effects.push('p2_flame_hit');
    } else {
      effects.push('p2_flame_blocked');
    }
  }

  // ── Step 6: Scout ──────────────────────────────────────────────────────────
  if (a1 === ActionType.Scout) effects.push('p1_scout');
  if (a2 === ActionType.Scout) effects.push('p2_scout');

  // ── Step 7: Draw ───────────────────────────────────────────────────────────
  if (a1 === ActionType.Draw) effects.push('p1_draw');
  if (a2 === ActionType.Draw) effects.push('p2_draw');

  // ── Step 8: Void ───────────────────────────────────────────────────────────
  // Void negates ALL incoming damage to the Void user.
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

  return {
    p1HpDelta: 0 - dmgTo1,
    p2HpDelta: 0 - dmgTo2,
    effects,
  };
}

/**
 * Compute the deterministic round seed from two player salts and the round number.
 * Browser async implementation using SubtleCrypto.
 *
 * @param {Uint8Array|ArrayBuffer} salt1  - 32-byte player1 salt
 * @param {Uint8Array|ArrayBuffer} salt2  - 32-byte player2 salt
 * @param {number} round
 * @returns {Promise<Uint8Array>} 32-byte seed
 */
export async function computeSeed(salt1, salt2, round) {
  const s1 = salt1 instanceof Uint8Array ? salt1 : new Uint8Array(salt1);
  const s2 = salt2 instanceof Uint8Array ? salt2 : new Uint8Array(salt2);
  const merged = new Uint8Array(s1.length + s2.length + 1);
  merged.set(s1, 0);
  merged.set(s2, s1.length);
  merged[s1.length + s2.length] = round & 0xff;
  const hash = await crypto.subtle.digest('SHA-256', merged);
  return new Uint8Array(hash);
}

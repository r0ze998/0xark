// damage-calc.js — Phase 15 card-level battle resolver (Node ESM)
// Identical logic in solana/client/src/lib/damage-calc.js (browser ESM).
//
// Determinism contract:
//   - Integer arithmetic only (no floats)
//   - No Math.random(), Date.now(), or external state
//   - Given identical inputs, always produces identical outputs
//   - seed: SHA-256(salt_p1 || salt_p2 || [round & 0xff])

import { createHash } from 'crypto';
import { applyBurnEffects, applyPassiveAbilities } from './abilities.js';

// ─── ActionType enum (Phase 15 v2 — 6 types) ─────────────────────────────────
export const ActionType = Object.freeze({
  UseCrystal: 0,
  Barrier:    1,
  UseFlame:   2,
  UseStorm:   3,
  UseShadow:  4,
  UseVoid:    5,
});

// ─── Faction enum ─────────────────────────────────────────────────────────────
export const Faction = Object.freeze({
  Knight:   0,
  Merchant: 1,
  Pirate:   2,
  Scholar:  3,
  Monk:     4,
  Engineer: 5,
});

const SYNERGY_MIN = 3;

// ─── helpers ──────────────────────────────────────────────────────────────────

function seedByte(seed, idx) {
  const s = seed ?? [];
  return (s[idx % Math.max(s.length, 1)] ?? 0) & 0xff;
}

// Stable deterministic sort: INI desc → seed_byte asc → orig_idx asc (3-level key)
function sortByIniDesc(cards, seed, seedOffset) {
  return cards
    .map((c, i) => ({ ...c, _origIdx: i }))
    .sort((a, b) => {
      if (b.ini !== a.ini) return b.ini - a.ini;
      const sa = seedByte(seed, seedOffset + a._origIdx);
      const sb = seedByte(seed, seedOffset + b._origIdx);
      if (sa !== sb) return sa - sb;
      return a._origIdx - b._origIdx;
    });
}

function countFaction(cards, faction) {
  return cards.filter(c => c.faction === faction).count ?? cards.filter(c => c.faction === faction).length;
}

// ─── damageCalc ──────────────────────────────────────────────────────────────

/**
 * Phase 15 card-level battle resolver.
 *
 * @param {object} input
 * @param {CardState[]} input.p1Field  - P1's 5 cards
 * @param {CardState[]} input.p2Field  - P2's 5 cards
 * @param {Uint8Array|number[]|null} input.seed  - 32-byte deterministic seed
 * @returns {DamageResult}
 *
 * CardState: { id, faction, bp, hp, ini, actionType, isLegendary }
 *   faction:    Faction enum (0-5)
 *   bp:         battle power (integer)
 *   hp:         hit points (integer)
 *   ini:        initiative (integer, higher = faster)
 *   actionType: ActionType enum (0-5)
 *   isLegendary: boolean
 *
 * DamageResult: {
 *   winner: 'p1' | 'p2',
 *   p1Cards: CardResult[],
 *   p2Cards: CardResult[],
 *   lootPool: CardResult[],   // losing player's 5 cards (destroyed included)
 *   lootedCardId: number,     // id of the single card to loot (deterministic)
 *   lootedCount:  number,     // 1 normally, 2 with Marauder
 *   p1BpTotal: number,
 *   p2BpTotal: number,
 *   synergyP1: { faction: number } | null,
 *   synergyP2: { faction: number } | null,
 *   effects: string[],
 * }
 */
export function damageCalc({ p1Field, p2Field, seed, burnEffects = [] } = {}) {
  const s = seed ? Array.from(seed) : new Array(32).fill(0);
  const effects = [];

  // ── Step 0: Synergy detection ────────────────────────────────────────────────
  const synergyP1 = detectSynergy(p1Field);
  const synergyP2 = detectSynergy(p2Field);
  if (synergyP1) effects.push(`p1_synergy_${synergyP1.faction}`);
  if (synergyP2) effects.push(`p2_synergy_${synergyP2.faction}`);

  // ── Step 0.5: Card abilities — passive + burn effects ────────────────────────
  // Build work arrays first so ability handlers can mutate bpMod/hpMod/barrierUp.
  const p1WorkPre = p1Field.map(c => ({ ...c, barrierUp: false, shadow: false, voidBlocked: false, bpMod: 0, hpMod: 0 }));
  const p2WorkPre = p2Field.map(c => ({ ...c, barrierUp: false, shadow: false, voidBlocked: false, bpMod: 0, hpMod: 0 }));
  applyPassiveAbilities(p1WorkPre, p2WorkPre, effects);
  applyBurnEffects(p1WorkPre, p2WorkPre, burnEffects, effects);

  // ── Step 1: Pairing — sort each side by INI desc ────────────────────────────
  const p1Sorted = sortByIniDesc(p1WorkPre, s, 0);
  const p2Sorted = sortByIniDesc(p2WorkPre, s, 8);

  // p1Sorted/p2Sorted already carry the bpMod/hpMod/barrierUp set in Step 0.5.
  const p1Work = p1Sorted;
  const p2Work = p2Sorted;

  // ── Step 2: Legendary effects (stub — Phase 15 flag mgmt only) ──────────────
  applyLegendaryStubs(p1Work, p2Work, effects);

  // ── Step 3: ActionType resolution — all 10 cards in INI order ───────────────
  const allCards = [
    ...p1Work.map((c, i) => ({ c, side: 'p1', pos: i })),
    ...p2Work.map((c, i) => ({ c, side: 'p2', pos: i + 5 })),
  ].sort((a, b) => {
    if (b.c.ini !== a.c.ini) return b.c.ini - a.c.ini;
    return seedByte(s, 16 + a.pos) - seedByte(s, 16 + b.pos);
  });

  // Two-pass: first collect void targets (by paired position), then apply effects
  const voidTargets = new Set();
  for (const { c, side, pos } of allCards) {
    if (c.actionType === ActionType.UseVoid) {
      const oppField = side === 'p1' ? p2Work : p1Work;
      const myIdx    = side === 'p1' ? pos : pos - 5;
      if (myIdx >= 0 && myIdx < oppField.length) {
        voidTargets.add(oppField[myIdx]);
      }
    }
  }

  for (const { c, side, pos } of allCards) {
    if (voidTargets.has(c)) {
      c.voidBlocked = true;
      effects.push(`${side}_void_blocked_${c.id}`);
      continue;
    }

    const oppField = side === 'p1' ? p2Work : p1Work;
    const myIdx    = side === 'p1' ? pos : pos - 5;

    switch (c.actionType) {
      case ActionType.UseCrystal:
        c.bpMod += 5;
        effects.push(`${side}_crystal_${c.id}`);
        break;

      case ActionType.Barrier:
        c.barrierUp = true;
        effects.push(`${side}_barrier_${c.id}`);
        break;

      case ActionType.UseFlame:
        if (myIdx >= 0 && myIdx < oppField.length) {
          oppField[myIdx].hpMod -= 5;
          effects.push(`${side}_flame_${c.id}_hits_${oppField[myIdx].id}`);
        }
        break;

      case ActionType.UseStorm: {
        const oppSide = side === 'p1' ? 'p2' : 'p1';
        for (const opp of oppField) {
          opp.bpMod -= 2;
          opp.barrierUp = false;
        }
        effects.push(`${side}_storm_sweeps_${oppSide}`);
        break;
      }

      case ActionType.UseShadow:
        c.shadow = true;
        effects.push(`${side}_shadow_${c.id}`);
        break;

      case ActionType.UseVoid:
        effects.push(`${side}_void_${c.id}`);
        break;
    }
  }

  // Apply hpMod from Flame
  for (const c of [...p1Work, ...p2Work]) {
    c.hp += c.hpMod;
  }

  // ── Step 4: 5-pair combat ────────────────────────────────────────────────────
  for (let i = 0; i < 5; i++) {
    const a = p1Work[i];
    const b = p2Work[i];

    if (a.shadow || b.shadow) {
      if (a.shadow) effects.push(`p1_shadow_skip_pair_${i}`);
      if (b.shadow) effects.push(`p2_shadow_skip_pair_${i}`);
      continue;
    }

    const aBp = Math.max(0, a.bp + a.bpMod);
    const bBp = Math.max(0, b.bp + b.bpMod);

    // Determine who goes first
    const aFirst = a.ini > b.ini || (a.ini === b.ini && seedByte(s, 24 + i) < 128);

    if (aFirst) {
      if (!b.barrierUp) {
        b.hp -= aBp;
      } else {
        b.barrierUp = false;
        effects.push(`p2_barrier_blocked_pair_${i}`);
      }
      if (b.hp > 0) {
        if (!a.barrierUp) {
          a.hp -= bBp;
        } else {
          a.barrierUp = false;
          effects.push(`p1_barrier_blocked_pair_${i}`);
        }
      }
    } else {
      if (!a.barrierUp) {
        a.hp -= bBp;
      } else {
        a.barrierUp = false;
        effects.push(`p1_barrier_blocked_pair_${i}`);
      }
      if (a.hp > 0) {
        if (!b.barrierUp) {
          b.hp -= aBp;
        } else {
          b.barrierUp = false;
          effects.push(`p2_barrier_blocked_pair_${i}`);
        }
      }
    }
  }

  // ── Step 5: Victory judgment — surviving BP total ────────────────────────────
  const p1BpTotal = p1Work.reduce((sum, c) => sum + (c.hp > 0 ? Math.max(0, c.bp + c.bpMod) : 0), 0);
  const p2BpTotal = p2Work.reduce((sum, c) => sum + (c.hp > 0 ? Math.max(0, c.bp + c.bpMod) : 0), 0);

  let winner;
  if (p1BpTotal > p2BpTotal) winner = 'p1';
  else if (p2BpTotal > p1BpTotal) winner = 'p2';
  else winner = seedByte(s, 31) < 128 ? 'p1' : 'p2';

  effects.push(`winner_${winner}_bp_${p1BpTotal}_vs_${p2BpTotal}`);

  // ── Step 6: Loot ─────────────────────────────────────────────────────────────
  const loserField = winner === 'p1' ? p2Work : p1Work;
  const lootIdx    = seedByte(s, 30) % loserField.length;
  const lootedCardId = loserField[lootIdx].id;
  // Marauder (Legendary id 29) loot bonus is checked by caller via lootedCount
  const lootedCount = 1;

  effects.push(`loot_card_${lootedCardId}`);

  // ── Build result cards ────────────────────────────────────────────────────────
  const toResult = (c) => ({
    id:         c.id,
    faction:    c.faction,
    finalBp:    Math.max(0, c.bp + c.bpMod),
    finalHp:    c.hp,
    destroyed:  c.hp <= 0,
    isLegendary: c.isLegendary,
  });

  return {
    winner,
    p1Cards:      p1Work.map(toResult),
    p2Cards:      p2Work.map(toResult),
    lootPool:     loserField.map(toResult),
    lootedCardId,
    lootedCount,
    p1BpTotal,
    p2BpTotal,
    synergyP1,
    synergyP2,
    effects,
  };
}

// ─── Synergy detection ────────────────────────────────────────────────────────
function detectSynergy(field) {
  const counts = new Array(6).fill(0);
  for (const c of field) counts[c.faction] = (counts[c.faction] ?? 0) + 1;
  for (let f = 0; f < 6; f++) {
    if (counts[f] >= SYNERGY_MIN) return { faction: f };
  }
  return null;
}

// ─── Legendary stubs (Phase 15: flag mgmt only; detailed effects are T-10) ───
function applyLegendaryStubs(p1Work, p2Work, effects) {
  for (const c of p1Work) {
    if (c.isLegendary) effects.push(`p1_legendary_${c.id}_present`);
  }
  for (const c of p2Work) {
    if (c.isLegendary) effects.push(`p2_legendary_${c.id}_present`);
  }
  // Detailed effects (Sentinel hp+3, Oracle peek, etc.) implemented in Phase 15.5 (T-10)
}

// ─── computeSeed ─────────────────────────────────────────────────────────────
export function computeSeed(salt1, salt2, round) {
  return createHash('sha256')
    .update(Buffer.concat([Buffer.from(salt1), Buffer.from(salt2), Buffer.from([round & 0xff])]))
    .digest();
}

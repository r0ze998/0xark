#!/usr/bin/env node
// generate-fixtures.js — Generate cross-test fixture JSON for damage_calc
// Output: fixtures/damage_calc.json (~180 test cases)
//
// Run: node tools/generate-fixtures.js
//
// Cases:
//   Base 100: random valid decks with varied seeds
//   追加A: actionType × passive ability combinations (36 cases)
//   追加B: actionType vs actionType matchups at pair 0 (36 cases)
//   追加C: edge cases (all-shadow, all-barrier, all-flame, draw, all-legendary)

import { createHash } from 'node:crypto';
import { writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dir = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dir, '..');

// ── Import damage-calc and cards from tools/ai-agent/src ──────────────────────
const { damageCalc, computeSeed } = await import('./ai-agent/src/damage-calc.js');
const { CARD_DATA, CARD_ABILITIES } = await import('./ai-agent/src/cards.js');

// ── Helpers ────────────────────────────────────────────────────────────────────

/** Build cardById map */
const cardById = new Array(61).fill(null);
for (const row of CARD_DATA) cardById[row[0]] = row;

function getCard(id) {
  const row = cardById[id];
  if (!row) return null;
  return {
    id: row[0], faction: row[1], rarity: row[2], bp: row[3], hp: row[4],
    ini: row[5], actionType: row[6], isLegendary: row[7],
    ability: CARD_ABILITIES[id] ?? null,
  };
}

/** Convert card ID to CardState for damage-calc */
function toCardState(id, actionTypeOverride) {
  const c = getCard(id);
  if (!c) throw new Error(`Unknown card id: ${id}`);
  return { ...c, actionType: actionTypeOverride ?? c.actionType };
}

/** Deterministic seed from two 32-byte salts and a round byte */
function makeSeed(salt1Hex, salt2Hex, round) {
  const s1 = Buffer.from(salt1Hex, 'hex');
  const s2 = Buffer.from(salt2Hex, 'hex');
  const merged = Buffer.alloc(s1.length + s2.length + 1);
  s1.copy(merged, 0);
  s2.copy(merged, s1.length);
  merged[s1.length + s2.length] = round & 0xff;
  return Array.from(createHash('sha256').update(merged).digest());
}

/** Simple deterministic hex salt from index */
function hexSalt(n) {
  return createHash('sha256').update(`salt_${n}`).digest('hex');
}

/** All card IDs grouped by faction */
const BY_FACTION = [[], [], [], [], [], []];
for (const row of CARD_DATA) BY_FACTION[row[1]].push(row[0]);

/** Pick 5 cards from a faction (or mix) deterministically */
function faction5(factionIdx, offset = 0) {
  const pool = BY_FACTION[factionIdx];
  const out = [];
  for (let i = 0; i < 5; i++) out.push(pool[(i + offset) % pool.length]);
  return out;
}

/** Build a 10-element card_ids array (first 5 used, rest 0) */
function toCardIds(ids5) {
  return [...ids5, 0, 0, 0, 0, 0];
}

/** Run damage-calc and extract only what Rust will assert */
function run(p1Ids5, p2Ids5, seed, actionOverridesP1 = {}, actionOverridesP2 = {}) {
  const p1Field = p1Ids5.map((id, i) => toCardState(id, actionOverridesP1[i]));
  const p2Field = p2Ids5.map((id, i) => toCardState(id, actionOverridesP2[i]));
  const result = damageCalc({ p1Field, p2Field, seed });
  return {
    card_ids_p1: toCardIds(p1Ids5),
    card_ids_p2: toCardIds(p2Ids5),
    // Effective action types after any per-card overrides (Rust uses these directly)
    action_types_p1: p1Field.map(c => c.actionType),
    action_types_p2: p2Field.map(c => c.actionType),
    seed,
    expected: {
      winner:         result.winner,        // 'p1' | 'p2'
      p1_bp_total:    result.p1BpTotal,
      p2_bp_total:    result.p2BpTotal,
      looted_card_id: result.lootedCardId,
    },
  };
}

const fixtures = [];

// ── Base 100: varied random-ish decks ─────────────────────────────────────────
for (let i = 0; i < 100; i++) {
  const f1 = i % 6;
  const f2 = (i + 1) % 6;
  const salt1 = hexSalt(i * 2);
  const salt2 = hexSalt(i * 2 + 1);
  const seed = makeSeed(salt1, salt2, (i % 5) + 1);
  fixtures.push(run(faction5(f1, i), faction5(f2, i + 3), seed));
}

// ── 追加A: actionType × passive ability combinations (36 cases) ──────────────
// P1 has one card with the passive (Rare), rest Knights
// P2 uses one specific actionType at slot 0
const PASSIVE_CARDS = [9, 19, 29, 39, 49, 59]; // Rare cards with passives
const ACTION_TYPES = [0, 1, 2, 3, 4, 5];

for (const passiveId of PASSIVE_CARDS) {
  const passiveCard = getCard(passiveId);
  // Fill p1 with the passive card at slot 0 + 4 Knights
  const p1Ids = [passiveId, 1, 2, 3, 4];
  for (let atIdx = 0; atIdx < 6; atIdx++) {
    // P2 uses a specific actionType at slot 0
    const p2BaseCard = getCard(21); // Pirate Cutthroat as a base
    const p2Ids = [21, 22, 23, 24, 25];
    const salt1 = hexSalt(200 + PASSIVE_CARDS.indexOf(passiveId) * 6 + atIdx);
    const salt2 = hexSalt(300 + PASSIVE_CARDS.indexOf(passiveId) * 6 + atIdx);
    const seed = makeSeed(salt1, salt2, 1);
    fixtures.push(run(p1Ids, p2Ids, seed, {}, { 0: atIdx }));
  }
}

// ── 追加B: actionType vs actionType at pair 0 (36 cases) ─────────────────────
// Both sides have equal-speed cards at slot 0 to test action resolution
// Use Scholar (ini=5) cards so they go first; use ini-neutral pairs otherwise
for (let at1 = 0; at1 < 6; at1++) {
  for (let at2 = 0; at2 < 6; at2++) {
    // P1 slot 0: Scholar id 31 (ini=4), P2 slot 0: Scholar id 32 (ini=4)
    const p1Ids = [31, 1, 2, 3, 4];
    const p2Ids = [32, 11, 12, 13, 14];
    const salt1 = hexSalt(400 + at1 * 6 + at2);
    const salt2 = hexSalt(500 + at1 * 6 + at2);
    const seed = makeSeed(salt1, salt2, 2);
    fixtures.push(run(p1Ids, p2Ids, seed, { 0: at1 }, { 0: at2 }));
  }
}

// ── 追加C: edge cases ─────────────────────────────────────────────────────────

// C1: 全員 shadow (攻撃不可 → BP合計で判定)
{
  const p1 = [21, 22, 23, 24, 25]; // Pirates (action shadow)
  const p2 = [26, 27, 28, 29, 30];
  const seed = makeSeed(hexSalt(600), hexSalt(601), 3);
  fixtures.push(run(p1, p2, seed, {0:4,1:4,2:4,3:4,4:4}, {0:4,1:4,2:4,3:4,4:4}));
}

// C2: 全員 barrier (全 barrier 同士 → barrier 消費後に通常戦闘)
{
  const p1 = [1, 2, 3, 4, 6];  // Knights
  const p2 = [11, 12, 13, 14, 16]; // Merchants
  const seed = makeSeed(hexSalt(602), hexSalt(603), 1);
  fixtures.push(run(p1, p2, seed, {0:1,1:1,2:1,3:1,4:1}, {0:1,1:1,2:1,3:1,4:1}));
}

// C3: 全員 flame (お互い HP削り)
{
  const p1 = [21, 23, 25, 27, 29]; // Pirate Flame
  const p2 = [51, 53, 55, 57, 59]; // Engineer UseCrystal
  const seed = makeSeed(hexSalt(604), hexSalt(605), 4);
  fixtures.push(run(p1, p2, seed, {0:2,1:2,2:2,3:2,4:2}, {0:2,1:2,2:2,3:2,4:2}));
}

// C4: 完全引き分け (同 bp/hp/ini/actionType → seed[31] で解決)
{
  // Use 5 identical Knights (id=1, same stats)
  const p1 = [1, 1, 1, 1, 1];
  const p2 = [1, 1, 1, 1, 1];
  // Craft seed where seed[31] < 128 → p1 wins
  const seedArr = new Array(32).fill(0);
  seedArr[31] = 100; // < 128 → p1 wins tiebreak
  fixtures.push(run(p1, p2, seedArr, {0:0,1:0,2:0,3:0,4:0}, {0:0,1:0,2:0,3:0,4:0}));
  // Also: seed[31] >= 128 → p2 wins
  const seedArr2 = new Array(32).fill(0);
  seedArr2[31] = 200; // >= 128 → p2 wins
  fixtures.push(run(p1, p2, seedArr2, {0:0,1:0,2:0,3:0,4:0}, {0:0,1:0,2:0,3:0,4:0}));
}

// C5: 全員 Legendary (6 Legendary IDs: 10,20,30,40,50,60 → use 5)
{
  const p1 = [10, 20, 30, 40, 50]; // 5 Legendaries
  const p2 = [60, 10, 20, 30, 40]; // Legendaries (overlap OK for test)
  const seed = makeSeed(hexSalt(608), hexSalt(609), 5);
  fixtures.push(run(p1, p2, seed));
}

// C6: INI 同点 seed tiebreak (同INI cards, different seed outcomes)
{
  // Knights all have ini=2 or ini=3; pick a mix
  const p1 = [1, 2, 4, 6, 7]; // all ini 2-3
  const p2 = [11, 12, 14, 16, 17]; // Merchant ini 2-3
  // Two different seeds to exercise different sort outcomes
  const seedA = makeSeed(hexSalt(610), hexSalt(611), 1);
  const seedB = makeSeed(hexSalt(612), hexSalt(613), 1);
  fixtures.push(run(p1, p2, seedA));
  fixtures.push(run(p1, p2, seedB));
}

// Write output
const outDir = join(ROOT, 'fixtures');
mkdirSync(outDir, { recursive: true });
const outPath = join(outDir, 'damage_calc.json');
writeFileSync(outPath, JSON.stringify(fixtures, null, 2));
console.log(`Generated ${fixtures.length} fixtures → ${outPath}`);

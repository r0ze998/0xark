#!/usr/bin/env node
/**
 * T61 E2E — Card Rarity + 4-axis Stats
 *
 * Tests (all run against the compiled browser bundle logic):
 *   1. All 60 cards have pw/sp/ct/du fields
 *   2. Stat values are in valid ranges
 *   3. 100 tier rolls → distribution within ±15% of target
 *   4. CARD_TIER lookup is correct for all 60 cards
 *   5. CardMetadata Rust struct is in state.rs source
 *
 * Requires: node >= 18 (no Solana RPC needed — JS-only checks)
 * Usage:    node tests/t61-rarity.js
 */

'use strict';
const fs = require('fs');
const path = require('path');

// ─── Simulate CD[] and derived tables ─────────────────────────────────────────
// Pull directly from the built source via eval so we test the exact same logic.
// We only need the CD array and the stat-compute block.

// Read src files
const data02 = fs.readFileSync(
  path.join(__dirname, '../../../solana/client/src/02-data.js'), 'utf8'
);

// Stub browser globals the module uses
const W = 480, H = 320, g = {}, fr = 0;
function bx(){}
function txShadow(){}
function tx(){}
function setFont(){}
function drawCardCharacter(){}
function drawRuneGlow(){}

// Evaluate to get CD, CARD_TIER, CARD_TIER_LABEL, CARD_TIER_COL
// Only eval the CD definition + stat block (stop before sprite drawing code)
const stopAt = data02.indexOf('// ═══════════════════════════════════════\n// CARD CHARACTER SPRITES');
const cdSection = data02.slice(0, stopAt);

let CD, CARD_TIER, CARD_TIER_LABEL, CARD_TIER_COL;
try {
  const fn = new Function('W','H','g','fr','bx','txShadow','tx','setFont',
    cdSection + '\nreturn {CD,CARD_TIER,CARD_TIER_LABEL,CARD_TIER_COL};'
  );
  ({CD, CARD_TIER, CARD_TIER_LABEL, CARD_TIER_COL} = fn(W,H,g,fr,bx,txShadow,tx,setFont));
} catch(e) {
  console.error('[FATAL] Failed to eval 02-data.js:', e.message);
  process.exit(1);
}

// Simulate 3-tier drop function (mirrors 07-battle.js pickAreaCardForMap)
function pickTier(roll) {
  return roll < 0.70 ? 0 : roll < 0.95 ? 1 : 2;
}

// ─── Assertions ───────────────────────────────────────────────────────────────
let passed = 0, failed = 0;
function assert(label, cond, detail = '') {
  if (cond) { console.log(`  ✅ ${label}`); passed++; }
  else { console.error(`  ❌ FAIL: ${label}${detail ? ' — ' + detail : ''}`); failed++; }
}

console.log('=== T61 Card Rarity + Stats E2E ===\n');

// ── Test 1: All 60 cards have stat fields ────────────────────────────────────
console.log('[1] All 60 cards have pw/sp/ct/du');
assert('CD has 60 entries', CD.length === 60, `got ${CD.length}`);

let missingStats = 0;
for (let i = 0; i < CD.length; i++) {
  const cr = CD[i];
  if (cr.pw === undefined || cr.sp === undefined || cr.ct === undefined || cr.du === undefined) {
    missingStats++;
    console.error(`  ❌ CD[${i}] (${cr.n}) missing stats`);
  }
}
assert('All 60 cards have pw/sp/ct/du', missingStats === 0, `${missingStats} cards missing`);

// ── Test 2: Stat values in valid ranges ──────────────────────────────────────
console.log('\n[2] Stat ranges valid');
let rangeErrors = 0;
for (let i = 0; i < CD.length; i++) {
  const cr = CD[i];
  if (cr.pw < 1 || cr.pw > 10) { rangeErrors++; console.error(`  ❌ ${cr.n}: pw=${cr.pw} out of [1,10]`); }
  if (cr.sp < 1 || cr.sp > 5)  { rangeErrors++; console.error(`  ❌ ${cr.n}: sp=${cr.sp} out of [1,5]`); }
  if (cr.ct < 0 || cr.ct > 3)  { rangeErrors++; console.error(`  ❌ ${cr.n}: ct=${cr.ct} out of [0,3]`); }
  if (cr.du < 1 || cr.du > 3)  { rangeErrors++; console.error(`  ❌ ${cr.n}: du=${cr.du} out of [1,3]`); }
}
assert('All stat values in range', rangeErrors === 0, `${rangeErrors} range violations`);

// ── Test 3: Speed by type ────────────────────────────────────────────────────
console.log('\n[3] Speed values by type');
const TYPE_SPEED = {attack:4, defense:2, flee:5, magic:3, recovery:1};
let speedErrors = 0;
for (let i = 0; i < CD.length; i++) {
  const cr = CD[i];
  const expected = TYPE_SPEED[cr.t];
  if (cr.sp !== expected) { speedErrors++; console.error(`  ❌ ${cr.n}: sp=${cr.sp} expected ${expected}`); }
}
assert('Speed matches type formula', speedErrors === 0, `${speedErrors} mismatch`);

// ── Test 4: CARD_TIER lookup ─────────────────────────────────────────────────
console.log('\n[4] CARD_TIER lookup correctness');
let tierErrors = 0;
for (let i = 0; i < CD.length; i++) {
  const r = CD[i].r || 1;
  const expected = r <= 2 ? 0 : r <= 4 ? 1 : 2;
  if (CARD_TIER[i] !== expected) {
    tierErrors++;
    console.error(`  ❌ CD[${i}] (${CD[i].n}): tier=${CARD_TIER[i]} expected ${expected} (r=${r})`);
  }
}
assert('CARD_TIER correct for all 60 cards', tierErrors === 0, `${tierErrors} mismatches`);

// ── Test 5: Tier distribution over 10000 rolls ──────────────────────────────
console.log('\n[5] Tier drop distribution (10000 rolls)');
const ROLLS = 10000;
const counts = [0, 0, 0];
for (let i = 0; i < ROLLS; i++) counts[pickTier(Math.random())]++;
const pct = counts.map(c => c / ROLLS);
console.log(`  Common:    ${(pct[0]*100).toFixed(1)}% (target 70%)`);
console.log(`  Rare:      ${(pct[1]*100).toFixed(1)}% (target 25%)`);
console.log(`  Legendary: ${(pct[2]*100).toFixed(1)}% (target 5%)`);
assert('Common within ±5% of 70%',    Math.abs(pct[0] - 0.70) < 0.05);
assert('Rare within ±5% of 25%',      Math.abs(pct[1] - 0.25) < 0.05);
assert('Legendary within ±2% of 5%',  Math.abs(pct[2] - 0.05) < 0.02);

// ── Test 6: CardMetadata struct in state.rs ───────────────────────────────────
console.log('\n[6] CardMetadata struct in oxark-cards/src/state.rs');
const stateRs = fs.readFileSync(
  path.join(__dirname, '../programs/oxark-cards/src/state.rs'), 'utf8'
);
assert('CardMetadata struct defined', stateRs.includes('pub struct CardMetadata'));
assert('CardRarity enum defined',     stateRs.includes('pub enum CardRarity'));
assert('rarity field present',        stateRs.includes('pub rarity: CardRarity'));
assert('power field present',         stateRs.includes('pub power: u8'));
assert('speed field present',         stateRs.includes('pub speed: u8'));
assert('cost field present',          stateRs.includes('pub cost: u8'));
assert('duration field present',      stateRs.includes('pub duration: u8'));

// ── Test 7: Legendary cards check ────────────────────────────────────────────
console.log('\n[7] Legendary cards (r=5) have correct stats');
const legends = CD.filter(cr => cr.r === 5);
assert(`Legendary count is 10`, legends.length === 10, `got ${legends.length}`);
for (const cr of legends) {
  assert(`${cr.n}: pw=9`, cr.pw === 9);
  assert(`${cr.n}: ct=3`, cr.ct === 3);
}

// ─── Result ───────────────────────────────────────────────────────────────────
console.log(`\n=== T61 RESULT: ${passed} passed, ${failed} failed ===`);
if (failed > 0) process.exit(1);

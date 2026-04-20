#!/usr/bin/env node
/**
 * T62 E2E — Card Synergy System
 *
 * Tests:
 *   1. SYNERGY_TABLE exists and has entries
 *   2. Type-pair synergies fire correctly (attack+magic → ARCANE_BLADE)
 *   3. Mono-type synergies fire (2x attack → BARRAGE)
 *   4. Legendary ID combos fire (VOIDBLADE+SINGULARITY → VOID_TEAR)
 *   5. No synergy when hand is empty
 *   6. No synergy when types don't match
 *   7. Priority: ID combos win over type synergies
 *   8. checkSynergy source present in build output
 *
 * Usage: node tests/t62-synergy.js
 */

'use strict';
const fs = require('fs');
const path = require('path');

// ─── Load CD + synergy from 02-data.js ────────────────────────────────────────
const data02 = fs.readFileSync(
  path.join(__dirname, '../../../solana/client/src/02-data.js'), 'utf8'
);

// Stub browser globals
const W = 480, H = 320, g = {}, fr = 0;
function bx(){}
function txShadow(){}
function tx(){}
function setFont(){}
function drawCardCharacter(){}
function drawRuneGlow(){}

// Eval up to end of SYNERGY_TABLE section (stop before sprite code)
const stopAt = data02.indexOf('// ═══════════════════════════════════════\n// CARD CHARACTER SPRITES');
const cdSection = data02.slice(0, stopAt);

let CD, SYNERGY_TABLE, checkSynergy, CARD_TIER;
try {
  const fn = new Function('W','H','g','fr','bx','txShadow','tx','setFont',
    cdSection + '\nreturn {CD,SYNERGY_TABLE,checkSynergy,CARD_TIER};'
  );
  ({CD,SYNERGY_TABLE,checkSynergy,CARD_TIER} = fn(W,H,g,fr,bx,txShadow,tx,setFont));
} catch(e) {
  console.error('[FATAL] Failed to eval 02-data.js:', e.message);
  process.exit(1);
}

// ─── Assertions ───────────────────────────────────────────────────────────────
let passed = 0, failed = 0;
function assert(label, cond, detail = '') {
  if (cond) { console.log(`  ✅ ${label}`); passed++; }
  else { console.error(`  ❌ FAIL: ${label}${detail ? ' — ' + detail : ''}`); failed++; }
}

console.log('=== T62 Card Synergy E2E ===\n');

// ── Test 1: SYNERGY_TABLE exists ─────────────────────────────────────────────
console.log('[1] SYNERGY_TABLE exists');
assert('SYNERGY_TABLE is array', Array.isArray(SYNERGY_TABLE));
assert('SYNERGY_TABLE has entries', SYNERGY_TABLE.length >= 10,
  `got ${SYNERGY_TABLE.length}`);

// Validate table structure
let structErr = 0;
for (const s of SYNERGY_TABLE) {
  if (!s.name || !s.label || !s.col || !s.bonus) {
    structErr++;
    console.error(`  ❌ Entry ${s.name||'?'} missing required field`);
  }
  if (!s.ids && !s.types) {
    structErr++;
    console.error(`  ❌ Entry ${s.name} needs ids or types`);
  }
}
assert('All synergy entries have required fields', structErr === 0,
  `${structErr} structural errors`);

// ── Test 2: Type-pair synergy — attack+magic → ARCANE_BLADE ─────────────────
console.log('\n[2] Type-pair: attack+magic → ARCANE_BLADE');
// IGNIS (id=3, attack r3), INFERNO (id=43, magic r3)
const hand1 = [3, 43, 0, 0, 0];
const syn1 = checkSynergy(hand1);
assert('attack+magic fires a synergy', syn1 !== null, 'got null');
assert('attack+magic → ARCANE_BLADE', syn1 && syn1.name === 'ARCANE_BLADE',
  `got ${syn1 && syn1.name}`);
assert('ARCANE_BLADE has pw_add', syn1 && syn1.bonus.pw_add > 0,
  `got ${syn1 && syn1.bonus.pw_add}`);

// ── Test 3: Mono-type — 2x attack → BARRAGE ─────────────────────────────────
console.log('\n[3] Mono-type: 2x attack → BARRAGE');
// STRIKE (id=4, attack r1) + SLASH (id=5, attack r1)
const hand2 = [4, 5, 0, 0, 0];
const syn2 = checkSynergy(hand2);
assert('2x attack fires a synergy', syn2 !== null, 'got null');
assert('2x attack → BARRAGE', syn2 && syn2.name === 'BARRAGE',
  `got ${syn2 && syn2.name}`);

// ── Test 4: 2x defense → FORTRESS ───────────────────────────────────────────
console.log('\n[4] 2x defense → FORTRESS');
// GUARD (id=13) + PARRY (id=14)
const hand4 = [13, 14, 0, 0, 0];
const syn4 = checkSynergy(hand4);
assert('2x defense fires a synergy', syn4 !== null, 'got null');
assert('2x defense → FORTRESS', syn4 && syn4.name === 'FORTRESS',
  `got ${syn4 && syn4.name}`);
assert('FORTRESS has block=true', syn4 && syn4.bonus.block === true);

// ── Test 5: Legendary ID combo — VOIDBLADE+SINGULARITY → VOID_TEAR ──────────
console.log('\n[5] Legendary ID combo: VOIDBLADE(12)+SINGULARITY(48) → VOID_TEAR');
// VOIDBLADE = id 12, SINGULARITY = id 48
const hand5 = [12, 48, 0, 0, 0];
const syn5 = checkSynergy(hand5);
assert('VOIDBLADE+SINGULARITY fires synergy', syn5 !== null, 'got null');
assert('→ VOID_TEAR', syn5 && syn5.name === 'VOID_TEAR',
  `got ${syn5 && syn5.name}`);
assert('VOID_TEAR has echo=true', syn5 && syn5.bonus.echo === true);
assert('VOID_TEAR has high pw_add', syn5 && syn5.bonus.pw_add >= 5);

// ── Test 6: ARK GATE(35)+ARK BLESS(60) → ARK_AWAKENING ──────────────────────
console.log('\n[6] Legendary ID combo: ARK GATE(35)+ARK BLESS(60) → ARK_AWAKENING');
const hand6 = [35, 60, 0, 0, 0];
const syn6 = checkSynergy(hand6);
assert('ARK GATE+ARK BLESS fires synergy', syn6 !== null, 'got null');
assert('→ ARK_AWAKENING', syn6 && syn6.name === 'ARK_AWAKENING',
  `got ${syn6 && syn6.name}`);
assert('ARK_AWAKENING has escape_bonus', syn6 && syn6.bonus.escape_bonus === true);

// ── Test 7: No synergy when hand is empty ────────────────────────────────────
console.log('\n[7] Empty hand → no synergy');
const syn7 = checkSynergy([0,0,0,0,0]);
assert('Empty hand → null', syn7 === null, `got ${syn7 && syn7.name}`);

// ── Test 8: No synergy on single card of one type ────────────────────────────
console.log('\n[8] Single card, no synergy pair');
const syn8 = checkSynergy([13, 0, 0, 0, 0]); // just GUARD (defense)
assert('Single defense card → null (no pair)', syn8 === null,
  `got ${syn8 && syn8.name}`);

// ── Test 9: ID combos take priority over type synergies ──────────────────────
console.log('\n[9] ID combo priority > type synergy');
// VOIDBLADE(12, attack)+SINGULARITY(48, magic) → both attack+magic AND VOID_TEAR apply
// VOID_TEAR has higher priority (listed first in table)
const syn9 = checkSynergy([12, 48, 0, 0, 0]);
assert('VOID_TEAR wins over ARCANE_BLADE', syn9 && syn9.name === 'VOID_TEAR',
  `got ${syn9 && syn9.name}`);

// ── Test 10: defense+recovery → BASTION ─────────────────────────────────────
console.log('\n[10] defense+recovery → BASTION');
const hand10 = [13, 49, 0, 0, 0]; // GUARD(defense) + MEND(recovery)
const syn10 = checkSynergy(hand10);
assert('defense+recovery fires synergy', syn10 !== null, 'got null');
assert('→ BASTION', syn10 && syn10.name === 'BASTION',
  `got ${syn10 && syn10.name}`);

// ── Test 11: checkSynergy in built index.html ────────────────────────────────
console.log('\n[11] checkSynergy present in build output');
const built = fs.readFileSync(
  path.join(__dirname, '../../../solana/client/index.html'), 'utf8'
);
assert('checkSynergy in built file', built.includes('checkSynergy'));
assert('SYNERGY_TABLE in built file', built.includes('SYNERGY_TABLE'));
assert('drawSynergyBanner in built file', built.includes('drawSynergyBanner'));
assert('activeSynergy in built file', built.includes('activeSynergy'));

// ─── Result ───────────────────────────────────────────────────────────────────
console.log(`\n=== T62 RESULT: ${passed} passed, ${failed} failed ===`);
if (failed > 0) process.exit(1);

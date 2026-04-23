#!/usr/bin/env node
/**
 * test_imprint_strategy.js — v3.0-plus imprint collection strategy tests
 *
 * Tests:
 *   1. imprintBpBonus: correct +1 per stat imprint (max +3)
 *   2. veteranImprintTrigger: fires at 5th destruction, not 4th or 6th
 *   3. imprintPriority: prefer stat imprints over cosmetic
 *   4. shouldChaseVeteranImprint: yes when timesDestroyed % 5 === 4
 *   5. soulImprintCosmetic: classified as cosmetic (no BP boost)
 *   6. targetImprintCard: cards with imprint ability ranked higher
 *   7. imprintSnowball: double imprint bonus at 3+ stat imprints
 */

'use strict';

let passed = 0, failed = 0;
function assert(label, cond, detail = '') {
  if (cond) { console.log(`  PASS ${label}`); passed++; }
  else { console.error(`  FAIL ${label}${detail ? ' — ' + detail : ''}`); failed++; }
}

// ── Imprint strategy helpers ──────────────────────────────────────────────────

const IMPRINT_TYPE = { STAT: 'stat', COSMETIC: 'cosmetic' };
const IMPRINT_MAX_STACK = 3;

function imprintBpBonus(statImprints) {
  return Math.min(statImprints, IMPRINT_MAX_STACK);
}

function isVeteranImprintTrigger(timesDestroyed) {
  return timesDestroyed > 0 && timesDestroyed % 5 === 0;
}

function shouldChaseVeteranImprint(timesDestroyed) {
  // One kill away from trigger
  return (timesDestroyed % 5) === 4;
}

function classifyImprint(key) {
  const cosmetics = ['SoulsCollected'];
  return cosmetics.includes(key) ? IMPRINT_TYPE.COSMETIC : IMPRINT_TYPE.STAT;
}

function imprintPriority(imprints) {
  // Sort: stat imprints first, then cosmetic
  return [...imprints].sort((a, b) => {
    const pa = classifyImprint(a.key) === IMPRINT_TYPE.STAT ? 0 : 1;
    const pb = classifyImprint(b.key) === IMPRINT_TYPE.STAT ? 0 : 1;
    return pa - pb;
  });
}

function targetImprintCard(hand) {
  const IMPRINT_ABS = ['veteran_imprint_trigger', 'on_destroy_imprint_souls', 'imprint_self_scale', 'clan_evolve_imprint'];
  return [...hand].sort((a, b) => {
    const ia = IMPRINT_ABS.includes(a.ab) ? 0 : 1;
    const ib = IMPRINT_ABS.includes(b.ab) ? 0 : 1;
    return ia - ib;
  });
}

function imprintSnowball(statImprints) {
  const base = imprintBpBonus(statImprints);
  // imprint_self_scale adds +1 per stat imprint — stack doubles at max
  const selfScaleBonus = Math.min(statImprints, IMPRINT_MAX_STACK);
  return base + selfScaleBonus;
}

// ── Tests ─────────────────────────────────────────────────────────────────────

console.log('\ntest_imprint_strategy.js');
console.log('========================');

// 1. imprintBpBonus
{
  assert('0 stat imprints → 0 bonus', imprintBpBonus(0) === 0);
  assert('2 stat imprints → 2 bonus', imprintBpBonus(2) === 2);
  assert('5 stat imprints → capped at 3', imprintBpBonus(5) === 3);
}

// 2. veteranImprintTrigger at 5th, 10th, 15th
{
  assert('veteran trigger at 5', isVeteranImprintTrigger(5) === true);
  assert('veteran trigger at 10', isVeteranImprintTrigger(10) === true);
  assert('no trigger at 4', isVeteranImprintTrigger(4) === false);
  assert('no trigger at 6', isVeteranImprintTrigger(6) === false);
  assert('no trigger at 0', isVeteranImprintTrigger(0) === false);
}

// 3. shouldChaseVeteranImprint: yes when 1 kill away (4 mod 5)
{
  assert('chase veteran at 4 kills', shouldChaseVeteranImprint(4) === true);
  assert('chase veteran at 9 kills', shouldChaseVeteranImprint(9) === true);
  assert('no chase at 5 kills (just triggered)', shouldChaseVeteranImprint(5) === false);
  assert('no chase at 3 kills (2 away)', shouldChaseVeteranImprint(3) === false);
}

// 4. classifyImprint
{
  assert('Veteran = stat', classifyImprint('Veteran') === IMPRINT_TYPE.STAT);
  assert('Evolved = stat', classifyImprint('Evolved') === IMPRINT_TYPE.STAT);
  assert('SoulsCollected = cosmetic', classifyImprint('SoulsCollected') === IMPRINT_TYPE.COSMETIC);
  assert('BurnCount = stat', classifyImprint('BurnCount') === IMPRINT_TYPE.STAT);
}

// 5. imprintPriority: stat imprints sort before cosmetic
{
  const imprints = [
    { key: 'SoulsCollected', value: 3 },  // cosmetic
    { key: 'Veteran', value: 1 },          // stat
    { key: 'Evolved', value: 2 },          // stat
  ];
  const sorted = imprintPriority(imprints);
  assert('stat imprints come first', sorted[0].key !== 'SoulsCollected');
  assert('cosmetic imprint comes last', sorted[sorted.length - 1].key === 'SoulsCollected');
}

// 6. targetImprintCard: imprint ability cards sort to front
{
  const hand = [
    { id: 10, ab: null, r: 1 },
    { id: 13, ab: 'veteran_imprint_trigger', r: 1 },
    { id: 27, ab: null, r: 2 },
  ];
  const sorted = targetImprintCard(hand);
  assert('veteran_imprint_trigger card sorts first', sorted[0].id === 13);
}

// 7. imprintSnowball: at 3 stat imprints, total bonus = 6 (3+3)
{
  assert('snowball at 0 imprints = 0', imprintSnowball(0) === 0);
  assert('snowball at 1 imprint = 2', imprintSnowball(1) === 2);
  assert('snowball at 3 imprints = 6', imprintSnowball(3) === 6);
  assert('snowball at 5 imprints = capped at 6', imprintSnowball(5) === 6);
}

// ── Summary ───────────────────────────────────────────────────────────────────
console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);

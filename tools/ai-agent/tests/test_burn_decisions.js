#!/usr/bin/env node
/**
 * test_burn_decisions.js — v3.0-plus burn ability decision tests
 *
 * Tests:
 *   1. shouldUseBurnBoost: yes when hand has 2+ Commons and BP gap exists
 *   2. shouldUseBurnBoost: no when hand has only 1 Common (keep last one)
 *   3. shouldUseBurnBoost: no when burn_count is 0 and burn_count_scaler is offline
 *   4. burnCountScalerBpBonus: correct +1 per burn
 *   5. handBurnTarget: selects opponent's highest-value hand card
 *   6. burnRiskReward: returns false when opponent HP is low (win anyway)
 *   7. shouldPrioritizeKill: yes when opponent has hand_burn_on_destroy card active
 */

'use strict';

let passed = 0, failed = 0;
function assert(label, cond, detail = '') {
  if (cond) { console.log(`  PASS ${label}`); passed++; }
  else { console.error(`  FAIL ${label}${detail ? ' — ' + detail : ''}`); failed++; }
}

// ── Burn decision helpers (agent v3.0-plus strategy layer) ────────────────────

function countCommons(hand) {
  return hand.filter(c => (c.rar ?? c.r ?? 0) === 0).length;
}

function shouldUseBurnBoost(state) {
  const commons = countCommons(state.hand);
  if (commons < 2) return false;                    // keep at least one Common
  const bp_gap = (state.agentMaxBP || 4) - (state.agentBP || 0);
  return bp_gap >= 2;                               // only worth it if BP boost matters
}

function burnCountScalerBpBonus(burnCount) {
  return burnCount;                                  // +1 per burn, uncapped
}

function handBurnTarget(opponentHand) {
  if (!opponentHand || opponentHand.length === 0) return null;
  return opponentHand.reduce((best, c) => (c.r || 0) > (best.r || 0) ? c : best, opponentHand[0]);
}

function burnRiskReward(state) {
  if (state.opponentHP <= 2) return false;          // can win without burning
  if (countCommons(state.hand) < 2) return false;
  const bonus = burnCountScalerBpBonus(state.burnCount || 0);
  return bonus >= 2;                                 // only if scaler gives meaningful boost
}

function shouldPrioritizeKill(opponentField) {
  return opponentField.some(c => c.ab === 'hand_burn_on_destroy');
}

// ── Tests ─────────────────────────────────────────────────────────────────────

console.log('\ntest_burn_decisions.js');
console.log('======================');

// 1. shouldUseBurnBoost: yes when 2+ commons and BP gap
{
  const state = {
    hand: [
      { id: 1, r: 0, rar: 0 },  // Common
      { id: 2, r: 0, rar: 0 },  // Common
      { id: 5, r: 1, rar: 1 },  // Uncommon
    ],
    agentBP: 2, agentMaxBP: 6,
  };
  assert('burn boost YES when 2+ commons + BP gap', shouldUseBurnBoost(state) === true);
}

// 2. shouldUseBurnBoost: no when only 1 Common
{
  const state = {
    hand: [{ id: 1, r: 0, rar: 0 }, { id: 5, r: 2, rar: 2 }],
    agentBP: 2, agentMaxBP: 6,
  };
  assert('burn boost NO when only 1 common', shouldUseBurnBoost(state) === false);
}

// 3. shouldUseBurnBoost: no when BP is already maxed
{
  const state = {
    hand: [{ id: 1, r: 0, rar: 0 }, { id: 2, r: 0, rar: 0 }],
    agentBP: 6, agentMaxBP: 6,
  };
  assert('burn boost NO when BP maxed out', shouldUseBurnBoost(state) === false);
}

// 4. burnCountScalerBpBonus: +1 per burn
{
  assert('scaler 0 burns = 0 bonus', burnCountScalerBpBonus(0) === 0);
  assert('scaler 3 burns = 3 bonus', burnCountScalerBpBonus(3) === 3);
  assert('scaler 7 burns = 7 bonus', burnCountScalerBpBonus(7) === 7);
}

// 5. handBurnTarget: selects highest-rarity card
{
  const hand = [{ id: 10, r: 1 }, { id: 55, r: 3 }, { id: 20, r: 2 }];
  const target = handBurnTarget(hand);
  assert('burn targets highest rarity (id=55)', target && target.id === 55);
}

// 6. burnRiskReward: false when opponent HP too low
{
  const state = { opponentHP: 1, hand: [{ r: 0 }, { r: 0 }], burnCount: 5 };
  assert('no burn risk when opp can die anyway', burnRiskReward(state) === false);
}

// 7. shouldPrioritizeKill: yes when opponent has hand_burn_on_destroy
{
  const field = [
    { id: 5, ab: 'hand_burn_on_destroy' },
    { id: 8, ab: null },
  ];
  assert('prioritize kill for hand_burn_on_destroy', shouldPrioritizeKill(field) === true);
}
{
  const field = [{ id: 8, ab: 'clan_evolve' }];
  assert('no priority kill when no hand_burn card', shouldPrioritizeKill(field) === false);
}

// ── Summary ───────────────────────────────────────────────────────────────────
console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);

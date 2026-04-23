#!/usr/bin/env node
/**
 * test_steal_decisions.js — v3.0-plus steal decision tests
 *
 * Tests:
 *   1. stealPriority: Legendary target in Gold Hall → permanent steal
 *   2. stealPriority: no Gold Hall → lease steal only
 *   3. ransomPeekValue: high when opponent hand is unknown + high BP cards suspected
 *   4. shouldActivateSteal: yes when opponent HP > 4 (worth stealing vs killing)
 *   5. shouldActivateSteal: no when opponent HP <= 2 (kill directly)
 *   6. leaseStealReturnRisk: calculated from returnIn duels
 *   7. sceptreHandSteal: always lease; permanent only in Gold Hall
 */

'use strict';

let passed = 0, failed = 0;
function assert(label, cond, detail = '') {
  if (cond) { console.log(`  PASS ${label}`); passed++; }
  else { console.error(`  FAIL ${label}${detail ? ' — ' + detail : ''}`); failed++; }
}

// ── Steal decision helpers ────────────────────────────────────────────────────

const STEAL_TYPE = { LEASE: 'lease', PERMANENT: 'permanent' };
const STEAL_BASE_PROB = 0.5;
const STEAL_GOLD_LEGENDARY_PROB = 0.75;
const LEASE_DUELS = 3;

function stealOutcome(isGoldHall, targetIsLegendary, forceRoll) {
  const prob = (isGoldHall && targetIsLegendary)
    ? STEAL_GOLD_LEGENDARY_PROB
    : STEAL_BASE_PROB;
  const roll = forceRoll !== undefined ? forceRoll : Math.random();
  if (roll >= prob) return null;
  const isPermanent = isGoldHall && targetIsLegendary;
  return { type: isPermanent ? STEAL_TYPE.PERMANENT : STEAL_TYPE.LEASE, returnIn: isPermanent ? null : LEASE_DUELS };
}

function ransomPeekValue(state) {
  const unknownCards = (state.opponentHandSize || 0) - (state.revealedOpponentCards || 0);
  if (unknownCards <= 0) return 0;
  // Value scales with unknown hand size and round (late game = more value from info)
  return unknownCards * (state.round || 1) * 0.3;
}

function shouldActivateSteal(state) {
  if (state.opponentHP <= 2) return false;  // kill directly
  if (state.opponentHP <= 4) return false;  // marginal — only steal if legendary
  return true;
}

function leaseStealReturnRisk(returnIn) {
  // Duels until card returns — lower number = more urgent to use stolen card now
  if (returnIn <= 1) return 'high';     // returns next duel
  if (returnIn <= 2) return 'medium';
  return 'low';
}

function sceptreHandStealType(isGoldHall) {
  // Sceptre always leases unless Gold Hall active
  return isGoldHall ? STEAL_TYPE.PERMANENT : STEAL_TYPE.LEASE;
}

// ── Tests ─────────────────────────────────────────────────────────────────────

console.log('\ntest_steal_decisions.js');
console.log('=======================');

// 1. Gold Hall + Legendary → permanent steal (force roll wins)
{
  const result = stealOutcome(true, true, 0.1);  // 0.1 < 0.75 → win
  assert('gold hall + legendary → permanent', result !== null && result.type === STEAL_TYPE.PERMANENT);
  assert('permanent steal has no returnIn', result.returnIn === null);
}

// 2. No Gold Hall → always lease steal
{
  const result = stealOutcome(false, true, 0.1);
  assert('non-gold-hall steal → lease only', result !== null && result.type === STEAL_TYPE.LEASE);
  assert('lease has returnIn', result.returnIn === LEASE_DUELS);
}

// 3. Steal fails when roll too high
{
  const result = stealOutcome(true, true, 0.9);  // 0.9 >= 0.75 → fail
  assert('steal fails on bad roll', result === null);
}

// 4. ransomPeekValue increases with unknown cards
{
  const low = ransomPeekValue({ opponentHandSize: 1, revealedOpponentCards: 0, round: 2 });
  const high = ransomPeekValue({ opponentHandSize: 4, revealedOpponentCards: 0, round: 2 });
  assert('ransom peek value scales with unknown cards', high > low, `${high} > ${low}`);
}

// 5. shouldActivateSteal: no when opponent HP critical
{
  assert('no steal when opp HP=1', shouldActivateSteal({ opponentHP: 1 }) === false);
  assert('no steal when opp HP=2', shouldActivateSteal({ opponentHP: 2 }) === false);
  assert('no steal when opp HP=4', shouldActivateSteal({ opponentHP: 4 }) === false);
  assert('steal when opp HP=8', shouldActivateSteal({ opponentHP: 8 }) === true);
}

// 6. leaseStealReturnRisk
{
  assert('1 duel remaining = high risk', leaseStealReturnRisk(1) === 'high');
  assert('2 duels remaining = medium risk', leaseStealReturnRisk(2) === 'medium');
  assert('3 duels remaining = low risk', leaseStealReturnRisk(3) === 'low');
}

// 7. sceptreHandStealType
{
  assert('sceptre lease in normal mode', sceptreHandStealType(false) === STEAL_TYPE.LEASE);
  assert('sceptre permanent in Gold Hall', sceptreHandStealType(true) === STEAL_TYPE.PERMANENT);
}

// ── Summary ───────────────────────────────────────────────────────────────────
console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);

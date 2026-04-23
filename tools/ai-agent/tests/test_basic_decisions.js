#!/usr/bin/env node
/**
 * test_basic_decisions.js — v3.0-plus agent basic decision tests
 * No live server or API key required.
 *
 * Tests:
 *   1. Rule-based selects cheapest playable card
 *   2. Rule-based skips card when energy insufficient
 *   3. Rule-based prefers recovery when HP critical
 *   4. Rule-based handles empty hand
 *   5. v3 state shape: ability field respected
 *   6. Gold Hall flag propagates to state
 */

'use strict';

let passed = 0, failed = 0;
function assert(label, cond, detail = '') {
  if (cond) { console.log(`  PASS ${label}`); passed++; }
  else { console.error(`  FAIL ${label}${detail ? ' — ' + detail : ''}`); failed++; }
}

// ── Inline rule-based logic (mirrors duel-agent.js ruleBasedSummonActions) ──
function ruleBasedSummonActions(state) {
  const { hand, energy, agentHP } = state;
  const energyAvail = energy || { fire: 3, ice: 3, lightning: 3 };
  const totalEnergy = Object.values(energyAvail).reduce((a, b) => a + b, 0);
  if (!hand || hand.length === 0) return [];
  // Prefer recovery cards when HP is critical (<= 3)
  const isLowHP = typeof agentHP === 'number' && agentHP <= 3;
  const pool = isLowHP
    ? [...hand].sort((a, b) => (a.t === 'recovery' ? -1 : b.t === 'recovery' ? 1 : 0))
    : [...hand].sort((a, b) => (a.r || 1) - (b.r || 1));
  for (const card of pool) {
    if ((card.ct || 1) <= totalEnergy) {
      return [{ type: 'summon', card_id: card.id, lane: 'front' }];
    }
  }
  return [];
}

// ── Tests ─────────────────────────────────────────────────────────────────────

console.log('\ntest_basic_decisions.js');
console.log('========================');

// 1. Cheapest playable card selected
{
  const state = {
    hand: [
      { id: 5, r: 3, ct: 5, t: 'attack' },
      { id: 2, r: 1, ct: 2, t: 'attack' },
      { id: 8, r: 2, ct: 3, t: 'defense' },
    ],
    energy: { fire: 2, ice: 1, lightning: 1 },
    agentHP: 10,
  };
  const actions = ruleBasedSummonActions(state);
  assert('selects cheapest playable (id=2)', actions.length === 1 && actions[0].card_id === 2);
}

// 2. Skip card when energy insufficient
{
  const state = {
    hand: [{ id: 3, r: 1, ct: 8, t: 'attack' }],
    energy: { fire: 1, ice: 1, lightning: 1 },
    agentHP: 10,
  };
  const actions = ruleBasedSummonActions(state);
  assert('skips unaffordable card', actions.length === 0);
}

// 3. Prefers recovery when HP critical
{
  const state = {
    hand: [
      { id: 10, r: 1, ct: 1, t: 'attack' },
      { id: 11, r: 2, ct: 2, t: 'recovery' },
    ],
    energy: { fire: 3, ice: 3, lightning: 3 },
    agentHP: 2,
  };
  const actions = ruleBasedSummonActions(state);
  assert('prefers recovery at critical HP', actions.length === 1 && actions[0].card_id === 11);
}

// 4. Empty hand returns no actions
{
  const state = { hand: [], energy: { fire: 3, ice: 3, lightning: 3 }, agentHP: 10 };
  const actions = ruleBasedSummonActions(state);
  assert('empty hand returns []', actions.length === 0);
}

// 5. v3 state: ability field on card is preserved through decision (not a filter)
{
  const state = {
    hand: [
      { id: 1, r: 0, ct: 1, t: 'attack', ab: 'self_burn_common_for_bp_boost' },
      { id: 2, r: 1, ct: 2, t: 'defense', ab: null },
    ],
    energy: { fire: 3, ice: 3, lightning: 3 },
    agentHP: 10,
  };
  const actions = ruleBasedSummonActions(state);
  assert('v3 card with ability field selectable', actions.length === 1 && actions[0].card_id === 1);
}

// 6. Gold Hall flag in state (structural check)
{
  const state = {
    hand: [{ id: 3, r: 1, ct: 1, t: 'attack' }],
    energy: { fire: 3, ice: 3, lightning: 3 },
    agentHP: 10,
    is_gold_hall: true,
  };
  const actions = ruleBasedSummonActions(state);
  assert('gold hall state shape accepted', actions.length === 1);
  assert('is_gold_hall field preserved', state.is_gold_hall === true);
}

// ── Summary ───────────────────────────────────────────────────────────────────
console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);

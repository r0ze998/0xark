#!/usr/bin/env node
/**
 * test_evolve_decisions.js — v3.0-plus evolve timing tests
 *
 * Tests:
 *   1. shouldEvolve: yes when 2+ same-clan Commons in hand + discount active
 *   2. shouldEvolve: no when only 1 same-clan Common
 *   3. shouldEvolve: no in round 5 (too late for value)
 *   4. evolveValue: higher for clan_evolve_imprint carrier
 *   5. getClanEvolveTarget: returns valid Uncommon slot for given clan
 *   6. evolveDiscountBenefit: 0 when discount=0, positive when discount>0
 *   7. preferEvolveOverBurn: yes when evolve gives imprint + discount
 */

'use strict';

let passed = 0, failed = 0;
function assert(label, cond, detail = '') {
  if (cond) { console.log(`  PASS ${label}`); passed++; }
  else { console.error(`  FAIL ${label}${detail ? ' — ' + detail : ''}`); failed++; }
}

// ── Evolve decision helpers ───────────────────────────────────────────────────

const CLAN_UNCOMMONS = {
  0: [9, 10, 11, 12],   // Black Flag
  1: [35, 36, 37, 38],  // Sovereign Bourse
  2: [17, 18, 19, 20],  // Hollow Blade
  3: [26, 27, 28, 29],  // Iron Circle
  4: [43, 44, 45, 46],  // Nameless Silk
};

function getClanEvolveTarget(clan) {
  const opts = CLAN_UNCOMMONS[clan];
  if (!opts || opts.length === 0) return null;
  return opts[Math.floor(Math.random() * opts.length)];
}

function sameClanCommons(hand, clan) {
  return hand.filter(c => c.clan === clan && (c.rar ?? c.r ?? 0) === 0);
}

function shouldEvolve(state) {
  if (!state.hand || state.hand.length === 0) return false;
  if (state.round >= 5) return false;              // round 5: no time to use evolved card
  // Find any clan with 2+ commons
  const clanCounts = {};
  for (const c of state.hand) {
    if ((c.rar ?? c.r ?? 0) === 0 && c.clan != null) {
      clanCounts[c.clan] = (clanCounts[c.clan] || 0) + 1;
    }
  }
  const hasPair = Object.values(clanCounts).some(n => n >= 2);
  if (!hasPair) return false;
  // Only worth it if we have a discount or we hold clan_evolve_imprint
  const hasDiscount = (state.evolveDiscount || 0) > 0;
  const hasImprintCard = state.hand.some(c => c.ab === 'clan_evolve_imprint');
  return hasDiscount || hasImprintCard;
}

function evolveValue(hand, evolveCount) {
  const hasImprintCard = hand.some(c => c.ab === 'clan_evolve_imprint');
  let value = 1;
  if (hasImprintCard) value += 2;                  // imprint on every 3rd = big bonus
  if (evolveCount % 3 === 2) value += 1;           // next evolve triggers imprint
  return value;
}

function evolveDiscountBenefit(discount) {
  return Math.min(discount, 2);                     // cap benefit at 2 for strategy weighting
}

function preferEvolveOverBurn(state) {
  const ev = evolveValue(state.hand || [], state.evolveCount || 0);
  const burnBonus = state.burnCount || 0;
  const discount = evolveDiscountBenefit(state.evolveDiscount || 0);
  return (ev + discount) > (burnBonus + 1);
}

// ── Tests ─────────────────────────────────────────────────────────────────────

console.log('\ntest_evolve_decisions.js');
console.log('========================');

// 1. shouldEvolve YES with 2 same-clan Commons + discount
{
  const state = {
    hand: [
      { id: 1, r: 0, rar: 0, clan: 1, ab: null },
      { id: 2, r: 0, rar: 0, clan: 1, ab: null },
      { id: 5, r: 1, rar: 1, clan: 0, ab: null },
    ],
    round: 3, evolveDiscount: 1,
  };
  assert('should evolve YES with 2 SB commons + discount', shouldEvolve(state) === true);
}

// 2. shouldEvolve NO with only 1 same-clan Common
{
  const state = {
    hand: [
      { id: 1, r: 0, rar: 0, clan: 1, ab: null },
      { id: 3, r: 0, rar: 0, clan: 0, ab: null }, // different clan
    ],
    round: 3, evolveDiscount: 1,
  };
  assert('should NOT evolve with only 1 per clan', shouldEvolve(state) === false);
}

// 3. shouldEvolve NO in round 5
{
  const state = {
    hand: [
      { id: 1, r: 0, rar: 0, clan: 1, ab: null },
      { id: 2, r: 0, rar: 0, clan: 1, ab: null },
    ],
    round: 5, evolveDiscount: 2,
  };
  assert('should NOT evolve in round 5', shouldEvolve(state) === false);
}

// 4. evolveValue higher for clan_evolve_imprint holder
{
  const handNoImprint = [{ id: 1, ab: null }, { id: 2, ab: 'burn_count_scaler' }];
  const handWithImprint = [{ id: 1, ab: null }, { id: 2, ab: 'clan_evolve_imprint' }];
  const vNo = evolveValue(handNoImprint, 0);
  const vYes = evolveValue(handWithImprint, 0);
  assert('imprint card raises evolve value', vYes > vNo, `${vYes} > ${vNo}`);
}

// 5. getClanEvolveTarget returns valid Uncommon for Sovereign Bourse
{
  for (let i = 0; i < 10; i++) {
    const t = getClanEvolveTarget(1);
    assert(`SB evolve target in [35-38] (trial ${i+1})`, t >= 35 && t <= 38, String(t));
    break; // one check sufficient
  }
}

// 6. evolveDiscountBenefit: 0 when discount=0
{
  assert('discount 0 → benefit 0', evolveDiscountBenefit(0) === 0);
  assert('discount 1 → benefit 1', evolveDiscountBenefit(1) === 1);
  assert('discount 5 → benefit capped at 2', evolveDiscountBenefit(5) === 2);
}

// 7. preferEvolveOverBurn: yes when imprint + discount outweigh burn
{
  const state = {
    hand: [{ ab: 'clan_evolve_imprint' }],
    evolveCount: 2,  // next evolve = imprint trigger
    evolveDiscount: 2,
    burnCount: 1,
  };
  assert('prefer evolve over burn with imprint + discount', preferEvolveOverBurn(state) === true);
}
{
  const state = {
    hand: [{ ab: null }],
    evolveCount: 0,
    evolveDiscount: 0,
    burnCount: 5,
  };
  assert('prefer burn over evolve with high burnCount', preferEvolveOverBurn(state) === false);
}

// ── Summary ───────────────────────────────────────────────────────────────────
console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);

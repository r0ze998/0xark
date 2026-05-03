/**
 * Phase 16: abilities-v16 unit tests
 * Tests CARD_ABILITIES, MERGE_RECIPES, burn/passive handlers,
 * and computePostBattleImprints.
 *
 * Run: node tests/abilities-v16.test.js
 */

'use strict';

const assert = require('node:assert/strict');

// ─── Test runner ─────────────────────────────────────────────────────────────
let passed = 0, failed = 0;
function test(name, fn) {
  try { fn(); console.log(`  ✓ ${name}`); passed++; }
  catch (e) { console.error(`  ✗ ${name}\n    ${e.message}`); failed++; }
}
function suite(name, fn) { console.log(`\n${name}`); fn(); }

// ─── Loaded module bindings ──────────────────────────────────────────────────
let CARD_ABILITIES, MERGE_RECIPES, MERGE_ONLY_IDS;
let isBurnable, isMergeOnly, getMergeRecipe, getCard;
let applyBurnEffects, applyPassiveAbilities, computePostBattleImprints;

async function loadAndRun() {
  const cards     = await import('../solana/client/src/lib/cards.js');
  const abilities = await import('../solana/client/src/lib/abilities.js');
  ({ CARD_ABILITIES, MERGE_RECIPES, MERGE_ONLY_IDS, isBurnable, isMergeOnly, getMergeRecipe, getCard } = cards);
  ({ applyBurnEffects, applyPassiveAbilities, computePostBattleImprints } = abilities);
  runTests();
}

// ─── Card stub helper ────────────────────────────────────────────────────────
// Shape mirrors the work-array entries created in damage-calc Step 0.5.
function makeCard(overrides = {}) {
  return {
    id:          1,
    faction:     0,
    bp:          5,
    hp:          8,
    ini:         2,
    actionType:  1,
    isLegendary: false,
    ability:     null,
    mergeOnly:   false,
    mergeRecipe: null,
    barrierUp:   false,
    shadow:      false,
    voidBlocked: false,
    bpMod:       0,
    hpMod:       0,
    ...overrides,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
function runTests() {

suite('isBurnable()', () => {
  test('burn-capable common (id 5) → true', () => {
    assert.equal(isBurnable(5), true);
  });
  test('non-burn common (id 1) → false', () => {
    assert.equal(isBurnable(1), false);
  });
  test('uncommon (id 6) → false', () => {
    assert.equal(isBurnable(6), false);
  });
  test('legendary (id 10) → false', () => {
    assert.equal(isBurnable(10), false);
  });
});

suite('isMergeOnly()', () => {
  test('merge-only id 8 → true', () => {
    assert.equal(isMergeOnly(8), true);
  });
  test('non-merge uncommon id 6 → false', () => {
    assert.equal(isMergeOnly(6), false);
  });
  test('common id 1 → false', () => {
    assert.equal(isMergeOnly(1), false);
  });
  test('legendary id 60 → false', () => {
    assert.equal(isMergeOnly(60), false);
  });
});

suite('getMergeRecipe()', () => {
  test('id 8 → recipe [1,2]', () => {
    const r = getMergeRecipe(8);
    assert.ok(r);
    assert.equal(r.result, 8);
    assert.deepEqual(r.recipe, [1, 2]);
    assert.equal(r.name, 'Knight Champion');
  });
  test('non-merge id 1 → null', () => {
    assert.equal(getMergeRecipe(1), null);
  });
});

suite('getCard() includes Phase 16 fields', () => {
  test('id 5 has burn ability descriptor', () => {
    const c = getCard(5);
    assert.ok(c.ability);
    assert.equal(c.ability.type, 'burn');
    assert.equal(c.ability.effect, 'knight_bp_boost');
  });
  test('id 8 has mergeOnly=true and mergeRecipe', () => {
    const c = getCard(8);
    assert.equal(c.mergeOnly, true);
    assert.ok(c.mergeRecipe);
    assert.deepEqual(c.mergeRecipe.recipe, [1, 2]);
  });
  test('id 9 has passive ability', () => {
    const c = getCard(9);
    assert.ok(c.ability);
    assert.equal(c.ability.type, 'passive');
    assert.equal(c.ability.effect, 'knight_aura');
  });
});

suite('applyBurnEffects — knight_bp_boost', () => {
  test('+3 BP applied to all Knight cards in own field', () => {
    const p1 = [
      makeCard({ id: 1, faction: 0 }),
      makeCard({ id: 2, faction: 0 }),
      makeCard({ id: 11, faction: 1 }),
    ];
    const p2 = [makeCard({ id: 21, faction: 2 })];
    const effects = [];
    applyBurnEffects(p1, p2, [{ effect: 'knight_bp_boost', ownSide: 'p1' }], effects);
    assert.equal(p1[0].bpMod, 3);
    assert.equal(p1[1].bpMod, 3);
    assert.equal(p1[2].bpMod, 0); // not Knight
    assert.equal(p2[0].bpMod, 0); // opponent untouched
    assert.ok(effects.includes('p1_burn_knight_bp_boost'));
  });
  test('no-op when own field has no Knight cards', () => {
    const p1 = [makeCard({ id: 11, faction: 1 })];
    const p2 = [makeCard({ id: 21, faction: 2 })];
    const effects = [];
    applyBurnEffects(p1, p2, [{ effect: 'knight_bp_boost', ownSide: 'p1' }], effects);
    assert.equal(p1[0].bpMod, 0);
    assert.ok(!effects.some(e => e === 'p1_burn_knight_bp_boost'));
  });
});

suite('applyBurnEffects — merchant_bp_scale', () => {
  test('+20% BP (rounded down) per card in own field', () => {
    const p1 = [
      makeCard({ id: 11, faction: 1, bp: 10 }), // 10*2/10 = 2 → bonus +2
      makeCard({ id: 12, faction: 1, bp: 5 }),  // 5*2/10  = 1 → bonus +1
    ];
    const p2 = [makeCard({ id: 21, faction: 2 })];
    const effects = [];
    applyBurnEffects(p1, p2, [{ effect: 'merchant_bp_scale', ownSide: 'p1' }], effects);
    assert.equal(p1[0].bpMod, 2);
    assert.equal(p1[1].bpMod, 1);
    assert.ok(effects.includes('p1_burn_merchant_bp_scale'));
  });
  test('no-op when bp too low for any bonus', () => {
    const p1 = [makeCard({ id: 11, faction: 1, bp: 4 })]; // 4*2/10 = 0
    const p2 = [makeCard({ id: 21, faction: 2 })];
    const effects = [];
    applyBurnEffects(p1, p2, [{ effect: 'merchant_bp_scale', ownSide: 'p1' }], effects);
    assert.equal(p1[0].bpMod, 0);
    assert.ok(!effects.includes('p1_burn_merchant_bp_scale'));
  });
});

suite('applyBurnEffects — pirate_aoe_dmg', () => {
  test('-3 HP applied to all enemy cards', () => {
    const p1 = [makeCard({ id: 21, faction: 2 })];
    const p2 = [
      makeCard({ id: 1, faction: 0, hp: 10 }),
      makeCard({ id: 11, faction: 1, hp: 8 }),
    ];
    const effects = [];
    applyBurnEffects(p1, p2, [{ effect: 'pirate_aoe_dmg', ownSide: 'p1' }], effects);
    assert.equal(p2[0].hpMod, -3);
    assert.equal(p2[1].hpMod, -3);
    assert.equal(p1[0].hpMod, 0);
    assert.ok(effects.includes('p1_burn_pirate_aoe_dmg'));
  });
});

suite('applyBurnEffects — monk_barrier_all', () => {
  test('all own cards gain barrierUp', () => {
    const p1 = [
      makeCard({ id: 41, faction: 4 }),
      makeCard({ id: 42, faction: 4 }),
      makeCard({ id: 1, faction: 0 }),
    ];
    const p2 = [makeCard({ id: 21, faction: 2 })];
    const effects = [];
    applyBurnEffects(p1, p2, [{ effect: 'monk_barrier_all', ownSide: 'p1' }], effects);
    for (const c of p1) assert.equal(c.barrierUp, true);
    assert.equal(p2[0].barrierUp, false);
    assert.ok(effects.includes('p1_burn_monk_barrier_all'));
  });
});

suite('applyBurnEffects — engineer_bp_boost', () => {
  test('+5 BP to all Engineer cards in own field', () => {
    const p1 = [
      makeCard({ id: 51, faction: 5 }),
      makeCard({ id: 52, faction: 5 }),
      makeCard({ id: 1, faction: 0 }),
    ];
    const p2 = [makeCard({ id: 21, faction: 2 })];
    const effects = [];
    applyBurnEffects(p1, p2, [{ effect: 'engineer_bp_boost', ownSide: 'p1' }], effects);
    assert.equal(p1[0].bpMod, 5);
    assert.equal(p1[1].bpMod, 5);
    assert.equal(p1[2].bpMod, 0);
    assert.ok(effects.includes('p1_burn_engineer_bp_boost'));
  });
});

suite('applyPassiveAbilities — knight_aura', () => {
  test('+1 BP to other Knight cards (excluding self)', () => {
    const aura = makeCard({ id: 9, faction: 0, ability: { type: 'passive', effect: 'knight_aura' } });
    const p1 = [
      aura,
      makeCard({ id: 1, faction: 0 }),
      makeCard({ id: 2, faction: 0 }),
      makeCard({ id: 11, faction: 1 }),
    ];
    const p2 = [];
    const effects = [];
    applyPassiveAbilities(p1, p2, effects);
    assert.equal(aura.bpMod, 0); // self excluded
    assert.equal(p1[1].bpMod, 1);
    assert.equal(p1[2].bpMod, 1);
    assert.equal(p1[3].bpMod, 0);
    assert.ok(effects.includes('p1_passive_knight_aura'));
  });
});

suite('applyPassiveAbilities — engineer_overclock', () => {
  test('3 Engineers → each +2 BP', () => {
    const overclock = makeCard({ id: 59, faction: 5, ability: { type: 'passive', effect: 'engineer_overclock' } });
    const p1 = [
      overclock,
      makeCard({ id: 51, faction: 5 }),
      makeCard({ id: 52, faction: 5 }),
      makeCard({ id: 1, faction: 0 }),
    ];
    const p2 = [];
    const effects = [];
    applyPassiveAbilities(p1, p2, effects);
    assert.equal(overclock.bpMod, 2);
    assert.equal(p1[1].bpMod, 2);
    assert.equal(p1[2].bpMod, 2);
    assert.equal(p1[3].bpMod, 0); // not Engineer
    assert.ok(effects.includes('p1_passive_engineer_overclock'));
  });
  test('only 2 Engineers → no bonus', () => {
    const overclock = makeCard({ id: 59, faction: 5, ability: { type: 'passive', effect: 'engineer_overclock' } });
    const p1 = [
      overclock,
      makeCard({ id: 51, faction: 5 }),
      makeCard({ id: 1, faction: 0 }),
    ];
    const p2 = [];
    const effects = [];
    applyPassiveAbilities(p1, p2, effects);
    assert.equal(overclock.bpMod, 0);
    assert.equal(p1[1].bpMod, 0);
    assert.ok(!effects.includes('p1_passive_engineer_overclock'));
  });
});

suite('computePostBattleImprints', () => {
  test('FirstBlood imprint added when isFirstWin=true', () => {
    const result = computePostBattleImprints({
      isFirstWin: true,
      p1Cards: [{ destroyed: false, isLegendary: false }],
      p2Cards: [{ destroyed: false, isLegendary: false }],
      winner: 'p1',
    });
    const fb = result.find(i => i.key === 'FirstBlood');
    assert.ok(fb);
    assert.equal(fb.is_cosmetic, false);
    assert.equal(fb.value, 1);
  });
  test('FlawlessVictory imprint when no own cards destroyed', () => {
    const result = computePostBattleImprints({
      isFirstWin: false,
      p1Cards: [{ destroyed: false, isLegendary: false }, { destroyed: false, isLegendary: false }],
      p2Cards: [{ destroyed: true, isLegendary: false }],
      winner: 'p1',
    });
    const fv = result.find(i => i.key === 'FlawlessVictory');
    assert.ok(fv);
    assert.equal(fv.is_cosmetic, true);
  });
  test('LegendaryDefeat imprint when an opp Legendary destroyed', () => {
    const result = computePostBattleImprints({
      isFirstWin: false,
      p1Cards: [{ destroyed: true, isLegendary: false }],
      p2Cards: [{ destroyed: true, isLegendary: true }],
      winner: 'p1',
    });
    const ld = result.find(i => i.key === 'LegendaryDefeat');
    assert.ok(ld);
    assert.equal(ld.is_cosmetic, false);
    assert.equal(ld.value, 2);
  });
});

// ─── Summary ────────────────────────────────────────────────────────────────
console.log(`\n─────────────────────────────`);
console.log(`abilities-v16: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);

}

loadAndRun().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});

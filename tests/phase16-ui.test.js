/**
 * Phase 16: UI flow tests — Burn, Evolve, Imprint hook
 * Tests state mutations and ability integration (no DOM required).
 */

import { isBurnable, isMergeOnly, getMergeRecipe, CARD_ABILITIES, MERGE_RECIPES } from '../solana/client/src/lib/cards.js';
import { computePostBattleImprints } from '../solana/client/src/lib/abilities.js';

/* ── helpers ──────────────────────────────────────────────────────── */
function pass(name) { console.log(`  ✓ ${name}`); }
function fail(name, msg) { console.error(`  ✗ ${name}: ${msg}`); process.exitCode = 1; }
function assert(name, cond) { cond ? pass(name) : fail(name, 'assertion failed'); }

/* ── Burn state mutation (simulated, no DOM) ──────────────────────── */
console.log('\nBurn state mutation');

{
  const vault = [1, 2, 3, 5, 10];   // 5 = Sacrificial Squire (burnable)
  const pendingBurnEffects = [];

  const cardId = 5;
  assert('card 5 is burnable', isBurnable(cardId));

  const ability = CARD_ABILITIES[cardId];
  pendingBurnEffects.push({ effect: ability.effect, ownSide: 'p1' });
  const newVault = vault.filter(id => id !== cardId);

  assert('vault shrinks by 1 after burn', newVault.length === vault.length - 1);
  assert('burned card not in new vault', !newVault.includes(cardId));
  assert('pendingBurnEffects has 1 entry', pendingBurnEffects.length === 1);
  assert('effect recorded correctly', pendingBurnEffects[0].effect === 'knight_bp_boost');
  assert('ownSide recorded correctly', pendingBurnEffects[0].ownSide === 'p1');
}

/* ── Burn: non-burnable card cannot be burned ─────────────────────── */
console.log('\nBurn guard — non-burnable cards');
{
  [1, 2, 6, 9, 10].forEach(id => {
    assert(`card ${id} is NOT burnable`, !isBurnable(id));
  });
}

/* ── All 6 burn cards have effect and description ────────────────── */
console.log('\nBurn-card metadata completeness');
{
  const burnIds = [5, 15, 25, 35, 45, 55];
  burnIds.forEach(id => {
    const ab = CARD_ABILITIES[id];
    assert(`card ${id} has ability object`, !!ab);
    assert(`card ${id} type=burn`, ab.type === 'burn');
    assert(`card ${id} has effect string`, typeof ab.effect === 'string' && ab.effect.length > 0);
    assert(`card ${id} has description`, typeof ab.description === 'string' && ab.description.length > 0);
  });
}

/* ── Evolve state mutation (simulated, no DOM) ─────────────────────── */
console.log('\nEvolve state mutation');

{
  const childId = 8;  // Knight Champion
  const recipe  = getMergeRecipe(childId);
  assert('recipe exists for id 8', !!recipe);

  const [aId, bId] = recipe.recipe;
  const vault    = [3, aId, bId, 10];  // 3 is a non-recipe card; aId/bId are 1,2
  const newVault = vault.filter(id => id !== aId && id !== bId);
  newVault.push(childId);

  assert('both parents removed', !newVault.includes(aId) && !newVault.includes(bId));
  assert('child added to vault', newVault.includes(childId));
  assert('vault shrinks by 1 (2 parents → 1 child)', newVault.length === vault.length - 1);
}

/* ── Evolve guard — missing parents ─────────────────────────────── */
console.log('\nEvolve guard — missing parents');
{
  const childId = 18;  // Merchant Magnate
  const recipe  = getMergeRecipe(childId);
  const [aId, bId] = recipe.recipe;
  const vault = [aId];  // only one parent

  const hasA = vault.includes(aId);
  const hasB = vault.includes(bId);
  assert('cannot evolve when one parent missing', !(hasA && hasB));
}

/* ── All 6 merge recipes are valid ──────────────────────────────── */
console.log('\nMerge recipe validity');
{
  Object.entries(MERGE_RECIPES).forEach(([childStr, r]) => {
    const childId = parseInt(childStr, 10);
    assert(`child ${childId} is merge-only`, isMergeOnly(childId));
    assert(`recipe ${childId} has 2 parents`, r.recipe.length === 2);
    assert(`parent ids are distinct`, r.recipe[0] !== r.recipe[1]);
    assert(`result field matches key`, r.result === childId);
  });
}

/* ── Imprint: FirstBlood ─────────────────────────────────────────── */
console.log('\nImprint — FirstBlood');
{
  const imprints = computePostBattleImprints({
    isFirstWin: true,
    winner: 'p1',
    p1Cards: [{ id: 1, rarity: 0 }],
    p2Cards: [{ id: 2, rarity: 0 }],
  });
  const keys = imprints.map(i => i.key);
  assert('FirstBlood earned on first win', keys.includes('FirstBlood'));
}

{
  const imprints = computePostBattleImprints({
    isFirstWin: false,
    winner: 'p1',
    p1Cards: [{ id: 1, rarity: 0 }],
    p2Cards: [{ id: 2, rarity: 0 }],
  });
  assert('FirstBlood NOT earned on repeat win', !imprints.map(i => i.key).includes('FirstBlood'));
}

/* ── Imprint: FlawlessVictory ────────────────────────────────────── */
console.log('\nImprint — FlawlessVictory');
{
  const imprints = computePostBattleImprints({
    isFirstWin: false,
    winner: 'p1',
    p1Cards: [{ id: 1, rarity: 0 }, { id: 3, rarity: 0 }],
    p2Cards: [{ id: 2, rarity: 0 }],
    p1Destroyed: [],
  });
  assert('FlawlessVictory when no own cards destroyed', imprints.map(i => i.key).includes('FlawlessVictory'));
}

{
  const imprints = computePostBattleImprints({
    isFirstWin: false,
    winner: 'p1',
    p1Cards: [{ id: 1, rarity: 0 }, { id: 3, rarity: 0 }],
    p2Cards: [{ id: 2, rarity: 0 }],
    p1Destroyed: [1],  // card 1 destroyed
  });
  assert('FlawlessVictory NOT earned when own card was destroyed', !imprints.map(i => i.key).includes('FlawlessVictory'));
}

/* ── Imprint: LegendaryDefeat ────────────────────────────────────── */
console.log('\nImprint — LegendaryDefeat');
{
  const imprints = computePostBattleImprints({
    isFirstWin: false,
    winner: 'p1',
    p1Cards: [{ id: 1, rarity: 0 }],
    p2Cards: [{ id: 10, rarity: 3 }],  // Legendary
    p2Destroyed: [10],
  });
  assert('LegendaryDefeat when Legendary destroyed via p2Destroyed array', imprints.map(i => i.key).includes('LegendaryDefeat'));
}

{
  const imprints = computePostBattleImprints({
    isFirstWin: false,
    winner: 'p1',
    p1Cards: [{ id: 1, rarity: 0 }],
    p2Cards: [{ id: 10, rarity: 3 }],  // Legendary survived
    p2Destroyed: [],
  });
  assert('LegendaryDefeat NOT earned when Legendary survived', !imprints.map(i => i.key).includes('LegendaryDefeat'));
}

{
  // via c.destroyed=true flag (old-style API)
  const imprints = computePostBattleImprints({
    isFirstWin: false,
    winner: 'p1',
    p1Cards: [{ id: 1, rarity: 0 }],
    p2Cards: [{ id: 10, rarity: 3, destroyed: true }],
  });
  assert('LegendaryDefeat via c.destroyed=true property', imprints.map(i => i.key).includes('LegendaryDefeat'));
}

/* ── Multiple imprints in single battle ─────────────────────────── */
console.log('\nImprint — multiple in one battle');
{
  const imprints = computePostBattleImprints({
    isFirstWin: true,
    winner: 'p1',
    p1Cards: [{ id: 1, rarity: 0 }, { id: 2, rarity: 0 }],
    p2Cards: [{ id: 10, rarity: 3 }],
    p1Destroyed: [],
    p2Destroyed: [10],
  });
  const keys = imprints.map(i => i.key);
  assert('FirstBlood present', keys.includes('FirstBlood'));
  assert('FlawlessVictory present', keys.includes('FlawlessVictory'));
  assert('LegendaryDefeat present', keys.includes('LegendaryDefeat'));
  assert('exactly 3 imprints earned', imprints.length === 3);
}

/* ── Imprint descriptions are non-empty ─────────────────────────── */
console.log('\nImprint — description fields');
{
  const imprints = computePostBattleImprints({
    isFirstWin: true,
    winner: 'p1',
    p1Cards: [{ id: 1, rarity: 0 }],
    p2Cards: [{ id: 10, rarity: 3, destroyed: true }],
    p1Destroyed: [],
  });
  imprints.forEach(imp => {
    assert(`imprint ${imp.key} has non-empty description`, typeof imp.description === 'string' && imp.description.length > 0);
  });
}

/* ── summary ──────────────────────────────────────────────────────── */
const code = process.exitCode ?? 0;
console.log(`\n─────────────────────────────`);
console.log(`phase16-ui: ${code === 0 ? '✓ all passed' : '✗ failures detected'}`);

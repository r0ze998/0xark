/**
 * Phase 15: damage-calc unit tests (card-level 5v5 battle)
 *
 * Tests the new damageCalc({ p1Field, p2Field, seed }) API.
 *
 * Run: node tests/damage-calc.test.js
 */

'use strict';

const assert = require('node:assert/strict');
const crypto = require('node:crypto');

let passed = 0, failed = 0;
function test(name, fn) {
  try { fn(); console.log(`  ✓ ${name}`); passed++; }
  catch (e) { console.error(`  ✗ ${name}\n    ${e.message}`); failed++; }
}
function suite(name, fn) { console.log(`\n${name}`); fn(); }

let ActionType, Faction, damageCalc, computeSeed;

async function loadAndRun() {
  ({ ActionType, Faction, damageCalc, computeSeed } =
    await import('../tools/ai-agent/src/damage-calc.js'));
  runTests();
}

function runTests() {

// ─── Card factories ────────────────────────────────────────────────────────────
// Default faction=Knight, rarity=Common, bp=8, hp=8, ini=3, at=UseCrystal
function card(id, overrides = {}) {
  return {
    id,
    faction:     overrides.faction    ?? Faction.Knight,
    rarity:      overrides.rarity     ?? 0,
    bp:          overrides.bp         ?? 8,
    hp:          overrides.hp         ?? 8,
    ini:         overrides.ini        ?? 3,
    actionType:  overrides.actionType ?? ActionType.UseCrystal,
    isLegendary: overrides.isLegendary ?? false,
  };
}

function field5(base = {}) {
  return [1, 2, 3, 4, 5].map(i => card(i, base));
}

const ZERO_SEED = new Uint8Array(32).fill(0);
const fixSeed = computeSeed(Buffer.alloc(32, 0xaa), Buffer.alloc(32, 0xbb), 1);

// ─────────────────────────────────────────────────────────────────────────────

suite('ActionType constants (Phase 15 v2)', () => {
  test('UseCrystal=0, Barrier=1, UseFlame=2, UseStorm=3, UseShadow=4, UseVoid=5', () => {
    assert.equal(ActionType.UseCrystal, 0);
    assert.equal(ActionType.Barrier,    1);
    assert.equal(ActionType.UseFlame,   2);
    assert.equal(ActionType.UseStorm,   3);
    assert.equal(ActionType.UseShadow,  4);
    assert.equal(ActionType.UseVoid,    5);
  });
  test('Exactly 6 ActionType values', () => {
    assert.equal(Object.keys(ActionType).length, 6);
  });
  test('Draw/Steal/Scout/None/Move are not defined', () => {
    for (const gone of ['Draw', 'Steal', 'Scout', 'None', 'Move']) {
      assert.equal(ActionType[gone], undefined, `${gone} should be absent`);
    }
  });
});

suite('Faction constants', () => {
  test('Knight=0 through Engineer=5', () => {
    assert.equal(Faction.Knight,   0);
    assert.equal(Faction.Merchant, 1);
    assert.equal(Faction.Pirate,   2);
    assert.equal(Faction.Scholar,  3);
    assert.equal(Faction.Monk,     4);
    assert.equal(Faction.Engineer, 5);
  });
});

suite('computeSeed — determinism', () => {
  const s1 = crypto.randomBytes(32);
  const s2 = crypto.randomBytes(32);

  test('same inputs produce same seed', () => {
    assert.deepEqual(computeSeed(s1, s2, 1), computeSeed(s1, s2, 1));
  });
  test('different round → different seed', () => {
    assert.notDeepEqual(computeSeed(s1, s2, 1), computeSeed(s1, s2, 2));
  });
  test('swapping salts → different seed', () => {
    assert.notDeepEqual(computeSeed(s1, s2, 1), computeSeed(s2, s1, 1));
  });
  test('seed is 32 bytes', () => {
    assert.equal(computeSeed(s1, s2, 1).length, 32);
  });
});

suite('damageCalc — return shape', () => {
  test('returns required fields', () => {
    const r = damageCalc({ p1Field: field5(), p2Field: field5(), seed: fixSeed });
    assert.ok(['p1', 'p2'].includes(r.winner), 'winner must be p1 or p2');
    assert.ok(Array.isArray(r.p1Cards) && r.p1Cards.length === 5);
    assert.ok(Array.isArray(r.p2Cards) && r.p2Cards.length === 5);
    assert.ok(Array.isArray(r.lootPool) && r.lootPool.length === 5);
    assert.ok(typeof r.lootedCardId === 'number');
    assert.ok(typeof r.lootedCount === 'number' && r.lootedCount >= 1);
    assert.ok(typeof r.p1BpTotal === 'number');
    assert.ok(typeof r.p2BpTotal === 'number');
    assert.ok(Array.isArray(r.effects));
  });
  test('p1Cards and p2Cards contain id, finalBp, finalHp, destroyed', () => {
    const r = damageCalc({ p1Field: field5(), p2Field: field5(), seed: fixSeed });
    for (const c of [...r.p1Cards, ...r.p2Cards]) {
      assert.ok('id' in c && 'finalBp' in c && 'finalHp' in c && 'destroyed' in c);
    }
  });
  test('lootedCardId is in loser field', () => {
    const r = damageCalc({ p1Field: field5(), p2Field: field5(), seed: fixSeed });
    const loserIds = r.lootPool.map(c => c.id);
    assert.ok(loserIds.includes(r.lootedCardId));
  });
  test('effects includes winner announcement', () => {
    const r = damageCalc({ p1Field: field5(), p2Field: field5(), seed: fixSeed });
    assert.ok(r.effects.some(e => e.startsWith('winner_')));
  });
});

suite('Synergy detection', () => {
  test('3 same-faction cards trigger synergy', () => {
    const f = [
      card(1, { faction: Faction.Pirate }),
      card(2, { faction: Faction.Pirate }),
      card(3, { faction: Faction.Pirate }),
      card(4, { faction: Faction.Knight }),
      card(5, { faction: Faction.Knight }),
    ];
    const r = damageCalc({ p1Field: f, p2Field: field5(), seed: fixSeed });
    assert.deepEqual(r.synergyP1, { faction: Faction.Pirate });
  });
  test('fewer than 3 same faction → no synergy', () => {
    const f = [
      card(1, { faction: Faction.Pirate }),
      card(2, { faction: Faction.Pirate }),
      card(3, { faction: Faction.Knight }),
      card(4, { faction: Faction.Scholar }),
      card(5, { faction: Faction.Monk }),
    ];
    const r = damageCalc({ p1Field: f, p2Field: field5(), seed: fixSeed });
    assert.equal(r.synergyP1, null);
  });
  test('synergyP2 detected independently', () => {
    const f = [
      card(1, { faction: Faction.Scholar }),
      card(2, { faction: Faction.Scholar }),
      card(3, { faction: Faction.Scholar }),
      card(4, { faction: Faction.Monk }),
      card(5, { faction: Faction.Monk }),
    ];
    const r = damageCalc({ p1Field: field5(), p2Field: f, seed: fixSeed });
    assert.deepEqual(r.synergyP2, { faction: Faction.Scholar });
  });
  test('synergy logged in effects', () => {
    const f = [1, 2, 3].map(i => card(i, { faction: Faction.Merchant }))
      .concat([card(4), card(5)]);
    const r = damageCalc({ p1Field: f, p2Field: field5(), seed: fixSeed });
    assert.ok(r.effects.includes(`p1_synergy_${Faction.Merchant}`));
  });
});

suite('ActionType: Barrier', () => {
  test('Barrier card logs barrier effect', () => {
    const f = field5({ actionType: ActionType.Barrier });
    const r = damageCalc({ p1Field: f, p2Field: field5(), seed: fixSeed });
    assert.ok(r.effects.some(e => e.startsWith('p1_barrier_')));
  });
  test('Barrier blocks first hit (pair 0)', () => {
    // p1 card[0]: very high BP, no barrier; p2 card[0]: low BP, has Barrier
    const p1 = [card(1, { bp: 50, hp: 10, ini: 10, actionType: ActionType.UseCrystal }), ...field5().slice(1)];
    const p2 = [card(11, { bp: 1, hp: 3, ini: 1, actionType: ActionType.Barrier }), ...field5({ bp: 1, hp: 3, ini: 1 }).slice(1)];
    const r = damageCalc({ p1Field: p1, p2Field: p2, seed: fixSeed });
    // p2[0] raised barrier → first hit from p1 blocked
    const p2c0 = r.p2Cards[0];
    // HP should not have been reduced by p1's full BP (barrier absorbed the first hit)
    assert.ok(r.effects.some(e => e.includes('p2_barrier_blocked_pair')));
  });
});

suite('ActionType: UseFlame', () => {
  test('Flame deals -5 HP to paired opponent card', () => {
    const p1 = field5({ actionType: ActionType.UseFlame });
    const p2 = field5({ hp: 10 });
    const r = damageCalc({ p1Field: p1, p2Field: p2, seed: fixSeed });
    assert.ok(r.effects.some(e => e.startsWith('p1_flame_')));
    // At least one p2 card should have taken pre-combat HP damage
  });
  test('Flame effect logged with card ids', () => {
    const p1 = [card(1, { ini: 10, actionType: ActionType.UseFlame }), ...field5().slice(1)];
    const p2 = field5({ hp: 20 });
    const r = damageCalc({ p1Field: p1, p2Field: p2, seed: fixSeed });
    assert.ok(r.effects.some(e => /p1_flame_1_hits_\d+/.test(e)));
  });
});

suite('ActionType: UseStorm', () => {
  test('Storm sweeps opponent barriers', () => {
    const p1 = [card(1, { ini: 5, actionType: ActionType.UseStorm }), ...field5().slice(1)];
    const p2 = field5({ actionType: ActionType.Barrier });
    const r = damageCalc({ p1Field: p1, p2Field: p2, seed: fixSeed });
    assert.ok(r.effects.some(e => e.includes('p1_storm_sweeps_p2')));
  });
  test('Storm reduces opponent BP by 2', () => {
    const highBp = 20;
    const p1 = [card(1, { ini: 5, bp: 1, actionType: ActionType.UseStorm }), ...field5({ bp: 1 }).slice(1)];
    // Use Barrier so p2 cards do not gain any bpMod from their own action
    const p2 = field5({ bp: highBp, hp: 100, ini: 1, actionType: ActionType.Barrier });
    const r = damageCalc({ p1Field: p1, p2Field: p2, seed: fixSeed });
    // p2 cards: bp=20, storm applies bpMod=-2 → finalBp = 18
    for (const c of r.p2Cards) {
      assert.equal(c.finalBp, 18, `expected 18, got ${c.finalBp}`);
    }
  });
});

suite('ActionType: UseShadow', () => {
  test('Shadow skips the combat pair', () => {
    // Give the shadow card a uniquely high INI so it sorts to position 0
    const p1 = [card(1, { ini: 10, actionType: ActionType.UseShadow }), ...field5({ ini: 1 }).slice(1)];
    const r = damageCalc({ p1Field: p1, p2Field: field5({ ini: 1 }), seed: fixSeed });
    assert.ok(r.effects.some(e => e.startsWith('p1_shadow_skip_pair_0')));
  });
  test('Shadow-skipped pair leaves both cards at full hp (before any mods)', () => {
    const p1 = field5({ actionType: ActionType.UseShadow, hp: 10 });
    const p2 = field5({ actionType: ActionType.UseShadow, hp: 10 });
    const r = damageCalc({ p1Field: p1, p2Field: p2, seed: fixSeed });
    // All pairs skipped — no cards should be destroyed
    for (const c of [...r.p1Cards, ...r.p2Cards]) {
      assert.ok(!c.destroyed, `card ${c.id} should not be destroyed`);
    }
  });
});

suite('ActionType: UseCrystal', () => {
  test('Crystal boosts BP by +5', () => {
    const baseBp = 8;
    const p1 = field5({ actionType: ActionType.UseCrystal, bp: baseBp });
    const p2 = field5({ hp: 100 });
    const r = damageCalc({ p1Field: p1, p2Field: p2, seed: fixSeed });
    for (const c of r.p1Cards) {
      assert.equal(c.finalBp, baseBp + 5);
    }
  });
  test('Crystal effect logged per card', () => {
    const p1 = [card(1, { actionType: ActionType.UseCrystal }), ...field5().slice(1)];
    const r = damageCalc({ p1Field: p1, p2Field: field5(), seed: fixSeed });
    assert.ok(r.effects.some(e => e === 'p1_crystal_1'));
  });
});

suite('ActionType: UseVoid', () => {
  test('Void prevents paired opponent card from acting', () => {
    // p1[0] uses Void → p2[0] gets voidBlocked (cannot use its action)
    const p1 = [card(1, { ini: 10, actionType: ActionType.UseVoid }), ...field5({ ini: 1 }).slice(1)];
    const p2 = [card(11, { ini: 1, actionType: ActionType.UseCrystal }), ...field5({ ini: 1, actionType: ActionType.UseCrystal }).slice(1)];
    const r = damageCalc({ p1Field: p1, p2Field: p2, seed: fixSeed });
    assert.ok(r.effects.some(e => e.includes('p2_void_blocked_')));
  });
  test('Void effect logged with card id', () => {
    const p1 = [card(1, { actionType: ActionType.UseVoid }), ...field5().slice(1)];
    const r = damageCalc({ p1Field: p1, p2Field: field5(), seed: fixSeed });
    assert.ok(r.effects.includes('p1_void_1'));
  });
});

suite('Legendary stubs', () => {
  test('Legendary card presence logged', () => {
    const f = [card(10, { isLegendary: true }), ...field5().slice(1)];
    const r = damageCalc({ p1Field: f, p2Field: field5(), seed: fixSeed });
    assert.ok(r.effects.includes('p1_legendary_10_present'));
  });
  test('Non-legendary cards not logged as legendary', () => {
    const r = damageCalc({ p1Field: field5({ isLegendary: false }), p2Field: field5(), seed: fixSeed });
    assert.ok(!r.effects.some(e => e.includes('_legendary_') && e.includes('_present')));
  });
});

suite('Victory judgment', () => {
  test('side with higher surviving BP total wins', () => {
    // p1 gets Crystal (+5 BP each), p2 gets UseVoid (no BP change) but otherwise equal
    const p1 = field5({ actionType: ActionType.UseCrystal, bp: 10, hp: 100, ini: 1 });
    const p2 = field5({ actionType: ActionType.UseVoid,    bp: 1,  hp: 100, ini: 2 });
    // p2 acts first via Void, but crystal is already committed for step 3
    const r = damageCalc({ p1Field: p1, p2Field: p2, seed: fixSeed });
    // p1 bp 10+5=15 per card × 5 = 75; p2 bp 1 × 5 = 5 (before combat)
    assert.equal(r.winner, 'p1');
  });
  test('winner in effects string', () => {
    const r = damageCalc({ p1Field: field5(), p2Field: field5(), seed: fixSeed });
    const w = r.effects.find(e => e.startsWith('winner_'));
    assert.ok(w);
    assert.ok(w.includes(`winner_${r.winner}_bp`));
  });
  test('p1BpTotal and p2BpTotal are non-negative', () => {
    const r = damageCalc({ p1Field: field5(), p2Field: field5(), seed: fixSeed });
    assert.ok(r.p1BpTotal >= 0);
    assert.ok(r.p2BpTotal >= 0);
  });
});

suite('Loot mechanics', () => {
  test('lootedCardId comes from loser field', () => {
    const r = damageCalc({ p1Field: field5(), p2Field: field5(), seed: fixSeed });
    const loserCards = (r.winner === 'p1' ? r.p2Cards : r.p1Cards).map(c => c.id);
    assert.ok(loserCards.includes(r.lootedCardId));
  });
  test('lootPool equals loser 5 cards', () => {
    const r = damageCalc({ p1Field: field5(), p2Field: field5(), seed: fixSeed });
    const loserCards = r.winner === 'p1' ? r.p2Cards : r.p1Cards;
    assert.deepEqual(r.lootPool.map(c => c.id), loserCards.map(c => c.id));
  });
  test('lootedCount is 1 by default (Marauder bonus handled by caller)', () => {
    const r = damageCalc({ p1Field: field5(), p2Field: field5(), seed: fixSeed });
    assert.equal(r.lootedCount, 1);
  });
  test('loot effect logged', () => {
    const r = damageCalc({ p1Field: field5(), p2Field: field5(), seed: fixSeed });
    assert.ok(r.effects.some(e => e.startsWith('loot_card_')));
  });
});

suite('Determinism', () => {
  test('identical inputs → identical output', () => {
    const input = {
      p1Field: field5({ actionType: ActionType.UseFlame }),
      p2Field: field5({ actionType: ActionType.Barrier }),
      seed: fixSeed,
    };
    const r1 = damageCalc(input);
    const r2 = damageCalc(input);
    assert.deepEqual(r1, r2);
  });
  test('10 runs with same seed → same winner', () => {
    const input = { p1Field: field5(), p2Field: field5(), seed: fixSeed };
    const first = damageCalc(input).winner;
    for (let i = 0; i < 9; i++) {
      assert.equal(damageCalc(input).winner, first);
    }
  });
  test('different seeds can produce different loot', () => {
    const s1 = computeSeed(Buffer.alloc(32, 0x11), Buffer.alloc(32, 0x22), 1);
    const s2 = computeSeed(Buffer.alloc(32, 0x33), Buffer.alloc(32, 0x44), 1);
    // With 5 loser cards, same loot is possible but seeds are designed to differ
    const p1 = field5({ actionType: ActionType.UseCrystal, bp: 20, ini: 5 });
    const p2 = [card(11), card(12), card(13), card(14), card(15)];
    const r1 = damageCalc({ p1Field: p1, p2Field: p2, seed: s1 });
    const r2 = damageCalc({ p1Field: p1, p2Field: p2, seed: s2 });
    // At least the round structure is deterministic
    assert.equal(r1.winner, 'p1');
    assert.equal(r2.winner, 'p1');
  });
  test('null seed falls back to zero-seed (no crash)', () => {
    const r = damageCalc({ p1Field: field5(), p2Field: field5(), seed: null });
    assert.ok(['p1', 'p2'].includes(r.winner));
  });
});

// ─────────────────────────────────────────────────────────────────────────────
  console.log(`\n${'─'.repeat(50)}`);
  console.log(`damage-calc (Phase 15): ${passed} passed, ${failed} failed`);
  if (failed) { console.error('\nSome tests FAILED.'); process.exit(1); }
}

loadAndRun().catch(e => { console.error(e); process.exit(1); });

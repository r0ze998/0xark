/**
 * 0xARK Save/Load Round-Trip Tests
 *
 * Tests localStorage persistence patterns used by 04-state.js:
 *   saveStats/loadStats  (STATS_KEY = 'oxark_stats')
 *   deck save/load       ('oxark_deck')
 *   registry save/load  ('0xark_registry')
 *   itemInventory save  ('0xark_item_inv')
 *
 * Runs without a browser — all localStorage and game globals mocked inline.
 * Run: node tests/save-load.test.js
 */

'use strict';

const assert = require('node:assert/strict');

// ─── Minimal localStorage mock ───────────────────────────────────────────────
function makeLocalStorage() {
  const store = Object.create(null);
  return {
    getItem:    (k) => (k in store ? store[k] : null),
    setItem:    (k, v) => { store[k] = String(v); },
    removeItem: (k) => { delete store[k]; },
    clear:      () => { for (const k in store) delete store[k]; },
  };
}

// ─── Test runner ────────────────────────────────────────────────────────────
let passed = 0, failed = 0;
function test(name, fn) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
    passed++;
  } catch (e) {
    console.error(`  ✗ ${name}`);
    console.error(`    ${e.message}`);
    failed++;
  }
}
function suite(name, fn) {
  console.log(`\n${name}`);
  fn();
}

// ─── Extracted save/load logic mirroring 04-state.js ────────────────────────

const FOG_MAP_COUNT = 6;
const STATS_KEY = 'oxark_stats';
const ITEM_INV_KEY = '0xark_item_inv';

function makeStats() {
  return {
    gamesPlayed: 0, cardsCollected: 0, cardsLost: 0,
    stealsAttempted: 0, stealsBlocked: 0, scoutUses: 0,
    stepsWalked: 0, timePlayed: 0,
    areaTime: new Array(FOG_MAP_COUNT).fill(0),
    sessionStart: Date.now(),
    bestClearRounds: 0, bestClearTime: 0,
  };
}

function saveStats(ls, stats) {
  try {
    stats.timePlayed = Math.floor((Date.now() - stats.sessionStart) / 1000);
    ls.setItem(STATS_KEY, JSON.stringify(stats));
  } catch (e) { /* ignore */ }
}

function loadStats(ls, stats) {
  try {
    const raw = ls.getItem(STATS_KEY);
    if (raw) {
      const d = JSON.parse(raw);
      Object.keys(d).forEach(k => { if (Object.prototype.hasOwnProperty.call(stats, k)) stats[k] = d[k]; });
      // Migrate old 3-element areaTime
      if (!Array.isArray(stats.areaTime) || stats.areaTime.length < FOG_MAP_COUNT) {
        const old = Array.isArray(stats.areaTime) ? stats.areaTime : [];
        stats.areaTime = new Array(FOG_MAP_COUNT).fill(0);
        old.forEach((v, i) => { if (i < FOG_MAP_COUNT) stats.areaTime[i] = v || 0; });
      }
    }
  } catch (e) { /* ignore */ }
}

function saveDeck(ls, deckCards, deckLockedUntil) {
  try { ls.setItem('oxark_deck', JSON.stringify({ cards: deckCards, lockedUntil: deckLockedUntil })); } catch (e) { /* ignore */ }
}

function loadDeck(ls) {
  try { return JSON.parse(ls.getItem('oxark_deck') || 'null'); } catch (e) { return null; }
}

function makeRegistry() {
  return { registered: [], count: 0, season_complete: false };
}

function saveRegistry(ls, registry) {
  ls.setItem('0xark_registry', JSON.stringify(registry));
}

function loadRegistry(ls) {
  return JSON.parse(ls.getItem('0xark_registry') || '{"registered":[],"count":0,"season_complete":false}');
}

function makeItemInventory(ls) {
  try { return JSON.parse(ls.getItem(ITEM_INV_KEY) || '{}'); } catch (e) { return {}; }
}

function saveItemInventory(ls, inv) {
  try { ls.setItem(ITEM_INV_KEY, JSON.stringify(inv)); } catch (e) { /* ignore */ }
}

// ─── Tests ───────────────────────────────────────────────────────────────────

suite('Stats save/load', () => {
  test('fresh localStorage returns default stats', () => {
    const ls = makeLocalStorage();
    const stats = makeStats();
    loadStats(ls, stats);
    assert.equal(stats.gamesPlayed, 0);
    assert.equal(stats.cardsCollected, 0);
    assert.equal(stats.areaTime.length, FOG_MAP_COUNT);
  });

  test('round-trip preserves all scalar fields', () => {
    const ls = makeLocalStorage();
    const stats = makeStats();
    stats.gamesPlayed = 7;
    stats.cardsCollected = 42;
    stats.cardsLost = 3;
    stats.stealsAttempted = 10;
    stats.stealsBlocked = 4;
    stats.scoutUses = 2;
    stats.stepsWalked = 999;
    stats.bestClearRounds = 5;
    stats.bestClearTime = 12345;
    stats.areaTime = [10, 20, 30, 40, 50, 60];
    saveStats(ls, stats);

    const stats2 = makeStats();
    loadStats(ls, stats2);
    assert.equal(stats2.gamesPlayed, 7);
    assert.equal(stats2.cardsCollected, 42);
    assert.equal(stats2.cardsLost, 3);
    assert.equal(stats2.stealsAttempted, 10);
    assert.equal(stats2.stealsBlocked, 4);
    assert.equal(stats2.scoutUses, 2);
    assert.equal(stats2.stepsWalked, 999);
    assert.equal(stats2.bestClearRounds, 5);
    assert.equal(stats2.bestClearTime, 12345);
    assert.deepEqual(stats2.areaTime, [10, 20, 30, 40, 50, 60]);
  });

  test('areaTime migration: 3-element → FOG_MAP_COUNT', () => {
    const ls = makeLocalStorage();
    // Write old format (3 elements) directly
    const old = { gamesPlayed: 1, areaTime: [100, 200, 300] };
    ls.setItem(STATS_KEY, JSON.stringify(old));

    const stats = makeStats();
    loadStats(ls, stats);
    assert.equal(stats.areaTime.length, FOG_MAP_COUNT);
    assert.equal(stats.areaTime[0], 100);
    assert.equal(stats.areaTime[1], 200);
    assert.equal(stats.areaTime[2], 300);
    assert.equal(stats.areaTime[3], 0);
    assert.equal(stats.gamesPlayed, 1);
  });

  test('unknown keys in saved blob are ignored', () => {
    const ls = makeLocalStorage();
    ls.setItem(STATS_KEY, JSON.stringify({ gamesPlayed: 5, __unknown: 'x' }));
    const stats = makeStats();
    loadStats(ls, stats);
    assert.equal(stats.gamesPlayed, 5);
    assert.equal(stats.__unknown, undefined);
  });

  test('corrupt JSON in localStorage falls back to defaults', () => {
    const ls = makeLocalStorage();
    ls.setItem(STATS_KEY, 'NOT_JSON');
    const stats = makeStats();
    loadStats(ls, stats);
    assert.equal(stats.gamesPlayed, 0);
  });

  test('multiple sequential saves accumulate correctly', () => {
    const ls = makeLocalStorage();
    const stats = makeStats();
    stats.gamesPlayed = 1;
    saveStats(ls, stats);
    stats.gamesPlayed = 2;
    saveStats(ls, stats);
    const stats2 = makeStats();
    loadStats(ls, stats2);
    assert.equal(stats2.gamesPlayed, 2);
  });
});

suite('Deck save/load', () => {
  test('null when no deck saved', () => {
    const ls = makeLocalStorage();
    assert.equal(loadDeck(ls), null);
  });

  test('round-trip preserves cards and lockedUntil', () => {
    const ls = makeLocalStorage();
    const cards = [1, 5, 12, 33, 60];
    const lockedUntil = Date.now() + 60000;
    saveDeck(ls, cards, lockedUntil);
    const loaded = loadDeck(ls);
    assert.deepEqual(loaded.cards, cards);
    assert.equal(loaded.lockedUntil, lockedUntil);
  });

  test('overwrites previous deck on re-save', () => {
    const ls = makeLocalStorage();
    saveDeck(ls, [1, 2, 3], 0);
    saveDeck(ls, [10, 20, 30], 9999);
    const loaded = loadDeck(ls);
    assert.deepEqual(loaded.cards, [10, 20, 30]);
    assert.equal(loaded.lockedUntil, 9999);
  });

  test('empty deck array round-trips correctly', () => {
    const ls = makeLocalStorage();
    saveDeck(ls, [], 0);
    const loaded = loadDeck(ls);
    assert.deepEqual(loaded.cards, []);
  });

  test('corrupt deck JSON returns null', () => {
    const ls = makeLocalStorage();
    ls.setItem('oxark_deck', '{bad json');
    assert.equal(loadDeck(ls), null);
  });
});

suite('Registry save/load', () => {
  test('default registry when nothing saved', () => {
    const ls = makeLocalStorage();
    const reg = loadRegistry(ls);
    assert.deepEqual(reg.registered, []);
    assert.equal(reg.count, 0);
    assert.equal(reg.season_complete, false);
  });

  test('round-trip preserves registered wallets', () => {
    const ls = makeLocalStorage();
    const reg = makeRegistry();
    reg.registered = ['wallet1', 'wallet2'];
    reg.count = 2;
    reg.season_complete = true;
    saveRegistry(ls, reg);
    const loaded = loadRegistry(ls);
    assert.deepEqual(loaded.registered, ['wallet1', 'wallet2']);
    assert.equal(loaded.count, 2);
    assert.equal(loaded.season_complete, true);
  });

  test('overwrites on subsequent save', () => {
    const ls = makeLocalStorage();
    const reg = makeRegistry();
    reg.registered = ['w1'];
    saveRegistry(ls, reg);
    reg.registered = ['w1', 'w2'];
    reg.count = 2;
    saveRegistry(ls, reg);
    const loaded = loadRegistry(ls);
    assert.equal(loaded.registered.length, 2);
    assert.equal(loaded.count, 2);
  });
});

suite('Item inventory save/load', () => {
  test('empty object when nothing saved', () => {
    const ls = makeLocalStorage();
    const inv = makeItemInventory(ls);
    assert.deepEqual(inv, {});
  });

  test('round-trip preserves item counts', () => {
    const ls = makeLocalStorage();
    const inv = { booster: 3, hint: 1, revive: 0, scout: 2 };
    saveItemInventory(ls, inv);
    const inv2 = makeItemInventory(ls);
    assert.equal(inv2.booster, 3);
    assert.equal(inv2.hint, 1);
    assert.equal(inv2.revive, 0);
    assert.equal(inv2.scout, 2);
  });

  test('corrupt JSON falls back to empty object', () => {
    const ls = makeLocalStorage();
    ls.setItem(ITEM_INV_KEY, '<<<bad>>>');
    const inv = makeItemInventory(ls);
    assert.deepEqual(inv, {});
  });

  test('overwrite updates counts', () => {
    const ls = makeLocalStorage();
    saveItemInventory(ls, { booster: 1 });
    saveItemInventory(ls, { booster: 5, scout: 3 });
    const inv = makeItemInventory(ls);
    assert.equal(inv.booster, 5);
    assert.equal(inv.scout, 3);
  });
});

// ─── Summary ─────────────────────────────────────────────────────────────────
console.log('\n──────────────────────────────────────');
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);

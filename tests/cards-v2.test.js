/**
 * Phase 15: cards-v2 unit tests (60-card dataset)
 *
 * Run: node tests/cards-v2.test.js
 */

'use strict';

const assert = require('node:assert/strict');

let passed = 0, failed = 0;
function test(name, fn) {
  try { fn(); console.log(`  ✓ ${name}`); passed++; }
  catch (e) { console.error(`  ✗ ${name}\n    ${e.message}`); failed++; }
}
function suite(name, fn) { console.log(`\n${name}`); fn(); }

let CARD_DATA, cardById, getCard, LEGENDARY_IDS, ALL_CARD_IDS;

async function loadAndRun() {
  ({ CARD_DATA, cardById, getCard, LEGENDARY_IDS, ALL_CARD_IDS } =
    await import('../tools/ai-agent/src/cards.js'));
  runTests();
}

function runTests() {

const FACTIONS  = 6;
const PER_FACTION = 10;
const TOTAL     = FACTIONS * PER_FACTION;
const LEGENDARY_PER_FACTION = 1;
const RARE_PER_FACTION      = 1;
const UNCOMMON_PER_FACTION  = 3;
const COMMON_PER_FACTION    = 5;

suite('Dataset size', () => {
  test('exactly 60 cards total', () => {
    assert.equal(CARD_DATA.length, TOTAL);
  });
  test('ALL_CARD_IDS has 60 entries', () => {
    assert.equal(ALL_CARD_IDS.length, TOTAL);
  });
  test('no duplicate ids', () => {
    const ids = CARD_DATA.map(r => r[0]);
    const unique = new Set(ids);
    assert.equal(unique.size, TOTAL);
  });
  test('ids are 1-60 inclusive', () => {
    const ids = new Set(CARD_DATA.map(r => r[0]));
    for (let i = 1; i <= 60; i++) {
      assert.ok(ids.has(i), `id ${i} missing`);
    }
  });
});

suite('Per-faction distribution', () => {
  for (let f = 0; f < FACTIONS; f++) {
    const fCards = CARD_DATA.filter(r => r[1] === f);
    const fName = ['Knight','Merchant','Pirate','Scholar','Monk','Engineer'][f];

    test(`${fName}: 10 cards`, () => {
      assert.equal(fCards.length, PER_FACTION);
    });
    test(`${fName}: 5 Common`, () => {
      assert.equal(fCards.filter(r => r[2] === 0).length, COMMON_PER_FACTION);
    });
    test(`${fName}: 3 Uncommon`, () => {
      assert.equal(fCards.filter(r => r[2] === 1).length, UNCOMMON_PER_FACTION);
    });
    test(`${fName}: 1 Rare`, () => {
      assert.equal(fCards.filter(r => r[2] === 2).length, RARE_PER_FACTION);
    });
    test(`${fName}: 1 Legendary`, () => {
      assert.equal(fCards.filter(r => r[2] === 3).length, LEGENDARY_PER_FACTION);
    });
  }
});

suite('Legendary IDs', () => {
  test('6 Legendary cards total', () => {
    assert.equal(LEGENDARY_IDS.length, 6);
  });
  test('Legendary IDs are [10,20,30,40,50,60]', () => {
    assert.deepEqual([...LEGENDARY_IDS].sort((a, b) => a - b), [10, 20, 30, 40, 50, 60]);
  });
  test('each legendary is rarity=3', () => {
    for (const id of LEGENDARY_IDS) {
      const row = cardById[id];
      assert.ok(row, `id ${id} not found`);
      assert.equal(row[2], 3, `id ${id} should be rarity 3`);
    }
  });
  test('isLegendary flag matches rarity=3', () => {
    for (const row of CARD_DATA) {
      if (row[2] === 3) assert.ok(row[7] === true, `id ${row[0]} rarity=3 but isLegendary=false`);
      else              assert.ok(row[7] === false, `id ${row[0]} rarity<3 but isLegendary=true`);
    }
  });
});

suite('cardById index', () => {
  test('cardById[0] is null', () => {
    assert.equal(cardById[0], null);
  });
  test('cardById[61] is null (out-of-range)', () => {
    assert.equal(cardById[61], undefined);
  });
  test('cardById[1] is id=1 Knight card', () => {
    assert.equal(cardById[1][0], 1);
    assert.equal(cardById[1][1], 0); // faction=Knight
  });
  test('cardById[60] is id=60 Engineer Legendary', () => {
    const row = cardById[60];
    assert.equal(row[0], 60);
    assert.equal(row[1], 5); // faction=Engineer
    assert.equal(row[7], true); // isLegendary
  });
});

suite('getCard(id)', () => {
  test('getCard(1) returns structured object with correct fields', () => {
    const c = getCard(1);
    assert.equal(c.id,          1);
    assert.equal(c.faction,     0);   // Knight
    assert.equal(c.rarity,      0);   // Common
    assert.ok(typeof c.bp === 'number' && c.bp > 0);
    assert.ok(typeof c.hp === 'number' && c.hp > 0);
    assert.ok(typeof c.ini === 'number' && c.ini >= 0);
    assert.ok(typeof c.actionType === 'number');
    assert.equal(c.isLegendary, false);
  });
  test('getCard(10) returns Sentinel Legendary', () => {
    const c = getCard(10);
    assert.equal(c.id, 10);
    assert.equal(c.rarity, 3);
    assert.equal(c.isLegendary, true);
  });
  test('getCard(0) returns null', () => {
    assert.equal(getCard(0), null);
  });
  test('getCard(61) returns null', () => {
    assert.equal(getCard(61), null);
  });
  test('getCard returns new object each call (not mutable shared ref)', () => {
    const a = getCard(1);
    const b = getCard(1);
    a.bp = 9999;
    assert.notEqual(b.bp, 9999);
  });
});

suite('Stat ranges per faction profile', () => {
  const profiles = {
    0: { name: 'Knight',   bpRange: [5,8],  hpRange: [8,12],  iniRange: [2,3] },
    1: { name: 'Merchant', bpRange: [5,8],  hpRange: [5,8],   iniRange: [2,3] },
    2: { name: 'Pirate',   bpRange: [8,12], hpRange: [3,5],   iniRange: [4,5] },
    3: { name: 'Scholar',  bpRange: [3,5],  hpRange: [5,8],   iniRange: [4,5] },
    4: { name: 'Monk',     bpRange: [5,8],  hpRange: [8,12],  iniRange: [0,1] },
    5: { name: 'Engineer', bpRange: [8,12], hpRange: [5,8],   iniRange: [2,3] },
  };

  for (const [f, p] of Object.entries(profiles)) {
    const faction = parseInt(f);
    const fCards = CARD_DATA.filter(r => r[1] === faction && r[2] < 3); // exclude Legendary
    test(`${p.name} non-legendary BP in [${p.bpRange}]`, () => {
      for (const row of fCards) {
        assert.ok(row[3] >= p.bpRange[0] && row[3] <= p.bpRange[1],
          `id=${row[0]} bp=${row[3]} out of range [${p.bpRange}]`);
      }
    });
    test(`${p.name} non-legendary HP in [${p.hpRange}]`, () => {
      for (const row of fCards) {
        assert.ok(row[4] >= p.hpRange[0] && row[4] <= p.hpRange[1],
          `id=${row[0]} hp=${row[4]} out of range [${p.hpRange}]`);
      }
    });
    test(`${p.name} non-legendary INI in [${p.iniRange}]`, () => {
      for (const row of fCards) {
        assert.ok(row[5] >= p.iniRange[0] && row[5] <= p.iniRange[1],
          `id=${row[0]} ini=${row[5]} out of range [${p.iniRange}]`);
      }
    });
  }
});

suite('ActionType coverage', () => {
  test('all 6 ActionType values (0-5) appear in the dataset', () => {
    const used = new Set(CARD_DATA.map(r => r[6]));
    for (let at = 0; at <= 5; at++) {
      assert.ok(used.has(at), `ActionType ${at} not used by any card`);
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
  console.log(`\n${'─'.repeat(50)}`);
  console.log(`cards-v2: ${passed} passed, ${failed} failed`);
  if (failed) { console.error('\nSome tests FAILED.'); process.exit(1); }
}

loadAndRun().catch(e => { console.error(e); process.exit(1); });

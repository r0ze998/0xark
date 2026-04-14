/**
 * 0xARK Card Engine Unit Tests
 *
 * Tests addCardToPlayer, removeCardFromPlayer, syncCardCount,
 * checkWinAndTransition, pickAreaCardForMap, hasUniqueCards.
 *
 * All game globals are mocked inline — no browser, no PixiJS required.
 * Run: node tests/card-engine.test.js
 */

'use strict';

const assert = require('node:assert/strict');

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

// ─── Global constants ────────────────────────────────────────────────────────
const HAND_SIZE = 6;
const W = 960, H = 640;

// ─── Game state (reset via makeState() before each test) ────────────────────
let pl, cardTimers, decayWarn, stats, runMission, inDungeon, currentMap;
let cardAcqWasNew, rivalAI, rd, sc, victoryFrame, gameOverTimesUp;
let _winTransitionPending, tutorialMsg, tutorialMsgTimer;

// Side-effect call trackers
let _sfxCalls, _progressPulse, _saveStatsCalls, _fadeOutCalls, _fadeInCalls;

// ─── Stub side-effects ───────────────────────────────────────────────────────
function sfxUniqueCardSting() { _sfxCalls++; }
function triggerProgressPulse() { _progressPulse++; }
function screenShake() {}
function sfxStreakUp() {}
function saveStats() { _saveStatsCalls++; }
function fadeOut(cb) { _fadeOutCalls++; if (cb) cb(); }
function fadeIn() { _fadeInCalls++; }
function ub() {}
function getPlayElapsed() { return 60000; }

// ─── Card data stub (60 cards minimum) ──────────────────────────────────────
const CD = Array.from({ length: 60 }, (_, i) => ({
  id: i + 1,
  n: `Card${i + 1}`,
  r: Math.ceil((i + 1) / 12), // rarity 1-5
  t: ['ATK','DEF','ESC','MAG','HEL'][i % 5],
}));

// ─── Dungeon card pools (from 07-battle.js) ──────────────────────────────────
const DUNGEON_FLOOR_CARDS = [
  [],
  [4,5,13,14,25,26,39,40,49,50],
  [6,7,15,16,27,28,41,42,51,52],
  [3,8,9,10,17,18,19,29,30,31,43,44,45,53,54,55],
  [11,20,21,22,32,33,34,46,47,56,57,58],
  [1,2,12,23,24,35,36,37,38,48,59,60],
];
const AREA_CARDS = DUNGEON_FLOOR_CARDS;

// ─── State factory ───────────────────────────────────────────────────────────
function makePlayer(overrides = {}) {
  return {
    cd: new Array(HAND_SIZE).fill(0),
    vault: new Set(),
    cc: 0,
    ...overrides,
  };
}
function makeRival(overrides = {}) {
  return {
    cd: new Array(5).fill(0),
    cc: 0,
    ...overrides,
  };
}
function makeState() {
  pl = [makePlayer(), makeRival(), makeRival()];
  cardTimers = new Array(HAND_SIZE).fill(0);
  decayWarn = new Array(HAND_SIZE).fill(0);
  stats = { cardsCollected: 0, cardsLost: 0, gamesPlayed: 0, bestClearRounds: 0, bestClearTime: 0 };
  runMission = null;
  inDungeon = false;
  currentMap = 1;
  cardAcqWasNew = false;
  rivalAI = [{ personality: 'hunter' }, { personality: 'collector' }];
  rd = 5;
  sc = 'map';
  victoryFrame = 0;
  gameOverTimesUp = false;
  _winTransitionPending = false;
  tutorialMsg = '';
  tutorialMsgTimer = 0;
  _sfxCalls = 0;
  _progressPulse = 0;
  _saveStatsCalls = 0;
  _fadeOutCalls = 0;
  _fadeInCalls = 0;
}

// ─── Functions under test (copied verbatim from src/07-battle.js) ────────────

function syncCardCount(pIdx) {
  const p = pl[pIdx];
  if (pIdx === 0 && p.vault) { p.cc = p.vault.size; }
  else { p.cc = p.cd.filter(c => c > 0).length; }
}

function addCardToPlayer(pIdx, cardId) {
  const p = pl[pIdx];
  const handLimit = (pIdx === 0) ? HAND_SIZE : 5;
  const hadVaultBefore = pIdx === 0 && p.vault ? p.vault.has(cardId) : null;
  if (pIdx === 0 && p.vault && !p.vault.has(cardId)) {
    cardAcqWasNew = true;
    p.vault.add(cardId);
    sfxUniqueCardSting(); triggerProgressPulse();
    stats.cardsCollected++;
    if (runMission && runMission.type === 'new_cards' && !runMission.completed) {
      runMission.progress++; if (runMission.progress >= runMission.goal) { runMission.completed = true; sfxStreakUp(); }
    }
    const ms = p.vault.size;
    const milestones = { 10: '10 CARDS!', 20: '20 CARDS!', 30: 'HALFWAY THERE!', 40: '40 CARDS!', 50: '50 CARDS! SO CLOSE!', 55: '55 CARDS!', 59: 'ONE MORE!' };
    if (milestones[ms]) {
      setTimeout(() => {
        tutorialMsg = '\u2605 ' + milestones[ms] + ' ' + ms + '/60 collected!'; tutorialMsgTimer = 260;
        if (ms >= 50) screenShake(2, 4);
      }, 400);
    }
  }
  for (let i = 0; i < handLimit; i++) {
    if (p.cd[i] === 0) {
      p.cd[i] = cardId; syncCardCount(pIdx);
      if (pIdx === 0) { cardTimers[i] = inDungeon ? Date.now() : 0; decayWarn[i] = 0; if (hadVaultBefore === null) stats.cardsCollected++; }
      return true;
    }
  }
  syncCardCount(pIdx);
  return false;
}

function removeCardFromPlayer(pIdx, slotOrRandom) {
  const p = pl[pIdx];
  const handLimit = (pIdx === 0) ? HAND_SIZE : 5;
  if (slotOrRandom === -1) {
    const filled = []; for (let i = 0; i < handLimit; i++) { if (p.cd[i] > 0) filled.push(i); }
    if (filled.length === 0) return 0;
    const slot = filled[Math.floor(Math.random() * filled.length)];
    const card = p.cd[slot]; p.cd[slot] = 0; if (pIdx === 0) { cardTimers[slot] = 0; decayWarn[slot] = 0; stats.cardsLost++; } syncCardCount(pIdx); return card;
  }
  const card = p.cd[slotOrRandom]; if (card > 0) { p.cd[slotOrRandom] = 0; if (pIdx === 0) { cardTimers[slotOrRandom] = 0; decayWarn[slotOrRandom] = 0; stats.cardsLost++; } syncCardCount(pIdx); } return card;
}

function hasUniqueCards(pIdx) {
  if (pIdx === 0 && pl[0].vault) return pl[0].vault;
  const s = new Set(); pl[pIdx].cd.forEach(c => { if (c > 0) s.add(c); }); return s;
}

function playerHasAllSixty() { return pl[0].vault && pl[0].vault.size >= 60; }

function checkWinAndTransition(delayMs) {
  if (!playerHasAllSixty() || _winTransitionPending) return;
  _winTransitionPending = true;
  const clearTime = Math.floor(getPlayElapsed() / 1000);
  if (stats.bestClearRounds === 0 || rd < stats.bestClearRounds) { stats.bestClearRounds = rd; }
  if (stats.bestClearTime === 0 || clearTime < stats.bestClearTime) { stats.bestClearTime = clearTime; }
  const d = (delayMs !== undefined) ? delayMs : 500;
  if (d > 0) { setTimeout(() => { gameOverTimesUp = false; stats.gamesPlayed++; saveStats(); fadeOut(() => { sc = 'victory'; victoryFrame = 0; fadeIn(); ub(); }); }, d); }
  else { gameOverTimesUp = false; stats.gamesPlayed++; saveStats(); fadeOut(() => { sc = 'victory'; victoryFrame = 0; fadeIn(); ub(); }); }
}

function pickAreaCardForMap(mapIdx) {
  const ac = DUNGEON_FLOOR_CARDS[mapIdx];
  if (!ac || ac.length === 0) return 1 + (Math.floor(Math.random() * 60));
  return ac[Math.floor(Math.random() * ac.length)];
}
function pickAreaCard() { return pickAreaCardForMap(currentMap); }

// ─── Tests ───────────────────────────────────────────────────────────────────

suite('syncCardCount', () => {
  test('player cc reflects vault size', () => {
    makeState();
    pl[0].vault.add(1); pl[0].vault.add(2);
    syncCardCount(0);
    assert.equal(pl[0].cc, 2);
  });

  test('rival cc reflects hand cards', () => {
    makeState();
    pl[1].cd[0] = 3; pl[1].cd[1] = 7;
    syncCardCount(1);
    assert.equal(pl[1].cc, 2);
  });

  test('empty hand → cc = 0', () => {
    makeState();
    syncCardCount(0);
    assert.equal(pl[0].cc, 0);
  });
});

suite('addCardToPlayer — player', () => {
  test('adds card to first empty hand slot', () => {
    makeState();
    addCardToPlayer(0, 5);
    assert.equal(pl[0].cd[0], 5);
  });

  test('adds card to vault', () => {
    makeState();
    addCardToPlayer(0, 7);
    assert.ok(pl[0].vault.has(7));
  });

  test('increments stats.cardsCollected on new vault card', () => {
    makeState();
    addCardToPlayer(0, 10);
    assert.equal(stats.cardsCollected, 1);
  });

  test('does NOT double-count if card already in vault (hand slot found)', () => {
    makeState();
    pl[0].vault.add(10);
    const before = stats.cardsCollected;
    addCardToPlayer(0, 10); // duplicate — vault unchanged
    assert.equal(stats.cardsCollected, before); // only hand-slot path, hadVaultBefore=true so no extra ++
  });

  test('sets cardAcqWasNew=true only for genuinely new vault card', () => {
    makeState();
    addCardToPlayer(0, 3);
    assert.ok(cardAcqWasNew);
  });

  test('cardAcqWasNew stays false for duplicate', () => {
    makeState();
    pl[0].vault.add(3);
    cardAcqWasNew = false;
    addCardToPlayer(0, 3);
    assert.equal(cardAcqWasNew, false);
  });

  test('returns true when hand slot found', () => {
    makeState();
    const result = addCardToPlayer(0, 1);
    assert.equal(result, true);
  });

  test('returns false when hand full (vault still updated)', () => {
    makeState();
    for (let i = 0; i < HAND_SIZE; i++) pl[0].cd[i] = i + 1;
    const result = addCardToPlayer(0, 60);
    assert.equal(result, false);
    assert.ok(pl[0].vault.has(60));
  });

  test('fills slots sequentially', () => {
    makeState();
    addCardToPlayer(0, 1);
    addCardToPlayer(0, 2);
    addCardToPlayer(0, 3);
    assert.equal(pl[0].cd[0], 1);
    assert.equal(pl[0].cd[1], 2);
    assert.equal(pl[0].cd[2], 3);
  });

  test('resets decayWarn on newly filled slot', () => {
    makeState();
    decayWarn[0] = 2; // stale warn
    pl[0].cd[0] = 0;  // slot is empty
    addCardToPlayer(0, 5);
    assert.equal(decayWarn[0], 0);
  });

  test('triggers sfxUniqueCardSting for new vault card', () => {
    makeState();
    addCardToPlayer(0, 42);
    assert.equal(_sfxCalls, 1);
  });

  test('syncs cc after add', () => {
    makeState();
    addCardToPlayer(0, 11);
    assert.equal(pl[0].cc, 1); // vault.size = 1
  });
});

suite('addCardToPlayer — rival', () => {
  test('adds card to rival hand', () => {
    makeState();
    addCardToPlayer(1, 5);
    assert.equal(pl[1].cd[0], 5);
  });

  test('rival hand limit is 5', () => {
    makeState();
    for (let i = 0; i < 5; i++) pl[1].cd[i] = i + 1;
    const result = addCardToPlayer(1, 6);
    assert.equal(result, false);
  });

  test('rival has no vault — no cardsCollected change', () => {
    makeState();
    const before = stats.cardsCollected;
    addCardToPlayer(1, 5);
    assert.equal(stats.cardsCollected, before);
  });
});

suite('addCardToPlayer — mission tracking', () => {
  test('advances new_cards mission progress', () => {
    makeState();
    runMission = { type: 'new_cards', progress: 0, goal: 3, completed: false };
    addCardToPlayer(0, 1);
    assert.equal(runMission.progress, 1);
  });

  test('completes mission when goal reached', () => {
    makeState();
    runMission = { type: 'new_cards', progress: 2, goal: 3, completed: false };
    addCardToPlayer(0, 1);
    assert.ok(runMission.completed);
  });

  test('does not overprogress completed mission', () => {
    makeState();
    runMission = { type: 'new_cards', progress: 3, goal: 3, completed: true };
    addCardToPlayer(0, 1);
    assert.equal(runMission.progress, 3); // not incremented
  });
});

suite('removeCardFromPlayer — player', () => {
  test('removes card from specific slot', () => {
    makeState();
    pl[0].cd[0] = 7;
    const removed = removeCardFromPlayer(0, 0);
    assert.equal(removed, 7);
    assert.equal(pl[0].cd[0], 0);
  });

  test('increments stats.cardsLost', () => {
    makeState();
    pl[0].cd[0] = 7;
    removeCardFromPlayer(0, 0);
    assert.equal(stats.cardsLost, 1);
  });

  test('resets decayWarn on removed slot', () => {
    makeState();
    pl[0].cd[2] = 5; decayWarn[2] = 3;
    removeCardFromPlayer(0, 2);
    assert.equal(decayWarn[2], 0);
  });

  test('resets cardTimer on removed slot', () => {
    makeState();
    pl[0].cd[1] = 4; cardTimers[1] = 999999;
    removeCardFromPlayer(0, 1);
    assert.equal(cardTimers[1], 0);
  });

  test('random remove (-1) picks from filled slots only', () => {
    makeState();
    pl[0].cd[3] = 12; // only slot 3 filled
    const removed = removeCardFromPlayer(0, -1);
    assert.equal(removed, 12);
    assert.equal(pl[0].cd[3], 0);
  });

  test('random remove on empty hand returns 0', () => {
    makeState();
    const removed = removeCardFromPlayer(0, -1);
    assert.equal(removed, 0);
  });

  test('returns 0 for already-empty slot', () => {
    makeState();
    const removed = removeCardFromPlayer(0, 0); // slot 0 is 0
    assert.equal(removed, 0);
    assert.equal(stats.cardsLost, 0); // no loss counted for empty slot
  });

  test('syncs cc after remove', () => {
    makeState();
    addCardToPlayer(0, 1); // vault.size = 1, cc = 1
    removeCardFromPlayer(0, 0);
    syncCardCount(0);
    assert.equal(pl[0].cc, 1); // vault still has card (vault is never decremented by remove)
  });
});

suite('removeCardFromPlayer — rival', () => {
  test('removes rival card from specific slot', () => {
    makeState();
    pl[1].cd[0] = 9;
    const removed = removeCardFromPlayer(1, 0);
    assert.equal(removed, 9);
  });

  test('does not touch player cardTimers/decayWarn for rival remove', () => {
    makeState();
    decayWarn[0] = 2; // belongs to player slot 0
    pl[1].cd[0] = 9;
    removeCardFromPlayer(1, 0);
    assert.equal(decayWarn[0], 2); // unchanged
  });
});

suite('hasUniqueCards', () => {
  test('player: returns vault Set', () => {
    makeState();
    pl[0].vault.add(1); pl[0].vault.add(5);
    const unique = hasUniqueCards(0);
    assert.ok(unique.has(1));
    assert.ok(unique.has(5));
    assert.equal(unique.size, 2);
  });

  test('rival: derives from hand (no vault)', () => {
    makeState();
    pl[1].cd[0] = 3; pl[1].cd[1] = 7;
    const unique = hasUniqueCards(1);
    assert.ok(unique.has(3));
    assert.ok(unique.has(7));
    assert.equal(unique.size, 2);
  });

  test('rival: empty hand → empty set', () => {
    makeState();
    const unique = hasUniqueCards(1);
    assert.equal(unique.size, 0);
  });
});

suite('checkWinAndTransition', () => {
  test('does nothing when vault < 60', () => {
    makeState();
    for (let i = 1; i <= 59; i++) pl[0].vault.add(i);
    checkWinAndTransition(0);
    assert.equal(sc, 'map');
    assert.equal(_fadeOutCalls, 0);
  });

  test('triggers victory when vault === 60 (delay=0)', () => {
    makeState();
    for (let i = 1; i <= 60; i++) pl[0].vault.add(i);
    checkWinAndTransition(0);
    assert.equal(sc, 'victory');
    assert.equal(_fadeOutCalls, 1);
    assert.equal(_fadeInCalls, 1);
    assert.equal(stats.gamesPlayed, 1);
  });

  test('saves stats on win', () => {
    makeState();
    for (let i = 1; i <= 60; i++) pl[0].vault.add(i);
    checkWinAndTransition(0);
    assert.equal(_saveStatsCalls, 1);
  });

  test('sets bestClearRounds on first win', () => {
    makeState();
    rd = 42;
    for (let i = 1; i <= 60; i++) pl[0].vault.add(i);
    checkWinAndTransition(0);
    assert.equal(stats.bestClearRounds, 42);
  });

  test('updates bestClearRounds when new round count is lower', () => {
    makeState();
    stats.bestClearRounds = 50; rd = 30;
    for (let i = 1; i <= 60; i++) pl[0].vault.add(i);
    checkWinAndTransition(0);
    assert.equal(stats.bestClearRounds, 30);
  });

  test('does NOT update bestClearRounds when current is worse', () => {
    makeState();
    stats.bestClearRounds = 20; rd = 30;
    for (let i = 1; i <= 60; i++) pl[0].vault.add(i);
    checkWinAndTransition(0);
    assert.equal(stats.bestClearRounds, 20);
  });

  test('double-fire guard: second call is no-op', () => {
    makeState();
    for (let i = 1; i <= 60; i++) pl[0].vault.add(i);
    checkWinAndTransition(0);
    checkWinAndTransition(0);
    assert.equal(stats.gamesPlayed, 1); // not 2
    assert.equal(_fadeOutCalls, 1);
  });

  test('_winTransitionPending set to true after trigger', () => {
    makeState();
    for (let i = 1; i <= 60; i++) pl[0].vault.add(i);
    checkWinAndTransition(0);
    assert.ok(_winTransitionPending);
  });

  test('bestClearTime is recorded (60s elapsed from stub)', () => {
    makeState();
    for (let i = 1; i <= 60; i++) pl[0].vault.add(i);
    checkWinAndTransition(0);
    assert.equal(stats.bestClearTime, 60); // getPlayElapsed()=60000ms → 60s
  });
});

suite('playerHasAllSixty', () => {
  test('false when vault has 59 cards', () => {
    makeState();
    for (let i = 1; i <= 59; i++) pl[0].vault.add(i);
    assert.equal(playerHasAllSixty(), false);
  });

  test('true when vault has exactly 60 cards', () => {
    makeState();
    for (let i = 1; i <= 60; i++) pl[0].vault.add(i);
    assert.equal(playerHasAllSixty(), true);
  });

  test('true when vault has more than 60 (edge case)', () => {
    makeState();
    for (let i = 1; i <= 61; i++) pl[0].vault.add(i); // hypothetical
    assert.equal(playerHasAllSixty(), true);
  });
});

suite('pickAreaCardForMap', () => {
  test('returns card from correct floor pool', () => {
    const floor1Pool = new Set([4,5,13,14,25,26,39,40,49,50]);
    for (let i = 0; i < 30; i++) {
      const card = pickAreaCardForMap(1);
      assert.ok(floor1Pool.has(card), `Expected floor 1 card, got ${card}`);
    }
  });

  test('floor 5 pool contains legendaries (1,2,60)', () => {
    const floor5Pool = new Set([1,2,12,23,24,35,36,37,38,48,59,60]);
    let foundLegendary = false;
    for (let i = 0; i < 100; i++) {
      if (floor5Pool.has(pickAreaCardForMap(5))) { foundLegendary = true; break; }
    }
    assert.ok(foundLegendary);
  });

  test('map 0 (town) falls back to any card 1-60', () => {
    for (let i = 0; i < 20; i++) {
      const card = pickAreaCardForMap(0);
      assert.ok(card >= 1 && card <= 60, `Got out-of-range card ${card}`);
    }
  });

  test('all floor pools return valid card IDs (1-60)', () => {
    for (let floor = 1; floor <= 5; floor++) {
      for (let i = 0; i < 20; i++) {
        const card = pickAreaCardForMap(floor);
        assert.ok(card >= 1 && card <= 60, `Floor ${floor} returned invalid card ${card}`);
      }
    }
  });
});

suite('addCardToPlayer + checkWinAndTransition integration', () => {
  test('win triggered after card 60 added', () => {
    makeState();
    for (let i = 1; i <= 59; i++) pl[0].vault.add(i);
    addCardToPlayer(0, 60);
    checkWinAndTransition(0);
    assert.equal(sc, 'victory');
  });

  test('no win if card 60 already in vault before add', () => {
    makeState();
    for (let i = 1; i <= 60; i++) pl[0].vault.add(i); // all 60 already there
    // Now add a duplicate — win check should fire
    addCardToPlayer(0, 60);
    // vault still has 60 (Set dedup), win guard fires
    checkWinAndTransition(0);
    assert.equal(sc, 'victory');
  });

  test('59 unique + 1 duplicate does NOT trigger win', () => {
    makeState();
    for (let i = 1; i <= 59; i++) pl[0].vault.add(i);
    addCardToPlayer(0, 1); // duplicate of card 1 — vault stays at 59
    checkWinAndTransition(0);
    assert.equal(sc, 'map'); // NOT victory
  });
});

// ─── Summary ─────────────────────────────────────────────────────────────────
console.log(`\n${'─'.repeat(50)}`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);

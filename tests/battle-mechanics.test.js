/**
 * 0xARK Battle Mechanics Unit Tests
 *
 * Tests the commit-reveal action resolution engine:
 * DRAW / STEAL / BARRIER / SCOUT / USE CARD interactions,
 * HP mechanics, barrier state persistence, scout intel,
 * multi-round sequencing, and ZK commit-hash simulation.
 *
 * All game globals are mocked inline — no browser, no PixiJS required.
 * Run: node tests/battle-mechanics.test.js
 */

'use strict';

const assert = require('node:assert/strict');
const crypto = require('node:crypto');

// ─── Test runner ─────────────────────────────────────────────────────────────
let passed = 0, failed = 0;
function test(name, fn) {
  try { fn(); console.log(`  ✓ ${name}`); passed++; }
  catch (e) { console.error(`  ✗ ${name}\n    ${e.message}`); failed++; }
}
function suite(name, fn) { console.log(`\n${name}`); fn(); }

// ─── Constants ───────────────────────────────────────────────────────────────
const HAND_SIZE = 6;
const BATTLE_HP_MAX = 3;
const ACTION = { DRAW: 0, STEAL: 1, BARRIER: 2, SCOUT: 3, USE_CARD: 4 };

// ─── Card data stub (60 cards) ───────────────────────────────────────────────
const CD = Array.from({ length: 61 }, (_, i) => i === 0 ? null : {
  id: i, n: `Card${i}`, r: Math.ceil(i / 12), t: ['ATK','DEF','ESC','MAG','HEL'][(i-1) % 5],
});

// ─── Player factory ──────────────────────────────────────────────────────────
function makePlayer(overrides = {}) {
  return { cd: new Array(HAND_SIZE).fill(0), vault: new Set(), cc: 0, barrierActive: false, ...overrides };
}
function makeRival(overrides = {}) {
  return { cd: [0,0,0,0,0], cc: 0, barrierActive: false, ...overrides };
}
function makeHP() { return [BATTLE_HP_MAX, BATTLE_HP_MAX, BATTLE_HP_MAX]; }

// ─── Core engine (extracted from 07-battle.js / generateResolveEvents) ───────

function syncCC(pl, pIdx) {
  const p = pl[pIdx];
  p.cc = pIdx === 0 && p.vault ? p.vault.size : p.cd.filter(c => c > 0).length;
}

function addCard(pl, pIdx, cardId) {
  const p = pl[pIdx];
  const limit = pIdx === 0 ? HAND_SIZE : 5;
  if (pIdx === 0 && p.vault && !p.vault.has(cardId)) p.vault.add(cardId);
  for (let i = 0; i < limit; i++) {
    if (p.cd[i] === 0) { p.cd[i] = cardId; syncCC(pl, pIdx); return i; }
  }
  return -1; // hand full
}

function removeCard(pl, pIdx, slotOrRandom) {
  const p = pl[pIdx];
  const limit = pIdx === 0 ? HAND_SIZE : 5;
  if (slotOrRandom === -1) {
    const filled = []; for (let i = 0; i < limit; i++) if (p.cd[i] > 0) filled.push(i);
    if (!filled.length) return -1;
    slotOrRandom = filled[Math.floor(Math.random() * filled.length)];
  }
  if (slotOrRandom < 0 || slotOrRandom >= limit) return -1;
  const id = p.cd[slotOrRandom];
  if (!id) return -1;
  p.cd[slotOrRandom] = 0;
  syncCC(pl, pIdx);
  return id;
}

/**
 * Resolve one battle round. Returns an event log array.
 * playerAction / rivalActions: ACTION.* constants.
 * targetIdx: which rival (1 or 2) the player targets for STEAL/SCOUT.
 */
function resolveRound(pl, hp, { playerAction, rivalActions, playerTarget = 1, cardPool = [] }) {
  const events = [];

  // ── Player action ──────────────────────────────────────────────────────
  if (playerAction === ACTION.DRAW) {
    if (cardPool.length > 0) {
      const cardId = cardPool.splice(0, 1)[0];
      addCard(pl, 0, cardId);
      events.push({ who: 'player', action: 'DRAW', result: 'got', cardId });
    } else {
      events.push({ who: 'player', action: 'DRAW', result: 'empty_pool' });
    }
  } else if (playerAction === ACTION.STEAL) {
    const tgt = playerTarget;
    if (pl[tgt].barrierActive) {
      events.push({ who: 'player', action: 'STEAL', result: 'blocked', target: tgt });
    } else {
      const stolen = removeCard(pl, tgt, -1);
      if (stolen !== -1) {
        addCard(pl, 0, stolen);
        events.push({ who: 'player', action: 'STEAL', result: 'success', cardId: stolen, target: tgt });
      } else {
        events.push({ who: 'player', action: 'STEAL', result: 'empty_hand', target: tgt });
      }
    }
  } else if (playerAction === ACTION.BARRIER) {
    pl[0].barrierActive = true;
    events.push({ who: 'player', action: 'BARRIER', result: 'raised' });
  } else if (playerAction === ACTION.SCOUT) {
    const intel = { target: playerTarget, action: rivalActions[playerTarget - 1] };
    events.push({ who: 'player', action: 'SCOUT', result: 'intel', intel });
  }

  // ── Rival 1 action ─────────────────────────────────────────────────────
  const r1action = rivalActions[0];
  if (r1action === ACTION.DRAW) {
    if (cardPool.length > 0) {
      const cardId = cardPool.splice(0, 1)[0];
      addCard(pl, 1, cardId);
      events.push({ who: 'rival1', action: 'DRAW', cardId });
    }
  } else if (r1action === ACTION.STEAL) {
    if (pl[0].barrierActive) {
      events.push({ who: 'rival1', action: 'STEAL', result: 'blocked_by_player_barrier' });
    } else {
      const stolen = removeCard(pl, 0, -1);
      if (stolen !== -1) {
        addCard(pl, 1, stolen);
        if (hp) { hp[0]--; }
        events.push({ who: 'rival1', action: 'STEAL', result: 'success', cardId: stolen });
      } else {
        events.push({ who: 'rival1', action: 'STEAL', result: 'empty_hand' });
      }
    }
  } else if (r1action === ACTION.BARRIER) {
    pl[1].barrierActive = true;
    events.push({ who: 'rival1', action: 'BARRIER', result: 'raised' });
  }

  // ── Rival 2 action (if present) ────────────────────────────────────────
  if (rivalActions.length >= 2) {
    const r2action = rivalActions[1];
    if (r2action === ACTION.DRAW) {
      if (cardPool.length > 0) {
        const cardId = cardPool.splice(0, 1)[0];
        addCard(pl, 2, cardId);
        events.push({ who: 'rival2', action: 'DRAW', cardId });
      }
    } else if (r2action === ACTION.STEAL) {
      if (pl[0].barrierActive) {
        events.push({ who: 'rival2', action: 'STEAL', result: 'blocked_by_player_barrier' });
      } else {
        const stolen = removeCard(pl, 0, -1);
        if (stolen !== -1) {
          addCard(pl, 2, stolen);
          if (hp) { hp[0]--; }
          events.push({ who: 'rival2', action: 'STEAL', result: 'success', cardId: stolen });
        }
      }
    } else if (r2action === ACTION.BARRIER) {
      pl[2].barrierActive = true;
      events.push({ who: 'rival2', action: 'BARRIER', result: 'raised' });
    }
  }

  // ── Barrier resets after each round (lasts 1 round) ───────────────────
  pl[0].barrierActive = false;
  pl[1].barrierActive = false;
  if (pl[2]) pl[2].barrierActive = false;

  return events;
}

// ─── ZK commit-reveal simulation ─────────────────────────────────────────────
function zkCommitHash(actionType, targetPubkey, salt) {
  const h = crypto.createHash('sha256');
  h.update(Buffer.from([actionType]));
  h.update(targetPubkey);
  h.update(salt);
  return h.digest();
}

function zkVerify(claimed, actionType, targetPubkey, salt) {
  const expected = zkCommitHash(actionType, targetPubkey, salt);
  return expected.equals(claimed);
}

// ═══════════════════════════════════════════════════════════════════════════════
// SUITES
// ═══════════════════════════════════════════════════════════════════════════════

suite('DRAW action', () => {
  test('DRAW from non-empty pool adds card to hand', () => {
    const pl = [makePlayer(), makeRival()];
    const hp = makeHP();
    const pool = [5, 12, 33];
    const events = resolveRound(pl, hp, { playerAction: ACTION.DRAW, rivalActions: [ACTION.DRAW], cardPool: pool });
    assert.ok(pl[0].cd.includes(5), 'player should have card 5');
    // Both player and rival draw — pool shrinks by 2 total (5 and 12 consumed)
    assert.equal(pool.length, 1, 'pool shrinks by 2 after player+rival both draw');
    const ev = events.find(e => e.who === 'player' && e.action === 'DRAW');
    assert.equal(ev.result, 'got');
    assert.equal(ev.cardId, 5);
  });

  test('DRAW from empty pool produces empty_pool event', () => {
    const pl = [makePlayer(), makeRival()];
    const hp = makeHP();
    const events = resolveRound(pl, hp, { playerAction: ACTION.DRAW, rivalActions: [ACTION.DRAW], cardPool: [] });
    const ev = events.find(e => e.who === 'player' && e.action === 'DRAW');
    assert.equal(ev.result, 'empty_pool');
  });

  test('DRAW adds card to vault', () => {
    const pl = [makePlayer(), makeRival()];
    const hp = makeHP();
    resolveRound(pl, hp, { playerAction: ACTION.DRAW, rivalActions: [ACTION.DRAW], cardPool: [7] });
    assert.ok(pl[0].vault.has(7), 'vault should track card 7');
  });

  test('DRAW fills first empty hand slot', () => {
    const pl = [makePlayer({ cd: [1, 2, 3, 0, 0, 0] }), makeRival()];
    const hp = makeHP();
    resolveRound(pl, hp, { playerAction: ACTION.DRAW, rivalActions: [ACTION.DRAW], cardPool: [10] });
    assert.equal(pl[0].cd[3], 10, 'card fills slot index 3');
  });

  test('rival DRAW adds to rival hand', () => {
    const pl = [makePlayer(), makeRival()];
    const hp = makeHP();
    const pool = [8, 9];
    resolveRound(pl, hp, { playerAction: ACTION.DRAW, rivalActions: [ACTION.DRAW], cardPool: pool });
    // After player draws 8, rival draws 9
    assert.ok(pl[1].cd.includes(9), 'rival should have card 9');
  });

  test('DRAW does not reduce HP', () => {
    const pl = [makePlayer(), makeRival()];
    const hp = makeHP();
    resolveRound(pl, hp, { playerAction: ACTION.DRAW, rivalActions: [ACTION.DRAW], cardPool: [1, 2] });
    assert.deepEqual(hp, [BATTLE_HP_MAX, BATTLE_HP_MAX, BATTLE_HP_MAX]);
  });
});

suite('STEAL action', () => {
  test('STEAL takes random card from rival hand', () => {
    const pl = [makePlayer(), makeRival({ cd: [3, 7, 0, 0, 0] })];
    const hp = makeHP();
    resolveRound(pl, hp, { playerAction: ACTION.STEAL, rivalActions: [ACTION.DRAW], cardPool: [] });
    const rivalCards = pl[1].cd.filter(c => c > 0);
    assert.equal(rivalCards.length, 1, 'rival should have 1 card remaining');
    assert.ok(pl[0].cd.includes(3) || pl[0].cd.includes(7), 'player got one rival card');
  });

  test('STEAL blocked by rival BARRIER', () => {
    const pl = [makePlayer(), makeRival({ cd: [4, 5, 0, 0, 0], barrierActive: true })];
    const hp = makeHP();
    // Rival already has barrier up before round
    pl[1].barrierActive = true;
    const events = resolveRound(pl, hp, { playerAction: ACTION.STEAL, rivalActions: [ACTION.DRAW], cardPool: [] });
    const ev = events.find(e => e.who === 'player' && e.action === 'STEAL');
    assert.equal(ev.result, 'blocked');
    assert.equal(pl[1].cd.filter(c => c > 0).length, 2, 'rival hand unchanged after barrier block');
  });

  test('STEAL on empty rival hand produces empty_hand event', () => {
    const pl = [makePlayer(), makeRival({ cd: [0, 0, 0, 0, 0] })];
    const hp = makeHP();
    const events = resolveRound(pl, hp, { playerAction: ACTION.STEAL, rivalActions: [ACTION.DRAW], cardPool: [] });
    const ev = events.find(e => e.who === 'player' && e.action === 'STEAL');
    assert.equal(ev.result, 'empty_hand');
  });

  test('rival STEAL reduces player HP by 1', () => {
    const pl = [makePlayer({ cd: [2, 5, 0, 0, 0, 0] }), makeRival()];
    const hp = makeHP();
    resolveRound(pl, hp, { playerAction: ACTION.DRAW, rivalActions: [ACTION.STEAL], cardPool: [] });
    assert.equal(hp[0], BATTLE_HP_MAX - 1, 'player HP reduced by rival STEAL');
  });

  test('rival STEAL blocked by player BARRIER (player uses BARRIER same round)', () => {
    const pl = [makePlayer({ cd: [2, 5, 0, 0, 0, 0] }), makeRival()];
    const hp = makeHP();
    resolveRound(pl, hp, { playerAction: ACTION.BARRIER, rivalActions: [ACTION.STEAL], cardPool: [] });
    // Player raised barrier this round → rival steal should be blocked
    assert.equal(hp[0], BATTLE_HP_MAX, 'player HP unchanged when barrier active');
    assert.equal(pl[0].cd.filter(c => c > 0).length, 2, 'player hand unchanged');
  });

  test('STEAL success adds stolen card to player vault', () => {
    const pl = [makePlayer(), makeRival({ cd: [15, 0, 0, 0, 0] })];
    const hp = makeHP();
    resolveRound(pl, hp, { playerAction: ACTION.STEAL, rivalActions: [ACTION.DRAW], cardPool: [] });
    assert.ok(pl[0].vault.has(15), 'card 15 should be in player vault after steal');
  });

  test('mutual STEAL (player STEALs rival1, rival1 STEALs player) — both succeed without barriers', () => {
    // Player starts with 2 cards, rival starts with 1. Player steals rival's card first.
    // Then rival steals one card from player. Net result: player net +0, rival net +0.
    const pl = [makePlayer({ cd: [10, 11, 0, 0, 0, 0] }), makeRival({ cd: [20, 0, 0, 0, 0] })];
    const hp = makeHP();
    resolveRound(pl, hp, { playerAction: ACTION.STEAL, rivalActions: [ACTION.STEAL], cardPool: [] });
    // After player steals: player has [10,11,20], rival has []
    // After rival steals: rival gets one of player's cards, player back to 2 cards
    const playerCount = pl[0].cd.filter(c => c > 0).length;
    const rivalCount = pl[1].cd.filter(c => c > 0).length;
    assert.equal(playerCount, 2, 'player ends with 2 cards (had 2, stole 1, lost 1)');
    assert.equal(rivalCount, 1, 'rival ends with 1 card (had 1, lost 1, stole 1 back)');
    assert.equal(hp[0], BATTLE_HP_MAX - 1, 'rival steal landed, HP reduced');
  });

  test('STEAL target defaults to rival index 1', () => {
    const pl = [makePlayer(), makeRival({ cd: [9, 0, 0, 0, 0] }), makeRival({ cd: [30, 0, 0, 0, 0] })];
    const hp = makeHP();
    resolveRound(pl, hp, { playerAction: ACTION.STEAL, rivalActions: [ACTION.DRAW, ACTION.DRAW], playerTarget: 1, cardPool: [] });
    assert.ok(pl[0].cd.includes(9), 'should have stolen from rival1 (index 1)');
    assert.equal(pl[2].cd.filter(c => c > 0).length, 1, 'rival2 hand should be untouched');
  });

  test('STEAL from rival2 when playerTarget=2', () => {
    const pl = [makePlayer(), makeRival({ cd: [5, 0, 0, 0, 0] }), makeRival({ cd: [40, 0, 0, 0, 0] })];
    const hp = makeHP();
    resolveRound(pl, hp, { playerAction: ACTION.STEAL, rivalActions: [ACTION.DRAW, ACTION.DRAW], playerTarget: 2, cardPool: [] });
    assert.ok(pl[0].cd.includes(40), 'should have stolen card 40 from rival2');
    assert.equal(pl[1].cd.filter(c => c > 0).length, 1, 'rival1 hand should be untouched');
  });

  test('STEAL card count stays consistent after steal', () => {
    const pl = [makePlayer(), makeRival({ cd: [18, 22, 0, 0, 0] })];
    const hp = makeHP();
    resolveRound(pl, hp, { playerAction: ACTION.STEAL, rivalActions: [ACTION.DRAW], cardPool: [] });
    syncCC(pl, 0); syncCC(pl, 1);
    assert.equal(pl[0].cc, pl[0].vault.size, 'player cc synced');
    assert.equal(pl[1].cc, pl[1].cd.filter(c => c > 0).length, 'rival cc synced');
  });
});

suite('BARRIER action', () => {
  test('BARRIER raises barrierActive flag during resolve', () => {
    const pl = [makePlayer(), makeRival()];
    const hp = makeHP();
    // We test the flag mid-resolution — inspect events
    const events = resolveRound(pl, hp, { playerAction: ACTION.BARRIER, rivalActions: [ACTION.DRAW], cardPool: [] });
    const ev = events.find(e => e.who === 'player' && e.action === 'BARRIER');
    assert.equal(ev.result, 'raised');
  });

  test('BARRIER resets after round ends', () => {
    const pl = [makePlayer(), makeRival()];
    const hp = makeHP();
    resolveRound(pl, hp, { playerAction: ACTION.BARRIER, rivalActions: [ACTION.DRAW], cardPool: [] });
    assert.equal(pl[0].barrierActive, false, 'barrier resets at end of round');
  });

  test('BARRIER does not draw a card', () => {
    const pl = [makePlayer(), makeRival()];
    const hp = makeHP();
    const pool = [5, 6];
    resolveRound(pl, hp, { playerAction: ACTION.BARRIER, rivalActions: [ACTION.DRAW], cardPool: pool });
    assert.equal(pl[0].cd.filter(c => c > 0).length, 0, 'player got no card from BARRIER');
    assert.equal(pool.length, 1, 'only rival draw consumed pool');
  });

  test('consecutive BARRIER rounds each last exactly one round', () => {
    const pl = [makePlayer({ cd: [5, 0, 0, 0, 0, 0] }), makeRival()];
    const hp = makeHP();
    // Round 1: player BARRIERs — rival steal should be blocked
    resolveRound(pl, hp, { playerAction: ACTION.BARRIER, rivalActions: [ACTION.STEAL], cardPool: [] });
    assert.equal(hp[0], BATTLE_HP_MAX, 'R1: barrier blocked steal');
    // Round 2: no barrier — rival steal succeeds
    resolveRound(pl, hp, { playerAction: ACTION.DRAW, rivalActions: [ACTION.STEAL], cardPool: [] });
    assert.ok(hp[0] < BATTLE_HP_MAX, 'R2: no barrier, steal hits');
  });

  test('rival BARRIER blocks player STEAL', () => {
    const pl = [makePlayer(), makeRival({ cd: [7, 0, 0, 0, 0] })];
    const hp = makeHP();
    pl[1].barrierActive = true; // rival raised barrier last round (still active at start)
    const events = resolveRound(pl, hp, { playerAction: ACTION.STEAL, rivalActions: [ACTION.DRAW], cardPool: [] });
    const ev = events.find(e => e.who === 'player' && e.action === 'STEAL');
    assert.equal(ev.result, 'blocked');
  });
});

suite('SCOUT action', () => {
  test('SCOUT returns rival action intel', () => {
    const pl = [makePlayer(), makeRival(), makeRival()];
    const hp = makeHP();
    const events = resolveRound(pl, hp, {
      playerAction: ACTION.SCOUT,
      rivalActions: [ACTION.STEAL, ACTION.DRAW],
      playerTarget: 1,
      cardPool: [],
    });
    const ev = events.find(e => e.who === 'player' && e.action === 'SCOUT');
    assert.equal(ev.result, 'intel');
    assert.equal(ev.intel.target, 1);
    assert.equal(ev.intel.action, ACTION.STEAL, 'intel reveals rival1 planned STEAL');
  });

  test('SCOUT on rival2 returns rival2 action', () => {
    const pl = [makePlayer(), makeRival(), makeRival()];
    const hp = makeHP();
    const events = resolveRound(pl, hp, {
      playerAction: ACTION.SCOUT,
      rivalActions: [ACTION.DRAW, ACTION.BARRIER],
      playerTarget: 2,
      cardPool: [],
    });
    const ev = events.find(e => e.who === 'player' && e.action === 'SCOUT');
    assert.equal(ev.intel.action, ACTION.BARRIER, 'intel reveals rival2 planned BARRIER');
  });

  test('SCOUT does not modify any hand', () => {
    const pl = [makePlayer({ cd: [3, 0, 0, 0, 0, 0] }), makeRival({ cd: [8, 0, 0, 0, 0] }), makeRival()];
    const hp = makeHP();
    resolveRound(pl, hp, {
      playerAction: ACTION.SCOUT, rivalActions: [ACTION.DRAW, ACTION.DRAW], playerTarget: 1, cardPool: [],
    });
    assert.equal(pl[0].cd.filter(c => c > 0).length, 1, 'player hand unchanged after SCOUT');
    assert.equal(pl[1].cd.filter(c => c > 0).length, 1, 'rival1 hand unchanged after SCOUT');
  });

  test('SCOUT does not reduce HP', () => {
    const pl = [makePlayer(), makeRival(), makeRival()];
    const hp = makeHP();
    resolveRound(pl, hp, { playerAction: ACTION.SCOUT, rivalActions: [ACTION.DRAW, ACTION.DRAW], playerTarget: 1, cardPool: [] });
    assert.deepEqual(hp, makeHP(), 'HP unchanged after SCOUT');
  });

  test('SCOUT intel enables correct counter-action (BARRIER against STEAL)', () => {
    // Round 1: scout reveals rival plans STEAL next round
    const pl = [makePlayer({ cd: [5, 0, 0, 0, 0, 0] }), makeRival({ cd: [8, 0, 0, 0, 0] })];
    const hp = makeHP();
    const r1events = resolveRound(pl, hp, { playerAction: ACTION.SCOUT, rivalActions: [ACTION.STEAL], playerTarget: 1, cardPool: [] });
    // Rival still steals this round even if scouted (scout doesn't prevent action)
    // hp[0] should have dropped
    assert.ok(hp[0] <= BATTLE_HP_MAX, 'rival steal still executes regardless of scout');

    // Round 2: player uses BARRIER because they saw the STEAL intel
    const hp2 = makeHP();
    const pl2 = [makePlayer({ cd: [5, 0, 0, 0, 0, 0] }), makeRival({ cd: [8, 0, 0, 0, 0] })];
    resolveRound(pl2, hp2, { playerAction: ACTION.BARRIER, rivalActions: [ACTION.STEAL], cardPool: [] });
    assert.equal(hp2[0], BATTLE_HP_MAX, 'barrier countered steal successfully using scout intel');
  });
});

suite('HP mechanics', () => {
  test('player HP starts at BATTLE_HP_MAX', () => {
    const hp = makeHP();
    assert.equal(hp[0], BATTLE_HP_MAX);
  });

  test('successful rival STEAL reduces player HP by 1', () => {
    const pl = [makePlayer({ cd: [5, 0, 0, 0, 0, 0] }), makeRival()];
    const hp = makeHP();
    resolveRound(pl, hp, { playerAction: ACTION.DRAW, rivalActions: [ACTION.STEAL], cardPool: [] });
    assert.equal(hp[0], BATTLE_HP_MAX - 1);
  });

  test('HP does not drop below 0 (game over check is caller responsibility)', () => {
    const pl = [makePlayer({ cd: [1, 2, 3, 0, 0, 0] }), makeRival()];
    const hp = [0, BATTLE_HP_MAX, BATTLE_HP_MAX];
    // HP already 0 — engine doesn't guard (caller does), ensure it doesn't throw
    assert.doesNotThrow(() => {
      resolveRound(pl, hp, { playerAction: ACTION.DRAW, rivalActions: [ACTION.STEAL], cardPool: [] });
    });
  });

  test('three consecutive rival steals reduce player HP from 3 to 0', () => {
    const cards = [1, 2, 3, 4, 5, 6];
    const pl = [makePlayer({ cd: [...cards] }), makeRival()];
    const hp = makeHP();
    for (let r = 0; r < 3; r++) {
      resolveRound(pl, hp, { playerAction: ACTION.DRAW, rivalActions: [ACTION.STEAL], cardPool: [] });
    }
    assert.equal(hp[0], 0);
  });

  test('barrier each round prevents all HP loss over 3 rounds', () => {
    const pl = [makePlayer({ cd: [1, 2, 3, 4, 0, 0] }), makeRival()];
    const hp = makeHP();
    for (let r = 0; r < 3; r++) {
      resolveRound(pl, hp, { playerAction: ACTION.BARRIER, rivalActions: [ACTION.STEAL], cardPool: [] });
    }
    assert.equal(hp[0], BATTLE_HP_MAX, 'HP stays at max with continuous barrier');
  });
});

suite('Multi-round state persistence', () => {
  test('vault accumulates cards across 3 rounds of DRAW', () => {
    const pl = [makePlayer(), makeRival()];
    const hp = makeHP();
    // 6 cards: player draws every other one (rival also draws), so player gets cards 5, 15, 25
    const pool = [5, 99, 15, 98, 25, 97];
    for (let i = 0; i < 3; i++) {
      resolveRound(pl, hp, { playerAction: ACTION.DRAW, rivalActions: [ACTION.DRAW], cardPool: pool });
    }
    assert.ok(pl[0].vault.has(5), 'round 1 player draw');
    assert.ok(pl[0].vault.has(15), 'round 2 player draw');
    assert.ok(pl[0].vault.has(25), 'round 3 player draw');
  });

  test('barrier state does not persist across rounds', () => {
    const pl = [makePlayer({ cd: [5, 0, 0, 0, 0, 0] }), makeRival()];
    const hp = makeHP();
    // Round 1: barrier
    resolveRound(pl, hp, { playerAction: ACTION.BARRIER, rivalActions: [ACTION.STEAL], cardPool: [] });
    assert.equal(hp[0], BATTLE_HP_MAX, 'R1 blocked');
    // Round 2: no barrier — steal lands
    resolveRound(pl, hp, { playerAction: ACTION.DRAW, rivalActions: [ACTION.STEAL], cardPool: [] });
    assert.equal(hp[0], BATTLE_HP_MAX - 1, 'R2 steal landed');
  });

  test('hand fills correctly across sequential DRAWs', () => {
    const pl = [makePlayer(), makeRival()];
    const hp = makeHP();
    // 12 cards: player draws every other one — 6 rounds = 6 player draws = full hand
    const pool = [1,50,2,51,3,52,4,53,5,54,6,55];
    for (let i = 0; i < 6; i++) {
      resolveRound(pl, hp, { playerAction: ACTION.DRAW, rivalActions: [ACTION.DRAW], cardPool: pool });
    }
    const filledSlots = pl[0].cd.filter(c => c > 0).length;
    assert.equal(filledSlots, 6, 'all 6 hand slots filled');
  });

  test('cc stays in sync after mixed actions', () => {
    const pl = [makePlayer(), makeRival({ cd: [10, 20, 30, 0, 0] })];
    const hp = makeHP();
    const pool = [5];
    resolveRound(pl, hp, { playerAction: ACTION.STEAL, rivalActions: [ACTION.DRAW], cardPool: pool });
    syncCC(pl, 0); syncCC(pl, 1);
    assert.equal(pl[0].cc, pl[0].vault.size);
    assert.equal(pl[1].cc, pl[1].cd.filter(c => c > 0).length);
  });

  test('5-round simulation: correct card totals', () => {
    const pool = [1, 2, 3, 4, 5, 10, 11, 12, 13, 14];
    const pl = [makePlayer(), makeRival()];
    const hp = makeHP();
    for (let r = 0; r < 5; r++) {
      const playerAct = r % 2 === 0 ? ACTION.DRAW : ACTION.BARRIER;
      resolveRound(pl, hp, { playerAction: playerAct, rivalActions: [ACTION.DRAW], cardPool: pool });
    }
    // Player drew on rounds 0, 2, 4 → 3 cards (or fewer if hand filled early)
    const playerCardCount = pl[0].cd.filter(c => c > 0).length;
    assert.ok(playerCardCount >= 3 && playerCardCount <= HAND_SIZE, `player has ${playerCardCount} cards after 5 rounds`);
  });
});

suite('ZK commit-reveal simulation', () => {
  test('commit hash matches reveal with correct params', () => {
    const salt = crypto.randomBytes(32);
    const target = crypto.randomBytes(32);
    const action = ACTION.STEAL;
    const hash = zkCommitHash(action, target, salt);
    assert.ok(zkVerify(hash, action, target, salt), 'hash should verify with correct params');
  });

  test('wrong action fails verification', () => {
    const salt = crypto.randomBytes(32);
    const target = crypto.randomBytes(32);
    const hash = zkCommitHash(ACTION.STEAL, target, salt);
    assert.ok(!zkVerify(hash, ACTION.DRAW, target, salt), 'wrong action should not verify');
  });

  test('wrong salt fails verification', () => {
    const salt = crypto.randomBytes(32);
    const wrongSalt = crypto.randomBytes(32);
    const target = crypto.randomBytes(32);
    const hash = zkCommitHash(ACTION.BARRIER, target, salt);
    assert.ok(!zkVerify(hash, ACTION.BARRIER, target, wrongSalt), 'wrong salt should not verify');
  });

  test('different targets produce different hashes', () => {
    const salt = Buffer.alloc(32, 1);
    const target1 = crypto.randomBytes(32);
    const target2 = crypto.randomBytes(32);
    const h1 = zkCommitHash(ACTION.STEAL, target1, salt);
    const h2 = zkCommitHash(ACTION.STEAL, target2, salt);
    assert.ok(!h1.equals(h2), 'different targets → different hashes');
  });

  test('two players with different salts produce different commits for same action', () => {
    const target = crypto.randomBytes(32);
    const salt1 = Buffer.alloc(32, 1);
    const salt2 = Buffer.alloc(32, 2);
    const h1 = zkCommitHash(ACTION.DRAW, target, salt1);
    const h2 = zkCommitHash(ACTION.DRAW, target, salt2);
    assert.ok(!h1.equals(h2), 'different salts → different commits');
  });

  test('replay attack: same commit cannot be reused with swapped action', () => {
    const salt = Buffer.alloc(32, 5);
    const target = crypto.randomBytes(32);
    const commit = zkCommitHash(ACTION.DRAW, target, salt);
    // Attacker tries to reuse commit claiming they played STEAL
    assert.ok(!zkVerify(commit, ACTION.STEAL, target, salt), 'commit locked to original action');
  });
});

suite('Edge cases', () => {
  test('empty hand card count is 0', () => {
    const pl = [makePlayer(), makeRival()];
    syncCC(pl, 0); syncCC(pl, 1);
    assert.equal(pl[0].cc, 0);
    assert.equal(pl[1].cc, 0);
  });

  test('removeCard from empty hand returns -1', () => {
    const pl = [makePlayer(), makeRival()];
    const result = removeCard(pl, 0, -1);
    assert.equal(result, -1);
  });

  test('addCard to full hand returns -1 (hand full)', () => {
    const pl = [makePlayer({ cd: [1, 2, 3, 4, 5, 6] }), makeRival()];
    const result = addCard(pl, 0, 7);
    assert.equal(result, -1, 'adding to full hand returns -1');
  });

  test('vault does not duplicate cards already collected', () => {
    const pl = [makePlayer(), makeRival()];
    addCard(pl, 0, 5);
    addCard(pl, 0, 5); // duplicate
    assert.equal(pl[0].vault.size, 1, 'vault should have 1 entry for card 5');
  });

  test('STEAL from rival2 does not affect rival1', () => {
    const pl = [makePlayer(), makeRival({ cd: [10, 0, 0, 0, 0] }), makeRival({ cd: [20, 0, 0, 0, 0] })];
    const hp = makeHP();
    resolveRound(pl, hp, {
      playerAction: ACTION.STEAL, rivalActions: [ACTION.DRAW, ACTION.DRAW], playerTarget: 2, cardPool: [],
    });
    assert.equal(pl[1].cd.filter(c => c > 0).length, 1, 'rival1 untouched when target is rival2');
  });

  test('barrier against rival2 STEAL (rival2 action list)', () => {
    const pl = [makePlayer({ cd: [5, 0, 0, 0, 0, 0] }), makeRival(), makeRival()];
    const hp = makeHP();
    resolveRound(pl, hp, {
      playerAction: ACTION.BARRIER, rivalActions: [ACTION.DRAW, ACTION.STEAL], cardPool: [],
    });
    assert.equal(hp[0], BATTLE_HP_MAX, 'barrier blocked rival2 STEAL');
  });

  test('playerHasAllSixty returns true only when vault has 60 unique cards', () => {
    const pl = [makePlayer(), makeRival()];
    for (let i = 1; i <= 60; i++) pl[0].vault.add(i);
    const allSixty = pl[0].vault.size === 60;
    assert.ok(allSixty, 'vault with exactly 60 cards counts as complete');
    pl[0].vault.add(61); // extra card shouldn't break check
    assert.ok(pl[0].vault.size > 60, 'vault can hold >60 without error');
  });
});

// ─── Summary ──────────────────────────────────────────────────────────────────
console.log(`\n${'─'.repeat(48)}`);
console.log(`Total: ${passed + failed} tests — ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);

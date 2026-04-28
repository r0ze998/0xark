'use strict';
/**
 * move-schema.test.cjs — Phase 12 memo schema + state derivation tests
 *
 * Tests:
 *   - validateMemo: 7 move endpoints (happy path + abnormal cases)
 *   - validateMemo: existing legacy endpoints (regression)
 *   - state derivation: valid move sequences
 *   - state derivation: violation moves leave state unchanged
 *
 * Run: node multiplayer/test/move-schema.test.cjs
 */

const assert = require('node:assert/strict');

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

async function asyncTest(name, fn) {
  try {
    await fn();
    console.log(`  ✓ ${name}`);
    passed++;
  } catch (e) {
    console.error(`  ✗ ${name}`);
    console.error(`    ${e.message}`);
    failed++;
  }
}

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const HEX64  = 'a'.repeat(64);
const HEX16  = 'b'.repeat(16);
const BASE58 = '11111111111111111111111111111111';  // 32-char valid base58
const MATCH  = 'match1';
const ROUND  = '1';

function coMemo(overrides = {}) {
  const f = { m: MATCH, r: ROUND, p: 's', h: HEX64, n: HEX16, ...overrides };
  return `e:/x402/co;m:${f.m};r:${f.r};p:${f.p};h:${f.h};n:${f.n}`;
}
function reMemo(overrides = {}) {
  const f = { m: MATCH, r: ROUND, p: 's', a: '1', g: BASE58, s: HEX64, n: HEX16, ...overrides };
  return `e:/x402/re;m:${f.m};r:${f.r};p:${f.p};a:${f.a};g:${f.g};s:${f.s};n:${f.n}`;
}
function hcMemo(overrides = {}) {
  const f = { m: MATCH, r: ROUND, c: HEX64, n: HEX16, ...overrides };
  return `e:/x402/hc;m:${f.m};r:${f.r};c:${f.c};n:${f.n}`;
}
function hrMemo(overrides = {}) {
  const f = { m: MATCH, r: ROUND, i: '1,2,3', n: HEX16, ...overrides };
  return `e:/x402/hr;m:${f.m};r:${f.r};i:${f.i};n:${f.n}`;
}
function paMemo(phase = 'd', overrides = {}) {
  const f = { m: MATCH, r: ROUND, p: phase, n: HEX16, ...overrides };
  return `e:/x402/pa;m:${f.m};r:${f.r};p:${f.p};n:${f.n}`;
}
function rsMemo(overrides = {}) {
  const f = { m: MATCH, r: ROUND, d: '-1/0', n: HEX16, ...overrides };
  return `e:/x402/rs;m:${f.m};r:${f.r};d:${f.d};n:${f.n}`;
}
function meMemo(overrides = {}) {
  const f = { m: MATCH, w: BASE58, n: HEX16, ...overrides };
  return `e:/x402/me;m:${f.m};w:${f.w};n:${f.n}`;
}

// ─── Run tests ────────────────────────────────────────────────────────────────

async function run() {
  const { validateMemo } = await import('../memo-validator.js');
  const { deriveGameState, applyMove, emptyMatchState } = await import('../state-derivation.js');

  // ── validateMemo: happy path (7 move endpoints) ──────────────────────────

  console.log('\nvalidateMemo — happy path (move endpoints)');

  test('/x402/co valid', () => {
    const r = validateMemo(coMemo(), '/x402/co');
    assert.equal(r.ok, true);
    assert.equal(r.fields.m, MATCH);
    assert.equal(r.fields.h, HEX64);
  });
  test('/x402/re valid', () => {
    const r = validateMemo(reMemo(), '/x402/re');
    assert.equal(r.ok, true);
    assert.equal(r.fields.a, '1');
  });
  test('/x402/hc valid', () => {
    assert.equal(validateMemo(hcMemo(), '/x402/hc').ok, true);
  });
  test('/x402/hr valid', () => {
    assert.equal(validateMemo(hrMemo(), '/x402/hr').ok, true);
  });
  test('/x402/pa valid (d)', () => assert.equal(validateMemo(paMemo('d'), '/x402/pa').ok, true));
  test('/x402/pa valid (e)', () => assert.equal(validateMemo(paMemo('e'), '/x402/pa').ok, true));
  test('/x402/pa valid (s)', () => assert.equal(validateMemo(paMemo('s'), '/x402/pa').ok, true));
  test('/x402/pa valid (b)', () => assert.equal(validateMemo(paMemo('b'), '/x402/pa').ok, true));
  test('/x402/rs valid (positive deltas)', () => {
    assert.equal(validateMemo(rsMemo({ d: '0/0' }), '/x402/rs').ok, true);
  });
  test('/x402/rs valid (negative deltas)', () => {
    assert.equal(validateMemo(rsMemo({ d: '-3/-1' }), '/x402/rs').ok, true);
  });
  test('/x402/me valid', () => assert.equal(validateMemo(meMemo(), '/x402/me').ok, true));

  // ── validateMemo: missing required fields ────────────────────────────────

  console.log('\nvalidateMemo — missing required fields');

  test('/x402/co missing h', () => {
    const m = `e:/x402/co;m:${MATCH};r:1;p:s;n:${HEX16}`;
    const r = validateMemo(m, '/x402/co');
    assert.equal(r.ok, false);
    assert.match(r.error, /missing field: h/);
  });
  test('/x402/re missing a', () => {
    const m = `e:/x402/re;m:${MATCH};r:1;p:s;g:${BASE58};s:${HEX64};n:${HEX16}`;
    const r = validateMemo(m, '/x402/re');
    assert.equal(r.ok, false);
    assert.match(r.error, /missing field: a/);
  });
  test('/x402/hc missing c', () => {
    const m = `e:/x402/hc;m:${MATCH};r:1;n:${HEX16}`;
    const r = validateMemo(m, '/x402/hc');
    assert.equal(r.ok, false);
    assert.match(r.error, /missing field: c/);
  });
  test('/x402/hr missing i', () => {
    const m = `e:/x402/hr;m:${MATCH};r:1;n:${HEX16}`;
    const r = validateMemo(m, '/x402/hr');
    assert.equal(r.ok, false);
    assert.match(r.error, /missing field: i/);
  });
  test('/x402/pa missing p', () => {
    const m = `e:/x402/pa;m:${MATCH};r:1;n:${HEX16}`;
    const r = validateMemo(m, '/x402/pa');
    assert.equal(r.ok, false);
    assert.match(r.error, /missing field: p/);
  });
  test('/x402/rs missing d', () => {
    const m = `e:/x402/rs;m:${MATCH};r:1;n:${HEX16}`;
    const r = validateMemo(m, '/x402/rs');
    assert.equal(r.ok, false);
    assert.match(r.error, /missing field: d/);
  });
  test('/x402/me missing w', () => {
    const m = `e:/x402/me;m:${MATCH};n:${HEX16}`;
    const r = validateMemo(m, '/x402/me');
    assert.equal(r.ok, false);
    assert.match(r.error, /missing field: w/);
  });
  test('empty memo string', () => {
    const r = validateMemo('', '/x402/co');
    assert.equal(r.ok, false);
  });

  // ── validateMemo: value format violations ────────────────────────────────

  console.log('\nvalidateMemo — value format violations');

  test('h field not hex64 (too short)', () => {
    const r = validateMemo(coMemo({ h: 'abc' }), '/x402/co');
    assert.equal(r.ok, false);
    assert.match(r.error, /hash/);
  });
  test('h field not hex64 (non-hex chars)', () => {
    const r = validateMemo(coMemo({ h: 'z'.repeat(64) }), '/x402/co');
    assert.equal(r.ok, false);
  });
  test('round out of range (0)', () => {
    const r = validateMemo(coMemo({ r: '0' }), '/x402/co');
    assert.equal(r.ok, false);
    assert.match(r.error, /round/);
  });
  test('round out of range (100)', () => {
    const r = validateMemo(coMemo({ r: '100' }), '/x402/co');
    assert.equal(r.ok, false);
  });
  test('p value invalid (x)', () => {
    const r = validateMemo(paMemo('x'), '/x402/pa');
    assert.equal(r.ok, false);
    assert.match(r.error, /p value/);
  });
  test('action_type out of range (11)', () => {
    const r = validateMemo(reMemo({ a: '11' }), '/x402/re');
    assert.equal(r.ok, false);
    assert.match(r.error, /action_type/);
  });
  test('winner pubkey invalid (too short)', () => {
    const r = validateMemo(meMemo({ w: 'abc' }), '/x402/me');
    assert.equal(r.ok, false);
    assert.match(r.error, /winner pubkey/);
  });
  test('hp delta wrong format (missing /)', () => {
    const r = validateMemo(rsMemo({ d: '-1-0' }), '/x402/rs');
    assert.equal(r.ok, false);
    assert.match(r.error, /hp delta/);
  });
  test('nonce too short (< 16 hex chars)', () => {
    const r = validateMemo(coMemo({ n: 'abc123' }), '/x402/co');
    assert.equal(r.ok, false);
    assert.match(r.error, /nonce/);
  });
  test('endpoint mismatch', () => {
    const r = validateMemo(coMemo(), '/x402/re');
    assert.equal(r.ok, false);
    assert.match(r.error, /endpoint mismatch/);
  });

  // ── validateMemo: legacy format regression (existing 3 endpoints) ────────

  console.log('\nvalidateMemo — legacy endpoint regression');

  test('scout-peek legacy format accepted', () => {
    const r = validateMemo('endpoint:/scout-peek;nonce:abc12345', '/scout-peek');
    assert.equal(r.ok, true);
  });
  test('counter-peek legacy format accepted', () => {
    const r = validateMemo('endpoint:/counter-peek;nonce:xyz98765', '/counter-peek');
    assert.equal(r.ok, true);
  });
  test('extra-action legacy format accepted', () => {
    const r = validateMemo('endpoint:/extra-action;nonce:12345678', '/extra-action');
    assert.equal(r.ok, true);
  });
  test('legacy format: endpoint mismatch fails', () => {
    const r = validateMemo('endpoint:/scout-peek;nonce:abc12345', '/counter-peek');
    assert.equal(r.ok, false);
  });
  test('legacy format: nonce too short fails', () => {
    const r = validateMemo('endpoint:/scout-peek;nonce:abc', '/scout-peek');
    assert.equal(r.ok, false);
  });

  // ── state derivation: valid move sequence ────────────────────────────────

  console.log('\nstate derivation — valid move sequences');

  const HOST  = '11111111111111111111111111111111';
  const P2    = 'So11111111111111111111111111111111111111112';

  test('pa(d) advances status to commit and round to 1', () => {
    const state = deriveGameState([
      { memo: paMemo('d', { m: 'g1' }), sender: HOST, slot: 1 },
    ]);
    assert.equal(state.status, 'commit');
    assert.equal(state.round, 1);
    assert.equal(state.host, HOST);
    assert.equal(state.matchId, 'g1');
  });

  test('co marks player committed', () => {
    let s = emptyMatchState();
    s = applyMove(s, { e: '/x402/pa', m: 'g1', r: '1', p: 'd', n: HEX16 }, HOST, 1);
    s = applyMove(s, { e: '/x402/co', m: 'g1', r: '1', p: 's', h: HEX64, n: HEX16 }, HOST, 2);
    assert.equal(s.players[HOST]?.committed, true);
  });

  test('pa(e) advances status to reveal after commits', () => {
    let s = emptyMatchState();
    s = applyMove(s, { e: '/x402/pa', m: 'g1', r: '1', p: 'd', n: HEX16 }, HOST, 1);
    s = applyMove(s, { e: '/x402/co', m: 'g1', r: '1', p: 's', h: HEX64, n: HEX16 }, HOST, 2);
    s = applyMove(s, { e: '/x402/pa', m: 'g1', r: '1', p: 'e', n: HEX16 }, HOST, 3);
    assert.equal(s.status, 'reveal');
  });

  test('re marks player revealed with actionType', () => {
    let s = emptyMatchState();
    s = applyMove(s, { e: '/x402/pa', m: 'g1', r: '1', p: 'd', n: HEX16 }, HOST, 1);
    s = applyMove(s, { e: '/x402/co', m: 'g1', r: '1', p: 's', h: HEX64, n: HEX16 }, HOST, 2);
    s = applyMove(s, { e: '/x402/pa', m: 'g1', r: '1', p: 'e', n: HEX16 }, HOST, 3);
    s = applyMove(s, { e: '/x402/re', m: 'g1', r: '1', p: 's', a: '2', g: P2, s: HEX64, n: HEX16 }, HOST, 4);
    assert.equal(s.players[HOST]?.revealed, true);
    assert.equal(s.players[HOST]?.actionType, 2);
  });

  test('rs applies HP deltas', () => {
    let s = emptyMatchState();
    s = applyMove(s, { e: '/x402/pa', m: 'g1', r: '1', p: 'd', n: HEX16 }, HOST, 1);
    s = applyMove(s, { e: '/x402/co', m: 'g1', r: '1', p: 's', h: HEX64, n: HEX16 }, HOST, 2);
    s = applyMove(s, { e: '/x402/co', m: 'g1', r: '1', p: 'b', h: HEX64, n: HEX16 }, P2, 3);
    s = applyMove(s, { e: '/x402/rs', m: 'g1', r: '1', d: '-1/0', n: HEX16 }, HOST, 4);
    const pks = Object.keys(s.players);
    assert.equal(s.players[pks[0]].hp, 99);  // p1 -1
    assert.equal(s.players[pks[1]].hp, 100); // p2  0
    assert.equal(s.rounds.length, 1);
  });

  test('me sets winner and status=finished', () => {
    let s = emptyMatchState();
    s = applyMove(s, { e: '/x402/me', m: 'g1', w: HOST, n: HEX16 }, HOST, 10);
    assert.equal(s.status, 'finished');
    assert.equal(s.winner, HOST);
  });

  test('hc stores handCommitment', () => {
    let s = emptyMatchState();
    s = applyMove(s, { e: '/x402/hc', m: 'g1', r: '1', c: HEX64, n: HEX16 }, HOST, 1);
    assert.equal(s.players[HOST]?.handCommitment, HEX64);
  });

  test('hr stores revealed hand', () => {
    let s = emptyMatchState();
    s = applyMove(s, { e: '/x402/pa', m: 'g1', r: '1', p: 'd', n: HEX16 }, HOST, 1);
    s = applyMove(s, { e: '/x402/hr', m: 'g1', r: '1', i: '1,5,12', n: HEX16 }, HOST, 2);
    assert.deepEqual(s.players[HOST]?.hand, [1, 5, 12]);
  });

  // ── state derivation: violations leave state unchanged ───────────────────

  console.log('\nstate derivation — violation moves (state unchanged)');

  test('co in lobby phase is a no-op', () => {
    const before = emptyMatchState();
    const after  = applyMove(before, { e: '/x402/co', m: 'g1', r: '1', p: 's', h: HEX64, n: HEX16 }, HOST, 1);
    assert.deepEqual(after, before);
  });

  test('re without prior commit is a no-op', () => {
    let s = emptyMatchState();
    s = applyMove(s, { e: '/x402/pa', m: 'g1', r: '1', p: 'd', n: HEX16 }, HOST, 1);
    s = applyMove(s, { e: '/x402/pa', m: 'g1', r: '1', p: 'e', n: HEX16 }, HOST, 2);
    const before = s;
    const after  = applyMove(s, { e: '/x402/re', m: 'g1', r: '1', p: 's', a: '1', g: P2, s: HEX64, n: HEX16 }, HOST, 3);
    // HOST hasn't committed, so reveal is a no-op (no revealed flag set)
    assert.equal(after.players[HOST]?.revealed ?? false, false);
  });

  test('pa(e) from wrong phase (lobby) is a no-op', () => {
    const before = emptyMatchState();
    const after  = applyMove(before, { e: '/x402/pa', m: 'g1', r: '1', p: 'e', n: HEX16 }, HOST, 1);
    assert.equal(after.status, 'lobby');
  });

  test('pa from non-host is a no-op', () => {
    let s = emptyMatchState();
    s = applyMove(s, { e: '/x402/pa', m: 'g1', r: '1', p: 'd', n: HEX16 }, HOST, 1);
    const before = s;
    const after  = applyMove(s, { e: '/x402/pa', m: 'g1', r: '1', p: 'e', n: HEX16 }, P2, 2);
    assert.equal(after.status, before.status); // unchanged
    assert.equal(after.host, HOST);            // host unchanged
  });

  test('rs from non-host is a no-op', () => {
    let s = emptyMatchState();
    s = applyMove(s, { e: '/x402/pa', m: 'g1', r: '1', p: 'd', n: HEX16 }, HOST, 1);
    s = applyMove(s, { e: '/x402/co', m: 'g1', r: '1', p: 's', h: HEX64, n: HEX16 }, HOST, 2);
    const hpBefore = s.players[HOST]?.hp ?? 100;
    const after    = applyMove(s, { e: '/x402/rs', m: 'g1', r: '1', d: '-5/0', n: HEX16 }, P2, 3);
    assert.equal(after.players[HOST]?.hp ?? 100, hpBefore);
  });

  test('double commit is a no-op', () => {
    let s = emptyMatchState();
    s = applyMove(s, { e: '/x402/pa', m: 'g1', r: '1', p: 'd', n: HEX16 }, HOST, 1);
    s = applyMove(s, { e: '/x402/co', m: 'g1', r: '1', p: 's', h: HEX64, n: HEX16 }, HOST, 2);
    const before = s;
    const after  = applyMove(s, { e: '/x402/co', m: 'g1', r: '1', p: 's', h: HEX64, n: HEX16 }, HOST, 3);
    assert.equal(after.rounds.length, before.rounds.length);
    assert.deepEqual(after.players[HOST], before.players[HOST]);
  });

  // ── Summary ──────────────────────────────────────────────────────────────

  console.log('\n' + '─'.repeat(50));
  console.log(`move-schema: ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exitCode = 1;
}

run().catch(err => {
  console.error('Test runner error:', err);
  process.exitCode = 1;
});

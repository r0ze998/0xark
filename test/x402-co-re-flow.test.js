/**
 * x402-co-re-flow.test.js — Phase 12 client-side memo chain + state derivation
 *
 * Verifies:
 *   1. Client builds a 1-round memo chain (hc → pa(d) → co → pa(e) → re → rs → pa(b))
 *   2. Each compact memo passes server-side validateMemo
 *   3. deriveGameState produces the correct match state after the full round
 *
 * Run: node solana/client/test/x402-co-re-flow.test.js
 */

import assert from 'node:assert/strict';
import test from 'node:test';
import { validateMemo } from '../../../multiplayer/memo-validator.js';
import { deriveGameState } from '../../../multiplayer/state-derivation.js';

// Compact memo fixtures for the legacy Phase 12 protocol.

const HEX64 = 'c'.repeat(64);
const HEX16 = 'd'.repeat(16);
const HOST  = '11111111111111111111111111111111';
const P2    = 'So11111111111111111111111111111111111111112';

function buildMemo(endpoint, fields) {
  const parts = [`e:${endpoint}`];
  for (const [k, v] of Object.entries(fields)) parts.push(`${k}:${v}`);
  parts.push(`n:${HEX16}`);
  return parts.join(';');
}

// 1-round memo chain
function makeRound(matchId = 'testmatch1', round = 1) {
  return [
    // Both players hand-commit
    { memo: buildMemo('/x402/hc', { m: matchId, r: round, c: HEX64 }), sender: HOST, slot: 1 },
    { memo: buildMemo('/x402/hc', { m: matchId, r: round, c: HEX64 }), sender: P2,   slot: 2 },
    // Host advances to commit phase
    { memo: buildMemo('/x402/pa', { m: matchId, r: round, p: 'd' }), sender: HOST, slot: 3 },
    // Both players commit
    { memo: buildMemo('/x402/co', { m: matchId, r: round, p: 's', h: HEX64 }), sender: HOST, slot: 4 },
    { memo: buildMemo('/x402/co', { m: matchId, r: round, p: 'b', h: HEX64 }), sender: P2,   slot: 5 },
    // Host advances to reveal
    { memo: buildMemo('/x402/pa', { m: matchId, r: round, p: 'e' }), sender: HOST, slot: 6 },
    // Both players reveal (Draw action = 1)
    { memo: buildMemo('/x402/re', { m: matchId, r: round, p: 's', a: '1', g: P2,   s: HEX64 }), sender: HOST, slot: 7 },
    { memo: buildMemo('/x402/re', { m: matchId, r: round, p: 'b', a: '1', g: HOST, s: HEX64 }), sender: P2,   slot: 8 },
    // Host resolves (Draw vs Draw = 0 damage)
    { memo: buildMemo('/x402/rs', { m: matchId, r: round, d: '0/0' }), sender: HOST, slot: 9 },
    // Host advances back
    { memo: buildMemo('/x402/pa', { m: matchId, r: round, p: 'b' }), sender: HOST, slot: 10 },
  ];
}

const chain = makeRound();


test('all memos in chain pass validateMemo', () => {
  for (const entry of chain) {
    const ep  = entry.memo.split(';')[0].slice(2); // e: → strip
    const res = validateMemo(entry.memo, ep);
    if (!res.ok) throw new Error(`${ep} failed: ${res.error} | memo=${entry.memo}`);
  }
});

test('hc memos pass /x402/hc validation', () => {
  const hcEntries = chain.filter(e => e.memo.startsWith('e:/x402/hc'));
  assert.equal(hcEntries.length, 2);
  for (const e of hcEntries) assert.equal(validateMemo(e.memo, '/x402/hc').ok, true);
});

test('co memos pass /x402/co validation', () => {
  const coEntries = chain.filter(e => e.memo.startsWith('e:/x402/co'));
  assert.equal(coEntries.length, 2);
  for (const e of coEntries) assert.equal(validateMemo(e.memo, '/x402/co').ok, true);
});

test('re memos pass /x402/re validation', () => {
  const reEntries = chain.filter(e => e.memo.startsWith('e:/x402/re'));
  assert.equal(reEntries.length, 2);
  for (const e of reEntries) assert.equal(validateMemo(e.memo, '/x402/re').ok, true);
});

test('rs memo passes /x402/rs validation', () => {
  const rsEntry = chain.find(e => e.memo.startsWith('e:/x402/rs'));
  assert.ok(rsEntry);
  assert.equal(validateMemo(rsEntry.memo, '/x402/rs').ok, true);
});


test('status is commit after pa(b)', () => {
  const s = deriveGameState(chain);
  assert.equal(s.status, 'commit');
});

test('round incremented to 1', () => {
  const s = deriveGameState(chain);
  assert.equal(s.round, 1);
});

test('both players present in state', () => {
  const s = deriveGameState(chain);
  assert.ok(s.players[HOST], 'HOST player missing');
  assert.ok(s.players[P2],   'P2 player missing');
});

test('both players hp=100 (Draw vs Draw: no damage)', () => {
  const s = deriveGameState(chain);
  assert.equal(s.players[HOST].hp, 100);
  assert.equal(s.players[P2].hp,   100);
});

test('both players have handCommitment', () => {
  const s = deriveGameState(chain);
  assert.equal(s.players[HOST].handCommitment, HEX64);
  assert.equal(s.players[P2].handCommitment,   HEX64);
});

test('1 round recorded in history', () => {
  const s = deriveGameState(chain);
  assert.equal(s.rounds.length, 1);
  assert.equal(s.rounds[0].p1Delta, 0);
  assert.equal(s.rounds[0].p2Delta, 0);
});

test('host set correctly', () => {
  const s = deriveGameState(chain);
  assert.equal(s.host, HOST);
});

test('match-end memo sets finished+winner', () => {
  const chain2 = [...chain, { memo: buildMemo('/x402/me', { m: 'testmatch1', w: HOST }), sender: HOST, slot: 11 }];
  const s = deriveGameState(chain2);
  assert.equal(s.status, 'finished');
  assert.equal(s.winner, HOST);
});

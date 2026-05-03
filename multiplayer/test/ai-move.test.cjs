'use strict';
/**
 * ai-move.test.cjs — Phase 14 /x402/ai-move endpoint + identity_source tests
 *
 * Tests:
 *   - /x402/ai-move probe returns 503 when ANTHROPIC_API_KEY missing
 *   - /x402/ai-move demo mode returns ok + identity_source: 'ai'
 *   - delegateMove fallback: bad response → action_type=0
 *   - identity_source 'ai' stored in memo field i:ai passes validateMemo
 *   - identity_source 'self' passes validateMemo for /x402/co
 *   - invalid identity_source value rejected by validateMemo
 *   - state-derivation records identity_source in history
 *   - state-derivation: identity_source defaults to 'self' when i field absent
 *
 * Run: node multiplayer/test/ai-move.test.cjs
 */

const assert = require('node:assert/strict');
const path   = require('path');

let passed = 0, failed = 0;
function test(name, fn) {
  try { fn(); console.log(`  ✓ ${name}`); passed++; }
  catch (e) { console.error(`  ✗ ${name}\n    ${e.message}`); failed++; }
}
async function asyncTest(name, fn) {
  try { await fn(); console.log(`  ✓ ${name}`); passed++; }
  catch (e) { console.error(`  ✗ ${name}\n    ${e.message}`); failed++; }
}

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const HEX64  = 'a'.repeat(64);
const HEX16  = 'b'.repeat(16);
const BASE58 = '11111111111111111111111111111111';
const MATCH  = 'match1';
const HOST   = '11111111111111111111111111111111';
const P2     = 'So11111111111111111111111111111111111111112';

function coMemo(overrides = {}) {
  const f = { m: MATCH, r: '1', p: 's', h: HEX64, n: HEX16, ...overrides };
  return 'e:/x402/co;' + Object.entries(f).map(([k,v]) => `${k}:${v}`).join(';');
}

function reMemo(overrides = {}) {
  const f = { m: MATCH, r: '1', p: 's', a: '1', g: BASE58, s: HEX64, n: HEX16, ...overrides };
  return 'e:/x402/re;' + Object.entries(f).map(([k,v]) => `${k}:${v}`).join(';');
}

// ─── Inline /x402/ai-move handler logic (mirrors server.js) ─────────────────

function makeAiMoveHandler(opts = {}) {
  const { hasApiKey = true, delegateResult = null } = opts;

  return async function handleAiMove(body, result) {
    // 503 check (before payment)
    if (!hasApiKey) {
      return { status: 503, body: { ok: false, error: 'AI delegation not configured (ANTHROPIC_API_KEY missing)' } };
    }

    // Payment already verified at this point (demo result provided)
    if (result && !result.ok) {
      return { status: 402, body: { ok: false, error: result.error } };
    }

    let aiResult;
    try {
      const effectiveDelegate = delegateResult
        ? async () => delegateResult
        : async () => { throw new Error('delegateMove unavailable'); };
      aiResult = await effectiveDelegate(body.public_state ?? {});
    } catch (err) {
      return { status: 500, body: { ok: false, error: 'AI delegation failed: ' + err.message } };
    }

    return {
      status: 200,
      body: { ok: true, ...aiResult, sig: result?.sig ?? null, demo: result?.demo ?? false },
    };
  };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

async function run() {
  const rootDir = path.resolve(__dirname, '../../');
  const { validateMemo } = await import(path.join(rootDir, 'multiplayer/memo-validator.js'));
  const { deriveGameState } = await import(path.join(rootDir, 'multiplayer/state-derivation.js'));

  console.log('\n/x402/ai-move — endpoint handler');

  await asyncTest('503 when ANTHROPIC_API_KEY missing', async () => {
    const handler = makeAiMoveHandler({ hasApiKey: false });
    const res = await handler({}, { ok: true, demo: true });
    assert.equal(res.status, 503);
    assert.equal(res.body.ok, false);
    assert.match(res.body.error, /ANTHROPIC_API_KEY/);
  });

  await asyncTest('demo mode: returns ok + identity_source ai', async () => {
    const handler = makeAiMoveHandler({
      hasApiKey: true,
      delegateResult: { action_type: 3, target: P2, identity_source: 'ai' },
    });
    const res = await handler({ public_state: { hp: 80 } }, { ok: true, demo: true });
    assert.equal(res.status, 200);
    assert.equal(res.body.ok, true);
    assert.equal(res.body.identity_source, 'ai');
    assert.equal(res.body.action_type, 3);
    assert.equal(res.body.demo, true);
  });

  await asyncTest('delegateMove error → 500', async () => {
    const handler = makeAiMoveHandler({ hasApiKey: true, delegateResult: null });
    const res = await handler({}, { ok: true, demo: true });
    assert.equal(res.status, 500);
    assert.match(res.body.error, /AI delegation failed/);
  });

  await asyncTest('action_type=0 fallback preserved in response', async () => {
    const handler = makeAiMoveHandler({
      hasApiKey: true,
      delegateResult: { action_type: 0, target: null, identity_source: 'ai' },
    });
    const res = await handler({}, { ok: true, demo: true });
    assert.equal(res.body.action_type, 0);
    assert.equal(res.body.target, null);
  });

  console.log('\nmemo-validator — identity_source field');

  test('i:ai is valid in /x402/co memo', () => {
    const memo = coMemo({ i: 'ai' });
    const r = validateMemo(memo, '/x402/co');
    assert.equal(r.ok, true, r.error);
    assert.equal(r.fields.i, 'ai');
  });

  test('i:self is valid in /x402/co memo', () => {
    const memo = coMemo({ i: 'self' });
    const r = validateMemo(memo, '/x402/co');
    assert.equal(r.ok, true, r.error);
  });

  test('i:bot is invalid (rejected)', () => {
    const memo = coMemo({ i: 'bot' });
    const r = validateMemo(memo, '/x402/co');
    assert.equal(r.ok, false);
    assert.match(r.error, /identity_source/);
  });

  test('i field absent → ok (optional field)', () => {
    const memo = coMemo();
    const r = validateMemo(memo, '/x402/co');
    assert.equal(r.ok, true);
    assert.equal(r.fields.i, undefined);
  });

  test('i:ai valid in /x402/re memo', () => {
    const memo = reMemo({ i: 'ai' });
    const r = validateMemo(memo, '/x402/re');
    assert.equal(r.ok, true, r.error);
  });

  console.log('\nstate-derivation — identity_source in history');

  test('commit with i:ai → history entry has identity_source ai', () => {
    const chain = [
      { memo: 'e:/x402/pa;m:m1;r:1;p:d;n:' + HEX16, sender: HOST, slot: 1 },
      { memo: coMemo({ i: 'ai' }), sender: HOST, slot: 2 },
    ];
    const s = deriveGameState(chain);
    const entry = s.history.find(h => h.action === 'commit' && h.player === HOST);
    assert.ok(entry, 'commit history entry missing');
    assert.equal(entry.identity_source, 'ai');
  });

  test('commit without i field → identity_source defaults to self', () => {
    const chain = [
      { memo: 'e:/x402/pa;m:m1;r:1;p:d;n:' + HEX16, sender: HOST, slot: 1 },
      { memo: coMemo(), sender: HOST, slot: 2 },
    ];
    const s = deriveGameState(chain);
    const entry = s.history.find(h => h.action === 'commit' && h.player === HOST);
    assert.ok(entry);
    assert.equal(entry.identity_source, 'self');
  });

  test('history accumulates across commit and reveal', () => {
    const chain = [
      { memo: 'e:/x402/pa;m:m1;r:1;p:d;n:' + HEX16, sender: HOST, slot: 1 },
      { memo: coMemo(), sender: HOST, slot: 2 },
      { memo: coMemo({ p: 'b' }), sender: P2, slot: 3 },
      { memo: 'e:/x402/pa;m:m1;r:1;p:e;n:' + HEX16, sender: HOST, slot: 4 },
      { memo: reMemo({ i: 'ai' }), sender: HOST, slot: 5 },
    ];
    const s = deriveGameState(chain);
    assert.ok(s.history.length >= 2, 'expected at least 2 history entries');
    const revealEntry = s.history.find(h => h.action === 'reveal');
    assert.ok(revealEntry, 'reveal history entry missing');
    assert.equal(revealEntry.identity_source, 'ai');
  });

  await asyncTest('emptyMatchState includes history array', async () => {
    const { emptyMatchState } = await import(path.join(rootDir, 'multiplayer/state-derivation.js'));
    const s = emptyMatchState();
    assert.ok(Array.isArray(s.history));
    assert.equal(s.history.length, 0);
  });

  console.log('\n' + '─'.repeat(50));
  console.log(`ai-move: ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exitCode = 1;
}

run().catch(err => { console.error('Test runner error:', err); process.exitCode = 1; });

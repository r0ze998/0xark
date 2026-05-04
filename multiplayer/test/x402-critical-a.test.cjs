'use strict';
/**
 * x402-critical-a.test.cjs — Phase A security fixes unit tests
 *
 * Covers:
 *   C4 — local-dev-bypass blocked outside development (server-side)
 *   C2 — client-side EXPECTED_PRICES / _validateExpectedPrice
 *   C5 — unified memo format "endpoint=<path>;nonce=<uuid>;v=1" accepted by validator
 *   H4 — _requireTreasuryAddress rejects System Program fallback
 *
 * Run: node multiplayer/test/x402-critical-a.test.cjs
 */

const assert = require('node:assert/strict');
const path   = require('node:path');

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

// ── Inline ports of the security helpers (extracted from 02-x402.js) ──────────
// These mirror the real implementations so tests run in Node without a browser.

const EXPECTED_PRICES = Object.freeze({
  '/x402/match-battle':             1_000_000,
  '/x402/peek-vault-size':            500_000,
  '/x402/peek-vault-content':       5_000_000,
  '/x402/draw-extra':              10_000_000,
  '/x402/ai-strategy-advice':       3_000_000,
  '/x402/ai-move':                  5_000_000,
  '/x402/co': 100_000, '/x402/re': 100_000, '/x402/hc': 100_000,
  '/x402/hr': 100_000, '/x402/pa': 100_000, '/x402/rs': 100_000,
  '/x402/me': 100_000,
  '/x402/extra-action':            10_000_000,
  '/x402/scout-peek':               5_000_000,
  '/x402/counter-peek':             3_000_000,
});

function _validateExpectedPrice(endpoint, declaredLamports) {
  const expected = EXPECTED_PRICES[endpoint];
  if (expected === undefined) return;
  if (declaredLamports < expected) {
    throw new Error(`Payment price mismatch for ${endpoint}: expected >=${expected} lamports, server declared ${declaredLamports}`);
  }
  if (declaredLamports > expected * 1.01) {
    throw new Error(`Payment price excessive for ${endpoint}: expected ${expected} lamports, server declared ${declaredLamports}`);
  }
}

const SYSTEM_PROGRAM = '11111111111111111111111111111111';
function _requireTreasuryAddress(addr, source) {
  if (!addr || addr === SYSTEM_PROGRAM) {
    throw new Error(`Treasury address missing or unsafe (${source}): refusing payment to System Program`);
  }
  return addr;
}

function _sanitizeMemoEndpoint(p) {
  const s = p.replace(/[^a-zA-Z0-9/_-]/g, '');
  if (s !== p) throw new Error(`Invalid endpoint path: ${p}`);
  return s;
}

function _buildMemoStr(endpoint, nonce) {
  const safeEndpoint = _sanitizeMemoEndpoint(endpoint);
  if (!nonce || nonce.length < 8) throw new Error(`Invalid nonce for memo: too short`);
  return `endpoint=${safeEndpoint};nonce=${nonce};v=1`;
}

// ── Load memo-validator (ESM → dynamic import workaround) ─────────────────────

let validateMemo;

async function loadValidator() {
  const mod = await import('../memo-validator.js');
  validateMemo = mod.validateMemo;
}

// ── C4 tests: local-dev-bypass ────────────────────────────────────────────────

async function runC4Tests() {
  console.log('\nC4 — local-dev-bypass production block');

  // Inline the C4 guard logic (extracted from server.js _verifyX402Payment)
  function verifyDevBypass(sigHint, nodeEnv) {
    if (sigHint === 'local-dev-bypass') {
      if (nodeEnv !== 'development') return { ok: false, error: 'dev-bypass denied outside development environment' };
      return { ok: true, demo: true };
    }
    return null; // not a dev-bypass sig
  }

  test('C4 — bypass denied when NODE_ENV is production', () => {
    const result = verifyDevBypass('local-dev-bypass', 'production');
    assert.strictEqual(result.ok, false);
    assert.ok(result.error.includes('denied'));
  });

  test('C4 — bypass denied when NODE_ENV is undefined (default)', () => {
    const result = verifyDevBypass('local-dev-bypass', undefined);
    assert.strictEqual(result.ok, false);
  });

  test('C4 — bypass denied when NODE_ENV is test', () => {
    const result = verifyDevBypass('local-dev-bypass', 'test');
    assert.strictEqual(result.ok, false);
  });

  test('C4 — bypass accepted when NODE_ENV is development', () => {
    const result = verifyDevBypass('local-dev-bypass', 'development');
    assert.strictEqual(result.ok, true);
    assert.strictEqual(result.demo, true);
  });

  test('C4 — normal signature not treated as bypass', () => {
    const result = verifyDevBypass('5WoVAmNCB8tt...realSig', 'production');
    assert.strictEqual(result, null); // passes through to normal verification
  });
}

// ── C2 tests: expected price validation ───────────────────────────────────────

async function runC2Tests() {
  console.log('\nC2 — client-side price floor validation');

  test('C2 — exact expected price passes', () => {
    assert.doesNotThrow(() => _validateExpectedPrice('/x402/match-battle', 1_000_000));
  });

  test('C2 — 1% overage passes (within tolerance)', () => {
    assert.doesNotThrow(() => _validateExpectedPrice('/x402/match-battle', 1_009_999));
  });

  test('C2 — below expected price throws', () => {
    assert.throws(
      () => _validateExpectedPrice('/x402/match-battle', 999_999),
      /price mismatch/
    );
  });

  test('C2 — server declares 1 lamport → throws', () => {
    assert.throws(
      () => _validateExpectedPrice('/x402/peek-vault-content', 1),
      /price mismatch/
    );
  });

  test('C2 — excessive price (>1%) throws', () => {
    assert.throws(
      () => _validateExpectedPrice('/x402/match-battle', 1_100_000),
      /excessive/
    );
  });

  test('C2 — unknown endpoint is allowed (no entry in map)', () => {
    assert.doesNotThrow(() => _validateExpectedPrice('/x402/unknown-future-endpoint', 999));
  });

  test('C2 — all known move endpoints accept 100_000 lamports', () => {
    for (const ep of ['/x402/co', '/x402/re', '/x402/hc', '/x402/hr', '/x402/pa', '/x402/rs', '/x402/me']) {
      assert.doesNotThrow(() => _validateExpectedPrice(ep, 100_000), `${ep} should pass at 100_000`);
    }
  });
}

// ── C5 tests: unified memo format ─────────────────────────────────────────────

async function runC5Tests() {
  console.log('\nC5 — unified memo format v=1');

  test('C5 — _buildMemoStr produces v=1 format', () => {
    const memo = _buildMemoStr('/x402/match-battle', 'a1b2c3d4e5f6g7h8');
    assert.ok(memo.startsWith('endpoint=/x402/match-battle;'), `unexpected: ${memo}`);
    assert.ok(memo.includes(';v=1'), `missing v=1: ${memo}`);
  });

  test('C5 — _buildMemoStr rejects semicolon injection in endpoint', () => {
    assert.throws(() => _buildMemoStr('/x402/match;inject=bad', 'abcdefgh'), /Invalid endpoint/);
  });

  test('C5 — _buildMemoStr rejects short nonce', () => {
    assert.throws(() => _buildMemoStr('/x402/match-battle', 'short'), /too short/);
  });

  test('C5 — validateMemo accepts new v=1 format', async () => {
    const memo = 'endpoint=/x402/match-battle;nonce=abcdef1234567890;v=1';
    const result = validateMemo(memo, '/x402/match-battle');
    assert.strictEqual(result.ok, true);
  });

  test('C5 — validateMemo rejects v=1 format with wrong endpoint', async () => {
    const memo = 'endpoint=/x402/other;nonce=abcdef1234567890;v=1';
    const result = validateMemo(memo, '/x402/match-battle');
    assert.strictEqual(result.ok, false);
    assert.ok(result.error.includes('mismatch'));
  });

  test('C5 — validateMemo still accepts legacy verbose format (backward compat)', async () => {
    const memo = 'endpoint:/x402/match-battle;nonce:abcdef12';
    const result = validateMemo(memo, '/x402/match-battle');
    assert.strictEqual(result.ok, true);
  });

  test('C5 — validateMemo still accepts legacy compact format (backward compat)', async () => {
    const memo = 'e:/x402/co;m:match1;r:1;p:s;h:' + 'a'.repeat(64) + ';n:' + 'b'.repeat(16);
    const result = validateMemo(memo, '/x402/co');
    assert.strictEqual(result.ok, true);
  });

  test('C5 — validateMemo rejects unknown format', async () => {
    const result = validateMemo('unknown:format', '/x402/co');
    assert.strictEqual(result.ok, false);
  });
}

// ── H4 tests: no System Program fallback ─────────────────────────────────────

async function runH4Tests() {
  console.log('\nH4 — refuse System Program address (burn address)');

  test('H4 — _requireTreasuryAddress rejects System Program', () => {
    assert.throws(
      () => _requireTreasuryAddress('11111111111111111111111111111111', 'payTo'),
      /System Program/
    );
  });

  test('H4 — _requireTreasuryAddress rejects null/undefined', () => {
    assert.throws(() => _requireTreasuryAddress(null, 'payTo'), /System Program/);
    assert.throws(() => _requireTreasuryAddress(undefined, 'payTo'), /System Program/);
    assert.throws(() => _requireTreasuryAddress('', 'payTo'), /System Program/);
  });

  test('H4 — _requireTreasuryAddress accepts valid pubkey', () => {
    const addr = 'DPMPhnVezSq5im35p4w3bC6XjpNZuuvCDVSAVxw4Q28R';
    assert.strictEqual(_requireTreasuryAddress(addr, 'payTo'), addr);
  });

  test('H4 — _requireTreasuryAddress returns the address on success', () => {
    const addr = 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA';
    assert.strictEqual(_requireTreasuryAddress(addr, 'split.ops'), addr);
  });
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log('=== x402 Critical Phase A — Security Fix Tests ===');

  await loadValidator();

  await runC4Tests();
  await runC2Tests();
  await runC5Tests();
  await runH4Tests();

  console.log('\n──────────────────────────────────────────────────');
  console.log(`x402-critical-a: ${passed} passed, ${failed} failed`);

  process.exit(failed > 0 ? 1 : 0);
}

main().catch(e => { console.error('FATAL:', e); process.exit(1); });

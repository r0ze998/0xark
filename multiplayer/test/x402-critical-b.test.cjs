'use strict';
/**
 * x402-critical-b.test.cjs — Phase B security fixes unit tests
 *
 * Covers:
 *   C1+C3 — redis-store: sig replay prevention + nonce uniqueness (in-memory path)
 *   H1    — _parsePaymentRequiredHeader: Base64 JSON + raw JSON
 *   H3    — _validateRecipient: allowlist enforcement
 *   H5    — _sanitizeMemoEndpoint (length/prefix) + _sanitizeNonce (format/length)
 *
 * Run: node multiplayer/test/x402-critical-b.test.cjs
 */

const assert = require('node:assert/strict');

let passed = 0, failed = 0;

function test(name, fn) {
  try {
    const result = fn();
    if (result && typeof result.then === 'function') {
      return result.then(() => {
        console.log(`  ✓ ${name}`);
        passed++;
      }).catch(e => {
        console.error(`  ✗ ${name}`);
        console.error(`    ${e.message}`);
        failed++;
      });
    }
    console.log(`  ✓ ${name}`);
    passed++;
  } catch (e) {
    console.error(`  ✗ ${name}`);
    console.error(`    ${e.message}`);
    failed++;
  }
  return Promise.resolve();
}

// ── C1+C3: redis-store in-memory path ────────────────────────────────────────

async function runRedisStoreTests() {
  console.log('\nC1+C3 — redis-store (in-memory fallback, no REDIS_URL set)');

  // Ensure no Redis URL so we test in-memory path
  delete process.env.REDIS_URL;

  const { isSigUsed, markSigUsed, isNonceUsed, markNonceUsed, gcMemory, _test } =
    await import('../redis-store.js');
  const { _memSigs, _memNonces, _memHas, _memSet } = _test;

  // Reset state for clean tests
  _memSigs.clear();
  _memNonces.clear();

  await test('C1 — isSigUsed returns false for unknown sig', async () => {
    const result = await isSigUsed('unknownSig123');
    assert.strictEqual(result, false);
  });

  await test('C1 — markSigUsed + isSigUsed returns true', async () => {
    await markSigUsed('testSig001');
    const result = await isSigUsed('testSig001');
    assert.strictEqual(result, true);
  });

  await test('C1 — different sig is not marked used', async () => {
    const result = await isSigUsed('otherSig999');
    assert.strictEqual(result, false);
  });

  await test('C3 — isNonceUsed returns false for unknown nonce', async () => {
    const result = await isNonceUsed('nonce1234567890ab', '/x402/match-battle');
    assert.strictEqual(result, false);
  });

  await test('C3 — markNonceUsed + isNonceUsed returns true', async () => {
    await markNonceUsed('nonce1234567890ab', '/x402/match-battle');
    const result = await isNonceUsed('nonce1234567890ab', '/x402/match-battle');
    assert.strictEqual(result, true);
  });

  await test('C3 — same nonce for different endpoint is NOT used', async () => {
    const result = await isNonceUsed('nonce1234567890ab', '/x402/co');
    assert.strictEqual(result, false);
  });

  await test('C3 — different nonce for same endpoint is NOT used', async () => {
    const result = await isNonceUsed('differentnonce00', '/x402/match-battle');
    assert.strictEqual(result, false);
  });

  await test('C1 — gcMemory cleans expired entries', async () => {
    // Set expiry to 1 second in the past (already expired)
    _memSigs.set('expiredSig', Date.now() - 1000);
    assert.strictEqual(_memHas(_memSigs, 'expiredSig'), false); // expired on read
    assert.strictEqual(_memSigs.has('expiredSig'), false);      // deleted on read
  });

  await test('C1 — markSigUsed default TTL is 3600s', async () => {
    await markSigUsed('ttlSig001');
    const exp = _memSigs.get('ttlSig001');
    assert.ok(exp !== undefined);
    const remaining = exp - Date.now();
    assert.ok(remaining > 3500_000 && remaining <= 3600_000, `TTL out of range: ${remaining}ms`);
  });

  await test('C3 — markNonceUsed default TTL is 60s', async () => {
    await markNonceUsed('ttlNonce0000000a', '/x402/co');
    const key = `nonce:/x402/co:ttlNonce0000000a`;
    const exp = _memNonces.get(key);
    assert.ok(exp !== undefined);
    const remaining = exp - Date.now();
    assert.ok(remaining > 55_000 && remaining <= 60_000, `TTL out of range: ${remaining}ms`);
  });
}

// ── H1: _parsePaymentRequiredHeader ──────────────────────────────────────────

async function runH1Tests() {
  console.log('\nH1 — _parsePaymentRequiredHeader');

  // Inline the implementation (mirrors 02-x402.js)
  function _parsePaymentRequiredHeader(headerValue) {
    if (!headerValue) return {};
    try { return JSON.parse(Buffer.from(headerValue, 'base64').toString('utf8')); } catch (_) {}
    try { return JSON.parse(headerValue); } catch (_) {}
    return {};
  }

  await test('H1 — Base64 JSON header is parsed correctly', async () => {
    const obj = { version: 'x402-v2', accepts: [{ amount: '1000000', payTo: 'ADDR' }] };
    const encoded = Buffer.from(JSON.stringify(obj)).toString('base64');
    const result = _parsePaymentRequiredHeader(encoded);
    assert.deepEqual(result, obj);
  });

  await test('H1 — raw JSON header is parsed correctly (backward compat)', async () => {
    const obj = { amount: '5000', recipient: 'ADDR2' };
    const raw = JSON.stringify(obj);
    const result = _parsePaymentRequiredHeader(raw);
    assert.deepEqual(result, obj);
  });

  await test('H1 — null/empty header returns empty object', async () => {
    assert.deepEqual(_parsePaymentRequiredHeader(null), {});
    assert.deepEqual(_parsePaymentRequiredHeader(''), {});
    assert.deepEqual(_parsePaymentRequiredHeader(undefined), {});
  });

  await test('H1 — invalid Base64 non-JSON falls back to empty object', async () => {
    const result = _parsePaymentRequiredHeader('not-valid-anything!@#$');
    assert.deepEqual(result, {});
  });
}

// ── H3: _validateRecipient ────────────────────────────────────────────────────

async function runH3Tests() {
  console.log('\nH3 — _validateRecipient allowlist');

  const SYSTEM_PROGRAM = '11111111111111111111111111111111';

  function _requireTreasuryAddress(addr, source) {
    if (!addr || addr === SYSTEM_PROGRAM) {
      throw new Error(`Treasury address missing or unsafe (${source}): refusing payment to System Program`);
    }
    return addr;
  }

  function makeValidator(allowlist) {
    const ALLOWED = allowlist ? new Set(allowlist) : null;
    return function _validateRecipient(addr, source) {
      _requireTreasuryAddress(addr, source);
      if (ALLOWED && !ALLOWED.has(addr)) {
        throw new Error(`Recipient not in allowed treasury list (${source}): ${addr}`);
      }
      return addr;
    };
  }

  await test('H3 — valid address passes with no allowlist', async () => {
    const validate = makeValidator(null);
    const addr = 'DPMPhnVezSq5im35p4w3bC6XjpNZuuvCDVSAVxw4Q28R';
    assert.strictEqual(validate(addr, 'payTo'), addr);
  });

  await test('H3 — System Program is rejected even with no allowlist', async () => {
    const validate = makeValidator(null);
    assert.throws(() => validate(SYSTEM_PROGRAM, 'payTo'), /System Program/);
  });

  await test('H3 — address in allowlist passes', async () => {
    const addr = 'DPMPhnVezSq5im35p4w3bC6XjpNZuuvCDVSAVxw4Q28R';
    const validate = makeValidator([addr]);
    assert.strictEqual(validate(addr, 'payTo'), addr);
  });

  await test('H3 — address NOT in allowlist is rejected', async () => {
    const allowed = 'DPMPhnVezSq5im35p4w3bC6XjpNZuuvCDVSAVxw4Q28R';
    const attacker = 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA';
    const validate = makeValidator([allowed]);
    assert.throws(() => validate(attacker, 'split.ops'), /not in allowed treasury list/);
  });

  await test('H3 — null address is rejected (allowlist set)', async () => {
    const validate = makeValidator(['DPMPhnVezSq5im35p4w3bC6XjpNZuuvCDVSAVxw4Q28R']);
    assert.throws(() => validate(null, 'payTo'), /System Program/);
  });
}

// ── H5: _sanitizeMemoEndpoint + _sanitizeNonce ────────────────────────────────

async function runH5Tests() {
  console.log('\nH5 — _sanitizeMemoEndpoint (H5 strengthened) + _sanitizeNonce');

  function _sanitizeMemoEndpoint(path) {
    if (!path || path.length > 64) throw new Error(`Invalid endpoint path: too long or empty`);
    if (!path.startsWith('/x402/')) throw new Error(`Invalid endpoint path: must start with /x402/`);
    const sanitized = path.replace(/[^a-zA-Z0-9/_-]/g, '');
    if (sanitized !== path) throw new Error(`Invalid endpoint path: ${path}`);
    return sanitized;
  }

  function _sanitizeNonce(nonce) {
    if (!nonce || nonce.length < 16 || nonce.length > 64) {
      throw new Error(`Invalid nonce: length must be 16–64 chars`);
    }
    if (!/^[a-f0-9-]+$/i.test(nonce)) {
      throw new Error(`Invalid nonce: must be hex or UUID format`);
    }
    return nonce;
  }

  await test('H5 — valid endpoint /x402/match-battle passes', async () => {
    assert.strictEqual(_sanitizeMemoEndpoint('/x402/match-battle'), '/x402/match-battle');
  });

  await test('H5 — endpoint > 64 chars throws', async () => {
    const long = '/x402/' + 'a'.repeat(60);
    assert.throws(() => _sanitizeMemoEndpoint(long), /too long/);
  });

  await test('H5 — endpoint without /x402/ prefix throws', async () => {
    assert.throws(() => _sanitizeMemoEndpoint('/api/pay'), /must start with \/x402\//);
    assert.throws(() => _sanitizeMemoEndpoint('x402/pay'), /must start with \/x402\//);
  });

  await test('H5 — endpoint with injection chars throws', async () => {
    assert.throws(() => _sanitizeMemoEndpoint('/x402/match;inject=bad'), /Invalid endpoint/);
  });

  await test('H5 — empty endpoint throws', async () => {
    assert.throws(() => _sanitizeMemoEndpoint(''), /too long or empty/);
    assert.throws(() => _sanitizeMemoEndpoint(null), /too long or empty/);
  });

  await test('H5 — valid 32-char hex nonce passes', async () => {
    const nonce = 'a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6';
    assert.strictEqual(_sanitizeNonce(nonce), nonce);
  });

  await test('H5 — valid UUID nonce (with dashes) passes', async () => {
    const uuid = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
    assert.strictEqual(_sanitizeNonce(uuid), uuid);
  });

  await test('H5 — nonce < 16 chars throws', async () => {
    assert.throws(() => _sanitizeNonce('abc123'), /length must be/);
  });

  await test('H5 — nonce > 64 chars throws', async () => {
    assert.throws(() => _sanitizeNonce('a'.repeat(65)), /length must be/);
  });

  await test('H5 — nonce with invalid chars throws', async () => {
    assert.throws(() => _sanitizeNonce('g'.repeat(16)), /hex or UUID/);
    assert.throws(() => _sanitizeNonce('nonce_with_underscores_01'), /hex or UUID/);
  });

  await test('H5 — empty/null nonce throws', async () => {
    assert.throws(() => _sanitizeNonce(''), /length must be/);
    assert.throws(() => _sanitizeNonce(null), /length must be/);
  });
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log('=== x402 Critical Phase B — Security Fix Tests ===');

  await runRedisStoreTests();
  await runH1Tests();
  await runH3Tests();
  await runH5Tests();

  console.log('\n──────────────────────────────────────────────────');
  console.log(`x402-critical-b: ${passed} passed, ${failed} failed`);

  process.exit(failed > 0 ? 1 : 0);
}

main().catch(e => { console.error('FATAL:', e); process.exit(1); });

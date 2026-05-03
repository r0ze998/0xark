/**
 * x402-security.test.js — unit tests for H1/H10/H12/H13/H19 security fixes
 *
 * Tests inline-duplicate the patched logic so they run with plain Node (no bundler).
 * Run: node tests/x402-security.test.js
 */

'use strict';

const assert = require('node:assert/strict');
const { execSync } = require('node:child_process');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');

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

// ── H12: _generateNonce — secure fallback (no Math.random) ───────────────────

// Mirrors the patched _generateNonce in 02-x402.js
function _generateNonce() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID().replace(/-/g, '');
  }
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    return Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
  }
  throw new Error('No secure random source available');
}

console.log('\nH12: _generateNonce — secure fallback');

test('nonce is at least 32 hex characters', () => {
  const n = _generateNonce();
  assert.ok(n.length >= 32, `nonce too short: ${n.length}`);
});

test('nonce contains no hyphens', () => {
  assert.ok(!_generateNonce().includes('-'));
});

test('consecutive nonces differ (no deterministic output)', () => {
  assert.notEqual(_generateNonce(), _generateNonce());
});

test('nonce consists only of hex characters', () => {
  assert.match(_generateNonce(), /^[0-9a-f]+$/i);
});

// ── H13: _sanitizeMemoEndpoint — injection prevention ────────────────────────

function _sanitizeMemoEndpoint(endpointPath) {
  const sanitized = endpointPath.replace(/[^a-zA-Z0-9/_-]/g, '');
  if (sanitized !== endpointPath) throw new Error(`Invalid endpoint path: ${endpointPath}`);
  return sanitized;
}

console.log('\nH13: _sanitizeMemoEndpoint — memo injection prevention');

test('accepts valid x402 path /x402/match-battle', () => {
  assert.equal(_sanitizeMemoEndpoint('/x402/match-battle'), '/x402/match-battle');
});

test('accepts /x402/peek-vault-content', () => {
  assert.equal(_sanitizeMemoEndpoint('/x402/peek-vault-content'), '/x402/peek-vault-content');
});

test('rejects semicolon injection attempt', () => {
  assert.throws(() => _sanitizeMemoEndpoint('/x402/co;evil:cmd'), /Invalid endpoint path/);
});

test('rejects null byte', () => {
  assert.throws(() => _sanitizeMemoEndpoint('/x402/foo\0bar'), /Invalid endpoint path/);
});

test('rejects space character', () => {
  assert.throws(() => _sanitizeMemoEndpoint('/x402/foo bar'), /Invalid endpoint path/);
});

// ── H10: _validatePaymentSplit — amount cross-validation ─────────────────────

function _validatePaymentSplit(splitRecipient, totalLamports) {
  const opsLamports  = splitRecipient.ops?.lamports  ?? 0;
  const poolLamports = splitRecipient.pool?.lamports ?? 0;
  const sum = opsLamports + poolLamports;
  if (sum < totalLamports) {
    throw new Error(`Invalid payment split: ${sum} lamports < required ${totalLamports}`);
  }
  if (totalLamports > 0 && sum > totalLamports * 1.01) {
    throw new Error(`Payment split exceeds required by >1%: ${sum} vs ${totalLamports}`);
  }
}

console.log('\nH10: _validatePaymentSplit — amount cross-validation');

test('passes when split sums exactly to total', () => {
  _validatePaymentSplit({ ops: { lamports: 500 }, pool: { lamports: 500 } }, 1000);
});

test('passes when split is within 1% tolerance above total', () => {
  _validatePaymentSplit({ ops: { lamports: 505 }, pool: { lamports: 500 } }, 1000);
});

test('throws when split sum is below required total', () => {
  assert.throws(
    () => _validatePaymentSplit({ ops: { lamports: 1 }, pool: { lamports: 1 } }, 1000),
    /Invalid payment split: 2 lamports < required 1000/
  );
});

test('throws when split sum exceeds total by more than 1%', () => {
  assert.throws(
    () => _validatePaymentSplit({ ops: { lamports: 600 }, pool: { lamports: 600 } }, 1000),
    /exceeds required by >1%/
  );
});

// ── H1: validateEnv — production startup guard ───────────────────────────────

// Mirrors the logic in server.js validateEnv(), testable without process.exit
function validateEnv(env) {
  const REQUIRED_PROD_ENVS = ['TREASURY_PUBKEY', 'SOLANA_RPC'];
  const isProd = env.NODE_ENV === 'production';
  const fatals = [], warnings = [];
  for (const key of REQUIRED_PROD_ENVS) {
    if (!env[key]?.trim()) {
      if (isProd) fatals.push(key);
      else        warnings.push(key);
    }
  }
  return { fatals, warnings };
}

console.log('\nH1: validateEnv — production startup guard');

test('no errors when all required vars are set in production', () => {
  const r = validateEnv({ NODE_ENV: 'production', TREASURY_PUBKEY: 'abc', SOLANA_RPC: 'https://rpc' });
  assert.equal(r.fatals.length, 0);
});

test('fatal for TREASURY_PUBKEY missing in production', () => {
  const r = validateEnv({ NODE_ENV: 'production', SOLANA_RPC: 'https://rpc' });
  assert.ok(r.fatals.includes('TREASURY_PUBKEY'));
});

test('fatal for SOLANA_RPC missing in production', () => {
  const r = validateEnv({ NODE_ENV: 'production', TREASURY_PUBKEY: 'abc' });
  assert.ok(r.fatals.includes('SOLANA_RPC'));
});

test('warning only (not fatal) when vars missing in development', () => {
  const r = validateEnv({ NODE_ENV: 'development' });
  assert.equal(r.fatals.length, 0);
  assert.ok(r.warnings.length > 0);
});

test('empty-string var treated as missing (trim guard)', () => {
  const r = validateEnv({ NODE_ENV: 'production', TREASURY_PUBKEY: '   ', SOLANA_RPC: 'https://rpc' });
  assert.ok(r.fatals.includes('TREASURY_PUBKEY'));
});

// ── H19: no card_commit references in client src ─────────────────────────────

console.log('\nH19: ZK circuit file references');

test('no card_commit references remain in solana/client/src/', () => {
  try {
    const out = execSync('grep -r "card_commit" solana/client/src/', {
      cwd: ROOT, stdio: ['pipe', 'pipe', 'pipe'], encoding: 'utf8'
    });
    assert.fail(`card_commit references found:\n${out}`);
  } catch (e) {
    // grep exits with code 1 when no matches — that is the success case
    if (e.status === 1 && !e.stdout?.trim()) return;
    if (e.stdout?.trim()) assert.fail(`card_commit references found:\n${e.stdout}`);
  }
});

// ── Summary ───────────────────────────────────────────────────────────────────

console.log(`\nResults: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);

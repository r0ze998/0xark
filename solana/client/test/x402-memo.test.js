/**
 * x402-memo.test.js — unit tests for solana/client/src/lib/x402-memo.js
 *
 * Inline logic mirrors the helper so tests run without a live Solana node.
 * Run: node solana/client/test/x402-memo.test.js
 */

'use strict';

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

// ── Inline logic (mirrors x402-memo.js) ──────────────────────────────────────

const SPL_MEMO_V2 = 'MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr';

function generateNonce() {
  const uuid = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`;
  return uuid.replace(/-/g, '');
}

function formatMemo(endpoint, nonce) {
  return `endpoint:${endpoint};nonce:${nonce}`;
}

function buildMemoIx({ solanaWeb3, endpoint, nonce }) {
  const { TransactionInstruction, PublicKey } = solanaWeb3;
  const memoStr = formatMemo(endpoint, nonce);
  const data = typeof TextEncoder !== 'undefined'
    ? new TextEncoder().encode(memoStr)
    : Buffer.from(memoStr, 'utf8');
  return new TransactionInstruction({ programId: new PublicKey(SPL_MEMO_V2), keys: [], data });
}

// Minimal mock for TransactionInstruction / PublicKey (no real Solana SDK needed)
const mockSolanaWeb3 = {
  TransactionInstruction: class {
    constructor({ programId, keys, data }) {
      this.programId = programId;
      this.keys = keys;
      this.data = data;
    }
  },
  PublicKey: class {
    constructor(str) { this._str = str; }
    toBase58() { return this._str; }
  },
};

// ── Tests ─────────────────────────────────────────────────────────────────────

console.log('\nx402-memo.js (browser/client helper)');

test('generateNonce returns at least 8 chars', () => {
  assert.ok(generateNonce().length >= 8);
});

test('generateNonce contains no hyphens', () => {
  assert.ok(!generateNonce().includes('-'));
});

test('formatMemo matches server validateMemo regex pattern', () => {
  const memo = formatMemo('/x402/scout-peek', 'abc12345');
  assert.match(memo, /^endpoint:([^;]+);nonce:(.+)$/);
});

test('formatMemo produces the exact expected string', () => {
  assert.equal(formatMemo('/x402/scout-peek', 'abc12345'), 'endpoint:/x402/scout-peek;nonce:abc12345');
});

test('buildMemoIx uses SPL Memo v2 programId', () => {
  const ix = buildMemoIx({ solanaWeb3: mockSolanaWeb3, endpoint: '/x402/scout-peek', nonce: 'a1b2c3d4' });
  assert.equal(ix.programId.toBase58(), SPL_MEMO_V2);
});

test('buildMemoIx data decodes to correct memo string', () => {
  const ix = buildMemoIx({ solanaWeb3: mockSolanaWeb3, endpoint: '/x402/scout-peek', nonce: 'a1b2c3d4' });
  assert.equal(Buffer.from(ix.data).toString('utf8'), 'endpoint:/x402/scout-peek;nonce:a1b2c3d4');
});

test('buildMemoIx has no account keys (SPL Memo needs none)', () => {
  const ix = buildMemoIx({ solanaWeb3: mockSolanaWeb3, endpoint: '/x402/scout-peek', nonce: 'x9y8z7w6' });
  assert.equal(ix.keys.length, 0);
});

console.log(`\nResults: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);

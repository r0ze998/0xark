/**
 * x402-memo.test.js — unit tests for solana/client/src/lib/x402-memo.js
 *
 * Execute the real browser helper with a minimal SDK fixture; no Solana node.
 * Run: node solana/client/test/x402-memo.test.js
 */

import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { webcrypto } from 'node:crypto';

const source = readFileSync(new URL('../src/lib/x402-memo.js', import.meta.url), 'utf8');
const browser = { window: {}, TextEncoder, Buffer, crypto: webcrypto };
runInNewContext(source, browser, { filename: 'x402-memo.js' });
const { generateNonce, formatMemo, buildMemoIx } = browser.window.x402Memo;
const SPL_MEMO_V2 = 'MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr';

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

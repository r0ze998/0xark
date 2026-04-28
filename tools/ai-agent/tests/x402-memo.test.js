#!/usr/bin/env node
/**
 * x402-memo.test.js — unit tests for tools/ai-agent/src/x402-memo.js
 *
 * Inline logic mirrors the helper; no live Solana node required.
 * Run: node tools/ai-agent/tests/x402-memo.test.js
 */

let passed = 0, failed = 0;
function assert(label, cond, detail = '') {
  if (cond) { console.log(`  PASS ${label}`); passed++; }
  else { console.error(`  FAIL ${label}${detail ? ' — ' + detail : ''}`); failed++; }
}

// ── Inline logic (mirrors x402-memo.js) ──────────────────────────────────────

const SPL_MEMO_V2 = 'MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr';

function generateNonce() {
  return crypto.randomUUID().replace(/-/g, '');
}

function formatMemo(endpoint, nonce) {
  return `endpoint:${endpoint};nonce:${nonce}`;
}

function buildMemoIx({ solanaWeb3, endpoint, nonce }) {
  const { TransactionInstruction, PublicKey } = solanaWeb3;
  const memoStr = formatMemo(endpoint, nonce);
  return new TransactionInstruction({
    programId: new PublicKey(SPL_MEMO_V2),
    keys: [],
    data: Buffer.from(memoStr, 'utf8'),
  });
}

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

console.log('\nx402-memo.js (agent helper)');
console.log('============================');

assert('generateNonce returns >= 8 chars',       generateNonce().length >= 8);
assert('generateNonce has no hyphens',            !generateNonce().includes('-'));
assert('formatMemo matches server validateMemo regex',
  /^endpoint:([^;]+);nonce:(.+)$/.test(formatMemo('/x402/scout-peek', 'abc12345')));
assert('formatMemo produces exact expected string',
  formatMemo('/x402/scout-peek', 'abc12345') === 'endpoint:/x402/scout-peek;nonce:abc12345');

const ix = buildMemoIx({ solanaWeb3: mockSolanaWeb3, endpoint: '/x402/scout-peek', nonce: 'a1b2c3d4' });
assert('buildMemoIx uses SPL Memo v2 programId',       ix.programId.toBase58() === SPL_MEMO_V2);
assert('buildMemoIx data decodes to correct memo string',
  Buffer.from(ix.data).toString('utf8') === 'endpoint:/x402/scout-peek;nonce:a1b2c3d4');
assert('buildMemoIx has no account keys',              ix.keys.length === 0);

console.log(`\nResults: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);

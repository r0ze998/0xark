// x402-memo.js — SPL Memo helper for x402 endpoint binding
// Dual-mode: browser (CDN globals → window.x402Memo) or Node CJS (require)

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

// solanaWeb3: window.solanaWeb3 (browser CDN) or destructured @solana/web3.js (Node)
function buildMemoIx({ solanaWeb3, endpoint, nonce }) {
  const { TransactionInstruction, PublicKey } = solanaWeb3;
  const memoStr = formatMemo(endpoint, nonce);
  const data = typeof TextEncoder !== 'undefined'
    ? new TextEncoder().encode(memoStr)
    : Buffer.from(memoStr, 'utf8');
  return new TransactionInstruction({ programId: new PublicKey(SPL_MEMO_V2), keys: [], data });
}

if (typeof module !== 'undefined') {
  module.exports = { generateNonce, formatMemo, buildMemoIx, SPL_MEMO_V2 };
} else if (typeof window !== 'undefined') {
  window.x402Memo = { generateNonce, formatMemo, buildMemoIx };
}

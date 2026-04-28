// x402-memo.js — SPL Memo helper for x402 endpoint binding (Node ESM)

export const SPL_MEMO_V2 = 'MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr';

export function generateNonce() {
  return crypto.randomUUID().replace(/-/g, '');
}

export function formatMemo(endpoint, nonce) {
  return `endpoint:${endpoint};nonce:${nonce}`;
}

// solanaWeb3: destructured from _getSolana() in x402-client.js
export function buildMemoIx({ solanaWeb3, endpoint, nonce }) {
  const { TransactionInstruction, PublicKey } = solanaWeb3;
  const memoStr = formatMemo(endpoint, nonce);
  return new TransactionInstruction({
    programId: new PublicKey(SPL_MEMO_V2),
    keys: [],
    data: Buffer.from(memoStr, 'utf8'),
  });
}

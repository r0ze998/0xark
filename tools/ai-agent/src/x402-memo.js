// x402-memo.js — SPL Memo helper for x402 endpoint binding (Node ESM)
// Phase 12: extended with Phase 12 compact move memo format.

export const SPL_MEMO_V2 = 'MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr';

export function generateNonce() {
  return crypto.randomUUID().replace(/-/g, '');
}

// ─── Legacy format ────────────────────────────────────────────────────────────

export function formatMemo(endpoint, nonce) {
  return `endpoint:${endpoint};nonce:${nonce}`;
}

// ─── Phase 12 compact move memo format ───────────────────────────────────────

/**
 * Build a compact move memo string.
 * Format: "e:<endpoint>;<k1>:<v1>;<k2>:<v2>;...;n:<nonce>"
 * Nonce is auto-generated if omitted.
 */
export function formatMoveMemo(endpoint, fields) {
  const nonce = fields.n ?? generateNonce();
  const parts  = [`e:${endpoint}`];
  for (const [k, v] of Object.entries(fields)) {
    if (k !== 'n') parts.push(`${k}:${v}`);
  }
  parts.push(`n:${nonce}`);
  return parts.join(';');
}

/**
 * Parse a compact move memo string into a key→value map.
 */
export function parseMoveMemo(memoStr) {
  const fields = {};
  for (const part of String(memoStr).split(';')) {
    const idx = part.indexOf(':');
    if (idx > 0) fields[part.slice(0, idx)] = part.slice(idx + 1);
  }
  return fields;
}

// ─── Per-endpoint memo builders ───────────────────────────────────────────────

export function memoCommit({ matchId, round, playerSide, hash, nonce }) {
  return formatMoveMemo('/x402/co', { m: matchId, r: round, p: playerSide ?? 's', h: hash, n: nonce });
}

export function memoReveal({ matchId, round, playerSide, actionType, target, salt, nonce }) {
  return formatMoveMemo('/x402/re', {
    m: matchId, r: round, p: playerSide ?? 's',
    a: actionType, g: target, s: salt, n: nonce,
  });
}

export function memoHandCommit({ matchId, round, commitment, nonce }) {
  return formatMoveMemo('/x402/hc', { m: matchId, r: round, c: commitment, n: nonce });
}

export function memoHandReveal({ matchId, round, cardIds, nonce }) {
  return formatMoveMemo('/x402/hr', { m: matchId, r: round, i: cardIds.join(','), n: nonce });
}

export function memoPhaseAdvance({ matchId, round, phase, nonce }) {
  return formatMoveMemo('/x402/pa', { m: matchId, r: round, p: phase, n: nonce });
}

export function memoRoundResolve({ matchId, round, p1Delta, p2Delta, nonce }) {
  return formatMoveMemo('/x402/rs', { m: matchId, r: round, d: `${p1Delta}/${p2Delta}`, n: nonce });
}

export function memoMatchEnd({ matchId, winner, nonce }) {
  return formatMoveMemo('/x402/me', { m: matchId, w: winner, n: nonce });
}

// ─── SPL Memo instruction builder ────────────────────────────────────────────

// solanaWeb3: destructured from _getSolana() in x402-client.js
export function buildMemoIx({ solanaWeb3, endpoint, nonce, memoStr }) {
  const { TransactionInstruction, PublicKey } = solanaWeb3;
  const memo = memoStr ?? formatMemo(endpoint, nonce);
  return new TransactionInstruction({
    programId: new PublicKey(SPL_MEMO_V2),
    keys: [],
    data: Buffer.from(memo, 'utf8'),
  });
}

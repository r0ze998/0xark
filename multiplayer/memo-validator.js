// memo-validator.js — x402 memo format validation (Phase 12 move schema)
// ESM module. Imported by server.js and tests.

// ─── Per-endpoint required key sets ──────────────────────────────────────────

export const MOVE_REQUIRED_KEYS = Object.freeze({
  '/x402/co': ['m', 'r', 'p', 'h', 'n'],
  '/x402/re': ['m', 'r', 'p', 'a', 'g', 's', 'n'],
  '/x402/hc': ['m', 'r', 'c', 'n'],
  '/x402/hr': ['m', 'r', 'i', 'n'],
  '/x402/pa': ['m', 'r', 'p', 'n'],
  '/x402/rs': ['m', 'r', 'd', 'n'],
  '/x402/me': ['m', 'w', 'n'],
});

export const MOVE_ENDPOINTS = new Set(Object.keys(MOVE_REQUIRED_KEYS));

// ─── Value-format regexes ─────────────────────────────────────────────────────

const HEX64_RE    = /^[0-9a-f]{64}$/i;
const HEX16_RE    = /^[0-9a-f]{16,}$/i;   // nonce: min 16 hex chars
const BASE58_RE   = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
const MATCH_ID_RE = /^[A-Za-z0-9_:.-]{1,64}$/;
const CARD_IDS_RE = /^(\d{1,5})(,\d{1,5}){0,9}$/;
const DELTA_RE    = /^-?\d+\/-?\d+$/;

// ─── Compact memo parser ──────────────────────────────────────────────────────

/**
 * Parse a compact semicolon-separated memo string into a key→value map.
 * e.g. "e:/x402/co;m:match1;r:1;p:s;h:<hex64>;n:<hex16>"
 */
export function parseCompactMemo(memoStr) {
  const fields = {};
  for (const part of String(memoStr).split(';')) {
    const idx = part.indexOf(':');
    if (idx > 0) fields[part.slice(0, idx)] = part.slice(idx + 1);
  }
  return fields;
}

// ─── Compact memo builder ─────────────────────────────────────────────────────

/**
 * Build a compact memo string from an endpoint and a field map.
 * Field order follows the required-keys order for that endpoint.
 */
export function formatMoveMemo(endpoint, fieldMap) {
  const parts = [`e:${endpoint}`];
  for (const [k, v] of Object.entries(fieldMap)) parts.push(`${k}:${v}`);
  return parts.join(';');
}

// ─── validateMemo ─────────────────────────────────────────────────────────────

/**
 * Validate a memo string against the expected endpoint.
 * Supports both:
 *   - Legacy format: "endpoint:<path>;nonce:<8+chars>"
 *   - Phase 12 compact: "e:/x402/...;m:...;...;n:<hex16>"
 *
 * @returns {{ ok: boolean, error?: string, fields?: object }}
 */
export function validateMemo(memoStr, requestPath) {
  if (!memoStr) return { ok: false, error: 'memo required' };

  if (memoStr.startsWith('e:')) {
    return _validateCompactMemo(memoStr, requestPath);
  }

  // Legacy format
  const match = memoStr.match(/^endpoint:([^;]+);nonce:(.+)$/);
  if (!match) return { ok: false, error: 'invalid memo format' };
  const [, endpoint, nonce] = match;
  if (endpoint !== requestPath) return { ok: false, error: 'endpoint mismatch' };
  if (nonce.length < 8)         return { ok: false, error: 'invalid nonce' };
  return { ok: true };
}

function _validateCompactMemo(memoStr, requestPath) {
  const f = parseCompactMemo(memoStr);

  if (f.e !== requestPath) return { ok: false, error: 'endpoint mismatch' };

  const required = MOVE_REQUIRED_KEYS[requestPath];
  if (!required) return { ok: false, error: 'unknown move endpoint' };

  for (const key of required) {
    if (f[key] == null || f[key] === '') return { ok: false, error: `missing field: ${key}` };
  }

  // Per-field format validation
  if (f.m !== undefined && !MATCH_ID_RE.test(f.m))      return { ok: false, error: 'invalid match_id' };
  if (f.r !== undefined) {
    const r = parseInt(f.r, 10);
    if (isNaN(r) || r < 1 || r > 99) return { ok: false, error: 'invalid round' };
  }
  if (f.p !== undefined && !/^[desb]$/.test(f.p))       return { ok: false, error: 'invalid p value' };
  if (f.h !== undefined && !HEX64_RE.test(f.h))         return { ok: false, error: 'invalid hash (hex64)' };
  if (f.c !== undefined && !HEX64_RE.test(f.c))         return { ok: false, error: 'invalid commitment (hex64)' };
  if (f.s !== undefined && !HEX64_RE.test(f.s))         return { ok: false, error: 'invalid salt (hex64)' };
  if (f.a !== undefined) {
    const a = parseInt(f.a, 10);
    if (isNaN(a) || a < 0 || a > 10) return { ok: false, error: 'invalid action_type' };
  }
  if (f.g !== undefined && !BASE58_RE.test(f.g))        return { ok: false, error: 'invalid target pubkey' };
  if (f.w !== undefined && !BASE58_RE.test(f.w))        return { ok: false, error: 'invalid winner pubkey' };
  if (f.i !== undefined && !CARD_IDS_RE.test(f.i))      return { ok: false, error: 'invalid card_ids' };
  if (f.d !== undefined && !DELTA_RE.test(f.d))         return { ok: false, error: 'invalid hp delta' };
  if (f.n !== undefined && !HEX16_RE.test(f.n))         return { ok: false, error: 'invalid nonce (hex16)' };

  return { ok: true, fields: f };
}

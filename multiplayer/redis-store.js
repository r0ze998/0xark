// redis-store.js — persistent replay-prevention store for x402 signatures and nonces
//
// Uses ioredis when REDIS_URL is set (production); falls back to in-memory Maps (dev).
// In-memory Maps do not survive server restarts — use Redis in production (C1 fix).
//
// Key schema:
//   sig:{txSig}              → '1'  TTL 3600s  (replay prevention)
//   nonce:{endpoint}:{nonce} → '1'  TTL   60s  (nonce uniqueness within window)

'use strict';

// ─── In-memory fallback ───────────────────────────────────────────────────────
// These are used only when REDIS_URL is not set (development / local testing).
// Values are expiry timestamps in milliseconds.
const _memSigs   = new Map(); // sig       → expiryMs
const _memNonces = new Map(); // `${ep}:${nonce}` → expiryMs

function _memHas(map, key) {
  const exp = map.get(key);
  if (exp === undefined) return false;
  if (Date.now() > exp) { map.delete(key); return false; }
  return true;
}

function _memSet(map, key, ttlSeconds) {
  map.set(key, Date.now() + ttlSeconds * 1000);
}

// ─── Redis client ─────────────────────────────────────────────────────────────
let _redis = null;

// Lazy-initialize on first use so module-level doesn't block startup.
let _initPromise = null;
async function _getRedis() {
  if (_redis !== null) return _redis;
  if (!_initPromise) {
    _initPromise = (async () => {
      if (!process.env.REDIS_URL) return null;
      try {
        const { default: Redis } = await import('ioredis');
        const client = new Redis(process.env.REDIS_URL, {
          maxRetriesPerRequest: 3,
          enableReadyCheck: true,
          lazyConnect: false,
        });
        client.on('error', (e) => console.error('[Redis] error:', e.message));
        client.on('connect', () => console.log('[Redis] connected'));
        client.on('close', () => console.warn('[Redis] disconnected'));
        _redis = client;
        return client;
      } catch (e) {
        console.warn('[Redis] init failed, using in-memory fallback:', e.message);
        return null;
      }
    })();
  }
  return _initPromise;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Check whether a tx signature has already been used.
 * @param {string} sig - base58 Solana transaction signature
 */
export async function isSigUsed(sig) {
  const r = await _getRedis();
  if (r) {
    try { return (await r.get(`sig:${sig}`)) !== null; }
    catch (e) { console.warn('[Redis] isSigUsed error, falling back:', e.message); }
  }
  return _memHas(_memSigs, sig);
}

/**
 * Mark a tx signature as used (replay prevention).
 * @param {string} sig        - base58 signature
 * @param {number} ttlSeconds - default 3600 (1 hour)
 */
export async function markSigUsed(sig, ttlSeconds = 3600) {
  const r = await _getRedis();
  if (r) {
    try { await r.set(`sig:${sig}`, '1', 'EX', ttlSeconds); return; }
    catch (e) { console.warn('[Redis] markSigUsed error, falling back:', e.message); }
  }
  _memSet(_memSigs, sig, ttlSeconds);
}

/**
 * Check whether a nonce has already been used for this endpoint within its TTL.
 * @param {string} nonce    - nonce from memo
 * @param {string} endpoint - request path e.g. '/x402/match-battle'
 */
export async function isNonceUsed(nonce, endpoint) {
  const r = await _getRedis();
  const key = `nonce:${endpoint}:${nonce}`;
  if (r) {
    try { return (await r.get(key)) !== null; }
    catch (e) { console.warn('[Redis] isNonceUsed error, falling back:', e.message); }
  }
  return _memHas(_memNonces, key);
}

/**
 * Mark a nonce as used for this endpoint.
 * @param {string} nonce      - nonce from memo
 * @param {string} endpoint   - request path
 * @param {number} ttlSeconds - default 60 (1 minute window)
 */
export async function markNonceUsed(nonce, endpoint, ttlSeconds = 60) {
  const r = await _getRedis();
  const key = `nonce:${endpoint}:${nonce}`;
  if (r) {
    try { await r.set(key, '1', 'EX', ttlSeconds); return; }
    catch (e) { console.warn('[Redis] markNonceUsed error, falling back:', e.message); }
  }
  _memSet(_memNonces, key, ttlSeconds);
}

/**
 * GC in-memory maps (called by the server's periodic cleanup interval).
 * No-op when Redis is active (Redis handles TTL expiry automatically).
 */
export function gcMemory() {
  if (_redis) return;
  const now = Date.now();
  _memSigs.forEach((exp, k)   => { if (exp < now) _memSigs.delete(k);   });
  _memNonces.forEach((exp, k) => { if (exp < now) _memNonces.delete(k); });
}

/** Expose in-memory maps for testing (unit tests bypass Redis). */
export const _test = { _memSigs, _memNonces, _memHas, _memSet };

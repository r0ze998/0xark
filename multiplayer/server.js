/**
 * 0xARK Multiplayer WebSocket Server — Pure Relayer (Phase 5)
 *
 * Architecture: The Solana program is the single source of truth for all game
 * state. This server is a stateless relay that:
 *   1. Manages WebSocket connections and room presence (lobby only)
 *   2. Relays player movement with ZK proximity filter
 *   3. Submits client-signed transactions to the Solana RPC
 *   4. Broadcasts tx confirmations so clients know to refresh on-chain state
 *   5. Relays chat messages
 *
 * Protocol v2 (Phase D Reborn):
 *   Client→Server: create_room | join_room | move | presence_update | submit_tx | chat
 *                  duel_hand_committed | duel_hand_revealed | duel_phase_advance
 *                  duel_battle_resolved | duel_ended
 *   Server→Client: room_created | room_joined | player_joined | player_left
 *                  player_moved | presence_update | tx_confirmed | tx_failed | chat | error
 *
 * Handler modules live in handlers/; shared state in state.js.
 */

import http from 'http';
import crypto from 'crypto';
import { WebSocketServer } from 'ws';
import { PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';

import { rooms, connection, COMMITMENT, RPC_URL, send, broadcast, rateLimits, gcRoundClaims } from './state.js';
import { HANDLERS, _handleAuthVerify } from './handlers/index.js';
import { validateMemo, MOVE_ENDPOINTS } from './memo-validator.js';
import { isSigUsed, markSigUsed, isNonceUsed, markNonceUsed, gcMemory } from './redis-store.js';

const PORT = process.env.PORT || 3500;

// 0.0001 SOL per move (overridable via X402_MOVE_PRICE_LAMPORTS)
const MOVE_PRICE_LAMPORTS = parseInt(process.env.X402_MOVE_PRICE_LAMPORTS, 10) || 100_000;
const MOVE_PRICE_SOL = MOVE_PRICE_LAMPORTS / LAMPORTS_PER_SOL;

// 0.005 SOL per AI move delegation (overridable via X402_AI_MOVE_PRICE_LAMPORTS)
const AI_MOVE_PRICE_LAMPORTS = parseInt(process.env.X402_AI_MOVE_PRICE_LAMPORTS, 10) || 5_000_000;
const AI_MOVE_PRICE_SOL = AI_MOVE_PRICE_LAMPORTS / LAMPORTS_PER_SOL;

// ─── Rate limiting ────────────────────────────────────────────────────────────

const RATE_WINDOW_MS = 1_000;
const RATE_MAX_MSG   = 20;
const RATE_MAX_TX    = 3;
const MSG_SIZE_LIMIT = 32_768;

function initRateState(ws) {
  ws._rateWindow = Date.now();
  ws._rateMsg    = 0;
  ws._rateTx     = 0;
}

function rateLimited(ws, isTx = false) {
  const now = Date.now();
  if (now - ws._rateWindow > RATE_WINDOW_MS) {
    ws._rateWindow = now;
    ws._rateMsg    = 0;
    ws._rateTx     = 0;
  }
  ws._rateMsg++;
  if (isTx) ws._rateTx++;
  if (ws._rateMsg > RATE_MAX_MSG) return true;
  if (isTx && ws._rateTx > RATE_MAX_TX) return true;
  return false;
}

// ─── HTTP rate limiting (per-IP, x402 endpoints) ─────────────────────────────

const HTTP_RATE_MAX    = parseInt(process.env.RATE_LIMIT_MAX,       10) || 20;
const HTTP_RATE_WINDOW = parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 60_000;

function checkHttpRateLimit(ip, now = Date.now()) {
  let entry = rateLimits.get(ip);
  if (!entry || now - entry.windowStart >= HTTP_RATE_WINDOW) {
    entry = { count: 0, windowStart: now };
    rateLimits.set(ip, entry);
  }
  entry.count++;
  if (entry.count > HTTP_RATE_MAX) {
    const retryAfter = Math.ceil((HTTP_RATE_WINDOW - (now - entry.windowStart)) / 1000);
    return { limited: true, retryAfter };
  }
  return { limited: false };
}

// ─── x402 payment verification ────────────────────────────────────────────────

const TREASURY_ADDR    = process.env.TREASURY_PUBKEY || '11111111111111111111111111111111';
// Split payment recipients (default to single treasury when not configured)
const OPS_TREASURY_ADDR  = process.env.OPS_TREASURY_PUBKEY  || TREASURY_ADDR;
const PRIZE_POOL_ADDR    = process.env.PRIZE_POOL_PUBKEY     || TREASURY_ADDR;
const SOLANA_NETWORK   = process.env.SOLANA_NETWORK  || 'devnet';
// X402_REQUIRE_MEMO: every payment tx must carry a memo binding it to the endpoint.
// Default 'true' (Phase B). Set X402_REQUIRE_MEMO=false to disable for legacy clients.
const X402_REQUIRE_MEMO = process.env.X402_REQUIRE_MEMO !== 'false';

// ─── Environment validation ───────────────────────────────────────────────────
// Outside development (NODE_ENV=development), missing required vars are fatal.
// Set NODE_ENV=development explicitly to enable demo mode (payments skipped).

const REQUIRED_PROD_ENVS = ['TREASURY_PUBKEY', 'SOLANA_RPC', 'REDIS_URL'];

function validateEnv() {
  const isDev = process.env.NODE_ENV === 'development';
  for (const key of REQUIRED_PROD_ENVS) {
    if (!process.env[key]?.trim()) {
      if (!isDev) {
        console.error(`[FATAL] ${key} is required outside development mode.`);
        console.error(`[FATAL] Set via 'fly secrets set ${key}=...' or run with NODE_ENV=development to enable demo mode.`);
        process.exit(1);
      } else {
        console.warn(`[WARN] ${key} not set — demo mode active (payments skipped)`);
      }
    }
  }
}

validateEnv();

// Memo Program IDs (legacy + v2). Ref: https://spl.solana.com/memo
const MEMO_PROGRAM_IDS = new Set([
  'Memo1UhkJRfHyvLMcVucJwxXeuD728EqVDDwQDxFMNo',   // SPL Memo v1
  'MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr',   // SPL Memo v2
]);

// Extract the first memo instruction data from a Solana transaction.
// Handles both legacy Message (instructions[].data Buffer) and
// MessageV0 (compiledInstructions[].data Uint8Array).
function extractMemo(tx) {
  const message = tx?.transaction?.message;
  if (!message) return null;
  const accountKeys  = message.staticAccountKeys ?? message.accountKeys ?? [];
  const instructions = message.compiledInstructions ?? message.instructions ?? [];
  for (const ix of instructions) {
    const key = accountKeys[ix.programIdIndex];
    if (!key) continue;
    const programId = typeof key.toBase58 === 'function' ? key.toBase58() : String(key);
    if (!MEMO_PROGRAM_IDS.has(programId)) continue;
    const raw = ix.data;
    if (raw == null) continue;
    if (Buffer.isBuffer(raw))      return raw.toString('utf8');
    if (raw instanceof Uint8Array) return Buffer.from(raw).toString('utf8');
    if (typeof raw === 'string')   return raw;
  }
  return null;
}

const X402_POLL_ATTEMPTS = 10;
const X402_POLL_MS       = 500;
const X402_MAX_AGE_MS    = 60_000;

// sigHint: signature provided directly by client (Phase 9+) — uses targeted getTransaction.
// Without sigHint: legacy poll via getSignaturesForAddress (probe path).
// Sum balance delta across all known treasury addresses in a transaction.
// Handles both single-transfer (all to ops) and split (50/50 ops+pool).
function _sumTreasuryReceived(tx, knownAddrs) {
  const accountKeys = tx.transaction.message.staticAccountKeys ?? tx.transaction.message.accountKeys;
  let total = 0;
  for (const addr of knownAddrs) {
    const idx = accountKeys.findIndex(k => k.toBase58() === addr);
    if (idx >= 0) {
      total += (tx.meta.postBalances[idx] ?? 0) - (tx.meta.preBalances[idx] ?? 0);
    }
  }
  return total;
}

// Shared memo+nonce guard for the two byte-identical verification paths (sigHint +
// legacy poll). Validates the tx memo against the request path, extracts the nonce
// (compact `n` or verbose `nonce`), and rejects a replayed nonce within its TTL
// window. Behavior-preserving extract — returns { ok, error?, nonce }.
async function _validateMemoNonce(tx, path) {
  if (!X402_REQUIRE_MEMO) return { ok: true, nonce: null };
  const memoCheck = validateMemo(extractMemo(tx), path);
  if (!memoCheck.ok) return { ok: false, error: memoCheck.error };
  // C3: nonce uniqueness check (prevents memo replay within TTL window)
  const nonce = memoCheck.fields?.nonce ?? memoCheck.fields?.n ?? null;
  if (nonce && await isNonceUsed(nonce, path)) {
    return { ok: false, error: 'nonce already used' };
  }
  return { ok: true, nonce };
}

async function _verifyX402Payment(playerPubkeyStr, amountSol, requestPath, sigHint = null) {
  // C4: local-dev-bypass is only valid in development; block in all other envs (including demo mode).
  if (sigHint === 'local-dev-bypass') {
    if (process.env.NODE_ENV !== 'development') {
      console.error('[SECURITY] local-dev-bypass attempted outside development — rejected');
      return { ok: false, error: 'dev-bypass denied outside development environment' };
    }
    console.warn('[DEV] local-dev-bypass accepted (NODE_ENV=development)');
    return { ok: true, demo: true };
  }

  if (!process.env.TREASURY_PUBKEY) {
    console.log('[x402] No TREASURY_PUBKEY — demo mode');
    return { ok: true, demo: true };
  }
  // All known treasury addresses — payment can be split across any combination
  const knownAddrs = [...new Set([TREASURY_ADDR, OPS_TREASURY_ADDR, PRIZE_POOL_ADDR])];
  try {
    const expectedLamports = Math.floor(amountSol * LAMPORTS_PER_SOL);

    if (sigHint) {
      // C1: persistent replay prevention via redis-store
      if (await isSigUsed(sigHint)) return { ok: false, error: 'tx signature already used' };
      // H2: use 'finalized' commitment for payment verification
      const tx = await connection.getTransaction(sigHint, {
        commitment: 'finalized', maxSupportedTransactionVersion: 0,
      });
      if (!tx?.meta) return { ok: false, error: 'transaction not found' };
      const memoGate = await _validateMemoNonce(tx, requestPath);
      if (!memoGate.ok) return { ok: false, error: memoGate.error };
      const memoNonce = memoGate.nonce;
      const received = _sumTreasuryReceived(tx, knownAddrs);
      if (received <= 0) return { ok: false, error: 'payment not directed to treasury' };
      if (received >= expectedLamports) {
        console.log(`[x402] Verified: ${amountSol} SOL`);
        await markSigUsed(sigHint);
        if (memoNonce) await markNonceUsed(memoNonce, requestPath);
        return { ok: true, sig: sigHint, received, memo: extractMemo(tx) };
      }
      return { ok: false, error: 'insufficient payment' };
    }

    // Legacy: poll recent sigs by player pubkey (probe path / old clients)
    const playerKey = new PublicKey(playerPubkeyStr);
    for (let attempt = 0; attempt < X402_POLL_ATTEMPTS; attempt++) {
      const sigs = await connection.getSignaturesForAddress(playerKey, { limit: 10 }, COMMITMENT);
      const now  = Date.now();
      for (const sigInfo of sigs) {
        if (!sigInfo.blockTime || sigInfo.err) continue;
        if (now - sigInfo.blockTime * 1000 > X402_MAX_AGE_MS) continue;
        // C1: persistent replay prevention
        if (await isSigUsed(sigInfo.signature)) return { ok: false, error: 'signature already used' };
        const tx = await connection.getTransaction(sigInfo.signature, {
          commitment: 'finalized', maxSupportedTransactionVersion: 0,  // H2
        });
        if (!tx?.meta) continue;
        const memoGate = await _validateMemoNonce(tx, requestPath);
        if (!memoGate.ok) return { ok: false, error: memoGate.error };
        const memoNonce = memoGate.nonce;
        const received = _sumTreasuryReceived(tx, knownAddrs);
        if (received >= expectedLamports) {
          console.log(`[x402] Verified: ${amountSol} SOL from ${playerPubkeyStr}`);
          await markSigUsed(sigInfo.signature);
          if (memoNonce) await markNonceUsed(memoNonce, requestPath);
          return { ok: true, sig: sigInfo.signature, received, memo: extractMemo(tx) };
        }
      }
      if (attempt < X402_POLL_ATTEMPTS - 1) await new Promise(r => setTimeout(r, X402_POLL_MS));
    }
    return { ok: false, error: 'Payment not detected within 5 seconds' };
  } catch (err) {
    console.error('[x402] Verification error:', err.message);
    return { ok: false, error: 'Verification failed: ' + err.message };
  }
}

function _readBody(req) {
  return new Promise((resolve) => {
    let data = '';
    req.on('data', chunk => { data += chunk; });
    req.on('end', () => { try { resolve(JSON.parse(data)); } catch { resolve({}); } });
  });
}

// ─── HTTP server ──────────────────────────────────────────────────────────────

const httpServer = http.createServer(async (req, res) => {
  const cors = () => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  };
  if (req.method === 'OPTIONS') { cors(); res.writeHead(204); res.end(); return; }

  if (req.method === 'GET' && (req.url === '/' || req.url === '/health')) {
    cors();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', rooms: rooms.size, connections: wss?.clients?.size ?? 0, rpc: RPC_URL }));
    return;
  }

  const X402_ROUTES = {
    // Legacy aliases (kept for backward compat)
    '/x402/extra-action':  0.01,
    '/x402/scout-peek':    0.005,
    '/x402/counter-peek':  0.003,
    // Phase 19: new game-design-v2 §3 endpoints
    '/x402/match-battle':        0.001,
    '/x402/peek-vault-size':     0.0005,
    '/x402/peek-vault-content':  0.005,
    '/x402/draw-extra':          0.01,
    '/x402/ai-strategy-advice':  0.003,
    // Phase 12 move endpoints — 0.0001 SOL (X402_MOVE_PRICE_LAMPORTS overrides)
    '/x402/co': MOVE_PRICE_SOL,
    '/x402/re': MOVE_PRICE_SOL,
    '/x402/hc': MOVE_PRICE_SOL,
    '/x402/hr': MOVE_PRICE_SOL,
    '/x402/pa': MOVE_PRICE_SOL,
    '/x402/rs': MOVE_PRICE_SOL,
    '/x402/me': MOVE_PRICE_SOL,
    // Phase 14: AI move delegation
    '/x402/ai-move': AI_MOVE_PRICE_SOL,
  };
  // Early 503 for AI endpoints when ANTHROPIC_API_KEY is not configured
  if (req.method === 'POST'
      && (req.url === '/x402/ai-move' || req.url === '/x402/ai-strategy-advice')
      && !process.env.ANTHROPIC_API_KEY) {
    cors();
    res.writeHead(503, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: false, error: 'AI not configured (ANTHROPIC_API_KEY missing)' }));
    return;
  }

  if (req.method === 'POST' && X402_ROUTES[req.url] !== undefined) {
    cors();

    // Per-IP rate limit (RATE_LIMIT_MAX / RATE_LIMIT_WINDOW_MS, default 20/60s)
    const ip = req.socket?.remoteAddress || 'unknown';
    const rl = checkHttpRateLimit(ip);
    if (rl.limited) {
      res.setHeader('Retry-After', String(rl.retryAfter));
      res.writeHead(429, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: false, error: 'rate limited', retryAfter: rl.retryAfter }));
      return;
    }

    const amountSol      = X402_ROUTES[req.url];
    const amountLamports = Math.floor(amountSol * LAMPORTS_PER_SOL);
    const body         = await _readBody(req);
    const playerPubkey = body.playerPubkey || req.headers['x-player-pubkey'] || '';
    const signature    = body.signature    || req.headers['x-payment']       || '';
    // One field present without the other → 400 (probe with neither field is fine → 402 from verify)
    if (signature && !playerPubkey) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: false, error: 'playerPubkey required' }));
      return;
    }
    if (playerPubkey && !signature) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: false, error: 'signature required' }));
      return;
    }
    const result = await _verifyX402Payment(playerPubkey, amountSol, req.url, signature || null);

    if (!result.ok) {
      // x402 v2 spec: PAYMENT-REQUIRED header (Base64-encoded JSON)
      // Spec: https://github.com/coinbase/x402/blob/main/specs/transports-v2/http.md
      const opsLamports  = Math.floor(amountLamports * 0.5);
      const poolLamports = amountLamports - opsLamports;
      const paymentRequired = Buffer.from(JSON.stringify({
        version: 'x402-v2',
        accepts: [{
          scheme:  'solana-transfer',
          network: SOLANA_NETWORK,
          amount:  String(amountLamports),
          // Single-recipient fallback for old clients
          payTo:   OPS_TREASURY_ADDR,
          // Split recipient for Phase 19+ clients
          recipient: {
            ops:  { address: OPS_TREASURY_ADDR,  lamports: opsLamports  },
            pool: { address: PRIZE_POOL_ADDR,     lamports: poolLamports },
          },
        }],
      })).toString('base64');
      res.setHeader('PAYMENT-REQUIRED',    paymentRequired);
      res.setHeader('X-Payment-Recipient', OPS_TREASURY_ADDR);
      res.setHeader('X-Payment-Amount',    String(amountLamports));
      res.setHeader('X-Payment-Network',   SOLANA_NETWORK);
      res.writeHead(402, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: false, error: result.error }));
      return;
    }

    // Move endpoints: validate memo and return parsed fields
    if (MOVE_ENDPOINTS.has(req.url)) {
      const memoStr = result.demo ? (body.memo || '') : (result.memo || body.memo || '');
      if (!result.demo && memoStr) {
        const memoCheck = validateMemo(memoStr, req.url);
        if (!memoCheck.ok) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ ok: false, error: memoCheck.error }));
          return;
        }
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true, memo: memoStr, fields: memoCheck.fields, sig: result.sig }));
        return;
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true, memo: memoStr, demo: result.demo }));
      return;
    }

    // AI move delegation
    if (req.url === '/x402/ai-move') {
      let aiResult;
      try {
        const { delegateMove } = await import('../tools/ai-agent/src/move-delegate.js');
        aiResult = await delegateMove(body.public_state ?? {});
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: false, error: 'AI delegation failed: ' + err.message }));
        return;
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true, ...aiResult, sig: result.sig, demo: result.demo }));
      return;
    }

    // AI strategy advice (non-binding suggestions)
    if (req.url === '/x402/ai-strategy-advice') {
      let adviceResult;
      try {
        const { adviseStrategy } = await import('../tools/ai-agent/src/strategy-advisor.js');
        adviceResult = await adviseStrategy(body.context ?? body.public_state ?? {});
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: false, error: 'AI strategy advice failed: ' + err.message }));
        return;
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true, ...adviceResult, sig: result.sig, demo: result.demo }));
      return;
    }

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true, action: body.action ?? 'unknown', sig: result.sig, demo: result.demo }));
    return;
  }

  res.writeHead(404); res.end('Not found');
});

// ─── WebSocket server ─────────────────────────────────────────────────────────

let wss;

httpServer.listen(PORT, () => {
  console.log(`0xARK Multiplayer Server — HTTP+WS on port ${PORT}`);
  console.log(`Solana RPC: ${RPC_URL}`);
  console.log(`x402 memo binding: ${X402_REQUIRE_MEMO ? 'REQUIRED' : 'disabled (set X402_REQUIRE_MEMO=false to disable)'}`);
  console.log('All game state is on-chain. Server holds no game authority.');
});

wss = new WebSocketServer({ server: httpServer });

// GC every 30s: in-memory sig/nonce maps + expired rateLimits + roundClaims (5m TTL)
const _sigGcInterval = setInterval(() => {
  gcMemory();  // no-op when Redis is active; cleans in-memory Maps otherwise
  const now = Date.now();
  rateLimits.forEach((entry, ip) => { if (now - entry.windowStart >= HTTP_RATE_WINDOW) rateLimits.delete(ip); });
  gcRoundClaims(300_000);
}, 30_000);
process.on('exit', () => clearInterval(_sigGcInterval));

wss.on('connection', (ws) => {
  ws.playerId      = Math.random().toString(36).slice(2, 8);
  ws.roomId        = null;
  ws.playerName    = 'Player';
  ws.wallet        = null;
  ws.clan          = null;
  ws.cardCount     = 0;
  ws.season        = 1;
  ws.isAlive       = true;
  ws.authenticated = false;
  ws.authChallenge = `0xARK:${Date.now()}:${crypto.randomBytes(16).toString('hex')}`;
  initRateState(ws);
  send(ws, { type: 'auth_challenge', challenge: ws.authChallenge });

  ws.on('pong', () => { ws.isAlive = true; });

  ws.on('message', (data) => {
    if (data.length > MSG_SIZE_LIMIT) { send(ws, { type: 'error', message: 'Message too large' }); return; }
    let msg;
    try { msg = JSON.parse(data); } catch { send(ws, { type: 'error', message: 'Invalid JSON' }); return; }
    if (rateLimited(ws, msg.type === 'submit_tx')) return;
    if (msg.type === 'auth_verify') { _handleAuthVerify(ws, msg); return; }
    const h = HANDLERS[msg.type];
    if (h) h(ws, msg);
  });

  ws.on('close', () => {
    const room = ws.roomId ? rooms.get(ws.roomId) : null;
    if (!room) return;
    room.players.delete(ws.playerId);
    broadcast(room, { type: 'player_left', playerId: ws.playerId });
    if (room.players.size === 0) rooms.delete(ws.roomId);
  });
});

// Heartbeat — terminate stale connections
setInterval(() => {
  wss.clients.forEach((ws) => {
    if (!ws.isAlive) { ws.terminate(); return; }
    ws.isAlive = false;
    ws.ping();
  });
}, 30_000);

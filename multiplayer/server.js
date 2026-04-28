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
import { WebSocketServer } from 'ws';
import { PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';

import { rooms, connection, COMMITMENT, RPC_URL, send, broadcast, usedSigs, rateLimits, gcRoundClaims } from './state.js';
import { HANDLERS } from './handlers/index.js';

const PORT = process.env.PORT || 3500;

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
const SOLANA_NETWORK   = process.env.SOLANA_NETWORK  || 'devnet';
// X402_REQUIRE_MEMO=true: every payment tx must carry a memo binding it to the endpoint.
// Default 'false' preserves backward compat with clients that don't yet attach memos.
const X402_REQUIRE_MEMO = process.env.X402_REQUIRE_MEMO === 'true';

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

// Validate memo format "endpoint:<path>;nonce:<8+ chars>" against requestPath.
function validateMemo(memoStr, requestPath) {
  if (!memoStr) return { ok: false, error: 'memo required' };
  const match = memoStr.match(/^endpoint:([^;]+);nonce:(.+)$/);
  if (!match) return { ok: false, error: 'invalid memo format' };
  const [, endpoint, nonce] = match;
  if (endpoint !== requestPath)  return { ok: false, error: 'endpoint mismatch' };
  if (nonce.length < 8)          return { ok: false, error: 'invalid nonce' };
  return { ok: true };
}
const X402_POLL_ATTEMPTS = 10;
const X402_POLL_MS       = 500;
const X402_MAX_AGE_MS    = 60_000;

// sigHint: signature provided directly by client (Phase 9+) — uses targeted getTransaction.
// Without sigHint: legacy poll via getSignaturesForAddress (probe path).
async function _verifyX402Payment(playerPubkeyStr, amountSol, requestPath, sigHint = null) {
  if (!process.env.TREASURY_PUBKEY) {
    console.log('[x402] No TREASURY_PUBKEY — demo mode');
    return { ok: true, demo: true };
  }
  try {
    const expectedLamports = Math.floor(amountSol * LAMPORTS_PER_SOL);

    if (sigHint) {
      if (usedSigs.has(sigHint)) return { ok: false, error: 'signature already used' };
      const tx = await connection.getTransaction(sigHint, {
        commitment: COMMITMENT, maxSupportedTransactionVersion: 0,
      });
      if (!tx?.meta) return { ok: false, error: 'transaction not found' };
      if (X402_REQUIRE_MEMO) {
        const memoCheck = validateMemo(extractMemo(tx), requestPath);
        if (!memoCheck.ok) return { ok: false, error: memoCheck.error };
      }
      const accountKeys = tx.transaction.message.staticAccountKeys ?? tx.transaction.message.accountKeys;
      const idx = accountKeys.findIndex(k => k.toBase58() === TREASURY_ADDR);
      if (idx < 0) return { ok: false, error: 'payment not directed to treasury' };
      const received = (tx.meta.postBalances[idx] ?? 0) - (tx.meta.preBalances[idx] ?? 0);
      if (received >= expectedLamports) {
        console.log(`[x402] Verified: ${amountSol} SOL`);
        usedSigs.set(sigHint, Date.now() + 120_000);
        return { ok: true, sig: sigHint, received };
      }
      return { ok: false, error: 'insufficient payment' };
    }

    // Legacy: poll recent sigs by player pubkey (probe path / old clients)
    const playerKey        = new PublicKey(playerPubkeyStr);
    for (let attempt = 0; attempt < X402_POLL_ATTEMPTS; attempt++) {
      const sigs = await connection.getSignaturesForAddress(playerKey, { limit: 10 }, COMMITMENT);
      const now  = Date.now();
      for (const sigInfo of sigs) {
        if (!sigInfo.blockTime || sigInfo.err) continue;
        if (now - sigInfo.blockTime * 1000 > X402_MAX_AGE_MS) continue;
        if (usedSigs.has(sigInfo.signature)) return { ok: false, error: 'signature already used' };
        const tx = await connection.getTransaction(sigInfo.signature, {
          commitment: COMMITMENT, maxSupportedTransactionVersion: 0,
        });
        if (!tx?.meta) continue;
        if (X402_REQUIRE_MEMO) {
          const memoCheck = validateMemo(extractMemo(tx), requestPath);
          if (!memoCheck.ok) return { ok: false, error: memoCheck.error };
        }
        const accountKeys = tx.transaction.message.staticAccountKeys ?? tx.transaction.message.accountKeys;
        const idx = accountKeys.findIndex(k => k.toBase58() === TREASURY_ADDR);
        if (idx < 0) continue;
        const received = (tx.meta.postBalances[idx] ?? 0) - (tx.meta.preBalances[idx] ?? 0);
        if (received >= expectedLamports) {
          console.log(`[x402] Verified: ${amountSol} SOL from ${playerPubkeyStr}`);
          usedSigs.set(sigInfo.signature, Date.now() + 120_000);
          return { ok: true, sig: sigInfo.signature, received };
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
    '/x402/extra-action':  0.01,
    '/x402/scout-peek':    0.005,
    '/x402/counter-peek':  0.003,
  };
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
      const paymentRequired = Buffer.from(JSON.stringify({
        version: 'x402-v2',
        accepts: [{
          scheme:  'solana-transfer',
          network: SOLANA_NETWORK,
          amount:  String(amountLamports),
          payTo:   TREASURY_ADDR,
        }],
      })).toString('base64');
      res.setHeader('PAYMENT-REQUIRED',    paymentRequired);
      res.setHeader('X-Payment-Recipient', TREASURY_ADDR);
      res.setHeader('X-Payment-Amount',    String(amountLamports));
      res.setHeader('X-Payment-Network',   SOLANA_NETWORK);
      res.writeHead(402, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: false, error: result.error }));
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
  console.log(`x402 memo binding: ${X402_REQUIRE_MEMO ? 'REQUIRED' : 'disabled (set X402_REQUIRE_MEMO=true to enforce)'}`);
  console.log('All game state is on-chain. Server holds no game authority.');
});

wss = new WebSocketServer({ server: httpServer });

// GC every 30s: usedSigs (120s TTL) + expired rateLimits windows + roundClaims (5m TTL)
const _sigGcInterval = setInterval(() => {
  const now = Date.now();
  usedSigs.forEach((expiry, sig) => { if (expiry < now) usedSigs.delete(sig); });
  rateLimits.forEach((entry, ip) => { if (now - entry.windowStart >= HTTP_RATE_WINDOW) rateLimits.delete(ip); });
  gcRoundClaims(300_000);
}, 30_000);
process.on('exit', () => clearInterval(_sigGcInterval));

wss.on('connection', (ws) => {
  ws.playerId   = Math.random().toString(36).slice(2, 8);
  ws.roomId     = null;
  ws.playerName = 'Player';
  ws.wallet     = null;
  ws.clan       = null;
  ws.cardCount  = 0;
  ws.season     = 1;
  ws.isAlive    = true;
  initRateState(ws);

  ws.on('pong', () => { ws.isAlive = true; });

  ws.on('message', (data) => {
    if (data.length > MSG_SIZE_LIMIT) { send(ws, { type: 'error', message: 'Message too large' }); return; }
    let msg;
    try { msg = JSON.parse(data); } catch { send(ws, { type: 'error', message: 'Invalid JSON' }); return; }
    if (rateLimited(ws, msg.type === 'submit_tx')) return;
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

/**
 * 0xARK Multiplayer WebSocket Server — Pure Relayer (Phase 2)
 *
 * Architecture: The Solana program is the single source of truth for all game
 * state (round, commits, reveals, card ownership, winner). This server is a
 * stateless relay — it has zero authority over game logic. It:
 *
 *   1. Manages WebSocket connections and room presence (lobby only)
 *   2. Relays player movement with ZK proximity filter
 *   3. Submits client-signed transactions to the Solana RPC
 *   4. Broadcasts tx confirmations so clients know to refresh on-chain state
 *   5. Relays chat messages
 *
 * Protocol v2 (Phase D Reborn — adds Clan + card_count to presence)
 *   Backward-compatible: v1 clients that omit clan/card_count receive null/0 defaults.
 *
 *   Client→Server:
 *     {type:'create_room', gameId, name, wallet?, clan?, card_count?, season?}
 *     {type:'join_room', roomId, name, wallet?, clan?, card_count?, season?}
 *     {type:'move', x, y, area}
 *     {type:'presence_update', clan, card_count}   — update clan/count without moving (v2)
 *     {type:'submit_tx', txBase64, txType}          — base64-encoded signed tx
 *     {type:'chat', message}
 *
 *   Server→Client:
 *     {type:'room_created', roomId, gameId, playerId}
 *     {type:'room_joined', roomId, gameId, playerId, players}
 *     {type:'player_joined', player}                — player includes clan, card_count, season
 *     {type:'player_left', playerId}
 *     {type:'player_moved', playerId, x, y, area}
 *     {type:'presence_update', wallet, clan, card_count}  — clan/count changed (v2)
 *     {type:'tx_confirmed', sig, txType, playerId}
 *     {type:'tx_failed', error, txType, playerId}
 *     {type:'chat', playerId, name, message}
 *     {type:'error', message}
 *
 * Clans (v2): 'black_flag'|'sovereign_bourse'|'hollow_blade'|'iron_circle'|'nameless_silk'|null
 */

import http from 'http';
import { WebSocketServer } from 'ws';
import { Connection, VersionedTransaction, Transaction, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';

const PORT          = process.env.PORT || 3500;
const RPC_URL       = process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com';
const COMMITMENT    = 'confirmed';
// Game treasury address — receives x402 micropayments (devnet placeholder)
const TREASURY_ADDR = process.env.TREASURY_PUBKEY || '11111111111111111111111111111111';
// Verification: poll up to 10 times at 500ms each = 5 sec max
const X402_POLL_ATTEMPTS = 10;
const X402_POLL_MS       = 500;
// Max tx age for payment verification (60 sec)
const X402_MAX_AGE_MS    = 60_000;

// ─── x402 payment verification (Day 11) ─────────────────────────────────────
// Verifies a SOL transfer from playerPubkey to TREASURY_ADDR of >= amountSol
// within the last X402_MAX_AGE_MS. Uses confirmed signature list + tx data.
async function _verifyX402Payment(playerPubkeyStr, amountSol) {
  // Skip verification when treasury is default (devnet demo mode)
  if (!process.env.TREASURY_PUBKEY) {
    console.log(`[x402] No TREASURY_PUBKEY set — skipping real verification (demo mode)`);
    return { ok: true, demo: true };
  }
  try {
    const playerKey  = new PublicKey(playerPubkeyStr);
    const treasuryKey = new PublicKey(TREASURY_ADDR);
    const expectedLamports = Math.floor(amountSol * LAMPORTS_PER_SOL);

    // Poll for recent signatures from player
    for (let attempt = 0; attempt < X402_POLL_ATTEMPTS; attempt++) {
      const sigs = await connection.getSignaturesForAddress(playerKey, { limit: 10 }, COMMITMENT);
      const now  = Date.now();

      for (const sigInfo of sigs) {
        if (!sigInfo.blockTime) continue;
        const txAge = now - sigInfo.blockTime * 1000;
        if (txAge > X402_MAX_AGE_MS) continue; // too old
        if (sigInfo.err) continue; // failed tx

        const tx = await connection.getTransaction(sigInfo.signature, {
          commitment: COMMITMENT,
          maxSupportedTransactionVersion: 0,
        });
        if (!tx || !tx.meta) continue;

        // Check accounts: player is signer, treasury receives lamports
        const accountKeys = tx.transaction.message.staticAccountKeys || tx.transaction.message.accountKeys;
        const treasuryIdx = accountKeys.findIndex(k => k.toBase58() === TREASURY_ADDR);
        if (treasuryIdx < 0) continue;

        const preBalance  = tx.meta.preBalances[treasuryIdx] || 0;
        const postBalance = tx.meta.postBalances[treasuryIdx] || 0;
        const received    = postBalance - preBalance;

        if (received >= expectedLamports) {
          console.log(`[x402] Verified: ${amountSol} SOL from ${playerPubkeyStr} (sig=${sigInfo.signature.slice(0,8)}...)`);
          return { ok: true, sig: sigInfo.signature, received };
        }
      }

      if (attempt < X402_POLL_ATTEMPTS - 1) {
        await new Promise(r => setTimeout(r, X402_POLL_MS));
      }
    }
    return { ok: false, error: 'Payment not detected within 5 seconds' };
  } catch (err) {
    console.error('[x402] Verification error:', err.message);
    return { ok: false, error: 'Verification failed: ' + err.message };
  }
}

// ─── HTTP health-check server ─────────────────────────────────────────────────
// Railway / Render require an HTTP endpoint to verify the service is alive.
// WebSocket connections are upgraded from this same server.
// ─── x402 body reader ────────────────────────────────────────────────────────
function _readBody(req) {
  return new Promise((resolve) => {
    let data = '';
    req.on('data', chunk => { data += chunk; });
    req.on('end', () => {
      try { resolve(JSON.parse(data)); } catch { resolve({}); }
    });
  });
}

const httpServer = http.createServer(async (req, res) => {
  const setCORS = () => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  };

  if (req.method === 'OPTIONS') {
    setCORS(); res.writeHead(204); res.end(); return;
  }

  if (req.method === 'GET' && (req.url === '/' || req.url === '/health')) {
    setCORS();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'ok',
      rooms: rooms.size,
      connections: wss?.clients?.size ?? 0,
      rpc: RPC_URL,
    }));
    return;
  }

  // x402 Extra Action — 0.01 SOL (Day 11: real verification)
  if (req.method === 'POST' && req.url === '/x402/extra-action') {
    setCORS();
    const body = await _readBody(req);
    const result = await _verifyX402Payment(body.playerPubkey || '', 0.01);
    if (!result.ok) {
      res.writeHead(402, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: false, error: result.error || 'Payment required: 0.01 SOL' }));
      return;
    }
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true, action: body.action || 'unknown', sig: result.sig, demo: result.demo }));
    return;
  }

  // x402 Scout Peek — 0.005 SOL (Day 11: real verification)
  if (req.method === 'POST' && req.url === '/x402/scout-peek') {
    setCORS();
    const body = await _readBody(req);
    const result = await _verifyX402Payment(body.playerPubkey || '', 0.005);
    if (!result.ok) {
      res.writeHead(402, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: false, error: result.error || 'Payment required: 0.005 SOL' }));
      return;
    }
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true, sig: result.sig, demo: result.demo }));
    return;
  }

  // x402 Counter-peek — 0.003 SOL (Day 11: real verification)
  if (req.method === 'POST' && req.url === '/x402/counter-peek') {
    setCORS();
    const body = await _readBody(req);
    const result = await _verifyX402Payment(body.playerPubkey || '', 0.003);
    if (!result.ok) {
      res.writeHead(402, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: false, error: result.error || 'Payment required: 0.003 SOL' }));
      return;
    }
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true, sig: result.sig, demo: result.demo }));
    return;
  }

  res.writeHead(404); res.end('Not found');
});

const connection = new Connection(RPC_URL, COMMITMENT);
const rooms      = new Map();
let nextRoomId   = 1000;
let wss;

// ─── Rate limiting ────────────────────────────────────────────────────────────
// Prevents message floods and tx-relay abuse.
// Buckets reset every RATE_WINDOW_MS; max RATE_MAX messages per window.
const RATE_WINDOW_MS = 1_000; // 1 second
const RATE_MAX_MSG   = 20;    // max messages per second per connection
const RATE_MAX_TX    = 3;     // max submit_tx per second per connection
const MSG_SIZE_LIMIT = 32_768; // 32 KB max raw message size

function initRateState(ws) {
  ws._rateWindow  = Date.now();
  ws._rateMsg     = 0;
  ws._rateTx      = 0;
}

/** Returns true if the message should be dropped (rate exceeded). */
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

function generateRoomId() {
  return (nextRoomId++).toString(36).toUpperCase();
}

// Attach WebSocket to the HTTP server so both share the same port
// (required for Railway/Render which only expose a single port)
httpServer.listen(PORT, () => {
  console.log(`0xARK Multiplayer Server — HTTP+WS on port ${PORT}`);
  console.log(`Solana RPC: ${RPC_URL}`);
  console.log('All game state is on-chain. Server holds no game authority.');
});

wss = new WebSocketServer({ server: httpServer });

wss.on('connection', (ws) => {
  ws.playerId    = Math.random().toString(36).slice(2, 8);
  ws.roomId      = null;
  ws.playerName  = 'Player';
  ws.wallet      = null;   // v2: Solana pubkey string (optional)
  ws.clan        = null;   // v2: clan string or null
  ws.cardCount   = 0;      // v2: collected card species count
  ws.season      = 1;      // v2: current season number
  ws.isAlive     = true;
  initRateState(ws);

  ws.on('pong', () => { ws.isAlive = true; });

  ws.on('message', (data) => {
    // Size guard — drop oversized frames before parsing
    if (data.length > MSG_SIZE_LIMIT) {
      send(ws, { type: 'error', message: 'Message too large' });
      return;
    }
    let msg;
    try {
      msg = JSON.parse(data);
    } catch {
      send(ws, { type: 'error', message: 'Invalid JSON' });
      return;
    }
    // Rate limit — drop excess messages silently (no error response to avoid amplification)
    const isTx = msg.type === 'submit_tx';
    if (rateLimited(ws, isTx)) return;
    handleMessage(ws, msg);
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

// ─── Message handler ─────────────────────────────────────────────────────────

function _handleCreateRoom(ws, msg) {
  const roomId = generateRoomId();
  ws.playerName = typeof msg.name === 'string' ? msg.name.slice(0, 24) : 'Host';
  ws.wallet     = typeof msg.wallet === 'string' ? msg.wallet.slice(0, 44) : null;
  ws.clan       = sanitizeClan(msg.clan);
  ws.cardCount  = typeof msg.card_count === 'number' ? Math.max(0, msg.card_count | 0) : 0;
  ws.season     = typeof msg.season === 'number' ? msg.season | 0 : 1;
  ws.roomId     = roomId;
  const room = {
    id:      roomId,
    gameId:  msg.gameId ?? null,  // on-chain game_id (u64 as decimal string)
    host:    ws.playerId,
    players: new Map(),
  };
  room.players.set(ws.playerId, player(ws, 15, 13));
  rooms.set(roomId, room);
  send(ws, { type: 'room_created', roomId, gameId: room.gameId, playerId: ws.playerId });
}

function _handleJoinRoom(ws, msg) {
  const room = rooms.get(msg.roomId);
  if (!room) { send(ws, { type: 'error', message: 'Room not found' }); return; }
  ws.playerName = typeof msg.name === 'string' ? msg.name.slice(0, 24) : `Player ${room.players.size + 1}`;
  ws.wallet     = typeof msg.wallet === 'string' ? msg.wallet.slice(0, 44) : null;
  ws.clan       = sanitizeClan(msg.clan);
  ws.cardCount  = typeof msg.card_count === 'number' ? Math.max(0, msg.card_count | 0) : 0;
  ws.season     = typeof msg.season === 'number' ? msg.season | 0 : 1;
  ws.roomId     = msg.roomId;
  room.players.set(ws.playerId, player(ws, 20, 15));
  const playerList = serializePlayers(room);
  send(ws, { type: 'room_joined', roomId: msg.roomId, gameId: room.gameId, playerId: ws.playerId, players: playerList });
  broadcast(room, {
    type: 'player_joined',
    player: { id: ws.playerId, name: ws.playerName, wallet: ws.wallet,
              clan: ws.clan, card_count: ws.cardCount, season: ws.season,
              position: { x: 20, y: 15 } },
  }, ws.playerId);
}

function _handlePresenceUpdate(ws, msg) {
  // v2: clan or card_count changed without moving (e.g., after Shop purchase)
  const room = ws.roomId ? rooms.get(ws.roomId) : null;
  if (!room) return;
  if (msg.clan !== undefined) ws.clan = sanitizeClan(msg.clan);
  if (typeof msg.card_count === 'number') ws.cardCount = Math.max(0, msg.card_count | 0);
  const p = room.players.get(ws.playerId);
  if (p) { p.clan = ws.clan; p.card_count = ws.cardCount; }
  broadcast(room, { type: 'presence_update', wallet: ws.wallet, clan: ws.clan, card_count: ws.cardCount });
}

function _handleMove(ws, msg) {
  const room = ws.roomId ? rooms.get(ws.roomId) : null;
  if (!room) return;
  const p = room.players.get(ws.playerId);
  if (!p) return;
  // Sanitize: enforce numeric coordinates within map bounds (0–79)
  const nx = typeof msg.x === 'number' ? Math.max(0, Math.min(79, msg.x | 0)) : p.x;
  const ny = typeof msg.y === 'number' ? Math.max(0, Math.min(79, msg.y | 0)) : p.y;
  const na = typeof msg.area === 'number' ? Math.max(0, Math.min(5, msg.area | 0)) : p.area;
  p.x = nx; p.y = ny; p.area = na;
  // ZK fog-of-war: only send position to nearby players in the same area.
  // Town (area 0) is always fully visible.
  broadcastProximity(room, ws.playerId, { type: 'player_moved', playerId: ws.playerId, x: p.x, y: p.y, area: p.area });
}

async function _handleSubmitTx(ws, msg) {
  // The client builds and signs transactions locally using their wallet.
  // The server only forwards to the RPC — it never holds private keys.
  const room = ws.roomId ? rooms.get(ws.roomId) : null;
  if (!room) return;

  let txBuffer;
  try {
    txBuffer = Buffer.from(msg.txBase64, 'base64');
  } catch {
    send(ws, { type: 'tx_failed', error: 'Invalid base64 encoding', txType: msg.txType, playerId: ws.playerId });
    return;
  }

  // Support both versioned and legacy transactions
  let tx;
  try {
    tx = VersionedTransaction.deserialize(txBuffer);
  } catch {
    try {
      tx = Transaction.from(txBuffer);
    } catch {
      send(ws, { type: 'tx_failed', error: 'Cannot deserialize transaction', txType: msg.txType, playerId: ws.playerId });
      return;
    }
  }
  void tx; // deserialized for validation; sendRawTransaction takes the raw buffer

  try {
    const sig = await connection.sendRawTransaction(txBuffer, {
      skipPreflight: false,
      preflightCommitment: COMMITMENT,
      maxRetries: 3,
    });
    await connection.confirmTransaction(sig, COMMITMENT);
    // Notify all players so they know to re-fetch on-chain state
    broadcast(room, { type: 'tx_confirmed', sig, txType: msg.txType ?? 'unknown', playerId: ws.playerId });
  } catch (e) {
    const error = extractError(e);
    // Only the sender gets the error details; all others see the failure event
    send(ws, { type: 'tx_failed', error, txType: msg.txType ?? 'unknown', playerId: ws.playerId });
    broadcast(room, { type: 'tx_failed', error: 'Transaction failed', txType: msg.txType ?? 'unknown', playerId: ws.playerId }, ws.playerId);
  }
}

function _handleChat(ws, msg) {
  const room = ws.roomId ? rooms.get(ws.roomId) : null;
  if (!room) return;
  if (typeof msg.message !== 'string') return;
  const message = msg.message.slice(0, 200); // cap at 200 chars
  broadcast(room, { type: 'chat', playerId: ws.playerId, name: ws.playerName, message });
}

// ── T-D12-D: Duel sync protocol ────────────────────────────────────────────

function _handleDuelHandCommitted(ws, msg) {
  // Player committed their ZK hand — relay commitment hash to opponent (not proof or cards)
  const room = ws.roomId ? rooms.get(ws.roomId) : null;
  if (!room) return;
  const duelId = typeof msg.duel_id === 'string' ? msg.duel_id.slice(0, 64) : null;
  const round  = typeof msg.round === 'number' ? Math.max(1, Math.min(5, msg.round | 0)) : null;
  const commitmentHex = typeof msg.commitment_hex === 'string' ? msg.commitment_hex.slice(0, 64) : null;
  if (!duelId || round === null || !commitmentHex) return;
  broadcast(room, {
    type: 'duel_hand_committed',
    playerId: ws.playerId,
    duel_id: duelId,
    round,
    commitment_hex: commitmentHex,
  }, ws.playerId);
}

function _handleDuelHandRevealed(ws, msg) {
  // Player revealed their hand — relay card_ids + salt for verification
  const room = ws.roomId ? rooms.get(ws.roomId) : null;
  if (!room) return;
  const duelId  = typeof msg.duel_id === 'string' ? msg.duel_id.slice(0, 64) : null;
  const round   = typeof msg.round === 'number' ? Math.max(1, Math.min(5, msg.round | 0)) : null;
  const cardIds = Array.isArray(msg.card_ids) ? msg.card_ids.map(x => (x | 0) & 0xffff).slice(0, 10) : null;
  if (!duelId || round === null || !cardIds) return;
  broadcast(room, {
    type: 'duel_hand_revealed',
    playerId: ws.playerId,
    duel_id: duelId,
    round,
    card_ids: cardIds,
  }, ws.playerId);
}

function _handleDuelPhaseAdvance(ws, msg) {
  // Host signals a phase transition (summon→battle, battle→draw, etc.)
  const room = ws.roomId ? rooms.get(ws.roomId) : null;
  if (!room) return;
  if (room.host !== ws.playerId) return;
  const duelId = typeof msg.duel_id === 'string' ? msg.duel_id.slice(0, 64) : null;
  const phase  = typeof msg.phase === 'string' ? msg.phase.slice(0, 16) : null;
  const round  = typeof msg.round === 'number' ? Math.max(1, Math.min(5, msg.round | 0)) : null;
  if (!duelId || !phase || round === null) return;
  broadcast(room, { type: 'duel_phase_advance', duel_id: duelId, phase, round });
}

function _handleDuelBattleResolved(ws, msg) {
  // Host broadcasts battle result for the round
  const room = ws.roomId ? rooms.get(ws.roomId) : null;
  if (!room) return;
  if (room.host !== ws.playerId) return;
  const duelId  = typeof msg.duel_id === 'string' ? msg.duel_id.slice(0, 64) : null;
  const round   = typeof msg.round === 'number' ? Math.max(1, Math.min(5, msg.round | 0)) : null;
  const p1Delta = typeof msg.p1_hp_delta === 'number' ? msg.p1_hp_delta | 0 : 0;
  const p2Delta = typeof msg.p2_hp_delta === 'number' ? msg.p2_hp_delta | 0 : 0;
  if (!duelId || round === null) return;
  broadcast(room, {
    type: 'duel_battle_resolved',
    duel_id: duelId,
    round,
    p1_hp_delta: p1Delta,
    p2_hp_delta: p2Delta,
  });
}

function _handleDuelEnded(ws, msg) {
  // Notify room that duel is over, winner determined
  const room = ws.roomId ? rooms.get(ws.roomId) : null;
  if (!room) return;
  if (room.host !== ws.playerId) return;
  const duelId = typeof msg.duel_id === 'string' ? msg.duel_id.slice(0, 64) : null;
  const winner = typeof msg.winner === 'string' ? msg.winner.slice(0, 44) : null;
  if (!duelId) return;
  broadcast(room, { type: 'duel_ended', duel_id: duelId, winner });
}

const HANDLERS = {
  create_room:          _handleCreateRoom,
  join_room:            _handleJoinRoom,
  presence_update:      _handlePresenceUpdate,
  move:                 _handleMove,
  submit_tx:            _handleSubmitTx,
  chat:                 _handleChat,
  duel_hand_committed:  _handleDuelHandCommitted,
  duel_hand_revealed:   _handleDuelHandRevealed,
  duel_phase_advance:   _handleDuelPhaseAdvance,
  duel_battle_resolved: _handleDuelBattleResolved,
  duel_ended:           _handleDuelEnded,
};

async function handleMessage(ws, msg) {
  const h = HANDLERS[msg.type];
  if (h) await h(ws, msg);
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const VALID_CLANS = new Set(['black_flag','sovereign_bourse','hollow_blade','iron_circle','nameless_silk']);
function sanitizeClan(clan) {
  return (typeof clan === 'string' && VALID_CLANS.has(clan)) ? clan : null;
}

function player(ws, x, y) {
  return { id: ws.playerId, name: ws.playerName, wallet: ws.wallet,
           clan: ws.clan, card_count: ws.cardCount, season: ws.season, ws, x, y, area: 0 };
}

function serializePlayers(room) {
  return Array.from(room.players.values()).map(
    ({ id, name, wallet, clan, card_count, season, x, y, area }) =>
      ({ id, name, wallet, clan, card_count, season, position: { x, y }, area })
  );
}

function send(ws, msg) {
  if (ws.readyState === 1) ws.send(JSON.stringify(msg));
}

function broadcast(room, msg, excludeId) {
  const data = JSON.stringify(msg);
  room.players.forEach((p) => {
    if (p.id !== excludeId && p.ws.readyState === 1) p.ws.send(data);
  });
}

// ZK fog-of-war proximity filter.
// Town (area 0) is the safe zone — all positions visible.
// Dungeon positions only revealed within Manhattan distance ZK_VISIBLE_RADIUS.
const ZK_VISIBLE_RADIUS = 3;
function broadcastProximity(room, moverId, msg) {
  const mover = room.players.get(moverId);
  if (!mover) return;
  const data = JSON.stringify(msg);
  room.players.forEach((p) => {
    if (p.id === moverId || p.ws.readyState !== 1) return;
    const inTown = mover.area === 0 && p.area === 0;
    const dist   = Math.abs(mover.x - p.x) + Math.abs(mover.y - p.y);
    if (inTown || (mover.area === p.area && dist <= ZK_VISIBLE_RADIUS)) {
      p.ws.send(data);
    }
  });
}

function extractError(e) {
  if (!e) return 'Unknown error';
  // Solana SendTransactionError embeds logs
  if (e.logs) return e.logs.slice(-3).join(' | ');
  return e.message ?? String(e);
}

// (startup logs moved to httpServer.listen callback above)

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
 * Protocol:
 *   Client→Server:
 *     {type:'create_room', gameId, name}
 *     {type:'join_room', roomId, name}
 *     {type:'move', x, y, area}
 *     {type:'submit_tx', txBase64, txType}   — base64-encoded signed tx
 *     {type:'chat', message}
 *
 *   Server→Client:
 *     {type:'room_created', roomId, gameId, playerId}
 *     {type:'room_joined', roomId, gameId, playerId, players}
 *     {type:'player_joined', player}
 *     {type:'player_left', playerId}
 *     {type:'player_moved', playerId, x, y, area}
 *     {type:'tx_confirmed', sig, txType, playerId}
 *     {type:'tx_failed', error, txType, playerId}
 *     {type:'chat', playerId, name, message}
 *     {type:'error', message}
 */

import http from 'http';
import { WebSocketServer } from 'ws';
import { Connection, VersionedTransaction, Transaction } from '@solana/web3.js';

const PORT       = process.env.PORT || 3500;
const RPC_URL    = process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com';
const COMMITMENT = 'confirmed';

// ─── HTTP health-check server ─────────────────────────────────────────────────
// Railway / Render require an HTTP endpoint to verify the service is alive.
// WebSocket connections are upgraded from this same server.
const httpServer = http.createServer((req, res) => {
  if (req.method === 'GET' && (req.url === '/' || req.url === '/health')) {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'ok',
      rooms: rooms.size,
      connections: wss?.clients?.size ?? 0,
      rpc: RPC_URL,
    }));
  } else {
    res.writeHead(404);
    res.end('Not found');
  }
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

async function handleMessage(ws, msg) {
  switch (msg.type) {

    case 'create_room': {
      const roomId = generateRoomId();
      ws.playerName = typeof msg.name === 'string' ? msg.name.slice(0, 24) : 'Host';
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
      break;
    }

    case 'join_room': {
      const room = rooms.get(msg.roomId);
      if (!room) { send(ws, { type: 'error', message: 'Room not found' }); return; }
      ws.playerName = typeof msg.name === 'string' ? msg.name.slice(0, 24) : `Player ${room.players.size + 1}`;
      ws.roomId     = msg.roomId;
      room.players.set(ws.playerId, player(ws, 20, 15));

      const playerList = serializePlayers(room);
      send(ws, { type: 'room_joined', roomId: msg.roomId, gameId: room.gameId, playerId: ws.playerId, players: playerList });
      broadcast(room, { type: 'player_joined', player: { id: ws.playerId, name: ws.playerName } }, ws.playerId);
      break;
    }

    case 'move': {
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
      break;
    }

    case 'submit_tx': {
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
      break;
    }

    case 'chat': {
      const room = ws.roomId ? rooms.get(ws.roomId) : null;
      if (!room) return;
      if (typeof msg.message !== 'string') return;
      const message = msg.message.slice(0, 200); // cap at 200 chars
      broadcast(room, { type: 'chat', playerId: ws.playerId, name: ws.playerName, message });
      break;
    }
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function player(ws, x, y) {
  return { id: ws.playerId, name: ws.playerName, ws, x, y, area: 0 };
}

function serializePlayers(room) {
  return Array.from(room.players.values()).map(({ id, name, x, y, area }) => ({ id, name, x, y, area }));
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

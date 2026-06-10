// handlers/matchmaking.js — Simple in-memory matchmaking queue
// Protocol:
//   client → { type: 'matchmaking_enqueue', wallet, name, card_count }
//     server → { type: 'matchmaking_waiting', roomId }          (first player)
//     server → { type: 'matchmaking_matched', roomId, duelId, role, opponentWallet, opponentId } (both)
//   client → { type: 'matchmaking_cancel' }
//     server → { type: 'matchmaking_cancelled' }

import { Keypair } from '@solana/web3.js';
import { rooms, generateRoomId, player, send } from '../state.js';

const _queue = []; // [{ ws, roomId }]

export function _handleMatchmakingEnqueue(ws, msg) {
  ws.wallet     = typeof msg.wallet      === 'string' ? msg.wallet.slice(0, 44)       : (ws.wallet ?? null);
  ws.playerName = typeof msg.name        === 'string' ? msg.name.slice(0, 24)         : (ws.playerName ?? 'Player');
  ws.cardCount  = typeof msg.card_count  === 'number' ? Math.max(0, msg.card_count | 0) : (ws.cardCount ?? 0);

  // Evict stale/disconnected waiters
  for (let i = _queue.length - 1; i >= 0; i--) {
    if (_queue[i].ws.readyState !== 1) _queue.splice(i, 1);
  }

  // If already in queue, just re-send waiting status
  const already = _queue.find(e => e.ws === ws);
  if (already) {
    send(ws, { type: 'matchmaking_waiting', roomId: already.roomId });
    return;
  }

  const waiting = _queue.find(e => e.ws !== ws && e.ws.readyState === 1);
  if (waiting) {
    _queue.splice(_queue.indexOf(waiting), 1);
    const room = rooms.get(waiting.roomId);
    if (!room) {
      send(ws, { type: 'error', message: 'Room expired — please retry' });
      return;
    }
    ws.roomId = waiting.roomId;
    room.players.set(ws.playerId, player(ws, 20, 15));

    const duelId = Keypair.generate().publicKey.toBase58();

    send(waiting.ws, {
      type: 'matchmaking_matched', roomId: waiting.roomId, duelId,
      role: 'host', opponentWallet: ws.wallet, opponentId: ws.playerId,
    });
    send(ws, {
      type: 'matchmaking_matched', roomId: waiting.roomId, duelId,
      role: 'guest', opponentWallet: waiting.ws.wallet, opponentId: waiting.ws.playerId,
    });
  } else {
    const roomId = generateRoomId();
    ws.roomId = roomId;
    const room = { id: roomId, host: ws.playerId, players: new Map() };
    room.players.set(ws.playerId, player(ws, 15, 13));
    rooms.set(roomId, room);
    _queue.push({ ws, roomId });
    send(ws, { type: 'matchmaking_waiting', roomId });
  }
}

export function _handleMatchmakingCancel(ws, _msg) {
  const idx = _queue.findIndex(e => e.ws === ws);
  if (idx >= 0) _queue.splice(idx, 1);
  send(ws, { type: 'matchmaking_cancelled' });
}

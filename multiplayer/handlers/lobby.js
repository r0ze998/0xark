// handlers/lobby.js — Lobby: create_room, join_room, presence_update, chat

import nacl from 'tweetnacl';
import { PublicKey } from '@solana/web3.js';
import { rooms, generateRoomId, sanitizeClan, player, serializePlayers, send, broadcast } from '../state.js';

// ── C-3: wallet signature authentication ──────────────────────────────────────

export function _handleAuthVerify(ws, msg) {
  if (ws.authenticated) return;
  const { wallet, signature } = msg;
  if (!wallet || !signature || !ws.authChallenge) {
    send(ws, { type: 'auth_failed', reason: 'missing fields' });
    return;
  }
  try {
    const pk = new PublicKey(wallet);
    const challengeBytes = new TextEncoder().encode(ws.authChallenge);
    const sigBytes = Buffer.from(signature, 'base64');
    const valid = nacl.sign.detached.verify(challengeBytes, sigBytes, pk.toBytes());
    if (!valid) {
      send(ws, { type: 'auth_failed', reason: 'invalid signature' });
      return;
    }
    ws.wallet        = wallet;
    ws.authenticated = true;
    ws.authChallenge = null; // consumed — prevent replay
    send(ws, { type: 'auth_ok' });
  } catch {
    send(ws, { type: 'auth_failed', reason: 'verification error' });
  }
}

export function _handleCreateRoom(ws, msg) {
  if (!ws.authenticated) { send(ws, { type: 'error', msg: 'not authenticated' }); return; }
  const roomId = generateRoomId();
  ws.playerName = typeof msg.name === 'string' ? msg.name.slice(0, 24) : 'Host';
  ws.wallet     = typeof msg.wallet === 'string' ? msg.wallet.slice(0, 44) : null;
  ws.clan       = sanitizeClan(msg.clan);
  ws.cardCount  = typeof msg.card_count === 'number' ? Math.max(0, msg.card_count | 0) : 0;
  ws.season     = typeof msg.season === 'number' ? msg.season | 0 : 1;
  ws.roomId     = roomId;
  const room = {
    id:      roomId,
    gameId:  msg.gameId ?? null,
    host:    ws.playerId,
    players: new Map(),
  };
  room.players.set(ws.playerId, player(ws, 15, 13));
  rooms.set(roomId, room);
  send(ws, { type: 'room_created', roomId, gameId: room.gameId, playerId: ws.playerId });
}

export function _handleJoinRoom(ws, msg) {
  if (!ws.authenticated) { send(ws, { type: 'error', msg: 'not authenticated' }); return; }
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

export function _handlePresenceUpdate(ws, msg) {
  const room = ws.roomId ? rooms.get(ws.roomId) : null;
  if (!room) return;
  if (msg.clan !== undefined) ws.clan = sanitizeClan(msg.clan);
  if (typeof msg.card_count === 'number') ws.cardCount = Math.max(0, msg.card_count | 0);
  const p = room.players.get(ws.playerId);
  if (p) { p.clan = ws.clan; p.card_count = ws.cardCount; }
  broadcast(room, { type: 'presence_update', wallet: ws.wallet, clan: ws.clan, card_count: ws.cardCount });
}

export function _handleChat(ws, msg) {
  const room = ws.roomId ? rooms.get(ws.roomId) : null;
  if (!room) return;
  if (typeof msg.message !== 'string') return;
  const message = msg.message.slice(0, 200);
  broadcast(room, { type: 'chat', playerId: ws.playerId, name: ws.playerName, message });
}

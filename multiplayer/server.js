/**
 * 0xARK Multiplayer WebSocket Server
 *
 * Handles room management, player sync, and commit-reveal coordination.
 *
 * Usage: node server.js
 * Default port: 3500
 *
 * Protocol:
 *   Client→Server:
 *     {type:'create_room', name}
 *     {type:'join_room', roomId, name}
 *     {type:'start_game'}
 *     {type:'move', x, y, area}
 *     {type:'commit', hash}
 *     {type:'reveal', actionType, target, salt}
 *     {type:'chat', message}
 *
 *   Server→Client:
 *     {type:'room_created', roomId, playerId}
 *     {type:'room_joined', roomId, playerId, players}
 *     {type:'player_joined', player}
 *     {type:'player_left', playerId}
 *     {type:'game_started', players}
 *     {type:'player_moved', playerId, x, y, area}
 *     {type:'all_committed', round}
 *     {type:'all_revealed', actions}
 *     {type:'chat', playerId, name, message}
 *     {type:'error', message}
 */

import { WebSocketServer } from 'ws';

const PORT = process.env.PORT || 3500;
const rooms = new Map();
let nextRoomId = 1000;

function generateRoomId() {
  return (nextRoomId++).toString(36).toUpperCase();
}

const wss = new WebSocketServer({ port: PORT });

wss.on('connection', (ws) => {
  ws.playerId = Math.random().toString(36).slice(2, 8);
  ws.roomId = null;
  ws.playerName = 'Player';
  ws.isAlive = true;

  ws.on('pong', () => { ws.isAlive = true; });

  ws.on('message', (data) => {
    try {
      const msg = JSON.parse(data);
      handleMessage(ws, msg);
    } catch (e) {
      ws.send(JSON.stringify({ type: 'error', message: 'Invalid JSON' }));
    }
  });

  ws.on('close', () => {
    if (ws.roomId && rooms.has(ws.roomId)) {
      const room = rooms.get(ws.roomId);
      room.players.delete(ws.playerId);
      broadcast(room, { type: 'player_left', playerId: ws.playerId });
      if (room.players.size === 0) {
        rooms.delete(ws.roomId);
      }
    }
  });
});

// Heartbeat
setInterval(() => {
  wss.clients.forEach((ws) => {
    if (!ws.isAlive) return ws.terminate();
    ws.isAlive = false;
    ws.ping();
  });
}, 30000);

function handleMessage(ws, msg) {
  switch (msg.type) {
    case 'create_room': {
      const roomId = generateRoomId();
      ws.playerName = msg.name || 'Host';
      ws.roomId = roomId;
      const room = {
        id: roomId,
        host: ws.playerId,
        players: new Map(),
        state: 'lobby', // lobby, playing, finished
        round: 0,
        commits: new Map(),
        reveals: new Map(),
      };
      room.players.set(ws.playerId, {
        id: ws.playerId,
        name: ws.playerName,
        ws,
        x: 15, y: 13, area: 0,
        cardCount: 0,
      });
      rooms.set(roomId, room);
      ws.send(JSON.stringify({
        type: 'room_created',
        roomId,
        playerId: ws.playerId,
      }));
      break;
    }

    case 'join_room': {
      const room = rooms.get(msg.roomId);
      if (!room) {
        ws.send(JSON.stringify({ type: 'error', message: 'Room not found' }));
        return;
      }
      if (room.players.size >= 3) {
        ws.send(JSON.stringify({ type: 'error', message: 'Room full' }));
        return;
      }
      if (room.state !== 'lobby') {
        ws.send(JSON.stringify({ type: 'error', message: 'Game already started' }));
        return;
      }
      ws.playerName = msg.name || `Player ${room.players.size + 1}`;
      ws.roomId = msg.roomId;
      const playerData = {
        id: ws.playerId,
        name: ws.playerName,
        ws,
        x: 20, y: 15, area: 0,
        cardCount: 0,
      };
      room.players.set(ws.playerId, playerData);

      const playerList = Array.from(room.players.values()).map(p => ({
        id: p.id, name: p.name, x: p.x, y: p.y, area: p.area,
      }));
      ws.send(JSON.stringify({
        type: 'room_joined',
        roomId: msg.roomId,
        playerId: ws.playerId,
        players: playerList,
      }));
      broadcast(room, {
        type: 'player_joined',
        player: { id: ws.playerId, name: ws.playerName },
      }, ws.playerId);
      break;
    }

    case 'start_game': {
      const room = rooms.get(ws.roomId);
      if (!room || room.host !== ws.playerId) return;
      if (room.players.size < 2) {
        ws.send(JSON.stringify({ type: 'error', message: 'Need 2+ players' }));
        return;
      }
      room.state = 'playing';
      room.round = 1;
      const players = Array.from(room.players.values()).map(p => ({
        id: p.id, name: p.name,
      }));
      broadcast(room, { type: 'game_started', players });
      break;
    }

    case 'move': {
      const room = rooms.get(ws.roomId);
      if (!room) return;
      const player = room.players.get(ws.playerId);
      if (player) {
        player.x = msg.x;
        player.y = msg.y;
        player.area = msg.area;
        broadcast(room, {
          type: 'player_moved',
          playerId: ws.playerId,
          x: msg.x, y: msg.y, area: msg.area,
        }, ws.playerId);
      }
      break;
    }

    case 'commit': {
      const room = rooms.get(ws.roomId);
      if (!room || room.state !== 'playing') return;
      room.commits.set(ws.playerId, msg.hash);
      if (room.commits.size === room.players.size) {
        broadcast(room, { type: 'all_committed', round: room.round });
      }
      break;
    }

    case 'reveal': {
      const room = rooms.get(ws.roomId);
      if (!room || room.state !== 'playing') return;
      room.reveals.set(ws.playerId, {
        actionType: msg.actionType,
        target: msg.target,
        salt: msg.salt,
      });
      if (room.reveals.size === room.players.size) {
        const actions = {};
        room.reveals.forEach((v, k) => { actions[k] = v; });
        broadcast(room, { type: 'all_revealed', actions, round: room.round });
        room.round++;
        room.commits.clear();
        room.reveals.clear();
      }
      break;
    }

    case 'chat': {
      const room = rooms.get(ws.roomId);
      if (!room) return;
      broadcast(room, {
        type: 'chat',
        playerId: ws.playerId,
        name: ws.playerName,
        message: msg.message,
      });
      break;
    }
  }
}

function broadcast(room, msg, excludeId) {
  const data = JSON.stringify(msg);
  room.players.forEach((p) => {
    if (p.id !== excludeId && p.ws.readyState === 1) {
      p.ws.send(data);
    }
  });
}

console.log(`0xARK Multiplayer Server running on ws://localhost:${PORT}`);
console.log('Waiting for connections...');

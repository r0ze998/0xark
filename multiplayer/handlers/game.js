// handlers/game.js — Movement with ZK fog-of-war proximity filter

import { rooms, broadcastProximity } from '../state.js';

export function _handleMove(ws, msg) {
  const room = ws.roomId ? rooms.get(ws.roomId) : null;
  if (!room) return;
  const p = room.players.get(ws.playerId);
  if (!p) return;
  const nx = typeof msg.x    === 'number' ? Math.max(0, Math.min(79, msg.x    | 0)) : p.x;
  const ny = typeof msg.y    === 'number' ? Math.max(0, Math.min(79, msg.y    | 0)) : p.y;
  const na = typeof msg.area === 'number' ? Math.max(0, Math.min(5,  msg.area | 0)) : p.area;
  p.x = nx; p.y = ny; p.area = na;
  broadcastProximity(room, ws.playerId, { type: 'player_moved', playerId: ws.playerId, x: p.x, y: p.y, area: p.area });
}

// handlers/sync.js — Duel protocol relay (T-D12-D)
// Relays ZK commitment/reveal and host-gated phase/result/end events.

import { rooms, broadcast } from '../state.js';

export function _handleDuelHandCommitted(ws, msg) {
  const room = ws.roomId ? rooms.get(ws.roomId) : null;
  if (!room) return;
  const duelId        = typeof msg.duel_id        === 'string' ? msg.duel_id.slice(0, 64)        : null;
  const round         = typeof msg.round          === 'number' ? Math.max(1, Math.min(5, msg.round | 0)) : null;
  const commitmentHex = typeof msg.commitment_hex === 'string' ? msg.commitment_hex.slice(0, 64) : null;
  if (!duelId || round === null || !commitmentHex) return;
  broadcast(room, { type: 'duel_hand_committed', playerId: ws.playerId, duel_id: duelId, round, commitment_hex: commitmentHex }, ws.playerId);
}

export function _handleDuelHandRevealed(ws, msg) {
  const room = ws.roomId ? rooms.get(ws.roomId) : null;
  if (!room) return;
  const duelId  = typeof msg.duel_id   === 'string' ? msg.duel_id.slice(0, 64) : null;
  const round   = typeof msg.round     === 'number' ? Math.max(1, Math.min(5, msg.round | 0)) : null;
  const cardIds = Array.isArray(msg.card_ids) ? msg.card_ids.map(x => (x | 0) & 0xffff).slice(0, 10) : null;
  if (!duelId || round === null || !cardIds) return;
  broadcast(room, { type: 'duel_hand_revealed', playerId: ws.playerId, duel_id: duelId, round, card_ids: cardIds }, ws.playerId);
}

export function _handleDuelPhaseAdvance(ws, msg) {
  const room = ws.roomId ? rooms.get(ws.roomId) : null;
  if (!room || room.host !== ws.playerId) return;
  const duelId = typeof msg.duel_id === 'string' ? msg.duel_id.slice(0, 64)  : null;
  const phase  = typeof msg.phase   === 'string' ? msg.phase.slice(0, 16)    : null;
  const round  = typeof msg.round   === 'number' ? Math.max(1, Math.min(5, msg.round | 0)) : null;
  if (!duelId || !phase || round === null) return;
  broadcast(room, { type: 'duel_phase_advance', duel_id: duelId, phase, round });
}

export function _handleDuelBattleResolved(ws, msg) {
  const room = ws.roomId ? rooms.get(ws.roomId) : null;
  if (!room || room.host !== ws.playerId) return;
  const duelId  = typeof msg.duel_id      === 'string' ? msg.duel_id.slice(0, 64) : null;
  const round   = typeof msg.round        === 'number' ? Math.max(1, Math.min(5, msg.round | 0)) : null;
  const p1Delta = typeof msg.p1_hp_delta  === 'number' ? msg.p1_hp_delta | 0 : 0;
  const p2Delta = typeof msg.p2_hp_delta  === 'number' ? msg.p2_hp_delta | 0 : 0;
  if (!duelId || round === null) return;
  broadcast(room, { type: 'duel_battle_resolved', duel_id: duelId, round, p1_hp_delta: p1Delta, p2_hp_delta: p2Delta });
}

export function _handleDuelEnded(ws, msg) {
  const room = ws.roomId ? rooms.get(ws.roomId) : null;
  if (!room || room.host !== ws.playerId) return;
  const duelId = typeof msg.duel_id === 'string' ? msg.duel_id.slice(0, 64)  : null;
  const winner = typeof msg.winner  === 'string' ? msg.winner.slice(0, 44)   : null;
  if (!duelId) return;
  broadcast(room, { type: 'duel_ended', duel_id: duelId, winner });
}

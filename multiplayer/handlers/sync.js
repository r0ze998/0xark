// handlers/sync.js — Duel protocol relay (Phase 11: γ damage verification)
// Relays ZK commitment/reveal and host-gated phase/result/end events.
// Phase 11 adds cross-client damage consensus: both host and non-host submit
// their computed p1/p2 HP deltas; mismatch triggers duel_violation broadcast.

import { rooms, broadcast, roundClaims, violationLog, recordViolation } from '../state.js';

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

// ── Phase 11: damage claim from non-host ──────────────────────────────────────
// Non-host players send their independently computed HP deltas.
// If the host's duel_battle_resolved arrives first (already in roundClaims),
// we cross-check immediately. Otherwise we store and check when host sends.

export function _handleDuelDamageClaim(ws, msg) {
  const room = ws.roomId ? rooms.get(ws.roomId) : null;
  if (!room || room.host === ws.playerId) return; // host uses duel_battle_resolved
  const duelId  = typeof msg.duel_id      === 'string' ? msg.duel_id.slice(0, 64) : null;
  const round   = typeof msg.round        === 'number' ? Math.max(1, Math.min(5, msg.round | 0)) : null;
  const p1Delta = typeof msg.p1_hp_delta  === 'number' ? msg.p1_hp_delta | 0 : null;
  const p2Delta = typeof msg.p2_hp_delta  === 'number' ? msg.p2_hp_delta | 0 : null;
  if (!duelId || round === null || p1Delta === null || p2Delta === null) return;

  const key = `${duelId}:${round}`;
  if (!roundClaims.has(key)) roundClaims.set(key, new Map());
  const claimMap = roundClaims.get(key);
  claimMap._ts = Date.now();
  claimMap.set(ws.playerId, { p1HpDelta: p1Delta, p2HpDelta: p2Delta });

  // Cross-check if host claim is already stored
  const hostClaim = claimMap.get(room.host);
  if (hostClaim) {
    _checkConsensus(room, duelId, round, room.host, ws.playerId, hostClaim, { p1HpDelta: p1Delta, p2HpDelta: p2Delta });
  }
}

export function _handleDuelBattleResolved(ws, msg) {
  const room = ws.roomId ? rooms.get(ws.roomId) : null;
  if (!room || room.host !== ws.playerId) return;
  const duelId  = typeof msg.duel_id      === 'string' ? msg.duel_id.slice(0, 64) : null;
  const round   = typeof msg.round        === 'number' ? Math.max(1, Math.min(5, msg.round | 0)) : null;
  const p1Delta = typeof msg.p1_hp_delta  === 'number' ? msg.p1_hp_delta | 0 : 0;
  const p2Delta = typeof msg.p2_hp_delta  === 'number' ? msg.p2_hp_delta | 0 : 0;
  if (!duelId || round === null) return;

  const hostClaim = { p1HpDelta: p1Delta, p2HpDelta: p2Delta };

  // Store host claim
  const key = `${duelId}:${round}`;
  if (!roundClaims.has(key)) roundClaims.set(key, new Map());
  const claimMap = roundClaims.get(key);
  claimMap._ts = Date.now();
  claimMap.set(ws.playerId, hostClaim);

  // Cross-check against any non-host claims already received
  let violated = false;
  for (const [claimantId, claimantDelta] of claimMap) {
    if (claimantId === '_ts' || claimantId === ws.playerId) continue;
    const mismatch = _checkConsensus(room, duelId, round, ws.playerId, claimantId, hostClaim, claimantDelta);
    if (mismatch) { violated = true; break; }
  }

  if (!violated) {
    broadcast(room, { type: 'duel_battle_resolved', duel_id: duelId, round, p1_hp_delta: p1Delta, p2_hp_delta: p2Delta });
  }
}

// Returns true if violation detected, false if consensus
function _checkConsensus(room, duelId, round, hostId, claimantId, hostClaim, claimantDelta) {
  const match =
    hostClaim.p1HpDelta === claimantDelta.p1HpDelta &&
    hostClaim.p2HpDelta === claimantDelta.p2HpDelta;

  if (!match) {
    recordViolation(duelId, {
      round,
      hostId,
      claimantId,
      hostDelta:      hostClaim,
      claimantDelta,
    });
    broadcast(room, {
      type:          'duel_violation',
      duel_id:       duelId,
      round,
      host_delta:    hostClaim,
      claimant_delta: claimantDelta,
    });
    return true;
  }
  return false;
}

export function _handleDuelEnded(ws, msg) {
  const room = ws.roomId ? rooms.get(ws.roomId) : null;
  if (!room || room.host !== ws.playerId) return;
  const duelId = typeof msg.duel_id === 'string' ? msg.duel_id.slice(0, 64)  : null;
  const winner = typeof msg.winner  === 'string' ? msg.winner.slice(0, 44)   : null;
  if (!duelId) return;
  broadcast(room, { type: 'duel_ended', duel_id: duelId, winner });
}

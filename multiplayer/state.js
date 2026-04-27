// multiplayer/state.js — Shared mutable state and pure helpers
// Imported by all handler modules. Server.js owns wss after init.

import { Connection } from '@solana/web3.js';

export const RPC_URL    = process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com';
export const COMMITMENT = 'confirmed';

export const connection = new Connection(RPC_URL, COMMITMENT);
export const rooms      = new Map();
export let nextRoomId   = 1000;

export function generateRoomId() {
  return (nextRoomId++).toString(36).toUpperCase();
}

// ─── Clan validation ──────────────────────────────────────────────────────────

const VALID_CLANS = new Set(['black_flag','sovereign_bourse','hollow_blade','iron_circle','nameless_silk']);
export function sanitizeClan(clan) {
  return (typeof clan === 'string' && VALID_CLANS.has(clan)) ? clan : null;
}

// ─── Player record ────────────────────────────────────────────────────────────

export function player(ws, x, y) {
  return { id: ws.playerId, name: ws.playerName, wallet: ws.wallet,
           clan: ws.clan, card_count: ws.cardCount, season: ws.season, ws, x, y, area: 0 };
}

export function serializePlayers(room) {
  return Array.from(room.players.values()).map(
    ({ id, name, wallet, clan, card_count, season, x, y, area }) =>
      ({ id, name, wallet, clan, card_count, season, position: { x, y }, area })
  );
}

// ─── Messaging ────────────────────────────────────────────────────────────────

export function send(ws, msg) {
  if (ws.readyState === 1) ws.send(JSON.stringify(msg));
}

export function broadcast(room, msg, excludeId) {
  const data = JSON.stringify(msg);
  room.players.forEach((p) => {
    if (p.id !== excludeId && p.ws.readyState === 1) p.ws.send(data);
  });
}

// ZK fog-of-war: town (area 0) always visible; dungeon uses Manhattan radius.
const ZK_VISIBLE_RADIUS = 3;
export function broadcastProximity(room, moverId, msg) {
  const mover = room.players.get(moverId);
  if (!mover) return;
  const data = JSON.stringify(msg);
  room.players.forEach((p) => {
    if (p.id === moverId || p.ws.readyState !== 1) return;
    const inTown = mover.area === 0 && p.area === 0;
    const dist   = Math.abs(mover.x - p.x) + Math.abs(mover.y - p.y);
    if (inTown || (mover.area === p.area && dist <= ZK_VISIBLE_RADIUS)) p.ws.send(data);
  });
}

// ─── Error extraction ─────────────────────────────────────────────────────────

export function extractError(e) {
  if (!e) return 'Unknown error';
  if (e.logs) return e.logs.slice(-3).join(' | ');
  return e.message ?? String(e);
}

// ─── x402 replay prevention ────────────────────────────────────────────────────
// sig → expiryTimestamp (ms). GC'd by server.js setInterval every 30s.
export const usedSigs = new Map();

// ─── HTTP rate limiting ───────────────────────────────────────────────────────
// ip → { count, windowStart }. GC'd alongside usedSigs every 30s.
export const rateLimits = new Map();

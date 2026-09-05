// duel-ws.js — WebSocket client for the duel/matchmaking protocol
// Wraps the multiplayer server's room + duel message protocol.
// All send functions no-op gracefully if WebSocket is not connected.

import { isPractice } from './practice-mode.js';

let _ws = null;
const _listeners = new Map(); // type → Set<fn>

function _wsUrl() {
  if (localStorage.getItem('oxark_ws_url')) return localStorage.getItem('oxark_ws_url');
  if (window.OXARK_WS_URL) return window.OXARK_WS_URL;
  const h = window.location.hostname;
  if (h === 'localhost' || h === '127.0.0.1') return 'ws://localhost:3500';
  return 'wss://oxark-multiplayer.fly.dev';
}

// ── Connection ────────────────────────────────────────────────────────────────

export function connect() {
  if (isPractice) return Promise.reject(new Error('Live matchmaking is disabled in practice.'));
  if (_ws && (_ws.readyState === 0 || _ws.readyState === 1)) return Promise.resolve();
  return new Promise((resolve, reject) => {
    _ws = new WebSocket(_wsUrl());
    const timer = setTimeout(() => reject(new Error('WS connect timeout')), 5000);
    _ws.onopen    = () => { clearTimeout(timer); resolve(); };
    _ws.onerror   = () => { clearTimeout(timer); reject(new Error('WS connection failed')); };
    _ws.onmessage = (e) => {
      let msg;
      try { msg = JSON.parse(e.data); } catch { return; }
      if (msg.type === 'auth_challenge') {
        _handleAuthChallenge(msg.challenge).catch(err => {
          console.error('[auth] challenge handling failed', err);
        });
        return;
      }
      _dispatch(msg);
    };
    _ws.onclose   = () => _dispatch({ type: 'ws_closed' });
  });
}

async function _handleAuthChallenge(challenge) {
  if (!window.solana?.signMessage) {
    console.warn('[auth] window.solana.signMessage not available — wallet auth skipped');
    return;
  }
  try {
    const encoded = new TextEncoder().encode(challenge);
    const { signature } = await window.solana.signMessage(encoded, 'utf8');
    const sigB64 = btoa(String.fromCharCode(...signature));
    send({ type: 'auth_verify', wallet: window.solana.publicKey.toBase58(), signature: sigB64 });
  } catch (e) {
    console.error('[auth] signMessage failed', e);
  }
}

export function disconnect() {
  _ws?.close();
  _ws = null;
}

export function isConnected() {
  return _ws?.readyState === 1; // WebSocket.OPEN
}

// ── Event bus ─────────────────────────────────────────────────────────────────

// Returns an unsubscribe function.
export function on(type, fn) {
  if (!_listeners.has(type)) _listeners.set(type, new Set());
  _listeners.get(type).add(fn);
  return () => _listeners.get(type)?.delete(fn);
}

export function send(msg) {
  if (isPractice) return;
  if (_ws?.readyState === 1) _ws.send(JSON.stringify(msg));
}

function _dispatch(msg) {
  _listeners.get(msg.type)?.forEach(fn => fn(msg));
  _listeners.get('*')?.forEach(fn => fn(msg));
}

// ── Matchmaking ───────────────────────────────────────────────────────────────

export function enqueueMatchmaking({ wallet, name, card_count } = {}) {
  send({ type: 'matchmaking_enqueue', wallet, name, card_count });
}

export function cancelMatchmaking() {
  send({ type: 'matchmaking_cancel' });
}

// ── Duel protocol ─────────────────────────────────────────────────────────────

export function sendHandCommitted(duelId, round, commitmentHex, zkMeta = {}) {
  send({
    type: 'duel_hand_committed',
    duel_id: duelId,
    round,
    commitment_hex: commitmentHex,
    zk_has_proof: zkMeta.zkHasProof ?? false,
    zk_public_signals: zkMeta.zkPublicSignals ?? null,
  });
}

export function sendHandRevealed(duelId, round, cardIds, actionTypes, zkTxHash = null) {
  send({
    type: 'duel_hand_revealed',
    duel_id: duelId,
    round,
    card_ids: cardIds,
    action_types: actionTypes ?? [],
    zk_tx_hash: zkTxHash,
  });
}

// Host-only: broadcast battle result to all room players (server relays back to both).
export function sendBattleResolved(duelId, round, p1BpTotal, p2BpTotal, winner) {
  send({ type: 'duel_battle_resolved', duel_id: duelId, round, p1_hp_delta: p1BpTotal, p2_hp_delta: p2BpTotal, winner });
}

// Non-host: submit local damage claim for Phase-11 consensus verification.
export function sendDamageClaim(duelId, round, p1BpTotal, p2BpTotal) {
  send({ type: 'duel_damage_claim', duel_id: duelId, round, p1_hp_delta: p1BpTotal, p2_hp_delta: p2BpTotal });
}

// Host-only: announce match end.
export function sendDuelEnded(duelId, winner) {
  send({ type: 'duel_ended', duel_id: duelId, winner });
}

// ── Cryptographic helpers ─────────────────────────────────────────────────────

// SHA-256 of concatenated card IDs (1 byte each) + 32-byte salt.
// Returns raw Uint8Array (32 bytes).
export async function computeHandCommitment(cardIds, salt) {
  const data = new Uint8Array(cardIds.length + salt.length);
  cardIds.forEach((id, i) => { data[i] = id & 0xff; });
  data.set(salt, cardIds.length);
  const buf = await crypto.subtle.digest('SHA-256', data);
  return new Uint8Array(buf);
}

export function toHex(bytes) {
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

export function generateSalt() {
  const salt = new Uint8Array(32);
  crypto.getRandomValues(salt);
  salt[0] &= 0x1f; // clamp to Poseidon field size
  return salt;
}

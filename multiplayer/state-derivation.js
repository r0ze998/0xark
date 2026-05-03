// state-derivation.js — pure deterministic game state reconstruction (Phase 12 ε-full)
// ESM module. Given a sequence of compact memos, derives the authoritative match state.

import { parseCompactMemo } from './memo-validator.js';

export { parseCompactMemo };

// ─── Initial state ────────────────────────────────────────────────────────────

/**
 * Create an empty match state (starting point for reduction).
 */
export function emptyMatchState() {
  return {
    matchId:  null,
    status:   'lobby',   // lobby | commit | reveal | resolve | finished
    round:    0,
    host:     null,
    players:  {},        // pubkey → PlayerState (see _initPlayer)
    rounds:   [],        // completed RoundRecord[]
    winner:   null,
    lastSlot: 0,
    history:  [],
  };
}

/**
 * Derive game state by reducing an ordered memo list.
 *
 * @param {Array<{memo: string|object, sender: string, slot?: number}>} memoList
 * @returns {GameState}
 */
export function deriveGameState(memoList) {
  return memoList.reduce((state, entry) => {
    const fields = typeof entry.memo === 'string'
      ? parseCompactMemo(entry.memo)
      : (entry.memo ?? {});
    return applyMove(state, fields, entry.sender ?? '', entry.slot ?? 0);
  }, emptyMatchState());
}

/**
 * Apply one parsed memo to the current state.
 * Violations leave the state unchanged (idempotent no-op).
 *
 * @param {GameState} state
 * @param {object}    fields   parsed memo key-value map
 * @param {string}    sender   tx signer pubkey
 * @param {number}    slot     tx slot (for ordering)
 * @returns {GameState}
 */
export function applyMove(state, fields, sender, slot = 0) {
  const ep = fields.e;
  if (!ep) return state;

  switch (ep) {
    case '/x402/co': return _applyCommit(state, fields, sender, slot);
    case '/x402/re': return _applyReveal(state, fields, sender, slot);
    case '/x402/hc': return _applyHandCommit(state, fields, sender, slot);
    case '/x402/hr': return _applyHandReveal(state, fields, sender, slot);
    case '/x402/pa': return _applyPhaseAdvance(state, fields, sender, slot);
    case '/x402/rs': return _applyRoundResolve(state, fields, sender, slot);
    case '/x402/me': return _applyMatchEnd(state, fields, sender, slot);
    default: return state;
  }
}

// ─── Per-move applicators ─────────────────────────────────────────────────────

function _applyCommit(state, fields, sender, slot) {
  if (state.status !== 'commit') return state;          // wrong phase
  if (state.players[sender]?.committed) return state;   // already committed

  const s = _clone(state, slot);
  if (s.matchId === null && fields.m) s.matchId = fields.m;
  if (!s.players[sender]) s.players[sender] = _initPlayer();
  const commitSource = fields.i === 'ai' ? 'ai' : 'self';
  s.players[sender] = { ...s.players[sender], committed: true, identitySource: commitSource };
  s.history.push({ round: s.round, player: sender, action: 'commit', identity_source: commitSource, slot });
  return s;
}

function _applyReveal(state, fields, sender, slot) {
  if (state.status !== 'reveal') return state;
  const p = state.players[sender];
  if (!p?.committed || p.revealed) return state;        // wrong order

  const s   = _clone(state, slot);
  const a   = parseInt(fields.a, 10);
  const revealSource = fields.i === 'ai' ? 'ai' : 'self';
  s.players[sender] = {
    ...s.players[sender],
    revealed:        true,
    actionType:      isNaN(a) ? null : a,
    identitySource:  revealSource,
  };
  s.history.push({ round: s.round, player: sender, action: 'reveal', identity_source: revealSource, slot });
  return s;
}

function _applyHandCommit(state, fields, sender, slot) {
  const s = _clone(state, slot);
  if (s.matchId === null && fields.m) s.matchId = fields.m;
  if (!s.players[sender]) s.players[sender] = _initPlayer();
  s.players[sender] = { ...s.players[sender], handCommitment: fields.c ?? null };
  return s;
}

function _applyHandReveal(state, fields, sender, slot) {
  const s = _clone(state, slot);
  if (!s.players[sender]) s.players[sender] = _initPlayer();
  const hand = fields.i ? fields.i.split(',').map(x => parseInt(x, 10) | 0) : [];
  s.players[sender] = { ...s.players[sender], hand };
  return s;
}

function _applyPhaseAdvance(state, fields, sender, slot) {
  const host = state.host ?? sender; // first pa sender becomes host
  if (host !== sender) return state; // not host

  const phase = fields.p;
  let { status, round } = state;
  const players = { ...state.players };

  switch (phase) {
    case 'd':  // begin commit phase (next round)
      round++;
      status = 'commit';
      for (const pk of Object.keys(players)) {
        players[pk] = { ...players[pk], committed: false, revealed: false, actionType: null };
      }
      break;
    case 'e':  // begin reveal phase
      if (status !== 'commit') return state;
      status = 'reveal';
      break;
    case 's':  // resolve/settle
      if (status !== 'reveal') return state;
      status = 'resolve';
      break;
    case 'b':  // back to commit (next round boundary)
      status = 'commit';
      break;
    default:
      return state;
  }

  const s = _clone(state, slot);
  if (s.matchId === null && fields.m) s.matchId = fields.m;
  s.host    = host;
  s.round   = round;
  s.status  = status;
  s.players = players;
  return s;
}

function _applyRoundResolve(state, fields, sender, slot) {
  const host = state.host ?? sender;
  if (host !== sender) return state; // not host

  if (!fields.d) return state;
  const parts = fields.d.split('/');
  if (parts.length !== 2) return state;
  const p1Delta = parseInt(parts[0], 10);
  const p2Delta = parseInt(parts[1], 10);
  if (isNaN(p1Delta) || isNaN(p2Delta)) return state;

  const s   = _clone(state, slot);
  s.host    = host;
  const pks = Object.keys(s.players);
  if (pks[0]) s.players[pks[0]] = { ...s.players[pks[0]], hp: s.players[pks[0]].hp + p1Delta };
  if (pks[1]) s.players[pks[1]] = { ...s.players[pks[1]], hp: s.players[pks[1]].hp + p2Delta };
  s.rounds.push({ round: s.round, p1Delta, p2Delta, slot });
  return s;
}

function _applyMatchEnd(state, fields, sender, slot) {
  const host = state.host ?? sender;
  if (host !== sender) return state;

  const s   = _clone(state, slot);
  s.host    = host;
  s.winner  = fields.w ?? null;
  s.status  = 'finished';
  return s;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function _initPlayer() {
  return { hp: 100, committed: false, revealed: false, actionType: null, handCommitment: null, hand: null };
}

function _clone(state, slot) {
  return {
    ...state,
    lastSlot: Math.max(state.lastSlot, slot),
    players:  Object.fromEntries(Object.entries(state.players).map(([k, v]) => [k, { ...v }])),
    rounds:   [...state.rounds],
    history:  [...(state.history ?? [])],
  };
}

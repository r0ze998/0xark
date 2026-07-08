// battle-state.js — Phase 15 battle flow state

const _STORAGE_KEY = 'oxark_battle_state';

// These keys contain Uint8Arrays or ephemeral crypto material that cannot survive
// JSON round-trips. After reload they are set to null and must be regenerated.
const _NON_RECOVERABLE = new Set([
  'zkProofBytes',      // { proofA, proofB, proofC } Uint8Arrays
  'zkPublicInputBytes', // Uint8Array[](32) × 4
  'zkPublicSignals',   // meaningful only alongside the proof
  'salt',              // ephemeral crypto input used to derive commitment
  'commitment',        // derived from salt + fieldCards; invalid without salt
]);

function _saveToStorage(state) {
  if (state.phase === 'main') { _clearStorage(); return; }
  try {
    const out = {};
    for (const [k, v] of Object.entries(state)) {
      out[k] = _NON_RECOVERABLE.has(k) ? null : v;
    }
    sessionStorage.setItem(_STORAGE_KEY, JSON.stringify(out));
  } catch (_) {}
}

function _loadFromStorage() {
  try {
    const raw = sessionStorage.getItem(_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    for (const k of _NON_RECOVERABLE) parsed[k] = null;
    return parsed;
  } catch (_) {
    return null;
  }
}

function _clearStorage() {
  try { sessionStorage.removeItem(_STORAGE_KEY); } catch (_) {}
}

const _DEFAULT_STATE = {
  phase: 'main',           // main | matchmaking | preparation | interruption | reveal | loot
  playerPubkey: null,
  vault: [],               // owned card IDs (1-60)
  personalities: { conqueror: 0, patron: 0, phoenix: 0, sage: 0, hermit: 0, detective: 0 },
  matchId: null,
  opponentPubkey: null,
  isHost: false,            // true if this client created the room (host = on-chain player1)
  // duelId is CONSTANT for the entire 5-round duel. The `-R1` suffix in the demo
  // fallback (`${matchId}-R1`) is a misleading legacy name kept for server
  // compatibility — never regenerate it per round (spec §2.2). advanceRound() must
  // leave duelId untouched.
  duelId: null,
  opponentPlayerId: null,   // server-assigned playerId of opponent

  round: 1,                 // current duel round (1-5) — only advanceRound() may change this
  p1RoundWins: 0,           // YKK-41 on-chain round-win tally for duel player1
  p2RoundWins: 0,           //                                        player2
  // Which on-chain side is me. Resolved from getDuelStateFull().player1 === myPubkey
  // (real mode) or isHost (host inits the duel as player1). Round HUD maps
  // p1/p2RoundWins to my-side through this. null = fall back to isHost.
  duelP1IsMe: null,
  fieldCards: [null, null, null, null, null],  // each: { cardId, actionType } | null
  commitment: null,         // null after reload — regenerate from fieldCards + new salt
  salt: null,               // null after reload — must re-derive
  zkProofBytes: null,       // { proofA, proofB, proofC } Uint8Arrays — set at preparation
  zkPublicSignals: null,    // raw snarkjs publicSignals string[]
  zkPublicInputBytes: null, // Uint8Array[](32) × 4 — ready for on-chain
  zkTxHash: null,           // devnet tx signature after on-chain verify

  hasPeeked: false,
  opponentField: null,    // [{cardId, actionType}] if peeked

  battleResult: null,     // damage-calc result object
  lootCard: null,
  isWinner: false,
  pendingBurnEffects: [], // { effect, ownSide } — applied in next battle's Step 0.5
  earnedImprints: [],     // ImprintKey strings awarded this session
};

const _restored = _loadFromStorage();

// wasRestored: true when a mid-battle session was recovered from sessionStorage.
// Components can read this flag to show a "session recovered" notice and prompt
// the user to re-derive their ZK proof if phase === 'preparation'/'reveal'.
export const wasRestored = _restored !== null && _restored.phase !== 'main';

let _state = _restored ? { ..._DEFAULT_STATE, ..._restored } : { ..._DEFAULT_STATE };

export function getState() { return _state; }

export function setState(updates) {
  _state = { ..._state, ...updates };
  _saveToStorage(_state);
  document.dispatchEvent(new CustomEvent('battle:statechange', { detail: _state }));
}

export function resetBattle() {
  _clearStorage();
  setState({
    phase: 'main',
    matchId: null,
    opponentPubkey: null,
    isHost: false,
    duelId: null,
    opponentPlayerId: null,
    round: 1,
    p1RoundWins: 0,
    p2RoundWins: 0,
    duelP1IsMe: null,
    fieldCards: [null, null, null, null, null],
    commitment: null,
    salt: null,
    hasPeeked: false,
    opponentField: null,
    battleResult: null,
    lootCard: null,
    isWinner: false,
    pendingBurnEffects: [],
  });
}

// advanceRound — the ONLY legal way to move to the next duel round (spec §2.2).
// Accepts a normalized descriptor `{ round, p1RoundWins, p2RoundWins, p1IsMe }`
// (from getDuelStateFull in real mode, or synthesized locally in demo mode).
// It carries the duel-scoped tally forward, CLEARS the per-round column
// (fieldCards / commitment / salt / zk material / peek / opponentField /
// battleResult), leaves duelId + match identity untouched, then routes to
// preparation for the new round. No other code path may write `round`.
export function advanceRound(ds = {}) {
  const round = ds.round ?? ((_state.round ?? 1) + 1);
  setState({
    round,
    p1RoundWins: ds.p1RoundWins ?? _state.p1RoundWins ?? 0,
    p2RoundWins: ds.p2RoundWins ?? _state.p2RoundWins ?? 0,
    duelP1IsMe:  ds.p1IsMe ?? _state.duelP1IsMe,
    // ── per-round reset column ──
    fieldCards: [null, null, null, null, null],
    commitment: null,
    salt: null,
    zkProofBytes: null,
    zkPublicSignals: null,
    zkPublicInputBytes: null,
    zkTxHash: null,
    hasPeeked: false,
    opponentField: null,
    battleResult: null,
    phase: 'preparation',
  });
  document.dispatchEvent(new CustomEvent('nav:preparation', { detail: { round } }));
}

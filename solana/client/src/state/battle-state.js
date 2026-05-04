// battle-state.js — Phase 15 battle flow state

let _state = {
  phase: 'main',           // main | matchmaking | preparation | interruption | reveal | loot
  playerPubkey: null,
  vault: [],               // owned card IDs (1-60)
  personalities: { conqueror: 0, patron: 0, phoenix: 0, sage: 0, hermit: 0, detective: 0 },
  matchId: null,
  opponentPubkey: null,
  isHost: false,            // true if this client created the room
  duelId: null,             // `${matchId}-R1` for round 1
  opponentPlayerId: null,   // server-assigned playerId of opponent

  round: 1,                 // current duel round (1-5)
  fieldCards: [null, null, null, null, null],  // each: { cardId, actionType } | null
  commitment: null,
  salt: null,
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

export function getState() { return _state; }

export function setState(updates) {
  _state = { ..._state, ...updates };
  document.dispatchEvent(new CustomEvent('battle:statechange', { detail: _state }));
}

export function resetBattle() {
  setState({
    phase: 'main',
    matchId: null,
    opponentPubkey: null,
    isHost: false,
    duelId: null,
    opponentPlayerId: null,
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

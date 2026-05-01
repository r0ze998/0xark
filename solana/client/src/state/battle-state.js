// battle-state.js — Phase 15 battle flow state

let _state = {
  phase: 'main',           // main | matchmaking | preparation | interruption | reveal | loot
  playerPubkey: null,
  vault: [],               // owned card IDs (1-60)
  personalities: { conqueror: 0, patron: 0, phoenix: 0, sage: 0, hermit: 0, detective: 0 },
  matchId: null,
  opponentPubkey: null,

  fieldCards: [null, null, null, null, null],  // each: { cardId, actionType } | null
  commitment: null,
  salt: null,

  hasPeeked: false,
  opponentField: null,    // [{cardId, actionType}] if peeked

  battleResult: null,     // damage-calc result object
  lootCard: null,
  isWinner: false,
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
    fieldCards: [null, null, null, null, null],
    commitment: null,
    salt: null,
    hasPeeked: false,
    opponentField: null,
    battleResult: null,
    lootCard: null,
    isWinner: false,
  });
}

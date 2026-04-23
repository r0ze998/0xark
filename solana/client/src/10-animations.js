// ═══════════════════════════════════════════════════════════════════════════
// MODULE: 10-animations.js
// Reusable animation primitives for Duel Scene (Day 10-13).
// Extracted from Phase C 09-game-loop.js as stubs; full implementations
// land in Day 12 (M3 ZK cutscene) and Day 13 (M4 Victory/Defeat).
// ═══════════════════════════════════════════════════════════════════════════

// ── Finisher animation stub (Day 12 fill-in) ─────────────────────────────
// Called when a duel lane resolves with a card destruction.
// cardId: 1-60, laneIndex: 0-2, winnerSide: 'player'|'opponent'
function playFinisherAnimation(cardId, laneIndex, winnerSide) {
  // POST-HACKATHON: ZK seal burst + element particle cascade
  // For now: simple flash + shake
  flash();
  screenShake(2, 4);
}

// ── Victory animation stub (Day 13 fill-in) ──────────────────────────────
// Called on duel win before NFT transfer scene.
// transferredCards: array of card_ids won from opponent
function playVictoryAnimation(transferredCards) {
  // POST-HACKATHON: Gold particle cascade + "VICTORY" banner + card reveal flip
  // For now: transition to victory scene
  fadeOut(() => {
    sc = 'victory';
    victoryFrame = fr;
    fadeIn();
  });
}

// ── Defeat animation stub (Day 13 fill-in) ───────────────────────────────
// Called on duel loss (opponent wins cards from player).
// lostCards: array of card_ids lost to opponent
function playDefeatAnimation(lostCards) {
  // POST-HACKATHON: Red vignette + "DEFEAT" + lore quote + XP consolation
  screenShake(4, 8);
  fadeOut(() => {
    sc = 'lobby';
    fadeIn();
  });
}

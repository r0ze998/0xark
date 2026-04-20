/**
 * strategy.js — Heuristic fallback strategy for 0xARK AI agent
 *
 * Used when the LLM API is unavailable or fails.
 * All decisions are deterministic and rules-based.
 */

// Card type counters: attack beats flee, defense beats attack, magic beats defense, recovery is utility
const COUNTER = {
  attack:   'defense',
  defense:  'magic',
  magic:    'flee',
  flee:     'attack',
  recovery: 'attack',  // recovery doesn't really counter — use offensively
};

// Card rarity weights for scoring
const RARITY_WEIGHT = { 1: 1, 2: 2, 3: 3, 4: 5, 5: 8 };

/**
 * Heuristic dungeon move decision.
 *
 * Strategy:
 *  - Prefer going deeper (south = higher y) to find rarer cards
 *  - Avoid walls by trying directions in priority order
 *  - If health is low, head toward exit (north)
 *
 * @param {object} state - { x, y, area, hp, maxHp, hand, floorDepth }
 * @param {function} canMove - canMove(dx, dy) => boolean
 * @returns {{ dx: number, dy: number, reason: string }}
 */
export function heuristicMove(state, canMove) {
  const lowHp = state.hp / state.maxHp < 0.3;

  // Priority order for directions
  const priorities = lowHp
    ? [
        { dx:  0, dy: -1, reason: 'low hp — retreating north toward exit' },
        { dx: -1, dy:  0, reason: 'low hp — heading west' },
        { dx:  1, dy:  0, reason: 'low hp — heading east' },
        { dx:  0, dy:  1, reason: 'low hp — forced south' },
      ]
    : [
        { dx:  0, dy:  1, reason: 'exploring deeper south for rarer cards' },
        { dx:  1, dy:  0, reason: 'exploring east' },
        { dx: -1, dy:  0, reason: 'exploring west' },
        { dx:  0, dy: -1, reason: 'backtracking north' },
      ];

  for (const dir of priorities) {
    if (canMove(dir.dx, dir.dy)) return dir;
  }

  // Surrounded — stay
  return { dx: 0, dy: 0, reason: 'surrounded by walls — waiting' };
}

/**
 * Heuristic card battle decision.
 *
 * Strategy:
 *  1. If opponent's card type is known, play the counter type
 *  2. Among counter cards, play highest rarity first
 *  3. If no counter available, play highest-rarity card
 *  4. Keep recovery cards for emergencies (unless hp is critical)
 *
 * @param {Array<{id,name,type,rarity}>} hand - Player's current hand
 * @param {string|null} opponentType - Known opponent card type (or null)
 * @param {object} state - { hp, maxHp }
 * @returns {{ cardIndex: number, card: object, reason: string }}
 */
export function heuristicCard(hand, opponentType, state) {
  if (!hand || hand.length === 0) {
    return { cardIndex: -1, card: null, reason: 'no cards in hand' };
  }

  const criticalHp = state.hp / state.maxHp < 0.2;

  // Score each card
  const scored = hand.map((card, idx) => {
    let score = RARITY_WEIGHT[card.rarity] ?? 1;

    // Bonus for countering opponent
    if (opponentType && card.type === COUNTER[opponentType]) score += 10;

    // Prefer recovery when critical
    if (criticalHp && card.type === 'recovery') score += 8;

    // Penalise recovery when not needed (save for later)
    if (!criticalHp && card.type === 'recovery') score -= 3;

    return { idx, card, score };
  });

  scored.sort((a, b) => b.score - a.score);
  const best = scored[0];

  let reason = `playing ${best.card.name} (${best.card.type}, r${best.card.rarity})`;
  if (opponentType && best.card.type === COUNTER[opponentType]) {
    reason += ` — counters opponent's ${opponentType}`;
  }
  if (criticalHp && best.card.type === 'recovery') {
    reason += ' — critical hp, using recovery';
  }

  return { cardIndex: best.idx, card: best.card, reason };
}

/**
 * Heuristic flee decision.
 *
 * Flee if:
 *  - hp < 25% AND no recovery cards in hand
 *  - opponent has a card type that hard-counters our entire hand
 *
 * @param {object} state - { hp, maxHp, hand }
 * @param {string|null} opponentType
 * @returns {{ flee: boolean, reason: string }}
 */
export function heuristicFlee(state, opponentType) {
  const hpRatio = state.hp / state.maxHp;
  const hasRecovery = state.hand.some(c => c.type === 'recovery');
  const hasCounter  = opponentType
    ? state.hand.some(c => c.type === COUNTER[opponentType])
    : true;

  if (hpRatio < 0.25 && !hasRecovery) {
    return { flee: true, reason: `hp=${Math.round(hpRatio * 100)}%, no recovery — fleeing` };
  }
  if (!hasCounter && opponentType) {
    return { flee: true, reason: `no counter to opponent's ${opponentType} — fleeing` };
  }

  return { flee: false, reason: 'staying to fight' };
}

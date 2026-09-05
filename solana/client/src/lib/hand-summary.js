import { getCard } from './cards.js';

// Catalog values only: this is a planning aid, not a predicted battle result.
export function summarizeHand(field = []) {
  const cards = field.filter(Boolean).map(slot => getCard(slot.cardId)).filter(Boolean);
  const factions = Array(6).fill(0);
  for (const card of cards) factions[card.faction]++;
  return { count: cards.length, bp: cards.reduce((sum, card) => sum + card.bp, 0),
    hp: cards.reduce((sum, card) => sum + card.hp, 0), factions,
    synergyFactions: factions.flatMap((count, faction) => count >= 3 ? [faction] : []),
  };
}

export function playbackSummary(result) {
  if (!Number.isFinite(result?.p1BpTotal) || !Number.isFinite(result?.p2BpTotal)
    || !Array.isArray(result.p1Cards) || !Array.isArray(result.p2Cards)) return null;
  return { myBP: result.p1BpTotal, opponentBP: result.p2BpTotal,
    mySurvivors: result.p1Cards.filter(card => !card.destroyed).length,
    opponentSurvivors: result.p2Cards.filter(card => !card.destroyed).length };
}

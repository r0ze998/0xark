import test from 'node:test';
import assert from 'node:assert/strict';
import { summarizeHand, playbackSummary } from '../src/lib/hand-summary.js';
import { getCard } from '../src/lib/cards.js';

test('an incomplete hand shows catalog totals without inventing missing cards or action buffs', () => {
  const field = [{ cardId: 1, actionType: 0 }, null, { cardId: 11, actionType: 5 }, null, null];
  const summary = summarizeHand(field);
  assert.equal(summary.count, 2);
  assert.equal(summary.bp, getCard(1).bp + getCard(11).bp);
  assert.equal(summary.hp, getCard(1).hp + getCard(11).hp);
  assert.deepEqual(summary.synergyFactions, []);
  assert.equal(field[1], null);
  assert.equal(summarizeHand().bp, 0);
});

test('faction synergy appears exactly at three matching cards', () => {
  assert.deepEqual(summarizeHand([1, 2, 11, 12, 21].map(cardId => ({ cardId }))).synergyFactions, []);
  const summary = summarizeHand([1, 2, 3, 11, 21].map(cardId => ({ cardId })));
  assert.deepEqual(summary.synergyFactions, [0]);
  assert.deepEqual(summary.factions, [3, 1, 1, 0, 0, 0]);
});

test('result comparison preserves zero BP and hides absent/incomplete results', () => {
  assert.equal(playbackSummary(null), null);
  assert.equal(playbackSummary({ winner: 'p1' }), null);
  assert.equal(playbackSummary({ p1BpTotal: 3, p2BpTotal: NaN, p1Cards: [], p2Cards: [] }), null);
  assert.deepEqual(playbackSummary({ p1BpTotal: 0, p2BpTotal: 6,
    p1Cards: [{ destroyed: true }, { destroyed: true }], p2Cards: [{ destroyed: false }, { destroyed: true }] }),
  { myBP: 0, opponentBP: 6, mySurvivors: 0, opponentSurvivors: 1 });
});

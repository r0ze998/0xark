import test from 'node:test';
import assert from 'node:assert/strict';
import { placeInHand, completeHand, snapshotHand } from '../src/lib/preparation-hand.js';

test('five consecutive vault choices fill five distinct slots', () => {
  let field = Array(5).fill(null);
  for (const id of [1, 2, 3, 4, 5]) field = placeInHand(field, id);
  assert.deepEqual(field.map(c => c.cardId), [1, 2, 3, 4, 5]);
  assert.equal(placeInHand(field, 6), field, 'full hand requires an explicit target');
  assert.equal(placeInHand(field, 2, 0), field, 'cannot duplicate a selected card');
  assert.deepEqual(placeInHand(field, 6, 2).map(c => c.cardId), [1, 2, 6, 4, 5]);
});

test('timeout preserves positions and actions, excludes duplicates and fills only holes', () => {
  const chosen = { cardId: 9, actionType: 5 };
  const field = [null, chosen, null, { cardId: 3, actionType: 2 }, null];
  const completed = completeHand(field, [9, 3, 1, 1, 2, 4]);
  assert.deepEqual(completed.map(c => c.cardId), [1, 9, 2, 3, 4]);
  assert.equal(completed[1], chosen);
  assert.equal(completed[3].actionType, 2);
  assert.equal(field[0], null, 'input remains untouched');
  assert.equal(completeHand(field, [9, 3, 1]).filter(Boolean).length, 3);
});

test('commit snapshot cannot drift with later edits, and rejects incomplete hands', () => {
  const field = [1, 2, 3, 4, 5].map(cardId => ({ cardId, actionType: 0 }));
  const snapshot = snapshotHand(field);
  field[0].cardId = 9;
  field[1].actionType = 5;
  assert.deepEqual(snapshot.map(c => c.cardId), [1, 2, 3, 4, 5]);
  assert.equal(snapshot[1].actionType, 0);
  assert.throws(() => { snapshot[0].actionType = 3; }, TypeError);
  assert.throws(() => snapshotHand([null, ...field.slice(1)]), /Choose 5/);
});

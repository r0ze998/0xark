import test from 'node:test';
import assert from 'node:assert/strict';
import * as intel from '../src/components/interruption.js';
import * as shop from '../src/components/shop-screen.js';
import { getState, resetBattle, setState, advanceRound } from '../src/state/battle-state.js';
import { createScreenHost, deferred } from './helpers/screen-host.js';

function host(t, { practice = false } = {}) {
  t.mock.timers.enable({ apis: ['setTimeout', 'setInterval'] });
  const { app, body, events, document } = createScreenHost();
  globalThis.window = { oxarkPreview: practice, oxarkWallet: { isConnected: () => true }, oxarkOnchain: {} };
  globalThis.document = document;
  globalThis.CustomEvent = class { constructor(type, options) { this.type = type; this.detail = options?.detail; } };
  resetBattle();
  setState({ fieldCards: [1, 2, 3, 4, 5].map(cardId => ({ cardId, actionType: 0 })), duelId: 'test-duel' });
  t.after(() => { intel.unmount(app); shop.unmount(app); });
  return { app, body, events };
}

test('a paid peek completing after timeout cannot write the next round opponent hand', async t => {
  const { app, events } = host(t);
  const payment = deferred();
  window.x402 = { scoutPeek: () => payment.promise };
  intel.mount(app);
  const pending = app.querySelector('#intel-peek').click();
  t.mock.timers.tick(60_000);
  assert.equal(events.filter(event => event.type === 'nav:reveal').length, 1);
  intel.unmount(app);
  advanceRound({ round: 2 });
  intel.mount(app);
  payment.resolve({ cards: [21, 22, 23, 24, 25] });
  await pending;
  assert.equal(getState().round, 2);
  assert.equal(getState().hasPeeked, false);
  assert.equal(getState().opponentField, null);
  assert.equal(app.querySelector('#intel-peek').disabled, false);
  t.mock.timers.tick(1000);
  assert.equal(app.querySelector('#intel-chest-0').outerHTML, undefined);
});

test('a failed old peek cannot apply mock intel to a replacement mount', async t => {
  const { app, body } = host(t);
  const payment = deferred();
  window.x402 = { scoutPeek: () => payment.promise };
  intel.mount(app);
  const pending = app.querySelector('#intel-peek').click();
  intel.mount(app);
  payment.reject(new Error('payment unavailable'));
  await pending;
  assert.equal(getState().hasPeeked, false);
  assert.equal(getState().opponentField, null);
  assert.equal(body.children.length, 0);
});

test('old advice completion cannot update the next intel screen', async t => {
  const { app, body } = host(t);
  const request = deferred();
  window.x402 = { payAiStrategyAdvice: () => request.promise };
  intel.mount(app);
  const oldPanel = app.querySelector('#intel-advice-panel');
  const pending = app.querySelector('#intel-advice').click();
  intel.mount(app);
  const newPanel = app.querySelector('#intel-advice-panel');
  request.resolve({ advice: 'Old-round advice', signature: 'confirmed' });
  await pending;
  assert.equal(oldPanel.textContent, 'Requesting AI strategy…');
  assert.equal(newPanel.textContent, '');
  assert.equal(body.children.length, 0);
});

test('practice peek keeps the sealed hand and cancels staggered reveal work on unmount', async t => {
  const { app } = host(t, { practice: true });
  const opponent = [11, 12, 13, 14, 15].map(cardId => ({ cardId, actionType: 2 }));
  setState({ opponentField: opponent });
  const hand = getState().fieldCards;
  intel.mount(app);
  await app.querySelector('#intel-peek').click();
  assert.equal(getState().hasPeeked, true);
  assert.equal(getState().fieldCards, hand);
  const oldChest = app.querySelector('#intel-chest-0');
  t.mock.timers.tick(0);
  assert.equal(oldChest.classes.has('intel-chest--crack'), true);
  intel.unmount(app);
  setState({ hasPeeked: false, opponentField: null });
  intel.mount(app);
  t.mock.timers.tick(1000);
  assert.equal(oldChest.outerHTML, undefined);
  assert.equal(app.querySelector('#intel-chest-0').outerHTML, undefined);
});

test('a pending pack purchase cannot open a dialog after leaving or replacing the shop', async t => {
  const { app, body } = host(t);
  const purchase = deferred();
  const calls = [];
  window.oxarkOnchain.buyPack = type => { calls.push(type); return purchase.promise; };
  shop.mount(app);
  const pending = app.querySelector('#buy-standard-btn').click();
  assert.equal(app.querySelector('#buy-standard-btn').disabled, true);
  shop.unmount(app);
  shop.mount(app);
  purchase.resolve({ cardIds: [1, 2, 3, 4, 5] });
  await pending;
  assert.deepEqual(calls, [0]);
  assert.equal(app.children.some(child => child.tag === 'dialog'), false);
  assert.equal(app.querySelector('#buy-standard-btn').disabled, false);
  assert.equal(body.children.length, 0);
});

test('a current pack purchase waits for confirmation, then reveals its returned cards', async t => {
  const { app, body } = host(t);
  const purchase = deferred();
  window.oxarkOnchain.buyPack = () => purchase.promise;
  shop.mount(app);
  const pending = app.querySelector('#buy-premium-btn').click();
  assert.equal(app.children.some(child => child.tag === 'dialog'), false);
  purchase.resolve({ cardIds: [8, 35, 51] });
  await pending;
  const dialog = app.children.find(child => child.tag === 'dialog');
  assert.equal(dialog.open, true);
  const slots = dialog.children.find(child => child.className === 'reveal-cards').children;
  assert.equal(slots.length, 3);
  t.mock.timers.tick(250);
  t.mock.timers.tick(200);
  assert.match(slots[0].innerHTML, /data-id="8"/);
  assert.equal(body.children[0].textContent, 'Pack opened! 3 cards received.');
  assert.equal(app.querySelector('#buy-premium-btn').disabled, false);
});

test('practice opening owns its dialog and nested flip timers without buying cards', async t => {
  const { app } = host(t, { practice: true });
  window.oxarkOnchain.buyPack = () => { throw new Error('Practice must not buy'); };
  shop.mount(app);
  await app.querySelector('#buy-standard-btn').click();
  const dialog = app.children.find(child => child.tag === 'dialog');
  const slots = dialog.children.find(child => child.className === 'reveal-cards').children;
  t.mock.timers.tick(250);
  const sealedMarkup = slots[0].innerHTML;
  shop.unmount(app);
  t.mock.timers.tick(10_000);
  assert.equal(dialog.isConnected, false);
  assert.equal(slots[0].innerHTML, sealedMarkup);
  assert.equal(app.children.length, 0);
});

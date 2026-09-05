import test from 'node:test';
import assert from 'node:assert/strict';
import * as reveal from '../src/components/reveal.js';
import * as loot from '../src/components/loot.js';
import * as duelWs from '../src/lib/duel-ws.js';
import { getState, resetBattle, setState } from '../src/state/battle-state.js';
import { createScreenHost, deferred, flushMicrotasks } from './helpers/screen-host.js';

function host(t) {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const screen = createScreenHost();
  globalThis.document = screen.document;
  globalThis.CustomEvent = class { constructor(type, options) { this.type = type; this.detail = options?.detail; } };
  globalThis.localStorage = { getItem: () => null };
  globalThis.window = {
    location: { hostname: 'localhost' }, oxarkPreview: false,
    oxarkWallet: { isConnected: () => true },
    solana: { publicKey: { toBase58: () => 'me' } },
    matchMedia: () => ({ matches: true }), oxarkOnchain: {},
  };
  // Deterministic local crypto and transport doubles; no signing or network.
  t.mock.method(globalThis.crypto.subtle, 'digest', async () => new ArrayBuffer(32));
  const messages = [];
  globalThis.WebSocket = class {
    constructor() { this.readyState = 1; queueMicrotask(() => this.onopen?.()); }
    send(message) { messages.push(JSON.parse(message)); }
    close() { this.readyState = 3; this.onclose?.(); }
  };
  resetBattle();
  setState({
    playerPubkey: 'me', opponentPubkey: 'opponent', isHost: true, duelId: 'duel-a',
    salt: new Uint8Array(32),
    fieldCards: [1, 2, 3, 4, 5].map(cardId => ({ cardId, actionType: 0 })),
    opponentField: [11, 12, 13, 14, 15].map(cardId => ({ cardId, actionType: 0 })),
  });
  t.after(() => { reveal.unmount(screen.app); loot.unmount(screen.app); duelWs.disconnect(); });
  return { ...screen, messages };
}

async function finishPlayback(t, app) {
  app.querySelector('#rev-skip').click();
  await flushMicrotasks();
  assert.ok(getState().battleResult, 'skip must still compute the battle result');
  t.mock.timers.tick(800);
  await flushMicrotasks();
}

test('live resolution waits for reveal confirmation even when playback is skipped', async t => {
  const { app, events, messages } = host(t);
  await duelWs.connect();
  const transaction = deferred();
  let reads = 0;
  window.oxarkOnchain.revealHand = () => transaction.promise;
  window.oxarkOnchain.getDuelStateFull = async () => {
    reads++;
    return { endedAt: 1, winner: 'me', p1RoundWins: 3, p2RoundWins: 0 };
  };
  reveal.mount(app);
  await finishPlayback(t, app);
  assert.equal(reads, 0, 'an unconfirmed reveal cannot start round resolution');
  assert.equal(events.filter(event => event.type === 'nav:loot').length, 0);
  transaction.resolve('reveal-signature');
  await flushMicrotasks();
  assert.equal(reads, 1);
  assert.equal(events.filter(event => event.type === 'nav:loot').length, 1);
  assert.equal(getState().isWinner, true);
  assert.equal(messages.filter(message => message.type === 'duel_hand_revealed').length, 1);
});

test('failed reveal stays blocked and a fresh successful attempt can progress', async t => {
  const { app, events, messages } = host(t);
  await duelWs.connect();
  const transaction = deferred();
  let reads = 0;
  window.oxarkOnchain.revealHand = () => transaction.promise;
  window.oxarkOnchain.getDuelStateFull = async () => {
    reads++;
    return { endedAt: 1, winner: 'me', p1RoundWins: 3, p2RoundWins: 0 };
  };
  reveal.mount(app);
  await finishPlayback(t, app);
  transaction.reject(new Error('wallet declined'));
  await flushMicrotasks();
  assert.equal(reads, 0);
  assert.equal(events.filter(event => event.type === 'nav:loot').length, 0);
  assert.equal(messages.filter(message => message.type === 'duel_hand_revealed').length, 0);
  assert.match(app.querySelector('#rev-record').children.at(-1).textContent, /reveal TX failed/);

  window.oxarkOnchain.revealHand = async () => 'retry-signature';
  reveal.mount(app);
  await finishPlayback(t, app);
  assert.equal(reads, 1);
  assert.equal(events.filter(event => event.type === 'nav:loot').length, 1);
});

for (const outcome of ['success', 'failure']) {
  test(`a stale reveal ${outcome} cannot release or block another mount`, async t => {
    const { app, events, messages } = host(t);
    await duelWs.connect();
    const oldTransaction = deferred();
    const newTransaction = deferred();
    const reads = [];
    window.oxarkOnchain.revealHand = id => id === 'duel-a' ? oldTransaction.promise : newTransaction.promise;
    window.oxarkOnchain.getDuelStateFull = async id => {
      reads.push(id);
      return { endedAt: 1, winner: 'me', p1RoundWins: 3, p2RoundWins: 0 };
    };
    reveal.mount(app);
    setState({ duelId: 'duel-b' });
    reveal.mount(app);
    await finishPlayback(t, app);
    if (outcome === 'success') oldTransaction.resolve('old-signature');
    else oldTransaction.reject(new Error('old failure'));
    await flushMicrotasks();
    assert.deepEqual(reads, []);
    assert.equal(messages.filter(message => message.type === 'duel_hand_revealed').length, 0);
    assert.equal(app.querySelector('#rev-record').children.some(node => /old failure/.test(node.textContent)), false);
    newTransaction.resolve('current-signature');
    await flushMicrotasks();
    assert.deepEqual(reads, ['duel-b']);
    assert.equal(events.filter(event => event.type === 'nav:loot').length, 1);
    assert.deepEqual(messages.filter(message => message.type === 'duel_hand_revealed').map(message => message.duel_id), ['duel-b']);
  });
}

test('unmounted resolution does not issue another poll after its sleep finishes', async t => {
  const { app } = host(t);
  await duelWs.connect();
  const newTransaction = deferred();
  const reads = [];
  window.oxarkOnchain.revealHand = async id => id === 'duel-a' ? 'confirmed' : newTransaction.promise;
  window.oxarkOnchain.getDuelStateFull = async id => { reads.push(id); return { endedAt: 0, round: 1 }; };
  reveal.mount(app);
  await finishPlayback(t, app);
  assert.deepEqual(reads, ['duel-a']);
  reveal.unmount(app);
  setState({ duelId: 'duel-b' });
  reveal.mount(app);
  await finishPlayback(t, app);
  t.mock.timers.tick(1500);
  await flushMicrotasks();
  assert.deepEqual(reads, ['duel-a']);
});

for (const pendingStage of ['transaction', 'confirmation read']) {
  test(`an old timeout claim ${pendingStage} cannot resolve a replacement duel`, async t => {
    const { app, events } = host(t);
    await duelWs.connect();
    const pending = deferred();
    const newReveal = deferred();
    const reads = [];
    window.oxarkOnchain.DUEL_STALL_TIMEOUT_SECONDS = 0;
    window.oxarkOnchain.revealHand = async id => id === 'duel-a' ? 'revealed-a' : newReveal.promise;
    window.oxarkOnchain.claimTimeoutWin = () => pendingStage === 'transaction' ? pending.promise : Promise.resolve('claimed');
    window.oxarkOnchain.getDuelStateFull = async id => {
      reads.push(id);
      if (reads.length === 1) return { endedAt: 0, round: 1 };
      return pending.promise;
    };
    reveal.mount(app);
    await finishPlayback(t, app);
    assert.equal(app.querySelector('#rev-claim').style.display, 'inline-flex');
    const claim = app.querySelector('#rev-claim').click();
    await flushMicrotasks();
    const before = reads.length;
    reveal.unmount(app);
    setState({ duelId: 'duel-b' });
    reveal.mount(app);
    pending.resolve({ endedAt: 1, winner: 'me', p1RoundWins: 3, p2RoundWins: 0 });
    await claim;
    await flushMicrotasks();
    assert.equal(reads.length, before);
    assert.equal(getState().duelId, 'duel-b');
    assert.equal(getState().phase, 'reveal');
    assert.equal(events.filter(event => event.type === 'nav:loot').length, 0);
  });
}

test('practice still advances through the round bridge only after the player continues', async t => {
  const { app, events } = host(t);
  window.oxarkPreview = true;
  setState({ duelId: null, salt: null });
  reveal.mount(app);
  await finishPlayback(t, app);
  const bridge = app.children.find(node => node.className?.startsWith('round-bridge'));
  assert.ok(bridge);
  assert.equal(getState().round, 1);
  t.mock.timers.tick(10_000);
  await flushMicrotasks();
  assert.equal(getState().round, 1);
  bridge.click();
  assert.equal(getState().round, 2);
  assert.equal(events.filter(event => event.type === 'nav:preparation').length, 1);
  bridge.click();
  assert.equal(getState().round, 2);
});

test('old engraving eligibility cannot wire the next result screen to the previous duel', async t => {
  const { app } = host(t);
  const eligibility = deferred();
  const settled = [];
  window.oxarkOnchain.getDuelStateFull = id => id === 'duel-a' ? eligibility.promise : Promise.resolve(null);
  window.oxarkOnchain.settleDuelHistory = async id => { settled.push(id); };
  setState({ isWinner: true });
  loot.mount(app);
  setState({ duelId: 'duel-b' });
  loot.mount(app);
  eligibility.resolve({ endedAt: 1, winner: 'me' });
  await flushMicrotasks();
  assert.equal(app.querySelector('#loot-engrave-btn').listeners.has('click'), false);
  await app.querySelector('#loot-engrave-btn').click();
  assert.deepEqual(settled, []);
});

test('leaving results during the mint read cannot initiate a later engraving transaction', async t => {
  const { app } = host(t);
  const mints = deferred();
  const settled = [];
  window.oxarkOnchain.getDuelStateFull = async () => ({ endedAt: 1, winner: 'me' });
  window.oxarkOnchain.getOwnedCardMints = () => mints.promise;
  window.oxarkOnchain.settleDuelHistory = async id => { settled.push(id); };
  setState({ isWinner: true });
  loot.mount(app);
  await flushMicrotasks();
  const engrave = app.querySelector('#loot-engrave-btn').click();
  loot.unmount(app);
  mints.resolve(new Map([[1, [{ mint: 'mint-a' }]]]));
  await engrave;
  assert.deepEqual(settled, []);
});

test('confirmed engraving cannot mark a later result as already engraved', async t => {
  const { app, body } = host(t);
  const transaction = deferred();
  const settled = [];
  window.oxarkOnchain.getDuelStateFull = async () => ({ endedAt: 1, winner: 'me' });
  window.oxarkOnchain.getOwnedCardMints = async () => new Map([[1, [{ mint: 'mint-a' }]]]);
  window.oxarkOnchain.settleDuelHistory = id => { settled.push(id); return id === 'duel-a' ? transaction.promise : Promise.resolve('new-signature'); };
  setState({ isWinner: true });
  loot.mount(app);
  await flushMicrotasks();
  const oldEngrave = app.querySelector('#loot-engrave-btn').click();
  await flushMicrotasks();
  assert.deepEqual(settled, ['duel-a']);
  setState({ duelId: 'duel-b' });
  loot.mount(app);
  await flushMicrotasks();
  transaction.resolve('old-signature');
  await oldEngrave;
  assert.equal(app.querySelector('#loot-engrave').classes.has('loot-engrave--done'), false);
  assert.equal(app.querySelector('#loot-engrave-btn').disabled, false);
  assert.equal(body.children.length, 0);
  await app.querySelector('#loot-engrave-btn').click();
  assert.deepEqual(settled, ['duel-a', 'duel-b']);
  assert.equal(app.querySelector('#loot-engrave').classes.has('loot-engrave--done'), true);
  assert.equal(app.querySelector('#loot-engrave-btn').disabled, true);
  assert.equal(body.children.length, 1);
});

test('a failed current engraving keeps its retry available until confirmation', async t => {
  const { app } = host(t);
  const calls = [];
  window.oxarkOnchain.getDuelStateFull = async () => ({ endedAt: 1, winner: 'me' });
  window.oxarkOnchain.getOwnedCardMints = async () => new Map([[1, [{ mint: 'held-card' }]]]);
  window.oxarkOnchain.settleDuelHistory = async (id, mints) => {
    calls.push({ id, mints });
    if (calls.length === 1) throw new Error('wallet declined');
    return 'confirmed';
  };
  setState({ isWinner: true });
  loot.mount(app);
  await flushMicrotasks();
  const button = app.querySelector('#loot-engrave-btn');
  await button.click();
  assert.equal(button.disabled, false);
  assert.equal(app.querySelector('#loot-engrave').classes.has('loot-engrave--done'), false);
  await button.click();
  assert.equal(button.disabled, true);
  assert.deepEqual(calls, Array(2).fill({ id: 'duel-a', mints: ['held-card'] }));
  assert.equal(app.querySelector('#loot-engrave-hint').textContent, '1 card settled');
});

test('continue ends its own result once and cannot reset a replacement duel', async t => {
  const { app, events } = host(t);
  const payments = [];
  window.x402 = { payMatchEnd: async details => { payments.push(details.matchId); } };
  setState({ isWinner: false, matchId: 'match-a' });
  loot.mount(app);
  const oldContinue = app.querySelector('#loot-continue');
  t.mock.timers.tick(1200);
  assert.equal(oldContinue.disabled, false);
  oldContinue.click();
  assert.equal(getState().duelId, null);
  assert.deepEqual(payments, ['match-a']);
  setState({ duelId: 'duel-b', matchId: 'match-b', fieldCards: [1, 2, 3, 4, 5].map(cardId => ({ cardId, actionType: 0 })) });
  loot.mount(app);
  oldContinue.click();
  assert.equal(getState().duelId, 'duel-b');
  assert.deepEqual(payments, ['match-a']);
  assert.equal(events.filter(event => event.type === 'nav:home').length, 1);
});

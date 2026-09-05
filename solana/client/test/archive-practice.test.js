import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { getCard, ALL_CARD_IDS } from '../src/lib/cards.js';
import { CardFrameHTML } from '../src/components/common/Card.js';
import { damageCalc } from '../src/lib/damage-calc.js';

// Unit-level host doubles, not a browser or a visual test.
const storageCalls = [];
const events = [];
globalThis.location = { search: '?devview=home' };
globalThis.window = { location, oxarkPreview: true };
globalThis.document = { dispatchEvent: event => events.push(event) };
globalThis.CustomEvent = class { constructor(type, options) { this.type = type; this.detail = options?.detail; } };
globalThis.sessionStorage = Object.fromEntries(['getItem', 'setItem', 'removeItem'].map(key => [key, (...args) => storageCalls.push([key, ...args])]));
const practice = await import('../src/lib/practice-mode.js');
const state = await import('../src/state/battle-state.js');
const ws = await import('../src/lib/duel-ws.js');

test('practice is explicit in the live client and forced in preview-only packages', () => {
  assert.equal(practice.practiceEnabled(''), false);
  assert.equal(practice.practiceEnabled('?devview=home'), true);
  assert.equal(practice.practiceEnabled('?devview='), true);
  assert.equal(practice.practiceEnabled('?other=home'), false);
  assert.equal(practice.practiceEnabled('', true), true);
});

test('practice adapters reject every transaction surface without a signature', async () => {
  const { onchain, wallet } = practice.createPracticeAdapters();
  for (const method of ['registerWaitlist', 'buyPack', 'refillEnergy', 'initDuel', 'commitHand', 'revealHand', 'claimBattleLoot', 'settleDuelHistory', 'burnCard', 'promoteCard', 'createListing', 'acceptListing', 'cancelListing', 'grantImprint', 'futureWriteMethod']) {
    await assert.rejects(onchain[method](), /disabled in practice/);
  }
  for (const method of ['connect', 'signTransaction', 'signAllTransactions', 'signMessage']) await assert.rejects(wallet[method](), /disabled in practice/);
  assert.equal(onchain.then, undefined);
  assert.throws(() => { onchain.buyPack = async () => 'fake-signature'; }, TypeError);
});

test('sample collection spans all six factions and never mutates shared fixture data', async () => {
  const { onchain } = practice.createPracticeAdapters();
  const a = await onchain.getPlayerState();
  const b = await onchain.getPlayerState();
  assert.equal(a.vault.length, 30);
  assert.equal(new Set(a.vault).size, 30);
  assert.equal(new Set(a.vault.map(id => getCard(id).faction)).size, 6);
  a.vault.pop(); assert.equal(b.vault.length, 30);
  assert.deepEqual(await onchain.fetchAllListings(), []);
  assert.equal((await onchain.getOwnedCardMints()).size, 0);
});

test('practice cannot read, overwrite or clear the live battle session', () => {
  state.resetBattle();
  state.setState({ phase: 'interruption', commitment: 'practice-only', duelId: null, isHost: true, fieldCards: practice.practiceOpponent() });
  assert.equal(state.wasRestored, false);
  state.advanceRound({ round: 2, p1RoundWins: 1, p2RoundWins: 0, p1IsMe: true });
  assert.equal(state.getState().round, 2);
  assert.equal(state.getState().commitment, null);
  assert.deepEqual(state.getState().fieldCards, Array(5).fill(null));
  assert.equal(state.getState().duelId, null);
  assert.equal(events.at(-1).type, 'nav:preparation');
  assert.deepEqual(storageCalls, []);
});

test('practice cannot open a live matchmaking socket or send messages', async () => {
  globalThis.WebSocket = class { constructor() { throw new Error('Unexpected network access'); } };
  await assert.rejects(ws.connect(), /disabled in practice/);
  assert.doesNotThrow(() => ws.send({ type: 'matchmaking_enqueue' }));
  assert.equal(ws.isConnected(), false);
});

test('all five practice opponent hands are valid inputs to the real combat calculator', () => {
  for (let round = 1; round <= 5; round++) {
    const opponent = practice.practiceOpponent(round);
    assert.equal(new Set(opponent.map(c => c.cardId)).size, 5);
    assert.ok(opponent.every(c => getCard(c.cardId) && c.actionType >= 0 && c.actionType <= 5));
    const field = opponent.map(c => ({ ...getCard(c.cardId), actionType: c.actionType }));
    const result = damageCalc({ p1Field: field, p2Field: field, seed: new Uint8Array(32).fill(round) });
    assert.ok(['p1', 'p2'].includes(result.winner));
    assert.ok(Number.isFinite(result.p1BpTotal));
    assert.ok(Array.isArray(result.effects));
  }
});

test('all 60 cards retain identity/stat hooks and resolve local faction art', () => {
  for (const id of ALL_CARD_IDS) {
    const html = CardFrameHTML({ id });
    assert.match(html, new RegExp('data-id="' + id + '"'));
    assert.match(html, /cf-hp/);
    assert.match(html, /initiative/);
    const src = html.match(/<img src="([^"]+)"/)?.[1];
    assert.ok(src && existsSync(new URL('../' + src, import.meta.url)), 'missing art for card ' + id);
  }
  assert.match(CardFrameHTML({ id: 10, hpCurrent: 0 }), /HP 0/);
  assert.doesNotMatch(CardFrameHTML({ id: 10, faceDown: true }), /data-id|Sentinel/);
});

test('entrypoint does not eagerly load live wallet, payment or proof scripts', () => {
  const index = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  assert.match(index, /src="src\/runtime.js"/);
  assert.doesNotMatch(index, /<script[^>]*src="(?:https:|src\/onchain|src\/02-x402|src\/03-zk)/);
});

test('new presentation assets all resolve from the stylesheet', () => {
  const cssUrl = new URL('../src/style/archive.css', import.meta.url);
  const css = readFileSync(cssUrl, 'utf8');
  for (const [, path] of css.matchAll(/url\(['"]?([^'")]+)['"]?\)/g)) assert.ok(existsSync(new URL(path, cssUrl)), path);
  assert.match(css, /\.cd-top\s*\{\s*flex-direction:column/);
  assert.match(css, /\.ats-btn\[aria-pressed=true\]/);
  assert.match(css, /:focus-visible/);
});

test('round bridge cancellation never advances a discarded duel', async () => {
  let overlay;
  globalThis.document = {
    dispatchEvent: event => events.push(event), getElementById: () => ({}),
    createElement: () => ({ listeners: {}, setAttribute() {},
      addEventListener(type, fn) { this.listeners[type] = fn; },
      removeEventListener(type) { delete this.listeners[type]; }, remove() {},
      querySelector: () => ({ focus() {} }),
    }),
  };
  const { showRoundBridge } = await import('../src/components/common/round-ui.js');
  const host = { appendChild: node => { overlay = node; } };
  let advanced = 0;
  const options = { round: 1, myWins: 1, oppWins: 0, outcome: 'win', onDone: () => advanced++ };
  const cancel = showRoundBridge(host, options);
  cancel(); assert.equal(advanced, 0);
  showRoundBridge(host, options);
  const click = overlay.listeners.click;
  click(); click(); assert.equal(advanced, 1);
});

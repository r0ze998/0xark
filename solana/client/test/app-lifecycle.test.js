import test from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { createScreenRouter, listenForNavigation } from '../src/app/router.js';
import { createPlayerSession } from '../src/app/player-session.js';
import { createWalletEvents } from '../src/app/wallet-events.js';
import { createLiveApp } from '../src/app/live-app.js';
import { createPracticeApp } from '../src/app/practice.js';

function deferred() {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}

function routerHost() {
  const mounts = [];
  const leaves = [];
  const screens = Object.fromEntries(['home', 'main', 'shop', 'trade', 'matchmaking',
    'preparation', 'interruption', 'reveal', 'loot', 'welcome', 'register', 'home-loading', 'menu']
    .map(name => [name, { mount: (_container, props) => mounts.push({ name, props }), unmount: () => leaves.push(name) }]));
  screens.main.defaults = { mode: 'vault' };
  screens.matchmaking.defaults = { mode: 'battle' };
  const router = createScreenRouter({ container: {}, screens });
  return { router, mounts, leaves };
}

test('unknown routes preserve the active screen; known routes unmount exactly once', () => {
  const { router, mounts, leaves } = routerHost();
  router.navigate('main');
  const revision = router.revision;
  assert.equal(mounts[0].props.mode, 'vault');
  assert.equal(router.navigate('missing'), false);
  assert.equal(router.navigate('toString'), false);
  assert.equal(router.current, 'main');
  assert.equal(router.revision, revision);
  assert.deepEqual(leaves, []);
  router.navigate('main', { mode: 'battle' });
  assert.equal(mounts[1].props.mode, 'battle');
  assert.deepEqual(leaves, ['main']);
  router.dispose(); router.dispose();
  assert.deepEqual(leaves, ['main', 'main']);
});

test('navigation listeners forward detail and release their registrations', () => {
  const target = new EventTarget();
  const values = [];
  const stop = listenForNavigation(target, { main: detail => values.push(detail) });
  const event = new Event('nav:main');
  event.detail = { mode: 'battle' };
  target.dispatchEvent(event);
  stop(); stop();
  target.dispatchEvent(event);
  assert.deepEqual(values, [{ mode: 'battle' }]);
});

function sessionHost() {
  let pubkey = 'wallet-a';
  const writes = [];
  const onchain = {};
  const wallet = { isConnected: () => pubkey !== null, getPublicKey: () => pubkey };
  const session = createPlayerSession({ getWallet: () => wallet, getOnchain: () => onchain,
    setBattleState: value => writes.push(value) });
  return { session, writes, onchain, wallet, setOwner: value => { pubkey = value; } };
}

test('overlapping collection reads commit only the latest request', async () => {
  const h = sessionHost();
  const first = deferred(); const second = deferred();
  h.onchain.getPlayerState = () => first.promise;
  const old = h.session.load();
  h.onchain.getPlayerState = () => second.promise;
  const fresh = h.session.load();
  second.resolve({ vault: [10, 30] });
  assert.equal(await fresh, true);
  first.resolve({ vault: [1] });
  assert.equal(await old, false);
  assert.deepEqual(h.session.player.vault, [10, 30]);
  assert.deepEqual(h.writes, [{ vault: [10, 30], playerPubkey: 'wallet-a' }]);
});

test('cleared or abandoned collection loads cannot repopulate persistent state', async () => {
  for (const abandon of ['clear', 'route']) {
    const h = sessionHost();
    const read = deferred();
    let current = true;
    h.onchain.getPlayerState = () => read.promise;
    const pending = h.session.load(() => current);
    if (abandon === 'clear') h.session.clear(); else current = false;
    read.resolve({ vault: [60] });
    assert.equal(await pending, false);
    assert.equal(h.session.player, null);
    assert.deepEqual(h.writes, []);
  }
});

test('wallet changes invalidate reads; optional world failures do not fabricate a collection', async () => {
  const h = sessionHost();
  const read = deferred();
  h.onchain.getPlayerState = () => read.promise;
  const pending = h.session.load();
  h.setOwner('wallet-b');
  read.resolve({ vault: [1] });
  await assert.rejects(pending, /Wallet changed/);
  assert.deepEqual(h.writes, []);
  h.onchain.getPlayerState = async () => ({ vault: [] });
  h.onchain.getGameWorld = async () => { throw new Error('RPC unavailable'); };
  assert.equal(await h.session.load(), true);
  assert.deepEqual(h.session.player.vault, []);
  assert.equal(h.session.world, null);
  h.onchain.getPlayerState = async () => ({ vault_count: 5 });
  await assert.rejects(h.session.load(), /Could not load/);
  assert.equal(h.writes.length, 1);
});

test('wallet event subscriptions do not multiply across reconnects or providers', () => {
  const first = new EventEmitter(); const second = new EventEmitter();
  const calls = [];
  const events = createWalletEvents({ onDisconnect: () => calls.push('disconnect'),
    onAccountChanged: key => calls.push(key) });
  events.attach(first);
  first.emit('disconnect');
  events.attach(first); events.attach(first);
  assert.equal(first.listenerCount('disconnect'), 1);
  events.attach(second);
  first.emit('accountChanged', 'old-wallet');
  second.emit('accountChanged', 'new-wallet');
  events.dispose(); events.dispose();
  second.emit('disconnect');
  assert.deepEqual(calls, ['disconnect', 'new-wallet']);
  assert.equal(first.listenerCount('accountChanged'), 0);
  assert.equal(second.listenerCount('disconnect'), 0);
});

function liveHost({ restored = false, phase = 'main' } = {}) {
  const h = routerHost();
  let connected = true;
  let state = { phase, playerPubkey: null, vault: [] };
  const writes = [];
  const provider = new EventEmitter();
  const onchain = { checkPlayerStateExists: async () => true,
    getPlayerState: async () => ({ vault: [1, 10] }), getGameWorld: async () => ({ day: 3 }) };
  const wallet = { isConnected: () => connected, getPublicKey: () => connected ? 'wallet-a' : null,
    connect: async () => { connected = true; } };
  const app = createLiveApp({ router: h.router, getState: () => state,
    setState: updates => { state = { ...state, ...updates }; writes.push(updates); },
    wasRestored: restored, getWallet: () => wallet, getOnchain: () => onchain, getProvider: () => provider,
    reload() {}, openWalletSite() {}, showToast() {}, showTxToast() {} });
  return { ...h, app, onchain, writes, provider, disconnect() { connected = false; provider.emit('disconnect'); } };
}

test('live entry gates unregistered players and never mounts paid screens before collection loads', async () => {
  const h = liveHost();
  h.onchain.checkPlayerStateExists = async () => false;
  await h.app.start();
  assert.equal(h.router.current, 'register');
  assert.equal(h.app.navigate('shop'), false);
  assert.equal(h.router.current, 'welcome');
  h.onchain.checkPlayerStateExists = async () => true;
  const read = deferred();
  h.onchain.getPlayerState = () => read.promise;
  const start = h.app.start();
  await Promise.resolve();
  assert.equal(h.mounts.some(m => m.name === 'home'), false);
  read.resolve({ vault: [30] });
  await start;
  assert.equal(h.router.current, 'home');
  assert.deepEqual(h.mounts.at(-1).props.playerState.vault, [30]);
});

test('disconnect during startup prevents a late collection from restoring gameplay', async () => {
  const h = liveHost();
  const read = deferred();
  h.onchain.getPlayerState = () => read.promise;
  const pending = h.app.start();
  await Promise.resolve();
  h.disconnect();
  read.resolve({ vault: [60] });
  await pending;
  assert.equal(h.router.current, 'welcome');
  assert.deepEqual(h.writes, []);
});

test('home refresh cannot overwrite a later route or its battle state', async () => {
  const h = liveHost();
  await h.app.start();
  const read = deferred();
  h.onchain.getPlayerState = () => read.promise;
  const pending = h.app.home();
  assert.equal(h.router.current, 'home-loading');
  h.app.navigate('shop');
  read.resolve({ vault: [60] });
  await pending;
  assert.equal(h.router.current, 'shop');
  assert.equal(h.writes.length, 1);
  assert.deepEqual(h.mounts.at(-1).props.playerState.vault, [1, 10]);
});

test('registration confirmation from a discarded entry cannot navigate a replacement session', async () => {
  const h = liveHost();
  h.onchain.checkPlayerStateExists = async () => false;
  const transaction = deferred();
  h.onchain.registerWaitlist = () => transaction.promise;
  await h.app.start();
  const pending = h.mounts.at(-1).props.onRegister();
  h.disconnect();
  transaction.resolve('confirmed-signature');
  await pending;
  assert.equal(h.router.current, 'welcome');
  assert.deepEqual(h.writes, []);
});

test('restore retains battle phases and returns lost matchmaking sockets to the lobby', async () => {
  for (const phase of ['matchmaking', 'preparation', 'interruption', 'reveal', 'loot', 'invalid']) {
    const h = liveHost({ restored: true, phase });
    await h.app.start();
    assert.equal(h.router.current, phase === 'matchmaking' ? 'main' : phase === 'invalid' ? 'home' : phase);
    if (phase === 'matchmaking') assert.equal(h.mounts.at(-1).props.mode, 'battle');
    h.app.dispose();
  }
});

test('practice fixture boot keeps collection and score routes without a live dependency', () => {
  for (const view of ['home', 'main', 'matchmaking', 'preparation', 'interruption', 'reveal', 'loot', 'loss', 'shop', 'trade', 'menu', 'register', 'unknown']) {
    const h = routerHost();
    let state = {};
    const practice = createPracticeApp({ router: h.router, getState: () => state,
      setState: updates => { state = { ...state, ...updates }; }, search: '?devview=' + view });
    practice.start();
    assert.equal(h.router.current, view === 'loss' ? 'loot' : ['register', 'unknown'].includes(view) ? 'home' : view);
    assert.equal(h.mounts.at(-1).props.playerState.vault.length, 30);
    assert.equal(state.duelId, null);
    assert.equal(state.p1RoundWins, view === 'loot' ? 3 : view === 'loss' ? 1 : 0);
    practice.dispose();
  }
});

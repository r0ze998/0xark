import test from 'node:test';
import assert from 'node:assert/strict';
import { createModalHost, deferred, settle } from './helpers/modal-host.js';

globalThis.location = { search: '?devview=home' };
globalThis.window = { location, oxarkPreview: false };
globalThis.confirm = () => true;
const { CardDetailModal } = await import('../src/components/card-detail.js');
const trade = await import('../src/components/trade-screen.js');
const { getState, setState } = await import('../src/state/battle-state.js');
const { ALL_CARD_IDS, isBurnable } = await import('../src/lib/cards.js');

function setup(t, onchain) {
  const host = createModalHost();
  globalThis.document = host.document;
  window.oxarkOnchain = onchain;
  window.oxarkWallet = { getPublicKey: () => 'owner' };
  setState({ vault: [1, 2], pendingBurnEffects: [] });
  t.after(() => { CardDetailModal.hide(); trade.unmount(host.container); });
  return host;
}

const copies = cardId => new Map([[cardId, [{ mint: `mint-${cardId}`, rarity: 0 }]]]);
const listing = (cardId, price = cardId * 1e9) => ({ cardId, price, seller: 'seller', createdAt: cardId });

for (const slowRead of ['mints', 'history']) {
  test(`card B promotion keeps B's mint when card A ${slowRead} resolves last`, async t => {
    const oldRead = deferred();
    const confirmation = deferred();
    const promoted = [];
    let mintReads = 0;
    const { container } = setup(t, {
      getOwnedCardMints: () => ++mintReads === 1
        ? slowRead === 'mints' ? oldRead.promise : Promise.resolve(copies(1))
        : Promise.resolve(copies(2)),
      getCardBattleHistory: mint => mint === 'mint-1' && slowRead === 'history'
        ? oldRead.promise : Promise.resolve({ wins: 10 }),
      promoteCard: mint => { promoted.push(mint); return confirmation.promise; },
    });
    CardDetailModal.show(container, 1);
    await settle();
    CardDetailModal.show(container, 2);
    await settle();
    oldRead.resolve(slowRead === 'mints' ? copies(1) : { wins: 100 });
    await settle();
    const clicked = container.querySelector('#cd-promote-btn').click();
    assert.deepEqual(promoted, ['mint-2']);
    CardDetailModal.hide(container);
    confirmation.resolve('confirmed');
    await clicked;
  });
}

test('a detached card modal ignores late provenance without reading more chain data', async t => {
  const read = deferred();
  let historyReads = 0;
  const { container } = setup(t, {
    getOwnedCardMints: () => read.promise,
    getCardBattleHistory: async () => { historyReads++; return { wins: 10 }; },
  });
  CardDetailModal.show(container, 1);
  container.innerHTML = ''; // Parent screen unmounted without calling hide.
  read.resolve(copies(1));
  await settle();
  assert.equal(historyReads, 0);
  assert.equal(container.querySelector('#cd-modal-overlay'), null);
});

test('a confirmed burn still updates the vault after closure without calling the next modal', async t => {
  const confirmation = deferred();
  const { container } = setup(t, { burnCard: () => confirmation.promise });
  const burnId = ALL_CARD_IDS.find(isBurnable);
  const nextId = burnId === 1 ? 2 : 1;
  setState({ vault: [burnId, nextId], pendingBurnEffects: [] });
  const callbacks = [];
  CardDetailModal.show(container, burnId, { onBurn: () => callbacks.push('old') });
  const clicked = container.querySelector('#cd-burn').click();
  CardDetailModal.show(container, nextId, { onBurn: () => callbacks.push('new') });
  confirmation.resolve('confirmed');
  await clicked;
  assert.deepEqual(getState().vault, [nextId]);
  assert.equal(getState().pendingBurnEffects.length, 1);
  assert.deepEqual(callbacks, []);
});

test('a confirmed promotion cannot reload or call the replacement card modal', async t => {
  const confirmation = deferred();
  let reads = 0;
  const callbacks = [];
  const { container } = setup(t, {
    getOwnedCardMints: async () => copies(++reads === 1 ? 1 : 2),
    getCardBattleHistory: async () => ({ wins: 10 }),
    promoteCard: () => confirmation.promise,
  });
  CardDetailModal.show(container, 1, { onPromote: () => callbacks.push('old') });
  await settle();
  const clicked = container.querySelector('#cd-promote-btn').click();
  CardDetailModal.show(container, 2, { onPromote: () => callbacks.push('new') });
  await settle();
  confirmation.resolve('confirmed');
  await clicked;
  assert.equal(reads, 2);
  assert.deepEqual(callbacks, []);
  assert.equal(container.querySelector('#cd-promote-btn').disabled, false);
});

test('an older exchange mount cannot replace the new mount with its late listings', async t => {
  const oldRead = deferred();
  let reads = 0;
  const { container } = setup(t, {
    fetchAllListings: () => ++reads === 1 ? oldRead.promise : Promise.resolve([listing(2)]),
  });
  const previousMount = trade.mount(container);
  trade.unmount(container);
  await trade.mount(container);
  const currentGrid = container.querySelector('#trade-grid');
  assert.match(currentGrid.innerHTML, /data-card-id="2"/);
  oldRead.resolve([listing(1)]);
  await previousMount;
  assert.match(currentGrid.innerHTML, /data-card-id="2"/);
  assert.doesNotMatch(currentGrid.innerHTML, /data-card-id="1"/);
});

test('purchase confirmation from an old mount cannot refresh the current exchange', async t => {
  const confirmation = deferred();
  let reads = 0;
  const { container } = setup(t, {
    fetchAllListings: async () => [listing(++reads)],
    acceptListing: () => confirmation.promise,
  });
  await trade.mount(container);
  const clicked = container.querySelector('.buy-listing-btn').click();
  trade.unmount(container);
  await trade.mount(container);
  confirmation.resolve();
  await clicked;
  assert.equal(reads, 2);
  assert.match(container.querySelector('#trade-grid').innerHTML, /data-card-id="2"/);
});

test('overlapping exchange refreshes keep the newest requested snapshot', async t => {
  const firstRefresh = deferred();
  const lastRefresh = deferred();
  let reads = 0;
  const { container } = setup(t, {
    fetchAllListings: () => ++reads === 1 ? Promise.resolve([listing(1), listing(2)])
      : reads === 2 ? firstRefresh.promise : lastRefresh.promise,
    acceptListing: async () => {},
  });
  await trade.mount(container);
  const [firstButton, secondButton] = container.querySelectorAll('.buy-listing-btn');
  const firstClick = firstButton.click();
  await settle();
  const secondClick = secondButton.click();
  await settle();
  lastRefresh.resolve([listing(4)]);
  await secondClick;
  firstRefresh.resolve([listing(3)]);
  await firstClick;
  assert.equal(reads, 3);
  assert.match(container.querySelector('#trade-grid').innerHTML, /data-card-id="4"/);
  assert.doesNotMatch(container.querySelector('#trade-grid').innerHTML, /data-card-id="3"/);
});

test('exchange unmount removes its body-mounted listing dialog', async t => {
  const { container, document } = setup(t, { fetchAllListings: async () => [] });
  await trade.mount(container, { playerState: { vault_bitmap: [3] } });
  await container.querySelector('#create-listing-btn').click();
  assert.ok(document.body.querySelector('.trade-modal-overlay'));
  trade.unmount(container);
  assert.equal(document.body.querySelector('.trade-modal-overlay'), null);
});

test('a dismissed listing confirmation leaves a replacement modal intact and refreshes confirmed listings', async t => {
  const confirmation = deferred();
  let reads = 0;
  let submissions = 0;
  const { container, document } = setup(t, {
    fetchAllListings: async () => ++reads === 1 ? [] : [listing(1)],
    createListing: () => { submissions++; return confirmation.promise; },
  });
  await trade.mount(container, { playerState: { vault_bitmap: [3] } });
  await container.querySelector('#create-listing-btn').click();
  const oldModal = document.body.querySelector('.trade-modal-overlay');
  await oldModal.querySelector('.modal-card-tile').click();
  const clicked = oldModal.querySelector('#confirm-listing-btn').click();
  await oldModal.querySelectorAll('.modal-card-tile')[1].click();
  await oldModal.querySelector('#confirm-listing-btn').click();
  assert.equal(submissions, 1, 'card selection must not unlock a pending submission');
  await oldModal.querySelector('#cancel-modal-btn').click();
  await container.querySelector('#create-listing-btn').click();
  const newModal = document.body.querySelector('.trade-modal-overlay');
  confirmation.resolve();
  await clicked;
  assert.equal(newModal.isConnected, true);
  assert.equal(newModal.querySelector('#confirm-listing-btn').disabled, true);
  assert.equal(reads, 2);
  assert.match(container.querySelector('#trade-grid').innerHTML, /data-card-id="1"/);
});

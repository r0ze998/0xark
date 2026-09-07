import test from 'node:test';
import assert from 'node:assert/strict';
import { ownedCardIds, listingLamports } from '../src/lib/trade-values.js';
import { detectWalletProvider, getWalletProvider, signWalletMessage } from '../src/lib/wallet-provider.js';

test('listing inventory uses the canonical vault without inventing or duplicating ownership', () => {
  assert.deepEqual(ownedCardIds({ vault: [10, 1, 10, 60, 61, 0, '2', null, 1.5] }), [10, 1, 60]);
  assert.deepEqual(ownedCardIds({ vault_bitmap: [255] }), []);
  assert.deepEqual(ownedCardIds(null), []);
});

test('SOL prices preserve lamports exactly and reject unsafe or ambiguous amounts', () => {
  assert.equal(listingLamports('0.001'), 1_000_000);
  assert.equal(listingLamports(' 1.000000001 '), 1_000_000_001);
  assert.equal(listingLamports('9007199.254740991'), Number.MAX_SAFE_INTEGER);
  for (const input of ['', 'Infinity', 'NaN', '-1', '1e2', '1 SOL', '0.000999999', '1.0000000001', '9007199.254740992']) {
    assert.equal(listingLamports(input), null, input);
  }
});

test('Solflare is used consistently without overwriting the Phantom namespace', () => {
  const solflare = { isSolflare: true };
  const scope = { solflare };
  assert.equal(detectWalletProvider(scope), solflare);
  assert.equal(getWalletProvider(scope), solflare);
  assert.equal(scope.solana, undefined);
  const chosen = {};
  scope.oxarkWallet = { provider: chosen };
  scope.phantom = { solana: { isPhantom: true } };
  assert.equal(getWalletProvider(scope), chosen);
});

test('wallet message authentication accepts Phantom and Solflare signature formats', async () => {
  const signature = new Uint8Array(64);
  for (const result of [signature, { signature }]) {
    assert.equal(await signWalletMessage({ signMessage: async () => result }, new Uint8Array()), signature);
  }
  await assert.rejects(signWalletMessage({ signMessage: async () => ({}) }, new Uint8Array()), /invalid/);
});

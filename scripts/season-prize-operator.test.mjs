import test from 'node:test';
import assert from 'node:assert/strict';
import { decodeOperatorPlayer, operatorPlayerOwner } from './season-prize-operator-lib.mjs';
import { encodeBase58 } from '../solana/client/src/lib/base58.js';

test('operator resolves the owner after game_id in both PlayerState queue layouts', () => {
  for (const queued of [false, true]) {
    const data = Buffer.alloc(320);
    data.writeBigUInt64LE(777n, 8);
    const owner = Uint8Array.from({length: 32}, (_, i) => i + 1);
    data.set(owner, 16);
    data[169] = queued ? 1 : 0;
    const vault = queued ? 202 : 170;
    data[vault] = 3;
    data.writeBigUInt64LE(500_000_000n, vault + 8);
    const state = decodeOperatorPlayer(data);
    assert.equal(state.owner, encodeBase58(owner));
    assert.deepEqual(state.vault, [1, 2]);
    assert.equal(state.deposit_amount, '500000000');
    assert.notEqual(state.owner, encodeBase58(data.subarray(8, 40)));
  }
  assert.throws(() => decodeOperatorPlayer(Buffer.alloc(48)));
  // Old per-duel PlayerStates share the discriminator but can have a short
  // layout. Identity must be readable before checking their different PDA seeds.
  assert.equal(operatorPlayerOwner(Buffer.alloc(48)), '1'.repeat(32));
  assert.throws(() => operatorPlayerOwner(Buffer.alloc(47)));
});

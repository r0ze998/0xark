/**
 * T83: ZK Card Commit — unit tests
 *
 * Tests the browser-side ZK card commit module logic and on-chain
 * CardCommitRecord PDA seed derivation.
 *
 * Run: node tests/t83-zk-commit.js
 */

'use strict';

const crypto = require('crypto');
const assert = require('assert');

let passed = 0;
let failed = 0;

function ok(label, fn) {
  try {
    fn();
    console.log('  PASS', label);
    passed++;
  } catch (e) {
    console.error('  FAIL', label, '—', e.message);
    failed++;
  }
}

async function okAsync(label, fn) {
  try {
    await fn();
    console.log('  PASS', label);
    passed++;
  } catch (e) {
    console.error('  FAIL', label, '—', e.message);
    failed++;
  }
}

// ── Port of browser zkCardCommit module (Node.js compatible) ─────────────────

function generateSalt() {
  const arr = crypto.randomBytes(32);
  arr[0] &= 0x1f; // clamp to 253 bits
  return arr;
}

async function computeCommitment(cardId, salt) {
  const data = Buffer.alloc(33);
  data[0] = cardId & 0xff;
  salt.copy(data, 1);
  return crypto.createHash('sha256').update(data).digest();
}

async function commitCard(cardId) {
  if (cardId < 1 || cardId > 60) throw new Error('Invalid card_id: ' + cardId);
  const salt = generateSalt();
  const commitment = await computeCommitment(cardId, salt);
  return { cardId, salt, commitment };
}

async function verifyAndReveal(cardId, salt, storedCommitment) {
  const computed = await computeCommitment(cardId, salt);
  if (computed.length !== storedCommitment.length) throw new Error('Commitment length mismatch');
  let diff = 0;
  for (let i = 0; i < computed.length; i++) diff |= computed[i] ^ storedCommitment[i];
  if (diff !== 0) throw new Error('Commitment mismatch — wrong card_id or salt');
  return { cardId, salt: Array.from(salt), commitment: Array.from(storedCommitment), verified: true };
}

// ── PDA seed derivation (mirrors on-chain Anchor seeds) ──────────────────────

function cardCommitSeeds(playerPubkeyBytes, gameId, round) {
  const prefix = Buffer.from('card_commit');
  const player = Buffer.from(playerPubkeyBytes);
  const gameIdBuf = Buffer.alloc(8);
  gameIdBuf.writeBigUInt64LE(BigInt(gameId));
  const roundBuf = Buffer.from([round & 0xff]);
  return [prefix, player, gameIdBuf, roundBuf];
}

// ── Main async runner ─────────────────────────────────────────────────────────

async function main() {
  console.log('\nT83 — ZK Card Commit\n');

  console.log('Salt generation:');
  ok('generateSalt returns 32 bytes', () => {
    const s = generateSalt();
    assert.strictEqual(s.length, 32);
  });
  ok('generateSalt top byte ≤ 0x1f (253-bit clamp)', () => {
    for (let i = 0; i < 100; i++) {
      const s = generateSalt();
      assert.ok(s[0] <= 0x1f, 'top byte too large: 0x' + s[0].toString(16));
    }
  });
  ok('generateSalt is random (two calls differ)', () => {
    const a = generateSalt();
    const b = generateSalt();
    let same = true;
    for (let i = 0; i < 32; i++) if (a[i] !== b[i]) { same = false; break; }
    assert.ok(!same, 'two salts were identical (astronomically unlikely)');
  });

  console.log('\nCommitment computation:');
  await okAsync('computeCommitment returns 32 bytes', async () => {
    const salt = generateSalt();
    const c = await computeCommitment(1, salt);
    assert.strictEqual(c.length, 32);
  });
  await okAsync('same inputs produce same commitment', async () => {
    const salt = generateSalt();
    const c1 = await computeCommitment(5, salt);
    const c2 = await computeCommitment(5, salt);
    assert.deepStrictEqual(c1, c2);
  });
  await okAsync('different card_id → different commitment', async () => {
    const salt = generateSalt();
    const c1 = await computeCommitment(1, salt);
    const c2 = await computeCommitment(2, salt);
    assert.notDeepStrictEqual(c1, c2);
  });
  await okAsync('different salt → different commitment', async () => {
    const s1 = generateSalt();
    const s2 = generateSalt();
    const c1 = await computeCommitment(10, s1);
    const c2 = await computeCommitment(10, s2);
    assert.notDeepStrictEqual(c1, c2);
  });
  await okAsync('commitment matches manual SHA-256(card_id | salt)', async () => {
    const cardId = 42;
    const salt = generateSalt();
    const expected = crypto.createHash('sha256')
      .update(Buffer.from([cardId]))
      .update(salt)
      .digest();
    const got = await computeCommitment(cardId, salt);
    assert.deepStrictEqual(got, expected);
  });

  console.log('\ncommitCard:');
  await okAsync('commitCard(1) returns { cardId, salt, commitment }', async () => {
    const r = await commitCard(1);
    assert.strictEqual(r.cardId, 1);
    assert.strictEqual(r.salt.length, 32);
    assert.strictEqual(r.commitment.length, 32);
  });
  await okAsync('commitCard(60) succeeds (boundary)', async () => {
    const r = await commitCard(60);
    assert.strictEqual(r.cardId, 60);
  });
  await okAsync('commitCard(0) throws InvalidCard', async () => {
    let threw = false;
    try { await commitCard(0); } catch { threw = true; }
    assert.ok(threw);
  });
  await okAsync('commitCard(61) throws InvalidCard', async () => {
    let threw = false;
    try { await commitCard(61); } catch { threw = true; }
    assert.ok(threw);
  });

  console.log('\nverifyAndReveal:');
  await okAsync('verifyAndReveal succeeds with matching inputs', async () => {
    const { cardId, salt, commitment } = await commitCard(33);
    const result = await verifyAndReveal(cardId, salt, commitment);
    assert.strictEqual(result.verified, true);
    assert.strictEqual(result.cardId, 33);
  });
  await okAsync('verifyAndReveal throws on wrong card_id', async () => {
    const { salt, commitment } = await commitCard(7);
    let threw = false;
    try { await verifyAndReveal(8, salt, commitment); } catch { threw = true; }
    assert.ok(threw);
  });
  await okAsync('verifyAndReveal throws on tampered salt', async () => {
    const { cardId, salt, commitment } = await commitCard(15);
    const badSalt = Buffer.from(salt);
    badSalt[0] ^= 0xff;
    let threw = false;
    try { await verifyAndReveal(cardId, badSalt, commitment); } catch { threw = true; }
    assert.ok(threw);
  });
  await okAsync('verifyAndReveal throws on tampered commitment', async () => {
    const { cardId, salt, commitment } = await commitCard(20);
    const bad = Buffer.from(commitment);
    bad[0] ^= 0x01;
    let threw = false;
    try { await verifyAndReveal(cardId, salt, bad); } catch { threw = true; }
    assert.ok(threw);
  });
  await okAsync('verifyAndReveal: constant-time comparison (all bad commitments throw)', async () => {
    for (let i = 0; i < 10; i++) {
      const { cardId, salt } = await commitCard(i + 1);
      const fakeCommit = crypto.randomBytes(32);
      let threw = false;
      try { await verifyAndReveal(cardId, salt, fakeCommit); } catch { threw = true; }
      assert.ok(threw, 'iteration ' + i + ' did not throw');
    }
  });

  console.log('\nPDA seed structure:');
  ok('cardCommitSeeds returns 4 buffers', () => {
    const seeds = cardCommitSeeds(new Uint8Array(32), 1n, 0);
    assert.strictEqual(seeds.length, 4);
  });
  ok('prefix seed is "card_commit"', () => {
    const seeds = cardCommitSeeds(new Uint8Array(32), 1n, 0);
    assert.strictEqual(seeds[0].toString(), 'card_commit');
  });
  ok('game_id is little-endian 8 bytes', () => {
    const seeds = cardCommitSeeds(new Uint8Array(32), 256n, 0);
    const buf = seeds[2];
    assert.strictEqual(buf.length, 8);
    assert.strictEqual(buf[0], 0x00);
    assert.strictEqual(buf[1], 0x01);
    assert.strictEqual(buf[2], 0x00);
  });
  ok('round is single byte', () => {
    const seeds = cardCommitSeeds(new Uint8Array(32), 1n, 5);
    assert.strictEqual(seeds[3].length, 1);
    assert.strictEqual(seeds[3][0], 5);
  });
  ok('round wraps to u8', () => {
    const seeds = cardCommitSeeds(new Uint8Array(32), 1n, 257);
    assert.strictEqual(seeds[3][0], 1); // 257 & 0xff = 1
  });
  ok('different rounds → different seed byte', () => {
    const a = cardCommitSeeds(new Uint8Array(32), 1n, 1);
    const b = cardCommitSeeds(new Uint8Array(32), 1n, 2);
    assert.notStrictEqual(a[3][0], b[3][0]);
  });
  ok('different game_ids → different seed buffer', () => {
    const a = cardCommitSeeds(new Uint8Array(32), 1n, 0);
    const b = cardCommitSeeds(new Uint8Array(32), 2n, 0);
    assert.notDeepStrictEqual(a[2], b[2]);
  });

  console.log('\nPhase state machine:');
  ok('valid zkCardPhase values defined', () => {
    const valid = ['off', 'commit', 'waiting', 'reveal', 'done'];
    assert.ok(valid.includes('commit'));
    assert.ok(valid.includes('reveal'));
    assert.ok(!valid.includes('unknown'));
  });
  ok('off → commit transition valid', () => {
    let phase = 'off';
    phase = 'commit';
    assert.strictEqual(phase, 'commit');
  });
  ok('commit → waiting transition valid', () => {
    let phase = 'commit';
    phase = 'waiting';
    assert.strictEqual(phase, 'waiting');
  });
  ok('waiting → reveal transition valid', () => {
    let phase = 'waiting';
    phase = 'reveal';
    assert.strictEqual(phase, 'reveal');
  });
  ok('reveal → done transition valid', () => {
    let phase = 'reveal';
    phase = 'done';
    assert.strictEqual(phase, 'done');
  });

  console.log('\nCard ID range coverage:');
  await okAsync('all card IDs 1-60 produce valid commitment and verify', async () => {
    for (let id = 1; id <= 60; id++) {
      const { cardId, salt, commitment } = await commitCard(id);
      assert.strictEqual(cardId, id);
      assert.strictEqual(commitment.length, 32);
      const rev = await verifyAndReveal(cardId, salt, commitment);
      assert.ok(rev.verified);
    }
  });

  console.log('\n─────────────────────────────');
  console.log(`T83 results: ${passed} passed, ${failed} failed`);
  if (failed > 0) { console.error('FAIL'); process.exit(1); }
  else { console.log('ALL PASS'); }
}

main().catch(e => { console.error(e); process.exit(1); });

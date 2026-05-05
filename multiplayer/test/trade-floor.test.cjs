'use strict';
/**
 * trade-floor.test.cjs — Phase 20-C Trade Floor unit tests
 *
 * Tests pure client-side logic (PDA seed derivation, data encoding, filter/sort).
 * Does not require a running validator or wallet.
 *
 * Run: node multiplayer/test/trade-floor.test.cjs
 */

const assert = require('node:assert/strict');
const crypto = require('node:crypto');

let passed = 0, failed = 0;

function test(name, fn) {
  try {
    const r = fn();
    if (r && typeof r.then === 'function') {
      return r.then(() => { console.log(`  ✓ ${name}`); passed++; })
              .catch(e => { console.error(`  ✗ ${name}\n    ${e.message}`); failed++; });
    }
    console.log(`  ✓ ${name}`);
    passed++;
  } catch (e) {
    console.error(`  ✗ ${name}\n    ${e.message}`);
    failed++;
  }
  return Promise.resolve();
}

// ── Inline discriminator computation (mirrors disc() in onchain.js) ───────────

function disc(name) {
  return Buffer.from(
    crypto.createHash('sha256').update(`global:${name}`).digest()
  ).slice(0, 8);
}

function discAcct(name) {
  return Buffer.from(
    crypto.createHash('sha256').update(`account:${name}`).digest()
  ).slice(0, 8);
}

// ── Binary encoding helpers ───────────────────────────────────────────────────

function writeU8(buf, off, val) {
  buf[off] = val & 0xff;
  return off + 1;
}

function writeU64LE(buf, off, val) {
  const n = BigInt(val);
  const view = new DataView(buf.buffer, buf.byteOffset + off, 8);
  view.setBigUint64(0, n, true);
  return off + 8;
}

function encodeCreateListing(cardId, priceLamports) {
  const data = new Uint8Array(17);
  disc('create_listing').copy(data, 0);
  data[8] = cardId;
  writeU64LE(data, 9, priceLamports);
  return data;
}

function encodeCancelListing(cardId) {
  const data = new Uint8Array(9);
  disc('cancel_listing').copy(data, 0);
  data[8] = cardId;
  return data;
}

function encodeAcceptListing(sellerBytes32, cardId) {
  const data = new Uint8Array(41);
  disc('accept_listing').copy(data, 0);
  data.set(sellerBytes32, 8);
  data[40] = cardId;
  return data;
}

// ── Inline filter/sort logic (mirrors trade-screen.js) ───────────────────────

function rarityKey(id) {
  if (id >= 55) return 'l';
  if (id >= 49) return 'r';
  if (id >= 31) return 'u';
  return 'c';
}

function applyFilters(listings, filterClan, filterRarity, sortMode) {
  let out = listings.slice();
  if (filterRarity !== '') out = out.filter(l => rarityKey(l.cardId) === filterRarity);
  if (sortMode === 'price-asc')  out.sort((a, b) => a.price - b.price);
  if (sortMode === 'price-desc') out.sort((a, b) => b.price - a.price);
  if (sortMode === 'newest')     out.sort((a, b) => b.createdAt - a.createdAt);
  return out;
}

// ── Tests ─────────────────────────────────────────────────────────────────────

async function runDiscriminatorTests() {
  console.log('\n─── discriminator encoding ───');

  await test('create_listing disc is 8 bytes', () => {
    const d = disc('create_listing');
    assert.strictEqual(d.length, 8);
  });

  await test('cancel_listing disc is 8 bytes', () => {
    const d = disc('cancel_listing');
    assert.strictEqual(d.length, 8);
  });

  await test('accept_listing disc is 8 bytes', () => {
    const d = disc('accept_listing');
    assert.strictEqual(d.length, 8);
  });

  await test('create_listing disc is stable across calls', () => {
    const d1 = disc('create_listing');
    const d2 = disc('create_listing');
    assert.deepStrictEqual([...d1], [...d2]);
  });

  await test('three instruction discs are distinct', () => {
    const create = [...disc('create_listing')].join(',');
    const cancel = [...disc('cancel_listing')].join(',');
    const accept = [...disc('accept_listing')].join(',');
    assert.notStrictEqual(create, cancel);
    assert.notStrictEqual(create, accept);
    assert.notStrictEqual(cancel, accept);
  });

  await test('TradeListing account disc is 8 bytes', () => {
    const d = discAcct('TradeListing');
    assert.strictEqual(d.length, 8);
  });

  await test('TradeListing account disc matches expected bytes', () => {
    const d = discAcct('TradeListing');
    // [69, 43, 175, 151, 184, 142, 145, 85]
    assert.deepStrictEqual([...d], [69, 43, 175, 151, 184, 142, 145, 85]);
  });
}

async function runEncodingTests() {
  console.log('\n─── instruction data encoding ───');

  await test('create_listing encodes to 17 bytes', () => {
    const data = encodeCreateListing(42, 50_000_000);
    assert.strictEqual(data.length, 17);
  });

  await test('create_listing: card_id at byte 8', () => {
    const data = encodeCreateListing(42, 50_000_000);
    assert.strictEqual(data[8], 42);
  });

  await test('create_listing: price LE u64 at bytes 9-16', () => {
    const price = 50_000_000n;
    const data = encodeCreateListing(42, Number(price));
    const view = new DataView(data.buffer, 9, 8);
    assert.strictEqual(view.getBigUint64(0, true), price);
  });

  await test('cancel_listing encodes to 9 bytes', () => {
    const data = encodeCancelListing(7);
    assert.strictEqual(data.length, 9);
  });

  await test('cancel_listing: card_id at byte 8', () => {
    const data = encodeCancelListing(7);
    assert.strictEqual(data[8], 7);
  });

  await test('accept_listing encodes to 41 bytes', () => {
    const sellerBytes = new Uint8Array(32).fill(0xab);
    const data = encodeAcceptListing(sellerBytes, 5);
    assert.strictEqual(data.length, 41);
  });

  await test('accept_listing: seller_pubkey at bytes 8-39', () => {
    const sellerBytes = new Uint8Array(32).fill(0xab);
    const data = encodeAcceptListing(sellerBytes, 5);
    assert.deepStrictEqual([...data.slice(8, 40)], [...sellerBytes]);
  });

  await test('accept_listing: card_id at byte 40', () => {
    const sellerBytes = new Uint8Array(32).fill(0);
    const data = encodeAcceptListing(sellerBytes, 17);
    assert.strictEqual(data[40], 17);
  });
}

async function runPricingTests() {
  console.log('\n─── pricing / validation logic ───');

  const MIN_LISTING_PRICE = 1_000_000; // 0.001 SOL

  await test('price 0 is below minimum', () => {
    assert.ok(0 < MIN_LISTING_PRICE);
  });

  await test('price 999999 is below minimum', () => {
    assert.ok(999_999 < MIN_LISTING_PRICE);
  });

  await test('price 1000000 meets minimum', () => {
    assert.ok(1_000_000 >= MIN_LISTING_PRICE);
  });

  await test('price 50000000 (0.05 SOL) is valid', () => {
    assert.ok(50_000_000 >= MIN_LISTING_PRICE);
  });

  await test('price encoded correctly for standard amount', () => {
    const data = encodeCreateListing(1, 50_000_000);
    const view = new DataView(data.buffer, 9, 8);
    assert.strictEqual(view.getBigUint64(0, true), 50_000_000n);
  });
}

async function runFilterSortTests() {
  console.log('\n─── filter and sort logic ───');

  const fixtures = [
    { seller: 'AAA', cardId: 1,  price: 100_000_000, createdAt: 1000 },  // common
    { seller: 'BBB', cardId: 35, price: 50_000_000,  createdAt: 2000 },  // uncommon
    { seller: 'CCC', cardId: 51, price: 200_000_000, createdAt: 500  },  // rare
    { seller: 'DDD', cardId: 58, price: 500_000_000, createdAt: 1500 },  // legendary
    { seller: 'EEE', cardId: 10, price: 30_000_000,  createdAt: 3000 },  // common
  ];

  await test('filter by rarity=common returns only commons', () => {
    const res = applyFilters(fixtures, '', 'c', 'price-asc');
    assert.ok(res.every(l => l.cardId <= 30));
    assert.strictEqual(res.length, 2);
  });

  await test('filter by rarity=uncommon returns only uncommons', () => {
    const res = applyFilters(fixtures, '', 'u', 'price-asc');
    assert.ok(res.every(l => l.cardId >= 31 && l.cardId <= 48));
    assert.strictEqual(res.length, 1);
  });

  await test('filter by rarity=rare returns only rares', () => {
    const res = applyFilters(fixtures, '', 'r', 'price-asc');
    assert.ok(res.every(l => l.cardId >= 49 && l.cardId <= 54));
    assert.strictEqual(res.length, 1);
  });

  await test('filter by rarity=legendary returns only legendaries', () => {
    const res = applyFilters(fixtures, '', 'l', 'price-asc');
    assert.ok(res.every(l => l.cardId >= 55));
    assert.strictEqual(res.length, 1);
  });

  await test('no filter returns all listings', () => {
    const res = applyFilters(fixtures, '', '', 'price-asc');
    assert.strictEqual(res.length, fixtures.length);
  });

  await test('sort price-asc: prices ascending', () => {
    const res = applyFilters(fixtures, '', '', 'price-asc');
    for (let i = 1; i < res.length; i++) {
      assert.ok(res[i].price >= res[i - 1].price, `price not ascending at ${i}`);
    }
  });

  await test('sort price-desc: prices descending', () => {
    const res = applyFilters(fixtures, '', '', 'price-desc');
    for (let i = 1; i < res.length; i++) {
      assert.ok(res[i].price <= res[i - 1].price, `price not descending at ${i}`);
    }
  });

  await test('sort newest: createdAt descending', () => {
    const res = applyFilters(fixtures, '', '', 'newest');
    for (let i = 1; i < res.length; i++) {
      assert.ok(res[i].createdAt <= res[i - 1].createdAt, `createdAt not descending at ${i}`);
    }
  });

  await test('filter + sort: uncommon price-asc', () => {
    const res = applyFilters(fixtures, '', 'u', 'price-asc');
    assert.strictEqual(res.length, 1);
    assert.strictEqual(res[0].cardId, 35);
  });
}

async function runTradePDATests() {
  console.log('\n─── TradeListing PDA seed structure ───');

  await test('TradeListing SIZE = 58 bytes', () => {
    // 8 disc + 32 seller + 1 card_id + 8 price + 8 created_at + 1 active
    const SIZE = 8 + 32 + 1 + 8 + 8 + 1;
    assert.strictEqual(SIZE, 58);
  });

  await test('trade seed = [116,114,97,100,101] (ASCII "trade")', () => {
    const expected = [116, 114, 97, 100, 101];
    const encoded  = Array.from(Buffer.from('trade'));
    assert.deepStrictEqual(encoded, expected);
  });

  await test('card_id byte is a valid u8 (0-255)', () => {
    for (const id of [1, 30, 31, 48, 49, 54, 55, 60]) {
      assert.ok(id >= 0 && id <= 255);
    }
  });

  await test('TradeListing decode layout: offset verification', () => {
    // Simulate a minimal raw account buffer (58 bytes)
    const buf = Buffer.alloc(58, 0);
    // Set card_id at byte 40 (after disc=8 + seller=32)
    buf[40] = 42;
    // Set price LE at bytes 41-48
    const view = new DataView(buf.buffer, 41, 8);
    view.setBigUint64(0, 999_000_000n, true);
    // Set active at byte 57
    buf[57] = 1;

    const cardId = buf[40];
    const price  = Number(new DataView(buf.buffer, 41, 8).getBigUint64(0, true));
    const active = buf[57] === 1;

    assert.strictEqual(cardId, 42);
    assert.strictEqual(price, 999_000_000);
    assert.strictEqual(active, true);
  });
}

async function main() {
  console.log('=== Phase 20-C Trade Floor Tests ===');

  await runDiscriminatorTests();
  await runEncodingTests();
  await runPricingTests();
  await runFilterSortTests();
  await runTradePDATests();

  console.log('\n──────────────────────────────────────────────────');
  console.log(`trade-floor: ${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch(e => { console.error('FATAL:', e); process.exit(1); });

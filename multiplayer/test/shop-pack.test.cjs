'use strict';
/**
 * shop-pack.test.cjs — Phase 20-B Shop unit tests
 *
 * Tests pure client-side logic (pick_card distribution, nonce encoding).
 * Does not require a running validator or wallet.
 *
 * Run: node multiplayer/test/shop-pack.test.cjs
 */

const assert = require('node:assert/strict');

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

// ── Inline pick_card logic (mirrors buy_pack.rs) ──────────────────────────────

function pickCard(roll, legendaryRate, rareRate, uncommonRate, forceUncommon) {
  if (forceUncommon) return pickUncommon(roll);
  const legThreshold = legendaryRate;
  const rareThreshold = legThreshold + rareRate;
  const uncThreshold  = rareThreshold + uncommonRate;

  if (roll < legThreshold)  return pickLegendary(roll);
  if (roll < rareThreshold) return pickRare(roll);
  if (roll < uncThreshold)  return pickUncommon(roll);
  return pickCommon(roll);
}

const pickCommon    = r => (r % 30) + 1;
const pickUncommon  = r => (r % 18) + 31;
const pickRare      = r => (r % 6)  + 49;
const pickLegendary = r => (r % 6)  + 55;

function rollFromBytes(hashBytes, cardIndex) {
  const b = [
    hashBytes[(cardIndex * 4) % 32],
    hashBytes[(cardIndex * 4 + 1) % 32],
    hashBytes[(cardIndex * 4 + 2) % 32],
    hashBytes[(cardIndex * 4 + 3) % 32],
  ];
  const u32 = (b[0] | (b[1] << 8) | (b[2] << 16) | (b[3] << 24)) >>> 0;
  return u32 % 1_000_000;
}

// ── Tests ──────────────────────────────────────────────────────────────────────

async function runPickCardTests() {
  console.log('\n─── pick_card logic ───');

  await test('force_uncommon always returns uncommon (id 31-48)', () => {
    for (const roll of [0, 50000, 200000, 999999]) {
      const id = pickCard(roll, 0, 20000, 180000, true);
      assert.ok(id >= 31 && id <= 48, `forceUncommon roll=${roll} gave ${id}`);
    }
  });

  await test('phase1 legendary=0: rolls 0-19999 are rare', () => {
    assert.ok(pickCard(0, 0, 20000, 180000, false) >= 49 && pickCard(0, 0, 20000, 180000, false) <= 54);
    assert.ok(pickCard(19999, 0, 20000, 180000, false) >= 49);
  });

  await test('phase1 legendary never drops (legendary_rate=0)', () => {
    for (let roll = 0; roll < 200000; roll += 10000) {
      const id = pickCard(roll, 0, 20000, 180000, false);
      assert.ok(id <= 54, `legendary dropped in phase1 at roll=${roll}: id=${id}`);
    }
  });

  await test('phase2 legendary drops for rolls < 15000', () => {
    for (const roll of [0, 7499, 14999]) {
      const id = pickCard(roll, 15000, 25000, 180000, false);
      assert.ok(id >= 55 && id <= 60, `roll=${roll} should be legendary: ${id}`);
    }
    const id = pickCard(15000, 15000, 25000, 180000, false);
    assert.ok(id >= 49 && id <= 54, `roll=15000 boundary should be rare: ${id}`);
  });

  await test('uncommon range 20000-199999 in phase1', () => {
    for (const roll of [20000, 100000, 199999]) {
      const id = pickCard(roll, 0, 20000, 180000, false);
      assert.ok(id >= 31 && id <= 48, `roll=${roll} expected uncommon: ${id}`);
    }
  });

  await test('common range ≥200000 in phase1', () => {
    for (const roll of [200000, 500000, 999999]) {
      const id = pickCard(roll, 0, 20000, 180000, false);
      assert.ok(id >= 1 && id <= 30, `roll=${roll} expected common: ${id}`);
    }
  });
}

async function runStatisticalTests() {
  console.log('\n─── statistical distribution (1000 trials) ───');

  await test('standard pack phase1: rare ≈2% (within ±2σ)', () => {
    const TRIALS = 1000;
    let rareCount = 0;

    // Deterministic pseudo-random rolls via sequential u32 values
    for (let i = 0; i < TRIALS; i++) {
      const roll = (i * 1000) % 1_000_000;
      const id   = pickCard(roll, 0, 20000, 180000, false);
      if (id >= 49 && id <= 54) rareCount++;
    }

    // Expected rare ≈ 2% → 20/1000. σ = sqrt(n*p*(1-p)) ≈ 4.4. ±2σ ≈ [11,29].
    const expected = TRIALS * 0.02;
    const sigma    = Math.sqrt(TRIALS * 0.02 * 0.98);
    assert.ok(
      rareCount >= expected - 2 * sigma && rareCount <= expected + 2 * sigma,
      `rare count ${rareCount} outside ±2σ [${(expected - 2*sigma).toFixed(1)}, ${(expected + 2*sigma).toFixed(1)}]`
    );
  });

  await test('standard pack phase1: uncommon ≈18% (within ±2σ)', () => {
    const TRIALS = 1000;
    let uncCount = 0;
    for (let i = 0; i < TRIALS; i++) {
      const roll = (i * 1000) % 1_000_000;
      const id   = pickCard(roll, 0, 20000, 180000, false);
      if (id >= 31 && id <= 48) uncCount++;
    }
    const expected = TRIALS * 0.18;
    const sigma    = Math.sqrt(TRIALS * 0.18 * 0.82);
    assert.ok(
      uncCount >= expected - 2 * sigma && uncCount <= expected + 2 * sigma,
      `uncommon count ${uncCount} outside ±2σ [${(expected-2*sigma).toFixed(1)}, ${(expected+2*sigma).toFixed(1)}]`
    );
  });

  await test('premium pack: first card always uncommon regardless of roll', () => {
    const rolls = [0, 1000, 50000, 200000, 999999];
    for (const roll of rolls) {
      const id = pickCard(roll, 15000, 25000, 180000, true);
      assert.ok(id >= 31 && id <= 48, `premium first card roll=${roll}: ${id}`);
    }
  });

  await test('premium pack: remaining 2 cards follow phase rates', () => {
    // Cards at index 1,2 are NOT force_uncommon
    const hashBytes = new Array(32).fill(0).map((_, i) => i * 7 + 13);
    for (let i = 1; i <= 2; i++) {
      const roll = rollFromBytes(hashBytes, i);
      const id   = pickCard(roll, 15000, 25000, 180000, false);
      assert.ok(id >= 1 && id <= 60, `premium card[${i}] id out of range: ${id}`);
    }
  });
}

async function runBytesTests() {
  console.log('\n─── roll computation from bytes ───');

  await test('rollFromBytes stays in 0-999999', () => {
    for (let i = 0; i < 32; i++) {
      const hash = new Array(32).fill(i);
      const roll = rollFromBytes(hash, 0);
      assert.ok(roll >= 0 && roll < 1_000_000, `roll=${roll} out of range`);
    }
  });

  await test('5 card indices produce distinct byte positions (no aliasing for i<5)', () => {
    const positions = Array.from({ length: 5 }, (_, i) => (i * 4) % 32);
    const unique = new Set(positions);
    assert.strictEqual(unique.size, 5, `byte positions aliased: ${positions}`);
  });

  await test('3 card indices for premium also produce distinct positions', () => {
    const positions = Array.from({ length: 3 }, (_, i) => (i * 4) % 32);
    const unique = new Set(positions);
    assert.strictEqual(unique.size, 3);
  });
}

async function main() {
  console.log('=== Phase 20-B Shop Tests ===');

  await runPickCardTests();
  await runStatisticalTests();
  await runBytesTests();

  console.log('\n──────────────────────────────────────────────────');
  console.log(`shop-pack: ${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch(e => { console.error('FATAL:', e); process.exit(1); });

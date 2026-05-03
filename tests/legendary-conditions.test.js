/**
 * Phase 15: Legendary acquisition condition tests (JS simulation of Rust logic)
 *
 * Simulates the 6 Legendary conditions from check_legendary.rs / check_all_legendaries().
 * This does not call Anchor — it tests the condition logic in isolation.
 *
 * Run: node tests/legendary-conditions.test.js
 */

'use strict';

const assert = require('node:assert/strict');

let passed = 0, failed = 0;
function test(name, fn) {
  try { fn(); console.log(`  ✓ ${name}`); passed++; }
  catch (e) { console.error(`  ✗ ${name}\n    ${e.message}`); failed++; }
}
function suite(name, fn) { console.log(`\n${name}`); fn(); }

// ─── JS simulation of Rust PlayerState fields ─────────────────────────────────

function makePs(overrides = {}) {
  return {
    win_streak:                0,
    x402_total_spend:          0,
    last_drop_to_tier5_timestamp: 0,
    vault_count:               0,
    peek_unique_targets:       new Uint8Array(8).fill(0),
    no_x402_win_streak:        0,
    total_matches:             0,
    consecutive_diff_actiontype: 0,
    legendary_progress:        [false, false, false, false, false, false],
    ...overrides,
  };
}

function makeWorld(overrides = {}) {
  return {
    legendary_acquired_count: [0, 0, 0, 0, 0, 0],
    LEGENDARY_MAX_CLAIMANTS:  1000,
    ...overrides,
  };
}

// JS port of check_legendary_condition logic
function checkLegendaryCondition(ps, world, idx, condition) {
  if (ps.legendary_progress[idx]) return false;  // already acquired
  if (!condition) return false;
  if (world.legendary_acquired_count[idx] >= world.LEGENDARY_MAX_CLAIMANTS) return false;
  ps.legendary_progress[idx] = true;
  world.legendary_acquired_count[idx]++;
  return true;
}

// JS port of check_all_legendaries
function checkAllLegendaries(ps, world, now) {
  const SECS_3_DAYS = 3 * 24 * 3600;

  // Legendary 0: Sentinel — win_streak >= 5
  checkLegendaryCondition(ps, world, 0, ps.win_streak >= 5);

  // Legendary 1: Magnate — x402_total_spend >= 1_000_000_000 lamports
  checkLegendaryCondition(ps, world, 1, ps.x402_total_spend >= 1_000_000_000);

  // Legendary 2: Marauder — Phoenix: dropped to tier5 within 3 days AND vault_count >= 30
  const phoenixCond = ps.last_drop_to_tier5_timestamp > 0
    && (now - ps.last_drop_to_tier5_timestamp) <= SECS_3_DAYS
    && ps.vault_count >= 30;
  checkLegendaryCondition(ps, world, 2, phoenixCond);

  // Legendary 3: Oracle — Detective: peeked 10+ unique wallets
  let uniquePeekCount = 0;
  for (const b of ps.peek_unique_targets) {
    let n = b;
    while (n) { uniquePeekCount += n & 1; n >>= 1; }
  }
  checkLegendaryCondition(ps, world, 3, uniquePeekCount >= 10);

  // Legendary 4: Ascetic — 5-win streak with zero x402 spend
  checkLegendaryCondition(ps, world, 4, ps.no_x402_win_streak >= 5);

  // Legendary 5: Architect — 10 consecutive matches with different ActionType
  checkLegendaryCondition(ps, world, 5,
    ps.total_matches >= 10 && ps.consecutive_diff_actiontype >= 10);
}

// ─────────────────────────────────────────────────────────────────────────────

suite('Legendary 0 — Sentinel (5-win streak)', () => {
  test('awarded on win_streak >= 5', () => {
    const ps = makePs({ win_streak: 5 });
    checkAllLegendaries(ps, makeWorld(), 0);
    assert.ok(ps.legendary_progress[0]);
  });
  test('not awarded on win_streak == 4', () => {
    const ps = makePs({ win_streak: 4 });
    checkAllLegendaries(ps, makeWorld(), 0);
    assert.ok(!ps.legendary_progress[0]);
  });
  test('idempotent: second call does not increment world count', () => {
    const ps = makePs({ win_streak: 10 });
    const world = makeWorld();
    checkAllLegendaries(ps, world, 0);
    checkAllLegendaries(ps, world, 0);
    assert.equal(world.legendary_acquired_count[0], 1);
  });
  test('supply cap prevents award', () => {
    const ps = makePs({ win_streak: 5 });
    const world = makeWorld({ legendary_acquired_count: [1000, 0, 0, 0, 0, 0] });
    checkAllLegendaries(ps, world, 0);
    assert.ok(!ps.legendary_progress[0]);
  });
});

suite('Legendary 1 — Magnate (1 SOL x402 spend)', () => {
  test('awarded on x402_total_spend >= 1_000_000_000', () => {
    const ps = makePs({ x402_total_spend: 1_000_000_000 });
    checkAllLegendaries(ps, makeWorld(), 0);
    assert.ok(ps.legendary_progress[1]);
  });
  test('not awarded on 999_999_999 lamports', () => {
    const ps = makePs({ x402_total_spend: 999_999_999 });
    checkAllLegendaries(ps, makeWorld(), 0);
    assert.ok(!ps.legendary_progress[1]);
  });
  test('awarded on spend > threshold (partial round)', () => {
    const ps = makePs({ x402_total_spend: 1_500_000_000 });
    checkAllLegendaries(ps, makeWorld(), 0);
    assert.ok(ps.legendary_progress[1]);
  });
});

suite('Legendary 2 — Marauder (Phoenix: tier5 → tier3+)', () => {
  const now = 1_000_000;
  const SECS_3_DAYS = 3 * 24 * 3600;

  test('awarded when dropped to tier5 within 3 days AND vault_count >= 30', () => {
    const ps = makePs({
      last_drop_to_tier5_timestamp: now - 3600,  // 1 hour ago
      vault_count: 30,
    });
    checkAllLegendaries(ps, makeWorld(), now);
    assert.ok(ps.legendary_progress[2]);
  });
  test('not awarded when drop_timestamp is 0 (never dropped)', () => {
    const ps = makePs({ last_drop_to_tier5_timestamp: 0, vault_count: 30 });
    checkAllLegendaries(ps, makeWorld(), now);
    assert.ok(!ps.legendary_progress[2]);
  });
  test('not awarded when drop was > 3 days ago', () => {
    const ps = makePs({
      last_drop_to_tier5_timestamp: now - (SECS_3_DAYS + 1),
      vault_count: 30,
    });
    checkAllLegendaries(ps, makeWorld(), now);
    assert.ok(!ps.legendary_progress[2]);
  });
  test('not awarded when vault_count < 30 even if drop was recent', () => {
    const ps = makePs({
      last_drop_to_tier5_timestamp: now - 3600,
      vault_count: 29,
    });
    checkAllLegendaries(ps, makeWorld(), now);
    assert.ok(!ps.legendary_progress[2]);
  });
  test('awarded exactly at 3-day boundary', () => {
    const ps = makePs({
      last_drop_to_tier5_timestamp: now - SECS_3_DAYS,
      vault_count: 30,
    });
    checkAllLegendaries(ps, makeWorld(), now);
    assert.ok(ps.legendary_progress[2]);
  });
});

suite('Legendary 3 — Oracle (10+ unique wallet peeks)', () => {
  function peekBits(count) {
    const arr = new Uint8Array(8).fill(0);
    let set = 0;
    for (let i = 0; i < Math.min(count, 64); i++) {
      arr[Math.floor(i / 8)] |= (1 << (i % 8));
      set++;
    }
    return arr;
  }

  test('awarded with 10 unique peeks', () => {
    const ps = makePs({ peek_unique_targets: peekBits(10) });
    checkAllLegendaries(ps, makeWorld(), 0);
    assert.ok(ps.legendary_progress[3]);
  });
  test('not awarded with 9 unique peeks', () => {
    const ps = makePs({ peek_unique_targets: peekBits(9) });
    checkAllLegendaries(ps, makeWorld(), 0);
    assert.ok(!ps.legendary_progress[3]);
  });
  test('awarded with 64 unique peeks (max)', () => {
    const ps = makePs({ peek_unique_targets: peekBits(64) });
    checkAllLegendaries(ps, makeWorld(), 0);
    assert.ok(ps.legendary_progress[3]);
  });
  test('zero peeks → not awarded', () => {
    const ps = makePs({ peek_unique_targets: new Uint8Array(8).fill(0) });
    checkAllLegendaries(ps, makeWorld(), 0);
    assert.ok(!ps.legendary_progress[3]);
  });
});

suite('Legendary 4 — Ascetic (5 no-x402 wins)', () => {
  test('awarded on no_x402_win_streak >= 5', () => {
    const ps = makePs({ no_x402_win_streak: 5 });
    checkAllLegendaries(ps, makeWorld(), 0);
    assert.ok(ps.legendary_progress[4]);
  });
  test('not awarded on no_x402_win_streak == 4', () => {
    const ps = makePs({ no_x402_win_streak: 4 });
    checkAllLegendaries(ps, makeWorld(), 0);
    assert.ok(!ps.legendary_progress[4]);
  });
  test('awarded independently of win_streak field', () => {
    const ps = makePs({ no_x402_win_streak: 5, win_streak: 0 });
    checkAllLegendaries(ps, makeWorld(), 0);
    assert.ok(ps.legendary_progress[4]);
    assert.ok(!ps.legendary_progress[0]);  // Sentinel not awarded (win_streak=0)
  });
});

suite('Legendary 5 — Architect (10 consecutive diff ActionType)', () => {
  test('awarded with total_matches>=10 AND consecutive_diff_actiontype>=10', () => {
    const ps = makePs({ total_matches: 10, consecutive_diff_actiontype: 10 });
    checkAllLegendaries(ps, makeWorld(), 0);
    assert.ok(ps.legendary_progress[5]);
  });
  test('not awarded if total_matches < 10', () => {
    const ps = makePs({ total_matches: 9, consecutive_diff_actiontype: 10 });
    checkAllLegendaries(ps, makeWorld(), 0);
    assert.ok(!ps.legendary_progress[5]);
  });
  test('not awarded if consecutive_diff_actiontype < 10', () => {
    const ps = makePs({ total_matches: 10, consecutive_diff_actiontype: 9 });
    checkAllLegendaries(ps, makeWorld(), 0);
    assert.ok(!ps.legendary_progress[5]);
  });
});

suite('Multi-legendary in one call', () => {
  test('can unlock all 6 simultaneously if all conditions met', () => {
    const now = 1_000_000;
    const ps = makePs({
      win_streak:                 5,
      x402_total_spend:           1_000_000_000,
      last_drop_to_tier5_timestamp: now - 3600,
      vault_count:                30,
      no_x402_win_streak:         5,
      total_matches:              10,
      consecutive_diff_actiontype: 10,
    });
    // Set 10 bits in peek_unique_targets
    const peeks = new Uint8Array(8).fill(0);
    peeks[0] = 0xff;
    peeks[1] = 0x03;  // 8+2=10 bits
    ps.peek_unique_targets = peeks;
    checkAllLegendaries(ps, makeWorld(), now);
    for (let i = 0; i < 6; i++) {
      assert.ok(ps.legendary_progress[i], `legendary ${i} should be acquired`);
    }
  });
  test('partial: only met conditions awarded', () => {
    const ps = makePs({ win_streak: 5, no_x402_win_streak: 5 });
    checkAllLegendaries(ps, makeWorld(), 0);
    assert.ok(ps.legendary_progress[0]);   // Sentinel
    assert.ok(!ps.legendary_progress[1]);  // Magnate
    assert.ok(!ps.legendary_progress[2]);  // Marauder
    assert.ok(!ps.legendary_progress[3]);  // Oracle
    assert.ok(ps.legendary_progress[4]);   // Ascetic
    assert.ok(!ps.legendary_progress[5]);  // Architect
  });
});

// ─────────────────────────────────────────────────────────────────────────────
console.log(`\n${'─'.repeat(50)}`);
console.log(`legendary-conditions: ${passed} passed, ${failed} failed`);
if (failed) { console.error('\nSome tests FAILED.'); process.exit(1); }

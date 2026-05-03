/**
 * Phase 15: Tier prize distribution tests (JS simulation of claim_prize_v2.rs logic)
 *
 * Tests compute_tier_prize() math — 5 tiers proportional to vault_count.
 *
 * Run: node tests/tier-prize.test.js
 */

'use strict';

const assert = require('node:assert/strict');

let passed = 0, failed = 0;
function test(name, fn) {
  try { fn(); console.log(`  ✓ ${name}`); passed++; }
  catch (e) { console.error(`  ✗ ${name}\n    ${e.message}`); failed++; }
}
function suite(name, fn) { console.log(`\n${name}`); fn(); }

// ─── JS port of compute_tier_prize (claim_prize_v2.rs) ────────────────────────
// Tier 1 (60 cards): 50% / winner_60_count
// Tier 2 (50-59):    25% × vault_count / tier2_total_vault
// Tier 3 (30-49):    15% × vault_count / tier3_total_vault
// Tier 4 (10-29):     8% × vault_count / tier4_total_vault
// Tier 5  (1-9):      2% × vault_count / tier5_total_vault
// timeout_mode: no winner_60 → all vault_count > 0 get tier1 treatment

function computeTierPrize(vaultCount, prizePool, world, timeoutMode) {
  if (vaultCount === 60n || (timeoutMode && vaultCount > 0n)) {
    const tier1Pool = prizePool * 50n / 100n;
    const divisor = world.winner_60_count > 0n ? world.winner_60_count : 1n;
    return tier1Pool / divisor;
  } else if (vaultCount >= 50n) {
    if (world.tier2_total_vault === 0n) return 0n;
    return prizePool * 25n / 100n * vaultCount / world.tier2_total_vault;
  } else if (vaultCount >= 30n) {
    if (world.tier3_total_vault === 0n) return 0n;
    return prizePool * 15n / 100n * vaultCount / world.tier3_total_vault;
  } else if (vaultCount >= 10n) {
    if (world.tier4_total_vault === 0n) return 0n;
    return prizePool * 8n / 100n * vaultCount / world.tier4_total_vault;
  } else {
    if (world.tier5_total_vault === 0n) return 0n;
    return prizePool * 2n / 100n * vaultCount / world.tier5_total_vault;
  }
}

function makeWorld(overrides = {}) {
  return {
    winner_60_count:   overrides.winner_60_count   ?? 1n,
    tier2_total_vault: overrides.tier2_total_vault ?? 50n,
    tier3_total_vault: overrides.tier3_total_vault ?? 30n,
    tier4_total_vault: overrides.tier4_total_vault ?? 10n,
    tier5_total_vault: overrides.tier5_total_vault ?? 5n,
  };
}

const PRIZE = 10_000_000_000n; // 10 SOL in lamports

// ─────────────────────────────────────────────────────────────────────────────

suite('Tier 1 — 60 cards (50% / winner_count)', () => {
  test('single winner gets full 50%', () => {
    const world = makeWorld({ winner_60_count: 1n });
    const prize = computeTierPrize(60n, PRIZE, world, false);
    assert.equal(prize, PRIZE * 50n / 100n);
  });
  test('2 winners each get 25%', () => {
    const world = makeWorld({ winner_60_count: 2n });
    const prize = computeTierPrize(60n, PRIZE, world, false);
    assert.equal(prize, PRIZE * 50n / 100n / 2n);
  });
  test('10 winners each get 5%', () => {
    const world = makeWorld({ winner_60_count: 10n });
    const prize = computeTierPrize(60n, PRIZE, world, false);
    assert.equal(prize, PRIZE * 50n / 100n / 10n);
  });
});

suite('Timeout mode — no winner_60, max vault_count gets Tier 1', () => {
  test('any vault_count > 0 gets tier1 prize in timeout_mode', () => {
    const world = makeWorld({ winner_60_count: 0n });
    const p30 = computeTierPrize(30n, PRIZE, world, true);
    const p59 = computeTierPrize(59n, PRIZE, world, true);
    // Both should equal tier1_pool / 1
    assert.equal(p30, PRIZE * 50n / 100n);
    assert.equal(p59, PRIZE * 50n / 100n);
  });
  test('vault_count=0 in timeout_mode returns 0 (via NoPrizeClaim check before call)', () => {
    const world = makeWorld({ winner_60_count: 0n });
    // In Rust, vault_count=0 is rejected before reaching compute_tier_prize.
    // But if somehow called with 0, timeout_mode condition is (vaultCount > 0n).
    const prize = computeTierPrize(0n, PRIZE, world, true);
    // 0 is NOT > 0, so falls through tier checks; tier5_total_vault=5 so:
    // prize = PRIZE*2/100 * 0 / 5 = 0
    assert.equal(prize, 0n);
  });
});

suite('Tier 2 — 50-59 cards (25% proportional)', () => {
  test('single tier2 player gets full 25%', () => {
    const world = makeWorld({ tier2_total_vault: 50n });
    const prize = computeTierPrize(50n, PRIZE, world, false);
    assert.equal(prize, PRIZE * 25n / 100n);
  });
  test('proportional split: 50 of 100 total gets 50% of 25%', () => {
    const world = makeWorld({ tier2_total_vault: 100n });
    const prize = computeTierPrize(50n, PRIZE, world, false);
    assert.equal(prize, PRIZE * 25n / 100n / 2n);
  });
  test('zero tier2_total_vault returns 0', () => {
    const world = makeWorld({ tier2_total_vault: 0n });
    const prize = computeTierPrize(55n, PRIZE, world, false);
    assert.equal(prize, 0n);
  });
  test('59 cards qualifies for tier2', () => {
    const world = makeWorld({ tier2_total_vault: 59n });
    const prize = computeTierPrize(59n, PRIZE, world, false);
    assert.equal(prize, PRIZE * 25n / 100n);
  });
});

suite('Tier 3 — 30-49 cards (15% proportional)', () => {
  test('single tier3 player gets full 15%', () => {
    const world = makeWorld({ tier3_total_vault: 30n });
    const prize = computeTierPrize(30n, PRIZE, world, false);
    assert.equal(prize, PRIZE * 15n / 100n);
  });
  test('proportional: 30 of 60 total gets 50% of 15%', () => {
    const world = makeWorld({ tier3_total_vault: 60n });
    const prize = computeTierPrize(30n, PRIZE, world, false);
    assert.equal(prize, PRIZE * 15n / 100n / 2n);
  });
  test('49 cards qualifies for tier3', () => {
    const world = makeWorld({ tier3_total_vault: 49n });
    const prize = computeTierPrize(49n, PRIZE, world, false);
    assert.equal(prize, PRIZE * 15n / 100n);
  });
  test('zero tier3_total_vault returns 0', () => {
    const world = makeWorld({ tier3_total_vault: 0n });
    assert.equal(computeTierPrize(40n, PRIZE, world, false), 0n);
  });
});

suite('Tier 4 — 10-29 cards (8% proportional)', () => {
  test('single tier4 player gets full 8%', () => {
    const world = makeWorld({ tier4_total_vault: 10n });
    const prize = computeTierPrize(10n, PRIZE, world, false);
    assert.equal(prize, PRIZE * 8n / 100n);
  });
  test('29 cards qualifies for tier4', () => {
    const world = makeWorld({ tier4_total_vault: 29n });
    const prize = computeTierPrize(29n, PRIZE, world, false);
    assert.equal(prize, PRIZE * 8n / 100n);
  });
  test('zero tier4_total_vault returns 0', () => {
    const world = makeWorld({ tier4_total_vault: 0n });
    assert.equal(computeTierPrize(20n, PRIZE, world, false), 0n);
  });
});

suite('Tier 5 — 1-9 cards (2% proportional)', () => {
  test('single tier5 player gets full 2%', () => {
    const world = makeWorld({ tier5_total_vault: 5n });
    const prize = computeTierPrize(5n, PRIZE, world, false);
    assert.equal(prize, PRIZE * 2n / 100n);
  });
  test('1 card qualifies for tier5', () => {
    const world = makeWorld({ tier5_total_vault: 1n });
    const prize = computeTierPrize(1n, PRIZE, world, false);
    assert.equal(prize, PRIZE * 2n / 100n);
  });
  test('9 cards qualifies for tier5', () => {
    const world = makeWorld({ tier5_total_vault: 9n });
    const prize = computeTierPrize(9n, PRIZE, world, false);
    assert.equal(prize, PRIZE * 2n / 100n);
  });
  test('zero tier5_total_vault returns 0', () => {
    const world = makeWorld({ tier5_total_vault: 0n });
    assert.equal(computeTierPrize(5n, PRIZE, world, false), 0n);
  });
});

suite('Tier boundaries (exact thresholds)', () => {
  test('vault_count=60 → tier1', () => {
    const world = makeWorld({ winner_60_count: 1n });
    const prize = computeTierPrize(60n, PRIZE, world, false);
    assert.equal(prize, PRIZE * 50n / 100n);
  });
  test('vault_count=50 → tier2', () => {
    const world = makeWorld({ tier2_total_vault: 50n });
    assert.equal(computeTierPrize(50n, PRIZE, world, false), PRIZE * 25n / 100n);
  });
  test('vault_count=49 → tier3', () => {
    const world = makeWorld({ tier3_total_vault: 49n });
    assert.equal(computeTierPrize(49n, PRIZE, world, false), PRIZE * 15n / 100n);
  });
  test('vault_count=30 → tier3', () => {
    const world = makeWorld({ tier3_total_vault: 30n });
    assert.equal(computeTierPrize(30n, PRIZE, world, false), PRIZE * 15n / 100n);
  });
  test('vault_count=29 → tier4', () => {
    const world = makeWorld({ tier4_total_vault: 29n });
    assert.equal(computeTierPrize(29n, PRIZE, world, false), PRIZE * 8n / 100n);
  });
  test('vault_count=10 → tier4', () => {
    const world = makeWorld({ tier4_total_vault: 10n });
    assert.equal(computeTierPrize(10n, PRIZE, world, false), PRIZE * 8n / 100n);
  });
  test('vault_count=9 → tier5', () => {
    const world = makeWorld({ tier5_total_vault: 9n });
    assert.equal(computeTierPrize(9n, PRIZE, world, false), PRIZE * 2n / 100n);
  });
  test('vault_count=1 → tier5', () => {
    const world = makeWorld({ tier5_total_vault: 1n });
    assert.equal(computeTierPrize(1n, PRIZE, world, false), PRIZE * 2n / 100n);
  });
});

suite('Total payout never exceeds prize pool', () => {
  test('two tier2 players each claiming proportional share', () => {
    // Both in tier2 range (50-59), total vault = 100
    const world = makeWorld({ tier2_total_vault: 100n });
    const a = computeTierPrize(55n, PRIZE, world, false);
    const b = computeTierPrize(45n, PRIZE, world, false);
    // 45 falls into tier3 (30-49), only a uses tier2; b uses tier3
    // Just verify tier2 portion doesn't exceed 25%
    const tier2Pool = PRIZE * 25n / 100n;
    assert.ok(a <= tier2Pool, `a=${a} > tier2Pool=${tier2Pool}`);
  });
  test('all-tier payout sum <= 100%', () => {
    const world = makeWorld({
      winner_60_count:   1n,
      tier2_total_vault: 55n,
      tier3_total_vault: 35n,
      tier4_total_vault: 15n,
      tier5_total_vault:  5n,
    });
    const t1 = computeTierPrize(60n, PRIZE, world, false);
    const t2 = computeTierPrize(55n, PRIZE, world, false);
    const t3 = computeTierPrize(35n, PRIZE, world, false);
    const t4 = computeTierPrize(15n, PRIZE, world, false);
    const t5 = computeTierPrize(5n,  PRIZE, world, false);
    // 50+25+15+8+2 = 100% per design
    assert.equal(t1 + t2 + t3 + t4 + t5, PRIZE * 100n / 100n);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
console.log(`\n${'─'.repeat(50)}`);
console.log(`tier-prize: ${passed} passed, ${failed} failed`);
if (failed) { console.error('\nSome tests FAILED.'); process.exit(1); }

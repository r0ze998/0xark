/**
 * t97-chain.js — T97 Chain system unit tests
 * Chain card IDs: 11, 12, 15, 21, 22, 27, 33, 35, 51, 52, 53, 57
 * Rule: after successful steal, stealer draws 1 pool card per chain card held (max 3)
 * Run: node tests/t97-chain.js
 */

'use strict';

let pass = 0, fail = 0;

function assert(label, cond) {
  if (cond) { console.log(`  ✓ ${label}`); pass++; }
  else       { console.error(`  ✗ ${label}`); fail++; }
}

// ── Chain card set ───────────────────────────────────────────────────────────

const CHAIN_CARDS = new Set([11, 12, 15, 21, 22, 27, 33, 35, 51, 52, 53, 57]);

function isChain(id) { return CHAIN_CARDS.has(id); }

function countChains(cards) {
  return cards.filter(c => isChain(c)).length;
}

// ── Pool simulation ──────────────────────────────────────────────────────────

function makePool(total = 30) {
  // Simplified: pool has 'total' cards (IDs cycling 1-60)
  return { cards: Array.from({ length: total }, (_, i) => (i % 60) + 1), size: total };
}

function pickFromPool(pool, seed) {
  if (!pool.cards.length) return 0;
  const idx = Number(BigInt(seed) % BigInt(pool.cards.length));
  const card = pool.cards[idx];
  pool.cards.splice(idx, 1);
  pool.size--;
  return card;
}

function placeCard(cards, id) {
  const slot = cards.indexOf(0);
  if (slot >= 0) { cards[slot] = id; return true; }
  return false; // hand full
}

// Simulate steal + chain bonus
function simulateStealWithChain(stealer_cards, victim_cards, pool, seed) {
  const filled = victim_cards.map((c, i) => ({ c, i })).filter(({ c }) => c > 0);
  if (!filled.length) return { stolen: 0, bonus: 0 };

  const pick = Number(BigInt(seed) % BigInt(filled.length));
  const { c: stolen, i: idx } = filled[pick];
  victim_cards[idx] = 0;
  placeCard(stealer_cards, stolen);

  let bonus = 0;
  const chain_n = countChains(stealer_cards);
  if (chain_n > 0) {
    let chain_seed = BigInt(seed) >> 8n;
    for (let c = 0; c < Math.min(chain_n, 3); c++) {
      const extra = pickFromPool(pool, chain_seed);
      if (extra > 0) {
        placeCard(stealer_cards, extra);
        bonus++;
      }
      chain_seed += 0x9e3779b97f4a7c15n;
    }
  }

  return { stolen, bonus, chain_n };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

console.log('\n── T97 Chain ──\n');

// 1. CHAIN_CARDS has exactly 12 entries
assert('CHAIN_CARDS has 12 entries', CHAIN_CARDS.size === 12);

// 2. All chain cards in range [1-60]
for (const id of CHAIN_CARDS) {
  assert(`chain card ${id} in range [1,60]`, id >= 1 && id <= 60);
}

// 3. isChain() true for all 12 chain cards
for (const id of CHAIN_CARDS) {
  assert(`isChain(${id}) = true`, isChain(id));
}

// 4. isChain() false for non-chain cards
assert('isChain(1) = false', !isChain(1));
assert('isChain(10) = false', !isChain(10));
assert('isChain(60) = false', !isChain(60));

// 5. countChains — 0 for empty hand
assert('countChains([0,0,0,0,0]) = 0', countChains([0, 0, 0, 0, 0]) === 0);

// 6. countChains — 1 chain card
assert('countChains([11,5,0,0,0]) = 1', countChains([11, 5, 0, 0, 0]) === 1);

// 7. countChains — 3 chain cards
assert('countChains([11,21,51,5,0]) = 3', countChains([11, 21, 51, 5, 0]) === 3);

// 8. countChains — max 5 chain cards (all slots)
assert('countChains([11,12,15,21,22]) = 5', countChains([11, 12, 15, 21, 22]) === 5);

// 9. No chain → no bonus
{
  const stealer = [5, 0, 0, 0, 0];
  const victim  = [20, 0, 0, 0, 0];
  const pool = makePool(30);
  const { bonus, chain_n } = simulateStealWithChain(stealer, victim, pool, 0n);
  assert('no chain cards → bonus = 0', bonus === 0);
  assert('chain_n = 0 when no chain cards', chain_n === 0);
}

// 10. 1 chain card → 1 bonus card
{
  const stealer = [11, 0, 0, 0, 0]; // card 11 = Chain
  const victim  = [20, 0, 0, 0, 0];
  const pool = makePool(30);
  const { bonus, chain_n } = simulateStealWithChain(stealer, victim, pool, 0n);
  assert('1 chain card → chain_n = 1', chain_n === 1);
  assert('1 chain card → 1 bonus draw', bonus === 1);
}

// 11. 2 chain cards → 2 bonus cards
{
  const stealer = [11, 21, 0, 0, 0]; // 2 chain cards
  const victim  = [20, 0, 0, 0, 0];
  const pool = makePool(30);
  const { bonus, chain_n } = simulateStealWithChain(stealer, victim, pool, 0n);
  assert('2 chain cards → chain_n = 2', chain_n === 2);
  assert('2 chain cards → 2 bonus draws', bonus === 2);
}

// 12. Chain capped at 3 even if 4+ chain cards held
{
  const stealer = [11, 21, 51, 12, 0]; // 4 chain cards
  const victim  = [20, 0, 0, 0, 0];
  const pool = makePool(30);
  const { bonus, chain_n } = simulateStealWithChain(stealer, victim, pool, 0n);
  assert('4 chain cards: chain_n = 4', chain_n === 4);
  assert('4 chain cards: bonus capped at 3', bonus === 3);
}

// 13. Empty pool → no bonus even with chain cards
{
  const stealer = [11, 21, 51, 0, 0]; // 3 chain cards
  const victim  = [20, 0, 0, 0, 0];
  const pool = makePool(0); // empty
  const { bonus } = simulateStealWithChain(stealer, victim, pool, 0n);
  assert('empty pool → bonus = 0 despite chain cards', bonus === 0);
}

// 14. Chain cards — element distribution check
//   Water: 11,12,15 (×3)   Earth: 33,35 (×2)   Shadow: none
//   Wind: 21,22,27 (×3)    Light: 51,52,53,57 (×4)
const waterChain  = [...CHAIN_CARDS].filter(id => id >= 11 && id <= 20).length;
const windChain   = [...CHAIN_CARDS].filter(id => id >= 21 && id <= 30).length;
const earthChain  = [...CHAIN_CARDS].filter(id => id >= 31 && id <= 40).length;
const shadowChain = [...CHAIN_CARDS].filter(id => id >= 41 && id <= 50).length;
const lightChain  = [...CHAIN_CARDS].filter(id => id >= 51 && id <= 60).length;
assert('Water chain cards = 3 (ids 11,12,15)', waterChain === 3);
assert('Wind chain cards = 3 (ids 21,22,27)', windChain === 3);
assert('Earth chain cards = 2 (ids 33,35)', earthChain === 2);
assert('Shadow chain cards = 0', shadowChain === 0);
assert('Light chain cards = 4 (ids 51,52,53,57)', lightChain === 4);

// ── Summary ──────────────────────────────────────────────────────────────────

console.log(`\n── Result: ${pass}/${pass + fail} passed ──`);
if (fail > 0) { console.error(`${fail} FAILED`); process.exit(1); }

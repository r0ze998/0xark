/**
 * t96-deathrattle.js — T96 Deathrattle system unit tests
 * DR card IDs: 1, 3, 4, 9, 13, 34, 41, 42, 44, 46
 * Rule: when a DR card is stolen, stealer loses a random card back to victim
 * Run: node tests/t96-deathrattle.js
 */

'use strict';

let pass = 0, fail = 0;

function assert(label, cond) {
  if (cond) { console.log(`  ✓ ${label}`); pass++; }
  else       { console.error(`  ✗ ${label}`); fail++; }
}

// ── DR/Chain card sets (mirrors Rust) ────────────────────────────────────────

const DR_CARDS   = new Set([1, 3, 4, 9, 13, 34, 41, 42, 44, 46]);
const CHAIN_CARDS = new Set([11, 12, 15, 21, 22, 27, 33, 35, 51, 52, 53, 57]);

function isDeathrattle(id) { return DR_CARDS.has(id); }
function isChain(id)       { return CHAIN_CARDS.has(id); }

// Verify no overlap
function intersect(a, b) { return new Set([...a].filter(x => b.has(x))); }
const overlap = intersect(DR_CARDS, CHAIN_CARDS);

// ── Simulated steal + deathrattle logic ─────────────────────────────────────

function makePlayer(cards) {
  return { cards: [...cards], card_count: cards.filter(c => c > 0).length };
}

function stealRandomCard(cards, seed) {
  const filled = cards.map((c, i) => ({ c, i })).filter(({ c }) => c > 0);
  if (!filled.length) return 0;
  const pick = Number(BigInt(seed) % BigInt(filled.length));
  const { c, i } = filled[pick];
  cards[i] = 0;
  return c;
}

function placeCard(cards, id) {
  const slot = cards.indexOf(0);
  if (slot >= 0) cards[slot] = id;
}

// Simulate steal with deathrattle logic
function simulateSteal(stealer, victim, seed) {
  const stolen = stealRandomCard(victim.cards, seed);
  if (stolen > 0) {
    placeCard(stealer.cards, stolen);
    stealer.card_count++;
    victim.card_count--;

    const log = [`Player stole card ${stolen}`];

    if (isDeathrattle(stolen)) {
      const dr_seed = BigInt(seed) ^ 0xdeadbeefcafeba01n;
      const penalty = stealRandomCard(stealer.cards, dr_seed);
      if (penalty > 0) {
        placeCard(victim.cards, penalty);
        victim.card_count++;
        stealer.card_count--;
        log.push(`DEATHRATTLE ACTIVATED! card ${stolen} triggered, stealer lost card ${penalty}`);
      }
    }

    return { stolen, log };
  }
  return { stolen: 0, log: [] };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

console.log('\n── T96 Deathrattle ──\n');

// 1. DR card set has exactly 10 members
assert('DR_CARDS has 10 entries', DR_CARDS.size === 10);

// 2. Chain card set has exactly 12 members
assert('CHAIN_CARDS has 12 entries', CHAIN_CARDS.size === 12);

// 3. No card has both DR and Chain (GI design constraint)
assert('DR ∩ Chain = ∅', overlap.size === 0);

// 4. is_deathrattle() — all 10 DR cards
for (const id of DR_CARDS) {
  assert(`isDeathrattle(${id}) = true`, isDeathrattle(id));
}

// 5. is_deathrattle() — false for non-DR cards
assert('isDeathrattle(2) = false', !isDeathrattle(2));
assert('isDeathrattle(11) = false', !isDeathrattle(11));
assert('isDeathrattle(60) = false', !isDeathrattle(60));

// 6. Non-DR card steal — no penalty
{
  const stealer = makePlayer([20, 0, 0, 0, 0]); // card 20 (not DR)
  const victim  = makePlayer([20, 30, 0, 0, 0]);
  const { stolen, log } = simulateSteal(stealer, victim, 0n);
  assert('non-DR steal: card transferred', stolen > 0);
  assert('non-DR steal: no DEATHRATTLE log', !log.some(l => l.includes('DEATHRATTLE')));
  assert('non-DR steal: stealer gained 1', stealer.card_count === 2);
  assert('non-DR steal: victim lost 1', victim.card_count === 1);
}

// 7. DR card (card 41 — Shadow tier) steal — penalty fires
{
  const victim  = makePlayer([41, 30, 0, 0, 0]);  // 41 = DR card
  const stealer = makePlayer([20, 25, 0, 0, 0]);  // 2 non-DR cards
  const preStealerCount = stealer.card_count;
  const preVictimCount  = victim.card_count;
  const { stolen, log } = simulateSteal(stealer, victim, 0n);
  assert('DR steal: stole card 41', stolen === 41);
  assert('DR steal: DEATHRATTLE log present', log.some(l => l.includes('DEATHRATTLE')));
  // Net effect: stealer had 2, stole 1, lost 1 penalty → still 2
  // Victim had 2, lost 1, gained 1 penalty → still 2 (or 1 if victim was empty before penalty card)
  assert('DR steal: stealer net card_count unchanged (steal+penalty cancel)', stealer.card_count === preStealerCount);
}

// 8. DR card (card 3) steal with only 1 card in stealer hand
{
  const victim  = makePlayer([3, 0, 0, 0, 0]);    // card 3 = DR
  const stealer = makePlayer([50, 0, 0, 0, 0]);   // only 1 card
  const { stolen, log } = simulateSteal(stealer, victim, 0n);
  // Stealer gets card 3, then deathrattle tries to take card from stealer
  // Stealer now has card 3 (just stolen) + card 50, so penalty picks one
  assert('DR steal card 3: stolen', stolen === 3);
  assert('DR steal card 3: DEATHRATTLE fires', log.some(l => l.includes('DEATHRATTLE')));
}

// 9. Empty victim — steal returns 0
{
  const victim  = makePlayer([0, 0, 0, 0, 0]);
  const stealer = makePlayer([5, 0, 0, 0, 0]);
  const { stolen } = simulateSteal(stealer, victim, 0n);
  assert('empty victim: steal returns 0', stolen === 0);
  assert('empty victim: no deathrattle', stealer.card_count === 1);
}

// 10. DR card IDs are within 1-60 bounds
for (const id of DR_CARDS) {
  assert(`DR card ${id} in range [1,60]`, id >= 1 && id <= 60);
}

// ── Summary ──────────────────────────────────────────────────────────────────

console.log(`\n── Result: ${pass}/${pass + fail} passed ──`);
if (fail > 0) { console.error(`${fail} FAILED`); process.exit(1); }

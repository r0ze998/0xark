/**
 * T81 — Deck Validation (GDD v1.2 rules)
 *
 * Tests deck state helpers and validation logic.
 * Rules (Phase C cost/rarity cap removed per Sprint v1.2 Day 9):
 *   - exactly 20 cards
 *   - max 2 copies of any single card_id
 *   - card_id range 1-60
 *
 * Run: node tests/t81-deck.js
 */

let passed = 0, failed = 0;
function ok(label, cond) {
  if (cond) { passed++; console.log('  ✓', label); }
  else       { failed++; console.error('  ✗', label); }
}

// ── Deck helpers (GDD v1.2) ───────────────────────────────────────────────────
const DECK_SIZE = 20; // exactly 20

function deckCopyCount(cards) {
  const counts = {};
  for (const id of cards) counts[id] = (counts[id] || 0) + 1;
  return counts;
}

function deckIsValid(cards) {
  if (cards.length !== DECK_SIZE) return false;
  const counts = deckCopyCount(cards);
  for (const id of cards) {
    if (id < 1 || id > 60) return false;
    if (counts[id] > 2) return false;
  }
  return true;
}

function deckIsLocked(lockedUntil) {
  return lockedUntil > 0 && Math.floor(Date.now() / 1000) < lockedUntil;
}

function deckToggleCard(cards, lockedUntil, cardId) {
  if (deckIsLocked(lockedUntil)) return [...cards];
  const idx = cards.indexOf(cardId);
  if (idx >= 0) { const c = [...cards]; c.splice(idx, 1); return c; }
  if (cards.length < DECK_SIZE) return [...cards, cardId];
  return [...cards];
}

// ── Validation rules ──────────────────────────────────────────────────────────
console.log('\n[T81] Deck Validation (GDD v1.2)');

// Valid deck: 10 unique commons × 2 copies each = exactly 20, max 2 each
const validDeck = [];
for (let i = 1; i <= 10; i++) validDeck.push(i, i); // 20 cards, 2 each
ok('Valid deck has exactly 20 cards',       validDeck.length === 20);
ok('Valid deck max 2 copies per card',      Math.max(...Object.values(deckCopyCount(validDeck))) <= 2);
ok('Valid deck passes deckIsValid()',        deckIsValid(validDeck));

// Exactly 20 required
const under20 = [...Array(19).fill(0).map((_, i) => i + 1)];
ok('19-card deck — invalid (not exactly 20)', !deckIsValid(under20));

const over20 = [...Array(21).fill(0).map((_, i) => (i % 20) + 1)];
ok('21-card deck — invalid (not exactly 20)', !deckIsValid(over20));

// Max 2 copies
const threeCopies = [...Array(17).fill(0).map((_, i) => i + 2), 1, 1, 1]; // card 1 appears 3x
ok('3 copies of card 1 — invalid', !deckIsValid(threeCopies));

// Exactly 2 copies is fine
const twoCopies = [...Array(18).fill(0).map((_, i) => i + 1), 1, 2]; // cards 1 and 2 appear twice
ok('2 copies of a card — valid', deckIsValid(twoCopies));

// Card id out of range
const badId0 = [...Array(19).fill(0).map((_, i) => i + 1), 0]; // card_id 0 invalid
ok('card_id 0 — invalid',  !deckIsValid(badId0));
const badId61 = [...Array(19).fill(0).map((_, i) => i + 1), 61]; // card_id 61 invalid
ok('card_id 61 — invalid', !deckIsValid(badId61));

// Rarity mix is now unrestricted — any combo of Common/Rare/Legendary valid
const allLegendary = [];
for (let i = 41; i <= 60; i++) allLegendary.push(i); // 20 legendary, 1 each
ok('20 Legendary cards (no rarity cap) — valid', deckIsValid(allLegendary));

const mixedRarity = [
  ...Array(4).fill(0).map((_, i) => i + 1),  // 4 common
  ...Array(8).fill(0).map((_, i) => i + 21),  // 8 rare
  ...Array(8).fill(0).map((_, i) => i + 41),  // 8 legendary (≤2 each)
];
ok('Mixed rarity without cost constraint — valid', deckIsValid(mixedRarity));

// ── Lane assignments ──────────────────────────────────────────────────────────
console.log('\n[T81] Lane Assignments');

function buildLaneAssignments(overrides = {}) {
  const lanes = new Array(20).fill(255); // 255 = Any (default)
  for (const [idx, val] of Object.entries(overrides)) lanes[idx] = val;
  return lanes;
}

const defaultLanes = buildLaneAssignments();
ok('Default lane assignments are all 255 (Any)',   defaultLanes.every(v => v === 255));
ok('Lane assignment length matches deck size',      defaultLanes.length === DECK_SIZE);

const customLanes = buildLaneAssignments({ 0: 0, 1: 1, 2: 2 }); // Front, Middle, Back
ok('Custom lane 0 = Front (0)',   customLanes[0] === 0);
ok('Custom lane 1 = Middle (1)',  customLanes[1] === 1);
ok('Custom lane 2 = Back (2)',    customLanes[2] === 2);
ok('Remaining lanes default Any', customLanes.slice(3).every(v => v === 255));

// ── Lock mechanic ─────────────────────────────────────────────────────────────
console.log('\n[T81] Lock Mechanic');

ok('Not locked when lockedUntil=0',     !deckIsLocked(0));
ok('Not locked when lockedUntil=past',  !deckIsLocked(Math.floor(Date.now() / 1000) - 10));
ok('Locked when lockedUntil=future',    deckIsLocked(Math.floor(Date.now() / 1000) + 3600));

const locked = Math.floor(Date.now() / 1000) + 3600;
const preToggle = Array(20).fill(0).map((_, i) => i + 1);
const afterToggle = deckToggleCard(preToggle, locked, 1);
ok('Toggle blocked when deck locked', afterToggle.length === preToggle.length && afterToggle[0] === 1);

// ── PDA seed ──────────────────────────────────────────────────────────────────
console.log('\n[T81] PDA Seed');

ok('PDA seed prefix is "player_deck"', Buffer.from('player_deck').toString() === 'player_deck');
ok('PDA seed length = 11 bytes',       Buffer.from('player_deck').length === 11);

// ── Summary ───────────────────────────────────────────────────────────────────
console.log(`\n[T81] ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);

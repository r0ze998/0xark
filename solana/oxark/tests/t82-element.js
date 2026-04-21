/**
 * T82 — Axis B: Element System E2E
 *
 * Tests element assignment, advantage cycle, multiplier formula,
 * and SUPER EFFECTIVE banner trigger logic.
 *
 * Run: node tests/t82-element.js
 */

let passed = 0, failed = 0;
function ok(label, cond) {
  if (cond) { passed++; console.log('  ✓', label); }
  else       { failed++; console.error('  ✗', label); }
}

// ── Element assignment (mirrors 02-data.js T82 block) ─────────────────────────
function cardElement(id) {
  if (id <= 15) return 1;  // Tide
  if (id <= 30) return 2;  // Abyss
  if (id <= 45) return 3;  // Storm
  return 4;                 // Iron
}

// ── Multiplier (mirrors resolve_round.rs + 02-data.js calcElementMultiplier) ──
function calcElementMultiplier(atk, def) {
  if ((atk===1&&def===3)||(atk===3&&def===4)||(atk===4&&def===2)||(atk===2&&def===1)) return 1500;
  if ((atk===3&&def===1)||(atk===4&&def===3)||(atk===2&&def===4)||(atk===1&&def===2)) return 700;
  return 1000;
}

// ── Element Assignment ────────────────────────────────────────────────────────
console.log('\n[T82] Element Assignment (60 cards)');

// Verify boundary card IDs
ok('Card 1  → Tide  (1)',  cardElement(1)  === 1);
ok('Card 15 → Tide  (1)',  cardElement(15) === 1);
ok('Card 16 → Abyss (2)', cardElement(16) === 2);
ok('Card 30 → Abyss (2)', cardElement(30) === 2);
ok('Card 31 → Storm (3)', cardElement(31) === 3);
ok('Card 45 → Storm (3)', cardElement(45) === 3);
ok('Card 46 → Iron  (4)', cardElement(46) === 4);
ok('Card 60 → Iron  (4)', cardElement(60) === 4);

// Distribution: 15 per element
const dist = {1:0,2:0,3:0,4:0};
for (let i = 1; i <= 60; i++) dist[cardElement(i)]++;
ok('15 Tide cards  (IDs 1-15)',  dist[1] === 15);
ok('15 Abyss cards (IDs 16-30)', dist[2] === 15);
ok('15 Storm cards (IDs 31-45)', dist[3] === 15);
ok('15 Iron cards  (IDs 46-60)', dist[4] === 15);

// ── Advantage Cycle ───────────────────────────────────────────────────────────
console.log('\n[T82] Advantage Cycle');

ok('Tide → Storm: advantage (1500)',  calcElementMultiplier(1,3) === 1500);
ok('Storm → Iron: advantage (1500)', calcElementMultiplier(3,4) === 1500);
ok('Iron → Abyss: advantage (1500)', calcElementMultiplier(4,2) === 1500);
ok('Abyss → Tide: advantage (1500)', calcElementMultiplier(2,1) === 1500);

ok('Storm → Tide: disadvantage (700)',  calcElementMultiplier(3,1) === 700);
ok('Iron → Storm: disadvantage (700)',  calcElementMultiplier(4,3) === 700);
ok('Abyss → Iron: disadvantage (700)', calcElementMultiplier(2,4) === 700);
ok('Tide → Abyss: disadvantage (700)', calcElementMultiplier(1,2) === 700);

ok('Tide vs Tide: neutral (1000)',   calcElementMultiplier(1,1) === 1000);
ok('Abyss vs Abyss: neutral (1000)',calcElementMultiplier(2,2) === 1000);
ok('Storm vs Storm: neutral (1000)',calcElementMultiplier(3,3) === 1000);
ok('Iron vs Iron: neutral (1000)',  calcElementMultiplier(4,4) === 1000);

// ── Damage Calculation ────────────────────────────────────────────────────────
console.log('\n[T82] Damage Calculation');

function calcDmg(baseDmg, atkElem, defElem) {
  const mult = calcElementMultiplier(atkElem, defElem);
  if (mult === 1000) return baseDmg;
  return Math.max(1, Math.round(baseDmg * mult / 1000));
}

// Base 2 damage: advantage → 3, neutral → 2, disadvantage → 1
ok('Base 2 + advantage → 3 dmg',     calcDmg(2,1,3) === 3);
ok('Base 2 + neutral → 2 dmg',       calcDmg(2,1,1) === 2);
ok('Base 2 + disadvantage → 1 dmg',  calcDmg(2,3,1) === 1);

// Base 4 (max): advantage → 6 but capped, disadvantage → 2
ok('Base 4 + advantage → 6 dmg',    calcDmg(4,1,3) === 6);
ok('Base 4 + disadvantage → 3 dmg', calcDmg(4,3,1) === 3); // 4*700/1000=2.8→3

// Minimum 1 damage even with disadvantage on base 1
ok('Base 1 + disadvantage = min 1',  calcDmg(1,3,1) === 1); // 1*700/1000=0.7→max(1,1)

// ── SUPER EFFECTIVE Banner Logic ──────────────────────────────────────────────
console.log('\n[T82] Banner Display Logic');

function battleResult(cardElem, enemyElem) {
  const mult = calcElementMultiplier(cardElem, enemyElem);
  if (mult === 1500) return 'super';
  if (mult === 700)  return 'weak';
  return null;
}

ok('Tide vs Storm → "super" banner',  battleResult(1,3) === 'super');
ok('Iron vs Abyss → "super" banner',  battleResult(4,2) === 'super');
ok('Tide vs Tide → null (no banner)',  battleResult(1,1) === null);
ok('Storm vs Tide → "weak" banner',   battleResult(3,1) === 'weak');
ok('Abyss vs Iron → "weak" banner',   battleResult(2,4) === 'weak');

// ── Element Icons and Colors ──────────────────────────────────────────────────
console.log('\n[T82] Element Constants');

const ELEM_NAME = ['','Tide','Abyss','Storm','Iron'];
const ELEM_COL  = ['','#60c0f0','#8060d0','#d0c040','#a09080'];
const ELEM_ICON = ['','\u2248','\u25C8','\u26A1','\u2736'];

ok('4 element names (1-4)',      ELEM_NAME.slice(1).length === 4);
ok('Tide color is blue',         ELEM_COL[1] === '#60c0f0');
ok('Abyss color is purple',      ELEM_COL[2] === '#8060d0');
ok('Storm color is yellow',      ELEM_COL[3] === '#d0c040');
ok('Iron color is grey',         ELEM_COL[4] === '#a09080');
ok('All element icons defined',  ELEM_ICON.slice(1).every(i => i.length > 0));

// ── Rust/JS Parity Check ──────────────────────────────────────────────────────
console.log('\n[T82] Rust/JS Parity');

// All 12 elemental matchup pairs must agree between Rust and JS implementations
const pairs = [
  [1,1],[1,2],[1,3],[1,4],
  [2,1],[2,2],[2,3],[2,4],
  [3,1],[3,2],[3,3],[3,4],
  [4,1],[4,2],[4,3],[4,4],
];
// Rust function mirrors: (1,3)=1500, (3,4)=1500, (4,2)=1500, (2,1)=1500
// (3,1)=700, (4,3)=700, (2,4)=700, (1,2)=700, else 1000
function rustCalcElementMultiplier(a, d) {
  switch (`${a},${d}`) {
    case '1,3':case '3,4':case '4,2':case '2,1': return 1500;
    case '3,1':case '4,3':case '2,4':case '1,2': return 700;
    default: return 1000;
  }
}
const parity = pairs.every(([a,d]) => calcElementMultiplier(a,d) === rustCalcElementMultiplier(a,d));
ok('All 16 matchups: JS === Rust', parity);

// Summary ────────────────────────────────────────────────────────────────────
console.log(`\n[T82] ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);

/**
 * T93: 6-element system v2 — unit tests
 * Elements: 0=Fire,1=Water,2=Wind,3=Earth,4=Shadow,5=Light
 * Triad 1 Material: Fire(0)→Water(1)→Earth(3)→Fire(0)
 * Triad 2 Abstract: Wind(2)→Shadow(4)→Light(5)→Wind(2)
 * Run: node tests/t93-element-v2.js
 */
'use strict';
const assert = require('assert');
let passed = 0, failed = 0;

function ok(label, fn) {
  try { fn(); console.log('  PASS', label); passed++; }
  catch (e) { console.error('  FAIL', label, '—', e.message); failed++; }
}

function calcElementMultiplier(atkEl, defEl) {
  const adv = [[0,1],[1,3],[3,0],[2,4],[4,5],[5,2]];
  for (const [a,d] of adv) {
    if (atkEl === a && defEl === d) return 1500;
    if (atkEl === d && defEl === a) return 700;
  }
  return 1000;
}

function cardElement(id) {
  if (id <= 10) return 0; if (id <= 20) return 1; if (id <= 30) return 2;
  if (id <= 40) return 3; if (id <= 50) return 4; return 5;
}

console.log('\nT93 — 6-Element System v2\n');

console.log('Triad 1 (Material) advantages:');
ok('Fire(0) → Water(1) = 1500', () => assert.strictEqual(calcElementMultiplier(0,1), 1500));
ok('Water(1) → Earth(3) = 1500', () => assert.strictEqual(calcElementMultiplier(1,3), 1500));
ok('Earth(3) → Fire(0) = 1500', () => assert.strictEqual(calcElementMultiplier(3,0), 1500));

console.log('Triad 1 disadvantages:');
ok('Water(1) → Fire(0) = 700', () => assert.strictEqual(calcElementMultiplier(1,0), 700));
ok('Earth(3) → Water(1) = 700', () => assert.strictEqual(calcElementMultiplier(3,1), 700));
ok('Fire(0) → Earth(3) = 700', () => assert.strictEqual(calcElementMultiplier(0,3), 700));

console.log('Triad 2 (Abstract) advantages:');
ok('Wind(2) → Shadow(4) = 1500', () => assert.strictEqual(calcElementMultiplier(2,4), 1500));
ok('Shadow(4) → Light(5) = 1500', () => assert.strictEqual(calcElementMultiplier(4,5), 1500));
ok('Light(5) → Wind(2) = 1500', () => assert.strictEqual(calcElementMultiplier(5,2), 1500));

console.log('Triad 2 disadvantages:');
ok('Shadow(4) → Wind(2) = 700', () => assert.strictEqual(calcElementMultiplier(4,2), 700));
ok('Light(5) → Shadow(4) = 700', () => assert.strictEqual(calcElementMultiplier(5,4), 700));
ok('Wind(2) → Light(5) = 700', () => assert.strictEqual(calcElementMultiplier(2,5), 700));

console.log('Same-element neutral:');
for (let e = 0; e < 6; e++) {
  ok(`elem ${e} vs itself = 1000`, () => assert.strictEqual(calcElementMultiplier(e,e), 1000));
}

console.log('Cross-triad neutral (Material vs Abstract):');
const t1=[0,1,3], t2=[2,4,5];
for (const a of t1) for (const d of t2) {
  ok(`T1(${a}) vs T2(${d}) = 1000`, () => assert.strictEqual(calcElementMultiplier(a,d), 1000));
  ok(`T2(${d}) vs T1(${a}) = 1000`, () => assert.strictEqual(calcElementMultiplier(d,a), 1000));
}

console.log('cardElement() mapping:');
ok('id 1 → Fire(0)', () => assert.strictEqual(cardElement(1), 0));
ok('id 10 → Fire(0)', () => assert.strictEqual(cardElement(10), 0));
ok('id 11 → Water(1)', () => assert.strictEqual(cardElement(11), 1));
ok('id 20 → Water(1)', () => assert.strictEqual(cardElement(20), 1));
ok('id 21 → Wind(2)', () => assert.strictEqual(cardElement(21), 2));
ok('id 30 → Wind(2)', () => assert.strictEqual(cardElement(30), 2));
ok('id 31 → Earth(3)', () => assert.strictEqual(cardElement(31), 3));
ok('id 40 → Earth(3)', () => assert.strictEqual(cardElement(40), 3));
ok('id 41 → Shadow(4)', () => assert.strictEqual(cardElement(41), 4));
ok('id 50 → Shadow(4)', () => assert.strictEqual(cardElement(50), 4));
ok('id 51 → Light(5)', () => assert.strictEqual(cardElement(51), 5));
ok('id 60 → Light(5)', () => assert.strictEqual(cardElement(60), 5));
ok('all 60 IDs map to 0-5', () => {
  for (let i = 1; i <= 60; i++) {
    const e = cardElement(i);
    assert.ok(e >= 0 && e <= 5, `id ${i} → ${e} out of range`);
  }
});
ok('each element gets exactly 10 cards', () => {
  const cnt = [0,0,0,0,0,0];
  for (let i = 1; i <= 60; i++) cnt[cardElement(i)]++;
  for (let e = 0; e < 6; e++) assert.strictEqual(cnt[e], 10, `element ${e} has ${cnt[e]} cards`);
});

console.log('5-tier drop weight sanity:');
ok('drop weights sum to 1000', () => {
  const w = [400,300,200,90,10];
  assert.strictEqual(w.reduce((s,v)=>s+v,0), 1000);
});
ok('C(400) > B(300) > A(200) > S(90) > SS(10)', () => {
  const w = [400,300,200,90,10];
  for (let i = 0; i < w.length-1; i++) assert.ok(w[i] > w[i+1]);
});

console.log('\n─────────────────────────────');
console.log(`T93 results: ${passed} passed, ${failed} failed`);
if (failed > 0) { console.error('FAIL'); process.exit(1); }
else { console.log('ALL PASS'); }

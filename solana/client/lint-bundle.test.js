// ═════════════════════════════════════════════════════════════════════════
// lint-bundle.test.js — node --test coverage for v447a
//
// Run: node --test solana/client/lint-bundle.test.js
//
// Covers:
//   · _stripStringsAndComments: line/block comments, single/double/template
//     strings, ${…} interior preservation, length invariant.
//   · _findTopLevelDecls: flat decls, multi-binding consts, decls inside
//     function bodies (must be ignored), destructuring skip, decls inside
//     strings (must be ignored after strip).
//   · checkCollisions: cross-file dup → hit; unique-per-file → no hit;
//     same-file dup → not reported (parser's job).
//   · checkRgbaOutput: undefined/null/NaN sentinels → hit; real rgba →
//     no hit; line numbers correct.
// ═════════════════════════════════════════════════════════════════════════

'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const {
  checkCollisions,
  checkTDZOrder,
  checkRgbaOutput,
  _stripStringsAndComments,
  _findTopLevelDecls,
} = require('./lint-bundle');

const FIXTURES = path.join(__dirname, 'lint-fixtures');
const readFixture = (f) => fs.readFileSync(path.join(FIXTURES, f), 'utf8');

// ── _stripStringsAndComments ─────────────────────────────────────────────

test('strip: output length equals input length', () => {
  const src = `const x = 'hi'; // comment\nconst y = /*b*/ 2;\nconst t = \`a\${x}b\`;\n`;
  const out = _stripStringsAndComments(src);
  assert.equal(out.length, src.length);
});

test('strip: line comments become spaces but preserve newline', () => {
  const src = 'const x = 1; // the comment\nconst y = 2;';
  const out = _stripStringsAndComments(src);
  assert.ok(!out.includes('comment'));
  assert.ok(out.includes('\n'));
  assert.ok(out.startsWith('const x = 1; '));
  assert.ok(out.endsWith('const y = 2;'));
});

test('strip: block comments become spaces and preserve newlines inside', () => {
  const src = 'const x = /*multi\nline*/ 1;';
  const out = _stripStringsAndComments(src);
  assert.ok(!out.includes('multi'));
  assert.ok(!out.includes('line'));
  assert.ok(out.includes('\n'));
  assert.equal(out.length, src.length);
});

test('strip: single-quoted string body stripped, delimiters preserved', () => {
  const src = "const x = 'abc//notcomment/*still*/def';";
  const out = _stripStringsAndComments(src);
  assert.ok(!out.includes('abc'));
  assert.ok(!out.includes('notcomment'));
  assert.ok(!out.includes('def'));
  assert.ok(out.includes("'"));
});

test('strip: escape sequence inside string does not terminate it', () => {
  const src = "const x = 'it\\'s'; const y = 2;";
  const out = _stripStringsAndComments(src);
  assert.ok(out.includes('const y = 2;'));
});

test('strip: template ${…} interior survives, template literal body does not', () => {
  const src = 'const t = `prefix ${SOME_IDENT + OTHER} suffix`;';
  const out = _stripStringsAndComments(src);
  assert.ok(out.includes('SOME_IDENT'));
  assert.ok(out.includes('OTHER'));
  assert.ok(!out.includes('prefix'));
  assert.ok(!out.includes('suffix'));
});

test('strip: `//` inside a string does not start a comment', () => {
  const src = "const url = 'https://example.com'; const z = 3;";
  const out = _stripStringsAndComments(src);
  assert.ok(out.includes('const z = 3;'));
});

// ── _findTopLevelDecls ────────────────────────────────────────────────────

test('decls: picks up const/let/var/class/function at top level', () => {
  const src = [
    'const A = 1;',
    'let B = 2;',
    'var C = 3;',
    'function D() {}',
    'class E {}',
  ].join('\n');
  const decls = _findTopLevelDecls(_stripStringsAndComments(src));
  const names = decls.map((d) => d.name).sort();
  assert.deepEqual(names, ['A', 'B', 'C', 'D', 'E']);
});

test('decls: multi-binding const on one line records every name', () => {
  const src = 'const X = 1, Y = 2, Z = 3;';
  const decls = _findTopLevelDecls(_stripStringsAndComments(src));
  const names = decls.map((d) => d.name).sort();
  assert.deepEqual(names, ['X', 'Y', 'Z']);
});

test('decls: identifiers inside a function body are NOT top-level', () => {
  const src = [
    'const OUTER = 1;',
    'function wrap() {',
    '  const INNER = 2;',
    '  let ALSO_INNER = 3;',
    '}',
  ].join('\n');
  const decls = _findTopLevelDecls(_stripStringsAndComments(src));
  const names = decls.map((d) => d.name).sort();
  assert.deepEqual(names, ['OUTER', 'wrap']);
});

test('decls: identifiers inside an object literal are NOT top-level', () => {
  const src = [
    'const obj = {',
    '  const: "keyword-safe",',
    '  let:   "also-safe",',
    '};',
  ].join('\n');
  const decls = _findTopLevelDecls(_stripStringsAndComments(src));
  assert.deepEqual(decls.map((d) => d.name), ['obj']);
});

test('decls: `const` text inside a string is NOT a decl after strip', () => {
  const src = 'const msg = "const SHOULD_NOT_COUNT = 1;";';
  const decls = _findTopLevelDecls(_stripStringsAndComments(src));
  assert.deepEqual(decls.map((d) => d.name), ['msg']);
});

test('decls: line numbers are 1-indexed and match the file', () => {
  const src = '\n\nconst AT_LINE_3 = 1;\nconst AT_LINE_4 = 2;\n';
  const decls = _findTopLevelDecls(_stripStringsAndComments(src));
  assert.deepEqual(decls, [
    { name: 'AT_LINE_3', line: 3, kind: 'const' },
    { name: 'AT_LINE_4', line: 4, kind: 'const' },
  ]);
});

test('decls: kind is captured per declaration', () => {
  const src = [
    'const A = 1;',
    'let B = 2;',
    'var C = 3;',
    'function D() {}',
    'class E {}',
  ].join('\n');
  const decls = _findTopLevelDecls(_stripStringsAndComments(src));
  const byName = Object.fromEntries(decls.map((d) => [d.name, d.kind]));
  assert.deepEqual(byName, {
    A: 'const', B: 'let', C: 'var', D: 'function', E: 'class',
  });
});

test('decls: multi-binding bindings all share the head kind', () => {
  const src = 'const X = 1, Y = 2, Z = 3;';
  const decls = _findTopLevelDecls(_stripStringsAndComments(src));
  const kinds = decls.map((d) => d.kind);
  assert.deepEqual(kinds, ['const', 'const', 'const']);
});

// ── checkCollisions ──────────────────────────────────────────────────────

test('checkCollisions: cross-file dup reports hit with both locations', () => {
  const files = [
    { name: 'fixture-collision-a.js', source: readFixture('fixture-collision-a.js') },
    { name: 'fixture-collision-b.js', source: readFixture('fixture-collision-b.js') },
  ];
  const res = checkCollisions(files);
  assert.equal(res.ok, false);
  const dupeHit = res.hits.find((h) => h.name === '_FIXTURE_DUPE');
  assert.ok(dupeHit, 'expected _FIXTURE_DUPE collision');
  assert.equal(dupeHit.locations.length, 2);
  const fileNames = dupeHit.locations.map((l) => l.file).sort();
  assert.deepEqual(fileNames, ['fixture-collision-a.js', 'fixture-collision-b.js']);
});

test('checkCollisions: unique-per-file names produce no hits', () => {
  const files = [
    { name: 'fixture-collision-a.js', source: readFixture('fixture-collision-a.js') },
    { name: 'fixture-collision-b.js', source: readFixture('fixture-collision-b.js') },
  ];
  const res = checkCollisions(files);
  const names = res.hits.map((h) => h.name);
  assert.ok(!names.includes('_FIXTURE_ONLY_IN_A'));
  assert.ok(!names.includes('_FIXTURE_ONLY_IN_B'));
  assert.ok(!names.includes('_FIXTURE_MULTI_X'));
  assert.ok(!names.includes('_FIXTURE_MULTI_Y'));
});

test('checkCollisions: clean fixture alone has no hits', () => {
  const files = [
    { name: 'fixture-clean.js', source: readFixture('fixture-clean.js') },
  ];
  const res = checkCollisions(files);
  assert.deepEqual(res, { hits: [], ok: true });
});

test('checkCollisions: same-file duplicate is NOT reported (parser catches)', () => {
  const files = [
    { name: 'synthetic.js', source: 'const SAME = 1;\nconst SAME = 2;' },
  ];
  const res = checkCollisions(files);
  assert.deepEqual(res.hits, []);
});

test('checkCollisions: the real src/ bundle passes (regression guard)', () => {
  const SRC = path.join(__dirname, 'src');
  const files = fs.readdirSync(SRC)
    .filter((f) => f.endsWith('.js'))
    .sort()
    .map((f) => ({ name: f, source: fs.readFileSync(path.join(SRC, f), 'utf8') }));
  const res = checkCollisions(files);
  if (!res.ok) {
    const msg = res.hits.map((h) =>
      `${h.name}: ${h.locations.map((l) => `${l.file}:${l.line}`).join(', ')}`
    ).join('\n');
    assert.fail(`checkCollisions regressed on src/:\n${msg}`);
  }
});

// ── checkRgbaOutput ──────────────────────────────────────────────────────

test('checkRgbaOutput: rgba(undefined,...) is a hit', () => {
  const src = 'grad.addColorStop(0, `rgba(undefined,undefined,undefined,1)`);';
  const res = checkRgbaOutput(src);
  assert.equal(res.ok, false);
  assert.equal(res.hits.length, 1);
  assert.equal(res.hits[0].line, 1);
});

test('checkRgbaOutput: rgba(null,...) and rgba(NaN,...) are hits', () => {
  const src = [
    'a("rgba(null,0,0,1)");',
    'b("rgba(NaN, 0, 0, 1)");',
  ].join('\n');
  const res = checkRgbaOutput(src);
  assert.equal(res.hits.length, 2);
  assert.deepEqual(res.hits.map((h) => h.line), [1, 2]);
});

test('checkRgbaOutput: rgb() (no alpha) with undefined is also a hit', () => {
  const src = 'c("rgb(undefined, 0, 0)");';
  const res = checkRgbaOutput(src);
  assert.equal(res.hits.length, 1);
});

test('checkRgbaOutput: real rgba with numbers is clean', () => {
  const src = 'grad.addColorStop(0, "rgba(10, 20, 30, 0.5)");';
  const res = checkRgbaOutput(src);
  assert.deepEqual(res, { hits: [], ok: true });
});

test('checkRgbaOutput: case-insensitive whitespace tolerated', () => {
  const src = 'x("rgba(   undefined , 0, 0, 1)");';
  const res = checkRgbaOutput(src);
  assert.equal(res.hits.length, 1);
});

test('checkRgbaOutput: multiple hits on same line are counted', () => {
  const src = 'a("rgba(undefined,0,0,1)"); b("rgba(NaN,0,0,1)");';
  const res = checkRgbaOutput(src);
  assert.equal(res.hits.length, 2);
});

// ── checkTDZOrder ────────────────────────────────────────────────────────

test('checkTDZOrder: IIFE fixture produces the expected hit', () => {
  const res = checkTDZOrder([
    { name: 'fixture-tdz-iife.js', source: readFixture('fixture-tdz-iife.js') },
  ]);
  assert.equal(res.ok, false);
  assert.equal(res.hits.length, 1);
  const [h] = res.hits;
  assert.equal(h.file, 'fixture-tdz-iife.js');
  assert.equal(h.name, '_FIXTURE_TDZ_IIFE_RESULT');
  assert.equal(h.referencedName, '_FIXTURE_TDZ_IIFE_TABLE');
  assert.ok(h.line < h.referencedLine, 'decl line must precede referenced line');
});

test('checkTDZOrder: mapcall fixture produces exactly one hit', () => {
  // The fixture references both _FIXTURE_TDZ_MAP_LISTINGS (later const,
  // MUST flag) and _fixtureTdzMapHoisted (later function, MUST NOT flag).
  const res = checkTDZOrder([
    { name: 'fixture-tdz-mapcall.js', source: readFixture('fixture-tdz-mapcall.js') },
  ]);
  assert.equal(res.ok, false);
  assert.equal(res.hits.length, 1);
  const [h] = res.hits;
  assert.equal(h.name, '_FIXTURE_TDZ_MAP_PRICES');
  assert.equal(h.referencedName, '_FIXTURE_TDZ_MAP_LISTINGS');
  assert.ok(!res.hits.some((hh) => hh.referencedName === '_fixtureTdzMapHoisted'),
    'function-declared targets must be hoisted and not flagged');
});

test('checkTDZOrder: clean fixture has no hits', () => {
  const res = checkTDZOrder([
    { name: 'fixture-clean.js', source: readFixture('fixture-clean.js') },
  ]);
  assert.deepEqual(res, { hits: [], ok: true });
});

test('checkTDZOrder: function declared later is hoisted, no flag', () => {
  const src = [
    'const A = helper();',
    'function helper() { return 42; }',
  ].join('\n');
  const res = checkTDZOrder([{ name: 'synthetic.js', source: src }]);
  assert.deepEqual(res.hits, []);
});

test('checkTDZOrder: const declared later IS flagged', () => {
  const src = [
    'const A = B + 1;',
    'const B = 2;',
  ].join('\n');
  const res = checkTDZOrder([{ name: 'synthetic.js', source: src }]);
  assert.equal(res.hits.length, 1);
  assert.equal(res.hits[0].referencedName, 'B');
});

test('checkTDZOrder: const declared EARLIER is fine', () => {
  const src = [
    'const B = 2;',
    'const A = B + 1;',
  ].join('\n');
  const res = checkTDZOrder([{ name: 'synthetic.js', source: src }]);
  assert.deepEqual(res.hits, []);
});

test('checkTDZOrder: local shadowing prevents false positive', () => {
  // Inner IIFE declares its own B; reference is to the local B, not
  // the later top-level B. Must not flag.
  const src = [
    'const A = (() => { const B = 1; return B; })();',
    'const B = 2;',
  ].join('\n');
  const res = checkTDZOrder([{ name: 'synthetic.js', source: src }]);
  assert.deepEqual(res.hits, []);
});

test('checkTDZOrder: arrow param shadowing prevents false positive', () => {
  // `b` is an arrow param, not a TDZ reference to the later top-level b.
  const src = [
    'const cmp = (a, b) => b - a;',
    'const b = 100;',
  ].join('\n');
  const res = checkTDZOrder([{ name: 'synthetic.js', source: src }]);
  assert.deepEqual(res.hits, []);
});

test('checkTDZOrder: property access skipped (`.prop` is not a ref)', () => {
  // `foo.bar` — bar must not be scanned as a reference. Here we declare
  // a top-level `bar` later; if the scanner flagged it, it'd be wrong.
  const src = [
    'const A = someObj.bar;',
    'const bar = 5;',
  ].join('\n');
  // someObj is unknown but not in declMap, so it's skipped. `bar` after
  // the `.` must be skipped as property access.
  const res = checkTDZOrder([{ name: 'synthetic.js', source: src }]);
  assert.deepEqual(res.hits, []);
});

test('checkTDZOrder: property key skipped (`{ KEY: val }`)', () => {
  const src = [
    'const A = { KEY: 1 };',
    'const KEY = 2;',
  ].join('\n');
  const res = checkTDZOrder([{ name: 'synthetic.js', source: src }]);
  assert.deepEqual(res.hits, []);
});

test('checkTDZOrder: method shorthand skipped (`{ method() {} }`)', () => {
  const src = [
    'const A = { method() { return 1; } };',
    'const method = 2;',
  ].join('\n');
  const res = checkTDZOrder([{ name: 'synthetic.js', source: src }]);
  assert.deepEqual(res.hits, []);
});

test('checkTDZOrder: string/comment content does not count as refs', () => {
  const src = [
    'const A = "LATER is a nice name"; // LATER is also commented here',
    'const LATER = 1;',
  ].join('\n');
  const res = checkTDZOrder([{ name: 'synthetic.js', source: src }]);
  assert.deepEqual(res.hits, []);
});

test('checkTDZOrder: multi-binding const is skipped (out-of-scope limitation)', () => {
  // Detector aborts the decl at first `,` at depth 0. Documented limit.
  const src = [
    'const A = 1, B = LATER;',
    'const LATER = 2;',
  ].join('\n');
  const res = checkTDZOrder([{ name: 'synthetic.js', source: src }]);
  assert.deepEqual(res.hits, []);
});

test('checkTDZOrder: the real src/ bundle passes (regression guard)', () => {
  const SRC = path.join(__dirname, 'src');
  const files = fs.readdirSync(SRC)
    .filter((f) => f.endsWith('.js'))
    .sort()
    .map((f) => ({ name: f, source: fs.readFileSync(path.join(SRC, f), 'utf8') }));
  const res = checkTDZOrder(files);
  if (!res.ok) {
    const msg = res.hits.map((h) =>
      `${h.file}:${h.line}  ${h.name} references ${h.referencedName} declared later at line ${h.referencedLine}`
    ).join('\n');
    assert.fail(`checkTDZOrder regressed on src/:\n${msg}`);
  }
});

// Fixture for Check #3: IIFE reads a top-level const declared later.
// Recreates the v443 pattern exactly — _BTYPE_CNT_LBL (an IIFE result
// const) referenced _BTYPE_ABB (a table const) declared later in the
// same file. The IIFE runs at decl time and hits TDZ on the later const.
//
// Expected hit:
//   file = fixture-tdz-iife.js
//   line = 7   (the `const _FIXTURE_TDZ_IIFE_RESULT = (…)()` decl)
//   name = _FIXTURE_TDZ_IIFE_RESULT
//   referencedName = _FIXTURE_TDZ_IIFE_TABLE
//   referencedLine = 12

const _FIXTURE_TDZ_IIFE_RESULT = (() => {
  return _FIXTURE_TDZ_IIFE_TABLE.map((t) => t.abbr).join(',');
})();

const _FIXTURE_TDZ_IIFE_TABLE = [
  { name: 'alpha', abbr: 'A' },
  { name: 'beta',  abbr: 'B' },
];

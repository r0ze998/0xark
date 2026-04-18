// Fixture for Check #1 (checkCollisions). Pair with fixture-collision-a.js.
// Redeclares _FIXTURE_DUPE at top level — must trip the cross-file check.
// The ident inside the function body is NOT a top-level decl and must
// NOT be picked up by _findTopLevelDecls.

const _FIXTURE_DUPE = 2;
const _FIXTURE_ONLY_IN_B = 'only-b';

function _fixtureFnB() {
  // same name, but local to function scope — lint must ignore.
  const _FIXTURE_DUPE = 999;
  return _FIXTURE_DUPE;
}

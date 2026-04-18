// Fixture for Check #1 (checkCollisions). Pair with fixture-collision-b.js.
// Declares _FIXTURE_DUPE at top level; fixture-b declares the same name.
// A collision lint run over [a, b] must report `_FIXTURE_DUPE` with both
// locations. Also declares a unique ident to prove non-collisions are
// NOT reported.

const _FIXTURE_DUPE = 1;
const _FIXTURE_ONLY_IN_A = 'only-a';

// Multi-binding on one line — checker must record both names.
const _FIXTURE_MULTI_X = 10, _FIXTURE_MULTI_Y = 20;

function _fixtureFnA() { return _FIXTURE_DUPE + _FIXTURE_MULTI_X + _FIXTURE_MULTI_Y; }

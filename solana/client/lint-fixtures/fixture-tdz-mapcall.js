// Fixture for Check #3: .map() on a top-level const declared later.
// Recreates the v444 pattern — _MKT_LISTING_PRICE_LBL's initializer
// called .map() on _MKT_LISTINGS before _MKT_LISTINGS was declared.
// The .map() invocation evaluates at decl time and hits TDZ.
//
// Also exercises:
//   · function-hoist skip: _fixtureTdzMapHoisted is a top-level
//     `function` declared LATER but referenced in the initializer.
//     Functions hoist, so this must NOT be flagged.
//   · property-access skip: `.price` and `.length` are property accesses.
//   · param shadowing: `l` is an arrow param, not a TDZ reference.
//
// Expected hit:
//   file = fixture-tdz-mapcall.js
//   line = 16  (the `_FIXTURE_TDZ_MAP_PRICES` decl)
//   name = _FIXTURE_TDZ_MAP_PRICES
//   referencedName = _FIXTURE_TDZ_MAP_LISTINGS
//   referencedLine = 18

const _FIXTURE_TDZ_MAP_PRICES = _FIXTURE_TDZ_MAP_LISTINGS.map((l) => l.price * _fixtureTdzMapHoisted());

const _FIXTURE_TDZ_MAP_LISTINGS = [
  { id: 'A', price: 100 },
  { id: 'B', price: 200 },
];

function _fixtureTdzMapHoisted() { return 1; }

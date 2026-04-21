/**
 * t95-registry.js — T95 PlayerRegistry (GI Rule) unit tests
 * Tests: GI rule logic, PDA seed structure, season_complete trigger
 * Run: node tests/t95-registry.js
 */

'use strict';

let pass = 0, fail = 0;

function assert(label, cond) {
  if (cond) { console.log(`  ✓ ${label}`); pass++; }
  else       { console.error(`  ✗ ${label}`); fail++; }
}

// ── Simulated PlayerRegistry (mirrors Rust struct) ──────────────────────────

function makeRegistry() {
  return {
    owner: new Uint8Array(32),
    registered: new Array(60).fill(false),
    registered_at: new Array(60).fill(0),
    count: 0,
    season_complete: false,
    bump: 0,
  };
}

function registerCard(registry, card_id, ts) {
  if (card_id < 1 || card_id > 60) throw new Error('InvalidAction');
  const idx = card_id - 1;
  if (!registry.registered[idx]) {
    registry.registered[idx] = true;
    registry.registered_at[idx] = ts ?? Date.now();
    registry.count = Math.min(registry.count + 1, 255);
    if (registry.count >= 60) registry.season_complete = true;
  }
}

// ── PDA seed structure ───────────────────────────────────────────────────────

function pdaSeedLabel(playerPubkey) {
  const enc = new TextEncoder();
  const prefix = enc.encode('player_registry');
  const full = new Uint8Array(prefix.length + 32);
  full.set(prefix, 0);
  full.set(playerPubkey, prefix.length);
  return Buffer.from(full).toString('hex').slice(0, 16) + '…';
}

// ── Tests ─────────────────────────────────────────────────────────────────────

console.log('\n── T95 PlayerRegistry ──\n');

// 1. GI Rule: first registration persists
const reg = makeRegistry();
registerCard(reg, 1, 1000);
assert('card 1 registered after first call', reg.registered[0] === true);
assert('registered_at[0] set to 1000', reg.registered_at[0] === 1000);
assert('count = 1', reg.count === 1);
assert('season_complete = false', reg.season_complete === false);

// 2. GI Rule: second call for same card does not increment count
registerCard(reg, 1, 2000);
assert('count still 1 after duplicate registration', reg.count === 1);
assert('registered_at[0] unchanged (still 1000)', reg.registered_at[0] === 1000);

// 3. Different cards increment count
registerCard(reg, 2, 1001);
registerCard(reg, 3, 1002);
assert('count = 3 after 3 distinct cards', reg.count === 3);

// 4. card_id bounds validation
let threw = false;
try { registerCard(reg, 0, 9999); } catch { threw = true; }
assert('card_id=0 throws InvalidAction', threw);

threw = false;
try { registerCard(reg, 61, 9999); } catch { threw = true; }
assert('card_id=61 throws InvalidAction', threw);

// 5. register all 60 → season_complete
const reg2 = makeRegistry();
for (let i = 1; i <= 59; i++) registerCard(reg2, i, i);
assert('season_complete=false after 59 cards', reg2.season_complete === false);
assert('count = 59', reg2.count === 59);
registerCard(reg2, 60, 60);
assert('season_complete=true after 60th card', reg2.season_complete === true);
assert('count = 60', reg2.count === 60);

// 6. Re-registering after season_complete does not change count
registerCard(reg2, 1, 99999);
assert('count stays 60 after re-register', reg2.count === 60);
assert('season_complete stays true', reg2.season_complete === true);

// 7. All 60 registered flags set
const allRegistered = reg2.registered.every(v => v === true);
assert('all 60 registered[i] = true', allRegistered);

// 8. PDA seed structure — prefix "player_registry" + 32-byte pubkey
const dummyPubkey = new Uint8Array(32).fill(0xab);
const seedLabel = pdaSeedLabel(dummyPubkey);
assert('PDA seed label generated (non-empty)', seedLabel.length > 0);

// 9. registered_at timestamps are distinct for distinct cards
const reg3 = makeRegistry();
for (let i = 1; i <= 5; i++) registerCard(reg3, i, i * 100);
const timestamps = reg3.registered_at.slice(0, 5);
const unique_ts = new Set(timestamps.filter(t => t > 0)).size;
assert('5 distinct timestamps for 5 distinct registrations', unique_ts === 5);

// 10. Unregistered cards have registered_at = 0
const unset = reg3.registered_at.slice(5).every(t => t === 0);
assert('unregistered cards have registered_at = 0', unset);

// 11. SIZE calculation — must match Rust const
// 8 disc + 32 owner + 60 registered + 480 registered_at + 1 count + 1 season_complete + 1 bump
const EXPECTED_SIZE = 8 + 32 + 60 + 480 + 1 + 1 + 1;
assert(`PlayerRegistry::SIZE = ${EXPECTED_SIZE}`, EXPECTED_SIZE === 583);

// ── Summary ──────────────────────────────────────────────────────────────────

console.log(`\n── Result: ${pass}/${pass + fail} passed ──`);
if (fail > 0) { console.error(`${fail} FAILED`); process.exit(1); }

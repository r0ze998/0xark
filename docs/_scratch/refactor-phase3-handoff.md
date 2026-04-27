# Refactor Phase 3 Handoff — v-phd-refactor-phase3

**Date**: 2026-04-27  
**Branch**: `refactor-phase3`  
**Tag**: `v-phd-refactor-phase3`  
**Scope**: handleMessage dispatch table split + save-load tests + server handler tests (no behavior changes)

---

## Task 1 — handleMessage dispatch table (`multiplayer/server.js`)

### Before / After

| Metric | Before | After |
|---|---|---|
| File lines | 581 | 567 (−14) |
| handleMessage body | ~227L switch | 3L dispatcher |

### Sub-functions

| Function | Async | Lines | Responsibility |
|---|---|---|---|
| `_handleCreateRoom` | no | 16L | Room creation, player init, `room_created` send |
| `_handleJoinRoom` | no | 18L | Room join, `room_joined` send, `player_joined` broadcast |
| `_handlePresenceUpdate` | no | 9L | Clan/card_count update, `presence_update` broadcast |
| `_handleMove` | no | 11L | Coordinate bounds-check, ZK proximity broadcast |
| `_handleSubmitTx` | yes | 38L | Base64 decode, tx deserialization, RPC relay |
| `_handleChat` | no | 7L | 200-char cap, `chat` broadcast |
| `_handleDuelHandCommitted` | no | 11L | ZK commitment relay (exclude sender) |
| `_handleDuelHandRevealed` | no | 12L | card_ids uint16 sanitize, relay (exclude sender) |
| `_handleDuelPhaseAdvance` | no | 11L | Host-only phase transition broadcast |
| `_handleDuelBattleResolved` | no | 13L | Host-only hp-delta broadcast |
| `_handleDuelEnded` | no | 10L | Host-only duel result broadcast |

### Dispatcher (new handleMessage body)

```javascript
const HANDLERS = {
  create_room:          _handleCreateRoom,
  join_room:            _handleJoinRoom,
  presence_update:      _handlePresenceUpdate,
  move:                 _handleMove,
  submit_tx:            _handleSubmitTx,
  chat:                 _handleChat,
  duel_hand_committed:  _handleDuelHandCommitted,
  duel_hand_revealed:   _handleDuelHandRevealed,
  duel_phase_advance:   _handleDuelPhaseAdvance,
  duel_battle_resolved: _handleDuelBattleResolved,
  duel_ended:           _handleDuelEnded,
};

async function handleMessage(ws, msg) {
  const h = HANDLERS[msg.type];
  if (h) await h(ws, msg);
}
```

### Implementation notes

**All handlers share module-level closure**: `rooms` (Map), `connection` (Solana Connection), `sanitizeClan`, `player`, `serializePlayers`, `send`, `broadcast`, `broadcastProximity`, `extractError` — no parameters needed beyond `(ws, msg)`.

**`_handleSubmitTx` stays async**: only handler that awaits RPC calls.

**Unknown message types**: old switch fell through silently; new dispatcher does the same — `if (h)` no-op.

**File got shorter**: removing switch boilerplate (case/break/nested comments) saved 14 lines despite adding HANDLERS table.

---

## Task 2 — `tests/save-load.test.js` (new, 18 tests)

Tests localStorage persistence patterns extracted from `04-state.js`:

| Suite | Tests | Coverage |
|---|---|---|
| Stats save/load | 6 | round-trip, areaTime migration 3→6, unknown keys, corrupt JSON, multi-save |
| Deck save/load | 5 | null default, round-trip, overwrite, empty array, corrupt JSON |
| Registry save/load | 3 | default, round-trip, overwrite |
| Item inventory save/load | 4 | empty default, round-trip, corrupt JSON, overwrite |

All tests use an inline localStorage mock — no browser, no dependencies.

---

## Task 3 — `multiplayer/test/server.test.cjs` (new, 39 tests)

Tests HANDLERS dispatch table and all 11 handler functions with mock WS objects.

| Suite | Tests | Coverage |
|---|---|---|
| HANDLERS dispatch | 3 | key count, unknown type no-op, known type dispatch |
| _handleCreateRoom | 6 | room creation, room_created send, ws field assignment, clan sanitize, name default, name cap |
| _handleJoinRoom | 4 | error on missing room, room_joined + player_joined, room.players size, player list |
| _handlePresenceUpdate | 4 | no-op without room, ws update, broadcast, clan sanitize |
| _handleMove | 5 | no-op without room, x/y clamp, area clamp, town broadcast, dungeon ZK filter |
| _handleChat | 3 | broadcast, 200-char cap, non-string no-op |
| Duel commitment/reveal | 4 | commitment relay (exclude sender), missing fields, uint16 sanitize, 10-card cap |
| Duel host-only | 7 | phase advance host/non-host, battle resolve host/non-host, ended host, no duelId, non-host |
| sanitizeClan | 3 | valid, invalid, null |

File is `.cjs` (not `.js`) because `multiplayer/package.json` has `"type": "module"`.

---

## Test Results

| Suite | Count | Status |
|---|---|---|
| card-engine | 53 | ✅ pass |
| battle-mechanics | 49 | ✅ pass |
| v3-plus-abilities | 41 | ✅ pass |
| save-load | 18 | ✅ pass (new) |
| server handlers | 39 | ✅ pass (new) |
| **Total** | **200** | ✅ all pass |

---

## Files Changed

- `multiplayer/server.js` — handleMessage split into HANDLERS dispatch table
- `tests/save-load.test.js` — new, 18 tests
- `multiplayer/test/server.test.cjs` — new, 39 tests
- `docs/_scratch/refactor-phase3-handoff.md` — this file

---

## Out of Scope

- `_handleSubmitTx` not unit-tested: requires live Solana RPC mock (out of scope per plan; stress-test.js covers integration)
- No variable renames, no behavior changes
- Anchor / ZK / onchain.js — not touched

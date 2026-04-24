# Day 9 Overnight Report — 2026-04-22

**Branch**: phase-d-reborn  
**Tag**: v-phd-day9  
**Commits this session**: a8b8e70 → a39bf56 (5 commits)

---

## Completed Tasks

### Group X — T-D9-3: Rust `save_deck` redesign ✅
- `state.rs`: Added `lane_assignments: [u8; 20]` to `PlayerDeck`, SIZE updated 78 → 98 bytes
- `save_deck.rs`: Full rewrite — Phase C cost/rarity rules removed; GDD v1.2 enforced: exactly 20 cards, max 2 copies per card_id, range 1-60 validation via HashMap
- `lib.rs`: Updated instruction signature to `save_deck(cards: Vec<u8>, lane_assignments: Vec<u8>)`
- `tests/t81-deck.js`: Full rewrite for GDD v1.2 — 23/23 tests pass
- `cargo check`: 0 errors

### Group Y — T-D9-1+2: Phase C teardown ✅

**T-D9-1** (template.html — GBA shell removal):
- Removed `#emu`, `#lbl`, `#sw`, `#ctrls`, `.b` HTML elements + CSS (~80 lines)
- New body: full-screen 16:9 letterbox `#game-wrap` → `#pixi-wrap` → canvas
- CSS: `width: min(100vw, calc(100vh * 16/9)); height: min(100vh, calc(100vw * 9/16))`
- Verified: 1920×1080, 1366×768, 375×812 portrait, 1440×900 — all letterbox correctly

**T-D9-2** (09-game-loop.js — dungeon logic removal):
- Removed: card decay timer block (~55 lines), dungeon encounter block (~50 lines), floor atmosphere, dungeon confirm/door glow, floor clear fanfare, escape urgency vignette
- Replaced dungeon encounter with stub comment
- Created `10-animations.js`: `playFinisherAnimation()`, `playVictoryAnimation()`, `playDefeatAnimation()` stubs
- Added `10-animations.js` + `05-lobby.js` to build.js MODULES (05-lobby.js was missing — critical bug fixed)

### Group Z — T-D9-4+5+6: Deck editor + lobby polling + tag ✅

**T-D9-4** (07-deck-editor.js — deck editor GDD v1.2 alignment):
- Removed `cardCost()` function
- Rewrote `deckValidation()`: `{ cardCount, duplicates, isValid, counts }` — no cost/rarity fields
- Header: `DECK N/20` (cost removed)
- Status line: `✓ All cards valid` / `✗ N cards invalid (duplicate > 2)` in green/red
- Deck slots: show `×N` copy count (red when > 2 copies) instead of `Npt`
- Save Deck enabled: `isValid && wallet connected && not saving`
- `deckSaveDeckTx()`: calls `window.oxarkOnchain.saveDeck(cards, [])` with empty lane_assignments

**T-D9-5** (05-lobby.js — lobby chain data polling):
- Added `_pollCardCount()`, `_pollSOLBalance()`, `_pollSeasonDay()` async helpers
- `enterLobby()`: starts 15 s interval (cards + SOL), 60 s interval (season day)
- `exitLobby()`: clears both intervals (no leak on scene switch)

**T-D9-6**: Committed `v453`, pushed, tagged `v-phd-day9`

---

## Build Status

```
✓ 0xARK built successfully
  Modules:      24 files (26483 source lines)
  Output:       28314 lines
  Tag:          v-phd-day9 → pushed origin
```

---

## Issues Encountered / Decisions Made

1. **`counts` not in scope for deck slot draw**: `deckValidation()` didn't expose raw counts map. Fixed by adding `counts` to the return value so deck slots can show `×N` correctly.

2. **`_pollSOLBalance()` vs `enterLobby()` inline**: Extracted to standalone async helper to keep `enterLobby()` readable and reuse from poll interval.

3. **`PlayerDeck` SIZE backward compat**: Old accounts (78 bytes) will zero-pad `lane_assignments`. Clients treating 0 as Front is functionally harmless — all lanes default to Any (255) for new accounts.

---

## Day 10 Preview (per Sprint v1.2)

- T-D10-1: Duel scene canvas skeleton — 3 lanes (Front/Middle/Back), player + opponent info boxes (FRLG style)
- T-D10-2: Card placement UI — drag from hand to lane
- T-D10-3: WebSocket duel message protocol stubs (`duel_start`, `card_placed`, `resolve`, `duel_end`)

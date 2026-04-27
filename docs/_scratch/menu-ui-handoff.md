# Menu UI Handoff
**Tag**: `v-phd-menu-ui`  
**Completed**: 2026-04-25 (overnight, CC solo)  
**Commit**: `feat(ui): top menu UI + legacy dungeon isolation`

---

## Scene Routing Diagram

```
Splash → Title
  [CONNECT WALLET] or [ENTER ARENA if connected] → Menu Hub
  [HOW TO PLAY]                                  → Intro Tutorial → Menu Hub

Menu Hub (2×3 grid)
  BATTLE   → Lobby (matchmaking → Duel → Lobby → Title)
  DECK     → Deck Editor overlay (stays on menu scene, X to close)
  SHOP     → "Coming in Season 2" toast
  AGENT    → "Coming in Season 2" toast
  LORE     → "Coming in Season 2" toast
  SETTINGS → "Coming in Season 2" toast
  [X]      → Title screen

Lobby → Duel → Lobby
  [exit lobby] → Title (existing behavior, unchanged)
```

---

## Changed Files

| File | What changed |
|------|--------------|
| `src/00-constants.js` | Added `MENU: "menu"` to SCENE_IDS |
| `src/08-menu.js` | NEW — menu scene (enterMenu, drawMenuScene, _mnuPoll) |
| `src/06-world-systems.js` | dTitle(): tagline, menu items, footer text updated |
| `src/09-game-loop.js` | draw(): added `else if(sc==='menu')drawMenuScene()` |
| `src/10-input.js` | Title handler rewritten; menu handler added |
| `build.js` | 08-menu.js added to MODULES (after 08-duel-scene.js) |
| `index.html` | Rebuilt (33,805 lines — within 35k target) |

---

## Dungeon Legacy Isolation: Decision

**Opted for conservative path** (r0ze pre-authorized in spec):
> 切り離し困難なら、Dungeon 系 file は残す + scene routing だけ menu 中心にする

`fogRevealed`, `dMap()`, `tryMovePlayer()`, etc. are referenced in 8+ files (`04-state.js`, `05-rendering.js`, `06-world-systems.js`, `07-map.js`, `07-battle.js`, `08-overlays.js`, `09-game-loop.js`, `11-save-init.js`). Moving them would break the build. The dungeon scenes remain in the bundle but are no longer reachable from the primary navigation path. Bundle size is unaffected (~same 33k).

---

## Title Screen Changes

| Before | After |
|--------|-------|
| Tagline: "A ZK PIRATE CARD GAME" | "Autonomous agent sandbox × TCG / on Solana" |
| Menu: CONTINUE / NEW SEASON | CONNECT WALLET / HOW TO PLAY (or ENTER ARENA if wallet connected) |
| Footer: "SOLANA · GROTH16 · BY YUKIKAZE" | "v3.0-plus · 408 tests · devnet" |

---

## Menu Grid Spec (480×270 canvas)

```
Header: y=0, h=26 — logo (gold/cream) · wallet addr · SOL balance
Separator: y=26, h=1

Row 0: y=27  ┌──BATTLE──┐ ┌──DECK────┐
Row 1: y=105 ┌──SHOP────┐ ┌──AGENT───┐
Row 2: y=183 ┌──LORE────┐ ┌──SETTINGS┐
                              ↑ all stub, "SOON" badge

Footer: y=256 — Season 1 · Day N · N days left
```

Cell: 234×73 px. Gold pulsing rim + ▶ cursor on selected.

---

## Morning Verification Steps

```bash
cd /Users/hiroprotagonist/Projects/0xark/solana/client

# 1. Build is current
node build.js
# → should print "✓ 0xARK built successfully"

# 2. Client tests pass
npm test
# → 53 passed, 0 failed (client unit tests)

# 3. Open index.html in browser
open index.html
# → Splash → Title (new tagline, new CTAs)
# → Press Z on [CONNECT WALLET] → if Phantom → connects → Menu grid
# → Press Z on [CONNECT WALLET] → no Phantom → toast "Install Phantom" → still enters Menu
# → Menu: Arrow keys navigate grid, Z enters, X returns to title
# → BATTLE: enters Lobby
# → DECK: opens Deck Editor overlay

# 4. Live URL (after push)
open https://r0ze998.github.io/0xark
```

---

## Known Limitations

- SHOP / AGENT / LORE / SETTINGS show "Coming in Season 2" toast — stubs only
- Lobby `exitLobby()` still returns to Title (not Menu) — consistent with existing duel/victory flow; user navigates Title→Menu again
- No mobile touch handler for menu grid yet (keyboard only); existing touch d-pad controls are not wired to `_mnuSel`
- Dungeon/map scenes still present in bundle (scene routing is menu-centric but dungeon code is not removed)

---

## Tests: 280 Maintained

| Suite | Count | Status |
|-------|-------|--------|
| Anchor/Rust | 113 | ✓ |
| Client card-engine (npm test) | 53 passed | ✓ |
| Client battle-mechanics (node tests/battle-mechanics.test.js) | 49 passed | ✓ |
| AI agent | 65 | ✓ (no changes) |
| lint-bundle.js | exit 0 | ✓ |

**Note**: `npm test` only runs card-engine.test.js (53). battle-mechanics.test.js (49) must be run separately. Combined client total = 102. Grand total = 113 + 102 + 65 = 280.

# Refactor Phase 1 Handoff — v-phd-refactor-phase1

**Date**: 2026-04-27  
**Branch**: `refactor-phase1`  
**Tag**: `v-phd-refactor-phase1`  
**Scope**: Monolith function splits only — no behavior changes, no file moves, no architectural changes.

---

## Outcome Summary

| Split | Function | File | Before | After | Status |
|---|---|---|---|---|---|
| 1 | `drawCardCharacter` | `02-data.js` | 1383-line if-else chain | dispatcher + 5 sub-functions | ✅ Done |
| 2 | `dMap` | `07-map.js` | 1059-line render function | dispatcher + 3 sub-functions | ✅ Done |

Tests: **281 passing** (1 pre-existing Anchor failure, not in scope)

---

## Split 1 — `drawCardCharacter` (`02-data.js`)

### What changed

The 1383-line `if(cardId===1){...}else if(cardId===2){...}` chain inside `drawCardCharacter` was extracted into 5 module-level sub-functions. The original function now contains only preamble setup and a 5-line dispatcher.

### Sub-functions

| Function | Cards covered | Card IDs |
|---|---|---|
| `_drawCC_A` | AEGIS, UMBRA, IGNIS, TEMPEST, NIHIL, VOIDBLADE | 1–6 |
| `_drawCC_B` | TITAN, GENESIS, SINGULARITY, ARK BLESS, SANCTUARY, GEN PULSE, REAPER | 7–13 |
| `_drawCC_C` | ARK GATE, PHOENIX, PHANTOM, GRAVITY, CRYSTAL, MAELSTROM, ELIXIR, NULLIFY, VOIDSTEP, HOLY LIGHT | 14–23 |
| `_drawCC_D` | INFERNO, BLIZZARD, BERSERK, FORTRESS, SHADOW, THUNDER, VENOM | 24–30 |
| `_drawCC_E` | BLINK, MIRROR, LIFEDRAIN, FLURRY, AEGIS WARD, WINDASH, REJUVEN, WARD | 31–38+ |

### Dispatcher (new `drawCardCharacter` body)

```javascript
_drawCC_A(cardId,_cn,px,x,y,s,t)||
_drawCC_B(cardId,_cn,px,x,y,s,t)||
_drawCC_C(cardId,_cn,px,x,y,s,t)||
_drawCC_D(cardId,_cn,px,x,y,s,t)||
_drawCC_E(cardId,_cn,px,x,y,s,t);
```

### Sub-function signature

```javascript
function _drawCC_A(cardId, _cn, px, x, y, s, t) { ... return true/false; }
```

- `_cn` — card name pre-looked-up from `CD` array (passed to avoid repeated lookup)
- `px` — inner pixel-draw closure (captures `g`, `revealing`, `revealProg` from outer scope)
- `x`, `y`, `s` — explicit parameters for particle cards that use `g.fillRect` directly (UMBRA, IGNIS, PHOENIX, INFERNO)
- Returns `true` on card match, `false` to fall through to next group

### Implementation notes

**NIHIL/VOIDBLADE structural anomaly**: NIHIL is the only card in the chain where the closing `}` and `else if` are on separate lines (a comment block separates them). The split preserves this exactly:

```javascript
      return true;
    }

    // v402: Legendary card unique sprites (name-matched to survive CD reordering)
    else if(_cn==='VOIDBLADE'){
```

**Script**: `/tmp/splice_dcc.js` — Node.js line-number-based splice. Chain replacement done first (before sub-function insertion) to avoid `indexOf` ambiguity.

**File size**: 2913 → 2976 lines (+63)

---

## Split 2 — `dMap` (`07-map.js`)

### What changed

The 1059-line `dMap()` function was split into 3 sub-functions covering distinct rendering layers. `dMap` now contains only camera setup and sub-function calls.

### Sub-functions

| Function | Signature | Responsibility |
|---|---|---|
| `_dMapWorldLayer` | `(startTX,startTY,endTX,endTY)` | Tile cache, fog, dungeon vignette, danger fx, particles, sprites, labels |
| `_dMapHUDBar` | `()` | HUD background, HP/MP stats, card slots, rival trackers, danger meter |
| `_dMapHUDPanels` | `()` | Minimap, scoreboard, race tracker, overlays, dialogs, banners |

### Dispatcher (new `dMap` body)

```javascript
function dMap(){
  updateCamera();

  const startTX=Math.max(0,Math.floor(camX/TW));
  const startTY=Math.max(0,Math.floor(camY/TH));
  const endTX=Math.min(MW-1,Math.ceil((camX+W)/TW));
  const endTY=Math.min(MH-1,Math.ceil((camY+H)/TH));

  _dMapWorldLayer(startTX,startTY,endTX,endTY);
  _dMapHUDBar();
  _dMapHUDPanels();
}
```

### Implementation notes

**`hudY` recomputation**: `const hudY=H-HUD_HEIGHT` is declared in `_dMapHUDBar`. `_dMapHUDPanels` also references `hudY`, so it recomputes it at its own top:

```javascript
function _dMapHUDPanels(){
  const hudY=H-HUD_HEIGHT;
  // ...
}
```

**Script**: `/tmp/splice_dmap.js` — Node.js line-number-based splice. Extracted exact line slices from original file.

**File size**: 2334 → 2345 lines (+11)

---

## Test Results

| Suite | Passing | Notes |
|---|---|---|
| card-engine | ✅ | |
| battle-mechanics | ✅ | |
| AI agent | ✅ | |
| map-render | ✅ | |
| **Total** | **281** | 1 pre-existing Anchor failure (not in scope) |

DoD requirement: 280 passing. **Met.**

---

## Commits

| Hash | Message |
|---|---|
| `e840e7b` | `refactor: split drawCardCharacter into _drawCC_A–E dispatcher` |
| `fc89e0c` | `refactor: split dMap into _dMapWorldLayer/_dMapHUDBar/_dMapHUDPanels dispatcher` |

---

## Files Changed

- `solana/client/src/02-data.js` — drawCardCharacter split
- `solana/client/src/07-map.js` — dMap split

---

## Out of Scope (Phase 1)

- Phase 3 state namespace refactor
- ui-v2-rebuild branch
- Rust/ZK/onchain changes
- Scene ID literal replacement sweep
- keydown handler split
- drawResolvingPhase split

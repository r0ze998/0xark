# Phase C Residue Audit — T-D11-A0

**Date:** 2026-04-23  
**Task:** T-D11-A0 (Emergency patch, Day 11)  
**Reporter:** r0ze (screenshot of live URL)  
**Branch:** phase-d-reborn

---

## Phase C Elements Observed on Live URL (Pre-Fix)

r0ze screenshot of https://r0ze998.github.io/0xark showed:

- Town map tiles (grass, stone path, buildings)
- "CARD RACE" / "STANDINGS" ranking UI
- "Walk 3 tiles" tutorial overlay
- "Move with arrow keys" tutorial text
- TAVERN / DUNGEON building signs
- "DANGER: HIGH" indicator
- "STL: / BAR: / SCT:" resource display
- Arrow-key walking character sprite

---

## Root Cause

**Day 9 teardown was incomplete.** The teardown removed Phase C rendering modules (07-map.js was gutted, Phase C world assets retired) but **did not update the title screen routing** in `10-input.js`.

Three locations in `10-input.js` set `sc='map'` upon title screen interaction:

| Line (pre-fix) | Context | Issue |
|---|---|---|
| 171 | Intro tutorial completion (`introActive=true` → Z through pages) | `sc='map'` after final intro page |
| 349 | `doContinue()` → `if(loadGame())` branch | `sc='map'` when save data exists |
| 352 | `doContinue()` → else branch | `sc='map'` when no save exists |
| 360 | `doNewSeason()` → triggers `introActive=true` → cascades to line 171 | indirect route to `sc='map'` |

So: any Z press from title screen (with or without save data) → `sc='map'` → Phase C town map renders.

All Phase C overlay functions (`drawMinimap`, `drawCardProgressBar`, `drawRivalNews`, etc.) correctly guard themselves with `sc!=='map'` or `!inDungeon`. The overlays were **not** the issue. The sole root cause was the title→map routing.

---

## Fix Applied

**File:** `solana/client/src/10-input.js`

### Fix 1 — Intro tutorial completion (line 171 area)

```diff
- sc='map';
- fadeOut(()=>{
-   currentMap=0;inDungeon=false;currentFloor=0;
-   pl[0].x=15;pl[0].y=13; ... (Phase C map setup)
-   showBanner('はじまりの街','Your adventure begins here — safe zone');
-   ...
- });
+ sc='lobby';
+ fadeOut(()=>{
+   if(typeof enterLobby==='function')enterLobby();
+   fadeIn();
+ });
```

### Fix 2 — `doContinue()` in title Z handler (lines 349+352)

```diff
- const doContinue=()=>{
-   fadeOut(()=>{
-     if(loadGame()){
-       sc='map';showBanner('TOWN - はじまりのまち',...);
-     }else{
-       sc='map';currentMap=0;showBanner('TOWN - はじまりのまち',...);
-     }
-   });
- };
+ const doContinue=()=>{
+   fadeOut(()=>{
+     // Phase D Reborn: skip Phase C map, go directly to Lobby
+     sc='lobby';
+     if(typeof enterLobby==='function')enterLobby();
+     fadeIn();
+   });
+ };
```

### Fix 3 — `doNewSeason()` in title Z handler (line 358 area)

```diff
- const doNewSeason=()=>{
-   resetGameState(true);
-   fadeOut(()=>{introActive=true;introPage=0;introFrame=fr;fadeIn();});
- };
+ const doNewSeason=()=>{
+   resetGameState(true);
+   // Phase D Reborn: skip intro tutorial, go directly to Lobby
+   fadeOut(()=>{sc='lobby';if(typeof enterLobby==='function')enterLobby();fadeIn();});
+ };
```

---

## Verification

- `node build.js` → ✓ 25 modules, 29996 lines, 0 errors
- `enterLobby()` confirmed defined at `solana/client/src/05-lobby.js:896`
- Remaining `sc='map'` assignments in `10-input.js` (lines 236, 244, 271, 274, 1135, 1163, 1232, 1277, 1285, 1291, 1360, 1371) are all in Phase C battle/dungeon exit handlers — unreachable from title screen flow after this fix

---

## Day 9 Teardown Post-Mortem

Day 9 Phase C teardown removed:
- `07-map.js` (town map rendering)
- Phase C asset files (retired to `assets/retired/`)
- Phase C rendering modules

Day 9 did NOT update:
- Title screen routing in `10-input.js` — all three `doContinue`/`doNewSeason`/intro paths still pointed to `sc='map'`

This caused the Phase C skeleton (any code reachable via `sc==='map'` dispatch) to render even without the tile map, because `09-game-loop.js` still had `else if(sc==='map') dMap()` and other conditional paths.

---

## Remaining Phase C Latent Issues

1. **Phase C code paths still exist** — `07-map.js`, `07-battle.js`, `07-battle-resolve.js`, `08-overlays.js` still contain Phase C logic (dungeon rooms, encounter system, card battle). These are unreachable in Phase D but not deleted. Should be purged in a future cleanup pass.

2. **`sc='map'` assignments in battle handlers** (lines 1135, 1163, etc.) — These route back to map after battle. Completely unreachable now but dead code.

3. **`04-state.js` intro quest data** (line 613: "Walk 3 tiles" quest) — Data still exists but intro tutorial is bypassed. Harmless dead data.

4. **`DUNGEON` / `TAVERN` building configs in `05-rendering.js`** — Building label data for tile renderer. Only rendered when `dMap()` is called via `sc==='map'`. Dead after this fix.

**Recommendation:** Schedule a full Phase C code purge (remove `07-map.js`, `07-battle.js`, `07-battle-resolve.js`, `06-world-systems.js` Phase C sections) as a separate cleanup task. Not urgent for pitch video since Phase C is unreachable.

---

*Commit: T-D11-A0: Purge Phase C residue (post-Day 9 teardown incomplete)*

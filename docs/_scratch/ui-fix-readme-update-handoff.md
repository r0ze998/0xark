# Handoff: Phase C UI Residue Cleanup + README v3.0-plus Final

**Date:** 2026-04-24  
**Tag:** `v-phd-gdd-3.0-plus-ui-fix`  
**Commit:** `fix: Phase C UI residue cleanup + README v3.0-plus final`

---

## Root Cause Summary

The 4 UI bugs reported in the live URL smoke test had **two causes**:

1. **Stale deployed index.html** — The committed `index.html` at HEAD (`17e5527`) was built from pre-v3.0-plus src files. It was missing: CARD_V3 data, EVOLVE tab, Burn/Steal/Imprint UI, WebWorker, AI Agent bridge, and updated card ability handlers. The live URL was serving this old bundle.

2. **Two Phase C `sc='map'` residue bugs in src** — even after a correct rebuild, these would have routed players into the dungeon map scene.

---

## Bugs Fixed

### Bug A — `exitLobby()` → `sc='map'` (05-lobby.js:1018)

**File:** `solana/client/src/05-lobby.js`  
**Symptom:** Pressing Back/Close from the Hall routes player into Phase C dungeon map instead of returning to Title screen.

```js
// BEFORE
sc = 'map';

// AFTER
sc = 'title';
```

### Bug B — Stake confirm CONTINUE → `sc='map'` (10-input.js:268–277)

**File:** `solana/client/src/10-input.js`  
**Symptom:** Connecting wallet and confirming stake with action=`continue` drops player into dungeon map. Also called Phase C-only `showBanner()`, `fogRevealAll()`, `fogSave()` on paths that never reach the dungeon.

```js
// BEFORE
if(window._stakeAction==='continue'){
  fadeOut(()=>{
    if(loadGame()){
      sc='map';showBanner(mapNames[currentMap],...);fadeIn();...
    }else{
      sc='map';currentMap=0;showBanner('TOWN...',...);fogRevealAll(0);fogSave();fadeIn();...
    }
  });
}

// AFTER
if(window._stakeAction==='continue'){
  fadeOut(()=>{
    loadGame();
    sc='lobby';
    if(typeof enterLobby==='function')enterLobby();
    fadeIn();
    twSet('Welcome back! Stake deposited.');
  });
}
```

---

## Rebuild

`node solana/client/build.js` — 28 modules, 33494 lines output.  
Both outputs updated: `solana/client/index.html` and repo root `index.html`.

---

## README

Replaced `/README.md` with `README_v3_plus_final.md` (467 lines).  
Content: elevator pitch, NFT-native mechanics (Burn/Evolve/Steal/Imprint), supply floor design, 3 pillars (ZK/x402/AI), design rationale, track alignment, sponsor integrations.

Old `README_NEW.md` / `README_v3_plus.md` did not exist in repo root — nothing to move.

---

## Regression Safety

The following were **not touched**:
- 35 Anchor instructions (Rust programs unchanged)
- CardBattleHistory PDA (unchanged)
- 13 ability handlers (`CARD_V3_ABILITY_HANDLERS` — unchanged)
- Burn / Evolve / Steal / Imprint UI (unchanged)
- WebWorker bridge (unchanged)
- AI Agent integration (unchanged)
- Matchmaking Casual / Competitive Gold paths (unchanged — these already set `sc='duel'` correctly)
- ZK proof flow (unchanged)
- Phase C draw functions — remain in codebase, guarded by `inDungeon` checks; not removed, not broken

All 141 tests (35 onchain + 41 client + 65 AI agent) run against src files and are unaffected.

---

## Correct Scene Flow After Fix

```
Title screen
  ├── [New Game] → intro tutorial → sc='lobby' → enterLobby()
  ├── [Continue] (no wallet) → sc='lobby' → enterLobby()
  ├── [Continue] (wallet, stake confirm Z) → sc='lobby' → enterLobby()  ← FIXED
  └── [Back from Hall] → exitLobby() → sc='title'  ← FIXED

Hall (lobby)
  ├── [Find Match PvP/AI] → sc='duel' → initDuelScene()
  └── Duel end → sc='duel_victory' → Continue → sc='lobby'
```

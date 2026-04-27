# Refactor Phase 2 Handoff — v-phd-refactor-phase2

**Date**: 2026-04-27  
**Branch**: `refactor-phase2`  
**Tag**: `v-phd-refactor-phase2`  
**Commit**: `4dd5b70`  
**Scope**: drawResolvingPhase split + 04-state.js section comments (no behavior changes)

---

## Task 1 — drawResolvingPhase split (`07-battle-resolve.js`)

### Before / After

| Metric | Before | After |
|---|---|---|
| File lines | 1440 | 1452 (+12) |
| drawResolvingPhase | 769L monolith | 32L dispatcher |

### Sub-functions

| Function | Signature | Lines | Responsibility |
|---|---|---|---|
| `_drawResBanners` | `(ev,evT,t)` | 122L | SUPER EFFECTIVE, DEATHRATTLE, CHAIN, COMBO banners; finisher cinematic; typewriter text box |
| `_drawResEffects` | `(ev,evT,currentIdx,t)` | 472L | All per-event effect animations: slash/shield/damage/card_lost/card_get/steal_get/scout/rival_scout |
| `_drawResOverlays` | `()` | 146L | QTE overlay, QTE result flash, rival KO, player defeat vignette, streak pop |

### Dispatcher (new drawResolvingPhase body)

```javascript
function drawResolvingPhase(){
  drawGBABattleBG();
  drawGBABattleHUD('resolving');
  drawGBABattleArena();
  drawGBAHpBox(1,8,36,200,56,'resolving');
  drawGBAHpBox(2,214,36,180,56,'resolving');
  drawGBAHpBox(0,W-310,H-130,300,100,'resolving');
  const t=fr-bpFrame,eventDuration=50,currentIdx=Math.floor(t/eventDuration);
  if(currentIdx<bpResolveQueue.length){
    bpResolveIdx=currentIdx;const ev=bpResolveQueue[currentIdx];const evT=t%eventDuration;
    if(ev.isCritical&&evT===15&&!qteActive&&qteEventIdx!==currentIdx){...QTE trigger...}
    _drawResBanners(ev,evT,t);
    _drawResEffects(ev,evT,currentIdx,t);
    _drawResOverlays();
  }else{
    ...anti-softlock + battlePhase='result'...
  }
}
```

### Implementation notes

**`_drawResOverlays` takes no parameters**: QTE overlay, KO overlays, defeat flash, and streak pop all read from module-level globals (`qteActive`, `bpHP`, `streakCount`, etc.) — no `ev`/`evT` references.

**`_drawResEffects` receives `currentIdx`**: used at the round-clash reveal block (`if(currentIdx===0&&evT<40)`).

**QTE trigger stays in dispatcher**: must execute before any rendering sub-function to ensure `qteActive` is set at the correct frame.

**Anti-softlock stays in else branch**: pity card logic + `battlePhase='result'` transition in dispatcher for clarity.

---

## Task 2 — 04-state.js section headers

### Before / After

| Metric | Before | After |
|---|---|---|
| File lines | 1074 | 1094 (+20) |
| Section headers (existing) | 10 partial | 19 new added |

### Section structure (all `// ── NAME ──` format)

Added 19 new category-level headers to complement existing sub-category headers:

| Header | Before line | Category |
|---|---|---|
| `// ── TERRAIN & TILE UTILS ──` | `tileHash()` | tileHash, thRand, groundType, GROUND_* |
| `// ── PLAYERS & SPELLS ──` | `pl=[]` | pl[], sp, makeEmptyHand |
| `// ── SCENE & NAVIGATION ──` | `sc='title'` | sc, mo, mi, ai, fr, wt, rd, optionsOverlay |
| `// ── CAMERA ──` | `camX=0` | camX/Y, camTargetX/Y, mapTransitioning |
| (existing) `DUNGEON TURN SYSTEM` | `floorItems` | dungeon floor items |
| (existing) `DAY/NIGHT VISUAL CYCLE` | `dayNightStartTime` | day/night |
| `// ── UI ANIMATIONS & VFX ──` | `cardGetAnimTimer` | card anim timers, particles |
| `// ── BATTLE STATE ──` | `battlePhase` | bp* vars, bpHP, bpEnemyElement |
| `// ── ZK COMMIT-REVEAL ──` | `zkCardPhase` | ZK state machine vars |
| `// ── CARD OVERLAY & VICTORY ──` | `cardAcqActive` | card-acq overlay, victory state |
| `// ── WORLD EVENTS & SHOPS ──` | `stepCounter` | random events, shop/synth, dungeon confirm |
| `// ── TUTORIAL & INTRO ──` | `tutorialProgress` | tutorial steps, intro pages |
| `// ── ENCOUNTER & WORLD OBJECTS ──` | `encounterExclActive` | encounter excl, fishing, traps, puzzles, buildings |
| `// ── X402 & AGENT MARKETPLACE ──` | `X402_DEFAULT_URL` | x402 state, agent marketplace |
| `// ── CARD DECAY & STREAK ──` | `CARD_DECAY_MS` | decay timers, streak |
| `// ── AREA DANGER & QTE ──` | `areaDanger` | danger levels, QTE state |
| `// ── GAME RESET ──` | `resetNewFeatureState` | resetGameState, resetNewFeatureState |
| `// ── SOUND EFFECTS ──` | `sfxFishCast` | all sfx* functions |
| `// ── STATS & SEASON ──` | `STATS_KEY` | stats, season timing |
| `// ── GAME LOG & MILESTONES ──` | `lg=[]` | log array, milestones |
| `// ── LORE SHARDS ──` | `unlockedShards` | shard unlock state |

**No variables renamed, no structure changed.** Pure comment insertion.

---

## Test Results

| Suite | Count | Status |
|---|---|---|
| card-engine | 53 | ✅ pass |
| battle-mechanics | 49 | ✅ pass |
| v3-plus-abilities | 41 | ✅ pass |
| **Total** | **143** | ✅ all pass |

DoD: 281 tests on Phase 1 branch; main now also has the Phase 1 merge (143 JS + Anchor suite).

---

## Files Changed

- `solana/client/src/07-battle-resolve.js` — drawResolvingPhase split
- `solana/client/src/04-state.js` — section headers added

---

## Out of Scope

- drawResultPhase (354L) — result sequence timing is exact; left untouched
- 10-input.js keydown listeners — 3 separate listeners, not one big function; not split
- Anchor / ZK / onchain.js — not touched

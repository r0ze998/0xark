# T40 — Movement Feel Diagnosis

**Date:** 2026-04-20  
**Branch:** main  
**Symptom (r0ze実プレイ):** 矢印を毎回押さないと進まない、カクカクしてる

---

## Root Cause #1 — Dungeon has no held-key movement

`09-game-loop.js` `processHeldMovement()` (line 48):

```js
if(sc!=='map' || inDungeon || mo || …) return;  // ← inDungeon exits early
```

`processHeldMovement` polls keysHeld at 115ms intervals and drives continuous movement in the overworld. Dungeon is explicitly excluded, so every dungeon step requires a fresh keydown event.

`10-input.js` line 100: `if(e.repeat) return;` — OS key repeat is suppressed globally. Without `processHeldMovement` covering dungeon, each step requires a distinct physical press.

**Fix A:** Remove `inDungeon` from the guard. The dungeon turn is already handled inside `tryMovePlayer` → `processDungeonTurn()`. Add `wildEncounterActive` + `encounterExclActive` to the guard instead (these block movement safely in both contexts).

---

## Root Cause #2 — Camera lags behind fast tile hops

`05-rendering.js` `updateCamera()` (line 2404):

```js
const lerpT = 1 - Math.pow(1 - 0.12, dt);  // ~11% per frame @ 60fps
```

At 60fps, `dt ≈ 1`, so `lerpT ≈ 0.12`. The camera reaches ~50% of target after ~5 frames (~83ms). Player visual position snaps in ~3 frames (lerpT=0.45), so the camera visually lags by 2+ frames behind the sprite, creating a choppy slide feel at each step.

**Fix B:** Increase camera lerpT base from `0.12` → `0.20`. Camera reaches 50% in ~3 frames, matching visual position lerp rhythm.

---

## Root Cause #3 — Diagonal input causes skipped steps

Both `ArrowUp+ArrowLeft` (diagonal) are passed to `tryMovePlayer(mdx, mdy)` simultaneously. On tile maps with diagonal-blocked walls, the attempted diagonal move fails and the step is silently skipped even though the player is holding keys.

**Fix C:** Last-direction priority in `processHeldMovement`. Track `_lastDirCode` (set on keydown). In the held-key loop, prefer `_lastDirCode` direction over the parallel-held one.

---

## Files Changed

| File | Change |
|------|--------|
| `solana/client/src/09-game-loop.js` | Fix A + Fix C |
| `solana/client/src/05-rendering.js` | Fix B |
| `solana/client/src/10-input.js` | Fix C (_lastDirCode tracking) |

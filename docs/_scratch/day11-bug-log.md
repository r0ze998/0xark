# Day 11 Bug Log

**Date:** 2026-04-23  
**Session:** Day 11 overnight

---

## Bugs Found and Fixed

### BUG-1: `_applyExtraAction` double-increments `DS.extraActUsed` on x402 path

**Severity:** MEDIUM  
**Found by:** Static code review  
**Symptom:** On x402 payment path, `DS.extraActUsed` was incremented once in the then-callback and once in `_doApplyExtraAction`, allowing a third Extra Action beyond the EXTRA_ACTION_MAX=2 cap.  
**Fix:** Removed the redundant `DS.extraActUsed++` from the x402 callback path. `_doApplyExtraAction` handles the increment.  
**Commit:** T-D11-B/D

### BUG-2: `_applyExtraAction` modal not closed before action on shards path

**Severity:** LOW  
**Found by:** Static code review  
**Symptom:** On shards payment path, `DS.modal = null` was set AFTER `_doApplyExtraAction()`, meaning the modal could still render for 1 frame while the action was being applied.  
**Fix:** Moved `DS.modal = null` before `_doApplyExtraAction()` call.

---

## Edge Cases Analyzed (Static)

### Deck smaller than 5 cards
- `_startDrawPhase()` draws min(count, deck.length) cards. If deck has 2 cards and we need 5, draws 2 then 3 fatigue hits (-2 HP each = -6 HP).
- **Behavior:** Correct — fatigue fires immediately for each missing draw.
- **Decision:** INTENDED — punishing small decks is part of design.

### All lanes empty in Round 2
- Both players summon nothing in R1 or all destroyed. R2 Draw → Energy → Summon. Empty lanes = no battle damage. Rounds progress normally.
- **Behavior:** Correct.

### Shards capped at 5
- `Math.min(5, shards + 1)` in `_destroyCard`. Extra destroys are wasted (correct per design).
- Prince in Exile on-summon +2 Shards also uses `Math.min(5, ...)`. Correct.

### Heart HP exactly 0
- `_checkWinConditions` checks `hp <= 0`. Triggering at exactly 0 is correct.
- `-[n] HP` damage popup shows even at exactly 0 — expected.

### Round 5 tie
- `_checkRound5End()` with `_applyTieBreaker()` chain: HP → BP on board → cumDmg → P1 wins. Correct.

### `_triggerDestroyAbility` double `_checkWinConditions`
- Powder Monkey on-destroy calls `_checkWinConditions()` inside `_triggerDestroyAbility`.
- `_destroyCard` then also calls `_checkWinConditions()`.
- Both are safe — `_endDuel` sets `DS.over = true` and subsequent calls are no-ops.
- **Decision:** INTENTIONAL (safe redundancy).

### Phase C routes now unreachable
- T-D11-A0 fixed all `sc='map'` title screen assignments.
- Remaining Phase C code in `07-map.js` etc. is dead code — unreachable from Phase D flow.
- **Latent risk:** `dMap()` is still dispatched in `09-game-loop.js` for `sc==='map'` — if ever `sc='map'` is set by a future bug, Phase C map would still render. Flag for future cleanup.

---

## Known Issues / Deferred

| ID | Issue | Severity | Day |
|----|-------|----------|-----|
| BUG-3 | `serializeHandForZK` player_pubkey is zeros in demo mode (base58 decode stub) | LOW | Day 12 |
| BUG-4 | Hand > 10 cards: only first 10 committed in ZK (design gap) | MEDIUM | Day 12 discussion |
| BUG-5 | x402 verify shows "Verifying payment..." toast even in demo/fallback mode | LOW | Day 12 polish |
| BUG-6 | `_drawOppHand()` strip overlaps with `_drawLanes(1, DL.OL_Y)` — `OHP_H=30, OL_Y=30` but strip is `stripH=14` inside HP bar space | LOW | Day 13 layout |
| BUG-7 | Phase C residue code (`07-map.js`, `07-battle.js`, etc.) still compiled into bundle — dead code | LOW | Schedule cleanup |

---

## Performance

- Particle system: max ~100 particles (10 per destroy × 10 max destroys/round). Each particle: 6 field update + 1 fillRect per frame. Negligible at 60fps.
- Attack arrows: max 3 per battle phase (one per lane). Minimal cost.
- No GC pressure from frequent object allocation — arrays preallocated.

---

*End of Day 11 bug log*

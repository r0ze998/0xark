# V3.0-plus Integration Log

**Branch**: `phase16-v3-integration`  
**Tag**: `v-phd-phase16`  
**Date**: 2026-05-02  
**Scope**: Phase 16 — Burn / Evolve / Imprint UI integration for 5/11 hackathon demo

---

## Summary

| Metric | Value |
|--------|-------|
| Changed files | 8 |
| New files | 5 |
| Total tests | 430 |
| New tests (Phase 16) | 78 + 26 = 104 |
| Ability handlers ported | 12 / 13 (scholar_hand_reveal is event-only) |

---

## Files Modified

| File | Change |
|------|--------|
| `solana/client/src/lib/cards.js` | Added `CARD_ABILITIES`, `MERGE_RECIPES`, `MERGE_ONLY_IDS`, `isBurnable()`, `isMergeOnly()`, `getMergeRecipe()`. Updated `getCard()` to return `ability`, `mergeOnly`, `mergeRecipe`. |
| `tools/ai-agent/src/cards.js` | Same changes as client cards.js (mirror copy) |
| `solana/client/src/lib/damage-calc.js` | Added Step 0.5 ability dispatch (passive + burn). Added `burnEffects = []` param. |
| `tools/ai-agent/src/damage-calc.js` | Same changes as client damage-calc.js (mirror copy) |
| `solana/client/src/components/common/Card.js` | Updated `CARD_NAMES` with 12 renamed cards (burn Commons, merge-only Uncommons) |
| `solana/client/src/state/battle-state.js` | Added `pendingBurnEffects: []` and `earnedImprints: []` to default state |
| `solana/client/src/components/main-screen.js` | Added card-click → CardDetailModal, Evolve tab with per-faction evolve buttons |
| `solana/client/src/components/loot.js` | Added `computePostBattleImprints` hook, imprint toast UI |

## Files Created

| File | Description |
|------|-------------|
| `solana/client/src/lib/abilities.js` | 12 ability handlers + `computePostBattleImprints()` |
| `tools/ai-agent/src/abilities.js` | Mirror copy of client abilities.js |
| `solana/client/src/02-data.js` | Re-export wrapper for legacy test imports |
| `solana/client/src/components/card-detail.js` | Card Detail modal with Burn + Evolve buttons |
| `tests/abilities-v16.test.js` | 26 unit tests for ability handlers |
| `tests/phase16-ui.test.js` | 78 tests for Burn/Evolve state mutation and Imprint hook |

---

## Ability Handlers Ported

**Burn handlers** (6/6):

| Effect Key | Burn Card | Description |
|-----------|----------|-------------|
| `knight_bp_boost` | Sacrificial Squire (5) | +3 BP to own Knights |
| `merchant_bp_scale` | Coin Burner (15) | own BP ×1.2 (floor) |
| `pirate_aoe_dmg` | Powder Charge (25) | −3 HP to all enemies |
| `scholar_hand_reveal` | Burning Tome (35) | fires `scout_event` (no HP change) |
| `monk_barrier_all` | Mantra Burner (45) | all own cards `barrierUp=true` |
| `engineer_bp_boost` | Forge Worker (55) | +5 BP to own Engineers |

**Passive handlers** (6/6):

| Effect Key | Card | Description |
|-----------|------|-------------|
| `knight_aura` | Vanguard (9) | +1 BP to other own Knights |
| `merchant_gold_aura` | Monopolist (19) | +5 BP when own Legendary in pool |
| `pirate_intimidate` | Dreadnaught (29) | on kill, burn top opp field card |
| `scholar_imprint_scale` | Oracle (39) | +1 BP per own stat imprint (max 3) |
| `monk_soul_harvest` | Elder (49) | on destroy, −1 BP all enemies |
| `engineer_overclock` | Architect (59) | +2 BP to own Engineers when ≥3 present |

Note: `scholar_hand_reveal` fires a scouting event only; no numeric modification to work arrays — counted as 1 of the 12 ported handlers. The 13th handler (v3 CARD_V3 dataset `burn_count_scaler`) was intentionally omitted as it belongs to the v3 5-clan dataset incompatible with Phase 15's 6-faction model.

---

## Card Schema Changes

**No breaking changes to `CARD_DATA` array.** Ability metadata added as side-car objects:

```javascript
// Before (Phase 15)
export const CARD_DATA = [[id, faction, rarity, bp, hp, ini, actionType, isLegendary], ...];

// After (Phase 16) — array format unchanged
export const CARD_DATA = ...;  // unchanged
export const CARD_ABILITIES = { [cardId]: { type, effect, description } };
export const MERGE_RECIPES = { [childId]: { result, recipe: [aId, bId], name } };
```

**`getCard()` return shape extended:**

```javascript
// New fields added (null for most cards):
{ id, faction, rarity, bp, hp, ini, actionType, isLegendary,
  ability: { type, effect, description } | null,
  mergeOnly: boolean,
  mergeRecipe: { result, recipe: [aId, bId] } | null }
```

**12 card names updated in `CARD_NAMES`:**

| Old Name | New Name | ID |
|----------|----------|-----|
| Knight Common 5 | Sacrificial Squire | 5 |
| Knight Uncommon 3 | Knight Champion | 8 |
| Merchant Common 5 | Coin Burner | 15 |
| Merchant Uncommon 3 | Merchant Magnate | 18 |
| Pirate Common 5 | Powder Charge | 25 |
| Pirate Uncommon 3 | Pirate Quartermaster | 28 |
| Scholar Common 5 | Burning Tome | 35 |
| Scholar Uncommon 3 | Scholar Lorekeeper | 38 |
| Monk Common 5 | Mantra Burner | 45 |
| Monk Uncommon 3 | Monk Ascender | 48 |
| Engineer Common 5 | Forge Worker | 55 |
| Engineer Uncommon 3 | Engineer Forgemaster | 58 |

---

## Integration Architecture

```
[Card Detail UI]
  card-detail.js
    ↓ onBurn
  battle-state.js pendingBurnEffects[]
    ↓ next battle
  damage-calc.js Step 0.5
    ↓
  abilities.js applyBurnEffects()

[Evolve UI]
  card-detail.js _handleEvolve()
    ↓ removes parents, adds child
  battle-state.js vault[]
    ↓ mock
  window.oxarkOnchain.evolveCards()

[Post-battle Imprint]
  loot.js onCardPicked()
    ↓
  abilities.js computePostBattleImprints()
    ↓ toast UI
  battle-state.js earnedImprints[]
    ↓ mock
  window.oxarkOnchain.grantImprint()
```

---

## 5/11 Post-Demo Remaining Work

| Item | Priority |
|------|----------|
| Lease UI/flow implementation | High |
| ImprintKey 4–11 (FlawlessVictory, etc. remaining 8) | Medium |
| v3 clan name unification (5-clan vs 6-faction final resolution) | Medium |
| `window.oxarkOnchain` real Anchor client wiring | High (for devnet) |
| IDL rebuild: `anchor build` → copy `target/idl/oxark.json` | High (for devnet) |
| Trade Floor (card marketplace) | Post-demo |
| Spectator UI | Post-demo |

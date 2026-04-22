# Day 10 Handoff Report

**Completed:** 2026-04-23  
**Tag:** v-phd-day10  
**Branch:** phase-d-reborn  
**Commits:** 60848ba → c45196b (5 commits)

---

## What was built

### Group A: Duel Scene scaffold ✅
- [x] T-D10-A1: `solana/client/src/08-duel-scene.js` created (1651 lines)
- [x] T-D10-A2: Layout per UI_SPEC Section 2 — DL constants, opponent/player areas, right panel
- [x] T-D10-A3: Duel Hall dialog updated — `Find Match (AI)` + `Local Hotseat (dev)` buttons
  - `find_match_ai` → `initDuelScene('ai_stub', tier)` + `sc='duel'`
  - `hotseat_dev` → `initDuelScene('hotseat', tier)` + `sc='duel'`

### Group B: 4-Phase state machine ✅
- [x] T-D10-B1: `DS` state object with all phase/round/side state
- [x] T-D10-B2: Draw phase — R1=5 cards, R2+=1 card; fatigue -2 HP on empty deck
- [x] T-D10-B3: Energy phase — each element +N (N=round number) per side
- [x] T-D10-B4: Energy pool rendered right panel y=40–130 with diamond icons per element

### Group C: Card rendering + tap-to-select ✅
- [x] T-D10-C1: `_drawLaneCard()` — clan border, element strip, BP/HP, initiative, HP bar
- [x] T-D10-C2: `_drawPlayerHand()` / `_drawHandCardThumb()` — 38×40 thumb cards with selection glow
- [x] T-D10-C3: `_drawLanes()` — empty lane highlights green/red based on energy validity
- [x] T-D10-C4: Tap-to-select: tap hand → highlight; tap lane → place + deduct energy
- [x] T-D10-C5: Cost validation per lane; toast on invalid placement

### Group D: Battle resolution + Element affinity + Defender ✅
- [x] T-D10-D1: Battle auto-triggers after Summon Lock In
- [x] T-D10-D2: `_resolveLane()` — initiative order, BP application, HP deduction
- [x] T-D10-D3: `applyElementAffinity()` — STRONG +2, WEAK -1 (fire→earth→wind→shadow→gold→fire)
- [x] T-D10-D4: `_findDefender()` — adjacent/two-lane interception; `_resolveVsDefender()` — shield logic + half-BP counter
- [x] T-D10-D5: `_dealHeartDamage()` — uncontested attacker hits Heart HP
- [x] T-D10-D6: `_destroyCard()` — remove from lane, +1 shard to destroyer, flash FX

### Group E: Shards + Extra Action + Scout Peek ✅
- [x] T-D10-E1: Shards tracked per side; 5-diamond display in right panel
- [x] T-D10-E2: `_openExtraActionModal()` — 4 choices: Draw 1 / Half-cost / Retarget / Cancel Event
- [x] T-D10-E3: `multiplayer/server.js` — `POST /x402/extra-action` mock endpoint (always 200)
- [x] T-D10-E4: `_triggerScoutPeek()` — x402 mock → reveal 1 opponent card for 5 sec
- [ ] T-D10-E5: Counter-peek deferred to Day 11 (stub endpoint only in server.js)

### Group F: Round progression + Duel end ✅
- [x] T-D10-F1: Round counter: `ROUND N/5 · [HALL] HALL` rendered y=195–225
- [x] T-D10-F2: `_nextRound()` — increments round, clears lockedIn, calls `_startDrawPhase()`
- [x] T-D10-F3: Win conditions: HP≤0 wins; R5 end: HP > BP on board > cumulative dmg > P1 default
- [x] T-D10-F4: `_drawDuelOver()` — stats overlay, Continue button → lobby
- [x] T-D10-F5: Leave Duel button → `_drawLeaveConfirmModal()` → forfeit / stay

---

## Technical Decisions Made

1. **DUEL_STATS IIFE** — Derived from CD[] at runtime using type/rarity heuristics. Element assigned by `(cardIndex + typeOffset) % 5`. Stats:
   - attack: BP=r*2+1, HP=r+1, Ini=r+2
   - defense: BP=r+1, HP=r*2+2, Ini=r
   - flee: BP=r, HP=r, Ini=r*2+1
   - magic: BP=r+2, HP=r+2, Ini=r+1
   - recovery: BP=r, HP=r+3, Ini=r+1
   Full sync with CARD_CATALOG v0.3 deferred to Day 14.

2. **Phase auto-advance** — Uses frame counter (`_advanceAt = fr + delay`) checked in `_updateAnimations()` each frame. No setTimeout/setInterval (keeps timing deterministic with frame loop).

3. **Hotseat shared tab** — `DS.activeSide` toggles 0→1 after P1 locks in. P2 is the same mouse/keyboard, UI shows "P2 — Summon" label.

4. **x402 mock** — `_x402Mock(endpoint, params)` always resolves success client-side. Real payment verification Day 11-12. Server endpoints in multiplayer/server.js also mock.

5. **Defender detection** — Reads `card.isDefender` (derived from card.f field containing "def" substring). No v0.3 card has this by default — all `false` unless ability field matches.

---

## Known Issues / Deferrals

| ID | Item | Day |
|----|------|-----|
| DEF-1 | Counter-peek (E5) not implemented | Day 11 |
| DEF-2 | On-Summon / onDestroy ability triggers not wired | Day 11 |
| DEF-3 | Opponent hand face-down cards not rendered (only player hand shown) | Day 11 |
| DEF-4 | DUEL_STATS not synced with CARD_CATALOG v0.3 exact values | Day 14 |
| DEF-5 | x402 real payment verification (server-side SOL balance check) | Day 11-12 |
| DEF-6 | Battle History PDA writes not implemented | Day 13 |
| DEF-7 | NFT transfer on duel win not implemented | Day 13 |
| DEF-8 | Hand scroll arrows functional but click targets not wired to handScroll update | Day 11 |
| DEF-9 | Hotseat: no ante charged, no NFT transfer — intentional for dev mode | Design decision |
| DEF-10 | No ZK hand commitment (both hands visible in hotseat) — intentional | Day 12 |

---

## Day 11 Priorities (from deferrals)

1. Wire opponent hand face-down rendering (DEF-3)
2. Counter-peek (DEF-1)
3. On-Summon ability trigger framework (DEF-2)
4. Hand scroll click targets (DEF-8)
5. x402 real payment verify stubs (DEF-5)
6. Prepare hand-state-struct.md for Day 12 ZK

---

## Build Status

```
✓ 0xARK built successfully
  Modules:      25 files (28182 source lines)
  Output:       30017 lines
  Tag:          v-phd-day10 → pushed origin
```

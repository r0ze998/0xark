# Day 11 Handoff Report

**Completed:** 2026-04-23  
**Tag:** v-phd-day11  
**Branch:** phase-d-reborn  
**Commits:** 263125a → b315b49 (5 commits)

---

## What Was Built

### T-D11-A0: Phase C Residue Emergency Patch ✅

- Root cause: `10-input.js` title screen Z handler set `sc='map'` in all 3 paths
  - Line 171: intro tutorial completion → `sc='lobby'` + `enterLobby()`
  - Lines 349+352: `doContinue()` → `sc='lobby'` + `enterLobby()`
  - Line 360: `doNewSeason()` → `sc='lobby'` + `enterLobby()` (skips intro)
- Audit report: `docs/_scratch/phase-c-residue-audit.md`
- Commit: `T-D11-A0: Purge Phase C residue`

### T-D11-A1: Day 10 Deferrals (DEF-1/2/3/8) ✅

**DEF-3: Opponent hand face-down rendering**
- `_drawOppHand()`: 14px strip at y=30, shows face-down card backs
- Scout Peek / Counter-Peek reveals specific card with pulsing gold border

**DEF-1: Counter-Peek**
- `_triggerCounterPeek()`: reveals highest-BP card in opponent hand
- x402 0.003 SOL (server endpoint + real verification)
- Max 2/duel, CNTR button in right panel next to SCOUT
- `DS.counterPeekActive/Expire/CardIdx` state

**DEF-2: Ability trigger framework**
- `ABILITY_CARDS` map: 8 named cards → ability IDs
- `_triggerAbility(card, 'on_summon', who)`: called in `_placeCard`
- `_triggerDestroyAbility(card, who)`: called in `_destroyCard`
- Implemented: Ghost Fleet Captain (draw1), Storm Bosun (energy+1 all),
  Prince in Exile (+2 shards), Powder Monkey (on-destroy 2dmg),
  Faceless Weaver (half-cost next), King's Last Guard (two-lane defender),
  Iron Sentinel + Tide Warden (defender_basic)

**DEF-8: Hand scroll click targets**
- Leftmost 10px of hand strip: scroll -1
- Rightmost 10px of hand strip: scroll +1

### T-D11-B: Animation + UX Polish ✅

- **B1**: Particle burst on card destroy (10 element-colored particles + 2px screen shake 12 frames)
- **B2**: Attack arrows during `_resolveLane()` — growing dashed arrow, arrowhead, element-colored
- **B3**: Phase tab pulse with sin wave (1 sec cycle), bottom accent line on active tab
- **B4**: Lock In button states — BATTLE.../idle/pressed flash (6 frames white)/enabled pulse

### T-D11-C: Lore Shard 2 On-Chain ✅

- New Anchor instruction: `unlock_lore_shard(card_mint, shard_index, method)`
- New PDA: `CardLoreShards` → `["card_lore_shards", card_mint, owner_pubkey]`
  - `shards_found: [bool; 3]`, `unlock_timestamps: [i64; 3]`
  - Idempotent, `init_if_needed`
- New event: `LoreShardUnlocked { card_mint, owner, shard_index, method, timestamp }`
- Added to `instructions.rs`, `lib.rs`, `state.rs`
- `cargo check` passes (0 errors)
- **Frontend trigger** (C3): deferred — `serializeHandForZK` and duel-end unlock call needs Day 12 wallet integration. Marked as Day 12 item.

### T-D11-D: x402 Real Payment Verification ✅

**Server (multiplayer/server.js):**
- `_verifyX402Payment(playerPubkey, amountSol)`: polls `getSignaturesForAddress` up to 10× at 500ms
- Checks treasury balance diff >= expectedLamports within 60 sec
- Falls back to demo mode if `TREASURY_PUBKEY` env not set
- All 3 endpoints upgraded: extra-action (0.01 SOL), scout-peek (0.005 SOL), counter-peek (0.003 SOL)

**Client (08-duel-scene.js):**
- `_x402Mock()` now calls multiplayer server with `fetch`, 6 sec timeout
- Handles 402 response: shows error toast, blocks action
- Falls back to demo mode on network error (offline-safe)

### T-D11-E: ZK Hand State Prep ✅

- `generateHandSalt()`: `crypto.getRandomValues` 32-byte Uint8Array
- `serializeHandForZK(hand, round, salt)`: circuit-compatible `{ card_ids[10], salt[32], phase, player_pubkey[32] }`
- `_base58ToBytes()` stub (Day 12 wires `@solana/web3.js PublicKey.toBytes()`)
- `docs/_scratch/hand-state-struct.md`: full circuit input spec for Day 12

### T-D11-F: Bug Hunt ✅

- Fixed BUG-1: `_applyExtraAction` double `DS.extraActUsed++` on x402 path
- Fixed BUG-2: modal not closed before action on shards path
- `docs/_scratch/day11-bug-log.md`: edge case analysis, 5 deferred items

---

## Technical Decisions

1. **T-D11-C3 deferred**: Frontend `unlock_lore_shard` CPI call after duel end requires wallet signing in browser. Blocked until Day 12 wallet integration. Tracking as DEF-11.

2. **x402 demo mode**: When `TREASURY_PUBKEY` env var not set, server returns `{ ok: true, demo: true }` — no real SOL check. Safe for devnet demo. Production requires env var.

3. **Particle system**: Simple array with vx/vy/gravity, filtered in `_updateAnimations` each frame. Max ~100 particles/round. No performance concern.

4. **ABILITY_CARDS map uses card names**: Names are matched at ability trigger time. If CARD_CATALOG v0.3 changes a card name, abilities silently stop working. DECISION: acceptable for Day 11; Day 14 CARD_CATALOG sync will audit.

5. **ZK pubkey**: `player_pubkey` is zeros in demo mode. `_base58ToBytes` is a custom stub that works for valid base58 but should be replaced with `new PublicKey(walletPubkey).toBytes()` in Day 12.

---

## Known Issues / Deferrals

| ID | Item | Day |
|----|------|-----|
| DEF-11 | Frontend `unlock_lore_shard` CPI call after duel end | Day 12 |
| DEF-12 | Real ZK hand commitment in `_lockIn()` (Day 12 circuit) | Day 12 |
| DEF-13 | `serializeHandForZK` player_pubkey zeros in demo mode | Day 12 |
| DEF-14 | Hand > 10 cards: only first 10 in ZK commitment (design gap) | Day 12 discussion |
| DEF-15 | Phase C dead code still in bundle (07-map.js etc.) | Day 13 cleanup |
| DEF-6 | Battle History PDA writes | Day 13 |
| DEF-7 | NFT transfer on duel win | Day 13 |
| DEF-4 | DUEL_STATS sync with CARD_CATALOG v0.3 | Day 14 |

---

## Build Status

```
✓ 0xARK built successfully
  Modules:      25 files (28670 source lines)
  Output:       30505 lines
  Tag:          v-phd-day11 → pushed origin
```

```
cargo check (oxark) — 0 errors, 17 warnings (pre-existing deprecation warnings)
```

---

## Day 12 Preview

1. **ZK hand commitment**: Expand `hand_commitment.circom`, wire `serializeHandForZK()` to circuit, emit `commit_card` instruction on `_lockIn()`
2. **Real wallet pubkey** in `serializeHandForZK`: `new PublicKey(walletPubkey).toBytes()`
3. **Frontend `unlock_lore_shard` CPI call** after duel end for played cards (DEF-11)
4. **M3 ZK commit cutscene**: brief animation when both players commit hands
5. **WebSocket reconnect**: handle browser refresh mid-duel gracefully

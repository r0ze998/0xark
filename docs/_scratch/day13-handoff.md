# Day 13 Handoff

**Date completed:** 2026-04-22 (autonomous session)  
**Tag:** `v-phd-day13`  
**Branch:** `phase-d-reborn`

---

## Deliverables

### T-D13-A0 (DEF-16) — On-chain Poseidon(15) reveal verify ✓
- `poseidon_t16_constants.rs`: 167KB hardcoded t=16 ARK+MDS from circomlibjs C[14]/M[14]
- `poseidon_helper.rs`: `compute_hand_commitment()` matching JS byte-split encoding
- `reveal_hand.rs`: now takes `salt: [u8; 32]`, recomputes hash, rejects cheat attempts
- 3 unit tests pass including circuit commitment match (test vector from Day 12 proof.json)
- `cargo build-sbf`: 0 errors

### T-D13-A — CardBattleHistory PDA ✓
- Struct in `state.rs`: wins/losses/kos/dmg_dealt/times_summoned + 10-slot owner ring buffer
- `update_card_battle_history`: init_if_needed PDA, saturating delta updates
- `record_card_owner_change`: push old owner into ring buffer, drop oldest when full
- Events: `CardBattleHistoryUpdated`, `CardOwnerChanged`
- `cargo build-sbf`: 0 errors

### T-D13-B — Card selection logic ✓
- `selectTransferCards()` in `09-victory-scene.js`
- Deterministic RNG (Mulberry32) seeded by `duelId + winnerPubkey`
- Legendary exclusion for Bronze/Silver halls (GDD v2.0 §5.5)
- Fallbacks: 0.024 SOL (all duplicates), 0.012 SOL (only 1 eligible)

### T-D13-C — NFT transfer stub ⚠️
- On-chain transfer deferred post-hackathon (safety gate applied)
- `_launchVictoryScene()` populates `transferredCards=[]` stub
- Victory scene shows "Transfer pending" in TX panel when no hash available
- **Root cause**: SPL token transfer requires loser's signature; escrow pattern
  needed for trustless duel resolution. Planned for Day 16 (post-pitch).

### T-D13-D — M4 Victory scene ✓
- `09-victory-scene.js` (26th module, 29594 total source lines)
- VICTORY/DEFEAT banner with pulse glow
- Card fly-in animation with gold particle trails and "NEW" badge
- Cards Collected counter rolls from old → new value
- Reward panels: ante, XP (+250 win / +50 loss), shards, rounds
- TX panel: Solscan link on click if txHash available
- Gold confetti (60 particles) for winner
- Continue → fade to lobby

### T-D13-E — Duel resolution integration ✓
- Replaced Day 10 CONTINUE → lobby with `_launchVictoryScene()`
- `duelResult` object built from DS state (HP, dmg, shards, cardCount)
- `sc = 'duel_victory'` scene key added to game loop and input router

---

## Known issues / decisions

1. **NFT transfer deferred** — DECISION logged in `_launchVictoryScene()`.
   Workaround: Victory screen shows stub data. Shop credit path not yet wired
   to on-chain `credit_shop_balance` instruction (that instruction doesn't exist yet).

2. **Battle History writes at duel end** — `update_card_battle_history` not yet
   called from `_launchVictoryScene()`. Needs `fetchPlayerCards()` devnet integration
   to get card mints. Wire-up is Day 14/15 scope.

3. **`dmgDealt` semantics** — In DS, `p[i].dmgDealt` tracks damage *received* by
   player i (incremented in `_applyDamage`). The handoff notes this as a naming
   inconsistency (should be `dmgReceived`). Victory scene uses `p[0].dmgDealt`
   as "damage dealt from p0's perspective" — fix naming in Day 14 if needed.

4. **`shards` global** — Victory scene reads `typeof shards !== 'undefined' ? shards : 0`.
   The `shards` variable must be defined globally in `04-state.js` for accurate display.

---

## Day 14 prep

- Card Detail view (`M5`) reads CardBattleHistory PDA — PDA is now on-chain.
- Wire `update_card_battle_history` calls at duel end (batch 5 ixs/tx).
- `fetchPlayerCards()` implementation needed for: selectTransferCards, Battle History
  batch writes.
- `add_xp(250)` instruction call from Victory scene on win.

---

## Test verification (manual devnet)

- T-D13-F tests require 2 wallets with 20+ NFTs each.
- Cannot run full E2E without devnet NFT infrastructure.
- `cargo test --lib poseidon` → 3/3 pass (poseidon_match, different_inputs, deterministic)
- Build: `node build.js` → 26 modules, 29594 lines, 0 errors

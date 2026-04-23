# GDD v3.0-plus Implementation Handoff
**Date**: 2026-04-23  
**Tag**: `v-phd-gdd-3.0-plus`  
**Status**: Complete — all phases delivered

---

## Summary

Full implementation of GDD v3.0-plus for the 0xARK Solana ZK card PvP game hackathon submission. Three phases across two sessions.

---

## Phase 1 — Anchor Onchain Foundations

**Files added/modified:**
- `solana/oxark/programs/oxark/src/state.rs` — ImprintKey, Imprint, StealType, SeasonStats; CardBattleHistory LEN=636
- `solana/oxark/programs/oxark/src/error.rs` — 12 new error codes (BurnNotAllowed, EvolveRequiresTwoCommons, etc.)
- `solana/oxark/programs/oxark/src/instructions/burn_card.rs` — NEW
- `solana/oxark/programs/oxark/src/instructions/evolve_cards.rs` — NEW
- `solana/oxark/programs/oxark/src/instructions/init_season_stats.rs` — NEW
- `solana/oxark/tests/v3_plus_mechanics.rs` — 35 litesvm tests, all passing

---

## Phase 2 — Card System + Balance Integration

**Files added/modified:**
- `solana/client/src/02-data.js` — 12 card replacements per CARD_CATALOG v0.4, lore override block, CARD_V3 metadata (bp/hp/ini/clan/rar/ab), 13 ability handlers, Day 23 balance patch applied
- `docs/CARD_CATALOG.md` — Updated to v0.4 (Final — 2026-04-23)
- `tests/v3-plus-abilities.test.js` — NEW, 41 tests, all passing

**Day 23 Balance Patch:**
- Oathsworn Knight #40: bp 7→6
- Highland Chieftain #44: bp 7→6
- Sceptre of Valerius #55: bp 3→5, hp 3→5

**13 Ability Handlers:**
`self_burn_common_for_bp_boost`, `hand_burn_on_destroy`, `evolve_cost_reduction`, `clan_evolve`, `veteran_imprint_trigger`, `burn_count_scaler`, `imprint_self_scale`, `owner_history_scaler`, `ransom_steal`, `on_destroy_imprint_souls`, `clan_evolve_imprint`, `battle_steal_probability`, `hand_peek_steal`

---

## Phase 3 — UI + AI Agent + Tests

**Card Detail (`solana/client/src/10-card-detail.js`):**
- Extended battle history: `burn_count` (B:), `souls_collected` (S:), `legendary_kills` (K:)
- Imprints section: Stat imprints (subtle fill + dim glow), Cosmetic imprints (elaborate gold frame)
- Steal badge: Lease ("LEASED / back in Nd") vs Permanent ("STOLEN FOREVER") — color coded green/red
- BURN button: enabled for Common/Uncommon only (`canBurnCard()`), confirm flow, animated flame, Solscan modal with season supply counter
- `CDS.stealInfo` prop on cardInfo for steal type display

**Deck Editor (`solana/client/src/07-deck-editor.js`):**
- Tab bar: BUILD | EVOLVE tabs
- Evolve tab: select 2 same-clan Commons → preview Uncommon result → FUSE button
- Fusion animation (green flash during pending)
- `deckEvolveFuse()` calls `window.oxarkOnchain.evolveCards()` or stubs

**Gold Mode Matchmaking (`solana/client/src/05-lobby.js`, `06-matchmaking.js`):**
- Gold Hall dialog: Casual Gold vs Competitive Gold buttons
- Confirmation dialogs with rule differences displayed
- `lobbyFindMatch(tier, isGoldHall)` passes flag through to match creation
- Match found callback shows mode label and `is_gold_hall` flag

**WebWorker (`solana/client/prover-worker.js`):**
- Off-main-thread Circom Groth16 proof generation
- Protocol: `prove` / `verify` / `ping` / `init` messages
- `03-zk-prove.js` updated: tries worker first, falls back to main thread
- Worker initialized lazily on first proof request

**AI Agent (`tools/ai-agent/duel-agent.js`):**
- System prompt updated with full v3.0-plus ability context
- Burn economy, evolve timing, steal strategy, imprint collection all documented
- Gold Hall specific guidance added

**AI Agent Tests (`tools/ai-agent/tests/`):**
- `test_basic_decisions.js` — 7 tests
- `test_burn_decisions.js` — 10 tests
- `test_evolve_decisions.js` — 10 tests
- `test_steal_decisions.js` — 15 tests
- `test_imprint_strategy.js` — 23 tests
- Total: 65 tests, all passing

**E2E Test (`tools/e2e-test/v3-plus-full-duel.sh`):**
- 2-wallet Gold Hall duel test
- Unit checks always run (CARD_V3, canBurnCard, steal types)
- Live wallet+server tests skip gracefully when not configured

---

## Test Summary

| Suite | Tests | Status |
|-------|-------|--------|
| v3-plus-abilities.test.js | 41 | ✅ All passing |
| test_basic_decisions.js | 7 | ✅ All passing |
| test_burn_decisions.js | 10 | ✅ All passing |
| test_evolve_decisions.js | 10 | ✅ All passing |
| test_steal_decisions.js | 15 | ✅ All passing |
| test_imprint_strategy.js | 23 | ✅ All passing |
| v3_plus_mechanics.rs | 35 | ✅ All passing (Phase 1) |
| **Total** | **141** | ✅ |

---

## Key Design Decisions

**Burn protection**: `canBurnCard()` mirrors on-chain logic — rar < 2 (Common/Uncommon only). Rare/Legendary cards are permanently protected.

**Lease-Steal default**: All steals are 3-duel Lease by default. Gold Hall + Legendary kill = permanent (75% probability).

**Imprint visual distinction**: Stat imprints use subtle fill + colored top border. Cosmetic imprints (SoulsCollected) use elaborate 4-sided gold frame.

**Worker fallback**: ZK proof generation tries WebWorker first; if worker init fails or times out (90s), falls back silently to main thread. Circuit artifacts still required.

**Evolve tab clan matching**: Same-clan Commons only. `_deEvolveResultId()` finds first Uncommon of matching clan.

---

## TBD (from GDD — not implemented this sprint)

- CardBattleHistory PDA live query wiring to Card Detail right panel (data shape defined, query not wired)
- Deck Editor: evolve cost reduction display
- Dungeon floor count + difficulty curve
- Prize Pool clearance logic
- NFT mint timing (purchase vs. drop)

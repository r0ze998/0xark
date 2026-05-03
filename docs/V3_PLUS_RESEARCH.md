# V3.0-plus Mechanics Research

**Branch**: `research-v3-plus-mechanics`  
**Date**: 2026-05-01  
**Author**: research-only pass, no code changes  
**Source sprint**: `v-phd-gdd-3.0-plus` (2026-04-23)

---

## Overview

v3.0-plus introduces five cross-session meta-mechanics on top of the base Phase 15 battle loop:
**Burn**, **Evolve**, **Steal / Lease**, **Imprint**, and **Ransom**.  
These are lifetime NFT mechanics — they persist between duels, recorded in on-chain PDAs.

---

## Mechanic Inventory

### 1. Burn

Permanently destroy a Common or Uncommon NFT card via SPL Token CPI.

| Field | Value |
|-------|-------|
| Anchor instruction | `burn_card` |
| Handler file | `solana/oxark/programs/oxark/src/instructions/burn_card.rs` |
| Protection | Legendary (rarity=3) always blocked; Rare (rarity=2) blocked in Season 1 |
| Lease check | Cannot burn a card with an unexpired active lease |
| Card history update | `burn_count += 1`, clears expired lease fields |
| Season stats update | `SeasonStats.total_burned += 1` |
| On-chain event | `CardBurnedEvent { card_mint, owner, rarity, timestamp }` |
| JS client (`canBurnCard`) | `rarity < 2` (Common/Uncommon only) |

**In-duel ability triggers** (client-side only):

| Card ID | Ability | Effect |
|---------|---------|--------|
| #1 | `self_burn_common_for_bp_boost` | Burn a Common from own hand → +3 BP this turn |
| #5 | `hand_burn_on_destroy` | On kill, burn top Common from opponent's hand |
| #16 | `burn_count_scaler` | +N BP where N = total burns across both players this duel |

---

### 2. Evolve

Fuse two Common parent NFTs into one Uncommon child NFT.

| Field | Value |
|-------|-------|
| Anchor instruction | `evolve_cards` |
| Handler file | `solana/oxark/programs/oxark/src/instructions/evolve_cards.rs` |
| Parent constraint | Both parents must be Common (rarity=0) |
| Target constraint | Child must be Uncommon (rarity=1); Season 1 restriction |
| SPL burn | Both parent ATAs burned via SPL Token CPI |
| Child provenance | `child.evolved_from_a`, `child.evolved_from_b` stored on PDA |
| Win inheritance | `child.wins = parent_a.wins + parent_b.wins` (cumulative) |
| Auto imprints | `ImprintKey::Evolved` (stat) + `ImprintKey::EvolvedHalo` (cosmetic) |
| Season stats update | `total_burned += 2`, `total_evolved += 1`, `total_minted += 1` |
| On-chain event | `CardEvolvedEvent { parent_a, parent_b, child_mint, target_species_id, cumulative_wins, timestamp }` |

**In-duel ability triggers** (client-side only):

| Card ID | Ability | Effect |
|---------|---------|--------|
| #7 | `evolve_cost_reduction` | `evolve_discount[owner] += 1` per trigger |
| #8 | `clan_evolve` | Sacrifice a same-clan Common → draw a random Uncommon of that clan |
| #35 | `clan_evolve_imprint` | `clan_evolve` + every 3rd trigger grants `Evolved` stat imprint |

---

### 3. Steal / Lease

Temporary or permanent ownership transfer of an opponent's card.

| Field | Value |
|-------|-------|
| Anchor instruction | `record_card_owner_change_with_steal` |
| Handler file | `solana/oxark/programs/oxark/src/instructions/record_card_owner_change.rs` |
| Lease duration | `LEASE_DURATION_SEC = 1800` (30 min, ≈3 duels) |
| Lease fields on PDA | `has_active_lease`, `lease_expires_at`, `lease_returns_to` |

**StealType variants** (`state.rs`):

| Variant | Semantics |
|---------|-----------|
| `Lease` | Temporary — auto-return after 1800s |
| `Ransom` | Win to keep, lose to return |
| `HandPeek` | Gold Hall only, permanent |
| `Legendary` | Gold Hall + Legendary kill, permanent |

**Steal probability rules** (client-side, ability card #46):
- Default: 50% Lease-steal on kill
- Gold Hall + Legendary target: 75% → permanent steal

**In-duel ability triggers** (client-side only):

| Card ID | Ability | Effect |
|---------|---------|--------|
| #25 | `ransom_steal` | Peek opponent hand, set 25% ransom target on card |
| #46 | `battle_steal_probability` | 50% Lease-steal on kill; 75% permanent if Gold Hall + Legendary |
| #55 | `hand_peek_steal` | Peek all opponent hand; Lease-steal top card (permanent in Gold Hall) |

---

### 4. Imprint

Permanent stat or cosmetic mark written to a card's `CardBattleHistory` PDA.

| Field | Value |
|-------|-------|
| Anchor instruction | `grant_imprint` |
| Handler file | `solana/oxark/programs/oxark/src/instructions/update_card_battle_history.rs` |
| Max imprints per card | 5 (`[Imprint; 5]`) |
| Imprint struct size | 22 bytes (`key:u8 + value:i32 + is_cosmetic:bool + acquired_at:i64 + duel_id:u64`) |
| Stat imprint cap by rarity | Common/Uncommon: 3; Rare: 4; Legendary: 5 |
| P2W stat delta cap | All stat imprints ≤ +2 BP |

**ImprintKey enum** (Borsh-serialized, order must not change):

| ID | Key | Type | Effect |
|----|-----|------|--------|
| 0 | `None` | — | Default/empty |
| 1 | `Veteran` | Stat | +1 BP permanent (at 10 cumulative wins) |
| 2 | `Elder` | Stat | +1 HP permanent (at 50 cumulative wins) |
| 3 | `Kingslayer` | Stat | +2 BP vs Legendary only |
| 4 | `Burner` | Stat | Burn energy cost −1 |
| 5 | `Evolved` | Stat | Dual On-Summon from parent lineage |
| 6 | `ElderFrame` | Cosmetic | Gold card frame |
| 7 | `KingslayerCrest` | Cosmetic | Crown icon on card |
| 8 | `LineageMark` | Cosmetic | Lineage icon (≥3 previous owners) |
| 9 | `EvolvedHalo` | Cosmetic | Ambient glow (Evolve origin) |
| 10 | `AshMark` | Cosmetic | Ash stripe (Burn ×10) |
| 11 | `PerfectRecord` | Cosmetic | Ripple effect (10-win streak) |

**In-duel ability triggers** (client-side only):

| Card ID | Ability | Effect |
|---------|---------|--------|
| #13 | `veteran_imprint_trigger` | At every 5th destruction → grant `Veteran` imprint |
| #23 | `imprint_self_scale` | +1 BP per owned stat imprint, capped at +3 |
| #27 | `on_destroy_imprint_souls` | Destroy opponent front card; increment `souls_collected` |

---

### 5. Ransom (sub-type of Steal)

Peek-and-mark mechanic — not a standalone on-chain instruction but part of the Steal system.

Card #25 (`ransom_steal`): peeks first visible opponent hand card, sets `ransom_target[owner_idx] = { card_id, chance: 0.25 }` in duel state.  
Resolution (25% chance on kill) happens in client-side combat resolution, then `record_card_owner_change_with_steal` with `StealType::Ransom` is called on-chain.

---

## Test File Breakdown — `tests/v3-plus-abilities.test.js` (41 tests)

| Suite | Tests | What it covers |
|-------|-------|----------------|
| CARD_V3 metadata | 7 | Dataset shape, Day 23 balance patch, ability key count |
| `canBurnCard()` | 4 | Rarity protection rules |
| #1 `self_burn_common_for_bp_boost` | 2 | Burns Common, +3 BP; no-op when no Commons |
| #5 `hand_burn_on_destroy` | 2 | Burns opponent's Common; no-op when empty |
| #7 `evolve_cost_reduction` | 2 | Discount increments and stacks |
| #8 `clan_evolve` | 2 | Sacrifices SB Common → draws SB Uncommon; no-op wrong clan |
| #13 `veteran_imprint_trigger` | 3 | Grants at ×5, no grant at ×4, triggers again at ×10 |
| #16 `burn_count_scaler` | 2 | +N BP scaling; no-op at 0 burns |
| #23 `imprint_self_scale` | 3 | +1 per stat imprint capped at 3; cosmetics excluded |
| #24 `owner_history_scaler` | 2 | Draws capped at 3; no draws when history empty |
| #25 `ransom_steal` | 2 | Peek + 25% ransom set; no-op empty hand |
| #27 `on_destroy_imprint_souls` | 2 | Destroys field card + increments souls; no-op empty field |
| #35 `clan_evolve_imprint` | 2 | Evolve + imprint at count=3; no imprint at count=2 |
| #46 `battle_steal_probability` | 3 | Lease at 50%; no steal above 50%; 75% permanent in Gold Hall |
| #55 `hand_peek_steal` | 3 | Lease steal + peek_all; permanent in Gold Hall; no-op empty hand |

---

## Rust Test Breakdown — `solana/oxark/tests/v3_plus_mechanics.rs` (35 tests)

| Range | What it covers |
|-------|----------------|
| T01–T04 | `SeasonStats` initialization, all 4 counters |
| T05–T08 | `CardBattleHistory` LEN=636, lease fields, evolve fields, saturating counters |
| T09–T12 | `ImprintKey` Borsh serialization, `Imprint` struct 22-byte size |
| T13–T16 | Burn protection: Legendary/Rare blocked, Common/Uncommon allowed |
| T17–T18 | Evolve rarity gating: both parents must be Common, target must be Uncommon |
| T19–T21 | Lease: `LEASE_DURATION_SEC=1800`, active/expired detection |
| T22–T23 | Imprint stat deltas ≤ 2 (P2W cap), rarity-based imprint limits |
| T24–T26 | Commit-phase SHA256 hash: deterministic, phase-bound, card-bound |
| T27–T29 | Element affinity multipliers: 1500 (1.5×) / 700 (0.7×) / 1000 (1.0×) |
| T30–T31 | Lease expiry edge cases: no lease never expires, zero expiry edge |
| T32–T33 | Owner ring buffer: capped at 10, drops oldest, `owners_dropped_count` |
| T34–T35 | `imprints.len() == 5`; all 4 `StealType` variants accessible |

---

## On-chain Integration Status

| Instruction | File | Status |
|-------------|------|--------|
| `burn_card` | `instructions/burn_card.rs` | ✅ Implemented |
| `evolve_cards` | `instructions/evolve_cards.rs` | ✅ Implemented |
| `record_card_owner_change_with_steal` | `instructions/record_card_owner_change.rs` | ✅ Implemented |
| `grant_imprint` | `instructions/update_card_battle_history.rs` | ✅ Implemented |
| `init_season_stats` | `instructions/init_season_stats.rs` | ✅ Implemented |

All 5 instructions are registered in `lib.rs` (48 total `pub fn` in the program).

---

## Client-side Integration Gap

| Component | Status | Notes |
|-----------|--------|-------|
| `02-data.js` (legacy client) | ⚠️ File not found | Referenced in test comments and multiple test runner scripts (`t53-dungeon-exp.js`, `t61-rarity.js`, `t74-town-integration.js`). The 13 ability handlers exist only as inline copies in `tests/v3-plus-abilities.test.js`. |
| `solana/client/src/lib/cards.js` (Phase 15) | ❌ Not integrated | Phase 15 card schema has no `ab` (ability) field, no `CARD_V3_ABILITY_HANDLERS`, no `canBurnCard()` |
| `solana/client/src/lib/damage-calc.js` | ❌ Not integrated | No v3 ability dispatch in Phase 15 damage calc |
| `tools/ai-agent/duel-agent.js` | ✅ Integrated | System prompt documents all 13 ability handlers, Gold Hall strategy |

---

## Alignment with game-design-v2.md

`docs/game-design-v2.md` (Phase 15 canonical spec) **does not mention** v3.0-plus mechanics.  
These mechanics were designed in a parallel sprint (`v-phd-gdd-3.0-plus`) as a post-Phase-15 feature layer.

The two systems are **architecturally compatible** — game-design-v2's 6-faction 60-card model uses the same rarity tiers (Common/Uncommon/Rare/Legendary) that v3 mechanics depend on, and the on-chain `CardBattleHistory` PDA schema supports both.

Key difference: game-design-v2 uses ids 1–60 (6 factions × 10 cards), while the v3.0-plus CARD_V3 dataset in `tests/v3-plus-abilities.test.js` uses ids 1–58 with a 5-clan (BF/SB/HB/IC/NS) structure. The two card datasets are **incompatible** — integration into Phase 15 requires a full card data migration.

---

## 5/11 Scope Recommendation

For the hackathon deadline, v3.0-plus mechanics are **out of scope for Phase 15 UI** given:
1. `02-data.js` (the card data file containing ability handlers) does not exist in the Phase 15 client
2. Phase 15 `cards.js` uses a different 60-card schema (game-design-v2) with no ability field
3. The on-chain instructions exist but the client-side duel state and damage-calc have no v3 dispatch
4. Integration requires a card data migration between two incompatible schemas

**What is safe to ship in the 5/11 build:**
- `burn_card` and `evolve_cards` Anchor instructions are ready — they can be wired to the Card Detail UI burn button and Deck Editor evolve tab **if** the Phase 15 client is updated with ability metadata
- `grant_imprint` is ready for post-battle calls once the duel server is live
- Steal/Lease on-chain PDAs are ready; the 30-min lease duration and return logic just needs the WebSocket multiplayer to trigger `record_card_owner_change_with_steal`

**Recommended post-5/11 integration order:**
1. Migrate `CARD_V3` ability field into `cards.js` as an optional `ability` field (null for most cards)
2. Implement `CARD_V3_ABILITY_HANDLERS` dispatch in `damage-calc.js`
3. Wire `burn_card` to Card Detail UI (already has the confirm flow per handoff doc)
4. Wire `evolve_cards` to Deck Editor EVOLVE tab
5. Wire `grant_imprint` to post-battle server hook

---

## Files Referenced

| Path | Role |
|------|------|
| `solana/oxark/programs/oxark/src/instructions/burn_card.rs` | Burn instruction handler |
| `solana/oxark/programs/oxark/src/instructions/evolve_cards.rs` | Evolve instruction handler |
| `solana/oxark/programs/oxark/src/instructions/record_card_owner_change.rs` | Steal/Lease recording |
| `solana/oxark/programs/oxark/src/instructions/update_card_battle_history.rs` | Imprint grant handler |
| `solana/oxark/programs/oxark/src/instructions/init_season_stats.rs` | Season stats init |
| `solana/oxark/programs/oxark/src/state.rs` (lines 730–794) | `ImprintKey`, `Imprint`, `StealType`, `LEASE_DURATION_SEC` |
| `solana/oxark/programs/oxark/src/error.rs` (lines 109–133) | v3.0-plus error codes |
| `solana/oxark/programs/oxark/src/lib.rs` (lines 570–646) | Instruction registrations |
| `solana/oxark/tests/v3_plus_mechanics.rs` | 35 Rust unit tests |
| `tests/v3-plus-abilities.test.js` | 41 JS unit tests + inline ability handler copies |
| `tools/ai-agent/duel-agent.js` (lines 80–114) | AI agent v3 strategy context |
| `docs/_scratch/gdd-v3.0-plus-implementation-handoff.md` | Sprint handoff document |
| `tools/e2e-test/v3-plus-full-duel.sh` | Gold Hall E2E duel test |

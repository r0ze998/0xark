# 0xARK — Game Design Document (v3.0, canonical)

> **An on-chain TCG on Solana: 14-day Seasons, 2-player ZK card duels, and a 60-card
> collection race settled by an on-chain prize ladder.**

**Status:** Canonical — kept consistent with the implementation on `main` and with
[`README.md`](../README.md). This document describes **what is built**. Features that
are not yet code-backed are marked **Planned**; instructions that record state without
transferring value are marked **Stub**.

**Supersedes:** the prior v2.0 narrative GDD (real-money faction duels, 20-card
phase-based decks, dungeon/identity ZK, winner-takes-2-cards, 40/20/10 split). Those
were aspirational and are **not** in the code; the legacy 3-player vision documents are
archived under `legacy/phase-c/` with ARCHIVED notices.

---

## 1. Vision

0xARK is a fully on-chain card game where a **14-day Season** drives a **60-card
collection race**. Players acquire cards, fight 2-player **ZK commit–reveal duels** for
them, and at Season end the prize pool is distributed **by collection rank**. The race —
not a ladder Elo — is the point: every card you hold is a real on-chain asset, and your
final standing determines your share of the pool.

The three Solana-native pillars:

- **ZK (Groth16/BN254)** hides each player's hand until reveal, so duels can't be
  front-run or copied.
- **x402 micropayments** price small intel/utility actions (server-side today).
- **AI agents** (Claude Haiku 4.5) can act as opponents/advisors (server-side today).

---

## 2. Core loop

```
Register Season (0.5 SOL)  →  5 starter cards
        │
        ▼
  ┌─────────────────────────────────────┐
  │  collect toward 60 unique cards      │
  │   • duel another player (ZK)         │  win → loot 1 card
  │   • buy a shop pack                  │
  │   • buy on the trade floor           │
  └───────────────┬─────────────────────┘
                  ▼
   Season end (14 days, or someone hits 60/60)
                  ▼
   admin crank: activate → finalize tally → end
                  ▼
   claim_prize_v2 — paid by rank from the prize-pool PDA
```

---

## 3. Season lifecycle

A `GameWorld` singleton (PDA `seeds=["game_world"]`) holds the Season. `game_status`
is a 3-state machine:

| Status | Meaning | Entered by |
|---|---|---|
| 0 | Waitlist open | `init_game_world(game_start_timestamp, ops_treasury)` |
| 1 | Active | `activate_season` (requires `now >= waitlist_close`) |
| 2 | Ended | `end_season_final` (requires the tally to be complete) |

- **`init_game_world`** — admin-only; sets timestamps (14-day window + 14-day season),
  derives the **prize-pool PDA** (`seeds=["prize_pool"]`) and stores its bump. The pool
  takes **no external address** — it is program-derived.
- **`register_waitlist`** — deposits **0.5 SOL** (85% → prize-pool PDA, 15% → ops
  treasury), creates the player's `PlayerState`, and grants **5 starter cards**. The
  prize-pool PDA is created lazily on the first deposit.
- **`finalize_season_tally`** — admin crank. Walks the participants' `PlayerState`
  accounts (passed as `remaining_accounts`) and accumulates the band totals
  (`winner_60_count`, `tier2..5_total_vault`, `max_vault`, `max_vault_count`). A
  monotonic `finalize_cursor` lets it run across **multiple transactions** for large
  participant counts, counting each player once.
- **`end_season_final`** — admin-only; flips status 1→2 once every participant is
  tallied (and, on timeout, removes the max-vault champions from their natural band so
  they're paid once at T1).

---

## 4. Duel design

A duel is a **2-player** match recorded in a `DuelState` PDA
(`seeds=["duel", duel_id]`), created by `init_duel(duel_id, hall_tier, ante)`.

The per-round flow (ZK commit–reveal):

1. **`commit_hand(duel_id, round, proof_a/b/c, public_signals)`** — each player submits
   a Groth16 proof of their hand commitment, **bound to their own pubkey**. Verified
   on-chain (alt_bn128 pairing). Double-commit per round is rejected.
2. **`reveal_hand(duel_id, round, card_ids[10], salt)`** — the program **recomputes the
   Poseidon commitment on-chain** from the revealed cards and rejects a mismatch
   (`CommitmentMismatch`). A `reveal` requires the matching `commit_hand` to have passed
   (ZK gate).
3. At **round 5**, once both players have revealed, **`damage_calc`** compares battle
   power (deterministic seed = `SHA-256(p1_salt || p2_salt || round)`) and sets
   `DuelState.winner`. The winner loots **1** card via `claim_battle_loot`
   (SlotHashes randomness).

**Loot is 1 card, not 2.** There are 5 fixed rounds. There are no lanes, energy phases,
20-card decks, or Heart HP — those were v2.0 aspirations and are not implemented.

> **Known gap:** `init_duel` sets `round = 1` and no instruction advances
> `DuelState.round`, so on-chain only round 1 is currently playable and the round-5
> resolution is unreachable. The ZK commit/reveal primitives are fully verified for a
> round (see §7). Wiring a round-advance step is required to play a full 5-round duel.

---

## 5. Cards

- **60 unique cards** across 6 clans (Knight / Merchant / Pirate / Scholar / Monk /
  Engineer) with a Common→Legendary rarity scale. Clans are **collection/flavor
  groupings**; there is no element-affinity combat system on-chain.
- **In-Season ownership** is a 60-bit `vault_bitmap` on each `PlayerState`. "Collecting"
  a card means owning ≥1 of that species; the race target is 60/60.
- **SPL NFTs** are minted by the separate **`oxark-cards`** program
  (`mint_card_nft`, `mint_solo_card`) and are a parallel representation — not minted by
  the main program.
- **Acquisition**: starter (register), shop pack (`buy_pack`), duel loot
  (`claim_battle_loot`), trade-floor purchase (`accept_listing`).
- **Mechanics**: `burn_card` (Common/Uncommon only; rarity read on-chain from a
  `CardMintRecord` PDA), `evolve_cards` (burns 2 parents), `grant_imprint` (victory mark
  on Legendaries; rarity also read from `CardMintRecord`).

---

## 6. Economy & prize distribution

### Revenue (4 sources)

1. Waitlist entry — **15%** of each 0.5 SOL → ops treasury (85% → prize pool).
2. Shop packs — **50%** of pack price → ops treasury (50% → prize pool).
3. x402 micropayments — **50/50** ops/pool (off-chain verified by the server).
4. Metaplex royalty — **5%**, advisory (not protocol-enforced).

Trade floor `accept_listing` charges **0%** — buyer pays seller directly.

### Prize ladder (implemented in `claim_prize_v2`)

| Band | Cards | Base share |
|---|---|---|
| T1 | 60 (full set) | 50% |
| T2 | 50–59 | 25% |
| T3 | 30–49 | 15% |
| T4 | 10–29 | 8% |
| T5 | 1–9 | 2% |

- **Normal end**: T1 = the 60-card holders, split equally; bands T2–T5 split their share
  in proportion to vault size.
- **Timeout end** (no 60): the **max-vault** holders take T1, split by their count.
- **Empty-band carry-over**: an empty band's share carries down to the next populated
  band (chaining); a share with no band below stays in the pool. Guarantees
  **Σ(payouts) ≤ pool** and no division by an empty band.
- The pool is a **PDA vault**; `claim_prize_v2` pays each player from it via
  `invoke_signed` (player-only signature). A second claim is rejected
  (`deposit_amount` zeroed after claim) and each payout is capped at the vault balance
  (kept above the rent-exempt floor) — no over-draw.

This replaces the v2.0 "winner 40% / #2 20% / #3 10%" scheme, which was never
implemented.

---

## 7. ZK mechanics

The live duel uses the **hand_commitment** circuit (Groth16/BN254):

| Step | What it proves / does | Cost (measured) |
|---|---|---|
| `commit_hand` | Groth16 proof: hand commitment well-formed + bound to signer pubkey; verified on-chain via alt_bn128 pairing | ~135k CU |
| `reveal_hand` | On-chain Poseidon recompute (`sol_poseidon`) of the revealed hand must equal the commitment | ~43k CU |

The circuit packs the 10 card slots and hashes **Poseidon(6)** (t=7), specifically so the
on-chain recompute is syscall-cheap; the earlier Poseidon(15) design exceeded the
1.4M CU/tx limit (documented in `circuits/hand_commitment/hand_commitment.circom`).
Both figures were measured on a local validator.

A separate `verify_zk_proof` instruction (the `commit_reveal` circuit, 277 constraints,
~94k CU, LiteSVM-verified) belongs to the legacy engine and is not on the duel path.

> The v2.0 "Identity Commitment / Dark-Forest `PlayerIdentity` PDA" is **not
> implemented** — there is no `PlayerIdentity` or `Faction` PDA in the program.

---

## 8. x402 microeconomy (server-side today)

The `multiplayer` server implements x402 (HTTP 402) endpoints for intel/utility actions
(e.g. peek, draw-extra, AI advice), with Redis replay protection and a 50/50 ops/pool
split on verified payments. The client x402 module exists but is **not loaded** in the
current battle UI, so these are not yet exercised end-to-end from the game. Pricing and
endpoint specifics live in `docs/X402_DESIGN.md` / `docs/X402_INTEGRATION_LOG.md`.

---

## 9. AI agents (server-side today)

Server endpoints back two Claude Haiku 4.5 features — a strategy advisor and an
autonomous move generator. They are implemented server-side but not wired into the
active battle screens. The Phase-2 vision (agents holding wallets, signing their own
txs, building collections) is **Planned**.

---

## 10. MagicBlock Ephemeral Rollups

`delegate_session` / `undelegate_session` use the real ephemeral-rollups SDK CPI, and
the client has Magic Router wiring with a base-layer fallback. However, delegation
targets the **legacy 3-player Game** state, not the active duel path — so ER is wired at
the instruction level but not on the live duel hot-path. Treat ER as **integrated but
not exercised by the current duel client**.

---

## 11. Tech stack & program surface

- **Program**: Anchor (`anchor-lang 1.0.0`), Solana devnet. **63 instructions**
  (`lib.rs` `#[program]` ≡ `solana/client/oxark-idl.json`).
- **Card program**: `oxark-cards` (SPL token + Metaplex CPI), separate program ID.
- **ZK**: Circom + snarkjs (Groth16/BN254); on-chain verify via `alt_bn128` syscalls;
  Poseidon via `sol_poseidon` syscall.
- **Client**: Vanilla JS + PixiJS, GBA palette; Phantom wallet.
- **Server**: Node.js + WebSocket relay + x402 (Fly.io); Redis.
- **Program IDs**: main `5i37jWBiA7bV9XmokyDWHQxjJ5s1sBnSEkPSB4J2XfmN`,
  cards `236FNPRbJr5W7qeV9fJCYsxDEkruSK6fnNAipf47Mq1S` (devnet).

Build with `cd solana/oxark && make build`; test with `make test` (181 passing, 1
ignored). The program is built with `default = ["custom-heap"]`, so **every** transaction
must lead with `ComputeBudget::RequestHeapFrame(262144)` — the client does this in its
shared send path.

---

## 12. Removed from canon (was in v2.0, not in code)

These appeared in the v2.0 GDD but are **not implemented** and are intentionally dropped
from the canonical design:

- 3-player roguelike, dungeon map, fog-of-war, NPC rivals (VEGA / MIRA) — legacy vision;
  survives only as unused code / un-loaded client modules.
- 20-card phase-based decks, 4-phase rounds, lanes, energy/element affinity, Heart HP.
- Faction-as-gameplay clans, `Faction` PDA, `PlayerIdentity` ZK identity-hiding.
- Winner takes **2** cards (code loots **1**); 40/20/10 prize split (code uses the rank
  ladder above with carry-over).
- Lore Shards / per-card battle-history *gameplay* beyond the `update_card_battle_history`
  /`unlock_lore_shard` recording instructions.

---

## 13. Known gaps & roadmap

- **Duel rounds 2–5** need a round-advance instruction (only round 1 is reachable today).
- **x402 / AI** client wiring (server endpoints already exist).
- **Stubs**: `claim_legendary`, `distribute_prize_pool` (no value transfer; live payout
  is `claim_prize_v2`).
- **Devnet redeploy** is gated on SBPFv3 deployment activating on devnet
  (SIMD-0178/0179/0189); on-chain e2e currently runs on a local validator.

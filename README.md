# 0xARK

**An on-chain TCG on Solana** — 14-day Seasons, 2-player ZK card duels, and a 60-card collection race settled by an on-chain prize ladder.

**🔗 [Live Demo → r0ze998.github.io/0xark](https://r0ze998.github.io/0xark/)**

[![Live Demo](https://img.shields.io/badge/Live%20Demo-r0ze998.github.io%2F0xark-d8b034)](https://r0ze998.github.io/0xark/)
[![Devnet](https://img.shields.io/badge/Solana-Devnet-9370db)](https://explorer.solana.com/?cluster=devnet)
[![License](https://img.shields.io/badge/License-MIT-blue)](LICENSE)

> This README is the canonical description of what is **actually implemented** in the
> Anchor program (`solana/oxark/programs/oxark`), the card program (`oxark-cards`),
> the client (`solana/client`), and the server (`multiplayer`). Anything not
> code-confirmed is marked **Planned** or **Stub**. The design document
> ([`docs/GDD.md`](docs/GDD.md)) is kept consistent with this README.

---

## 🎮 What 0xARK is

A **14-day Season** is the unit of play:

1. **Register** for the Season with a 0.5 SOL deposit. You receive 5 starter cards.
2. **Duel** other players in 2-player matches. Each duel is a **ZK commit–reveal**:
   both hands stay hidden behind a Groth16 commitment until the reveal, then an
   on-chain `damage_calc` decides the winner over 5 rounds. The winner loots **1**
   card from the loser.
3. **Collect** toward the full **60-card** set, also via shop packs and the player
   trade floor.
4. **Settle**: at Season end the prize pool is distributed **by rank** (how many
   unique cards you hold), not first-come — see [Prize distribution](#-prize-distribution).

There is no dungeon, no fog-of-war, no NPC overworld, and no 3-player free-for-all.
(An older 3-player engine exists in the program as unused legacy code; it is not part
of the shipped game — see [Legacy code](#-legacy-code).)

---

## 📋 Implementation status

Honest snapshot of the current `main`. ✅ = implemented & on-chain, ⚠️ = partial,
🧩 = stub (records state, no value transfer), 🔭 = planned.

| Area | Status | Notes |
|---|---|---|
| Season lifecycle | ✅ | `init_game_world` → `register_waitlist` → `activate_season` → `finalize_season_tally` → `end_season_final` |
| Prize settlement (rank + carry-over) | ✅ | `claim_prize_v2` pays out from a **PDA vault** via `invoke_signed`; e2e-verified on a local validator |
| 2-player ZK duel | ✅ (round 1) | `init_duel` → `commit_hand` (Groth16) → `reveal_hand` (Poseidon syscall) → `damage_calc`. Round advancement for rounds 2–5 is **not yet wired** (see [Known gaps](#-known-gaps)) |
| Battle loot (steal 1 card) | ✅ | `claim_battle_loot`, SlotHashes randomness |
| Shop packs | ✅ | `buy_pack` (50% ops / 50% pool); drop rates admin-tunable |
| Trade floor (P2P) | ✅ | `create_listing` / `accept_listing` / `cancel_listing`, **0% platform fee** |
| Burn / Evolve / Imprint | ✅ | `burn_card`, `evolve_cards`, `grant_imprint` (rarity read on-chain from `CardMintRecord`) |
| SPL card NFTs | ✅ | In the **separate `oxark-cards` program** (`mint_card_nft` / `mint_solo_card`), not the main program |
| x402 micropayments — server | ⚠️ | Server endpoints implemented (Redis replay protection); client module is not loaded in the current battle UI |
| AI strategy / move (x402) | ⚠️ | Server endpoints implemented (Claude Haiku 4.5); not wired into active battle screens |
| MagicBlock Ephemeral Rollups | ⚠️ | Real `delegate_session` / `undelegate_session` CPI (ephemeral-rollups SDK) + client Magic Router with base-layer fallback — but wired to the legacy Game engine, **not the active duel path** |
| Legendary NFT claim / season distribute | 🧩 | `claim_legendary`, `distribute_prize_pool` emit events, no transfer (the live payout path is `claim_prize_v2`) |
| `oxark-cards` P2P `buy_card` | 🧩 | Records the sale; SOL/token move handled off-chain (x402) |

---

## 💰 Economy

### Entry & revenue

- **Entry**: `register_waitlist` deposits **0.5 SOL**, split **85% → prize pool / 15% → ops treasury** (`GameWorld::PRIZE_POOL_BPS = 8500`, `OPS_REVENUE_BPS = 1500`).
- **Four revenue sources**:
  1. Waitlist entry — **15%** of each 0.5 SOL deposit → ops treasury
  2. Shop packs (`buy_pack`) — **50%** of pack price → ops treasury (50% → prize pool)
  3. x402 micropayments (`multiplayer/server.js`) — **50/50** ops/pool, off-chain verified
  4. Metaplex royalty — **5%**, advisory (not protocol-enforced)
- **Trade floor** (`accept_listing`): **0% platform fee** — buyer pays seller directly.

### Prize distribution

The prize pool is a **program-derived vault** (`seeds = ["prize_pool"]`), created lazily
on the first deposit. At Season end, `claim_prize_v2` pays each player **by rank**
(unique cards held), pulling from the vault via `invoke_signed` — so a player needs
only their own signature to withdraw.

| Band | Cards | Base share |
|---|---|---|
| T1 | 60 (full set) | 50% |
| T2 | 50–59 | 25% |
| T3 | 30–49 | 15% |
| T4 | 10–29 | 8% |
| T5 | 1–9 | 2% |

- **Normal end** (someone reached 60): T1 = the 60-card holders, split among them.
- **Timeout end** (no one reached 60): the **max-vault** holders take T1, split among them.
- **Empty-band carry-over**: if a band has no members, its share carries down to the
  next populated band; a share with no band below it stays in the pool. This keeps
  **Σ(payouts) ≤ pool** and avoids division by an empty band.
- **Safety**: a double-claim is rejected (`deposit_amount` is zeroed after claim), and
  every payout is capped at the vault balance (kept above the rent-exempt floor) — no
  over-draw, no rug.

Settlement is driven by an admin crank: `activate_season` (status 0→1) →
`finalize_season_tally` (aggregates each `PlayerState`'s vault into the band totals,
in cursor-batched transactions for large participant counts) → `end_season_final`
(status 1→2). This full path is **e2e-verified on a local validator**: a registered
player received their exact rank share from the vault, and a second claim was rejected.

---

## 🔬 ZK system

The live duel uses a **hand-commitment** ZK flow (Groth16 over BN254):

- **`commit_hand`** — the player submits a Groth16 proof that their committed hand is
  well-formed and **bound to their own pubkey** (prevents replaying an opponent's
  proof). The program verifies it on-chain via the `alt_bn128` pairing syscalls.
  Measured **~135k CU**.
- **`reveal_hand`** — the program **recomputes the Poseidon commitment on-chain** from
  the revealed cards (via the `sol_poseidon` syscall) and checks it matches. The
  circuit packs the cards and hashes **Poseidon(6)** so the on-chain recompute is cheap:
  measured **~43k CU** (the earlier Poseidon(15) design exceeded the 1.4M CU/tx limit;
  `circuits/hand_commitment/hand_commitment.circom` documents the v2→v3 change).

Both figures were measured on a local validator and are far under the 1.4M CU/tx cap.
A separate `verify_zk_proof` instruction (the `commit_reveal` circuit, 277 constraints,
~94k CU, LiteSVM-verified) exists for the legacy engine.

Because the duel program is built with `default = ["custom-heap"]`, **every** transaction
to it must lead with a `ComputeBudget::RequestHeapFrame(262144)` instruction; the client
adds this automatically in its shared send path.

---

## 🃏 Cards

- **60 unique cards** across 6 clans. In-Season ownership is tracked as a 60-bit
  `vault_bitmap` on each `PlayerState`; SPL NFTs are minted in the separate
  `oxark-cards` program and are a parallel representation.
- **Acquisition**: starter cards (register), shop packs (`buy_pack`), duel loot
  (`claim_battle_loot`, 1 card), trade floor purchase.
- **Mechanics**: `burn_card` (Common/Uncommon only — rarity read on-chain from
  `CardMintRecord`), `evolve_cards` (burn 2 parents), `grant_imprint` (victory mark on
  Legendaries).

---

## 🏗 Architecture

```
Frontend (GitHub Pages)            Multiplayer server (Fly.io)
  Phantom · vault grid · battle      WebSocket relay · x402 endpoints · Redis
  screens · onchain.js                       │
        │                                     │
        └──────────────────┬──────────────────┘
                           ▼
        Anchor program  5i37jW…XfmN  (Solana devnet)   ── 63 instructions
          Season:  init_game_world · register_waitlist · activate_season
                   finalize_season_tally · end_season_final · claim_prize_v2
          Duel:    init_duel · commit_hand · reveal_hand · claim_battle_loot
          Cards:   burn_card · evolve_cards · grant_imprint · check_legendary_v2
          Shop:    buy_pack · update_game_params · create/accept/cancel_listing
          ZK:      verify_zk_proof (alt_bn128 pairing)
                           │  (CPI)
                           ▼
        oxark-cards  236FNP…Mq1S   — SPL mint_card_nft / mint_solo_card / card_market
```

- **Main program**: `5i37jWBiA7bV9XmokyDWHQxjJ5s1sBnSEkPSB4J2XfmN` (devnet)
- **Card program**: `236FNPRbJr5W7qeV9fJCYsxDEkruSK6fnNAipf47Mq1S` (devnet)
- **Instruction count**: **63** (`lib.rs` `#[program]` and `oxark-idl.json` agree)
- **Upgrade authority**: held during devnet development; to be renounced on mainnet.

---

## ⚠️ Known gaps

- **Duel rounds 2–5**: `DuelState.round` is set to 1 by `init_duel` and **no instruction
  advances it**, so only round 1 is currently playable on-chain and the round-5 winner
  resolution is unreachable. The ZK commit/reveal primitives themselves are fully
  verified for a round.
- **x402 / AI client wiring**: the server endpoints exist; the client modules are not
  loaded into the active battle UI.
- **Stubs**: `claim_legendary` and `distribute_prize_pool` record state but transfer no
  value; the live payout path is `claim_prize_v2`.

---

## 🗂 Legacy code

The program still contains an earlier **3-player "Game" engine**
(`create_game` / `join_game` / `commit_action` / `reveal_action` / `resolve_round`,
plus `init_position`, `deposit_stake`, `claim_prize`, `commit_card`/`reveal_card`).
The client never calls it; it is a fossil of the pre-Phase-15 design and is **not part
of the shipped game**. MagicBlock delegation (`delegate_session`) targets this engine.

---

## 🧪 Build & test

```bash
git clone https://github.com/r0ze998/0xark.git && cd 0xark

# Anchor program (build order matters: anchor build → cargo test)
cd solana/oxark
make build           # anchor build (emits target/deploy/oxark.so + IDL)
make test            # anchor build → cargo test   (181 passing / 1 ignored)

# Client
cd ../client && npx serve . -l 4200   # open http://localhost:4200
```

- **Tests**: `make test` runs the LiteSVM suite against a freshly built `.so`
  (`make test-fast` skips the rebuild — only safe when no program source changed).
- **Deploy note**: the toolchain emits **SBPFv3** bytecode; devnet has SBPFv3
  deployment disabled (SIMD-0178/0179/0189 inactive), so on-chain e2e is run on a
  local validator (which enables all SBPF versions). Devnet redeploy is gated on that
  feature activation.

---

## 👤 About

Built by **r0ze** (Yukikaze). Originally submitted to **Colosseum Frontier 2026**
(Gaming + AI). Devnet program ID `5i37jWBiA7bV9XmokyDWHQxjJ5s1sBnSEkPSB4J2XfmN`.

## 📝 License

MIT — see [LICENSE](LICENSE).

[▶ Play now](https://r0ze998.github.io/0xark/)

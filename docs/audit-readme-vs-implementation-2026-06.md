# 0xARK — README vs Implementation Audit (2026-06-19)

Read-only investigation of the on-chain program (`solana/oxark/programs/oxark/src/`,
`oxark-cards/`), client (`solana/client/`), server (`multiplayer/`), and docs.
**Facts** are code-confirmed with file:line. **INFERENCE** marks anything reasoned.

> Note: the request referenced `contracts/src/` — that path does not exist; the
> program is at `solana/oxark/programs/oxark/src/`.

## TL;DR

- The **shipped** model (README + on-chain code) is a **multiplayer, 14-day Season:
  2-player ZK duels that feed a 60-card collection race with a TIER-based prize
  split** — *not* a "3-player roguelike, winner-takes-all".
- The "3-player roguelike / dungeon / fog-of-war / VEGA & MIRA" concept is the
  **legacy GDD-v0.3 vision**. It survives only as **dead code** (a 3-player `Game`
  engine that the client never calls, an unused `init_position` ZK instruction, and
  an un-loaded client renderer `src/01-net.js`). It is not in the README.
- README is **largely accurate** to the current code; the real gaps are a stale
  instruction count, "SPL mint" living in a separate program, a MagicBlock status
  contradiction, and a prize-distribution edge-case bug.

---

## 1. Game model / genre

| Topic | README says | Implementation reality (code) | Diff |
|---|---|---|---|
| Genre | "On-chain TCG card battle … ZK + x402 + AI" (README L3); 14-day Season, 60 cards (L174) | **Two engines coexist.** LIVE: 2-player **Duel** (`init_duel`→`commit_hand`[Groth16]→`reveal_hand`[Poseidon]→`damage_calc`, exactly 5 rounds). DEAD (client never calls): 3-player **Game** (`create_game`/`join_game`/`commit_action`/`reveal_action`/`resolve_round`). | README ≈ live duel/season model. The 3-player engine the older docs imply is present but unused. |
| Roguelike / dungeon / fog-of-war | **Not mentioned** | Only in legacy `legacy/phase-c/GDD-v0.3.md`. On-chain `init_position` (ZK position commit) exists but is **never called**. Client dungeon/fog/`inDungeon` logic lives in `src/01-net.js` which is **not `<script>`-loaded** by `index.html`. | Roguelike/dungeon = abandoned legacy vision, dead code both layers. Matches README (absent) but contradicts project lore/older GDDs. |
| NPC rivals (VEGA, MIRA) | Not mentioned | **No on-chain logic.** Cosmetic color labels only, in the dead `src/01-net.js`. CLAUDE.md confirms sprite placeholders. | Not implemented; client-only cosmetic remnant. |
| Win condition | Tier prize by collection size (L182) | Season: collect all 60 card species (`PlayerState.vault_bitmap`) → top tier via `claim_prize_v2`. Per-duel: `damage_calc` BP comparison after round 5 → winner loots 1 card (`claim_battle_loot`). Legacy Game: hold all 5 card *types* in hand (`resolve_round.rs finish_round`, `TOTAL_CARD_TYPES=5`). | README matches the season-collection model. Legacy "5 types" win is dead. |

**INFERENCE:** the 3-player `Game`/`resolve_round`/`STEAL`/`Barrier`/`Area{Port,Forest,Ruins}`
engine and `init_position` are fossils of the GDD-v0.2/v0.3 design, superseded by the
Phase-15 duel+season model for the 2026-05-11 submission (per CLAUDE.md).

## 2. Economy / revenue

> **【2026-06-28 追記】** 本 §2 の過剰請求バグは commit `1260339` 世代のコードに対する指摘。
> 現行 main では `f8470a0`（pay-by-rank tier ロジック刷新）および YKK-38（#27, PDA vault +
> 残高ガード強化）で構造的に解消済み。現行 `compute_tier_prize` は timeout 時 T1 を
> `vault_count == max_vault` に厳格化、divisor=`max_vault_count`、`effective_band_shares` で
> Σ(payouts) ≤ pool を保証、`end_season_final` で champion を比例バンドから差し引き。
> → **対応不要。**

| Topic | README says | Implementation reality | Diff |
|---|---|---|---|
| Entry fee | "Register Waitlist (0.5 SOL deposit)" (L38) | `register_waitlist.rs`: 0.5 SOL split **85% → `prize_pool`, 15% → `ops_treasury`** (`state.rs` DEPOSIT/BPS consts). Both are admin-set external wallets, set at `init_game_world`. | Matches. README omits the 85/15 split detail. |
| Legacy per-game stake | (not in README) | `stake_entry.rs`: 0.5 SOL hardcoded into a `StakeVault` PDA; `claim_prize` pays **100% to winner, no operator cut**. | Dead/legacy alongside the waitlist model. |
| Prize distribution | Tier table T1 60→**50%**, T2 50-59→25%, T3 30-49→15%, T4 10-29→8%, T5 1-9→2% (L182-188) | `claim_prize_v2.rs compute_tier_prize` implements **exactly these tiers**. NOT pure winner-take-all (T1=60 cards gets 50%, split among all T1 holders). | Matches. **BUG (INFERENCE):** in timeout mode (`winner_60_count==0`) every player with ≥1 card is treated as T1 and computes `pool*50%/1`, so multiple claimers can over-draw (capped only by `prize.min(vault.lamports)`). |
| Champion/season-end payout | implied | `season.rs end_season` and `legendary.rs distribute_prize_pool` are **stubs — emit events, no SOL transfer**. Active payout path is `claim_prize_v2` (pull-based). | The `distribute_prize_pool`/`Season` payout described in GDD v2.0 is not wired. |
| NFT acquisition | Shop packs, Steal, Trade Floor, burn/evolve (L192-229) | See table §3. Most card ownership is `vault_bitmap` bits; real SPL mints are in the **separate `oxark-cards` program**. | README's "SPL mint CPI" is cross-program, not in this program's surface. |
| Operator revenue | not detailed | **(1)** waitlist 15% → ops_treasury; **(2)** `buy_pack` 50% of pack price → ops_treasury (50% → prize_pool); **(3)** x402 `server.js` 50/50 ops/pool (off-chain verified); **(4)** Metaplex 5% royalty (`onchain.js`, advisory, not enforced). `accept_listing` = **0% fee** (README L218 agrees). | Matches README's "0% Trade Floor"; README doesn't enumerate the ops cuts. |

## 3. NFT acquisition paths (code reality)

| Path | Instruction | Status |
|---|---|---|
| Waitlist starter cards | `register_waitlist` | Implemented (vault_bitmap; no SPL mint) |
| Gacha pack | `buy_pack` | Implemented (vault_bitmap; no SPL mint) |
| P2P market (oxark) | `create/accept/cancel_listing` | Implemented; SOL buyer→seller, 0% fee |
| P2P market (oxark-cards) | `card_market.rs buy_card` | **Partial stub** — records sale, no on-chain SOL/token move (x402 off-chain) |
| Battle steal | `claim_battle_loot`, `record_card_owner_change[_with_steal]` | Implemented (vault_bitmap + history; no SPL transfer) |
| Game-win SPL mint | `oxark-cards::mint_card_nft` | **Implemented** (full SPL `mint_to` + authority→None) |
| Solo collectible mint | `oxark-cards::mint_solo_card` | Implemented (SPL `mint_to`) |
| Evolve 2→1 | `evolve_cards` | Implemented (burns 2 parent SPL tokens; child minted externally) |
| Legendary earn | `check_legendary` | Implemented (vault_bitmap) |
| Legendary NFT claim | `legendary.rs claim_legendary` | **Partial stub** — records claim, no NFT mint |

**INFERENCE:** `vault_bitmap` (per-PlayerState 60-bit flags) is the primary in-season
ownership ledger; SPL NFTs are a parallel, not-auto-synced representation.

## 4. Player count / scale

| Layer | Cap | Source |
|---|---|---|
| Players per legacy `Game` | **3** (hard) | `MAX_PLAYERS=3`, `players:[Pubkey;3]`, `create_game` require 1..=3 |
| Live `Duel` | **exactly 2** | `DuelState.player_1/player_2` |
| Matchmaking queue | **64 / tier / season**, pairs at 2 | `MatchmakingQueue::MAX_PLAYERS=64`, `enter_queue.rs` |
| Season participants | **unbounded (u32)** | `GameWorld.total_participants`, no cap in `register_waitlist` |
| Server rooms / queue | **unbounded**, pure relay, no authority | `multiplayer/server.js`, `handlers/lobby.js`, `matchmaking.js` |

**Verdict:** hybrid — small fixed rooms (3-player legacy `Game` / 2-player live `Duel`)
feeding an **unbounded 14-day season standings** layer. Not a fixed-3-player game;
not a single N-player room.

## 5. Which doc is the latest vision?

| Doc | Date / location | Model |
|---|---|---|
| `legacy/phase-c/GDD-v0.2.md` | 2026-04-08, legacy | 3-player grab, 5 card types, no map |
| `legacy/phase-c/GDD-v0.3.md` | 2026-04-08, legacy | + dungeon map + fog-of-war (3 players) |
| `docs/GDD.md` | 2026-04-22 "final" | 2-player real-money duels, 60-card season, **winner takes 2 cards / 40-20-10** |
| `docs/_scratch/gdd-v3.0-plus-...handoff.md` | 2026-04-23 | implementation changelog (burn/evolve/steal/imprint) |
| `README.md` | 2026-05-11 | 14-day season, 60 cards, **tier prize**, waitlist 0.5 SOL |

**Latest shipped vision = README + code (Phase 15/20).** `docs/GDD.md` is the latest
*narrative* doc but is **partly stale**: its "winner takes 2 cards" + 40/20/10 split,
`PlayerIdentity` ZK, and `Faction` PDA are **not** in the code (code does tier prizes,
steals **1** card, has no Faction/PlayerIdentity struct). GDD-v0.2/v0.3 are archived.

## 6. README factual inaccuracies (README vs code)

1. **Instruction count:** README L159 says "59 instructions"; code/IDL = **52** (CLAUDE.md authoritative). Overstated.
2. **"SPL mint CPI":** README implies this program mints SPL; actual SPL `mint_to` is in the **separate `oxark-cards` program**, not the main program surface.
3. **MagicBlock ER:** README L26 = "🚧 Not yet integrated"; CLAUDE.md = "production-wired". `delegate_session`/`undelegate_session` instructions exist. README and CLAUDE.md contradict each other.
4. **Described-but-absent (from GDD v2.0, not README):** `PlayerIdentity` ZK identity-hiding, `Faction`/`Clan` PDA — no structs on-chain.

---

*Generated from 4 parallel code explorations; see commit history / file:line citations above.*

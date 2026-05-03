# 0xARK — Devnet Program Information

**Generated**: 2026-04-27  
**Network**: Solana Devnet (`https://api.devnet.solana.com`)

---

## Program: oxark (main game logic)

| Field | Value |
|---|---|
| Program ID | `5i37jWBiA7bV9XmokyDWHQxjJ5s1sBnSEkPSB4J2XfmN` |
| Owner | `BPFLoaderUpgradeab1e11111111111111111111111` |
| ProgramData Address | `H4MatDJwdeXi4zV9s8CLuSYMW5ycEn6HTdymwuPB7R3m` |
| Upgrade Authority | `DPMPhnVezSq5im35p4w3bC6XjpNZuuvCDVSAVxw4Q28R` |
| Last Deployed Slot | `457029341` |
| Data Size | `644952 bytes (629 KB)` |
| Program Balance | `4.49007 SOL` |

**Solana Explorer**: https://explorer.solana.com/address/5i37jWBiA7bV9XmokyDWHQxjJ5s1sBnSEkPSB4J2XfmN?cluster=devnet

---

## Program: oxark-cards (NFT mint / marketplace)

| Field | Value |
|---|---|
| Program ID | `236FNPRbJr5W7qeV9fJCYsxDEkruSK6fnNAipf47Mq1S` |
| Minter Wallet | `DPMPhnVezSq5im35p4w3bC6XjpNZuuvCDVSAVxw4Q28R` |

---

## oxark Instructions (31 in IDL, +1 in Rust source)

From `solana/oxark/target/idl/oxark.json`:

| Instruction | Args | Description |
|---|---|---|
| `initialize` | 0 | One-time program init (idempotent) |
| `create_season` | 4 | Initialize a new season with prize pool config |
| `create_game` | 2 | Create a new duel game PDA |
| `join_game` | 1 | Second player joins an open game |
| `start_game` | 1 | Lock-in both players, begin the duel |
| `lock_deck` | 0 | Commit deck to on-chain state |
| `save_deck` | 1 | Persist deck configuration |
| `commit_card` | 2 | ZK commit: Poseidon hash of card choice |
| `reveal_card` | 3 | ZK reveal with Groth16 proof |
| `commit_action` | 2 | Commit action (Burn/Evolve/Steal/Imprint) |
| `reveal_action` | 4 | Reveal action with proof |
| `resolve_round` | 1 | Settle round battle result on-chain |
| `record_battle_result` | 1 | Write battle outcome to CardBattleHistory PDA |
| `deposit_stake` | 1 | Player deposits SOL ante into StakeVault |
| `claim_prize` | 1 | Winner withdraws prize pool |
| `verify_zk_proof` | 5 | On-chain Groth16 BN254 verification (alt_bn128) |
| `init_season_supply` | 2 | Set per-card supply caps for a season |
| `register_agent` | 5 | Register an AI agent wallet |
| `register_agent_hire` | 4 | Record an agent hire via x402 |
| `deactivate_agent` | 1 | Mark an agent listing inactive |
| `register_card` | 1 | Register a card NFT with the game program |
| `record_mint` | 2 | Record a card mint event |
| `delegate_session` | 1 | MagicBlock: delegate to ephemeral rollup |
| `undelegate_session` | 1 | MagicBlock: return from ephemeral rollup |
| `add_xp` | 1 | Award XP to a player |
| `set_title` | 1 | Assign a title to a player |
| `unlock_title` | 1 | Unlock a title NFT |
| `unlock_achievement` | 1 | Unlock an achievement |
| `end_season` | 1 | Close a season and finalize prize pool |

**Note**: `init_season_stats` exists in Rust source (`lib.rs:626`) but is not yet reflected in the stored IDL (`oxark.json`). The IDL requires a rebuild (`anchor build`) to include it. The deployed binary on devnet includes this instruction.

---

## oxark Account Types (16)

| Account | Purpose |
|---|---|
| `Game` | Active duel state — players, hands, HP, round, phase |
| `Season` | Season config — prize pool, end date, supply rules |
| `SeasonCardSupply` | Per-card mint caps for a given season |
| `PlayerState` | Player progress, XP, title, position |
| `PlayerDeck` | Saved deck configuration (up to 20 cards) |
| `PlayerRegistry` | Player's card ownership registry |
| `PlayerLevel` | XP and level progression |
| `PlayerBattleStats` | Win/loss/draw stats per player |
| `PlayerAchievements` | Unlocked achievement flags |
| `PlayerTitle` | Equipped title NFT pointer |
| `CardCommitRecord` | ZK commit hash for a card choice |
| `CommitAction` | ZK commit hash for a Burn/Evolve/Steal/Imprint action |
| `AgentListing` | AI agent wallet + policy configuration |
| `AgentHireSession` | Active agent hire session (x402-initiated) |
| `CardPool` | Pool of available cards per floor |
| `StakeVault` | Ante escrow for a game |

---

## oxark-cards Instructions (5)

| Instruction | Purpose |
|---|---|
| `mint_card_nft` | Mint a new card NFT via Metaplex |
| `mint_solo_card` | Mint a card for solo/dev wallets |
| `list_card` | List a card for P2P sale |
| `buy_card` | Purchase a listed card (x402 fee) |
| `cancel_listing` | Cancel a P2P listing |

---

## Key PDAs (Devnet)

| PDA | Seeds | Address |
|---|---|---|
| SeasonStats (Season 1) | `["season_stats", u32_le(1)]` | `FYB1oBnNKMDoBNwayBKfS9SHZePqNTXT8uRvXCEwjdhh` |

**Note**: `SeasonStats` PDA for Season 1 is derived but not yet initialized on devnet. Must call `init_season_stats(season_id=1)` before 2026-05-12 Season 1 launch.

---

## Verification Commands

```bash
# Program info
solana program show 5i37jWBiA7bV9XmokyDWHQxjJ5s1sBnSEkPSB4J2XfmN --url devnet

# Account info (after init_season_stats is called)
solana account FYB1oBnNKMDoBNwayBKfS9SHZePqNTXT8uRvXCEwjdhh --url devnet

# Wallet balance
solana balance DPMPhnVezSq5im35p4w3bC6XjpNZuuvCDVSAVxw4Q28R --url devnet
```

---

*Generated 2026-04-27 · Tag: v-phd-devnet-assets*

# 0xARK — Shogi-Inspired Card Economy Design

## 1. Design Philosophy

Shogi (Japanese chess) principles applied to card game economy:

- **Fixed total pieces in the world** — no inflation, no arbitrary minting
- **Captured pieces become playable** ("持ち駒" = pieces in hand) — stolen cards are weapons
- **Opening theory in early game, complexity in mid/end game** — meta evolves within a season
- **Piece value hierarchy** (pawn < knight < ... < king) — rarities have asymmetric power
- **2D board spatial reasoning** — dungeon positioning adds geographic tension
- **Public information + hidden intent** — ZK extension adds bluffing that shogi cannot do

---

## 2. 60-Card 5-Tier Structure

Total 60 unique card types distributed across 5 rarity tiers:

| Rank | Types | Note |
|------|-------|------|
| SS | 4 | Permanent 12 copies total — Bitcoin-like |
| S | 8 | Dynamic supply per season |
| A | 12 | Dynamic supply per season |
| B | 16 | Dynamic supply per season |
| C | 20 | Dynamic supply per season |
| **Total** | **60** | |

---

## 3. Two-Layer Supply Model

### Layer 1: SS Permanent NFTs (True Scarcity)

- 4 types × 3 copies = **12 permanent NFTs** in existence
- Cross-season persistence — never burned
- Dropped **only at Grand Final events**
- Holders are crypto-legendary (publicly verifiable on-chain forever)

### Layer 2: S–C Seasonal Dynamic Minting

- Minted at season start based on participant count `N`
- Unregistered cards burned at season end
- Registered (collected) cards persist as NFTs

### Dynamic Minting Formula

For participant count `N`:

| Rank | Types | Supply per Type | Expected per Player |
|------|-------|----------------|---------------------|
| S | 8 | 0.05 × N | 0.05 cards |
| A | 12 | 0.4 × N | 0.4 cards |
| B | 16 | 2.5 × N | 2.5 cards |
| C | 20 | 16 × N | 16 cards |

**Key property**: expected value per player stays constant at any `N`.

### Scale Examples

| N | S total | A total | B total | C total | Grand total |
|---|---------|---------|---------|---------|-------------|
| 100 | 40 | 480 | 4,000 | 32,000 | 36,520 |
| 1,000 | 400 | 4,800 | 40,000 | 320,000 | 365,200 |
| 10,000 | 4,000 | 48,000 | 400,000 | 3,200,000 | 3,652,000 |

---

## 4. Shard Season (N > 10,000)

Auto-sharding when participant count exceeds 10k:

```
World Season 2026-Spring
  ├── Shard A  (max 10,000 players)
  ├── Shard B  (max 10,000 players)
  ├── Shard C  (max 10,000 players)
  └── Grand Final
        - Top 100 per shard qualify
        - SS cards dropped here only
        - If SS supply exhausted, defeat existing holder to acquire
```

Constraints:
- Within a shard: S–C cards self-contained, no inter-shard trade during season
- Grand Final: only qualified players compete for SS drops

---

## 5. Element System (6 Suits)

6 elemental suits distributed across all 60 cards:

| Symbol | Element | Japanese |
|--------|---------|----------|
| 🔥 | Fire | 炎 |
| 💧 | Water | 水 |
| 🌪️ | Wind | 風 |
| ⛰️ | Earth | 地 |
| 🌑 | Shadow | 闇 |
| ✨ | Light | 光 |

Rock-paper-scissors advantage cycles within suit groups (final balance TBD pre-mainnet).

> **MVP note**: Hackathon MVP uses 4 simplified elements (Tide/Abyss/Storm/Iron) with a
> defined advantage cycle. Full 6-suit system targets Mainnet v1.

---

## 6. Special Effects

### 断末魔 (Deathrattle) — 10 cards

When a card is stolen/captured, triggers a penalty effect on the taker.  
**Purpose**: suppress Steal-dominant strategies; creates risk in aggressive play.

| Rank | Count |
|------|-------|
| SS | 2 |
| S | 2 |
| A | 3 |
| B | 2 |
| C | 1 |
| **Total** | **10** |

### 連鎖 (Chain) — 12 cards

Bonus effect activates when 2+ chain-cards are registered in a player's collection.  
**Purpose**: reward collection building and motivate non-aggressive strategies.

| Rank | Count |
|------|-------|
| SS | 2 |
| S | 3 |
| A | 3 |
| B | 2 |
| C | 2 |
| **Total** | **12** |

**Rule**: Deathrattle and Chain are mutually exclusive — never on the same card.

---

## 7. Registration (登録) System

GI-style collection mechanics:

- **First copy** of a card type registered = permanent collection slot
- **2nd+ copies** = consumable (can be used in battle without affecting the registered slot)
- **Player goal**: register all 60 types to achieve Season Complete

**Curses**: special negative cards that fill slots with debuffs — cleansed only by Light-suit rituals.

---

## 8. Win Condition

### Within a Shard

- Register all 60 card types → **"Season Complete"**
- Reward: 1 SS drop qualification ticket for the next Grand Final

### Across the World

- 12 SS holders named **"Ark Sovereigns"**
- Public on-chain record — persists forever regardless of future seasons

---

## 9. Shogi Analogies Map

| Shogi Concept | 0xARK Implementation |
|---------------|---------------------|
| 固定駒数 (40 pieces total) | 60 card types, fixed |
| 持ち駒 (captured pieces become usable) | Steal mechanic |
| 歩 (pawn — abundant, weak) | C-rank cards |
| 金銀 (gold/silver — utility pieces) | B–A rank cards |
| 飛車角 (rook/bishop — power pieces) | S rank cards |
| 王 (king — unique, cannot be replaced) | SS rank cards |
| 定跡 (opening theory) | Early-season meta strategies |
| 詰み (checkmate — game over state) | 60-type registration complete |
| 棋譜 (game record) | On-chain tx history + replay |

---

## 10. ZK Extension

Unlike shogi (perfect information game), 0xARK adds ZK-hidden state layers:

| Layer | Mechanic |
|-------|---------|
| Card intent | ZK-commit on next card played (軸 C, MEGA4) |
| Dungeon position | ZK-commit on player coordinates (existing) |
| Scout peek | x402 micropayment to reveal 1 opponent card |

This creates **asymmetric bluffing that shogi cannot model** — you know the board state but not the opponent's intent, and buying information is a strategic resource.

---

## 11. Implementation Roadmap

### Current: Hackathon MVP (devnet, deadline 2026-05-11)

MEGA4 implements a simplified version:

- 3-tier rarity: Common / Rare / Legendary (stub for 5-tier)
- 4 elements: Tide / Abyss / Storm / Iron (simplified from 6 suits)
- Preparation Deck: 20-card system (軸 A)
- Element multipliers in battle resolution (軸 B)
- ZK card commit/reveal 2-phase battle (軸 C)
- Single-shard experience only

Rationale: complexity management for hackathon deadline.

### Post-Hackathon: Mainnet v1

- Full 5-tier structure (SS / S / A / B / C)
- 6-suit element system with finalized advantage cycles
- Deathrattle + Chain special effects
- Dynamic minting formula live on-chain
- Registration system with curse mechanic
- Single-shard, up to 10,000 participants

### Mainnet v2: Shard Season

- Multi-shard infrastructure with auto-sharding at 10k
- Grand Final event mechanism
- SS drop logic (3 copies per type, 4 types)

### Mainnet v3: Cross-Ark

- ConsensusOS identity integration
- SS holders carry cross-game portable identity
- Inter-game provenance for legendary cards

---

## 12. Pitch Angles

**One-liner:**
> "60 cards. 12 eternal. Thousands of players. One Ark Sovereign per generation."

**Bitcoin analogy:**
> "In Bitcoin, 21 million coins. In 0xARK, 12 permanent legendary cards.
> Their 12 holders become crypto-legendary, verifiable forever on Solana."

**Shogi analogy:**
> "Shogi gave us captured pieces as playable.
> 0xARK gives you captured cards — plus ZK-hidden intent that shogi never had."

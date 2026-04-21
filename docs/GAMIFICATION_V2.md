# 0xARK Gamification v2 — Integrated Design

> 将棋 × TCG × ZK の三位一体プレイシステム  
> See also: [SHOGI_DESIGN.md](./SHOGI_DESIGN.md) | [STRATEGY_DEPTH.md](./STRATEGY_DEPTH.md) | [ELEMENT_MATRIX_V2.md](./ELEMENT_MATRIX_V2.md)

---

## 1. Design Philosophy

### The Three Forces

| Force | Mechanic | Why it works |
|-------|---------|--------------|
| 将棋 (Shogi) | 5-tier card economy, piece capture, registration | Permanence and scarcity create real stakes |
| TCG | Deck building, element advantage, synergy chains | Depth rewards mastery over time |
| ZK | Hidden positions, commit-reveal bluffing | True information asymmetry — no metagaming |

### Player's 3-Stage Rocket

**Stage 1 — Session Hook** (first 10 min)  
The immediate loop: explore → battle → collect a card → feel the gain.  
Success metric: player wins or loses a card in a real PvP encounter.

**Stage 2 — Season Goal** (weeks)  
Collect and *register* all 60 species. Each species registered is permanent — even if the physical card is stolen. Racing other players to full registration.  
Success metric: player hits 30+ registered species in a season.

**Stage 3 — Annual Legend** (seasons)  
Becoming "Ark Sovereign" — the first player in a season to register all 60.  
SS cards and Grand Final tournament seeding depend on season rank.  
Success metric: leaderboard placement, special title earned.

---

## 2. 5-Tier Card Structure

> Full card list: [CARD_CATALOG.md](./CARD_CATALOG.md)  
> Economy rationale: [SHOGI_DESIGN.md](./SHOGI_DESIGN.md)

| Tier | Count | Season Supply (N players) | Acquisition |
|------|-------|--------------------------|-------------|
| SS   | 4     | Event-only (1 per event) | Special drop / Grand Final |
| S    | 8     | 0.05 × N                 | Deep dungeon / high-stakes steal |
| A    | 12    | 0.4 × N                  | Mid dungeon / rare gacha |
| B    | 16    | 2.5 × N                  | Common dungeon floor drops |
| C    | 20    | 16 × N                   | Surface encounters, starter gacha |

**Total: 60 species**  
- SS is permanent NFT (3 copies per type globally, soulbound on season win)  
- S–C are season-scoped (burn at season end unless registered)

### Registration (GI Rule)

First time a player acquires a card species → permanent registry slot.  
Second+ copy → normal battle-consumable card.  
Registering all 60 species triggers **Season Complete** for that player.

---

## 3. 6-Element System

> Detailed matrix: [ELEMENT_MATRIX_V2.md](./ELEMENT_MATRIX_V2.md)

### Elements and Assignment

| Element | Symbol | Card ID range | Flavor |
|---------|--------|---------------|--------|
| Fire    | 🔥     | 1–10          | Aggression, power |
| Water   | 💧     | 11–20         | Adaptability, flow |
| Wind    | 🌬️    | 21–30         | Speed, evasion |
| Earth   | ⛰️     | 31–40         | Defense, bulk |
| Shadow  | 🌑     | 41–50         | Disruption, steal |
| Light   | ✨     | 51–60         | Support, recovery |

### Advantage Cycles (2-Triad System)

**Triad 1 — Material**: Fire → Water → Earth → Fire  
**Triad 2 — Abstract**: Wind → Shadow → Light → Wind  
Cross-triad encounters are neutral (×1.0).

| Matchup | Multiplier |
|---------|-----------|
| Advantaged (cycle order) | ×1.5 |
| Disadvantaged (reverse) | ×0.7 |
| Same element | ×1.0 |
| Cross-triad | ×1.0 |

---

## 4. Registration System

The registration mechanic is the backbone of the season loop.

```
Player acquires card species X (first time)
  → CardRegistry PDA: registered[X] = true
  → +10 XP
  → NFT badge (soul-bound record)

Player re-acquires species X (subsequent)
  → Card goes to hand (battle-consumable)
  → No extra registry entry
```

### Season Complete Condition

When a player's `registered` bitmap reaches all 60 species:
- `game.season_complete[player] = true` emitted on-chain
- Player earns "Sovereign" title for that season
- SOL prize pool distributed (first to complete wins lion's share)

---

## 5. Deathrattle + Chain System

> Allocation: see [CARD_CATALOG.md](./CARD_CATALOG.md)

### Deathrattle (断末魔) — 10 cards

When a deathrattle card is stolen, the thief receives a penalty:

| Tier | Penalty |
|------|---------|
| SS | Thief loses their own rarest card |
| S  | Thief loses 2 HP |
| A  | Thief loses 1 HP + 1 SP energy |
| B  | Thief loses 1 HP |
| C  | Thief loses 0.5 HP (rounded up) |

Deathrattle resolves *after* the steal — the physical card still moves.  
On-chain: `resolve_round` checks `has_deathrattle` flag and applies penalty CPI.

### Chain (連鎖) — 12 cards

When a player holds 2+ cards with the same chain group, a passive bonus applies each round:

| Chain size | Bonus |
|-----------|-------|
| 2 cards | +1 SP recovery |
| 3+ cards | +1 SP recovery + element damage ×1.1 |

Chain bonuses stack with element advantage (multiplicative).  
A card cannot have both `has_deathrattle` and `has_chain`.

---

## 6. Dynamic Minting

Season supply is computed from participant count N at season start:

```
supply[SS] = 1   (event special — first season drop)
supply[S]  = max(1, floor(0.05 * N))
supply[A]  = max(2, floor(0.4  * N))
supply[B]  = max(4, floor(2.5  * N))
supply[C]  = max(8, floor(16   * N))
```

- `SeasonCardSupply` PDA is written at `init_season` time
- Each `drop_card` instruction checks `minted[rarity] < supply[rarity]`
- If a tier is exhausted → fallback to next lower tier
- Season ends → uncollected cards burn, registered persist

---

## 7. Progression System

### XP Sources

| Action | XP |
|--------|----|
| Battle win | +100 |
| Battle loss | +30 |
| Card collected (first time) | +10 |
| Card registered | +10 |
| Synergy trigger | +5 |
| ZK commit cycle complete | +3 |
| Deathrattle reversed | +15 |
| SUPER EFFECTIVE! attack | +2 |

### Level Structure

- Level cap: 60 (mirrors card species count)
- XP to next level: `level * 200` (linear for hackathon, tunable post)
- No level-gating of core play — levels unlock cosmetics and achievement slots

### Level Unlocks

| Level | Unlock |
|-------|--------|
| 5  | Title slot 1 (can display 1 earned title) |
| 10 | Deck size +2 (max 22) |
| 15 | Achievement slot 2 |
| 20 | Title slot 2 |
| 25 | Gacha discount (−5% SOL cost) |
| 30 | Deck size +2 (max 24) |
| 40 | Chain bonus multiplier +0.05 |
| 50 | Title slot 3 |
| 60 | "Ark Sovereign" frame unlocked |

---

## 8. Achievements (10 Initial)

| ID | Name | Condition | XP Reward |
|----|------|-----------|-----------|
| A01 | First Blood | First battle win | 50 |
| A02 | Shadow Captain | 10-win streak (no loss between) | 300 |
| A03 | Ark Seeker | 30 species registered | 200 |
| A04 | Master Collector | All 60 species registered | 1000 |
| A05 | Legendary Finder | First S-tier card acquired | 150 |
| A06 | SS Holder | First SS card acquired | 500 |
| A07 | Perfect Combo | 3 consecutive SUPER EFFECTIVE! in one battle | 100 |
| A08 | Tide Master | 10 wins using Water-element cards as the kill card | 100 |
| A09 | Deathrattle Victim | Lose to a deathrattle reversal | 25 |
| A10 | Synergy Chain | 3 chain synergies trigger in a single session | 75 |

Achievements are stored in a per-player `AchievementRecord` PDA.  
Each achievement is a bit flag in a `u16` bitmask (`achieved[0..9]`).

---

## 9. Title (称号) System

Titles are on-chain cosmetic records. Players can equip one title per level-unlock slot.

| Title | Condition |
|-------|-----------|
| "Drifter" | Reach Level 10 |
| "Captain" | Level 25 + 10 career wins |
| "Navigator" | Level 40 + 30 species registered |
| "Ark Seeker" | Level 50 + 50 species registered + Achievement A03 |
| "Sovereign" | Level 60 + all 60 registered + Achievement A04 |
| "Shadow Lord" | Achieve A02 + A09 (10-win streak + deathrattle victim) |
| "Deathrattle Breaker" | Trigger deathrattle reversal on an SS card |
| "Perfect Storm" | Achievement A07 + 5 consecutive SUPER EFFECTIVE! total |

Titles stored in `PlayerTitle` PDA: `equipped_titles: [u8; 3]` (3 slots max).

---

## 10. Implementation Roadmap

### Hackathon Scope (MEGA5 — current)

| Stage | Tasks | Scope |
|-------|-------|-------|
| A | T90–T92 | Docs: GAMIFICATION_V2, CARD_CATALOG, ELEMENT_MATRIX_V2 |
| B | T93–T97 | On-chain: 5-tier, 6 elements, dynamic supply, deathrattle, XP |
| C | T98–T102 | Progression UI, achievement display, titles, E2E |

### Post-Hackathon

- **Shard Season**: > 10k players → shard into regional brackets
- **Grand Final**: Top 8 per shard compete in a single-elimination ZK tournament
- **SS Circulation**: SS cards enter normal drop pool at Shard Season tier
- **Guild System**: Team registration, shared prize pool split
- **Cross-chain Bridge**: Solana ↔ Base NFT bridge for broader reach

---

*Last updated: 2026-04-21 — MEGA5 Stage A*

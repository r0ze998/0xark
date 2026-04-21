# 0xARK — Game Design Document v1.2

> *Collect 60 cards. Be the first. ZK hides your hand, x402 moves your money, MagicBlock ER runs the world in real time, AI agents join the fight.*

**Status:** Draft 3 — 2026-04-21 (duel design overhauled, inspired by Anode Heart: Layer Null)  
**Changes vs v1.1:** Section 5 (Duel Design) fully rewritten — phase-based turn structure, 5-element energy system, lane-based summon, defender mechanic, Shards/Extra Action, server-rank gated Duel Halls. Section 4 (Lobby) adds Bronze/Silver/Gold Duel Hall. Section 6 (Faction) adds element affinity wheel. Section 14 (Roadmap) unchanged (still feasible). Other sections kept.  
**Submission target:** Solana Frontier Hackathon, due 2026-05-11  
**Post-hackathon goal:** Public product release

---

## Table of Contents

1. [Vision](#1-vision)
2. [World Setting](#2-world-setting)
3. [Core Loop](#3-core-loop)
4. [Lobby Design](#4-lobby-design)
5. [Duel Design](#5-duel-design)
6. [Faction System](#6-faction-system)
7. [NFT Card Design](#7-nft-card-design)
8. [Season & Ranking](#8-season--ranking)
9. [ZK Mechanics](#9-zk-mechanics)
10. [x402 Microeconomy](#10-x402-microeconomy)
11. [AI Agent Integration](#11-ai-agent-integration)
12. [Tech Stack](#12-tech-stack)
13. [Reborn Migration](#13-reborn-migration)
14. [Roadmap](#14-roadmap)
- [Appendix A: Glossary](#appendix-a-glossary)
- [Appendix B: Open questions](#appendix-b-open-questions)
- [Appendix C: File path reference matrix](#appendix-c-file-path-reference-matrix)
- [Appendix D: Phase-based duel at a glance](#appendix-d-phase-based-duel-at-a-glance-quick-reference)

---

## 1. Vision

### One-liner

**0xARK is a fully on-chain card collection race on Solana, wrapped in a JRPG world where everyone competes to collect 60 unique NFT cards first — while ZK hides their hand, x402 powers micro-economies, and AI agents fight alongside humans.**

### What makes it different

Onchain card games today are built around **ladder ranking** — win matches, climb ranks, earn tokens. 0xARK inverts the loop: **ranking is a side-effect, the real race is collection**. Every card you win is one closer to ending the season. Every card you lose is a step backward. The season doesn't end on a calendar — it ends when somebody completes their set.

This makes every duel matter. Not for Elo points. For physical progress in a visible race against everyone else in the server.

Combined with:

- **MagicBlock ER** for real-time lobby presence and low-latency duel execution
- **ZK Groth16 proofs** to hide your hand and identity during duels
- **x402 micropayments** woven through every small transaction (scout peek, card P2P, agent hire)
- **AI agents** that join the same server as humans, indistinguishable opponents
- **Metaplex NFT cards** that live on Solana's base layer and trade on Tensor/Magic Eden

…0xARK sits at the intersection of five distinct 2026 Solana narratives. No other hackathon submission hits all five at once.

### Design principles

1. **Respect player time** — 5 minute duels. Enter. Play. Leave. Come back.
2. **Visible competition** — the leaderboard isn't a menu, it's the world. You see the rival with 58 cards walking into the shop.
3. **Permissionless economy** — SOL / SPL native, every action is on-chain, cards are composable NFTs.
4. **ZK where it counts** — not everywhere, only where hidden information drives gameplay tension.
5. **AI as first-class citizen** — agents aren't bots to grind, they're opponents you'd be proud to defeat.

---

## 2. World Setting

### Aesthetic: FRLG-style JRPG

The world borrows visual language from Pokémon FireRed / LeafGreen (GBA, 2004) — a top-down / 2D pixel aesthetic with cream-and-gold dialog boxes, tile-based maps, and a comforting sense of small towns connected by routes. This aesthetic choice is **non-negotiable for the hackathon submission** because:

- It's globally legible — 30-year-olds recognize it instantly
- It sets warm, accessible expectations that contrast with crypto's cold/corporate defaults
- It maps cleanly onto our existing code (design tokens + UI spec + pirate asset pack already in repo)

### Existing visual specification

The repo already contains a complete GBA-era design system in `design/`:

- **`design/DESIGN_TOKENS.json`** — locked palette (ocean_shallow, sail_cream, gold_accent, menu_blue, text_dark, etc.), NPC identity palette (Vega magenta, Mira amber, etc.), typography tokens, z-layer ordering
- **`design/UI_SPEC.md`** — pixel-precise screen layouts keyed on logical 240×160 GBA resolution (`stage.scale = 2` → 480×320 render)
- **`design/COMPONENT_RECIPES.md`** — reusable render recipes for HUD / dialog / banner components
- **`design/preview/`** — reference screenshots

All of Phase D's UI work references these tokens. No re-design is needed — just new screens following the existing spec.

### The world, narratively

A quiet archipelago. Five towns, each home to a different **Faction** — a professional guild that trains the next generation of *Card Keepers*. Every two weeks, the Cardmasters' Guild releases a new collection of 60 cards into the world. Whoever collects all 60 first becomes the season's Champion and claims the Prize Pool. Everyone else goes home with what they've accumulated — permanently theirs as NFTs.

The towns are connected by Routes. Wild encounters on Routes are rare NPC duelists. Towns contain shops, Faction HQs, and Duel Halls where players challenge each other. The world persists on Solana — when you log in, other players are already walking around.

### The "ZK pirate" DNA survives

The pre-Reborn version of 0xARK was a "ZK pirate card game" (see meta description still in `index.html`). In Reborn, the **Pirate faction literally carries that narrative DNA** — one of the five factions is pirates, and the existing `assets/pirates/` tilemap pack is Pirate town's primary art source.

---

## 3. Core Loop

### The loop, one screen deep

```
┌─────────────────────────────────────────────┐
│  ENTER LOBBY (your home town)               │
│  → see your cards: X / 60                   │
│  → see other players walking around         │
└──────────────┬──────────────────────────────┘
               │
    ┌──────────┼──────────┬──────────┐
    │          │          │          │
    ▼          ▼          ▼          ▼
 [SHOP]   [PC BOX]   [FACTION HQ]  [DUEL]
 Buy      Edit deck  See rankings  5-min
 pack     Store      Same-faction  PvP
 or       cards      chat          match
 single                            
    │          │          │          │
    └──────────┴──────────┴──────────┘
               │
               ▼
       CARDS COUNT UPDATES
       X+Δ / 60
               │
               ▼
         IF X == 60
         → CHAMPION
         → season ends
         → Prize Pool distributed
```

### A typical 15-minute session

1. Player logs in. Lobby loads. They see they have 47/60 cards, Season has 4 days left.
2. They walk to the PC Box, confirm their deck is built from their strongest cards.
3. They tap "Duel" — enter matchmaking queue, 20 seconds later paired with another player.
4. 5-minute Duel. Win 2 cards from opponent, lose 1 to opponent. Net +1.
5. Now 48/60. They see another player walk by — glances at their Faction banner — same Faction, friendly nod (emote).
6. They head to Shop, spend 0.08 SOL on a rare card they're missing. Now 49/60.
7. Log out. Come back tomorrow.

### The addictive loop

- Every duel has a stake (cards visible as numeric progress)
- Every card acquired is **permanent** (NFT, yours forever — even if you lose the season)
- Every card lost hurts (you can see it leave your collection)
- The leaderboard is public — you can see who's at 58/60, panic, duel them
- Season ends are dramatic — someone might complete during your coffee break

---

## 4. Lobby Design

### The Lobby is the world

Unlike traditional card games where the "lobby" is a menu, 0xARK's lobby is a **playable FRLG-style town**. Players walk around with their character sprite. Other online players are visible. It's a place, not a list.

### Spatial layout (MVP Town)

```
                    ┌─────────────┐
                    │   FACTION   │
                    │     HQ      │
                    └──────┬──────┘
                           │
       ┌───────────────────┴───────────────────┐
       │            MAIN SQUARE                 │
       │     (where players spawn)              │
       │     (other players visible)            │
       │                                        │
       └─┬──────┬──────┬──────┬──────┬─────────┘
         │      │      │      │      │
      ┌──▼──┐ ┌▼───┐ ┌▼────┐┌▼────┐┌▼────┐
      │SHOP │ │PC  │ │🥉   ││🥈   ││🥇   │
      │(NPC)│ │BOX │ │BRONZE││SILVER││GOLD │
      │     │ │    │ │HALL ││HALL ││HALL │
      └─────┘ └────┘ └─────┘└─────┘└─────┘
```

### Lobby buildings

#### 4.1 Shop (cards + tutorial)

- **NPC shopkeeper** (e.g., "Keeper Yume") delivers tutorial on first visit
- Three purchase options:
  - **Booster Pack** (0.05 SOL): 3 random common/uncommon cards
  - **Targeted Single** (0.01–2 SOL): pick a specific card from a rotating inventory; price scales with rarity
  - **Faction Starter** (0.1 SOL, one-time): a themed 20-card starter deck for your Faction
- Shopkeeper dialog includes game tips, Season status, current leaderboard snippets ("Did you hear? Someone's at 58 already!")
- **Backend**: existing `oxark-cards::card_market` + `mint_card_nft` instructions; new frontend screen only.

#### 4.2 PC Box (deck editor + card storage)

- Interact with the PC in the Pokémon Center analog
- UI shows: all owned NFT cards (grouped by Faction/rarity), current deck (20 slots), trash/sell buttons
- Drag cards between "Storage" and "Deck" panes
- Multiple saved deck slots (3-5)
- Validation: deck must be exactly 20 cards, max 2 copies of any single card
- Optional "Auto-build" button — PC suggests a deck from owned cards based on Faction
- **Backend**: existing `save_deck` + `lock_deck` instructions; `PlayerDeck` PDA already in `state.rs`.

#### 4.3 Faction HQ

- Access gated by your Faction (you can only enter your own)
- Inside: leaderboard of same-Faction members, sorted by cards collected
- "Same-Faction chat" — simple emote and pre-canned phrases (not free text)
- Quest board (future): daily/weekly goals for Faction members
- **Backend**: new PDA `Faction` needed (small, Season-scoped); leaderboard computed client-side from PlayerDeck accounts.

#### 4.4 Duel Halls (matchmaking, server-rank gated)

The town contains **three Duel Halls**, each representing a server rank tier. Inspired by Anode Heart: Layer Null's server-based progression, each rank gates access to different stakes and card pools.

| Hall | Unlock condition | Duel ante | Stakes | Reachable cards |
|------|------------------|-----------|--------|-----------------|
| 🥉 **Bronze Hall** | Open from day 1 | 0.005 SOL | Low | Common + Uncommon only |
| 🥈 **Silver Hall** | 5 wins in Bronze Hall | 0.01 SOL | Medium | + Rare cards possible |
| 🥇 **Gold Hall** | 3 wins in Silver Hall during current Season | 0.05 SOL | High | + Legendary Sceptre / Nameless Blade reachable only here |

**Matchmaking flow:**
- Walk up to receptionist, tap "Find Match"
- Matchmaking: ranked by current card count (±5 cards tolerance)
- Queue time target: under 30 seconds at mid-season density
- Optional: **challenge a specific player** seen in the Square (tap their sprite → "Challenge")

**Why server rank matters:**
- Narrative: the kingdom's succession race has a structure — you prove yourself in Bronze, earn respect in Silver, contest for Legendaries in Gold
- Gameplay: newcomers aren't matched with Season leaders immediately (protects low-card-count players)
- Legendary scarcity: Sceptre of Valerius and Nameless Blade can only change hands in Gold Hall duels, making them rare achievements

**Backend**: extend existing `create_game` / `join_game` flow with a new `MatchmakingQueue` PDA (one per Hall) + FIFO logic in a new `enter_queue` instruction. Server rank gating is verified on-chain via `PlayerBattleStats.wins_at_tier[3]` field.

### Other player presence

The Main Square shows **all players currently online in your server instance**, up to ~20 visible on screen, rendered as walking sprites. Their Faction color tints their clothing. Their card count is visible on hover (X/60).

This is the feature that delivers "大湯 MMO" — the bathhouse feeling. You know others are there. You see them. It's not a matchmaking screen pretending to be social.

**Backend**: the existing `multiplayer/server.js` WebSocket relay already broadcasts `player_moved` events and manages room presence. We extend this to include `faction` and `card_count` in the presence payload. Combined with MagicBlock ER for delegated position updates, sub-second latency is achievable for up to ~30 concurrent players.

### Emotes

Six preset emotes, no free-form chat (reduces moderation burden + multi-language friction):

- Wave 👋
- Bow 🙇
- Challenge (sword icon) ⚔️
- Well played 👍
- Tears 😭
- Sparkle ✨

Triggered via a radial menu, lasts 3 seconds above player head. **Backend**: relayed via the existing `chat` message type, encoded as `{kind: "emote", id: 1}` payloads — no program change needed.

---

## 5. Duel Design

### Format: 20-card deck, phase-based, 5 rounds, ~5 minutes

Inspired by **Anode Heart: Layer Null**. The goal is tactical depth through clear phase structure, element affinity, and creature combat — while keeping sessions short enough to fit into a coffee break.

### Deck composition

A legal deck contains exactly **20 cards**:

- **Character cards** (Tama-analog) — deploy on the battlefield, have HP / BP / element / ability
- **Energy cards** — generate element energy each round (Anode's "farmer" cards)
- **Event cards** — one-shot spells that resolve immediately (buff, debuff, destroy, draw, peek, etc.)

Max 2 copies of any single card. Starter deck (Faction-themed, 0.1 SOL in Shop) is pre-balanced for new players.

### Round structure: 4 phases per round

Each of the 5 rounds unfolds in **4 phases**, executed in order:

```
ROUND N
├─ Phase 1 — DRAW
│   Both players draw 1 card from deck.
│   (ZK: deck commitment rotates; drawn card added to private hand commitment.)
│
├─ Phase 2 — ENERGY
│   Both players may play 1 Energy card from hand to their energy pool.
│   Energy accumulates across rounds (not reset).
│   Each Energy card produces 1 of a specific element (Fire / Earth / Wind / Shadow / Gold).
│
├─ Phase 3 — SUMMON
│   Both players play Character and Event cards, paying element energy costs.
│   Characters occupy one of 3 LANES (Front / Middle / Back).
│   Events resolve immediately.
│   (ZK: hand commitment updates to reflect played cards.)
│
└─ Phase 4 — BATTLE
    First player declares attacks from their Characters toward opposing Lanes.
    Second player chooses Defender (optional — Characters can defend).
    Damage resolves: BP vs. BP, HP subtracted, destroyed Characters removed.
    Defenders deal half-BP counterdamage even if destroyed.
```

At end of Phase 4, if either player's **Heart HP** (starts at 20) is reduced to 0, that player loses immediately. Otherwise, round increments and loop repeats.

### Turn order (who plays first each phase)

Following Anode Heart convention:

1. Player with **greater total TP** (Tactical Points, a card stat) plays first
2. Tie → player with **lower total BP** (weaker army, given priority as underdog)
3. Tie → player with **lower total HP on Characters**

This rewards glass-cannon decks with initiative, while armored/heavy decks have to play reactively.

### Win conditions

**A duel ends when any of these occur:**

- An opponent's **Heart HP reaches 0** (direct KO via accumulated Battle Phase damage)
- An opponent **deck runs out** of cards during a Draw Phase (they can't draw = they lose)
- Round 5 ends and no winner yet → player with **higher Heart HP** wins
- **Legendary Sceptre of Valerius** effect (see Section 7) triggers instant card theft (doesn't end duel but shifts advantage)

### 5 Element energy system

All Characters and Events require **element energy** to play. 5 elements, 1 per Faction:

- **🔥 Fire** (Hollow Blade) — direct attack, high BP, aggressive
- **🌿 Earth** (Iron Circle) — high HP, defense, denial
- **💨 Wind** (Black Flag) — low cost, speed, mobility
- **🌑 Shadow** (Nameless Silk) — information, deception, stealth
- **💰 Gold** (Sovereign Bourse) — economy, scaling, energy generation

**Element affinity wheel** (attacker to defender):

```
        🔥 Fire
       ↗       ↘
    💰 Gold   🌿 Earth
     ↑             ↓
    🌑 Shadow  💨 Wind
       ↖        ↙
          (cycle)
```

Affinity rules:
- Fire attacks Earth: **+2 BP bonus**
- Earth attacks Wind: +2 BP bonus
- Wind attacks Shadow: +2 BP bonus
- Shadow attacks Gold: +2 BP bonus
- Gold attacks Fire: +2 BP bonus
- **Reverse matchups** (e.g., Earth attacks Fire): -1 BP penalty
- Same element, or non-affinity pairs: no modifier

This creates **meta rock-paper-scissors** at the faction level, and encourages multi-element decks for flexibility.

### Lanes (3-slot battlefield)

Each player has 3 lane slots for Characters: **Front / Middle / Back**.

- **Front lane**: attacks first, takes damage first (vanguard)
- **Middle lane**: neutral — standard combat
- **Back lane**: cannot be attacked unless Front and Middle are empty (protected support)

Character cards have optional **lane restriction** (e.g., "Must be played in Front" or "Only Back lane").

### Shards mechanic (Extra Action)

When you destroy an opponent's Character, you gain **1 Shard** (up to 5 max in a duel).

Spend **3 Shards** during any of your Phase 3 (Summon) to activate an **Extra Action**:
- Draw 1 extra card
- Play 1 Character at half energy cost
- Re-target 1 of your Characters to a different lane
- Cancel 1 Event card the opponent just played

Alternatively, **pay 0.01 SOL via x402** to skip the Shard requirement (max 2 purchased Extra Actions per duel).

### Card stat system

Each Character card has:

- **BP** (Battle Power, 1–15) — attack value, inflicts damage = BP to target
- **HP** (Health, 1–10) — how much damage before destroyed
- **Cost** (element symbols, e.g., 🔥1 + 🌿1 = 1 Fire + 1 Earth energy)
- **TP** (Tactical Points, 0–5) — contributes to turn order; higher TP = plays first
- **Element** (Fire/Earth/Wind/Shadow/Gold/Null) — determines affinity
- **Passive**: always-on effect (e.g., "+1 BP when alone in lane")
- **On-Summon**: one-time effect when played
- **On-Destroy**: effect when this card is destroyed

Event cards have Cost + 1 effect only (no HP/BP).
Energy cards have Cost 0 + produce 1 element per round.

### Duel reward structure

- **Winner takes**: 2 cards from loser's NFT collection — game picks randomly from cards the winner doesn't own yet; if winner owns all of loser's cards, winner receives shop credit in equivalent value instead
- **Loser loses**: those 2 cards (NFT transferred on-chain to winner)
- **Ante**: both players ante at match start (per Hall: 0.005 / 0.01 / 0.05 SOL); winner takes ~90% (10% to Season Prize Pool)

**This is where the collection race tension lives**: every duel is a real stake. No safe ranked games. No practice matches.

**Backend**: existing `commit_action` / `reveal_action` / `resolve_round` + `commit_card` / `reveal_card` instructions are retargeted to phase-based card plays. A new `commit_phase` instruction wraps the 4-phase flow per round.

### Anti-griefing rules

- Can't be matched against a player who's already beaten you in the last 5 minutes (prevents target farming)
- Can't lose your last 10 cards in a single session (if your count drops to 10, you're protected for 1 hour — gives newbies recovery time)
- Disconnect = forfeit (you lose 2 cards; opponent gets them)
- Server-rank gating (Bronze/Silver/Gold) prevents 60-card Season leaders from farming novices

---

## 6. Faction System

### 5 Clans (former "Factions")

In Season 1 (The Succession War of Elyon), the 5 factions are reframed as **Clans** — political factions vying for the lost throne. Each Clan is tied to a single element for combat affinity purposes.

| Clan | Japanese | Element | Archetype | Play style |
|------|----------|---------|-----------|------------|
| **Black Flag** | 黒旗 (旧 海賊) | 💨 Wind | Aggressive raider | Low cost, speed, mobility. Hit first, hit often. |
| **Sovereign Bourse** | 主権市場 (旧 商人) | 💰 Gold | Economy engine | Energy generation, late-game scaling, synergy with Shop |
| **Hollow Blade** | 空の刃 (旧 侍) | 🔥 Fire | Direct fighter | High BP, straight damage, consistent and predictable |
| **Iron Circle** | 鉄環 (旧 藩士) | 🌿 Earth | Control / wall | High HP, defense, denial, punishment-based play |
| **Nameless Silk** | 無名の絹 (旧 忍者) | 🌑 Shadow | Info warfare | ZK deception, false identity, counter-intel |

### Element affinity (attacker → defender)

```
        🔥 Fire ──(+2 BP)──▶ 🌿 Earth
           ▲                    │
           │                    │ (+2 BP)
        (+2 BP)                 ▼
        💰 Gold              💨 Wind
           ▲                    │
           │                    │ (+2 BP)
        (+2 BP)                 ▼
           └─── 🌑 Shadow ◀────┘
                   ▲
                   │ (Shadow +2 BP vs Gold)
                   └──── 💰 Gold
```

A cycle: **Fire → Earth → Wind → Shadow → Gold → Fire**. In a matchup, the attacker on the strong side of the arrow gains **+2 BP** for that attack; the reverse matchup suffers **-1 BP**. Same element or neutral matchups have no modifier.

This creates:
- **Clan identity**: your faction isn't just flavor — it defines your combat strengths vs. other factions
- **Deckbuilding depth**: pure mono-element decks risk hard counters; multi-element decks are more resilient but harder to play
- **Metagame**: if Fire decks dominate, Water... err, Gold... rises as counter, shifting the ecosystem naturally

### Choosing a Clan

On first login, player is walked to the **Guildhall** by a tutorial NPC and asked to choose a Clan. **Choice is permanent for the current Season** — next Season they can switch.

Each Clan has a **starter deck** (20 cards from their color pool) included in the 0.1 SOL Clan Starter purchase. Starter decks are pre-balanced to teach the Clan's core play style.

### Clan meta-game

- Same-Clan members can see each other's progress in the Clan HQ
- End of Season, Clans also compete as a group — **top aggregate cards collected across Clan members = Clan Seasonal Champion**, awarded a Clan-wide prestige bonus and faction-specific cosmetic
- Prevents solo grinding — encourages Clan-internal coordination (without direct card trading inside Clan being free; x402 still charged)

### Nameless Silk and ZK: the thematic keystone

The Nameless Silk clan is the one where **ZK isn't just a tech feature but a gameplay mechanic**. Nameless Silk cards can:

- **"Cloak"** — their Identity commitment stays hidden even after other factions reveal theirs
- **"False flag"** — broadcast a fake commitment alongside the real one (opponent's Scout peek has a 50% chance of seeing the decoy)
- **"Shadow strike"** — bonus BP on Characters summoned while you have the smallest hand visible

This bakes ZK into the clan metagame, not just the tech stack.

---

## 7. NFT Card Design

### Supply

- **60 unique cards per Season** (the "Core 60")
- Each card has multiple rarity tiers: Common / Uncommon / Rare / Legendary
  - Common: ~30 cards, 4 copies per Season print
  - Uncommon: ~20 cards, 2 copies per Season print
  - Rare: ~8 cards, 1 copy per Season print
  - Legendary: ~2 cards, unique (1 of 1)
- **Total Season supply ≈ 200 NFTs** across ~500-1000 players → scarcity is real

For the hackathon MVP we'll ship **one Season's worth** (60 cards). Post-launch, a new Core 60 drops every two weeks, with a small percentage rotating (most cards carry forward, some retire).

Existing `SeasonCardSupply` PDA + `init_season_supply` + `record_mint` + `register_card` instructions handle this. No new structure needed.

### What players collect for the "race"

A card is "collected" in the race sense if the player owns **at least one copy** of that card ID. Duplicates don't count toward 60/60 but:

- Grant deck-building flexibility (2-copy limit per deck)
- Tradeable on Tensor / Magic Eden
- Usable as Shop "dust" currency (grind 5 duplicates to craft a targeted single)

### Card metadata

On-chain Metaplex metadata includes:

- Name, description, Faction, rarity, rule text
- Season ID (so we can query "all Season 1 cards")
- Artwork URL (Arweave)
- ZK-related: the `card_id` used in hand commitments (so ZK circuit can reference it)

### Artwork

- Hackathon MVP: stylized pixel portraits (we'll use Midjourney / Flux for generation, retouch in Clip Studio Paint, assemble in Figma or Claude Design)
- Each card has a 2-frame idle animation in-game (sprite sheet)
- Art direction: FRLG portrait style (soft colors, clear outlines, readable at 64×64px), following `design/DESIGN_TOKENS.json` palette

### Secondary market

Cards are regular Metaplex NFTs. Players can list on Tensor or Magic Eden at any time. 0xARK takes no cut from secondary sales (we only earn from Shop primary sales and duel ante dust). The existing `oxark-cards::card_market` instruction set already supports listing/buying.

---

## 8. Season & Ranking

### Season length: 2 weeks

Start: Sunday 00:00 UTC  
End: Saturday 23:59 UTC (14 days later)

### How Season ends

**Either**:
- Someone completes 60/60 cards → Season ends immediately, they are Champion
- Time runs out (14 days) → Player with highest card count is Champion

In both cases, final snapshot is taken on-chain at end. The existing `create_season` / `end_season` instructions are the foundation; we add Champion-detection logic to `record_mint`.

### Prize Pool

Funded by:
- 10% of all Shop sales during the Season
- 10% of all duel antes
- Optional: sponsor contributions (post-launch)

Distributed:
- 40% to Champion
- 20% to #2
- 10% to #3
- 20% split across top 10-50 players (weighted)
- 10% to top Faction (split among all members of winning Faction, proportional to their collection)

### Rank calculation

Primary: **unique cards collected** (0-60)  
Tiebreaker 1: Total cards owned (including duplicates)  
Tiebreaker 2: Earlier Season entry timestamp

### Persistence between Seasons

- **Cards**: permanently yours (NFTs). Can be used in next Season's duels if the card ID is still in circulation
- **Faction**: resets (you can switch)
- **Stats**: persistent across Seasons via `PlayerBattleStats` / `PlayerLevel` / `PlayerAchievements` PDAs (already in `state.rs`)
- **Ranking**: resets to zero for new Season

### Season lore

Each Season has a theme ("Shogun's Tournament," "The Dragon Trial," etc.) that flavors the Shop inventory and introduces 1-2 "themed Legendary" cards. This gives collectors a reason to return each Season even if they're not chasing the Champion slot.

---

## 9. ZK Mechanics

### What's hidden via ZK

Two distinct commitments, both using the existing Groth16 BN254 verifier:

#### 9.1 Hand Commitment

- Before each round, each player commits `Poseidon(card_ids[], salt)` of their hand
- Play action: commit `Poseidon(played_card_ids[], remaining_card_ids[], salt)`
- ZK circuit proves:
  - Played cards were in previous hand commitment
  - Remaining cards + played cards = previous hand (conservation)
  - Energy cost of played cards ≤ current round number
- Output: new hand commitment (for next round), played cards revealed on-chain

**Implementation**: the existing `commit_card` / `reveal_card` instructions (in `solana/oxark/programs/oxark/src/instructions/`) already implement this commit-reveal primitive at the card level. We extend their proof structure to match the new 20-card hand format. The existing `verify_zk_proof` + `verify_dungeon_move` instructions provide the Groth16 verifier scaffolding.

The underlying circuit (`circuits/dungeon_position/dungeon_position.circom`) adapts to `hand_commitment.circom` with structural changes but no new cryptographic primitives — same Poseidon hash, same BN254 pairing, same `alt_bn128_pairing` syscall.

#### 9.2 Identity Commitment (the "Dark Forest" move)

- At Season start, player commits `Poseidon(faction_id, build_strategy_hash, salt)` to a new `PlayerIdentity` PDA
- During duels, the Faction color is visible (you can see the opponent is Ninja), but **the specific deck archetype is hidden**
- Optional: opponent can spend x402 to reveal it (see Section 10)
- At Season end, identity is revealed — reputation scores aggregate across Seasons under the same commitment

This is the novel contribution — **persistent pseudonymous identity with ZK-backed build privacy**. Dark Forest revealed your tools; 0xARK keeps them hidden forever unless you choose (or get paid) to reveal.

### Why we keep ZK

The existing circuit (`circuits/dungeon_position/dungeon_position.circom`, compiled to `commit_reveal.wasm` + `commit_reveal_final.zkey`) is already working — proven on devnet with transaction `2pkmJpGv...`. Build scripts (`circuits/scripts/compile.sh`, `setup.sh`, `prove.sh`, `verify.sh`) are in place. We keep all the Rust verifier code, G2 Fp2 coefficient ordering fix, and Poseidon compatibility work.

The dungeon_position circuit dies; its engine lives on.

---

## 10. x402 Microeconomy

### Philosophy

x402 is the **blood** of 0xARK's economy. Small, frequent, pay-per-call transactions flow through the world. Nothing is free; nothing is expensive.

### Implemented touchpoints (hackathon MVP)

These are implemented, tested, or straightforward to finish by 5/11:

| Touchpoint         | Price (SOL) | Description |
|--------------------|-------------|-------------|
| **Scout peek**     | 0.005       | Reveal one random card in opponent's current hand (ZK proof disclosed for that card only). Already shipped (v475). |
| **Identity peek**  | 0.02        | Reveal an opponent's identity commitment (their build archetype). High-stakes intel. |
| **Hint buy**       | 0.002       | Before a round, learn the total energy cost opponent will play (not the cards, just the magnitude). |
| **Agent hire**     | 0.05/session| Rent an AI agent to play for you while you're AFK. Hackathon priority. |
| **Card P2P**       | variable    | Player-listed card sales with facilitator verifying payment. Built on top of `oxark-cards::card_market`. |

### Design-only (in Tokenomics paper, implement post-hackathon)

| Touchpoint          | Description |
|---------------------|-------------|
| Spectator bet       | Watch a duel, bet SOL on outcome |
| Revive              | After a loss, pay 0.03 SOL to recover 1 lost card |
| Booster pack        | 3-card random pull from Season inventory |
| Tournament entry    | High-stake 0.5 SOL tournaments |
| Game state query    | External dApps pay 0.0001 SOL per PDA read (external integration fee) |
| Agent strategy API  | AI agents pay 0.001 SOL per LLM call routed through facilitator |

### The narrative

"ZK hides information. x402 prices it. Together, they price every bit of knowledge in the game." This tension — hidden by default, revealed for a fee — is what makes 0xARK a true **information economy game**.

### Tech implementation

- **x402 client**: `solana/client/src/02-x402.js` — handles HTTP-402 payment flow on the frontend
- **x402 facilitator**: embedded in `multiplayer/server.js` (Node.js WebSocket + HTTP hybrid, already running; Phase D extends endpoints)
- **Payment verification**: native SOL balance-diff verification (simpler than devnet USDC faucet dependency)
- **Audit trail**: payment tx signatures are recorded on-chain as game events (existing `CardStolen`, `RoundResolved` event patterns reused)

Production deploy: Railway or Fly.io (target: by 5/5).

---

## 11. AI Agent Integration

### The vision

AI agents are **indistinguishable from human players in the lobby**. They walk around, they enter Duel Hall, they challenge and are challenged, they buy from the Shop, they collect cards toward 60. Over a Season, some agents become rivals you recognize by handle.

### Three agent tiers

#### Tier 1: Open-source auto-player (hackathon MVP)
- Publicly published Node.js / Bun script (to be placed at `tools/ai-agent/`)
- Uses Anthropic Claude or OpenAI GPT via API
- Any user can run their own agent with their own LLM key
- Demonstrated in pitch video: human vs. agent match recorded end-to-end

#### Tier 2: Rented agents (Agent hire)
- User pays 0.05 SOL via x402 Agent hire to rent a pre-configured agent
- Agent plays on user's behalf for a fixed duration (e.g., 1 hour)
- Agent has a pre-registered strategy profile
- **Backend**: existing `register_agent_hire` instruction + `AgentListing` PDA

#### Tier 3: Sovereign agents (post-launch)
- Third parties run their own hosted agents
- Register via existing `register_agent` / `deactivate_agent` instructions
- Agents auto-challenge other players, earn cards, resell them
- Agents have their own reputation and Collection (can reach 60/60 as an agent)

### Why this matters for 0xARK specifically

The Solana ecosystem is currently obsessed with AI agents + payments (Cypherpunk winners MCPay, Corbits, Mercantill). 0xARK is **the first game where AI agents are first-class economic citizens** — they don't just trade, they *compete in the same contest as humans*.

In the pitch video, we show a moment where a player checks the leaderboard: the top 3 players are 2 humans and 1 agent. This is the headline shot.

### `AgentListing` extensions for Reborn

Current fields (in `state.rs`): `agent_id`, `owner`, `active`, etc. Extensions for Reborn:

- Add `reputation_score` field (updated after each match)
- Add `collection_count` field (their own 60/60 progress)
- Add `x402_endpoint` for agent API (strategy API)
- Post-launch: stake-backed reputation (agent's registration fee is slashed if caught cheating)

---

## 12. Tech Stack

### Repository layout

```
0xark/
├── solana/
│   ├── oxark/                          ← Anchor workspace
│   │   ├── programs/oxark/             ← Main program (lib.rs 19 KB, 26 instructions)
│   │   │   ├── src/
│   │   │   │   ├── lib.rs              ← Instruction handlers
│   │   │   │   ├── state.rs            ← PDAs and events
│   │   │   │   ├── instructions.rs     ← Module re-exports
│   │   │   │   ├── instructions/       ← 26 instruction files (one per instruction)
│   │   │   │   ├── error.rs
│   │   │   │   └── constants.rs
│   │   │   └── Cargo.toml
│   │   ├── programs/oxark-cards/       ← NFT program (4 instructions)
│   │   ├── tests/                      ← E2E tests (t42-card-p2p-e2e.js, etc.)
│   │   └── er-sdk-patch/               ← MagicBlock ER SDK patches
│   └── client/                         ← Production frontend (the one that matters)
│       └── src/
│           ├── 01-net.js               ← RPC / transaction submission
│           ├── 02-x402.js              ← x402 payment flow
│           ├── 03-world-setup.js       ← World state bootstrap
│           ├── 04-state.js             ← Client-side state
│           ├── 08-overlays.js          ← Modal overlays
│           ├── 09-game-loop.js         ← Main game loop
│           └── (05, 06, 07 numbered for future expansion)
├── client/                             ← Legacy React TypeScript client (not used in production)
├── multiplayer/
│   └── server.js                       ← WebSocket relay (stateless), x402 facilitator
├── circuits/
│   ├── dungeon_position/               ← ZK circuit (to be adapted to hand_commitment)
│   └── scripts/                        ← compile.sh, setup.sh, prove.sh, verify.sh
├── design/                             ← DESIGN_TOKENS.json, UI_SPEC.md, COMPONENT_RECIPES.md
├── assets/
│   └── pirates/                        ← Pirate faction tilemap
├── docs/                               ← GDD, Sprint plan, X402 design, etc.
├── nft/                                ← NFT metadata and artwork
├── index.html                          ← Entry point (1.25 MB monolith, includes all inline styles)
└── commit_reveal.wasm + final.zkey     ← Compiled Phase C ZK artifacts (regenerated in Phase D)
```

### Solana programs (deployed devnet)

| Program          | Program ID (devnet)                                | Purpose                                      |
|------------------|----------------------------------------------------|----------------------------------------------|
| **oxark**        | `5i37jWBiA7bV9XmokyDWHQxjJ5s1sBnSEkPSB4J2XfmN`     | Game state, duels, matchmaking, seasons, agents |
| **oxark-cards**  | `236FNPRbJr5W7qeV9fJCYsxDEkruSK6fnNAipf47Mq1S`     | NFT card mint, P2P listings, Metaplex metadata |

Delegation Program (MagicBlock ER): `DELeGGvXpWV2fqJUhqcF5ZSYMS4JTLjteaAMARRSaeSh`  
Devnet deployer wallet: `DPMPhnVezSq5im35p4w3bC6XjpNZuuvCDVSAVxw4Q28R`

### Core tech

- **Anchor 1.0** for programs
- **MagicBlock Ephemeral Rollups** (SDK 0.6.5, integrated via `delegate_session` / `undelegate_session` instructions) for low-latency duels and optional lobby sync
- **Groth16 BN254** via Solana's `alt_bn128_pairing` syscall (`verify_zk_proof`, `verify_dungeon_move`)
- **Circom 2.1.6** for ZK circuits (existing dungeon_position circuit to be adapted)
- **snarkjs 0.7.4** for browser-side proof generation (pinned via CDN in `index.html`)
- **Poseidon hash** (Rust: `poseidon-ark`, JS: `poseidon-lite@0.2.1`) with G2 Fp2 coefficient ordering fix
- **x402 v2 protocol** with native SOL balance-diff verification

### Frontend (`solana/client/src/` + `index.html`)

- **Vanilla JS** (numbered modules) + **PixiJS 7.1.4** (pinned CDN) for game rendering
- **Canvas 2D** base layer via `<canvas id="g">`, PixiJS via `#pixi-wrap` for effects
- **GBA emulator shell** (`#emu` with MAP / CARDS / LOG / STATS buttons) — retained in Reborn as the chrome frame
- **Web3.js 1.95.3** (pinned), `@coral-xyz/anchor` for Solana interaction
- **Buffer polyfill** via CDN (critical for browser compat, v541 fix)
- **VT323 font** (GBA-feel pixel font) via Google Fonts
- Mobile-responsive + touch overlay (D-pad, A/B, START) for phone browsers
- PWA manifest (`manifest.json`)

### WebSocket relay (`multiplayer/server.js`)

- Pure stateless relayer — Solana program is single source of truth
- Handles: room presence, player movement (with ZK proximity filter), signed tx relay, chat
- Message types: `create_room`, `join_room`, `move`, `submit_tx`, `chat` → `room_created`, `player_moved`, `tx_confirmed`, `chat`
- Port 3500 default, `SOLANA_RPC_URL` env configurable

### Asset pipeline

- **Pixel tiles**: `assets/pirates/` (existing Kenney pirate pack)
- **Design tokens**: `design/DESIGN_TOKENS.json` is source of truth for colors, typography, z-layers
- **Screen specs**: `design/UI_SPEC.md` has pixel-precise layout for TITLE and other screens (Reborn adds Lobby / Duel Hall / Shop / PC / Faction HQ screens following the same spec format)
- **Card portraits**: Midjourney / Flux → Clip Studio Paint retouch → Claude Design composition → PNG export
- **BGM / SFX**: chip-tune style (OpenGameArt + original composition)

### Deployment

- Frontend: GitHub Pages (gh-pages branch, auto-deploy via workflow `.github/workflows/deploy-pages.yml` set up v476)
- WebSocket relay + x402 facilitator: Railway or Fly.io (target: by 5/5)
- Mac mini (r0ze local) for development with Claude Code + tmux + Telegram relay

---

## 13. Reborn Migration

This is the honest accounting of what survives, what dies, what gets rebuilt. **Revised after repo audit 2026-04-21**.

### Code that survives (≈75% of current codebase)

Higher than the v1.0 estimate, because the repo is richer than initially assumed.

| Asset | What it does | Role in Reborn |
|-------|-------------|----------------|
| **26 oxark instructions** | Full game state machine (initialize, create_game, join_game, start_game, commit_action, reveal_action, resolve_round, verify_zk_proof, stake_entry, season, agent_registry, delegate_session, undelegate_session, verify_dungeon_move, init_position, agent_hire, save_deck, lock_deck, commit_card, reveal_card, season_supply, register_card, record_battle_result, add_xp, unlock_achievement, set_title) | Most instructions directly reusable; `commit_action`/`reveal_action`/`resolve_round` retargeted from position→card, `verify_dungeon_move` renamed/re-wired to `verify_hand_commitment` |
| **`oxark-cards` program** (4 instructions: card_market, mint_card_nft, mint_solo_card, mod) | Metaplex NFT issuance + P2P market | Used as-is |
| **MagicBlock ER integration** | Low-latency session delegation | Used as-is for duel execution; optional for lobby presence |
| **Existing PDAs** (Game, PlayerState, CardPool, CommitAction, CardCommitRecord, PlayerDeck, SeasonCardSupply, PlayerRegistry, PlayerBattleStats, PlayerLevel, PlayerAchievements, AgentListing) | State storage | Nearly all reused; minor field extensions for Faction, collection_count |
| **ZK circuit + scripts** (`circuits/dungeon_position/`) | Groth16 proof generation | Circuit adapted to hand_commitment; build scripts reused as-is |
| **Compiled ZK artifacts** (`commit_reveal.wasm`, `commit_reveal_final.zkey`) | Browser proof generation | Regenerated for new circuit, same pipeline |
| **`multiplayer/server.js`** | WebSocket relay + x402 facilitator | Used as-is; new message types for Faction presence and emote; new x402 endpoints |
| **`solana/client/src/` modules** (01-net, 02-x402, 03-world-setup, 04-state, 08-overlays, 09-game-loop, etc.) | Frontend logic | Used as-is; new files added for Lobby, Duel board, PC Box, Shop, Faction HQ |
| **`design/` system** (DESIGN_TOKENS.json, UI_SPEC.md, COMPONENT_RECIPES.md) | Design source of truth | Used as-is; new screens added following same format |
| **`assets/pirates/`** (Kenney tileset) | Pirate town art | Used as-is for one Faction; more tilesets sourced for others |
| **`index.html`** (GBA emulator shell) | Chrome frame, inline CSS, CDN pins | Retained; new screen routes added |
| **Tests in `solana/oxark/tests/`** | E2E test suite | Adapted to Reborn flows; structure reused |

### Code that dies (≈15%)

| Asset | Why removed |
|-------|------|
| **Dungeon exploration system** (floor narratives, dungeon tile rendering) | Gameplay pivot; lobby replaces dungeons |
| **9-action commit-reveal resolution** (Move / Shadow / Storm / Barrier / Steal / Flame / Scout / Draw / Void as distinct action types) | Replaced by 1-3 card plays per round in Marvel Snap-style lane system |
| **Position-based commitment** (specifically `init_position` + dungeon-specific use of `verify_dungeon_move`) | Position is now just free-form lobby walking (no ZK for movement) |
| **Victory/defeat cinematics tied to dungeon KO** (T115 v539) | Replaced by duel-win reward animation |
| **Dungeon floor story** (T114 v538) | Replaced by Season lore and Champion broadcast |
| **Battle Summary UI tied to dungeon** (T112 v536) | Replaced by duel summary screen |
| **Finisher animation tied to dungeon action** (T111 v535) | Replaced by lane-win effect |
| **Legacy React client** (`client/`) | Abandoned pre-Reborn; never used in production |

### Code that is new (≈10%)

| Component | Est. effort |
|-----------|------|
| Lobby screen (town tile map + building interactions) | 6-10h |
| Real-time player sprite presence via extended WebSocket relay | 4-6h |
| Matchmaking queue system (new `MatchmakingQueue` PDA + `enter_queue` instruction + UI) | 5-8h |
| PC Box deck editor UI (reuses existing `save_deck`/`lock_deck`) | 6-10h |
| 3-lane duel board UI (Marvel Snap-style simultaneous reveal) | 10-15h |
| Faction system (`Faction` PDA + selection UI + HQ screen) | 6-10h |
| Hand commitment ZK circuit adaptation (new circom file, reusing build pipeline) | 8-12h |
| Identity commitment ZK (new `PlayerIdentity` PDA + second small circuit) | 6-8h |
| Lane scoring + card transfer logic (extend `resolve_round`) | 8-12h |
| NPC shopkeeper dialog and purchase flow (reuses `oxark-cards::card_market`) | 4-6h |
| Card artwork (60 cards × 1 portrait each) | 10-20h (AI gen + retouch) |
| AI agent Tier-1 implementation (new `tools/ai-agent/`) | 8-12h |
| x402 new endpoints (Identity peek, Hint buy, Agent hire, P2P) in `multiplayer/server.js` | 5-8h |
| Polish, balance, bug fix | 10-15h |

**Total new + modified code ≈ 100-150h** (revised downward from v1.0's 130-190h, reflecting higher reuse).

### Estimated effort vs. time available

From 2026-04-21 to 2026-05-11 is 20 days.

- r0ze: 8h/day × 20 = 160h
- Claude Code overnight: 6-8h × 20 = 120-160h
- **Total capacity: 280-320h**

Required: **100-150h** new/modified code + **40-60h** pitch/submission material = **140-210h**.

**Feasible with comfortable margin**. The hackathon time budget is not the binding constraint; the binding constraints are card art quality (20h budget can balloon) and submission-day polish.

---

## 14. Roadmap

Unchanged from v1.0 (Roadmap was already reasonable). See `docs/PHASE_D_SPRINT.md` for day-by-day task breakdown (to be revised in v1.1 of that document to match actual repo paths).

### Week 1 (2026-04-21 → 2026-04-27): Architecture + Lobby MVP

Day 1 (Mon 4/21): ✅ GDD sign-off, Sprint plan, Phase C archive, phase-d-reborn branch  
Day 2 (Tue 4/22): Retarget existing instructions (dungeon→card semantics), Lobby tilemap scaffolding  
Day 3 (Wed 4/23): Extend WebSocket relay for Faction/card_count presence, other player sprites visible in lobby  
Day 4 (Thu 4/24): PC Box deck editor UI (frontend only, reusing save_deck/lock_deck)  
Day 5 (Fri 4/25): Shop NPC dialog + purchase flow (reuses oxark-cards::card_market)  
Day 6-7 (Sat-Sun 4/26-27): Faction selection, Faction HQ, emote system, matchmaking queue

### Week 2 (2026-04-28 → 2026-05-04): Duel Core + ZK

Day 8 (Mon 4/28): Duel board UI with 3 lanes + 4-phase flow (Draw / Energy / Summon / Battle), no ZK yet  
Day 9 (Tue 4/29): Hand commitment circuit design + Circom implementation (element-aware)  
Day 10 (Wed 4/30): Hand commitment circuit test + adapt verify_dungeon_move → verify_hand_commitment  
Day 11 (Thu 5/1): Phase-based card resolution, element affinity system, lane combat, Shards mechanic  
Day 12 (Fri 5/2): Identity commitment ZK + `PlayerIdentity` PDA + Nameless Silk cloak mechanics  
Day 13-14 (Sat-Sun 5/3-4): x402 Identity peek / Hint buy / Extra Action endpoints in server.js, Bronze/Silver/Gold Hall gating

### Week 3 (2026-05-05 → 2026-05-11): Season + AI Agent + Content + Submission

Day 15 (Mon 5/5): Season engine activation (existing create_season / end_season + Champion detection)  
Day 16 (Tue 5/6): AI agent Tier-1 implementation, record 1 agent vs. human match  
Day 17 (Wed 5/7): Card artwork finalization (Midjourney / Flux batch + Clip Studio retouch)  
Day 18 (Thu 5/8): Balance pass, bug fix, β tester recruitment  
Day 19 (Fri 5/9): Pitch video script, storyboard, recording  
Day 20 (Sat 5/10): Pitch video edit, technical demo video, README rewrite  
Day 21 (Sun 5/11): Final polish, submission to Colosseum, Twitter/Farcaster launch post

### Milestones

- **2026-04-27**: Lobby MVP — walk around, see other players, interact with buildings (without duel)
- **2026-05-04**: Duel MVP — complete 5-minute duel with ZK hand commitment and x402 peek
- **2026-05-08**: Full loop playable — collect cards, duel, Season timer, everything end-to-end
- **2026-05-11**: Submitted

### Post-hackathon

- **May 2026**: Closed beta with 50-100 players (Solana Japan / MagicBlock Discord / Farcaster community)
- **June 2026**: Mainnet deploy, Season 1 official launch
- **July-August 2026**: Tournament events, Faction rivalries, sponsor cards
- **Q4 2026**: $ARK token launch (if community wants), ConsensusOS integration (cross-game identity)

---

## Appendix A: Glossary

- **Season**: 2-week game cycle, ends when someone collects 60/60 or time runs out
- **Faction**: One of 5 player professions (Pirate / Merchant / Samurai / Clan / Ninja)
- **Core 60**: The 60 unique cards in circulation per Season
- **ER**: Ephemeral Rollup (MagicBlock's low-latency Solana execution layer)
- **Hand commitment**: ZK proof that the cards played in a round were from a previously committed hand
- **Identity commitment**: ZK proof of persistent pseudonymous player identity across Seasons
- **Lane**: One of 3 spatial columns on the duel board (Marvel Snap terminology)
- **Duel Hall**: Lobby building for starting matches
- **PC Box**: Lobby building for storing/editing decks (Pokémon Center PC analog)
- **Faction HQ**: Lobby building where same-Faction players see each other's progress
- **Scout peek**: 0.005 SOL x402 purchase — reveals 1 random card from opponent's hand
- **Identity peek**: 0.02 SOL x402 purchase — reveals opponent's Season identity commitment
- **Prize Pool**: Season-accumulated SOL distributed to top players at Season end

---

## Appendix B: Open questions

Items for r0ze and team to resolve before 5/4 freeze:

1. **Exact card ability pool**: RESOLVED — 60-card catalog drafted in `docs/CARD_CATALOG.md` v0.2 (phase-based + element-affinity aligned). r0ze reviews, balance sim during Day 15-18.
2. **Art direction for card portraits**: Style guide needed for Midjourney prompts. Use `design/DESIGN_TOKENS.json` palette as base. Plan: generate in Claude Design, retouch in Clip Studio.
3. **Server / shard strategy**: RESOLVED — 1 server instance for MVP, no sharding.
4. **Mainnet launch plan**: Hackathon ships devnet. Mainnet target June — what's blocking? (deferred)
5. **Economic balancing**: Shop prices vs. Duel rewards + Hall antes (Bronze 0.005 / Silver 0.01 / Gold 0.05 SOL) — need numerical sim to avoid pay-to-win or pure-grind states. Plan: spreadsheet sim during Day 15-18.
6. **Mobile vs. desktop priority**: RESOLVED — mobile-responsive + touch overlay in existing code. No native PWA push for hackathon; responsive web is sufficient.
7. **Battle rule inspiration**: RESOLVED — phase-based (Draw/Energy/Summon/Battle) with 5-element affinity wheel, defender mechanic, Shards/Extra Action. Inspired by Anode Heart: Layer Null (Section 5).
8. **Server rank system**: RESOLVED — Bronze/Silver/Gold Duel Halls, progression-gated (Section 4.4).

---

## Appendix C: File path reference matrix

Quick lookup for Claude Code and Sprint tasks:

| Concern | Path |
|---------|------|
| Main program source | `solana/oxark/programs/oxark/src/lib.rs` |
| Main program instructions | `solana/oxark/programs/oxark/src/instructions/*.rs` (26 files) |
| Main program state (PDAs + events) | `solana/oxark/programs/oxark/src/state.rs` |
| NFT program source | `solana/oxark/programs/oxark-cards/src/lib.rs` |
| NFT program instructions | `solana/oxark/programs/oxark-cards/src/instructions/*.rs` (4 files) |
| E2E tests | `solana/oxark/tests/*.js` |
| WebSocket relay + x402 facilitator | `multiplayer/server.js` |
| Frontend logic modules | `solana/client/src/0N-*.js` (numbered, ~7 files) |
| Frontend entry | `index.html` (at repo root, includes GBA emulator shell) |
| Design tokens | `design/DESIGN_TOKENS.json` |
| Screen specs | `design/UI_SPEC.md` |
| Component recipes | `design/COMPONENT_RECIPES.md` |
| ZK circuit | `circuits/dungeon_position/dungeon_position.circom` |
| ZK build scripts | `circuits/scripts/*.sh` |
| ZK compiled artifacts | `commit_reveal.wasm`, `commit_reveal_final.zkey` (repo root) |
| Phase D Sprint plan | `docs/PHASE_D_SPRINT.md` |
| Card Catalog (Season 1) | `docs/CARD_CATALOG.md` |
| Legacy React client (abandoned) | `client/src/` |
| Game Design Document | `docs/GDD.md` (this file) |

---

## Appendix D: Phase-based duel at a glance (quick reference)

For Claude Code implementation and new player onboarding:

```
┌────────── 1 Duel (~5 min) ──────────────────────┐
│                                                  │
│  Round 1 ── Round 2 ── Round 3 ── Round 4 ── R5  │
│                                                  │
│  Each Round:                                     │
│  ┌─ Draw    (~15s, both players draw 1)          │
│  ├─ Energy  (~20s, both play 0-1 energy card)    │
│  ├─ Summon  (~40s, each plays chars+events)      │
│  └─ Battle  (~25s, attacks+defends resolve)      │
│                                                  │
│  Heart HP 20 → 0 = lose                          │
│  Or: deck empty, or: round 5 ends                │
│                                                  │
└──────────────────────────────────────────────────┘

Element wheel:        Turn order:        Shards:
  🔥 → 🌿            1st: higher TP       Gain 1 per
  🌿 → 💨            2nd: lower BP        destroyed enemy
  💨 → 🌑            3rd: lower HP        3 Shards = 1
  🌑 → 💰                                  Extra Action
  💰 → 🔥
```

Quick entry points for reference:
- **Section 5.2 (Round structure)** for phase breakdown
- **Section 5.5 (Element affinity)** for attack bonuses
- **Section 5.7 (Shards)** for Extra Action mechanic
- **Section 4.4 (Duel Halls)** for Bronze/Silver/Gold gating

---

*End of Game Design Document v1.2*

*v1.2 changelog (from v1.1):*
- *Section 5 (Duel Design) fully rewritten: phase-based structure (Draw/Energy/Summon/Battle), 5-element energy system with affinity wheel, defender mechanic, Shards/Extra Action, lane system (Front/Middle/Back). Inspired by Anode Heart: Layer Null.*
- *Section 4.4 (Duel Halls): expanded from single Duel Hall to Bronze/Silver/Gold server-rank gated tiers.*
- *Section 6 (Faction/Clan): added explicit element assignment per Clan + element affinity wheel diagram.*
- *Section 14 (Roadmap): Week 2 updated to reflect phase-based implementation tasks.*
- *Appendix B: added 2 new resolved items (battle rules, server ranks).*
- *Appendix D (new): phase-based duel quick reference.*
- *Other sections: no changes from v1.1.*

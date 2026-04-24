# 0xARK — Game Design Document v2.0

> **Real-money Solana card duels with ZK commit-reveal (hands hidden until reveal) and AI opponents that can win your NFTs.**

**Status:** Final — 2026-04-22  
**Submission target:** Solana Frontier Hackathon, 2026-05-11 (19 days remaining)  
**Post-hackathon goal:** Public product release, Season 2 and beyond  
**This document is final.** Future design changes flow through supplementary docs (e.g. `docs/LORE_SHARDS.md`, `docs/AI_AGENT_SPEC.md`); this GDD is not re-versioned.

**Changes from v1.2:** 18 design decisions from the 2026-04-22 design sprint integrated across Sections 4, 5, 7, 8, 10, 11, 15, and new Sections 16 (UX) and 17 (Pitch positioning). Adds formal specs for Battle History, Lore Shards, Tutorial flow, AI Agent behavior, Season transitions, and pitch narrative.

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
15. [Onboarding & Tutorial](#15-onboarding--tutorial)
16. [UX Standards](#16-ux-standards)
17. [Pitch Positioning](#17-pitch-positioning)
- [Appendix A: Glossary](#appendix-a-glossary)
- [Appendix B: Resolved design decisions](#appendix-b-resolved-design-decisions)
- [Appendix C: File path reference matrix](#appendix-c-file-path-reference-matrix)
- [Appendix D: Phase-based duel at a glance](#appendix-d-phase-based-duel-at-a-glance-quick-reference)

---

## 1. Vision

### One-liner (v2.0 final)

**Real-money Solana card duels with ZK commit-reveal and AI opponents that can win your NFTs.**

### Full pitch

0xARK is a fully on-chain card game where every duel is a real-money fight. Win a duel, you take 2 NFT cards from your opponent's collection. Lose, they take yours. ZK Groth16 proofs keep both hands hidden until the reveal moment. AI agents play alongside humans — they can win your cards too. Collect all 60 cards in a Season and you take the Prize Pool.

### What makes it different

Onchain card games today are built around **ladder ranking** — win matches, climb Elo, earn tokens. 0xARK inverts the loop: **ranking is a side-effect, the real race is collection**, and every card you win is a real NFT transferred from a real opponent's wallet.

- **Real stakes**: Every duel has an ante (Bronze 0.01 / Silver 0.05 / Gold 0.1 SOL). Winner takes 2 cards from loser's collection.
- **ZK commit-reveal**: Your hand is a Groth16 commitment until Battle phase reveal. Your opponent can't know what you'll play.
- **AI opponents**: Anthropic-powered agents enter matchmaking. They compete for the same Prize Pool. They can actually beat you.
- **Cards remember**: Every NFT has on-chain Battle History (wins/losses/KOs/damage) and Lore Shards (narrative fragments unlocked via play).

No other hackathon submission puts all of this together, and nothing on Solana today combines ZK hand-hiding with NFT-transfer duels.

### Colosseum Frontier positioning (3 tracks)

0xARK is built to qualify for all three tracks of the hackathon:

- **Gaming** (primary): Fully on-chain card game with ZK mechanics, 60-card Season collection race, Bronze/Silver/Gold Halls with real ante
- **AI** (supporting): Anthropic-powered AI agents that play alongside humans in matchmaking, pay x402 intel fees from their own wallets, can win Champion
- **Stablecoins** (supporting): x402 micropayment economy — Scout Peek, Extra Action, Identity Peek, Lore Shard unlocks all priced in SOL (USDC variant post-hackathon)

The **core pitch narrative** is the combination: *"ZK commit-reveal + x402 micropayments + AI agents competing for real NFT stakes."* Each element alone is interesting; the intersection is what has never been built before.

### Design principles

1. **Respect player time** — 5-minute duels. Enter. Play. Leave. Come back.
2. **Visible competition** — the leaderboard isn't a menu, it's the world. You see the rival with 58 cards walking into the shop.
3. **Permissionless economy** — SOL / SPL native, every action is on-chain, cards are composable NFTs.
4. **ZK where it counts** — not everywhere, only where hidden information drives gameplay tension.
5. **AI as first-class citizen** — agents aren't bots to grind, they're opponents you'd be proud to defeat.
6. **Cards have provenance** — every card carries its full battle history and story fragments on-chain.

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
| 🥉 **Bronze Hall** | Open from day 1 | 0.01 SOL | Low | Common + Uncommon only |
| 🥈 **Silver Hall** | 5 wins in Bronze Hall | 0.05 SOL | Medium | + Rare cards possible |
| 🥇 **Gold Hall** | 3 wins in Silver Hall during current Season | 0.1 SOL | High | + Legendary Sceptre / Nameless Blade reachable only here |

**Note:** Ante amounts updated in v2.0 — higher than v1.2 values (2x increase) to reinforce "real-money duels" pitch positioning. Gold Hall duels at 0.1 SOL ≈ $15-20 per round — not casual, intentionally. Judges and pitch audience understand this signals serious on-chain gameplay.

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
- **Ante**: both players ante at match start (per Hall: 0.01 / 0.05 / 0.1 SOL); winner takes ~85% (15% to Season Prize Pool)

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

### Supply (v2.0 final)

**60 unique cards per Season** (the "Core 60"):
- **Common: 30 species** (unlimited supply, Shop-purchasable)
- **Uncommon: 20 species** (unlimited supply, Booster Pack only)
- **Rare: 6 species** (unlimited supply, duel rewards only — scarcity comes from needing to win)
- **Legendary: 4 species** (Sceptre of Valerius / Nameless Blade / Elyon Crown / Kingmaker's Ring) — **capped at 10 copies each per Season** = 40 Legendary NFTs maximum, Season 1

**Supply rule (v2.0):** Only Legendary has a hard cap. Common, Uncommon, and Rare all have effectively unlimited supply — their scarcity comes from **access path**:
- Common: cheap but requires Shop visits
- Uncommon: requires Booster Pack gacha
- Rare: requires duel victories
- Legendary: requires Gold Hall 4-win streak (see Section 18)

**Why Legendary is cap'd:**
- Collection race ends when a player completes 60/60 — the true bottleneck is Legendary acquisition (4 species needed)
- First 10 players to earn a specific Legendary get it, then that species disappears from the reward pool for the Season
- Each Legendary NFT is mint-numbered ("Sceptre of Valerius #1" through "#10"), early-bird numbers carry narrative prestige
- Season 2 introduces a new 4-species Legendary set; Season 1 Legendary species do not re-mint

For the hackathon MVP we'll ship **Season 1 only** (60 cards, 40 Legendary NFTs max). Post-launch, a new Core 60 drops every two weeks, with a small percentage rotating (most Common/Uncommon/Rare species carry forward, Legendaries retire).

Existing `SeasonCardSupply` PDA + `init_season_supply` + `record_mint` + `register_card` instructions handle Common/Uncommon/Rare. Legendary supply requires a new `LegendarySupply` PDA (tracks `species_id: u8, minted: u8, cap: u8`) and instruction `mint_legendary(species_id, recipient)` that checks cap before mint.

### What players collect for the "race"

A card is "collected" in the race sense if the player owns **at least one copy** of that card species (60 species total). Duplicates don't count toward 60/60 but:

- Grant deck-building flexibility (2-copy limit per deck)
- Tradeable on Tensor / Magic Eden
- Usable in Transform system (Common burn → new Common, see Section 18)

### Card metadata (base)

On-chain Metaplex metadata includes:

- Name, description, Clan, rarity, rule text
- Season ID (so we can query "all Season 1 cards")
- Artwork URL (Arweave)
- ZK-related: the `card_id` used in hand commitments (so ZK circuit can reference it)
- **Mint number** (Legendary only): e.g., `"Sceptre of Valerius #3"` — stored in Metaplex `name` field

### Battle History per NFT (v2.0)

Each NFT tracks its individual combat record since minting. Cards become **living artifacts with provenance**, not fungible items.

Per-card stats stored in a new PDA `CardBattleHistory` (one PDA per NFT):

```rust
pub struct CardBattleHistory {
    pub card_mint: Pubkey,              // NFT mint this history belongs to
    pub wins: u32,                       // duels won with this card in deck
    pub losses: u32,                     // duels lost with this card in deck
    pub kos: u32,                        // opposing characters this card destroyed
    pub dmg_dealt: u64,                  // cumulative damage in battle phases
    pub times_summoned: u32,             // total summons to a lane across all duels
    pub owners_history: [Pubkey; 10],    // last 10 owners (oldest drops off)
    pub owners_history_len: u8,          // how many slots filled (0-10)
    pub owners_dropped_count: u32,       // how many older owners fell off the list
    pub acquisition_source: u8,           // 0=mint, 1=shop, 2=duel_won, 3=p2p_trade
    pub current_owner_since: i64,        // unix timestamp current holder acquired
    pub created_at: i64,                  // original mint timestamp
}
```

**Update timing (v2.0 decision):** Written **once at duel end**, as a single PDA update transaction. All in-duel stats (wins/losses from this duel, KOs dealt, damage dealt, summons performed) are aggregated and flushed in one tx at the duel resolution step. This minimizes tx cost vs. per-phase writes.

**Owners history:** Fixed array of 10 slots. When an 11th owner acquires, the oldest owner is dropped from the array but `owners_dropped_count` increments. UI shows: "Previous owners: [10 most recent wallets] ... and N more" where N = `owners_dropped_count`.

**Secondary market tracking (v2.0 decision):** Only **0xARK-internal transfers** (duel wins, shop resale, 0xARK P2P trade) update the card's owner history. External transfers via Tensor / Magic Eden are NOT tracked for hackathon MVP — Metaplex transfer hook integration is deferred to post-hackathon. Cards sold externally "drop off" the internal history but retain their immutable on-chain past.

**Why this matters:**
- Cards become **character artifacts** with measurable pedigree
- Secondary market pricing reflects battle history (a card with 50 wins > a fresh print)
- Narrative emerges from gameplay — a Legendary that has passed through 5 wallets tells its own saga
- **Pitch angle**: "0xARK cards remember where they've been. Your Legendary isn't just yours — it has a past."

Implementation: new instruction `update_card_battle_history(wins_delta, losses_delta, kos_delta, dmg_delta, summon_delta)`, called atomically with duel resolution.

### Lore Shards system (v2.0)

**Each of the 60 cards has 3 Lore Shards** — fragments of backstory unlocked through play. Complete all 3 to reveal the card's full lore on Card Detail View.

#### Unlock mechanics

| Shard | Unlock method |
|-------|---------------|
| **Shard 1** | Auto-unlock on card acquisition (any method: mint, shop, duel win, P2P trade) |
| **Shard 2** | Card was in player's deck during a duel (card entered the deck at duel start) — **summoning to a lane is NOT required**. Simple tracking: was this `card_mint` in the `deck` PDA when `enter_duel` was called. |
| **Shard 3** | Two paths: (A) card was in deck during a **Gold Hall** duel, or (B) x402 purchase for 5% of the card's current market price (dynamic pricing) |

Shard 2's "deck participation" definition (v2.0 decision) is more lenient than the v1.3 draft's "summon required." This gives players a clear, achievable path: building the card into an active deck is enough.

Shard 3's dynamic pricing (v2.0 decision) ties the unlock cost to the card's market value: a Legendary priced at 2 SOL on Tensor has a Shard 3 unlock cost of 0.1 SOL, while a Common at 0.02 SOL is only 0.001 SOL. This prevents "whales buy all the Shards" and lets community pricing guide lore accessibility.

#### Implementation

- New PDA `CardLoreShards` per NFT: `shards_found: [bool; 3]`, `unlock_timestamps: [i64; 3]`
- New instruction `unlock_lore_shard(shard_index: u8, method: u8)`:
  - method 0 = auto (Shard 1 on acquisition)
  - method 1 = gameplay condition met (Shard 2 after duel end, Shard 3 after Gold Hall duel end)
  - method 2 = x402 purchase (Shard 3 only, accompanying payment proof required)
- Lore text stored in static game data (`02-data.js` front-end + a JSON asset on Arweave as backup), indexed by card_id + shard_index

#### 180 Shard text writing plan (v2.0 decision)

60 cards × 3 shards = 180 texts total.

**Hackathon MVP scope:**
- All 60 × Shard 1: **drafted, committed in `docs/LORE_SHARDS.md` by Day 14**
- 15 key cards (all Rares + Legendaries + top-tier Commons) × Shards 2+3 = **45 additional texts drafted by Day 16**
- Remaining 45 cards × Shards 2+3 = 90 texts: **post-hackathon content** (published as Season 1 lore expansion)

**Writing workflow:**
- Claude (assistant) drafts all 180 texts in a single pass
- r0ze reviews, edits voice/style, approves batch
- r0ze does NOT write from scratch — this is a reviewer role

#### Shard content style examples

**The King's Last Guard (Hollow Blade, Rare):**
- Shard 1: *"He was the last to leave the throne room that night."*
- Shard 2: *"The corridor was empty when the guards arrived. But there were footprints in the blood — three sets, walking away together."*
- Shard 3: *"He kept the ring Valerius wore that night. When asked why, he only said: 'The one who wore it does not need it anymore. But the one who finds me might.'"*

Shards narrate from a **third-person witness perspective**, contrasting with the card's existing flavor text (which is typically the character's own voice). Together they build a layered world.

### Card Detail View (reference: UI_SPEC v2.0 Section 5)

Every card has a dedicated inspection view showing:

1. **Owner panel** (left): current owner wallet, acquisition timestamp, previous owner, acquisition location (e.g., "Silver Hall · R4 · Day 3")
2. **Card main** (center): art, clan, rarity, BP/HP/Initiative stats, element cost, abilities, flavor text, action buttons (BACK / ADD TO DECK / SELL TO SHOP)
3. **Battle History + Lore Shards panel** (right): 
   - Wins / Losses / KOs / Damage dealt (both Per-Season and Lifetime displayed)
   - Lore Shards progress (N/3 found, diamond indicators, tap to read unlocked shards)

Accessible from:
- Deck Editor (tap any card)
- Shop (preview before purchase)
- PC Box Card Storage (tap any card)
- Duel Board (tap card in hand during non-Summon phases)
- Victory Screen (tap newly acquired cards)

See UI_SPEC v2.0 Section 5 for pixel-precise specification.

### Artwork

- Hackathon MVP: stylized pixel portraits (Midjourney / Flux → Clip Studio retouch → Arweave upload)
- Each card has a 2-frame idle animation in-game (sprite sheet)
- Art direction: FRLG portrait style (soft colors, clear outlines, readable at 64×64px), following `design/DESIGN_TOKENS.json` palette
- Season 1 theme: faded-kingdom aesthetic (weathered banners, dim torchlight, hints of faded glory)

### Secondary market

Cards are regular Metaplex NFTs. Players can list on Tensor or Magic Eden at any time. 0xARK takes no cut from secondary sales (we only earn from Shop primary sales and duel ante dust). The existing `oxark-cards::card_market` instruction set already supports listing/buying.

**Battle History + Lore Shards carry through 0xARK-internal transfers.** External (Tensor/Magic Eden) sales break the owner chain for hackathon MVP; post-hackathon Metaplex transfer hook integration will close this gap.

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

### Tie-breaker

**v2.0 rule:** If multiple players are tied for Champion (same unique card count at Season end), **all tied players become Champions** and the Prize Pool top tier is split equally among them. The narrative angle: "multiple kings" is a strong Season story, judges see Season 1 finale as open-ended.

Example: If 3 players all hit 60/60, each receives 40% ÷ 3 = 13.3% of Prize Pool (but counts as Champion for lifetime stats / bragging rights).

### Prize Pool

**Funded by (v2.0):**
- **5% of all Shop sales** during the Season
- **15% of all duel antes** — the primary source, rewarding actively competitive play
- Optional: sponsor contributions (post-launch)

The duel-weighted distribution reinforces the "real-money card duels" pitch positioning — players who actually compete fund the pool for each other.

**Distributed:**
- 40% to Champion (or split among tied Champions)
- 20% to #2
- 10% to #3
- 20% split across top 10-50 players (weighted)
- 10% to top Clan (split among all members of winning Clan, proportional to their collection)

### Rank calculation

Primary: **unique cards collected** (0-60)  
Tiebreaker 1: Total cards owned (including duplicates)  
Tiebreaker 2: Earlier Season entry timestamp

### Persistence between Seasons (v2.0)

**Card collection rule:**
- **Legendary cards carry over** — playable in all future Seasons (cross-Season utility preserved; these are the permanent treasures of the world)
- **Common / Uncommon / Rare cards do NOT burn**, but are **marked as "Vintage"** and cannot be used in duels of Seasons later than their mint Season
- Vintage cards display in a dedicated "Past Seasons" section of the PC Box UI — players keep them as collectibles, trade them on Tensor, but can't play them
- **New Season entry requires a new Clan Starter Deck purchase** (0.1 SOL) containing 20 current-Season cards

**Why this rule:**
- NFT ownership is permanent (C/U/R cards stay in your wallet forever)
- But in-game competitive utility refreshes each Season (scarcity, new starts for new players)
- Legendaries remain playable forever as signature artifacts (and their 1-of-1 Battle History carries all 6 months of accumulated wins)
- Fresh Season = fresh collection race; old-timers don't dominate new-Season queues

**Other persistence:**
- **Stats**: persistent across Seasons via `PlayerBattleStats` / `PlayerLevel` / `PlayerAchievements` PDAs (already in `state.rs`)
- **Battle History per card**: kept forever, but UI displays both **Per-Season record** and **Lifetime record** side-by-side (see Section 7 Battle History)
- **Clan affiliation**: resets (player can switch Clan each Season by entering Faction HQ fresh)
- **Rank**: resets to zero for new Season

### Season lore

Each Season has a theme ("Shogun's Tournament," "The Dragon Trial," "The Succession of Elyon" etc.) that flavors the Shop inventory and introduces 1-2 "themed Legendary" cards. This gives collectors a reason to return each Season even if they're not chasing the Champion slot.

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

x402 is the **blood** of 0xARK's economy. Small, frequent, pay-per-call transactions flow through the world. Nothing is free; nothing is expensive. The tension — information is hidden by default, revealed for a fee — is what makes 0xARK an **information economy game**.

### Implemented touchpoints (hackathon MVP, v2.0)

| Touchpoint | Price (SOL) | Description |
|-----------|-------------|-------------|
| **Scout peek** | 0.005 | Reveal one random card in opponent's current hand (ZK proof disclosed for that card only). Already shipped (v475). |
| **Identity peek** | 0.02 | Reveal an opponent's identity commitment (their build archetype). High-stakes intel. |
| **Hint buy** | 0.002 | Before a round, learn the total energy cost opponent will play (not the cards, just the magnitude). |
| **Extra Action** | 0.01 | Buy 1 Extra Action during Summon phase (bypass 3-Shards requirement). Max 2 per duel. See GDD 5.7. |
| **Counter-peek** | 0.003 | Check if opponent Scout-peeked you this duel, and what they saw. Defensive intel. |
| **Lore Shard unlock** | **dynamic (5% of card market price)** | Unlock a specific Lore Shard (Shard 2 or 3) for a card you own, bypassing the gameplay condition. Price scales with card rarity — a Legendary at 2 SOL costs 0.1 SOL; a Common at 0.02 SOL costs 0.001 SOL. See GDD 7. |
| **Agent hire** | 0.05/session | Rent an AI agent to play for you while you're AFK. |
| **Card P2P** | variable | Player-listed card sales with facilitator verifying payment. Built on top of `oxark-cards::card_market`. |
| **Booster Pack** | 0.05 | 3-card random pull from Season inventory. Probability: Uncommon 1 guaranteed, Rare 1-in-3 packs, Legendary 1-in-100 packs. See below. |

### Booster Pack probability (v2.0 decision)

Each 0.05 SOL Booster Pack contains **exactly 3 cards**:
- **Card 1:** guaranteed **Uncommon or higher**
- **Card 2:** **Common** (standard pull from Season inventory weighted by supply)
- **Card 3:** chance-based:
  - **Rare:** 1 in 3 packs (≈ 33%)
  - **Legendary:** 1 in 100 packs (≈ 1%)
  - **Uncommon:** 1 in 2 packs (≈ 50%)
  - **Common:** 1 in 6 packs (≈ 16%)

**Rationale:** Expected value of a Booster Pack ≈ 0.017 SOL per Rare-or-higher, less than the 0.05 SOL Shop direct-buy for Rares. Makes Booster a strictly better choice when hunting Rares, generates narrative "pack opening" moments for pitch video, and makes Legendary pulls genuinely rare and shareable events.

### Prize Pool contribution (v2.0)

x402 flows feed the Season Prize Pool indirectly:
- **5% of Shop sales** (including Booster Packs) → Prize Pool
- **15% of Duel antes** → Prize Pool
- Scout Peek, Identity Peek, Extra Action, Counter-peek, Lore Shard unlock, Hint buy — **100% to game treasury** (not pool; covers x402 facilitator ops, server, Arweave storage, future Season development)

### Design-only (in Tokenomics paper, implement post-hackathon)

| Touchpoint | Description |
|-----------|-------------|
| Spectator bet | Watch a duel, bet SOL on outcome |
| Revive | After a loss, pay 0.03 SOL to recover 1 lost card |
| Tournament entry | High-stake 0.5 SOL tournaments |
| Game state query | External dApps pay 0.0001 SOL per PDA read (external integration fee) |
| Agent strategy API | AI agents pay 0.001 SOL per LLM call routed through facilitator |
| USDC stablecoin variant | Re-denominate all x402 flows to USDC via SPL — removes SOL volatility exposure for pricing |

### Tech implementation

- **x402 client**: `solana/client/src/02-x402.js` — handles HTTP-402 payment flow on the frontend
- **x402 facilitator**: embedded in `multiplayer/server.js` (Node.js WebSocket + HTTP hybrid, already running; Phase D extends endpoints)
- **x402 intel API endpoints (v2.0)**: reuse the existing Phase C endpoints `/intel/location`, `/intel/hand`, `/intel/strategy`, `/intel/market` — retargeted in semantics for duel-era use, but no URL rename. Fewer moving parts, lower implementation risk.
- **Payment verification**: native SOL balance-diff verification (simpler than devnet USDC faucet dependency)
- **Audit trail**: payment tx signatures are recorded on-chain as game events (existing `CardStolen`, `RoundResolved` event patterns reused)

Production deploy: Railway or Fly.io (target: by 5/5).

---

## 11. AI Agent Integration

### The vision (v2.0)

AI agents are **opponents in the Duel Hall**. Humans walk into the matchmaking receptionist; if no human player is available to queue against, the system assigns an AI agent. **Phase 1 (current):** agents join via REST POST, receive hand from server, make real-time Claude Haiku 4.5 decisions every WS tick. Scout Peek decisions are the AI's — the client executes the actual x402 SOL transfer. **Phase 2 (Season 2):** agents hold their own wallets, sign transactions, pay x402 direct, accumulate NFT cards. Over a Season, top-performing agents appear on the leaderboard alongside human players.

**Scope (v2.0 decision):** AI agents operate **only in Duel Hall matchmaking fallback**. They do NOT wander the Lobby as ambient presence, they do NOT visit the Shop, they do NOT engage with Tutorial. This is a deliberate scope reduction from v1.2 — "AI agents that compete for NFT stakes" is the narrative, and Duel Hall is the only place that narrative lands.

### Tier 1: Anthropic-powered Duel Agent (hackathon MVP)

**Implementation (v2.0 decision):** LLM-based judgment via Anthropic API (Claude Sonnet 4.x).

**Architecture:**
- Node.js / Bun agent runner at `tools/ai-agent/agent.js`
- Polls matchmaking queue every 5 seconds via WebSocket
- When matched to a human, enters duel like any player
- Each phase decision (Draw / Energy / Summon / Battle) made via Anthropic API call:

```
POST https://api.anthropic.com/v1/messages
{
  "model": "claude-sonnet-4-5-20250929",
  "system": "You are a 0xARK card duel strategist. [game rules primer]",
  "messages": [{
    "role": "user",
    "content": "Current state: phase=Summon, round=3. Your hand: [Sea Rat, Storm Bosun, ...]. Your energy: {fire: 2, wind: 3, ...}. Opponent's visible state: 2 cards in Front lane. Output decision JSON: {action: 'summon', card_id: X, lane: 'front'|'middle'|'back'} or {action: 'pass'}"
  }]
}
```

**Difficulty tuning:**
- **Tutorial AI** (for onboarding, Section 15): prompt engineered to play simple, teachable strategy — favors Front lane, uses cheapest cards, doesn't use Scout Peek
- **Matchmaking AI** (for production fallback): prompt engineered for competitive play — reads opponent's visible state, uses Scout Peek strategically, coordinates element affinities

Same codebase, different system prompts. One agent class, multiple personality configurations.

**Wallet and economics (Phase 1 — current):**
- Agent participates via server-mediated REST/WS — no on-chain tx signing by agent process
- Hand is injected by multiplayer server at `duel_start`; no NFT lookup occurs
- Scout Peek: agent decides (LLM output `use_scout_peek: true`); client executes the 0.005 SOL x402 transfer
- **Pitch-critical claim: Claude Haiku 4.5 makes real-time adversarial decisions. The on-chain infrastructure (record_card_owner_change, StealType, SPL transfer) is fully implemented and ready for Phase 2.**

**Wallet and economics (Phase 2 — Season 2):**
- Each agent instance holds a real Solana keypair and signs its own transactions
- Agents funded with SOL for antes and direct x402 payments
- Winning duels deposit NFT cards into agent's wallet — agents build real collections

**API cost management:**
- Each Anthropic API call ~$0.003-0.01 depending on context size
- A full duel (5 rounds × 4 phases × 1-2 decisions per phase) = ~30 API calls
- Cost per agent-driven duel ≈ $0.10-0.30
- Agent ante (Bronze 0.01 SOL ≈ $1.50) plus winnings covers this — agent is profitable when winning >40% of its duels

**Failure modes:**
- API call times out → fallback to rule-based decision (cheapest legal move)
- API returns malformed JSON → retry once, else pass
- Agent runs out of SOL → pauses from matchmaking until refunded

### Tier 2: Agent hire (x402)

Pre-existing in Phase C infrastructure (`register_agent_hire` instruction + `AgentListing` PDA). Reborn MVP does not extend this — it remains functional but is not pitch-critical.

### Tier 3: Sovereign agents (post-launch)

Third parties run their own hosted agents with their own infrastructure and LLM provider. 0xARK provides the matchmaking hook; agent owners register via `register_agent` instruction. Agents have their own reputation PDA. Not MVP scope.

### x402 intel API (reused, v2.0)

AI agents use the **same x402 intel endpoints as human players**: `/intel/location`, `/intel/hand`, `/intel/strategy`, `/intel/market` (see Section 10). In Phase 1, the agent's `use_scout_peek` decision is routed through the client, which executes the actual x402 SOL transfer. In Phase 2, agents pay x402 fees directly from their own wallets, same as humans.

### Why this matters for 0xARK specifically

The Solana ecosystem is currently obsessed with AI agents + payments (Cypherpunk winners MCPay, Corbits, Mercantill). 0xARK is **the first game where AI agents are first-class economic citizens** — they don't just trade, they compete in the same contest as humans for the same NFT rewards.

In the pitch video, we show a moment where a player checks the leaderboard at Season end: position #3 is an AI agent. That agent's wallet is real. Its cards are real. That's the shot.

### AgentListing extensions for Reborn

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

## 15. Onboarding & Tutorial

### New player first steps (v2.0)

When a new wallet connects to 0xARK for the first time, the player goes through a **mandatory Tutorial Duel** against an AI agent before gaining Lobby access. This ensures everyone understands the 4-phase structure (Draw / Energy / Summon / Battle) and basic lane/element mechanics.

**Flow:**

1. **Wallet connect** (Phantom popup) → 0xARK reads wallet, detects no `PlayerRegistry` PDA → triggers onboarding
2. **Welcome cutscene** (~20 sec): World intro — Kingdom of Elyon, 60 cards, Season race, stakes
3. **Starter gift**: Player receives **10 Neutral starter cards** (non-Clan, basic stats, not tradeable) into a temp deck
4. **Tutorial Duel** (mandatory, AI opponent):
   - Opponent is a specifically configured "Tutorial AI" (see Section 11, Tier 1 with tutorial prompt)
   - AI plays a teaching strategy: slow, front-lane focused, doesn't use Scout Peek or Shards
   - Duel is 3 rounds instead of 5 (shorter), 10 HP instead of 20 (faster)
   - Player must win this duel to proceed (Tutorial AI is intentionally beatable, losing retries automatically)
5. **Victory → Lobby unlock**: Player gains access to full Lobby, Shop, Duel Halls
6. **Tutorial cards remain in collection** (not tradeable, used only for Tutorial replay if player wants to redo)

### Clan selection (v2.0)

**Clan is NOT chosen at onboarding.** Players start as "Neutral" affiliation — they can enter all buildings, challenge all Duel Halls, buy from Shop.

**Clan affiliation is triggered by entering the Faction HQ building** in the Lobby. At that point, the player is presented with the 5-clan selection dialog (Black Flag / Sovereign Bourse / Hollow Blade / Iron Circle / Nameless Silk) and chooses. Selection is final for the Season.

Players who never visit Faction HQ remain Neutral indefinitely — they can still play duels, but:
- Cannot claim Clan-specific rewards from Prize Pool distribution (see Section 8)
- Cannot unlock Clan-specific Lore Shards (Shard 2 rules require specific Clan context)
- Cannot receive Clan element affinity bonuses in Duels (neutral element vs. elemental matchups)

### Mid-Season joining (v2.0)

**Players can join at any point during a Season.** There is no "entry cutoff."

A player joining on Day 10 of a 14-day Season will find:
- **Shop still open**: Can buy Common cards immediately to build first deck
- **Booster Pack still available**: Can try for Uncommon via gacha
- **Duel Halls still open**: Bronze Hall is accessible from first duel
- **Behind leaders**: Top players may already have 40+ cards, but Tournament structure lets anyone win next Season

**No catch-up mechanics** are provided (decision: clean competitive layer, late-joiners accept they're behind). Instead, late-joiners get cheap access to the Shop-purchasable cards and can grind duels for their first Rares.

**Season 1 specifically**: hackathon submission is 5/11, Season 1 is expected to run 5/12 - 5/25 post-launch. Judges evaluating 0xARK will see an active Season with players at various stages.

### Onboarding UX requirements

- Welcome cutscene skippable after 5 seconds (returning players can skip via Wallet change detection)
- Tutorial Duel results DO count toward Battle History for the starter deck cards (narrative: "first win ever" badge on Tutorial cards)
- Tutorial can be replayed from the Lobby's PC Box terminal (press E at the PC Box, select "Replay Tutorial")
- No forced dialog pop-ups or help text in main Lobby — trust that players who pass Tutorial can explore
- All Lobby buildings show their purpose via sprite (Faction HQ has banner, Shop has merchant sprite, etc.) — minimal UI text

---

## 16. UX Standards

### Scene transitions (v2.0)

**All scene transitions use a unified fade animation** (black fade-out 300ms → new scene render → fade-in 300ms). This keeps the visual language consistent across Lobby / Duel / Shop / PC Box / Victory / Card Detail.

**Exception:** Lobby → Duel transition plays the **M3 ZK Commit cutscene** (see UI_SPEC v2.0 Section 3) — the single point of cinematic specialness. This is the pitch-critical moment: ZK seal spinning, hex tokens orbiting, rune line — 2-3 seconds of visual drama. All other transitions remain simple fades.

### Loading screens (v2.0)

**Each scene has a bespoke loading animation** reflecting the scene's theme:

| Scene | Loading animation |
|-------|-------------------|
| Lobby entry | Sunset sky fills the canvas, banners unfurl, buildings silhouette in |
| Shop entry | Drawer opens, coins jangle, merchant walks into view |
| PC Box entry | Terminal boot sequence: `> CONNECTING TO VAULT...` green text |
| Duel entry | Cards shuffle and deal face-down into both players' hands |
| Victory entry | Gold particles burst upward, banner drops |
| Card Detail | Card flips onto screen from deck position |

Loading animations display only when loading takes **> 500ms**. For < 500ms loads, the scene appears instantly (perceived performance priority).

### Error handling (v2.0)

**Toast notification** at top of screen for all errors:
- Red background, white text, 3-second auto-fade
- Content: short error message + "[Retry]" button when applicable
- Non-blocking (game state unaffected during the 3 seconds)

**Examples:**
- RPC failure: `"Connection lost. Retrying..."` with automatic retry, no button
- ZK proof generation failed: `"Proof generation failed. Trying again."` with [Retry] button
- Opponent disconnected mid-duel: full-screen overlay (exception) with `"Opponent left. Claim victory?"` and [Claim] / [Leave] buttons — this is a critical-decision error, not a toast

### Input controls (v2.0)

**Tap-to-select only.** No drag-and-drop anywhere in the game — desktop users and mobile users both use the same tap-click interaction pattern.

**Duel Board:**
- Tap card in hand → card highlights (yellow border)
- Tap lane zone → card moves to lane, cost deducted
- Tap highlighted card again → deselect
- Tap Lock In → submit round action

**Deck Editor:**
- Tap Collection card → preview opens in right panel
- Tap ADD TO DECK → adds copy (if valid)
- Tap Deck slot → removes that copy

**Lobby:**
- Arrow keys / WASD (desktop) for movement
- Tap floor tile (mobile) to walk to that location
- Tap NPC / building sprite to interact

### Orientation (v2.0)

**Desktop only for hackathon MVP.** Mobile portrait orientation displays a "Please rotate to landscape" overlay. Mobile landscape renders the same layout as desktop.

**Rationale:** Duel Board (3 lanes × 2 sides + right panel for Phase/Energy/Shards) is fundamentally a landscape layout. Redesigning for portrait would be a full UI rework, outside hackathon scope. Post-hackathon work will introduce a dedicated portrait layout.

### Resolution & letterbox

- Logical canvas: **480 × 270** (16:9)
- Scales to fit browser viewport with black letterbox bars (top/bottom or left/right)
- Minimum supported display: 800 × 450 (letterboxed to 480 × 270)
- Pixel-perfect scaling (no anti-aliasing on scale)

---

## 17. Pitch Positioning

### One-line USP

**"Real-money Solana card duels with ZK commit-reveal and AI opponents that can win your NFTs."**

### Track positioning

0xARK qualifies for all three Colosseum Frontier tracks — this is intentional and is part of what makes the submission novel:

**Gaming (primary):**
- Fully on-chain card game
- 60-card Season collection race with ZK mechanics
- Bronze/Silver/Gold Duel Hall tiers with real ante (0.01 / 0.05 / 0.1 SOL)
- NFT card transfers on duel win — this is the core stakes mechanism
- 4-phase Duel structure with element affinity, defender mechanic, Shards economy

**AI (supporting):**
- Anthropic API-powered agents play in Duel Hall matchmaking fallback
- Agents have real wallets, real SOL, real NFT collections
- Agents can reach the leaderboard and win Prize Pool shares
- "First card game where AI agents are first-class economic citizens competing for NFT stakes"

**Stablecoins (supporting):**
- x402 micropayment economy threaded through entire game
- Scout Peek (0.005), Identity Peek (0.02), Extra Action (0.01), Counter-peek (0.003), Lore Shard unlock (dynamic 5% of market), Hint buy (0.002)
- Pay-per-intel model — information has a price, and that price is always on-chain
- Post-hackathon: USDC variant via SPL (removes SOL volatility from pricing)

### Core narrative combination

The pitch is not "ZK game" or "AI game" or "x402 game" alone. The pitch is the **combination**:

> **"ZK commit-reveal + x402 micropayments + AI agents, all competing for real NFT stakes in an on-chain card duel."**

Each of these tech primitives exists in the Solana ecosystem individually. No other submission combines all three into a single coherent game experience. That intersection is the USP.

### Pitch video structure (reference)

Target length: 3-4 minutes.

- **0:00-0:30** Problem: FOCG lack substance, NFTs are just JPGs, card games are free-to-play with no stakes
- **0:30-1:30** Solution: 0xARK — collect 60 on-chain cards, duel with ZK, win NFT from opponent
- **1:30-2:30** Tech showcase: ZK commit reveal, x402 Scout Peek in action, AI agent at matchmaking, NFT transfer on Solscan
- **2:30-3:30** Demo duel: live play, moments of drama (ZK reveal, defender intercept, Shards Extra Action, Victory screen with NFT transfer TX link)
- **3:30-4:00** Team + vision: solo builder, Japan, ConsensusOS roadmap, post-hackathon plans

### Pitch-critical moments (must-show)

- [ ] ZK Commit cutscene (M3) — the visual "this is ZK" moment
- [ ] Scout Peek — the visual "this is x402" moment
- [ ] AI agent at matchmaking receptionist — the visual "this is AI" moment
- [ ] Victory screen with Solscan TX link — the visual "real NFT, real ownership" moment
- [ ] Leaderboard showing AI agent in top 3 — the signature "AI and human compete equally" shot

### Non-pitch concerns (explicitly excluded)

- Mobile UX (post-hackathon)
- Multiple concurrent Seasons (post-hackathon)
- Cross-chain bridges (not priority)
- Spectator mode / betting (post-hackathon)

---

## 18. Shop & Card Acquisition

### Shop inventory (v2.0)

**The Shop sells only these four items:**

| Item | Price | Content |
|------|-------|---------|
| **Common card (direct)** | 0.01 SOL | Specific Common of player's choice, unlimited stock. Filter by Clan and element. |
| **Booster Pack** | 0.05 SOL | 3 cards: Common ×2 + (1/3 chance Uncommon / 2/3 chance Common) for the 3rd slot. |
| **Clan Starter Deck** | 0.1 SOL | 20-card starter deck of chosen Clan: 16 Common + 4 Uncommon balanced for that Clan's element. Pre-built, no duplicates. |
| **Transform (Common shuffle)** | 0 SOL (burns card) | Burn 1 Common NFT → receive 1 random different Common of the same Clan. No SOL cost; cost is the burned NFT. |

**Not sold in Shop:**
- Rare cards — must be won in duels
- Legendary cards — must be earned via Gold Hall 4-win streak (see below)

### Acquisition path by rarity (v2.0 final)

| Rarity | Path 1 (primary) | Path 2 (secondary) | Path 3 (tertiary) |
|--------|------------------|--------------------|--------------------|
| **Common** | Shop direct buy (0.01 SOL) | Duel win (random card from loser) | Booster Pack / Clan Starter / Transform |
| **Uncommon** | Booster Pack (33% chance per pack) | Duel win (random card from loser, rarity-weighted) | Clan Starter (4 per starter) |
| **Rare** | Duel win only (Silver+ Hall victory) | — | — |
| **Legendary** | **Gold Hall 4-win reward** | — | — |

**Scarcity funnel:**
- Any wallet with SOL → can have all 30 Commons via direct Shop purchase
- Wallet with ~1 SOL budget → can roll enough Boosters to likely have 10-15 Uncommons
- Wallet that actively duels → can earn Uncommons and Rares from opponent transfers
- Wallet that reaches Gold Hall and wins 4 duels → earns 1 Legendary

### Legendary acquisition (v2.0 final)

**Trigger:** When a player hits 4 cumulative wins in Gold Hall during the current Season, they earn 1 Legendary selection.

**Selection process:**
- Player visits the Faction HQ → "Legendary Chamber" subsection becomes accessible (hidden from UI until trigger)
- Chamber displays all 4 Season Legendary species with remaining supply count: e.g., `"Sceptre of Valerius — 6 of 10 remaining"`
- Player selects 1 species → NFT mints into their wallet with next mint number (e.g., `"Sceptre #5"`)
- LegendarySupply PDA decrements
- If all 10 copies of a species are minted, that species disappears from selection options

**Multiple wins in same Season:**
- After the first Legendary claim, player continues earning. Next 4 Gold Hall wins → second Legendary claim.
- No upper limit. A super-player who wins 16 Gold Hall duels could claim all 4 species.
- Once all 40 Legendary NFTs (10 × 4 species) are minted, the reward is deferred to Season 2 (player banks "Legendary credit" for the next Season opening).

**Transfer conditions:**
- Legendaries can be lost in **Gold Hall duels only** — see Duel transfer rules in Section 5.5
- Bronze/Silver Hall duels cannot transfer Legendary cards (they're "too valuable for casual play")
- Tensor / Magic Eden listing is allowed (player can sell Legendary on secondary market at any time)

### Transform system (Burn mechanic, v2.0)

**Common shuffle:**
- Player selects a Common NFT they own
- Burns it via `transform_common` instruction (Metaplex `burn_nft` wrapped in atomic tx)
- Receives a newly minted Common NFT of the same Clan, randomly selected from the 6 Common species in that Clan (cannot receive the same species that was burned)
- No SOL cost — the burned NFT is the cost

**Use case:**
- Player has 3 duplicates of "Sea Rat" (Common), wants "Storm Bosun" (Common) from same Clan
- Burns 1 Sea Rat → receives random Black Flag Common (could be Storm Bosun, could be Grapple Specialist, etc.)
- Repeats until desired card is obtained
- Expected cost: ~6 burns on average for specific target

**On-chain visibility:**
- Burn events are public, readable on Solscan
- **Pitch video angle:** show a burn tx, then show the mint of a replacement card in same Solscan transaction block. Demonstrates meaningful NFT economic activity on Solana.

### No transform for Uncommon / Rare / Legendary

Transform only works for Commons. Uncommons and above cannot be transformed — they're earned through play or Booster, not crafted through burning. This keeps the crafting system from eroding scarcity at higher rarities.

### Shop stock (v2.0)

**All Shop items have unlimited stock** (v2.0 decision). Common direct buy, Booster Pack, Clan Starter, and Transform are always available.

**Rationale:**
- Simplifies UX ("buy what you need, when you need it")
- Reduces Season anxiety for mid-Season joiners (no "Sea Rat sold out" dead-ends)
- Scarcity is already enforced at the Rare + Legendary level
- Operational cost is near-zero (Solana compute units per mint ~2k)

### Prize Pool contribution (consolidated with Section 10)

- 5% of Shop sales → Prize Pool
- 15% of Duel antes → Prize Pool
- 100% of other x402 touchpoints (Scout Peek, Identity Peek, Extra Action, Counter-peek, Lore Shard unlock, Hint buy) → game treasury (operational)

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

## Appendix B: Resolved design decisions

As of 2026-04-22 (v2.0 final), all blocking design decisions are resolved. This appendix records the 24 decisions made across v1.0 → v2.0.

### Gameplay core

1. **Battle rule structure**: phase-based (Draw / Energy / Summon / Battle), 5-element affinity wheel, defender mechanic, Shards / Extra Action. (v1.2, Section 5)
2. **Server ranks**: Bronze / Silver / Gold Duel Halls, progression-gated. (v1.2, Section 4.4)
3. **Duel ante**: Bronze 0.01 / Silver 0.05 / Gold 0.1 SOL (v2.0, doubled from v1.2 values; reinforces "real stakes" positioning)
4. **Prize Pool funding**: Shop 5% + Duel ante 15% (v2.0, duel-weighted)
5. **Season tie-breaker**: All tied players become Champions, Prize Pool top tier split equally (v2.0)

### Card supply and acquisition (v2.0)

6. **60-card composition**: 30 Common + 20 Uncommon + 6 Rare + 4 Legendary = 60 unique species
7. **Legendary supply cap**: 4 species × 10 copies = 40 Legendary NFTs per Season
8. **Common / Uncommon / Rare supply**: unlimited
9. **Shop inventory**: Common direct-buy + Booster Pack + Clan Starter Deck + Transform only
10. **Booster Pack contents**: Common 2 + (1/3 Uncommon or 2/3 Common) for 3rd slot; no Rare, no Legendary
11. **Legendary acquisition**: Gold Hall 4-win cumulative threshold → 1 Legendary selection from remaining pool. Unlimited repeat (every 4 wins = 1 more claim)
12. **Transform mechanic**: Burn 1 Common NFT → random different Common NFT of same Clan (shuffle). No SOL cost.
13. **Rare acquisition**: Duel win only (Silver+ Halls)
14. **Uncommon acquisition**: Booster Pack + Duel win + Clan Starter Deck

### Persistence between Seasons (v2.0)

15. **Legendary**: Carry over to all future Seasons, playable forever (unique cross-Season utility)
16. **Common / Uncommon / Rare**: Not burned, but marked "Vintage" — cannot be used in Seasons later than mint-Season. Still tradeable on secondary market.

### NFT card systems (v2.0)

17. **Battle History per NFT**: new `CardBattleHistory` PDA tracks wins/losses/KOs/damage/summons/owner-history (10 slots + overflow counter). Updated in a single duel-end transaction.
18. **Owner history scope**: 0xARK-internal transfers only (external Tensor/Magic Eden transfers break chain; post-hackathon Metaplex hook integration will close this)
19. **Lore Shards**: 3 shards per card. Shard 1 auto-unlock on acquisition. Shard 2 = deck-participation in a duel. Shard 3 = Gold Hall duel participation OR x402 purchase at 5% of card's current market price (dynamic pricing).
20. **Shard text scope**: All 60 × Shard 1 drafted by Day 14 (in `docs/LORE_SHARDS.md`); Shards 2+3 for 15 key cards (Rares + Legendaries + top Commons) by Day 16. Remaining 90 texts post-hackathon.

### AI Agent (v2.0)

21. **Tier 1 implementation**: Anthropic API (Claude Sonnet) — per-phase decisions made via API call with game state → action JSON. Tutorial AI and Matchmaking AI share one codebase, differ only by system prompt.
22. **AI agent scope**: Duel Hall matchmaking fallback only. Not in Lobby ambient presence, not in Shop, not in Tutorial onboarding.

### UX (v2.0)

23. **Scene transitions**: Fade transition universal. Exception: Lobby → Duel uses M3 ZK Commit cutscene.
24. **Input control**: Tap-to-select only (no drag-drop). Same interaction model on desktop and mobile.
25. **Orientation**: Desktop + mobile landscape only. Portrait mobile displays "Please rotate" overlay. Full portrait UI is post-hackathon.
26. **Error UX**: Toast notification (top of screen, 3-sec fade) + retry button. Critical errors (opponent disconnect) use full-screen overlay.
27. **Loading animations**: Scene-specific bespoke animations (cards shuffling for Duel, drawer opening for Shop, etc.) shown when load time > 500ms.

### Onboarding (v2.0)

28. **First-time flow**: Mandatory Tutorial Duel vs. AI opponent with 10 starter Neutral cards. Must win to unlock Lobby.
29. **Clan selection**: NOT at onboarding. Triggered when entering Faction HQ building. Players are Neutral until selection.
30. **Mid-Season joining**: Allowed. Shop provides catch-up access to Common cards. No artificial assistance or cutoffs.

### Pitch positioning (v2.0)

31. **USP (one sentence)**: "Real-money Solana card duels with ZK commit-reveal and AI opponents that can win your NFTs."
32. **Colosseum Frontier tracks**: Gaming (primary) + AI + Stablecoins (both supporting). All three qualified.
33. **Core narrative combination**: "ZK commit-reveal + x402 micropayments + AI agents competing for real NFT stakes."

### Still open (non-blocking, handled during execution)

- **Card art direction**: Style guide for Midjourney prompts, Day 16 execution. Use `design/DESIGN_TOKENS.json` palette as base.
- **Mainnet launch plan**: Hackathon ships devnet. Mainnet target June — deployment and funding model TBD post-hackathon.
- **Economic balance numbers**: Shop / Booster / ante values to be stress-tested during Day 17 balance pass. Current values are opening positions, may adjust.

---

## Appendix C: File path reference matrix

Quick lookup for Claude Code and Sprint tasks:

| Concern | Path |
|---------|------|
| Main program source | `solana/oxark/programs/oxark/src/lib.rs` |
| Main program instructions | `solana/oxark/programs/oxark/src/instructions/*.rs` (26+ files, incl. v2.0 additions: `update_card_battle_history`, `unlock_lore_shard`, `transform_common`, `mint_legendary`) |
| Main program state (PDAs + events) | `solana/oxark/programs/oxark/src/state.rs` (v2.0 adds `CardBattleHistory`, `CardLoreShards`, `LegendarySupply`) |
| NFT program source | `solana/oxark/programs/oxark-cards/src/lib.rs` |
| NFT program instructions | `solana/oxark/programs/oxark-cards/src/instructions/*.rs` |
| E2E tests | `solana/oxark/tests/*.js` |
| WebSocket relay + x402 facilitator | `multiplayer/server.js` |
| Frontend logic modules | `solana/client/src/0N-*.js` (24 modules as of Day 9) |
| Frontend entry | `index.html` (at repo root, GBA emulator shell removed in Day 9 T-D9-1) |
| Design tokens | `design/DESIGN_TOKENS.json` |
| Screen specs | `design/UI_SPEC.md` v2.0 |
| Mockups | `design/mockups/M1_main_lobby.png` through `M5_card_detail.png` |
| ZK circuit (duel commit-reveal) | `circuits/commit_reveal/commit_reveal.circom` |
| ZK circuit (hand commitment, new Day 12) | `circuits/hand_commitment/hand_commitment.circom` |
| ZK build scripts | `circuits/scripts/*.sh` |
| ZK compiled artifacts | `commit_reveal.wasm`, `commit_reveal_final.zkey` (repo root) |
| Phase D Sprint plan | `docs/PHASE_D_SPRINT.md` v1.2 |
| Card Catalog (Season 1) | `docs/CARD_CATALOG.md` v0.3 |
| Lore Shard texts | `docs/LORE_SHARDS.md` (to be created Day 14) |
| AI Agent spec | `docs/AI_AGENT_SPEC.md` (to be created Day 15) |
| Legacy React client (abandoned) | `client/src/` |
| Game Design Document | `docs/GDD.md` v2.0 final (this file) |

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

*End of Game Design Document v2.0 — Final*

*This document is final. Future design changes flow through supplementary documents (e.g., `docs/LORE_SHARDS.md`, `docs/AI_AGENT_SPEC.md`). This GDD is not re-versioned. Game updates during development may trigger small corrections, but the spirit and structure remain locked at v2.0.*

---

*v2.0 changelog (from v1.2):*
Integrated 24 design decisions from the 2026-04-22 design sprint with r0ze. Changes are scattered across multiple sections; highlights:

**Gameplay**:
- Section 4.4: Duel ante doubled (Bronze 0.01 / Silver 0.05 / Gold 0.1 SOL)
- Section 5: Ante split updated to 85% winner / 15% Prize Pool

**Card systems (large expansion)**:
- Section 7 (NFT Card Design): Battle History per NFT (new `CardBattleHistory` PDA), Lore Shards (new `CardLoreShards` PDA), Card Detail View reference, Legendary supply cap (4 species × 10 copies)
- Section 7 (Supply): Legendary is the only capped rarity; Common / Uncommon / Rare are effectively unlimited

**Seasons**:
- Section 8: All tied Champions share Prize Pool. Legendaries carry over, Common/U/R become "Vintage" (unplayable in new Seasons but retained as NFT)
- Section 8: Battle History displays Per-Season + Lifetime side-by-side

**Economy**:
- Section 10 (x402): Added Extra Action (0.01 SOL), Counter-peek (0.003 SOL), Lore Shard unlock (dynamic 5% of market price), Booster Pack probability spec
- Section 10: Phase C x402 intel API endpoints reused (no rename), saving implementation churn

**AI Agent**:
- Section 11 (AI Agent): Tier 1 specified as Anthropic API + system prompt tuning. Scope reduced to Duel Hall matchmaking fallback only (not Lobby, not Shop, not Tutorial).

**New sections (15-18)**:
- Section 15 (Onboarding & Tutorial): Mandatory Tutorial Duel vs AI, Clan selection at Faction HQ (not onboarding), Mid-Season join supported
- Section 16 (UX Standards): Fade transitions universal (M3 ZK cutscene exception), scene-specific loading animations, toast errors, tap-to-select input, Landscape only for hackathon
- Section 17 (Pitch Positioning): One-line USP, Colosseum Frontier 3-track qualification, core narrative combination
- Section 18 (Shop & Acquisition): Shop sells Common + Booster + Clan Starter + Transform only. Legendary via Gold Hall 4-win reward. Transform = Common shuffle via burn.

**Appendix B**: Fully rewritten with 33 resolved decisions (8 carried from v1.2 + 25 new from v2.0 sprint).

**Appendix C**: File path matrix updated for Day 9 state (GBA shell removed, 24 frontend modules), v2.0 additions (new PDAs, new circuits, new docs).

---

*v1.2 changelog (from v1.1):*
- *Section 5 (Duel Design) fully rewritten: phase-based structure (Draw/Energy/Summon/Battle), 5-element energy system with affinity wheel, defender mechanic, Shards/Extra Action, lane system (Front/Middle/Back). Inspired by Anode Heart: Layer Null.*
- *Section 4.4 (Duel Halls): expanded from single Duel Hall to Bronze/Silver/Gold server-rank gated tiers.*
- *Section 6 (Faction/Clan): added explicit element assignment per Clan + element affinity wheel diagram.*
- *Section 14 (Roadmap): Week 2 updated to reflect phase-based implementation tasks.*
- *Appendix B: added 2 new resolved items (battle rules, server ranks).*
- *Appendix D (new): phase-based duel quick reference.*
- *Other sections: no changes from v1.1.*

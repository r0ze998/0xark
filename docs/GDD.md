# 0xARK — Game Design Document v1.0

> *Collect 60 cards. Be the first. ZK hides your hand, x402 moves your money, MagicBlock ER runs the world in real time, AI agents join the fight.*

**Status:** Draft 1 — 2026-04-21  
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

---

## 1. Vision

### One-liner

**0xARK is a fully on-chain card collection race on Solana, wrapped in a JRPG world where everyone competes to collect 60 unique NFT cards first — while ZK hides their hand, x402 powers micro-economies, and AI agents fight alongside humans.**

### What makes it different

Onchain card games today are built around **ladder ranking** — win matches, climb ranks, earn tokens. 0xARK inverts the loop: **ranking is a side-effect, the real race is collection**. Every card you win is one closer to ending the season. Every card you lose is a step backward. The season doesn't end on a calendar — it ends when somebody completes their set.

This makes every duel matter. Not for Elo points. For physical progress in a visible race against everyone else in the server.

Combined with:

- **MagicBlock ER** for real-time lobby presence (you see other players walking around the town)
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
- It maps cleanly onto our existing code (pxFRLG UI framework, Kenney/Zelda/LPC assets already integrated)

### The world, narratively

A quiet archipelago. Five towns, each home to a different **Faction** — a professional guild that trains the next generation of *Card Keepers*. Every two weeks, the Cardmasters' Guild releases a new collection of 60 cards into the world. Whoever collects all 60 first becomes the season's Champion and claims the Prize Pool. Everyone else goes home with what they've accumulated — permanently theirs as NFTs.

The towns are connected by Routes. Wild encounters on Routes are rare NPC duelists. Towns contain shops, Faction HQs, and Duel Halls where players challenge each other. The world persists on Solana — when you log in, other players are already walking around.

### Why not Edo Harbor

An earlier version of this document considered an Edo-period Japanese harbor setting (driven by the "pirate" theme of the existing 0xARK pre-Reborn code). That direction was retired because:

- Cultural specificity creates global friction (hackathon judges are international)
- Existing assets (Pokemon-style tiles, FRLG UI) aren't Edo; re-asset would burn time
- FRLG nostalgia is more accessible and commercially proven

The "pirate / ZK pirate" flavor survives in: **one of the five Factions is literally "Pirates,"** carrying the original narrative DNA into the new world.

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
          ┌──────────────┴──────────────┐
          │          MAIN SQUARE         │
          │   (where players spawn)      │
          │   (other players visible)    │
          │                              │
          └─┬──────────┬────────────┬────┘
            │          │            │
         ┌──▼──┐   ┌──▼───┐   ┌────▼─────┐
         │SHOP │   │ PC   │   │DUEL HALL │
         │(NPC)│   │BOX   │   │ (match-  │
         │     │   │      │   │  making) │
         └─────┘   └──────┘   └──────────┘
```

### Lobby buildings

#### 4.1 Shop (cards + tutorial)

- **NPC shopkeeper** (e.g., "Keeper Yume") delivers tutorial on first visit
- Three purchase options:
  - **Booster Pack** (0.05 SOL): 3 random common/uncommon cards
  - **Targeted Single** (0.01–2 SOL): pick a specific card from a rotating inventory; price scales with rarity
  - **Faction Starter** (0.1 SOL, one-time): a themed 20-card starter deck for your Faction
- Shopkeeper dialog includes game tips, Season status, current leaderboard snippets ("Did you hear? Someone's at 58 already!")

#### 4.2 PC Box (deck editor + card storage)

- Interact with the PC in the Pokémon Center analog
- UI shows: all owned NFT cards (grouped by Faction/rarity), current deck (20 slots), trash/sell buttons
- Drag cards between "Storage" and "Deck" panes
- Multiple saved deck slots (3-5)
- Validation: deck must be exactly 20 cards, max 2 copies of any single card
- Optional "Auto-build" button — PC suggests a deck from owned cards based on Faction

#### 4.3 Faction HQ

- Access gated by your Faction (you can only enter your own)
- Inside: leaderboard of same-Faction members, sorted by cards collected
- "Same-Faction chat" — simple emote and pre-canned phrases (not free text)
- Quest board (future): daily/weekly goals for Faction members

#### 4.4 Duel Hall (matchmaking)

- Walk up to the receptionist, tap "Find Match"
- Matchmaking: ranked by current card count (±5 cards tolerance)
- Queue time target: under 30 seconds at mid-season density
- Optional: **challenge a specific player** seen in the Square (tap their sprite → "Challenge")

### Other player presence

The Main Square shows **all players currently online in your server instance**, up to ~20 visible on screen, rendered as walking sprites. Their Faction color tints their clothing. Their card count is visible on hover (X/60).

This is the feature that delivers "大湯 MMO" — the bathhouse feeling. You know others are there. You see them. It's not a matchmaking screen pretending to be social.

### Emotes

Six preset emotes, no free-form chat (reduces moderation burden + multi-language friction):

- Wave 👋
- Bow 🙇
- Challenge (sword icon) ⚔️
- Well played 👍
- Tears 😭
- Sparkle ✨

Triggered via a radial menu, lasts 3 seconds above player head.

---

## 5. Duel Design

### Format: 20-card deck, simultaneous reveal, 5 rounds

Inspired by **Marvel Snap**. The goal is short, tense, information-asymmetric matches that fit into a coffee break.

### Turn structure

```
ROUND 1
  ├─ Both players simultaneously play 1–3 cards face-down
  │   (cards go to one of 3 "Lanes" on the board)
  ├─ Both players commit their round via ZK proof
  ├─ REVEAL: cards flip, effects resolve in lane order
  └─ Lane winner determined by total power

ROUND 2-4: same
ROUND 5: FINAL — reveal all, score all 3 lanes, winner wins
```

### Win condition

The player who **wins 2 out of 3 lanes** after Round 5 wins the duel.

### Card mechanics (at a glance)

Each card has:

- **Power** (1–10): base attack value
- **Cost** (0–6): energy required to play
- **Ability**: on-play effect (e.g., "+2 power to adjacent cards", "draw 1", "destroy an opponent's card in this lane")
- **Faction**: Pirate / Merchant / Samurai / Clan / Ninja (affects deck composition)

Each turn, both players have **Energy = round number** (1 → 5). You can play any combination of cards whose total cost ≤ current Energy.

### Duel reward structure

- **Winner takes**: 2 cards from loser's collection — chosen by game (a random card from loser's owned set that winner doesn't own yet, if any; else a generic "dust" token usable in the Shop)
- **Loser loses**: those 2 cards (NFT transferred on-chain)
- **Ante**: each player ante'd 0.01 SOL at match start; winner takes 0.018 SOL (10% dust to dev treasury for Season Prize Pool seed)

**This is where the collection race tension lives**: every duel is a real stake. No safe ranked games.

### Anti-griefing rules

- Can't be matched against a player who's already beaten you in the last 5 minutes (prevents target farming)
- Can't lose your last 10 cards in a single session (if your count drops to 10, you're protected for 1 hour — gives newbies recovery time)
- Disconnect = forfeit (you lose 2 cards; opponent gets them)

---

## 6. Faction System

### 5 Factions (職業)

| Faction     | Japanese  | Archetype         | Play style                 |
|-------------|-----------|-------------------|----------------------------|
| Pirate      | 海賊       | Aggressive raider | High power, low cost, reckless. Wins fast or burns out. |
| Merchant    | 商人       | Economy engine    | Synergy with Shop, cards that generate value, late-game scaling. |
| Samurai     | 侍         | Balanced fighter  | Straight power, clear rules, consistent performance. |
| Clan (藩士) | 藩士       | Control / lockdown| Denial and disruption — slow opponent down, punish mistakes. |
| Ninja       | 忍者       | Info warfare      | Bonus cards/effects tied to ZK scouting and identity deception. |

### Choosing a Faction

On first login, player is walked to the **Guildhall** by a tutorial NPC and asked to choose a Faction. **Choice is permanent for the current Season** — next Season they can switch.

Each Faction has a **starter deck** (20 cards from their color pool) included in the 0.1 SOL Faction Starter purchase.

### Faction meta-game

- Same-Faction members can see each other's progress in the Faction HQ
- End of Season, Factions also compete as a group — **top aggregate cards collected across Faction members = Faction Seasonal Champion**, awarded a Faction-wide prestige bonus and faction-specific cosmetic
- Prevents solo grinding — encourages Faction-internal coordination (without direct card trading inside faction being free; x402 still charged)

### Ninja and ZK: the thematic keystone

The Ninja faction is the one where **ZK isn't just a tech feature but a gameplay mechanic**. Ninja cards can:

- "Cloak" — their identity commitment stays hidden longer each round
- "False flag" — broadcast a fake commitment alongside the real one (opponent's Scout peek has a 50% chance of seeing the decoy)
- "Shadow strike" — bonus power on cards played while you have the smallest hand visible

This bakes ZK into the meta, not just the tech stack.

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

- Hackathon MVP: stylized pixel portraits (we'll use Midjourney / Flux for generation, retouch in Clip Studio Paint, assemble in Figma)
- Each card has a 2-frame idle animation in-game (sprite sheet)
- Art direction: FRLG portrait style (soft colors, clear outlines, readable at 64×64px)

### Secondary market

Cards are regular Metaplex NFTs. Players can list on Tensor or Magic Eden at any time. 0xARK takes no cut from secondary sales (we only earn from Shop primary sales and duel ante dust).

This is how the economy cleans itself: post-Season, players who don't want their cards can sell to incoming Season 2 newcomers.

---

## 8. Season & Ranking

### Season length: 2 weeks

Start: Sunday 00:00 UTC  
End: Saturday 23:59 UTC (14 days later)

### How Season ends

**Either**:
- Someone completes 60/60 cards → Season ends immediately, they are Champion
- Time runs out (14 days) → Player with highest card count is Champion

In both cases, final snapshot is taken on-chain at end.

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
- **Stats**: persistent across Seasons via `LegendPDA` (current code already has this)
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

This is a **natural evolution of the existing `dungeon_position` circuit** — same Groth16 structure, same Poseidon hash, same Solana `alt_bn128_pairing` verifier. The math extends; the code paths are 80% identical.

#### 9.2 Identity Commitment (the "Dark Forest" move)

- At Season start, player commits `Poseidon(faction_id, build_strategy_hash, salt)` to a `PlayerIdentity` PDA
- During duels, the Faction color is visible (you can see the opponent is Ninja), but **the specific deck archetype is hidden**
- Optional: opponent can spend x402 to reveal it (see Section 10)
- At Season end, identity is revealed — reputation scores aggregate across Seasons under the same commitment

This is the novel contribution — **persistent pseudonymous identity with ZK-backed build privacy**. Dark Forest revealed your tools; 0xARK keeps them hidden forever unless you choose (or get paid) to reveal.

### Why we keep ZK

The existing circuit (`dungeon_position.circom`, 625 non-linear constraints, pot12 setup) is already working — proven on devnet with transaction `2pkmJpGv...`. Adapting it to hand commitment requires **circuit structure changes but no new cryptographic primitives**. We keep all the Rust verifier code, G2 Fp2 coefficient ordering fix, and Poseidon compatibility work.

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
| **Card P2P**       | variable    | Player-listed card sales with facilitator verifying payment. Built on top of oxark-cards program. |

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

- Single Bun-based facilitator server (`x402-facilitator/`)
- HTTP-402 flow: request → 402 Payment Required → user signs transaction → resubmit with payment signature → verify on-chain → serve data
- Native SOL balance-diff verification (simpler than devnet USDC faucet dependency)
- Payment tx signatures are recorded on-chain as game events (audit trail)

Production deploy: Railway or Fly.io (target: by 5/5).

---

## 11. AI Agent Integration

### The vision

AI agents are **indistinguishable from human players in the lobby**. They walk around, they enter Duel Hall, they challenge and are challenged, they buy from the Shop, they collect cards toward 60. Over a Season, some agents become rivals you recognize by handle.

### Three agent tiers

#### Tier 1: Open-source auto-player (hackathon MVP)
- Publicly published Node.js / Bun script (`tools/ai-agent/`)
- Uses Anthropic Claude or OpenAI GPT via API
- Any user can run their own agent with their own LLM key
- Demonstrated in pitch video: human vs. agent match recorded end-to-end

#### Tier 2: Rented agents (Agent hire)
- User pays 0.05 SOL via x402 Agent hire to rent a pre-configured agent
- Agent plays on user's behalf for a fixed duration (e.g., 1 hour)
- Agent has a pre-registered strategy profile (via `AgentListing` PDA)

#### Tier 3: Sovereign agents (post-launch)
- Third parties run their own hosted agents
- Register via `AgentListing` with self-declared strategy, endpoint, and price
- Agents auto-challenge other players, earn cards, resell them
- Agents have their own reputation and Collection (can reach 60/60 as an agent)

### Why this matters for 0xARK specifically

The Solana ecosystem is currently obsessed with AI agents + payments (Cypherpunk winners MCPay, Corbits, Mercantill). 0xARK is **the first game where AI agents are first-class economic citizens** — they don't just trade, they *compete in the same contest as humans*.

In the pitch video, we show a moment where a player checks the leaderboard: the top 3 players are 2 humans and 1 agent. This is the headline shot.

### `AgentListing` PDA (existing, extended)

Current code already has `AgentListing` with `register_agent` / `deactivate_agent`. Extensions for Reborn:

- Add `reputation_score` field (updated after each match)
- Add `collection_count` field (their own 60/60 progress)
- Add `x402_endpoint` for agent API (strategy API)
- Post-launch: stake-backed reputation (agent's registration fee is slashed if caught cheating)

---

## 12. Tech Stack

### Solana programs

| Program | Status | Purpose |
|---------|--------|---------|
| **oxark** (main) | Deployed devnet, 5i37j... | Game state, duels, matchmaking, seasons |
| **oxark-cards** | Deployed devnet, 236FN... | NFT card mint, P2P listings, Metaplex metadata |
| *(zk-verify, future split)* | Embedded in main | May split later for size |

### Core tech

- **Anchor 1.0** for programs (existing)
- **MagicBlock Ephemeral Rollups** (SDK 0.6.5, integrated v465-v468) for real-time lobby sync and low-latency duels
- **Groth16 BN254** via Solana's `alt_bn128_pairing` syscall (verified working, tx `2pkmJpGv...`)
- **Circom 2.1.6** for ZK circuits (existing dungeon_position ported to hand_commitment)
- **snarkjs 0.7.4** for browser-side proof generation
- **Poseidon hash** (Rust: `poseidon-ark`, JS: `poseidon-lite@0.2.1`) — Fp2 coefficient ordering fix already applied
- **x402 v2 protocol** with native SOL balance-diff verification
- **Bun** for facilitator server

### Frontend

- **Vanilla JS + PixiJS 7.1.4** (pinned) for game rendering
- **Canvas 2D** as base layer, PixiJS as effects/UI overlay
- Existing `pxFRLG` UI framework for all dialog / HUD / menus
- **Web3.js 1.95.3** (pinned), `@coral-xyz/anchor` for Solana interaction
- Mobile-responsive (works on phone browsers, touch controls)

### Asset pipeline

- Pixel tiles: Kenney pirate tilemap, LPC terrain, Zelda-style character sheet (existing)
- Card portraits: Midjourney → Clip Studio Paint retouch → Figma composition → PNG export
- BGM / SFX: chip-tune style (OpenGameArt + original composition)

### Deployment

- Frontend: GitHub Pages (gh-pages branch, auto-deploy via workflow, fixed v476)
- Facilitator: Railway or Fly.io
- Mac mini (r0ze local) for development with Claude Code + tmux

---

## 13. Reborn Migration

This is the honest accounting of what survives, what dies, what gets rebuilt.

### Code that survives (≈60% of current codebase)

| Asset | What it does | Role in Reborn |
|-------|-------------|----------------|
| **16 oxark instructions** (create_game, join_game, commit_action, resolve_round, etc.) | Core game state machine | Renamed and re-scoped to duel-only; most logic directly reusable |
| **MagicBlock ER integration** (delegate/undelegate) | Real-time lobby and duel sync | Essential for Reborn; becomes more important than before |
| **`verify_dungeon_move`** instruction + VK embedding | ZK proof verification on Solana | Renamed to `verify_hand_commitment`; same VK structure, same G2 fix |
| **`oxark-cards` program** (mint_card_nft, mint_solo_card) | Metaplex NFT issuance | Used as-is; extended with `list_card` and `buy_card` |
| **`AgentListing` PDA + register/deactivate** | AI agent registry | Used as-is; extended with reputation and collection_count |
| **`x402-facilitator/`** (Scout peek, HTTP-402 flow) | Micropayment infrastructure | Used as-is; extended with new endpoints |
| **`LegendPDA`** | Cross-season stats | Used as-is |
| **`pxFRLG` UI framework** | Dialog boxes, menus, HUD | Heavily used (the aesthetic keystone of Reborn) |
| **Kenney / LPC / Zelda assets** | Pixel sprites and tilesets | Used as-is for town rendering |
| **Existing movement system (after v484 UX fix)** | Tile-based walking with tween | Used for lobby navigation |

### Code that dies (≈20%)

| Asset | Why removed |
|-------|------|
| **Dungeon exploration system** | Gameplay pivot; lobby replaces dungeons |
| **9-action commit-reveal resolution (Move / Shadow / Storm / Barrier / Steal / Flame / Scout / Draw / Void)** | Replaced by Marvel-Snap-style simultaneous lane reveal |
| **Position-based commit-reveal** | Replaced by hand-commitment; position is now just lobby walking (no ZK) |
| **Current "cards" data model** | Replaced by Metaplex NFTs (already partially done via oxark-cards) |
| **Existing "battle" UI** | New duel UI needed (lane-based) |

### Code that is new (≈20%)

| Component | Est. effort |
|-----------|------|
| Lobby MMO view (real-time player sprites via ER) | 10-15h |
| Matchmaking queue system | 5-8h |
| New 20-card deck editor (PC Box UI) | 6-10h |
| 3-lane duel board UI (Marvel Snap-style) | 10-15h |
| Faction system (5 factions, starter decks, HQ UI) | 8-12h |
| Hand commitment ZK circuit adaptation | 10-15h |
| Season engine (2-week timer, prize pool, final settlement) | 6-10h |
| NPC shopkeeper dialog and purchase flow | 6-8h |
| Card artwork (60 cards × 1 portrait each) | 10-20h (depending on AI generation quality) |
| AI agent Tier-1 implementation | 8-12h |
| New card game logic (in oxark program) | 15-20h |
| Polish, balance, bug fix | 10-15h |

**Total new code ≈ 100-160h**. Combined with ≈30h refactoring/adaptation of existing code, the full Reborn build is **130-190h**.

### Estimated effort vs. time available

From 2026-04-21 to 2026-05-11 is 20 days.

If r0ze works 8h/day (solo): 160h. If Claude Code runs 6-8h/night autonomously: additional 120-160h. Total capacity: **280-320h**. Required: **130-190h** new work + **40-60h** pitch/submission material = **170-250h**.

**Feasible, with margin**. Not luxurious, but not tight either. Key risk is card art quality (20h budget could balloon to 40h if we don't get AI gen right early).

---

## 14. Roadmap

### Week 1 (2026-04-21 → 2026-04-27): Architecture + Lobby MVP

Day 1 (Mon 4/21): GDD sign-off, create Phase D sprint plan, archive old Phase C tasks  
Day 2 (Tue 4/22): Lobby spatial layout + movement, player sprite rendering via ER  
Day 3 (Wed 4/23): Matchmaking queue system, Duel Hall NPC interaction  
Day 4 (Thu 4/24): PC Box deck editor UI, deck validation logic  
Day 5 (Fri 4/25): Shop NPC dialog + purchase flow (integrate existing oxark-cards)  
Day 6-7 (Sat-Sun 4/26-27): Faction selection, Faction HQ, emote system

### Week 2 (2026-04-28 → 2026-05-04): Duel Core + ZK

Day 8 (Mon 4/28): 3-lane duel board UI, card draw/play mechanics (no ZK yet)  
Day 9 (Tue 4/29): Hand commitment ZK circuit design + Circom implementation  
Day 10 (Wed 4/30): Hand commitment circuit test + on-chain verifier adaptation  
Day 11 (Thu 5/1): Simultaneous reveal mechanic, lane scoring, win condition  
Day 12 (Fri 5/2): Identity commitment ZK (persistent pseudonym per Season)  
Day 13-14 (Sat-Sun 5/3-4): x402 Scout peek / Identity peek / Hint buy integration into duel flow

### Week 3 (2026-05-05 → 2026-05-11): Content + Polish + Submission

Day 15 (Mon 5/5): Season engine (timer, prize pool accumulation, final snapshot)  
Day 16 (Tue 5/6): AI agent Tier-1 implementation, record 1 agent vs. human match  
Day 17 (Wed 5/7): Card artwork finalization (Midjourney batch + Clip Studio retouch)  
Day 18 (Thu 5/8): Balance pass, bug fix, β tester recruitment  
Day 19 (Fri 5/9): Pitch video script, storyboard, recording  
Day 20 (Sat 5/10): Pitch video edit, Technical demo video, README rewrite  
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

1. **Exact card ability pool**: We need a list of ~20-30 card abilities with balanced power/cost. Who designs? When?
2. **Art direction for card portraits**: Style guide needed for Midjourney prompts (portrait framing, color palette, level of abstraction)
3. **Server / shard strategy**: Will all players be in 1 server instance? Or shard by Faction? By time zone?
4. **Mainnet launch plan**: Hackathon ships devnet. Mainnet target for June — what's blocking?
5. **Economic balancing**: Shop prices vs. Duel rewards — need numerical sim to avoid pay-to-win or pure-grind states
6. **Mobile vs. desktop priority**: Current code works mobile-responsive. Do we push PWA install? Native app?

---

*End of Game Design Document v1.0*

*Sign-off required from r0ze before proceeding to Phase D Sprint planning.*

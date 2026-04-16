# 0xARK

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)

> **60 cards. One Prize Pool. Information asymmetry is the ultimate weapon.**

A Solana on-chain card PvP game. Explore a dungeon with zero-knowledge hidden positions, steal cards from rivals you can't see, and be the first to collect all 60 unique cards to claim the entire Prize Pool.

**[Play Now](https://r0ze998.github.io/0xark/)** | Built for [Colosseum Frontier 2026](https://colosseum.com/frontier)

---

## What Is 0xARK?

3 players compete in a roguelike dungeon. Each floor drops cards. Rivals can be anywhere — their positions are ZK-hidden until they enter your line of sight. When you meet, a card battle begins. The player who assembles all 60 unique cards first wins the season and claims the entire Prize Pool.

### Core Loop

```
Town (safe) → Dungeon B1–B5 → Card Battle → Floor Clear → Deeper Floor → Repeat
```

| Phase | What Happens |
|-------|-------------|
| **Town** | Buy/sell cards, Gacha, read log, plan strategy |
| **Dungeon** | Explore floors, encounter rival NPCs VEGA & MIRA |
| **Battle** | Simultaneous action commit-reveal (DRAW / STEAL / BARRIER / SCOUT / CARD) |
| **Resolution** | On-chain settle, winner keeps cards |
| **Victory** | First to 60 unique cards claims Prize Pool |

### Battle Actions (simultaneous)

| Action | Effect |
|--------|--------|
| **DRAW** | Add a floor-appropriate card to your hand |
| **STEAL** | Take a random card from the rival |
| **BARRIER** | Block all steal attempts this round |
| **SCOUT** | Reveal rival's hand and floor position |
| **USE CARD** | Consume a card for its special effect |

---

## Market Opportunity

### TAM — Total Addressable Market

The global gaming market hit **$200B in 2024** and is projected to reach $300B by 2027. Within it, blockchain gaming captured **$4.6B** (2024) and is forecast to grow to **$65B by 2030** (CAGR 19%). Web3 gaming is still sub-5% of the total gaming market — the majority of the growth curve is ahead.

### SAM — Serviceable Addressable Market

0xARK targets **competitive on-chain PvP with real stakes**: players who treat crypto games as a primary gaming and income activity. In 2024 this segment represented roughly **8 million active wallets** across gaming protocols, generating approximately **$1.2B in annualized transaction volume** on Solana-based gaming platforms (DeFi Llama, Dune Analytics estimates). Conservative SAM: **$1.2B**.

### SOM — Serviceable Obtainable Market

Year-1 target: **5,000 monthly active players** at an average session stake of 0.5 SOL ($75 at $150/SOL). With 3 players per season and a 14-day average season:

| Revenue driver | Monthly estimate |
|----------------|-----------------|
| Entry stakes (prize pool, not revenue) | 5,000 players × 0.5 SOL = 2,500 SOL |
| x402 intel API fees (5% platform cut) | ~50 SOL/month |
| Gacha revenue (SOL + USDC) | ~200 SOL/month |
| NFT secondary royalties (2.5%) | ~30 SOL/month |
| **Total platform revenue** | **~280 SOL/month (~$42K at $150/SOL)** |

**Year-1 SOM: ~$500K ARR**, scaling to $3M ARR at 50K MAU (Year 2).

---

## Revenue Model

0xARK runs a self-sustaining token economy with four revenue streams:

### 1. Platform Fee on Prize Pool (5%)

Every season, 5% of the total Prize Pool is retained by the platform before distribution. With 3 players × 0.5 SOL entry = 1.5 SOL per season, and ~100 concurrent seasons at scale, this generates **7.5 SOL/day** purely from game activity.

### 2. x402 AI Intel Economy

The AI agent broker charges per-query for game intelligence:

| Intel API | Price | Who Buys |
|-----------|-------|----------|
| `/intel/location` | $0.002 USDC | Players chasing rivals |
| `/intel/hand` | $0.003 USDC | Strategic scouting |
| `/intel/strategy` | $0.005 USDC | Rival AI NPCs (VEGA/MIRA) |
| `/intel/market` | Free | Anyone |

Revenue compounds: VEGA and MIRA pay for intel autonomously, generating volume without human players. **USDC micropayments flow to the platform on every AI decision.**

### 3. Gacha

Players spend SOL or USDC to pull random cards from a pity-rate system (guaranteed rare every 10 pulls). Gacha is the primary card acquisition alternative to battle — essential for players who prefer economic over combat strategies.

### 4. NFT Secondary Royalties

Cards minted post-victory are 1-of-1 on-chain NFTs (supply=1, mint authority burned). Secondary market royalties at 2.5% capture value as card scarcity and rarity create collector demand.

---

## Traction

| Metric | Value |
|--------|-------|
| Live playable demo | ✅ [r0ze998.github.io/0xark](https://r0ze998.github.io/0xark/) |
| On-chain program (Devnet) | `2gMYzenV6HQoTJA2899XxnLgzTbaWdVmegLqL7nMpVS3` |
| ZK circuit compiled | ✅ 277 constraints, trusted setup complete |
| Groth16 on-chain verifier | ✅ Solana BN254 syscalls (<200K CUs) |
| Anchor instructions | 15 total (7 deployed on devnet, 8 mainnet-ready in codebase) |
| Litesvm E2E tests | ✅ 9 tests, all passing |
| Card pixel art | ✅ All 60 unique sprites complete (hand-crafted, per-frame animated) |
| Building NPCs | ✅ Detailed pixel art characters (Merchant Elara, Spy Master Sable) |
| React UI bundle | ✅ Wallet / Lobby / NFT Inventory (TypeScript + wallet-adapter) |
| WebSocket server | ✅ Pure relayer — no game authority, Solana is source of truth |
| Hackathon tracks | Gaming · AI · Stablecoins (only project spanning all three) |

---

## 1-Year Mainnet Roadmap

### Q2 2026 — Mainnet Beta (Months 1–3)

- [ ] Mainnet program deployment + security audit (OtterSec or Neodyme)
- [ ] 3-player season launch with SOL prize pools
- [ ] Phantom + Backpack wallet support
- [ ] x402 agent intel economy live (USDC on mainnet)
- [ ] Referral system: 1% of referred player's prize pool to referrer

### Q3 2026 — Growth (Months 4–6)

- [ ] Season leaderboard + all-time card collection rankings
- [ ] 60-card gallery with lore per card (Midjourney + Metaplex metadata)
- [ ] Trade market: list cards for SOL/USDC
- [ ] Guild system: form 3-player teams for coordinated seasons
- [ ] Mobile PWA (touch-optimized, existing touch controls extended)

### Q4 2026 — Expansion (Months 7–9)

- [ ] 5-player seasons (expanded dungeon, new floors B6–B10)
- [ ] Crafting system: sacrifice 3 Commons → 1 Uncommon (on-chain)
- [ ] Rival AI difficulty tiers (VEGA Normal / Hard / Insane)
- [ ] Partnership with Tensor for card NFT listings + analytics
- [ ] Tournament seasons: fixed entry, fixed prize pool, fixed duration

### Q1 2027 — Ecosystem (Months 10–12)

- [ ] SDK release: allow third-party card artists to submit card designs (DAO vote)
- [ ] MagicBlock Ephemeral Rollup integration for sub-50ms dungeon movement
- [ ] Cross-season card persistence: cards survive between seasons as NFTs
- [ ] Mobile native app (React Native + Expo)
- [ ] $0-cost entry seasons sponsored by protocol partners (stablecoin treasury yield)

---

## On-Chain vs Off-Chain

A common question for blockchain games: *what actually lives on the chain?*

### ✅ On-Chain (Anchor / Solana) — tamper-proof, auditable

| Rule / Data | Where |
|-------------|-------|
| Card ownership (who holds what) | `PlayerState.cards` on-chain |
| Card pool (how many remain) | `CardPool.remaining` on-chain |
| Battle action resolution (all 9 action types) | `resolve_round.rs` on-chain |
| Steal logic (area check, Barrier check, invisibility) | on-chain |
| Storm (nullifies all Barriers) | on-chain |
| Shadow (invisibility — counters Steal/Flame) | on-chain |
| Draw randomness (SHA256 of slot + timestamp + round) | on-chain |
| Victory condition (5 unique types OR last player with cards) | on-chain |
| Prize pool custody and distribution | `stake_entry.rs` / `claim_prize.rs` on-chain |
| ZK proof validity (Groth16 BN254 pairing) | `verify_zk_proof.rs` on-chain |
| NFT ownership (1-of-1, mint authority burned) | SPL Token on-chain |

The server **cannot alter any battle outcome**. Even if the WebSocket server is compromised or shut down mid-game, all card state and prize pool remain on-chain and claimable.

### ❌ Off-Chain (WebSocket server / client) — intentionally off-chain

| Data | Where | Why off-chain |
|------|-------|--------------|
| Player XY position in dungeon | WebSocket (in-memory) | ZK fog-of-war: hiding positions is the feature |
| Dungeon exploration / tile rendering | PixiJS client | Rendering, not game state |
| NPC pathfinding (VEGA / MIRA) | Client JS | UI behavior |
| Gacha pull animation | Client JS | Presentation layer |

**Design principle**: the dungeon movement phase is deliberately off-chain because *hiding positions is the game mechanic*. ZK proofs prevent players from proving their location to rivals. If positions were on-chain they would be public.

---

## Technical Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         GAME CLIENT                                  │
│                                                                      │
│  Canvas (Vanilla JS + PixiJS v7 WebGL) — game logic, untouched      │
│  React UI (TypeScript + wallet-adapter) — wallet/lobby/inventory     │
│                                                                      │
│  Build: 17 JS modules → build.js → index.html                       │
│  React: react/ → Vite → react-dist/oxark-ui.iife.js                │
└─────────┬──────────────────────────┬───────────────────┬────────────┘
          │                          │                   │
          ▼                          ▼                   ▼
┌─────────────────┐    ┌─────────────────────┐  ┌──────────────────┐
│  Solana Devnet  │    │  WebSocket Server   │  │  x402 AI Broker  │
│  (Anchor/Rust)  │    │  (Node.js :3500)    │  │  (Express :3402) │
│                 │    │                     │  │                  │
│  15 instructions│    │  Pure Relayer ✅    │  │  4 intel APIs    │
│  (7 on devnet)  │    │                     │  │                  │
│  ─────────────  │    │  ─────────────────  │  │  ─────────────   │
│  create_game    │    │  WS presence only   │  │  /intel/location │
│  join_game      │    │  submit_tx relay    │  │  /intel/hand     │
│  start_game     │    │  ZK proximity fog   │  │  /intel/strategy │
│  commit_action  │    │  No game authority  │  │  /intel/market   │
│  reveal_action  │    │  Solana = truth     │  │                  │
│  resolve_round  │    │                     │  │  x402 paywall    │
│  verify_zk_proof│    │  tx_confirmed →     │  │  USDC via SPL    │
│  mint_card_nft  │    │  clients re-fetch   │  │  $0.002–$0.005   │
│  stake_entry    │    │  on-chain state     │  │  per query       │
│  claim_prize    │    └─────────────────────┘  └──────────────────┘
│  season         │
│  agent_registry │
└────────┬────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────────┐
│                        ZK PROOF LAYER                               │
│                                                                      │
│  Circuit: zk/circuits/commit_reveal.circom (circomlib v2)           │
│  Hash:    Poseidon (277 non-linear constraints)                      │
│  Checks:  actionType ∈ [1,10]  · targetArea ∈ [0,2]                │
│  System:  Groth16 BN254 (browser proof via snarkjs)                 │
│  Verify:  On-chain alt_bn128 pairing (<200K compute units)          │
│                                                                      │
│  Two-layer security:                                                 │
│  Layer 1 — SHA256 commit/reveal: action binding (replay prevention) │
│  Layer 2 — Groth16 ZK: proves action is valid without revealing it  │
└─────────────────────────────────────────────────────────────────────┘
```

### ZK Commit-Reveal Sequence

```
Round N:
  Player        Rival         Solana
    │             │              │
    ├──commit──►  │  ◄──commit───┤  SHA256(action ‖ target ‖ salt)
    │             │              │  player_state.has_committed = true
    │             │              │
    ├──zk_proof── │ ──────────►  │  Groth16: proves action ∈ valid range
    │             │  ──zk_proof► │  (action never revealed yet)
    │             │              │
    ├──reveal───► │  ◄──reveal───┤  preimage check on-chain
    │             │              │  player_state.has_revealed = true
    │             │ ─resolve──►  │  resolve_round: settle all actions
    │◄────────────────result──── │
```

### Battle State Machine

```
vs_splash → select → confirming → resolving → result
    │           │          │            │          │
  Show        Player     Submit      Process    Show
  rival       picks      commit_tx   resolve    winner
  splash      action     on-chain    Queue[]    cards
```

---

## Rival NPCs

| NPC | Color | Style |
|-----|-------|-------|
| **VEGA** | Magenta/Pink | Aggressive stealer, high-risk plays |
| **MIRA** | Amber/Gold | Strategic SCOUT user, information hoarder |

Both rivals traverse dungeon floors independently. Their positions pulse in the HUD (V: B1–B5 / TWN, M: B1–B5 / TWN) when on the same floor as the player. VEGA and MIRA spend USDC autonomously on x402 intel to make informed decisions — they are self-funding AI agents.

---

## Card System

- **60 unique cards**, 5 rarity tiers (Common→Legendary)
- Types: Attack / Defense / Escape / Magic / Recovery
- All winning-player cards mint as 1-of-1 on-chain NFTs
- Mint authority burned immediately — provably scarce

### Rarity Distribution

| Rarity | Cards | Drop Rate |
|--------|-------|-----------|
| Common | 20 | 45% |
| Uncommon | 15 | 28% |
| Rare | 12 | 18% |
| Epic | 8 | 7% |
| Legendary | 5 | 2% |

### Acquisition Methods

| Method | Details |
|--------|---------|
| Battle victory | Steal from defeated rival |
| Floor clear | 1 card reward per floor |
| Gacha | SOL or x402 USDC payment |
| Marketplace | Buy from other players |
| Player trade | Direct P2P offers |

---

## Prize Pool

```
Player Entry: 0.5 SOL deposit
                    │
         ┌──────────▼──────────┐
         │    PRIZE POOL       │
         │  95% distributed    │
         │   5% platform fee   │
         │  + x402 fees        │
         └──────────┬──────────┘
                    │
         ┌──────────▼──────────┐
         │  First to 60 cards  │
         │  claims everything  │
         └─────────────────────┘
```

Season-end distribution (if no winner after max rounds):

| Place | Share |
|-------|-------|
| 1st (most unique cards) | 60% |
| 2nd | 25% |
| 3rd | 15% |

---

## Repository Structure

```
0xark/
├── index.html                    Built game (served via GitHub Pages)
├── react-dist/                   React UI bundle (wallet/lobby/inventory)
│
├── solana/client/
│   ├── src/                      17 JS modules (~21K lines)
│   │   ├── 01-pixi.js            PixiJS canvas, FRLG framework
│   │   ├── 01-draw.js            Canvas 2D, ZK proof system, web3 helpers
│   │   ├── 01-net.js             WebSocket client, transitions
│   │   ├── 02-data.js            60 card definitions, dungeon data
│   │   ├── 03-world-setup.js     Map generation, fog-of-war
│   │   ├── 04-state.js           Game state FSM, card timers
│   │   ├── 05-rendering.js       Sprites, cards, animations
│   │   ├── 06-world-systems.js   Town/dungeon HUD, encounters
│   │   ├── 07-map.js             World render, battle routing
│   │   ├── 07-battle.js          Battle phase renderer, card engine
│   │   ├── 07-battle-resolve.js  Card effect animations
│   │   ├── 08-overlays.js        Marketplace, card acquisition, victory
│   │   ├── 08-world-interact.js  Object interactions, fishing, puzzles
│   │   ├── 08-screens.js         Floor clear, stats, credits
│   │   ├── 09-game-loop.js       rAF main loop
│   │   ├── 10-input.js           Keyboard + touch controls
│   │   └── 11-save-init.js       Save/load/init
│   ├── react/                    TypeScript React UI app
│   │   ├── src/
│   │   │   ├── lib/onchain.ts    Typed Solana tx builders + PDA helpers
│   │   │   ├── components/
│   │   │   │   ├── WalletPanel.tsx    Phantom wallet connect
│   │   │   │   ├── LobbyPanel.tsx     Create/join game on-chain
│   │   │   │   └── InventoryPanel.tsx NFT card collection viewer
│   │   │   ├── App.tsx           Root component (tabs: Lobby / Cards)
│   │   │   └── main.tsx          Mount into #react-root
│   │   └── vite.config.ts        Builds → react-dist/oxark-ui.iife.js
│   ├── build.js                  Module bundler → index.html
│   └── template.html             HTML shell + React mount point
│
├── solana/oxark/                 Anchor smart contract (Rust)
│   ├── programs/oxark/src/
│   │   └── instructions/
│   │       ├── create_game.rs
│   │       ├── join_game.rs
│   │       ├── start_game.rs
│   │       ├── commit_action.rs
│   │       ├── reveal_action.rs
│   │       ├── resolve_round.rs
│   │       ├── verify_zk_proof.rs  Groth16 on-chain verifier (BN254)
│   │       ├── mint_card_nft.rs    1-of-1 NFT mint, authority burned
│   │       ├── stake_entry.rs      0.5 SOL prize pool entry
│   │       ├── season.rs
│   │       └── agent_registry.rs
│   ├── programs/oxark/tests/     Passing Anchor integration tests (litesvm)
│   └── tests/                    Full E2E tests (litesvm, 9 passing)
│
├── zk/
│   └── circuits/commit_reveal.circom  Poseidon hash, range checks, 277 constraints
│
├── multiplayer/
│   └── server.js                 Pure WebSocket relayer (no game state authority)
│
└── x402/
    └── agent-broker.js           AI intel broker, x402 micropayment paywall
```

---

## Quick Start

```bash
# Play in browser (no install)
open https://r0ze998.github.io/0xark/

# Build client from source
cd solana/client
node build.js          # Bundles 17 modules → index.html + copies react-dist

# Build React UI separately (TypeScript + wallet-adapter)
cd solana/client/react
npm install && npm run build   # → react-dist/oxark-ui.iife.js

# Smart contract (devnet)
cd solana/oxark
cargo test             # Run all 9 E2E tests (litesvm, no validator needed)
cargo build-sbf        # Build SBF binary
anchor deploy          # Program: 2gMYzenV6HQoTJA2899XxnLgzTbaWdVmegLqL7nMpVS3

# Multiplayer server (pure relayer)
cd multiplayer
npm install && npm start    # ws://localhost:3500  SOLANA_RPC_URL=...

# AI agent broker
cd x402
npm install && node agent-broker.js    # http://localhost:3402

# ZK circuit (requires circom 2.1+ and snarkjs)
cd zk
circom circuits/commit_reveal.circom --r1cs --wasm --sym -o build/ -l ../node_modules
snarkjs groth16 setup build/commit_reveal.r1cs pot12_final.ptau build/commit_reveal_0000.zkey
snarkjs zkey contribute build/commit_reveal_0000.zkey build/commit_reveal_final.zkey
snarkjs zkey export verificationkey build/commit_reveal_final.zkey build/verification_key.json
```

---

## Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Smart Contract | **Anchor 1.0 (Rust)** on Solana | NFT ownership, Prize Pool, ZK verification |
| ZK | **Circom 2.1** + **snarkjs** + **BN254** | Hidden positions, Groth16 on-chain verify |
| AI Agent | **x402** + USDC micropayments | Intel economy, autonomous rival AI |
| Multiplayer | **WebSocket** Pure Relayer (Node.js) | Presence sync, tx relay, ZK fog-of-war |
| Canvas | **Vanilla JS** + **PixiJS v7** | 19k-line FRLG-style game, WebGL rendering |
| UI Shell | **React 18** + **TypeScript** + **wallet-adapter** | Wallet / Lobby / NFT Inventory |
| Build | Custom `build.js` + **Vite 6** | Module concat + React bundle |
| Tests | **litesvm** (9 passing, no validator) | Fast Anchor E2E without devnet |
| Wallet | **Phantom** + **@solana/web3.js** | Devnet + Mainnet |
| Program ID | `2gMYzenV6HQoTJA2899XxnLgzTbaWdVmegLqL7nMpVS3` | Solana Devnet |

---

## Colosseum Frontier Hackathon

Built for [Colosseum Frontier](https://colosseum.com/frontier) — April 6 to May 11, 2026.

**Tracks**: Gaming · AI · Stablecoins

0xARK is the only submission combining:
1. **ZK hidden information** (Groth16 on-chain, Poseidon circuit)
2. **Roguelike dungeon** PvP with real on-chain stakes (0.5 SOL entry)
3. **Autonomous AI agents** that buy intel with USDC via x402
4. **React + TypeScript** production-quality wallet and lobby UI
5. **Pure relayer server** — Solana is the single source of truth, no server authority

No prior Colosseum winner has bridged all three tracks in a single playable demo.

---

## Links

- **Live Demo**: [r0ze998.github.io/0xark](https://r0ze998.github.io/0xark/)
- **GitHub**: [github.com/r0ze998/0xark](https://github.com/r0ze998/0xark)
- **Builder**: [@r0ze_____](https://x.com/r0ze_____)

---

*Design Philosophy: 触って面白い最小限のものを、ブレないビジョンで磨く。*

*Assets: [Kenney Monochrome Pirates](https://kenney.nl/assets/monochrome-pirates) (CC0)*

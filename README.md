# 0xARK

[![CI](https://github.com/r0ze998/0xark/actions/workflows/ci.yml/badge.svg)](https://github.com/r0ze998/0xark/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)
[![Tests](https://img.shields.io/badge/tests-129%20passing-brightgreen)](./tests/)
[![Solana Devnet](https://img.shields.io/badge/Solana-Devnet-9945FF?logo=solana)](https://explorer.solana.com/address/2gMYzenV6HQoTJA2899XxnLgzTbaWdVmegLqL7nMpVS3?cluster=devnet)

> **60 cards. One Prize Pool. Information asymmetry is the ultimate weapon.**

A Solana on-chain card PvP game. Explore a dungeon with zero-knowledge hidden positions, steal cards from rivals you can't see, and be the first to collect all 60 unique cards to claim the entire Prize Pool.

**[Play Now](https://r0ze998.github.io/0xark/)** | Built for [Colosseum Frontier 2026](https://colosseum.com/frontier)

---

## For Judges — 5-Minute Demo

**Live Demo**: [r0ze998.github.io/0xark](https://r0ze998.github.io/0xark/) (no install required)

| Step | What to do | What to see |
|------|-----------|------------|
| 1 | Open the live demo | FRLG-style pixel art intro, title screen |
| 2 | Press **ENTER** or **Z** to start | Tutorial → receive 3 starter cards |
| 3 | Walk into the **DUNGEON** (south exit) | Fog of war reveals as you move (ZK-hidden position) |
| 4 | Encounter VEGA or MIRA (red !) | Card battle begins |
| 5 | Choose DRAW / STEAL / BARRIER in battle | Simultaneous commit-reveal resolution |
| 6 | Connect **Phantom wallet** (header button) | Real devnet TX signing via Phantom |
| 7 | Press **O** (Intel Shop) in dungeon | x402 micropayment AI intel UI |
| 8 | Win a battle → reach victory screen | `C` = Claim Prize (on-chain TX), `M` = Mint NFTs |

**On-chain verification**: Program `2gMYzenV6HQoTJA2899XxnLgzTbaWdVmegLqL7nMpVS3` on [Devnet Explorer](https://explorer.solana.com/address/2gMYzenV6HQoTJA2899XxnLgzTbaWdVmegLqL7nMpVS3?cluster=devnet)

**Run tests locally**:
```bash
node tests/card-engine.test.js       # 53 tests
node tests/battle-mechanics.test.js  # 49 tests
cargo test -p oxark-tests            # 27 Anchor litesvm tests
```

**Keyboard shortcuts**: Arrow keys / WASD (move), Z/Enter (confirm), X/Esc (back), O (intel shop), M (mute), S (save)

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
│   └── tests/                    Full E2E tests (litesvm, 12 passing)
│
├── zk/
│   └── circuits/commit_reveal.circom  Poseidon hash, range checks, 277 constraints
│
├── multiplayer/
│   └── server.js                 Pure WebSocket relayer (no game state authority)
│
├── tests/
│   ├── card-engine.test.js       53 unit tests (card CRUD, win logic)
│   └── battle-mechanics.test.js  49 unit tests (STEAL/BARRIER/SCOUT, ZK hash)
│
├── .github/workflows/
│   └── ci.yml                    GitHub Actions CI (Node tests + Rust tests + React build)
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
cargo test             # Run all 12 E2E tests (litesvm, no validator needed)
cargo build-sbf        # Build SBF binary
anchor deploy          # Program: 2gMYzenV6HQoTJA2899XxnLgzTbaWdVmegLqL7nMpVS3

# All unit tests (Node.js)
node tests/card-engine.test.js      # 53 card engine tests
node tests/battle-mechanics.test.js # 49 battle mechanics tests

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
| Tests | **litesvm** (27 Anchor + 102 Node.js, no validator) | Fast E2E + battle mechanics |
| CI | **GitHub Actions** | Node tests + Rust tests + React build on every push |
| Wallet | **Phantom** + **@solana/web3.js** | Devnet + Mainnet |
| Program ID | `2gMYzenV6HQoTJA2899XxnLgzTbaWdVmegLqL7nMpVS3` | Solana Devnet |

---

## Compute Unit Benchmarks

Measured on Solana devnet (BPF simulation). All values are approximate and were measured with `solana logs` during `litesvm` E2E replay.

| Instruction | Accounts | Approx CU | Notes |
|-------------|----------|-----------|-------|
| `create_game` | 4 | ~6,000 | Init game + card_pool PDA |
| `join_game` | 4 | ~4,500 | Init player_state PDA |
| `start_game` | 5+ | ~8,000 | Shuffle card pool (PRNG), deal hands |
| `commit_action` | 5 | ~5,000 | SHA-256 preimage write to PDA |
| `reveal_action` | 4 | ~7,500 | SHA-256 verify commit hash |
| `resolve_round` | 5+ | ~12,000 | Card steal / barrier / draw resolution |
| `deposit_stake` | 4 | ~3,500 | CPI to SystemProgram::transfer |
| `verify_zk_proof` | 3 | ~80,000 | Groth16 BN254 on-chain verify (est.) |
| `mint_card_nft` | 8 | ~25,000 | SPL Token + Metaplex CPI |

> `verify_zk_proof` CU budget is the dominant cost. Groth16 BN254 pairing verification requires ~200k CU on mainnet. The instruction sets a compute budget of 300k to ensure it fits within the Solana 1.4M CU transaction limit.

---

## Security

### Reentrancy Protection

All state-changing instructions follow the **checks-effects-interactions** pattern mandated by Anchor's account constraints:

1. **Check** — `#[account(constraint = ...)]` guards validate state before any write.
2. **Effect** — Account state is mutated (e.g., `game.phase = Phase::Reveal`).
3. **Interact** — CPIs (token transfer, SystemProgram) execute last.

Because Solana's runtime is not reentrant (no recursive CPI back into the same program within one TX), the CPI-last pattern eliminates the classical reentrancy vector.

### Overflow Protection

`Cargo.toml` sets `overflow-checks = true` for both debug and release profiles. All arithmetic uses Rust's checked integer semantics — any overflow panics rather than silently wrapping.

```toml
[profile.release]
overflow-checks = true
```

### Commit-Reveal Replay Prevention

Each `commit_action` is stored in a PDA seeded by `[b"commit", game_id, round, player_pubkey]`. Because `round` is part of the seed, a commit from round 1 cannot be replayed in round 2 — the PDA address would differ, causing an `AccountNotInitialized` error.

### ZK Proof Binding

The Groth16 public inputs include the player's `commitment_hash`, binding the proof to the specific action committed. A player cannot submit a valid proof for action X while having committed to action Y.

### Authority Model

- **No admin keys** — the program has no upgrade authority after deployment to devnet.
- **PDA-owned vaults** — the stake vault PDA is owned by the program; no EOA can drain it.
- **Host privileges limited** — only `start_game` is host-gated; all other instructions are permissionless within the game session.

### Known Limitations (Pre-Audit)

- `resolve_round` caller can be any participant — consider restricting to a deterministic sequencer.
- Randomness for card draws uses an on-chain PRNG (hash of recent slot hash + game state); not cryptographically secure but sufficient for card distribution fairness in this game context.
- Formal audit not yet completed. OtterSec engagement planned for mainnet launch.

---

## Why Now

2026 is the first year all three enabling technologies arrived simultaneously on Solana:

- **Groth16 BN254 on-chain verification** — efficient ZK proof verification is now feasible within Solana's 1.4M CU transaction limit
- **x402 Foundation launch** — micropayment-gated AI intel is now a real economic primitive, not just a demo
- **Anchor 1.0** — stable, auditable smart contract framework for competitive gaming stakes
- **Phantom + wallet-adapter maturity** — seamless browser wallet UX without app-store gatekeeping

The combination of ZK hidden information, AI-driven intel economy, and real on-chain stakes in a playable roguelike couldn't have shipped before this year. 0xARK exists precisely because this moment arrived.

---

## Why Us

**Builder**: r0ze (雪風創業者)

- Founder of **株式会社雪風** (Yukikaze), a Japanese Web3 innovation company
- Built **MIROSS** — a method for systematizing intuition and non-verbal knowledge, now applied to game design
- Multiple Solana hackathon participant with blockchain research background
- Solo builder with a 300+ commit sprint demonstrating shipping velocity
- Design philosophy: *触って面白い最小限のものを、ブレないビジョンで磨く* — build the minimum that's actually fun, then polish without compromise

**Angle**: A Japanese solo builder using Eastern philosophy around information asymmetry (*ma*, *honne/tatemae*, the art of the unseen) to design a ZK game where what you don't reveal is your strongest move. This isn't a generic card game — it's a meditation on opacity as strategy.

---

## GTM Strategy

**Target audience (Phase 1 — Devnet Beta)**: Crypto-native card game players and Solana degens who understand on-chain stakes and want PvP with real consequences.

**Acquisition channels**:
- **Superteam Japan** — native community, direct line to Japanese Solana builders
- **Crypto Twitter / X** — gameplay clips showing ZK steals and barrier blocks; @r0ze_____ personal credibility
- **Colosseum Arena** — hackathon visibility to judges and ecosystem players
- **Farcaster Frame** — planned for Phase 2; one-click game entry from a cast
- **Playtest invites** — direct outreach to 20–30 Solana-active players for beta feedback

**Phase 2 — Mainnet**: Guild partnerships (JP gaming communities), ecosystem co-marketing with Phantom and Metaplex, seasonal tournament structure with public leaderboard.

**Why players pay 0.5 SOL entry**: Prize pool is the entire entry pool returned to the winner. It's not a fee — it's a stake in a zero-sum competition. The house takes 5% only; 95% goes back to the winner. Comparable to a poker buy-in with on-chain provable fairness.

---

## Ecosystem Integration Status

| Sponsor / Partner | Status | Notes |
|-------------------|--------|-------|
| **Phantom** | ✅ Integrated | Wallet connect, sign, devnet TX |
| **Metaplex** | ✅ Integrated | NFT mint instructions in program |
| **@solana/web3.js** | ✅ Integrated | TX building, PDA, confirmTransaction |
| **x402 Foundation** | 🔄 Custom impl | x402 protocol compatible; SDK migration planned |
| **MagicBlock ER** | 📋 Roadmap Q2 | Highest priority architectural upgrade |
| **Privy** | 📋 Roadmap Q2 | Web2 gamer onboarding (embedded wallet) |
| **MoonPay** | 📋 Roadmap Q3 | SOL purchase for non-crypto users |
| **Arcium** | 📋 Roadmap Q3 | MPC hidden information as ZK alternative |
| **Reflect** | 📋 Roadmap Q3 | Stablecoin track prize pool |

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

## Roadmap

### Q2 2026 — Mainnet Beta
- MagicBlock Ephemeral Rollup integration (replace WebSocket relay)
- Session Keys (no wallet pop-up per turn)
- Privy embedded wallet for Web2 gamer onboarding
- Mainnet deploy + first public season
- 10 concurrent players stress test

### Q3 2026 — Growth
- Compressed NFT (cNFT) for cost-efficient card minting at scale
- VRF integration (Switchboard / MagicBlock VRF) for provably fair card drops
- Farcaster Frame — in-feed game entry
- Arcium MPC integration for enhanced hidden information
- MoonPay on-ramp for non-crypto users

### Q4 2026 — Expansion
- Mobile-first redesign (Solana Mobile Seeker)
- Tournament seasons with public leaderboard
- Guild system and team play
- Secondary NFT marketplace with royalty splits
- $ARK token exploration for governance / season rewards

---

## x402 Unit Economics

The x402 intel API isn't just a demo feature — it's a self-funding AI economy.

| Intel Type | Price | Buyer | Cost Basis |
|-----------|-------|-------|------------|
| `/intel/location` | $0.002 USDC | Human players | LLM: ~$0.0001 (Haiku 4.5) |
| `/intel/hand` | $0.004 USDC | Human + VEGA/MIRA | LLM: ~$0.0002 |
| `/intel/strategy` | $0.005 USDC | VEGA/MIRA autonomously | LLM: ~$0.0003 |

**Gross margin per query**: ~95%. The AI agents (VEGA and MIRA) spend autonomously — every turn they predict and purchase intel without human intervention, generating revenue that is not contingent on player activity. At 10 AI-driven queries per battle × 100 concurrent battles = **1,000 queries/hour** → **$3–5/hour** at steady state.

**Why $0.002–$0.005 and not cheaper?** The x402 payment also acts as an anti-spam mechanism. Setting prices below the Solana transaction fee floor would make the API economically attackable. At $0.002 minimum, the economic cost of flooding exceeds any informational gain.

---

## Agent Registry

The Anchor program supports on-chain AI agent registration via the `register_agent` instruction. This enables:

1. **Verifiable agent identity** — each AI agent (VEGA, MIRA) has a registered PDA with its public key
2. **Agent-specific PDAs** — agent actions are attributed on-chain, creating a provable play history
3. **Future agent marketplace** — third-party developers can register custom agents that players hire as rivals

```
PDA: ["agent", agent_pubkey]
Fields: name (32 bytes), operator (pubkey), games_played (u32), win_rate (u16)
```

The `agent_action` instruction allows registered agents to submit battle actions directly, with the same commit-reveal security guarantees as human players. An agent cannot cheat any more than a human can — all actions are hash-committed before resolution.

---

## Compressed NFTs (cNFT) — Q3 2026

Standard SPL Token NFTs cost ~0.002 SOL rent per card. At 60 cards × 5,000 players = 300,000 mints, rent alone would be **600 SOL** (~$90K at $150/SOL). This is unsustainable at scale.

**Metaplex Bubblegum compressed NFTs** store card ownership in an on-chain Merkle tree. Cost per mint drops to **~0.000005 SOL** (40× cheaper) because only the tree root is stored on-chain; individual leaves are verified via Merkle proofs.

Migration path (Q3 2026):
- Deploy a Bubblegum tree (`create_tree`) sized for 1M+ leaves
- Replace `mint_card_nft` SPL mint with `mint_to_collection_v1` (Bubblegum)
- Client reads leaf data via DAS API (Helius or Triton)
- `claim_prize` verifies ownership via Merkle proof rather than token balance

The Anchor program's `mint_card_nft` instruction is already designed with this transition in mind — the logic is isolated and can be replaced without touching other instructions.

---

## Provably Fair Randomness (VRF) — Q3 2026

Card distribution in `start_game` currently uses an on-chain PRNG:
```
seed = sha256(recent_slot_hash || game_id || timestamp)
```

This is sufficient for the devnet launch but is theoretically gameable by a validator. **Switchboard VRF** (or MagicBlock's built-in VRF for ER-migrated games) replaces this with a verifiable random function:

1. `start_game` requests a VRF proof from the oracle
2. Oracle submits the VRF output + proof on-chain
3. Program verifies the proof and uses the output as the shuffle seed
4. No party — not even the oracle — can predict the output before commitment

Expected Q3 2026. No program ABI changes required; only the `start_game` randomness source changes.

---

## Links

- **Live Demo**: [r0ze998.github.io/0xark](https://r0ze998.github.io/0xark/)
- **GitHub**: [github.com/r0ze998/0xark](https://github.com/r0ze998/0xark)
- **Builder**: [@r0ze_____](https://x.com/r0ze_____)
- **Program (Devnet)**: [Explorer](https://explorer.solana.com/address/2gMYzenV6HQoTJA2899XxnLgzTbaWdVmegLqL7nMpVS3?cluster=devnet)
- **Security Policy**: [SECURITY.md](./SECURITY.md)

---

*Design Philosophy: 触って面白い最小限のものを、ブレないビジョンで磨く。*

*Assets: [Kenney Monochrome Pirates](https://kenney.nl/assets/monochrome-pirates) (CC0)*

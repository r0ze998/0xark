# 0xARK

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

## Why Solana?

Sub-second finality makes simultaneous commit-reveal feel instant. ~$0.00025/tx makes per-turn on-chain commits viable across a season. Solana's stablecoin infrastructure (USDC/SPL) powers the x402 AI agent micropayment economy at sub-cent costs impossible on L1 Ethereum. MagicBlock Ephemeral Rollups can push latency under 50ms for real-time multiplayer.

---

## Technical Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         GAME CLIENT                                  │
│  Browser (Vanilla JS + PixiJS v7 WebGL)                             │
│                                                                      │
│  ┌────────────────────────────────────────────────────────────┐     │
│  │  Build System: 11 modules → build.js → index.html (15k ln) │     │
│  │                                                             │     │
│  │  01-foundation   Engine globals, canvas, VT323 font        │     │
│  │  02-data         60 card definitions, dungeon floor data    │     │
│  │  03-world-setup  Map generation, tile placement             │     │
│  │  04-state        Player state, battle state, phase FSM      │     │
│  │  05-rendering    drawCardFrame, drawBattleSprite, sfx       │     │
│  │  06-world-systems  Town/dungeon HUD, title screen, map draw │     │
│  │  07-screens      Battle phases, resolve queue animation     │     │
│  │  08-ui           Victory, GameOver, Cards, Log, Stats       │     │
│  │  09-game-loop    rAF main loop, frame counter               │     │
│  │  10-input        Keyboard + touch controls                  │     │
│  │  11-save-init    localStorage save, game init               │     │
│  └────────────────────────────────────────────────────────────┘     │
└─────────┬──────────────────────────┬───────────────────┬────────────┘
          │                          │                   │
          ▼                          ▼                   ▼
┌─────────────────┐    ┌─────────────────────┐  ┌──────────────────┐
│  Solana Devnet  │    │  WebSocket Server   │  │  x402 AI Broker  │
│  (Anchor/Rust)  │    │  (Node.js :3500)    │  │  (Express :3402) │
│                 │    │                     │  │                  │
│  12 instructions│    │  Room management    │  │  4 intel APIs    │
│  ─────────────  │    │  Player sync        │  │  ─────────────   │
│  initialize     │    │  Commit broadcast   │  │  /intel/location │
│  create_game    │    │  Reveal relay       │  │  /intel/hand     │
│  join_game      │    │  State consensus    │  │  /intel/strategy │
│  start_game     │    │                     │  │  /intel/market   │
│  commit_action  │    │  Protocol:          │  │                  │
│  reveal_action  │    │  WS JSON messages   │  │  x402 paywall    │
│  resolve_round  │    │  room:join/leave    │  │  USDC via SPL    │
│  verify_zk_proof│    │  action:commit      │  │  $0.002–$0.005   │
│  mint_card_nft  │    │  action:reveal      │  │  per query       │
│  stake_entry    │    │  state:sync         │  └──────────────────┘
│  season         │    └─────────────────────┘
│  agent_registry │
└────────┬────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────────┐
│                        ZK PROOF LAYER                               │
│                                                                      │
│  Circuit: zk/circuits/commit_reveal.circom                          │
│  Hash:    Poseidon (264 constraints)                                 │
│  System:  Groth16 (browser proof generation via snarkjs)            │
│  Verify:  On-chain groth16-solana (<200K compute units)             │
│                                                                      │
│  Commit flow:  Poseidon(action, target, salt) → hash → on-chain     │
│  Reveal flow:  ZK proof that preimage matches commit → verified      │
│  Result:       No player can react to another's move                │
└─────────────────────────────────────────────────────────────────────┘
```

### Battle State Machine (FSM)

```
vs_splash → select → confirming → resolving → result
    │           │          │            │          │
  Show        Player     Show        Process    Show
  rival       picks      commit      bpResolve  winner
  splash      action     shout       Queue[]    cards
```

### ZK Commit-Reveal Sequence

```
Round N:
  Player        Rival         Solana
    │             │              │
    │──commit──►  │  ◄──commit───│  (Poseidon hash, action not revealed)
    │             │              │
    │             │  ──reveal──► │  (ZK proof + preimage)
    │──reveal──►  │              │
    │             │  ◄──verify───│  (on-chain Groth16)
    │             │   resolve_round
    │             │              │
    │◄──result────────────────── │
```

### x402 AI Agent Economy

```
  Game State (WebSocket)
        │
        ▼
  Agent Observer ──► /intel/location  ($0.002 USDC) ──► Player client
                 ──► /intel/hand      ($0.003 USDC) ──► Player client
                 ──► /intel/strategy  ($0.005 USDC) ──► Player client / Rival AI
                 ──► /intel/market    (free)         ──► Anyone
        │
        ▼
  Revenue → Prize Pool accumulation (5% platform cut)
```

---

## Rival NPCs

| NPC | Color | Style |
|-----|-------|-------|
| **VEGA** | Magenta/Pink | Aggressive stealer, high-risk plays |
| **MIRA** | Amber/Gold | Strategic SCOUT user, information hoarder |

Both rivals traverse dungeon floors independently. Their floor positions are tracked in the dungeon HUD (V: B1–B5 / TWN, M: B1–B5 / TWN) and pulse when on the same floor as the player.

---

## Card System

- **60 unique cards**, 5 rarity tiers
- Types: Attack / Defense / Escape / Magic / Recovery
- All cards are on-chain NFTs (Metaplex) — ownership is verifiable
- Winning player mints their full collection as NFTs

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
         │  + x402 fees (5%)   │
         │  accumulate here    │
         └──────────┬──────────┘
                    │
         ┌──────────▼──────────┐
         │  First to 60 cards  │
         │  claims everything  │
         └─────────────────────┘
```

Season-end distribution (if no winner):

| Place | Share |
|-------|-------|
| 1st (most unique cards) | 60% |
| 2nd | 25% |
| 3rd | 15% |

---

## Repository Structure

```
0xark/
├── solana/client/
│   ├── src/                     11 JS modules (15,258 lines total)
│   │   ├── 01-foundation.js     Engine globals, canvas setup     (2159 ln)
│   │   ├── 02-data.js           Card/dungeon data                 (802 ln)
│   │   ├── 03-world-setup.js    Map generation                    (831 ln)
│   │   ├── 04-state.js          Game state FSM                    (694 ln)
│   │   ├── 05-rendering.js      Sprites, cards, SFX              (1104 ln)
│   │   ├── 06-world-systems.js  HUD, title, map                  (1343 ln)
│   │   ├── 07-screens.js        Battle phases                    (4113 ln)
│   │   ├── 08-ui.js             Victory/GameOver/Log/Stats       (2536 ln)
│   │   ├── 09-game-loop.js      rAF main loop                     (441 ln)
│   │   ├── 10-input.js          Keyboard + touch                  (991 ln)
│   │   └── 11-save-init.js      Save/load/init                    (244 ln)
│   ├── build.js                 Module bundler → index.html
│   ├── template.html            HTML shell (PixiJS + snarkjs + web3.js)
│   └── index.html               Built output (served via GitHub Pages)
│
├── contracts/src/               Anchor smart contract (Rust)
│   ├── commit_action.rs
│   ├── reveal_action.rs
│   ├── resolve_round.rs
│   ├── verify_zk_proof.rs
│   ├── mint_card_nft.rs
│   ├── stake_entry.rs
│   ├── season.rs
│   └── agent_registry.rs
│
├── zk/
│   └── circuits/commit_reveal.circom   Poseidon hash, 264 constraints
│
├── multiplayer/
│   └── server.js                WebSocket room server
│
└── x402/
    └── agent-broker.js          AI intel broker, x402 paywall
```

---

## Quick Start

```bash
# Play in browser (no install)
open https://r0ze998.github.io/0xark/

# Build client from source
cd solana/client
node build.js          # Bundles 11 modules → index.html

# Smart contract (devnet)
cd contracts
anchor build
anchor test
anchor deploy          # Program: 2gMYzenV6HQoTJA2899XxnLgzTbaWdVmegLqL7nMpVS3

# Multiplayer server
cd multiplayer
npm install && npm start    # ws://localhost:3500

# AI agent broker
cd x402
npm install && node agent-broker.js    # http://localhost:3402

# ZK circuit
cd zk && npm install
circom circuits/commit_reveal.circom --r1cs --wasm --sym -o build/ -l node_modules
```

---

## Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Smart Contract | **Anchor (Rust)** on Solana | NFT ownership, Prize Pool, ZK verification |
| ZK | **Circom** + **snarkjs** | Hidden positions, commit-reveal integrity |
| AI Agent | **x402** + USDC micropayments | Intel economy, rival AI intelligence |
| Multiplayer | **WebSocket** (Node.js) | Real-time room sync |
| Frontend | **Vanilla JS** + **PixiJS v7** | 15k-line canvas game, FRLG-style UI |
| Wallet | **Phantom** + **@solana/web3.js** | Devnet transactions |
| Program ID | `2gMYzenV6HQoTJA2899XxnLgzTbaWdVmegLqL7nMpVS3` | Solana Devnet |

---

## Colosseum Frontier Hackathon

Built for [Colosseum Frontier](https://colosseum.com/frontier) — April 6 to May 11, 2026.

**Tracks**: Gaming / AI / Stablecoins

The first Solana game bridging ZK hidden information + roguelike dungeon exploration + AI agent micropayment economy. No prior Colosseum winner has combined all three tracks.

---

## Links

- **Live Demo**: [r0ze998.github.io/0xark](https://r0ze998.github.io/0xark/)
- **GitHub**: [github.com/r0ze998/0xark](https://github.com/r0ze998/0xark)
- **Builder**: [@r0ze_____](https://x.com/r0ze_____)

---

*Design Philosophy: 触って面白い最小限のものを、ブレないビジョンで磨く。*

*Assets: [Kenney Monochrome Pirates](https://kenney.nl/assets/monochrome-pirates) (CC0)*

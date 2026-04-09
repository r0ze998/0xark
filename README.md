# 0xARK

> **ZK Pirate Card Battle on Solana**

Five ancient spirits. Three players. One cursed island. Everything hidden.

Explore fog-covered waters. Collect 5 spirit cards to escape. Steal from rivals who can't see you. Let AI agents trade intelligence for micropayments.

**[Play Now](https://r0ze998.github.io/0xark/)** | [GDD v0.3](GDD-v0.3.md) | [GitHub](https://github.com/r0ze998/0xark)

---

## How It Works

3 players are dropped onto a cursed pirate island shrouded in Fog of War. Each area holds different spirit cards:

| Area | Spirits Available | Vibe |
|------|-------------------|------|
| **Corsair Bay** | Aegis, Umbra | Pirate harbor, NPC traders, safe zone |
| **Smuggler's Jungle** | Ignis, Tempest | Dense jungle, tall grass encounters, traps |
| **Cursed Temple** | Nihil, Aegis | Ancient ruins, puzzles, rare drops |

**You must explore all areas to complete your collection.**

### Spirit Cards

| Spirit | Hold Effect | Consume Effect | Lore |
|--------|-----------|---------------|------|
| **AEGIS** | +1 toward completion | Guaranteed Steal (pierces Barrier) | "Shield of the last captain" |
| **UMBRA** | +1 toward completion | Invisible for 1 turn | "The shadow that sails with no ship" |
| **IGNIS** | +1 toward completion | Burn target's card | "Fire that never drowns" |
| **TEMPEST** | +1 toward completion | Nullify all Barriers | "The storm answers to no flag" |
| **NIHIL** | +1 toward completion | Copy target's card | "The void between the waves" |

**The core dilemma: hold it for the win, or consume it to survive.**

### Actions (simultaneous commit-reveal)

| Action | Effect | Constraint |
|--------|--------|-----------|
| Draw | Get a card from current area | Area-specific pool |
| Steal | Take rival's card | **Same area only** |
| Barrier | Block steal attempts | Limited uses |
| Scout | See rival's hand + location | Works anywhere |
| Move | Travel to adjacent area | Costs your turn |
| Use Card | Consume for powerful effect | Card is destroyed |

### Win Conditions
1. **Complete** — Collect all 5 unique spirit types
2. **Timeout** — Most unique cards after 30 rounds
3. **Elimination** — All rivals have 0 cards

---

## Features

### Gameplay
- 3 interconnected pirate-themed maps with Fog of War
- Autonomous AI rivals with distinct personalities (Hunter vs Collector)
- Card decay timer (180s — cards expire, creating urgency)
- Threat compass, streak bonuses, area danger levels
- Fishing, traps, puzzles, NPC trading post, object interactions
- Map card effects (Ignis burns obstacles, Umbra grants stealth, Nihil phases through walls)
- Battle QTE for critical actions

### Multiplayer
- WebSocket-based real-time multiplayer (2-3 players)
- Room creation/joining with lobby UI
- Commit-reveal synchronization across players

### On-Chain
- 11 Anchor instructions (create/join/start/commit/reveal/resolve/verify_zk/mint_nft/deposit_stake/claim_prize/initialize)
- SHA256 commit-reveal with full round verification (8 tests passing)
- ZK circuit (Circom Poseidon, 264 constraints, Groth16 proof verified)
- Phantom wallet integration
- Entry stake system (deposit/claim)
- Card NFT minting for winners

### AI Agents (x402)
- Information broker server with 4 intelligence endpoints
- Location ($0.002), Hand ($0.003), Strategy ($0.005), Market (free)
- x402 protocol compliant (HTTP 402 + USDC micropayments)
- Rival AI enhanced by x402 strategy advice

### Visual
- FRLG-authentic pixel art (Kenney Monochrome Pirates CC0 + custom sprites)
- 960x640 canvas, 32x32 tiles, 2x supersampling
- 5 animated character sprites with idle animations
- Pirate ship, seagulls, monkeys, skull decorations
- Day/night cycle, ambient audio per area

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Smart Contract | **Anchor (Rust)** on Solana — 11 instructions |
| ZK | **Circom** + groth16-solana (Poseidon hash, 264 constraints) |
| AI Agent | **x402** + USDC micropayments |
| Multiplayer | **WebSocket** server (Node.js) |
| Frontend | **Canvas** pixel art (8700+ lines) |
| Assets | **Kenney** Monochrome Pirates (CC0) |
| Wallet | **Phantom** |

---

## Architecture

```
0xark/
├── solana/oxark/          — Anchor smart contract
│   ├── programs/oxark/src/
│   │   ├── state.rs       — Game, PlayerState, CardPool, Area, Events
│   │   ├── instructions/  — 11 instructions
│   │   └── tests/         — 8 passing tests (LiteSVM)
│   └── target/idl/        — Program IDL
├── solana/client/          — Game client
│   ├── index.html         — 8700+ line canvas game
│   ├── pirates-tilemap.png — Kenney sprite sheet
│   ├── wallet.js          — Phantom wallet module
│   └── onchain.js         — On-chain transaction module
├── zk/                     — ZK circuits
│   ├── circuits/           — Circom commit-reveal circuit
│   └── build/              — Proving keys, verification key
├── x402/                   — AI agent broker
│   └── agent-broker.js    — Express server, 4 endpoints
├── multiplayer/            — WebSocket server
│   └── server.js          — Room management, player sync
└── docs/                   — GDD, scripts, research
```

---

## Quick Start

```bash
# Play (browser)
open https://r0ze998.github.io/0xark/

# Build smart contract
cd solana/oxark && anchor build

# Run tests (8/8 passing)
cargo test

# Start multiplayer server
cd multiplayer && npm install && npm start

# Start x402 agent
cd x402 && npm install && node agent-broker.js
```

---

## Colosseum Frontier Hackathon

0xARK is built for [Colosseum Frontier](https://colosseum.com/frontier) (April 6 — May 11, 2026).

**Tracks**: Gaming / AI / Stablecoins

**What's unique**: First Solana game combining ZK hidden information + pirate island exploration + AI agent micropayment economy.

---

## Links

- **Live**: [r0ze998.github.io/0xark](https://r0ze998.github.io/0xark/)
- **GitHub**: [github.com/r0ze998/0xark](https://github.com/r0ze998/0xark)
- **GDD**: [v0.3](GDD-v0.3.md)
- **Builder**: [@r0ze_____](https://x.com/r0ze_____)

---

*Design Philosophy: 触って面白い最小限のものを、ブレないビジョンで磨く。*

*Assets: [Kenney Monochrome Pirates](https://kenney.nl/assets/monochrome-pirates) (CC0)*

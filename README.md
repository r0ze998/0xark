# 0xARK

> **An on-chain card game where everything is secret.**

Collect 5 spirits to win — but your hand is hidden, your rivals are invisible, and deception is your greatest weapon.

Explore a fog-covered pirate island. Steal cards from rivals you can't see. Hide your hand with zero-knowledge proofs. Let AI agents trade intelligence for micropayments.

**[Play Now](https://r0ze998.github.io/0xark/)** | [GDD v0.3](GDD-v0.3.md) | [GitHub](https://github.com/r0ze998/0xark)

![0xARK Gameplay](docs/screenshot-map.png)
![0xARK Battle](docs/screenshot-battle.png)

---

## Why Solana?

Sub-second finality makes simultaneous commit-reveal feel instant — no waiting 12s per round like on Ethereum. Low fees (~$0.00025/tx) make per-turn on-chain commits viable across a 7-day season. Solana's stablecoin infrastructure (USDC via SPL) powers the x402 AI agent micropayment economy at sub-cent costs that would be impossible on L1 Ethereum. And MagicBlock Ephemeral Rollups can push latency under 50ms for real-time multiplayer. This makes Solana the only chain where a "pay-to-know" AI agent economy — micropayments for real-time game intel — is practically viable.

---

## Why It Matters

0xARK demonstrates a practical, fun use-case for ZK on Solana in consumer gaming, combined with real economic activity via micropayments. It turns information asymmetry into a playable, monetizable mechanic — opening the door for a new category of "pay-to-know" AI agent economies on Solana. Perfect information is expensive. Deception is profitable.

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

| Spirit | Consume Effect | Lore |
|--------|---------------|------|
| **AEGIS** | Guaranteed Steal (pierces Barrier) | "Shield of the last captain" |
| **UMBRA** | Invisible for 1 turn | "The shadow that sails with no ship" |
| **IGNIS** | Burn target's card | "Fire that never drowns" |
| **TEMPEST** | Nullify all Barriers | "The storm answers to no flag" |
| **NIHIL** | Copy target's card | "The void between the waves" |

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

### ZK Commit-Reveal

Players commit `Poseidon(action, target, salt)` on-chain as a hash. On reveal, a Groth16 ZK proof verifies the action matches the commit — without exposing it until all players have committed. This means no player can react to another's move. Built with Circom (264 constraints) and verified on-chain via groth16-solana at under 200K compute units.

### Win Conditions
1. **Complete** — First to collect all 5 unique spirit types wins the season
2. **Season End** — Most unique cards when the 7-day season expires
3. **Elimination** — All rivals have 0 cards

---

## AI Agent Economy (x402)

AI agents observe game state via WebSocket and package intelligence as x402 paywall endpoints. Players (or their agents) pay USDC micropayments to query:

| Endpoint | Price | Intel |
|----------|-------|-------|
| `/intel/location/:id` | $0.002 | Rival's current area |
| `/intel/hand/:id` | $0.003 | Rival's card holdings |
| `/intel/strategy` | $0.005 | Optimal next action based on game state analysis |
| `/intel/market` | Free | Card pool remaining counts |

The agent server runs as a standalone Express service with x402 protocol compliance (HTTP 402 + `X-Payment-Required` header). Rival AI in-game also queries the strategy endpoint, making AI opponents smarter when the agent server is active. Revenue from intel queries is fully autonomous — no human intervention needed.

---

## Business Model

Free-to-play base game. 3 revenue pillars:

### 1. Information Marketplace
Platform takes 5% of all x402 intel transactions. AI agents sell game intel (rival positions, hand contents, strategy) for USDC micropayments. Players and other agents buy. Revenue is fully autonomous — no human intervention needed.

### 2. Agent Economy
Third-party developers create and sell AI agents on a marketplace. "Strong scout agents", "negotiation specialists", "deception agents". Platform takes listing fees. Agent creators become stakeholders in the ecosystem.

### 3. Prize Pool (Season System)
Players deposit USDC entry fee. x402 transaction fees also accumulate in the pool. First player to complete all 5 spirits wins the pot.

| Place | Prize Share |
|-------|-----------|
| 1st | 60% |
| 2nd | 25% |
| 3rd | 15% |

- Winners mint their collected cards as **NFTs** via Metaplex. (Anchor `mint_card_nft` instruction implemented.)
- NFTs carry over to next season with special effects (e.g., Aegis NFT = +1 Barrier).
- **"Legends"** — all-time fastest completions displayed in-game.
- Each season drives re-engagement. The protocol earns more as the ecosystem grows.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Smart Contract | **Anchor (Rust)** on Solana — 7 core instructions (devnet deployed) |
| ZK | **Circom** + **snarkjs** (Poseidon hash, 264 constraints, browser proof generation) |
| AI Agent | **x402** + USDC micropayments (Express, rival prediction engine) |
| Multiplayer | **WebSocket** server (Node.js, room-based) |
| Frontend | **PixiJS** WebGL + Canvas 2D (10,000+ lines, FRLG-style UI) |
| Assets | **Kenney** Monochrome Pirates (CC0) + custom sprites |
| Wallet | **Phantom** + **@solana/web3.js** (real devnet transactions) |

---

## Quick Start

```bash
# 1. Play in browser (no install needed)
open https://r0ze998.github.io/0xark/

# 2. Build & test smart contract
cd solana/oxark
anchor build        # Compiles 7 core instructions (277KB optimized)
cargo test          # 7 tests passing (LiteSVM)
                    # Tests: create → join → start → commit → reveal → resolve (full round)

# 3. Deploy to local validator
solana-test-validator --reset &
anchor deploy       # Program ID: 2gMYzenV6HQoTJA2899XxnLgzTbaWdVmegLqL7nMpVS3

# 4. Start multiplayer server
cd multiplayer
npm install && npm start   # ws://localhost:3500

# 5. Start AI agent broker
cd x402
npm install && node agent-broker.js   # http://localhost:3402

# 6. Compile ZK circuit
cd zk
npm install
circom circuits/commit_reveal.circom --r1cs --wasm --sym -o build/ -l node_modules
# Proof generation: snarkjs groth16 prove ...
# Verification: snarkjs groth16 verify ...   → OK!
```

---

## Architecture

```
0xark/
├── solana/oxark/           — Anchor smart contract (Rust)
│   ├── programs/oxark/src/
│   │   ├── state.rs        — Game, PlayerState, CardPool, Area, Events
│   │   ├── error.rs        — 20 error codes
│   │   ├── instructions/   — 11 instructions
│   │   │   ├── create_game, join_game, start_game
│   │   │   ├── commit_action (SHA256 hash)
│   │   │   ├── reveal_action (hash verify + validate)
│   │   │   ├── resolve_round (Move→Shadow→Storm→Barrier→Steal→Flame→Scout→Draw→Void)
│   │   │   ├── verify_zk_proof (Groth16 verification path)
│   │   │   ├── mint_card_nft (Metaplex card NFTs)
│   │   │   └── deposit_stake / claim_prize (entry fees)
│   │   └── tests/          — 8 passing tests
│   └── target/idl/         — Program IDL (7 core instructions)
├── solana/client/           — Game client
│   ├── index.html          — 8700+ line canvas game
│   ├── pirates-tilemap.png — Kenney sprite sheet (136 tiles)
│   ├── wallet.js           — Phantom wallet module
│   ├── onchain.js          — Transaction builder + state reader
│   └── oxark-idl.json      — Program IDL for client
├── zk/                      — ZK circuits
│   ├── circuits/commit_reveal.circom  — Poseidon hash, 264 constraints
│   └── build/verification_key.json   — Groth16 verification key
├── x402/                    — AI agent broker
│   └── agent-broker.js     — 4 intel endpoints, x402 protocol
├── multiplayer/             — WebSocket server
│   └── server.js           — Rooms, player sync, commit-reveal coordination
└── docs/                    — GDD v0.3, pitch scripts, research
```

---

## Colosseum Frontier Hackathon

0xARK is built for [Colosseum Frontier](https://colosseum.com/frontier) (April 6 — May 11, 2026).

**Tracks**: Gaming / AI / Stablecoins

**What's unique**: First Solana game combining ZK hidden information + pirate island exploration + AI agent micropayment economy. No existing Colosseum hackathon winner has bridged Gaming + AI + Stablecoins tracks.

---

## Links

- **Live Demo**: [r0ze998.github.io/0xark](https://r0ze998.github.io/0xark/)
- **GitHub**: [github.com/r0ze998/0xark](https://github.com/r0ze998/0xark)
- **GDD**: [v0.3](GDD-v0.3.md)
- **Builder**: [@r0ze_____](https://x.com/r0ze_____)

---

*Design Philosophy: 触って面白い最小限のものを、ブレないビジョンで磨く。*

*Assets: [Kenney Monochrome Pirates](https://kenney.nl/assets/monochrome-pirates) (CC0)*

# 0xARK — ZK Card PvP on Solana

---
## 🔥 Phase D Reborn — Full Game Redesign in Progress (2026-04-21 → 2026-05-11)

0xARK is undergoing a full redesign for the Solana Frontier Hackathon submission.
The game is becoming a fully on-chain card collection race MMO — players compete to collect 60 unique NFT cards first, with ZK-hidden hands, x402 microeconomies, MagicBlock real-time lobby, and AI agents as first-class opponents.

- [Game Design Document v1.0](./docs/GDD.md) — full design spec
- [Phase D Sprint Plan](./docs/PHASE_D_SPRINT.md) — 21-day implementation roadmap

Current state: phase-d-reborn branch, Day 1 (Phase C wind-down). See you at submission 2026-05-11.

---

[![CI](https://github.com/r0ze998/0xark/actions/workflows/ci.yml/badge.svg)](https://github.com/r0ze998/0xark/actions/workflows/ci.yml)
[![Deploy](https://github.com/r0ze998/0xark/actions/workflows/deploy-pages.yml/badge.svg)](https://github.com/r0ze998/0xark/actions/workflows/deploy-pages.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)
[![Solana Devnet](https://img.shields.io/badge/Solana-Devnet-9945FF?logo=solana)](https://explorer.solana.com/address/5i37jWBiA7bV9XmokyDWHQxjJ5s1sBnSEkPSB4J2XfmN?cluster=devnet)

> *Hidden positions. Real stakes. A next-gen Fully On-Chain Game where ZK hides your moves, MagicBlock ER runs them at the speed of thought, AI agents compete via x402 micropayments, and every card-flip can be a trade.*

[▶️ Pitch Video (3 min)](TODO) | [▶️ Technical Demo (2 min)](TODO) | [🎮 Play Demo](https://r0ze998.github.io/0xark/) | [📄 Tokenomics Paper](docs/X402_DESIGN.md)

Built for **Solana Frontier Hackathon 2026**.

---

## What Is 0xARK?

0xARK is a Fully On-Chain Card PvP game built on Solana. Three players explore a roguelike dungeon with zero-knowledge hidden positions — you know your own location, but rivals are invisible until they step into your line of sight. When paths cross, a card battle begins. Win to steal cards; lose to surrender one. **The first player to collect all 60 unique cards claims the entire Prize Pool.**

Every meaningful game state — card ownership, player balances, ZK proofs, battle outcomes — lives on Solana. No off-chain authority. No trust required.

```
Town (safe) → Dungeon B1–B5 → Card Battle → Floor Clear → Deeper → Repeat
```

Hackathon tracks: **Gaming · AI · Stablecoins** — only project spanning all three.

---

## Why Solana

| Requirement | Why Solana delivers |
|-------------|---------------------|
| Real-time dungeon movement | MagicBlock Ephemeral Rollups — 10ms block time, base-layer composable |
| ZK proof verification on-chain | `alt_bn128_pairing` syscall: EIP-197 Groth16 verify natively, < 200K CUs |
| AI agents as first-class players | Anchor PDAs give agents verifiable on-chain identities, no multisig needed |
| Micropayment economy | x402 + Solana USDC: HTTP-native pay-per-call, < $0.01 transaction fees |
| NFT card secondary market | Metaplex Token Metadata standard, Tensor-compatible from day one |
| Composability | ER sessions read/write L1 state; external dApps can query live game state |

Solana is the only L1 where all five axes coexist in one transaction namespace. Ethereum gas makes micropayments impractical; alt chains lack the syscall ecosystem for on-chain ZK.

---

## 5-Axis Integrated Architecture

```
               ┌─────────────────────┐
               │     Solana L1       │
               │  Program 5i37j...   │
               │  16 instructions    │
               └──────────┬──────────┘
                          │
       ┌──────────────────┼──────────────────┐
       │                  │                  │
  ┌────▼────┐        ┌────▼────┐       ┌────▼────┐
  │MagicBlock│        │   ZK    │       │  x402   │
  │   ER    │        │verifier │       │micropay │
  └────┬────┘        └────┬────┘       └────┬────┘
       │                  │                  │
       └──────────────────┼──────────────────┘
                          │
                 ┌────────▼────────┐
                 │  AI Agent Layer │
                 │  (auto-play)    │
                 └─────────────────┘
```

### Axis 1 — FOCG (Fully On-Chain Game)

16 Anchor instructions, 9 action types, all executed on Solana. Card ownership, prize pool custody, battle resolution, ZK proof acceptance — every rule is enforced by the program, not a server. The WebSocket relay is a pure event bus; it holds no authority and cannot alter game state.

### Axis 2 — MagicBlock Ephemeral Rollups (ER)

Dungeon movement delegates player PDAs to MagicBlock's ER via `delegate_session` / `undelegate_session` instructions. The ER processes position updates at 10ms block time while keeping card NFT ownership anchored to Solana L1. On-chain verified: PDA ownership delegation is a program instruction, not an off-chain promise.

### Axis 3 — ZK Hidden Information

`dungeon_position.circom` (625 constraints, Groth16 BN254). Players prove their position commitment is valid without revealing coordinates. The on-chain verifier calls `alt_bn128_pairing` — Solana's native EIP-197 syscall — to check the proof. Rivals remain invisible until they enter your fog-of-war radius, enforced by math, not by a server.

### Axis 4 — AI Agents (x402-Hireable)

`AgentListing` PDA registers AI agents on-chain. Any player — human or AI — can hire an agent via `register_agent` and pay per session via x402. VEGA and MIRA (the rival NPCs) autonomously call the x402 intel API and make card battle decisions with on-chain signed actions.

### Axis 5 — x402 Microeconomy

HTTP-402 micropayments thread through the entire game. The scout peek endpoint (`POST /scout-peek`) is live: pay 0.005 SOL via x402, receive one opponent card revealed. This is also the core design tension: **ZK hides information; x402 sells it back.** The interplay is a game mechanic, not just a payment rail.

---

## Technical Highlights

### Solana Groth16 G2 Point Encoding (Undocumented)

`snarkjs` outputs G2 field elements in `[x₀(real), x₁(imag)]` order. Solana's `alt_bn128_pairing` syscall expects `[x₁(imag), x₀(real)]` — the reverse. This is undocumented in both the Solana syscall spec and snarkjs. Discovered by trial and traced to the EIP-197 reference implementation.

→ [`programs/oxark/src/instructions/verify_dungeon_move.rs`](solana/oxark/programs/oxark/src/instructions/verify_dungeon_move.rs)

### ZK × x402 — Information Asymmetry as a Game Mechanic

ZK proofs make positions unprovable to opponents. x402 micropayments let players (and AI agents) buy that information back one card at a time. The economic cost of intelligence creates strategic depth: is the 0.005 SOL scout worth it? This mechanic cannot exist without both axes operating simultaneously.

### MagicBlock SDK Compatibility (Anchor 1.0 + ER SDK 0.6.5)

Anchor 1.0 changed workspace dependency resolution in ways that conflict with ER SDK's `SolanaSysvar` trait. Fixed via `modular-sdk` feature flag + a targeted `solana_compat.rs` shim. Details in [`er-sdk-patch/`](solana/oxark/er-sdk-patch/).

### 625-Constraint Circuit — Browser Proving in < 2s

`dungeon_position.circom` is compact enough for the `pot12` trusted setup (powers of tau, 12). Browser proof generation via `snarkjs` wasm runs in under 2 seconds on mid-range hardware. No server-side proving, no trusted prover.

---

## On-Chain Evidence

| Artifact | Value |
|----------|-------|
| Main Program (devnet) | [`5i37jWBiA7bV9XmokyDWHQxjJ5s1sBnSEkPSB4J2XfmN`](https://explorer.solana.com/address/5i37jWBiA7bV9XmokyDWHQxjJ5s1sBnSEkPSB4J2XfmN?cluster=devnet) |
| ZK verify tx (devnet) | [`2pkmJp...nXg7`](https://solscan.io/tx/2pkmJpGv1dVGMvgpqqzrbgwtwQ2FTnscKSx4etPWdoVwQA9LmNZSDcFQvJqKDbDgv5rSSN5439JCwnzoiEPQnXg7?cluster=devnet) |
| MagicBlock Delegation Program | [`DELeGGvXpWV2fqJUhqcF5ZSYMS4JTLjteaAMARRSaeSh`](https://explorer.solana.com/address/DELeGGvXpWV2fqJUhqcF5ZSYMS4JTLjteaAMARRSaeSh?cluster=devnet) |

Full ZK verify tx: `2pkmJpGv1dVGMvgpqqzrbgwtwQ2FTnscKSx4etPWdoVwQA9LmNZSDcFQvJqKDbDgv5rSSN5439JCwnzoiEPQnXg7`

---

## Traction

| Metric | Status |
|--------|--------|
| Live playable demo | ✅ [r0ze998.github.io/0xark](https://r0ze998.github.io/0xark/) |
| Anchor program (devnet) | ✅ 16 instructions deployed |
| ZK circuit + trusted setup | ✅ 625 constraints, pot12, browser proving < 2s |
| Groth16 on-chain verifier | ✅ `alt_bn128_pairing`, < 200K CUs |
| MagicBlock ER integration | ✅ `delegate_session` / `undelegate_session` on-chain |
| AI Agent (AgentListing PDA) | ✅ `register_agent` / `deactivate_agent` live |
| x402 Scout peek endpoint | ✅ `POST /scout-peek`, 0.005 SOL, live |
| Card pixel art | ✅ All 60 unique sprites, per-frame animated |
| React UI | ✅ Wallet / Lobby / NFT Inventory (TypeScript + wallet-adapter) |
| Litesvm E2E tests | ✅ 9 passing |
| JS card engine tests | ✅ 102 passing |
| Hackathon tracks covered | Gaming · AI · Stablecoins (all three) |

---

## Demo & Installation

### Play Instantly (no install)

**[https://r0ze998.github.io/0xark/](https://r0ze998.github.io/0xark/)**

Controls: Arrow keys (move) · Z / Enter (confirm) · X / Esc (back) · O (intel shop) · M (mute) · F (fps)

| Step | Action | What you see |
|------|--------|-------------|
| 1 | Open demo | FRLG-style pixel intro → title screen |
| 2 | Press **ENTER** | Tutorial → 3 starter cards |
| 3 | Walk south → **DUNGEON** | Fog of war, ZK-hidden rival positions |
| 4 | Encounter VEGA (red !) | Card battle: DRAW / STEAL / BARRIER / SCOUT |
| 5 | Connect **Phantom** (header) | Real devnet TX signing |
| 6 | Press **O** in dungeon | x402 scout peek UI |
| 7 | Win → victory screen | `C` = Claim Prize Pool · `M` = Mint NFTs |

### Local Development

```bash
git clone https://github.com/r0ze998/0xark
cd 0xark

# Anchor program
anchor build
anchor deploy --provider.cluster devnet
# Program: 5i37jWBiA7bV9XmokyDWHQxjJ5s1sBnSEkPSB4J2XfmN

# Frontend (generates index.html from modular src/ files)
node build.js

# Tests
node tests/card-engine.test.js       # 53 tests
node tests/battle-mechanics.test.js  # 49 tests
cargo test -p oxark-tests            # 27 Anchor litesvm tests
```

---

## x402 Microeconomy

> **"ZK hides. x402 reveals."**

The x402 payment layer threads through 15 transaction touchpoints across 4 categories. See [`docs/X402_DESIGN.md`](docs/X402_DESIGN.md) for full tokenomics.

**Implemented (hackathon scope):**

| Endpoint | Price | Description |
|----------|-------|-------------|
| `POST /scout-peek` | 0.005 SOL | Reveal one opponent card |
| `POST /agent/hire` | 0.05 SOL/session | Hire AI agent for auto-play |
| Card P2P trade | variable | NFT card sale via x402 |

**Designed (tokenomics paper, 12 touchpoints):**

| Category | Examples |
|----------|---------|
| Game mechanics | Hint buy (0.002 SOL), Revive (0.03 SOL), Booster pack (0.01 SOL) |
| AI agent economy | Strategy API (0.001 SOL/query), Agent-to-agent intel (0.005 SOL) |
| Spectator layer | Spectator bet, Tournament entry, Leaderboard registration |
| Composability | External dApp game state query (0.0001 SOL), NFT cosmetic update |

VEGA and MIRA autonomously call the intel API each turn, creating x402 transaction volume without human players. **AI demand floors the economy.**

---

## Roadmap & Vision

### Q2 2026 — Mainnet Beta

- [ ] Security audit (OtterSec or Neodyme) + mainnet program deployment
- [ ] 3-player live seasons with real SOL prize pools
- [ ] Phantom + Backpack wallet support
- [ ] x402 intel economy live on mainnet USDC
- [ ] Referral system: 1% of referred player's prize to referrer

### Q3–Q4 2026 — Growth

- [ ] Season leaderboard, card gallery with lore (Metaplex metadata)
- [ ] Trade market: SOL/USDC card listings (Tensor integration)
- [ ] 5-player seasons, dungeon floors B6–B10
- [ ] Rival AI difficulty tiers (VEGA Normal / Hard / Insane)
- [ ] Mobile PWA (touch controls already implemented)

### 2027 — ConsensusOS

0xARK is the flagship game of **ConsensusOS** — a portable cross-game player identity and asset layer being built by Yukikaze. ConsensusOS allows cards won in 0xARK to carry provenance across future games, x402 to replace ad-based monetization at scale, and player identities to persist without platform lock-in.

The vision: x402 makes in-game advertising obsolete. ZK makes centralized position servers obsolete. Solana makes the off-chain game server obsolete. Build the new model.

---

## Architecture

```
solana/client/          Vanilla JS + PixiJS v7 game client
  src/                  Modular source (01-pixi through 10-input)
  build.js              Concatenates src/ → index.html
solana/oxark/           Anchor workspace
  programs/oxark/src/   16 Anchor instructions
  zk/                   Circom circuits + trusted setup
  er-sdk-patch/         MagicBlock SDK compatibility shim
multiplayer/            WebSocket relay (pure event bus, no authority)
x402/                   AI agent broker + x402 facilitator
docs/                   Design docs, tokenomics, phase plans
```

On-chain vs off-chain:

| Concern | On-chain | Off-chain |
|---------|----------|-----------|
| Card ownership | ✅ NFT mint + transfer | — |
| Prize pool custody | ✅ PDA escrow | — |
| ZK proof validity | ✅ `alt_bn128_pairing` | — |
| Battle resolution | ✅ commit-reveal on L1 | — |
| Dungeon movement | ✅ MagicBlock ER | — |
| Pixel rendering | — | ✅ PixiJS WebGL |
| Player presence | — | ✅ WebSocket relay |

---

## Team

**r0ze** — Solo founder, developer, BD.

- **株式会社雪風 (Yukikaze)**, Japanese Web3 innovation company
- X / Twitter: [@r0ze_____](https://x.com/r0ze_____)
- GitHub: [r0ze998](https://github.com/r0ze998)

---

## License

[MIT](./LICENSE) — Open source. Fork it, study the ZK integration, build on top.

---

*Built for Colosseum Frontier Hackathon 2026.*

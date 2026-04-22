# 0xARK — ZK Card PvP on Solana

---
## ✅ Phase D Reborn — Complete (2026-04-22)

0xARK Reborn is a fully on-chain ZK card dueling game on Solana with three ranked halls, AI opponents, Legendary card economy, and Season Prize Pool distribution.

- [Game Design Document](./docs/GDD.md)
- [Phase D Sprint Plan](./docs/PHASE_D_SPRINT.md) — 21-day implementation roadmap
- [Submission Materials](./docs/arena-submission.md)

Branch: `phase-d-reborn` — submitted to Colosseum Frontier 2026.

---

[![CI](https://github.com/r0ze998/0xark/actions/workflows/ci.yml/badge.svg)](https://github.com/r0ze998/0xark/actions/workflows/ci.yml)
[![Deploy](https://github.com/r0ze998/0xark/actions/workflows/deploy-pages.yml/badge.svg)](https://github.com/r0ze998/0xark/actions/workflows/deploy-pages.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)
[![Solana Devnet](https://img.shields.io/badge/Solana-Devnet-9945FF?logo=solana)](https://explorer.solana.com/address/5i37jWBiA7bV9XmokyDWHQxjJ5s1sBnSEkPSB4J2XfmN?cluster=devnet)

> *Hidden hands. Provable fairness. AI that fills every queue. Legendaries that only transfer at Gold Hall.*

[🎮 Play Demo](https://r0ze998.github.io/0xark/) | [📄 Submission](docs/arena-submission.md) | [📋 Pitch Script](docs/pitch-video-script.md) | [📣 X Posts](docs/x-post-draft.md)

Built for **Colosseum Frontier Hackathon 2026**.

---

## What Is 0xARK?

0xARK is a Fully On-Chain Card PvP game built on Solana. Players duel across three ranked halls — Bronze, Silver, Gold — using a ZK commit-reveal hand system. Win duels to collect cards. Reach 60/60 to claim the Season Prize Pool. Legendaries can only be won at Gold Hall.

Every meaningful game state — card ownership, matchmaking queues, ZK commitments, Legendary supply, Prize Pool — lives on Solana. No off-chain authority. No trust required.

```
Lobby (Crown Plaza) → Choose Hall → Queue → ZK Hand Commit → 5-Round Duel → Transfer Cards → Season Leaderboard
```

| Hall | Ante | Card Transfer | Legendary |
|------|------|---------------|-----------|
| Bronze | 0.1 SOL | 2 non-Legendary | No |
| Silver | 0.2 SOL | 2 non-Legendary | No |
| Gold | 0.5 SOL | 2 normal + 1 Legendary | Yes |

Hackathon tracks: **Gaming · AI · Payments** — all three.

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
| Anchor program (devnet) | ✅ 30+ instructions deployed |
| ZK hand commitment | ✅ Poseidon hash + Groth16, browser proving < 3s |
| Matchmaking queues | ✅ Bronze/Silver/Gold, on-chain PDA |
| 5-round duel system | ✅ Draw/Energy/Summon/Battle, element affinity |
| AI opponent | ✅ claude-haiku-4-5, joins after 30s, tutorial mode |
| Legendary system | ✅ 4 species, cap 10/season, supply PDA on-chain |
| Victory scene + card transfer | ✅ 2 normal + 1 Legendary banner |
| x402 in-duel payments | ✅ Scout Peek 0.005 SOL / Extra Action 0.01 SOL |
| Season Prize Pool | ✅ 40% champion distribution instruction |
| Lore Shards | ✅ 60 cards × 3 tiers (15 fully written) |
| Card pixel sprites | ✅ 60 animated 16×16 sprites |
| Portrait pipeline | ✅ Arweave upload + in-game cache ready (art pending) |
| Hackathon tracks covered | Gaming · AI · Payments (all three) |

---

## Demo & Installation

### Play Instantly (no install)

**[https://r0ze998.github.io/0xark/](https://r0ze998.github.io/0xark/)**

Controls: Arrow keys (move) · Z / Enter (interact) · X / Esc (back/cancel) · M (mute)

| Step | Action | What you see |
|------|--------|-------------|
| 1 | Open demo | Title screen → Crown Plaza lobby |
| 2 | Connect **Phantom** | SOL balance + card count in HUD |
| 3 | Walk to **Bronze Hall** | Proximity prompt → queue dialog |
| 4 | Join queue | Wait for opponent (AI joins after 30s) |
| 5 | Duel starts | ZK commit animation → 5-round duel |
| 6 | Win | Victory screen, cards flying in, TX hash |
| 7 | Open **PC Box** | Card storage grid → tap card → Card Detail + Lore |
| 8 | Walk to **Gold Hall** | 0.5 SOL ante → Legendary at stake |

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
  src/                  28 modular source files (00-tokens through 11-card-storage)
  build.js              Concatenates src/ → index.html (32k lines)
solana/oxark/           Anchor workspace
  programs/oxark/src/   30+ Anchor instructions (matchmaking, ZK duel, Legendary, Season)
  zk/                   Circom circuits + trusted setup artifacts
  er-sdk-patch/         MagicBlock SDK compatibility shim
multiplayer/            WebSocket relay (pure event bus, no authority)
x402/                   x402 facilitator + AI agent broker
tools/ai-agent/         Anthropic claude-haiku-4-5 matchmaking agent (duel-agent.js)
tools/arweave-upload/   Card portrait Arweave uploader + NFT metadata generator
docs/                   Design docs, GDD, sprint plan, submission materials
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

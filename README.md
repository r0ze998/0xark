# 0xARK

**On-chain TCG card battle on Solana** — with ZK proofs, x402 micropayments, and AI agents.

**🔗 [Live Demo → r0ze998.github.io/0xark](https://r0ze998.github.io/0xark/)**

[![Live Demo](https://img.shields.io/badge/Live%20Demo-r0ze998.github.io%2F0xark-d8b034)](https://r0ze998.github.io/0xark/)
[![Devnet](https://img.shields.io/badge/Solana-Devnet-9370db)](https://explorer.solana.com/?cluster=devnet)
[![License](https://img.shields.io/badge/License-MIT-blue)](LICENSE)

---

## 📋 Implementation Status

Honest snapshot as of hackathon submission (2026-05-11):

| Feature | Status | Notes |
|---|---|---|
| ZK proof — on-chain `verify_zk_proof` | ✅ | Fires automatically on every battle reveal. Groth16 proof generated client-side (~272ms); `reveal.js:28` submits TX when `zkProofBytes !== null`. Devnet TXs: `5WoVAmNC…` · `M2fwWd2m…` |
| ZK proof — Groth16 + SHA-256 commitment (client) | ✅ | Groth16 proof + SHA-256 commitment generated every battle (`preparation.js:264`). ~272ms. WASM + zkey bundled in `solana/client/` |
| x402 micropayments — server | ⚠️ | 13 server endpoints fully implemented, Redis replay protection, Coinbase spec compliant. Client module (`02-x402.js`) not loaded in the battle UI — `window.x402` is undefined in current demo |
| AI strategy advisor | ⚠️ | Server endpoint `/x402/ai-strategy-advice` implemented (Claude Haiku 4.5). Not called from active battle screens in current demo |
| AI autonomous move delegation | 🚧 | Server endpoint `/x402/ai-move` implemented. Client integration and autonomous TX signing not yet implemented |
| NFT mint / burn / evolve (SPL) | ✅ | `register_waitlist` (`app.js:169`) and `buy_pack` (`shop-screen.js:306`) call on-chain SPL mint CPI. `burn_card` / `evolve_cards` instructions available |
| Multiplayer WebSocket sync | ✅ | Matchmaking + duel relay deployed on Fly.io; single-instance guaranteed |
| MagicBlock Ephemeral Rollups | 🚧 | Not yet integrated |

---

## 🎮 Live Demo

**🔗 https://r0ze998.github.io/0xark/**

Try it now:

1. Connect Phantom wallet (Devnet)
2. Get devnet SOL: https://faucet.solana.com/
3. Register Waitlist (0.5 SOL deposit)
4. Receive 5 starter cards
5. Battle, burn, evolve, claim prizes

---

## 🏆 Hackathon Submission

**Colosseum Frontier 2026** (deadline 2026-05-11)

- Track: Gaming and AI
- Developer: r0ze (Yukikaze)
- Built solo

### 🎬 Submission Videos

- **Pitch Video**: [link to be added]
- **Technical Demo Video**: [link to be added]

---

## ⚡ 30-second overview

🎴 **60 NFT cards** for a 14-day on-chain TCG
🔐 **ZK proofs** for hand secrecy and provable fair-play (on-chain Groth16 BN254 verification)
💰 **x402 micropayments** (HTTP 402 standard) — peek/draw from 0.005 SOL
🤖 **AI agents** (Claude Haiku 4.5) for strategy advice and autonomous battle
🔥 **Burn / Evolve / Imprint** — NFTs change permanently on-chain
🏪 **Complete game economy**: Shop pack purchases + Trade Floor marketplace + Tier prize distribution

---

## 🌐 Why Solana?

Two core features of 0xARK are Solana-native requirements.

**x402 micropayments** work because SOL transfers settle in ~400ms with sub-cent fees. The per-action pricing model (0.0001–0.01 SOL per endpoint call) is economically unviable on any chain with $1+ gas costs. On Solana it's a real mechanic, not a gimmick.

**Ephemeral Rollups** (MagicBlock, planned) will let battle state update in real time without committing every card play on-chain, while the final result settles atomically to the Anchor program. This collapses the usual tradeoff between on-chain trust and playable latency — the fight happens off-chain at game speed, the outcome is on-chain truth.

Together, these make a genuinely playable, economically-grounded on-chain TCG feasible today.

---

## 🔗 Live On-Chain Evidence

| Event | TX hash | Explorer |
|---|---|---|
| GameWorld PDA init | `4EUynBDn…` | [Solana Explorer](https://explorer.solana.com/?cluster=devnet) |
| Anchor program upgrade (ZK Phase 2) | `2Wu8wQCd…` | [Solana Explorer](https://explorer.solana.com/?cluster=devnet) |
| ZK proof verify (Phase 2 deploy) | `5WoVAmNC…` | [Solana Explorer](https://explorer.solana.com/?cluster=devnet) |
| ZK proof verify (live battle flow) | `M2fwWd2m…` | [Solana Explorer](https://explorer.solana.com/tx/M2fwWd2mUQErAP1qCy9HRAFSUbnb527q55dFoipAY9CNJnJ1KojQE8JmQCGFttntwpjDmqCSd53uqTL4FBM7qbY?cluster=devnet) |
| GameWorld Phase 20-B migration | `2eyAJEJz…` | [Solana Explorer](https://explorer.solana.com/?cluster=devnet) |
| Shop params set (threshold=0) | `3SYqk9HV…` | [Solana Explorer](https://explorer.solana.com/?cluster=devnet) |

**Anchor program**: `5i37jWBiA7bV9XmokyDWHQxjJ5s1sBnSEkPSB4J2XfmN` (devnet)

**Upgrade Authority**: Held by r0ze during active devnet development. Planned to be renounced on mainnet deployment.

---

## 🧪 Tech Stack

### Core

- **Solana** (Anchor, devnet)
- **Circom 2.x + snarkjs** (Groth16 BN254)
- **Node.js + WebSocket** (Fly.io)
- **Phantom wallet adapter**
- **Vanilla JS + GBA palette** (Sprite Seas design system)

### Web3 Innovations

- **ZK proof on-chain verification** via `alt_bn128_pairing` precompile
- **x402** (HTTP 402) SOL micropayment, Coinbase x402 spec compliant
- **NFT mechanics**: Burn, Evolve, Imprint (on-chain permanent)

### AI

- **Claude Haiku 4.5** via Anthropic API
- **AI Strategy Advisor** (`/x402/ai-strategy-advice` endpoint)
- **AI Move Delegation** (`/x402/ai-move` endpoint)

---

## 🏗 Architecture

```
┌────────────────────────────────────────────────────┐
│  Frontend (GitHub Pages)                            │
│  - Phantom wallet                                   │
│  - 60-card vault grid + 4 battle screens           │
│  - 4 rarity frames (Sprite Seas design)            │
└──────────────────┬──────────────────────────────────┘
                   │
       ┌───────────┴───────────┐
       │                       │
       ▼                       ▼
┌──────────────┐     ┌──────────────────┐
│ ZK Layer     │     │ Multiplayer      │
│ - Circom     │     │ Server           │
│ - snarkjs    │     │ - WebSocket      │
│ - Groth16    │     │ - x402 endpoint  │
└──────┬───────┘     │ - Redis          │
       │             │   (replay        │
       │             │    protection)   │
       │             └─────────┬────────┘
       │                       │
       └───────────┬───────────┘
                   ▼
┌──────────────────────────────────────────┐
│ Anchor Program (Solana devnet)            │
│ Program ID: 5i37jW...XfmN                 │
│ - register_waitlist (0.5 SOL deposit)     │
│ - burn_card / evolve_cards                │
│ - grant_imprint / claim_battle_loot       │
│ - claim_prize_v2 / check_legendary        │
│ - verify_zk_proof (alt_bn128 pairing)     │
│ - buy_pack / update_game_params           │
│ - create_listing / accept_listing         │
│ - cancel_listing                          │
│ - 20+ PDAs, 59 instructions               │
└────────────────────────────────────────────┘
                   ▲
                   │
          ┌────────┴────────┐
          │ AI Agent        │
          │ Claude          │
          │ Haiku 4.5       │
          └─────────────────┘
```

---

## 🎯 Game Design

### 14-day 1-shot Season

- 60 unique cards across 6 clans (Knight / Merchant / Pirate / Scholar / Monk / Engineer)
- 6 Legendaries with unique personalities (Conqueror / Patron / Phoenix / Detective / Hermit / Sage)
- 14 days to collect, win, burn, evolve

### Tier Prize Distribution

| Tier | Cards | Reward Share |
|---|---|---|
| T1 | 60 cards (full collection) | 50% |
| T2 | 50–59 cards | 25% |
| T3 | 30–49 cards | 15% |
| T4 | 10–29 cards | 8% |
| T5 | 1–9 cards | 2% |

### v3+ Mechanics

- Burn: permanent removal + ability effect (e.g., "Burn: deal 3 damage to all enemy cards")
- Evolve: merge 2 cards into 1 child card
- Steal: battle winner takes 1 card from loser (`claim_battle_loot`, SlotHashes random)
- Imprint: victory mark permanently recorded on Legendary cards

### Shop (Phase 20-B)

Players can purchase card packs with SOL:

| Pack | Cards | Price | Special |
|---|---|---|---|
| Standard | 5 random | 0.05 SOL | — |
| Premium | 3 cards | 0.15 SOL | +1 Uncommon guaranteed |

Drop rates (admin-tunable via `update_game_params`):

| Phase | Common | Uncommon | Rare | Legendary |
|---|---|---|---|---|
| Phase 1 (Days 1–7) | 80% | 18% | 2% | 0% |
| Phase 2 (Days 8–14) | 79% | 17% | 2.5% | 1.5% |

- Sales split: 50% Operations / 50% Prize Pool
- Random source: Solana SlotHashes sysvar (verifiable on-chain, no oracle dependency)
- Legendary drop gated until Day 8 to preserve "first 10 achievers" exclusivity

### Trade Floor (Phase 20-C)

Player-to-player marketplace with 0% platform fee:

| Action | Description |
|---|---|
| Create listing | Seller lists a card with custom SOL price (min 0.001 SOL) |
| Accept listing | Buyer pays seller directly; card moves atomically |
| Cancel listing | Seller withdraws listing and recovers card |

- Card escrow: listed cards are removed from seller's vault at listing time, returned on cancel
- All rarities tradable: Common through Legendary
- Direct SOL transfer: buyer → seller, no intermediary cut
- Built on TradeListing PDAs: `seeds = [b"trade", seller_pubkey, card_id]`

---

## 🔬 ZK Proof System

### Circuit (`hand_commitment.circom v2`)

- 5 cards + salt + pubkey + round → Poseidon commit
- Range check: `1 <= card_id <= 60`
- Uniqueness check: all 5 cards unique
- 2,040 constraints (BN254)

### On-Chain Verification

- `verify_zk_proof` Anchor instruction
- Uses `alt_bn128_pairing` precompile
- `ZkProofRecord` PDA prevents replay
- pubkey + round consistency verified on-chain

### Battle Flow

**Live battle flow:** Groth16 proof generated client-side (~272ms) on every hand commit (`preparation.js:264`). `reveal.js:28` submits `verify_zk_proof` TX automatically when proof bytes are present. Replay prevented by `ZkProofRecord` PDA (`init` fails on re-use).

Devnet TXs: `5WoVAmNC…` (Phase 2 deploy) · `M2fwWd2m…` (live flow, 2026-05-11)

Details: `docs/ZK_REVIEW_VERIFICATION.md`

---

## 💰 x402 Micropayment System

### 13 endpoints

| Endpoint | Price |
|---|---|
| `/x402/match-battle` | 0.001 SOL |
| `/x402/peek-vault-size` | 0.0005 SOL |
| `/x402/peek-vault-content` | 0.005 SOL |
| `/x402/draw-extra` | 0.01 SOL |
| `/x402/ai-strategy-advice` | 0.003 SOL |
| `/x402/ai-move` | 0.005 SOL |
| `/x402/co /re /hc /hr /pa /rs /me` | 0.0001 SOL |

### Status

Server-side infrastructure is fully implemented and tested. The client module (`src/02-x402.js`) contains the full payment flow with hardcoded `EXPECTED_PRICES` validation, but is not loaded in the current battle UI (`index.html`). Battle screens use optional-chained calls (`window.x402?.scoutPeek`) that silently no-op when the module is absent.

### Security (Phase A + B closed)

- Replay protection: Redis persistence (sig + nonce, TTL applied)
- Price hardcode: client-side EXPECTED_PRICES validates server-declared values
- Memo nonce required: X402_REQUIRE_MEMO=true by default
- Memo format unified: endpoint=path;nonce=uuid;v=1
- Recipient allowlist + dev-bypass blocked in production

Details: docs/X402_INTEGRATION_LOG.md

---

## 🤖 AI Agent

Two AI features powered by Claude Haiku 4.5:

### Strategy Advisor

Server endpoint `/x402/ai-strategy-advice` is implemented (Claude Haiku 4.5). Returns `primaryAction + alternativeActions + reasoning` (JSON). Client-side integration into battle screens is not wired in the current demo — calling the endpoint requires loading `02-x402.js` and connecting it to the interruption screen UI.

- Use case: assistance for new players, learning strategy
- 0.003 SOL micropayment (server-side implemented)

### AI Move Delegation

Server endpoint `/x402/ai-move` is implemented. End-to-end client integration and autonomous TX signing are not yet implemented.

- Use case: hands-free play, automated battles, AI tournaments
- 0.005 SOL micropayment (server-side implemented)
- Post-hackathon: wire client UI + delegate session key for autonomous on-chain moves

---

## 🗺 Roadmap

### Devnet (current)

- ✅ Hackathon submission (Colosseum Frontier 2026)
- ✅ ZK Phase 1–3 + devnet e2e
- ✅ x402 Critical A + B (all closed)
- ✅ Phase 20 complete — full game economy loop (Shop + Trade Floor + Prize Distribution)
- 🔲 Card art (60 pieces) + Public preparation
- 🔲 Waitlist Season 1 (devnet)
- 🔲 Continued development on devnet

### Mainnet

- Future migration to mainnet after sufficient testing on devnet

---

## 🛡 Audits

| Source | Score | Critical Issues |
|---|---|---|
| Internal Audit | 73 issues found | Major issues resolved |
| GPT — ZK Proof | 7.2/10 → 9.0+/10 | 5/5 Critical resolved |
| GPT — x402 | 7.2/10 → 9.0+/10 | 5/5 Critical resolved |
| Grok — Overall | 89/100 | Top 12–18 range |

Details:

- docs/COMPREHENSIVE_AUDIT.md
- docs/ZK_REVIEW_VERIFICATION.md
- docs/x402-review-bundle.md

---

## 📊 Test Coverage

| Suite | Count |
|---|---|
| Anchor (Rust) | 35 tests |
| Client (JS) | 110+ tests |
| ZK e2e | 6 tests + devnet integration |
| x402 security | 54 tests (Phase A + B) |
| Phase 20-B Shop | 22 tests (9 Rust unit + 13 JS integration) |
| Phase 20-C Trade Floor | 33 tests |
| Total | 260+ passing |

---

## 📚 Documentation

| Doc | Contents |
|---|---|
| docs/game-design-v2.md | Game design specification |
| docs/COMPREHENSIVE_AUDIT.md | Internal security audit (73 items) |
| docs/V3_PLUS_INTEGRATION_LOG.md | v3+ mechanics integration |
| docs/SERVER_WIRING_PLAN.md | Multiplayer server architecture |
| docs/ONCHAIN_INTEGRATION_LOG.md | Anchor program deployment log |
| docs/X402_INTEGRATION_LOG.md | x402 micropayment implementation |
| docs/ZK_REVIEW_VERIFICATION.md | ZK proof system verification |
| docs/POST_HACKATHON_ROADMAP.md | Post-submission roadmap |

---

## 🚀 Local Development

```bash
# Clone the repository
git clone https://github.com/r0ze998/0xark.git
cd 0xark

# Build and deploy Anchor program
cd solana/oxark
anchor build
anchor deploy --provider.cluster devnet

# Start frontend client
cd ../client
npx serve . -l 4200
# open http://localhost:4200

# Start multiplayer server
cd ../../multiplayer
npm install
node server.js  # localhost:3500

# (Optional) Run AI Agent
cd ../tools/ai-agent
npm install
npm test
```

---

## 👤 About

Built solo by **r0ze** under **Yukikaze** — indie on-chain game developer.

- Twitter: [@r0ze_](https://twitter.com/r0ze_)
- GitHub: [@r0ze998](https://github.com/r0ze998)
- Other projects: ConsensusOS, ZeroGarden

### Post-Hackathon 30-Day Plan

1. **Playable MVP** — close remaining battle flow gaps; full end-to-end 2-player game on devnet
2. ✅ **ZK live** — Groth16 proof + `verify_zk_proof` TX wired in live battle flow (2026-05-11)
3. **Card art** — commission 60 card illustrations
4. **Community** — open Discord + Twitter launch thread
5. **On-chain game analysis** — Substack publication launching May 2026; writing about design decisions, ZK tradeoffs, and the economics of on-chain TCGs

The goal is a real Season 1 on devnet with 50+ players within 60 days of the hackathon.

---

## 📝 License

MIT

---

[▶ Play now](https://r0ze998.github.io/0xark/)

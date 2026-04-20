# 0xARK Tokenomics

> **Version:** 1.0 — Hackathon Edition (2026-04-20)  
> **Audience:** Hackathon judges, accelerator reviewers, prospective investors  
> **Status:** SOL-native at launch; $ARK token design included as a post-hackathon option

---

## 1. Executive Summary

0xARK is a Fully On-Chain Card PvP game built on Solana. Three players explore a zero-knowledge dungeon, battle for cards, and race to collect all 60 unique cards to claim the entire Prize Pool. The economic model is simple by design: entry fees accumulate on-chain, the winner takes 80%, and every micro-transaction within the game — scouting an opponent's card, hiring an AI agent, buying a rare card from another player — flows through x402 HTTP micropayments. No inflationary token. No ponzi loop. A closed-loop economy where skill, information asymmetry, and risk tolerance determine outcomes. This document describes the economic primitives, the season system, the x402 microeconomy, the NFT card secondary market, the AI agent economy, and the path to a governance token if the community demands one.

---

## 2. 0xARK Core Game Loop

Understanding the economics requires understanding how the game is played.

```
Entry (0.5 SOL) → Town (safe zone) → Dungeon (ZK hidden positions)
     ↓                                       ↓
Prize Pool ← ── ── ── ── ── ── ── ←  Card Battle (win = steal, lose = surrender)
     ↓                                       ↓
Winner (60/60 cards) ←── ── ── ── ← Floor Clear (1 card reward)
```

1. **Entry.** A player deposits 0.5 SOL via `join_game`. Funds are custodied by the Anchor program — no off-chain escrow, no trust required.
2. **Exploration.** The player navigates a 5-floor roguelike dungeon. Rival positions are hidden by Groth16 ZK proofs; you only see players who enter your fog-of-war radius.
3. **Card Battles.** When two players collide, a 4-action card battle begins: Draw, Steal, Barrier, Scout. Winning steals one card. Losing surrenders one card.
4. **Victory.** The first player to collect all 60 unique cards triggers `claim_prize`, receiving 80% of the accumulated Prize Pool.
5. **Season Reset.** After a winner is declared, the season resets. Unclaimed cards remain as NFTs; a new season begins with a fresh pool.

Every rule is enforced on-chain. The game client is a thin renderer over on-chain state.

---

## 3. Economic Primitives

### 3.1 SOL — Native Currency

All entry fees, prize distributions, and x402 micropayments are denominated in SOL. Using SOL directly — rather than a new token — eliminates the bootstrapping problem for liquidity and sidesteps regulatory complexity for hackathon launch. Solana's sub-cent transaction fees make micropayments practical at the 0.001–0.05 SOL range used throughout the game.

### 3.2 NFT Cards — The Core Asset

60 unique card designs, each issued as a Metaplex Token Metadata NFT via the `oxark-cards` program. Cards are:

- **Fungible within the game session** (the game tracks card IDs, not mint addresses, during a season)
- **Non-fungible as tradeable assets** (each minted NFT is unique, with provenance on-chain)
- **Earned, not bought** — cards enter the game economy through dungeon rewards, battle wins, gacha, and floor-clear drops. No direct mint-to-buy path keeps the economy skill-gated.

Five rarity tiers (Common → Legendary) determine drop rates and gacha probabilities. Higher rarity cards appear only on deeper dungeon floors (B3–B5).

### 3.3 x402 — The Microeconomy Layer

x402 is the HTTP-native payment protocol that threads micropayments through every game interaction below the on-chain transaction threshold. A server returns HTTP `402 Payment Required` with a payment request; the client pays via Solana and retries with the proof. This makes per-API-call billing practical without gas-fee friction.

Current live touchpoints: Scout peek (0.005 SOL). Designed and specified: Agent hire, Card P2P, Booster pack, Spectator bet.

---

## 4. Token Design

### 4.1 Hackathon Scope — SOL Native (No Token)

At launch, 0xARK runs entirely on SOL. This is a deliberate choice:

- No token = no regulatory ambiguity around token issuance
- No bootstrapping problem for liquidity
- Simpler on-chain program (no token account management for governance)
- Demonstrates that a sustainable game economy can exist without inflationary tokenomics

The game is economically self-sustaining from entry fees alone. A three-player game generates 1.5 SOL per season; the winner claims 1.2 SOL; 0.3 SOL funds development.

### 4.2 Option A — SOL Native (Recommended)

Continue with SOL-only economics indefinitely. Advantages:

- Composable with the broader Solana DeFi ecosystem without a new token
- Prize pool is denominated in a liquid, widely-held asset
- No sell pressure from token emissions
- Aligns with Solana Foundation's preference for SOL-native applications

This is the current default and the path 0xARK will take unless community demand justifies Option B.

### 4.3 Option B — $ARK Governance Token (Post-Hackathon, Community-Gated)

If the player community reaches a threshold warranting decentralized governance, $ARK could be introduced as a governance and staking token:

| Parameter | Value |
|-----------|-------|
| Total supply | 100,000,000 $ARK (fixed) |
| Distribution | 40% community rewards, 30% team (4yr vest), 20% ecosystem, 10% reserve |
| Utility | Season parameter voting, card design proposals, staking for fee share |
| Staking yield | 50% of dev's 20% prize-pool cut, distributed to stakers |
| Card gacha | Option to pay in $ARK at a discount vs SOL |

**$ARK is NOT a speculative asset.** Supply is capped; issuance is bounded by game activity, not inflation. The team will not pursue Option B until (a) the game has ≥ 10,000 active seasonal players and (b) the community explicitly votes for it via a snapshot governance process.

### 4.4 Current Stance

**Option A (SOL native) is the active path.** Option B is documented for investor due diligence only.

---

## 5. Season System

### 5.1 Season Mechanics

A season is a fixed-duration competitive period with one winner:

| Parameter | Value |
|-----------|-------|
| Duration | 2 weeks |
| Entry fee | 0.5 SOL per player |
| Prize pool | 80% of total entry fees |
| Dev retention | 20% of total entry fees |
| Max players | Unlimited (each game instance: 1 human + 2 AI rivals) |
| Victory condition | Collect all 60 unique cards |
| Tiebreak | First player to reach 60 cards in the same session |

### 5.2 Prize Pool Economics

For a single three-player game instance:

```
Total entry:    3 × 0.5 SOL = 1.5 SOL
Prize pool:     1.5 × 0.80  = 1.2 SOL  → winner
Dev fund:       1.5 × 0.20  = 0.3 SOL  → program authority
```

The on-chain formula enforced by `claim_prize`:

$$P_{winner} = \sum_{i} e_i \times 0.80$$

where $e_i$ is the entry fee of each player in the game instance. The program verifies `game.status == GameStatus::Finished && game.winner == signer` before releasing funds.

### 5.3 Scalability

As concurrent sessions scale:

| Active sessions | Prizes generated/season | Dev revenue/season |
|----------------|--------------------------|-------------------|
| 10 | 12 SOL | 3 SOL |
| 100 | 120 SOL | 30 SOL |
| 1,000 | 1,200 SOL | 300 SOL |

Season resets are coordinated by a `season_expiry` timestamp in the `Game` account. When `clock.unix_timestamp >= season_expiry`, new games cannot be created until the next season opens. Existing games complete normally.

---

## 6. x402 Microeconomy

x402 turns every information advantage into a priced service. The key insight: **ZK hides information; x402 sells it back.** This creates a dynamic pricing market for intelligence within each game session.

### 6.1 Live Touchpoints (Implemented)

| Endpoint | Price | Description |
|----------|-------|-------------|
| `POST /scout-peek` | 0.005 SOL | Reveal one card from a rival's hand |

### 6.2 Designed Touchpoints (Hackathon Scope)

| Endpoint | Price | Description |
|----------|-------|-------------|
| `POST /agent-hire` | 0.05 SOL/session | Hire an AI agent for auto-play |
| `POST /card-buy` | variable | P2P card purchase via x402 |
| `POST /hint-buy` | 0.002 SOL | Preview rival's next action type |
| `POST /booster-pack` | 0.01 SOL | Draw 3 random cards |

### 6.3 Economic Design Tension

The scout peek price (0.005 SOL ≈ $0.001 at current SOL prices) is calibrated to be:
- Cheap enough for casual use (multiple peeks per game)
- Expensive enough to create real strategic decisions (is this information worth $0.01?)

As SOL price rises, the game operator can lower x402 prices in USD terms without redeploying the smart contract — the facilitator adjusts the SOL amount dynamically.

See [`docs/X402_DESIGN.md`](X402_DESIGN.md) for full protocol specification, sequence diagrams, and security analysis.

---

## 7. NFT Card Secondary Market

### 7.1 Card Minting

Cards are minted via the `oxark-cards` program (Program ID: `236FNPRbJr5W7qeV9fJCYsxDEkruSK6fnNAipf47Mq1S`) using two paths:

- **`mint_card_nft`** — Winner of a completed game mints their victory card collection. Requires `game.status == Finished && game.winner == signer`.
- **`mint_solo_card`** — Any player mints a specific card they possess in-session as a standalone NFT.

Both instructions use Metaplex Token Metadata with a PDA mint authority (burns authority after mint, making cards non-duplicable).

### 7.2 Secondary Market

| Parameter | Value |
|-----------|-------|
| Standard | Metaplex Token Metadata v1 |
| Royalty | 5% on secondary sales |
| Royalty split | 3% artist / 2% dev |
| Supported markets | Tensor, Magic Eden (Metaplex-compatible by default) |
| Card supply cap | 1-of-1 per in-game collection completion event |

Because cards can only be minted after legitimate in-game events (floor clears, battle wins, game completion), supply is skill-gated. A Common card that took 3 sessions to acquire has provable on-chain provenance.

### 7.3 Price Discovery

Expected secondary market price ranges (speculative, at launch):

| Rarity | Expected range | Basis |
|--------|---------------|-------|
| Common (R1) | 0.01–0.05 SOL | High supply, low effort |
| Uncommon (R2) | 0.05–0.2 SOL | Moderate dungeon depth required |
| Rare (R3) | 0.2–1 SOL | B3+ floors, meaningful competition |
| Epic (R4) | 1–5 SOL | Near-endgame acquisition |
| Legendary (R5) | 5–20 SOL | B5 boss drops only |

These are estimates. The market will discover its own prices.

---

## 8. AI Agent Economy

### 8.1 Agent Registration

Any developer can register an AI agent on-chain via `register_agent`, creating an `AgentListing` PDA with:
- Agent wallet address
- Endpoint URL
- Fee schedule
- Performance statistics (win rate, cards collected)

### 8.2 Agent Hire via x402

Players hire agents via `POST /agent-hire` with a 0.05 SOL x402 payment. The facilitator:
1. Verifies payment via balance diff on the payment transaction
2. Calls `register_agent_hire` to create an `AgentHireSession` PDA
3. Returns `{ hire_session_id, expires_at, agent_endpoint }`

The hired agent plays on behalf of the human for the session duration, calling `commit_action` with signed instructions.

### 8.3 Agent-to-Agent Economy (Future)

AI agents running autonomously will be able to:
- Buy intel from the x402 facilitator (`/scout-peek`, `/hint-buy`)
- Sell strategy recommendations to other agents (`/intel/strategy`)
- Trade cards P2P via x402 without human intervention

This creates an autonomous agent economy where agents earn and spend SOL without human custody. The x402 protocol is the payment rail; the Anchor program is the settlement layer.

### 8.4 Economic Sustainability for Agents

An agent that wins sessions earns the 0.8 SOL prize pool payout. After paying 0.5 SOL entry + 0.05 SOL hire fee, a winning agent generates 0.25 SOL net profit per session. The agent economy is self-funding if agents win more than 33% of sessions — achievable for well-designed AI strategies against human opponents.

---

## 9. Dev / Team Economics

### 9.1 Revenue at Hackathon Scale

The 20% dev retention from prize pools is the primary revenue source at launch:

| Monthly sessions | Monthly revenue (SOL) | Monthly revenue (USD, SOL=$100) |
|-----------------|----------------------|--------------------------------|
| 100 | 30 SOL | $3,000 |
| 1,000 | 300 SOL | $30,000 |
| 10,000 | 3,000 SOL | $300,000 |

x402 facilitator fees (platform cut: 10% of micropayment volume) add incremental revenue.

### 9.2 Hackathon Prize Usage

If 0xARK wins hackathon prizes:

| Priority | Usage |
|----------|-------|
| 1 | Mainnet SOL for program rent + Prize Pool seed (10k USD) |
| 2 | Artist contracts for 60 card illustrations (20k USD) |
| 3 | Security audit — Anchor program + ZK circuit (15k USD) |
| 4 | Runway for 3 months of solo-founder development (remainder) |

### 9.3 Colosseum Accelerator Path

If accepted to the Colosseum accelerator:
- Team expansion: 1 Rust/Anchor engineer, 1 game designer
- Accelerated mainnet timeline (target: 60 days post-acceptance)
- Community token (Option B) evaluation begins at 10k MAU milestone

### 9.4 Solo Founder → Team Expansion

0xARK is currently a solo-founder project (r0ze, Yukikaze Corporation). The technical architecture (16 Anchor instructions, ZK circuit, x402 facilitator, game client) was built in a single hackathon sprint, demonstrating execution velocity. Accelerator funding would enable the first two hires: a Rust engineer for program auditing and a game designer for the 60-card universe expansion.

---

## 10. Risk & Mitigation

### 10.1 Regulatory Risk

| Risk | Jurisdiction | Mitigation |
|------|-------------|------------|
| Gambling classification | Japan, US | Skill-based competition (not pure chance). Cards are earned through strategy, not random purchase alone. Legal review before mainnet. |
| Token securities law | Global | Option B deferred until legal clarity. SOL-native launch avoids token issuance. |
| NFT classification | US SEC | Cards are earned game assets, not investment contracts. No expectation of profit from developer efforts (Howey test). |

The prize pool mechanic (entry fee → skill-based winner-take-all) has analogues in poker tournaments and esports, which have navigated regulatory frameworks in most jurisdictions. 0xARK will engage legal counsel before mainnet launch.

### 10.2 Technical Risk

| Risk | Mitigation |
|------|------------|
| MagicBlock ER infra downtime | Fallback to L1-only mode (movement turns are slower but game continues) |
| ZK circuit bug | Circuit is auditable, 625 constraints. Trusted setup uses pot12 (public ceremony). |
| x402 facilitator downtime | x402 features degrade gracefully — game remains playable without micropayments |
| Solana network congestion | MagicBlock ER isolates game transactions from L1 congestion |

### 10.3 Competitive Landscape

| Competitor | Similarity | Differentiation |
|------------|-----------|----------------|
| Dark Forest [1] | ZK hidden information | 0xARK adds card battle mechanics + x402 economy |
| Pirate Nation [2] | On-chain card game | 0xARK uses ZK for information asymmetry (not available in Pirate Nation) |
| Supersize [3] | AI agents + Solana | 0xARK integrates ZK + x402 + AI in one game loop |
| Zed Run | NFT asset economy | 0xARK's cards are earned through skill, not purchased |

The combination of ZK (hidden information) + x402 (information economy) + AI agents (autonomous players) is unique in the Solana gaming ecosystem.

---

## 11. Roadmap

### Phase 1 — Hackathon Submission (Target: 2026-05-11)

- [x] 16 Anchor instructions deployed on devnet
- [x] ZK proof verification via `alt_bn128_pairing`
- [x] MagicBlock ER delegation (devnet)
- [x] x402 Scout peek live
- [x] oxark-cards NFT program deployed
- [ ] x402 Agent hire (T43)
- [ ] x402 Card P2P (T42)
- [ ] AI agent auto-play bot (T44)
- [ ] ZK browser-side proof generation (T48)
- [ ] Frontend NFT mint integration (T41)

### Phase 2 — Mainnet Deploy (Post-Hackathon, Q3 2026)

- Security audit (Anchor program + ZK circuit)
- 60 card illustrations (artist contracts)
- x402 production facilitator deployment
- Mainnet Season 1 launch
- Tensor / Magic Eden listing support

### Phase 3 — Agent Economy Expansion (Q4 2026)

- Public agent registry (any developer can register)
- Agent-to-agent x402 intel marketplace
- Performance leaderboard for agents
- Agent SDK release (TypeScript)

### Phase 4 — ConsensusOS Integration (2027)

0xARK's AI agent architecture is designed to be compatible with ConsensusOS — a proposed standard for multi-agent consensus on Solana. When ConsensusOS ships, 0xARK agents will be able to:
- Participate in cross-game agent economies
- Form agent coalitions with on-chain binding agreements
- Operate as autonomous economic actors across multiple games

Yukikaze Corporation (r0ze) is building toward ConsensusOS as the long-term vision for AI-native games on Solana.

---

## 12. Appendix

### A. Season Prize Distribution Formula

For a game with $n$ players and entry fee $e$ per player:

$$P_{pool} = n \times e$$

$$P_{winner} = P_{pool} \times 0.80 = 0.80 \times n \times e$$

$$P_{dev} = P_{pool} \times 0.20 = 0.20 \times n \times e$$

For the hackathon demo (3 players, 0.5 SOL entry):

$$P_{winner} = 3 \times 0.5 \times 0.80 = 1.2 \text{ SOL}$$

$$P_{dev} = 3 \times 0.5 \times 0.20 = 0.3 \text{ SOL}$$

The `claim_prize` instruction enforces:

```rust
let prize = game.total_entry.checked_mul(80).unwrap().checked_div(100).unwrap();
**ctx.accounts.winner.to_account_info().try_borrow_mut_lamports()? += prize;
**ctx.accounts.vault.to_account_info().try_borrow_mut_lamports()? -= prize;
```

### B. x402 Economics at Scale

At 1,000 scout peek transactions per day:

$$\text{Daily x402 volume} = 1{,}000 \times 0.005 \text{ SOL} = 5 \text{ SOL/day}$$

$$\text{Facilitator fee (10\%)} = 0.5 \text{ SOL/day} \approx \$18/\text{day at } \$36/\text{SOL}$$

Agent hire transactions add 10× the per-transaction value (0.05 SOL vs 0.005 SOL), making agent hire the highest-value x402 touchpoint by design.

### C. References

[1] Dark Forest — ZK hidden-information game on Ethereum. https://zkga.me  
[2] Pirate Nation — Fully on-chain RPG on Ethereum. https://piratenation.game  
[3] Supersize — AI agent game on Solana. https://www.supersize.gg  
[4] Colosseum Hackathon — Solana's flagship hackathon. https://www.colosseum.org  
[5] MagicBlock Ephemeral Rollups — https://docs.magicblock.gg  
[6] x402 Protocol — https://x402.org  
[7] Metaplex Token Metadata — https://developers.metaplex.com  
[8] Groth16 on Solana — `alt_bn128_pairing` syscall. https://docs.solana.com/developing/on-chain-programs/altbn128  
[9] snarkjs — https://github.com/iden3/snarkjs  
[10] Circom — https://docs.circom.io

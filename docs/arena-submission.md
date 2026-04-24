# Colosseum Arena Submission — 0xARK Reborn

> Updated: 2026-04-22 (Phase D Reborn)

## Project Name
0xARK

## One-liner
ZK-powered PvP card dueling on Solana: hidden hands, three ranked halls, AI opponents, and Legendary cards that only transfer in Gold Hall.

## Description
0xARK is a Fully On-Chain Game on Solana where players duel for NFT cards across three ranked halls — Bronze, Silver, and Gold. Every hand is hidden using ZK commit-reveal (Poseidon hash + Groth16). Win duels to collect all 60 cards, earn Legendary drops at Gold Hall, and claim the Season Prize Pool.

The game integrates four cutting-edge technologies that each earn their place:
- **ZK Proofs** — hand commitments are provably sealed until reveal; no client-side spoofing
- **MagicBlock ER** — low-latency ephemeral rollup for real-time duel state
- **Anthropic AI (claude-haiku-4-5)** — AI matchmaking agent fills empty queues, plays duels with strategic reasoning, and degrades to tutorial mode for new players
- **x402 micropayments** — Extra Action and Scout Peek special moves cost SOL via x402

## Core Loop
Connect wallet → Lobby (Crown Plaza) → Choose hall (Bronze/Silver/Gold) → Queue → ZK hand commitment → 5-round duel → Transfer 2 cards on win (+1 Legendary if Gold Hall) → Season leaderboard

## Hall Tiers
| Hall | Entry | Card Transfer | Legendary Drop |
|------|-------|---------------|----------------|
| Bronze | 0.1 SOL | 2 random (non-Legendary) | No |
| Silver | 0.2 SOL | 2 random (non-Legendary) | No |
| Gold | 0.5 SOL | 2 random + **1 Legendary** | Yes (4 species, 10/season cap) |

## AI Agent
`tools/ai-agent/duel-agent.js` — Anthropic claude-haiku-4-5:
- Polls matchmaking queue every 5 seconds
- Joins as opponent after a human waits 30 seconds
- Makes Summon decisions via LLM prompt with game state, falls back to rule-based on API error
- **Tutorial mode**: plays at 70% human win rate for new players (AGENT_DIFFICULTY=tutorial)

## ZK Duel Flow
1. Both players draw 5 cards
2. **Commit phase**: each player Poseidon-hashes their hand + secret salt → submits commitment on-chain
3. **Summon phase**: place cards in lanes (front/middle/back), use Extra Action (0.01 SOL) or Scout Peek (0.005 SOL)
4. **Battle phase**: simultaneous resolution — element affinity (fire>ice>lightning>fire, +25% BP), Defender intercepts, lane damage
5. **Reveal phase**: ZK proof verifies hand commitment; cheating is mathematically impossible

## Legendary System
- 4 species: Sceptre of Valerius, Nameless Blade, Elyon Crown, Kingmaker's Ring
- Cap: 10 of each per Season
- Earn: every 4 Gold Hall wins → 1 Legendary claim
- Transfer: on Gold Hall loss, winner inherits 1 of loser's Legendaries (in addition to 2 normal cards)
- Victory screen: gold aura "LEGENDARY CLAIMED" banner with species name + mint number

## Tracks
- Gaming
- AI
- Payments / x402

## Links
- **Live Demo**: https://r0ze998.github.io/0xark/
- **GitHub**: https://github.com/r0ze998/0xark
- **Branch**: `phase-d-reborn`
- **Devnet Program**: `5i37jWBiA7bV9XmokyDWHQxjJ5s1sBnSEkPSB4J2XfmN` ([Explorer](https://explorer.solana.com/address/5i37jWBiA7bV9XmokyDWHQxjJ5s1sBnSEkPSB4J2XfmN?cluster=devnet))

## Tech Stack
- **Anchor (Rust)** — 30+ instructions: matchmaking queue, ZK duel, Legendary system, Season/Prize Pool
- **Circom + Poseidon** — hand commitment ZK circuit
- **MagicBlock ER** — ephemeral rollup for duel phase state
- **Anthropic claude-haiku-4-5** — AI opponent with strategic and tutorial difficulty modes
- **x402 (HTTP 402)** — Extra Action / Scout Peek in-duel micropayments
- **Vanilla JS + PixiJS v7** — 640×360 canvas client, 28-module build system

## What Makes This Unique
1. **ZK commit-reveal (hands hidden until reveal) in a live PvP duel** — card hands are cryptographically sealed per round; no speculator can read opponent hand from chain state
2. **AI opponent that reasons** — claude-haiku-4-5 receives full game state and produces a JSON Summon decision; not scripted behavior
3. **Legendary economy** — supply-capped NFT species create real scarcity; transferable only at Gold Hall creates a high-stakes capture moment
4. **Season arc** — 14-day seasons with on-chain prize pool distribution; 40% to champion, season winner enshrined in-game
5. **Lore Shards** — each of 60 cards has 3-tier narrative lore unlocked by gameplay; collecting Legendary unlocks Shard 3

## Why It Matters for Solana
0xARK proves you can build a compelling real-time card PvP game that is provably fair, financially meaningful, and AI-augmented — all on Solana, all on-chain. The Prize Pool model turns every season into a real financial event. The AI opponent makes any player count viable. The ZK hand commitment makes "who cheated?" an unanswerable question.

## Business Model
1. **Hall entry fees** — 0.1/0.2/0.5 SOL → Season Prize Pool (admin takes 5% platform fee)
2. **x402 in-game purchases** — Extra Action (0.01 SOL) + Scout Peek (0.005 SOL) per duel; streams into prize pool
3. **AI agent licensing** — third-party agents can pay to join queues; API key access to matchmaking

## Team
- **r0ze** (solo) — Previously built 0xCIV (#24/31 Dojo Game Jam VIII on Starknet). Full-stack: Rust/Anchor, TypeScript, Circom ZK, Anthropic API. 21-day Phase D sprint.
- **Claude Code (Anthropic)** — Lead engineer for the overnight autonomous session (Days 13-21)

## Pitch Video Notes (3 min)
1. Hook: "What if your hand was provably hidden, the AI played for you when no one shows up, and Legendaries only transferred at Gold Hall?"
2. Problem: On-chain card games are either transparent (cards visible) or centralized (server-side hidden)
3. Solution: ZK hand commitment + AI opponent + Legendary scarcity
4. Demo: Show lobby → Bronze Hall queue → AI agent joins → ZK commit animation → 5-round duel → Victory screen with card transfer + Legendary banner
5. Tech: Anchor 30+ instructions + Circom Poseidon + claude-haiku-4-5 agent + x402 Scout Peek
6. Traction: 60 cards, 3 halls, full Season system, Legendary supply on-chain
7. Vision: Competitive card PvP where ZK guarantees fairness and AI fills every queue

## Submission Checklist
- [x] Live demo deployed to GitHub Pages
- [x] Devnet program deployed and verified
- [x] AI agent running (ANTHROPIC_API_KEY required)
- [x] ZK circuits compiled and wasm artifacts at repo root
- [x] 60 card pixel sprites (portrait upload pending r0ze art batch)
- [x] Season 1 PDA ready to init on devnet
- [ ] Arena registration (r0ze to complete web form)
- [ ] Pitch video recording (script ready in docs/pitch-video-script.md)

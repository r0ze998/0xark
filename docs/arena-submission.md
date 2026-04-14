# Colosseum Arena Submission — 0xARK

## Project Name
0xARK

## One-liner
Collect all 60 hidden cards from a sunken ship. First to win takes the Prize Pool. ZK keeps everything secret on Solana.

## Description
Long ago, the ARK vessel sank near a remote island. Its crew sealed their power into 60 arcane cards — scattered across the wreck and the surrounding dungeon floors. Collect all 60 cards to inherit the ARK's legacy and claim the Prize Pool.

0xARK is a ZK-powered fog-of-war card collection PvP game on Solana. Players hide their hand and dungeon position with zero-knowledge proofs, battle rivals for cards in commit-reveal combat, and buy strategic intelligence from autonomous AI agents via x402 micropayments. Perfect information costs $0.001. Deception is free.

The win condition is simple. The path is not.

## Core Loop
Enter the sunken ARK dungeon → Explore fog-of-war floors → Battle rivals (ZK commit-reveal) → Steal or collect cards → Escape before they decay (3.5 min) → Repeat until 60/60

AI rivals VEGA (hunter) and MIRA (archivist) compete against you autonomously. The x402 broker sells their positions and hand contents for USDC micropayments.

## Tracks
- Gaming
- AI
- Stablecoins

## Links
- **Live Demo**: https://r0ze998.github.io/0xark/
- **GitHub**: https://github.com/r0ze998/0xark
- **Devnet Program**: `2gMYzenV6HQoTJA2899XxnLgzTbaWdVmegLqL7nMpVS3` ([Explorer](https://explorer.solana.com/address/2gMYzenV6HQoTJA2899XxnLgzTbaWdVmegLqL7nMpVS3?cluster=devnet))
- **GDD**: https://github.com/r0ze998/0xark/blob/main/GDD-v0.3.md

## Tech Stack
- Anchor (Rust) smart contracts on Solana
- Circom + groth16-solana for ZK commit-reveal
- x402 + USDC for AI agent micropayments
- Canvas pixel art frontend (FRLG style)
- Phantom wallet integration

## What Makes This Unique
1. **ZK fog-of-war** — hand contents and dungeon position hidden via Poseidon hash proofs. First Solana game combining ZK hidden hands + area-based exploration.
2. **AI agent economy via x402** — VEGA and MIRA autonomously query and sell game intel for $0.001-$0.005 per request. Rival prediction engine models player behavior.
3. **Meaningful win condition** — 60 NFT cards → Prize Pool claim. Not a grind — a race. Clear start, clear finish.
4. **Narrative-first design** — Inspired by Greed Island (HxH) × Dark Forest × Pokémon FRLG. The ARK lore gives every mechanic a story reason to exist.
5. **Full game loop running today** — explore, battle, steal, synthesize, gacha, mint, claim. Not a demo — a game.

## Why It Matters for Solana
0xARK demonstrates a practical, fun use-case for ZK on Solana in consumer gaming, combined with real economic activity via micropayments. It turns information asymmetry into a playable, monetizable mechanic — opening the door for a new category of "pay-to-know" AI agent economies on Solana.

## Business Model

0xARK has 3 revenue pillars:

1. **Information Marketplace** — Platform takes 5% of all x402 intel transactions. AI agents sell game intel (rival positions, hand contents, strategy) for USDC micropayments. Players and other agents buy.

2. **Agent Economy** — Third-party developers create and sell AI agents on a marketplace. "Strong scout agents", "negotiation specialists", "deception agents". Platform takes listing fees.

3. **Prize Pool (Season System)** — Players deposit USDC entry fee. x402 transaction fees also accumulate in the pool. First player to complete all 5 spirits wins the pot. Prize distribution: 1st: 60%, 2nd: 25%, 3rd: 15%. Winners mint their collected cards as NFTs. NFTs carry over to next season with special effects (e.g., Aegis NFT = +1 Barrier). "Legends" — all-time fastest completions displayed in-game.

**Why this is fundable:** Three compounding revenue streams: platform fees on a growing information marketplace, listing fees on an AI agent economy, and season entry fees flowing into prize pools. Each season drives re-engagement. Agent creators become stakeholders. The protocol earns more as the ecosystem grows.

## Team
- r0ze — Solo developer. Previously built 0xCIV (#24/31 Dojo Game Jam VIII on Starknet). Full-stack: Cairo, Rust, TypeScript, React. Building at the intersection of onchain games, AI agents, and ZK.

## Pitch Video Notes (3 min)
1. Hook: "What if your hand was provably hidden, the map was fog-of-war, and AI agents sold intel for $0.001?"
2. Problem: Onchain games are too transparent. Information asymmetry IS the game.
3. Framing: "Perfect information is expensive. Deception is profitable."
4. Demo: Show gameplay — explore, find card, encounter rival, battle with commit-reveal, buy intel from AI
5. Core loop: Secretly commit → Reveal with ZK proofs → Resolve → AI rivals sell predictions
6. Tech: Anchor + Circom ZK + x402 AI agent micropayments (USDC)
7. Traction: [live demo, GitHub stars, testers]
8. Vision: A "pay-to-know" AI agent economy where information itself has market value on Solana

## Technical Demo Notes (3 min)
1. Show Anchor program structure (7 instructions)
2. Show ZK circuit (Poseidon hash, 264 constraints, proof generation)
3. Show x402 agent broker (4 endpoints, HTTP 402 flow)
4. Show game client (3 maps, fog of war, battle system)
5. Show commit-reveal flow: hash → commit → reveal → verify → resolve

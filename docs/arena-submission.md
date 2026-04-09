# Colosseum Arena Submission — 0xARK

## Project Name
0xARK

## One-liner
ZK-powered information asymmetry pirate card game on Solana.

## Description
0xARK is a ZK-powered information asymmetry pirate card game on Solana. Players hide their hand and position with zero-knowledge proofs, explore fog-of-war maps, and strategically trade intel with autonomous AI agents using x402 micropayments (USDC). It's a tense mind-game where perfect information is expensive, and deception is profitable.

## Core Loop
Secretly commit actions on-chain → Reveal with ZK proofs → Resolve in dramatic order → AI rivals sell predictions and sightings.

## Tracks
- Gaming
- AI
- Stablecoins

## Links
- **Live Demo**: https://r0ze998.github.io/0xark/
- **GitHub**: https://github.com/r0ze998/0xark
- **GDD**: https://github.com/r0ze998/0xark/blob/main/GDD-v0.3.md

## Tech Stack
- Anchor (Rust) smart contracts on Solana
- Circom + groth16-solana for ZK commit-reveal
- x402 + USDC for AI agent micropayments
- Canvas pixel art frontend (FRLG style)
- Phantom wallet integration

## What Makes This Unique
1. First Solana game combining ZK hidden hands + area-based strategy
2. AI agents autonomously trade game intelligence via x402 ($0.001-$0.005 per query)
3. Inspired by Greed Island (HxH) + Dark Forest — "information is the real weapon"
4. Full game loop: explore, collect, battle, trade, win

## Why It Matters for Solana
0xARK demonstrates a practical, fun use-case for ZK on Solana in consumer gaming, combined with real economic activity via micropayments. It turns information asymmetry into a playable, monetizable mechanic — opening the door for a new category of "pay-to-know" AI agent economies on Solana.

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

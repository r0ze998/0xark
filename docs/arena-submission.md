# Colosseum Arena Submission — 0xARK

## Project Name
0xARK

## One-liner
ZK card-stealing PvP game with Dark Forest fog of war and AI agent micropayments on Solana.

## Description
0xARK drops 3 players onto a fog-covered island where each area holds different cards. Collect all 5 types to win — but your hand is hidden (ZK), your location is hidden (fog of war), and rivals can steal from you (if they're in the same area). Cards can be consumed for powerful effects, creating a constant dilemma: hold for completion or use for survival. AI agents trade intelligence via x402 USDC micropayments.

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

## Team
- r0ze — Solo developer. Previously built 0xCIV (#24/31 Dojo Game Jam VIII on Starknet). Full-stack: Cairo, Rust, TypeScript, React. Building at the intersection of onchain games, AI agents, and ZK.

## Pitch Video Notes (3 min)
1. Hook: "What if poker had provably hidden hands, and your AI agent could buy intel for $0.001?"
2. Problem: Onchain games are too transparent. Information asymmetry IS the game.
3. Solution: ZK hidden hands + fog of war + area-locked cards
4. Demo: Show gameplay — explore, find card, encounter rival, battle, win
5. Tech: Anchor + Circom ZK + x402 AI agent
6. Traction: [live demo, GitHub stars, testers]
7. Vision: AI agent economy where information itself has market value

## Technical Demo Notes (3 min)
1. Show Anchor program structure (7 instructions)
2. Show ZK circuit (Poseidon hash, 264 constraints, proof generation)
3. Show x402 agent broker (4 endpoints, HTTP 402 flow)
4. Show game client (3 maps, fog of war, battle system)
5. Show commit-reveal flow: hash → commit → reveal → verify → resolve

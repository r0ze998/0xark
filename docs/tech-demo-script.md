# 0xARK — Technical Demo Script (3 minutes)

## [0:00-0:30] Architecture Overview

*[Show: repo structure in terminal]*

```
0xark/
├── solana/oxark/     — Anchor smart contract (Rust)
├── solana/client/    — Game client (Canvas, 7000 lines)
├── zk/               — Circom ZK circuits
└── x402/             — AI agent broker
```

"Full stack on-chain game. Let me walk through each layer."

## [0:30-1:00] Smart Contract

*[Show: lib.rs with 8 instructions]*

"Eight Anchor instructions: create, join, start, commit, reveal, resolve, verify ZK proof, and initialize."

*[Show: state.rs]*

"Game state includes: 5 card types, 3 areas (Port, Forest, Ruins), area-locked card pools, simultaneous commit-reveal."

*[Show: resolve_round.rs resolution order]*

"Resolution order matters: Move → Shadow → Storm → Barrier → Steal → Flame → Scout → Draw → Void. Same-area constraint for Steal, Flame, Void."

*[Show: test results — 8/8 passing]*

"Full round test: create game, join two players, start, both commit SHA256 hashes, both reveal, resolve — verified the game advances to round 2."

## [1:00-1:30] ZK Commit-Reveal

*[Show: commit_reveal.circom]*

"Circom circuit using Poseidon hash. 264 constraints. Private inputs: action type, target, salt. Public input: commit hash."

*[Show: terminal — proof generation and verification]*

"Proof generation under 1 second. Verification under 200K compute units on Solana."

*[Show: reveal_action.rs hash verification]*

"On-chain, we verify SHA256(action | target | salt) matches the committed hash. The ZK circuit provides an upgrade path to Groth16 verification."

## [1:30-2:00] AI Agent Economy (x402)

*[Show: agent-broker.js]*

"HTTP 402 Payment Required protocol. Four endpoints for game intelligence."

*[Show: curl requests]*

```
GET /intel/location/1    — $0.002 — "Rival is in Deep Forest"
GET /intel/hand/1        — $0.003 — "Rival has Umbra, Nihil"
GET /intel/strategy      — $0.005 — "Go to Ruins, Draw Nihil"
GET /intel/market        — $0.001 — "Pool status: 3 Aegis remaining"
```

"AI agents pay USDC micropayments for information. Sub-cent costs on Solana make this economically viable."

## [2:00-2:30] Game Client

*[Show: game running in browser]*

"Pure canvas rendering. No frameworks. 32x32 pixel tiles, 2x supersampling."

*[Click through screens]*

"Three interconnected maps with fog of war. Area-specific card drops. AI rivals with pathfinding and personality."

*[Show: battle screen]*

"FRLG-style battle UI. Card character sprites. Effect animations. QTE during resolution."

*[Show: Phantom wallet connection]*

"Phantom wallet integration. On-chain/offline mode toggle. Commit hashes displayed during battle."

## [2:30-3:00] Integration Flow

*[Show: diagram]*

```
Player Action → SHA256 Hash → Commit On-Chain → 
All Revealed → Verify Hashes → Resolve → 
State Updated → Read via RPC → Update Client
```

"The client handles offline simulation for instant gameplay. When connected to Solana, it sends real transactions."

*[Show: IDL — 8 instructions]*

"Complete IDL with 8 instructions. Ready for devnet deployment."

"github.com/r0ze998/0xark — everything is open source."

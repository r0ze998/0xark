# 0xARK Architecture & Design Reference

> **Current stack**: Solana + Anchor (Rust) — migrated from the original Cairo/Dojo prototype.
> This document reflects the **current production architecture**. For the pre-migration Starknet design,
> see git history (commits before v16).

---

## Core Design Decisions

### Turn Structure (Simultaneous Commit-Reveal)

```
Round Start
  -> Each player commits SHA256(action | target_pubkey | salt) on-chain
  -> All commits received -> Reveal phase
  -> Each player reveals: action + target + salt
  -> On-chain: SHA256(action | target | salt) must match stored commit
  -> System resolves all actions simultaneously
  -> Round End -> next round or game over
```

### Actions (1 per round)

| Action | ID | Effect | Countered by |
|--------|----|--------|-------------|
| DRAW | 0 | Take floor-appropriate card from shared pool | — |
| STEAL | 1 | Take random card from target's hand | BARRIER |
| BARRIER | 2 | Block all Steal attempts this round | — |
| SCOUT | 3 | Reveal target's hand contents | — |
| USE_CARD | 4 | Activate a card's special effect | — |

### Resolution Priority

```
BARRIER resolves → STEAL resolves → SCOUT resolves → DRAW resolves → USE_CARD resolves
```

A barrier raised before steal resolution means steals that round are blocked.

### ZK: Groth16 BN254 On-Chain

Full Groth16 proofs are implemented (not commit-reveal only). The Circom circuit proves:
- `poseidon(action_type, target_pubkey, salt) == commitment_hash`

Proof generation runs in the browser via snarkjs. Verification runs on-chain in the Anchor program.

**CU cost**: ~80,000 CU estimated (budget set to 300,000 for headroom).

---

## Current Project Structure

```
0xark/
├── solana/
│   ├── oxark/
│   │   ├── programs/oxark/src/lib.rs    # Anchor program (13 instructions)
│   │   ├── tests/test_game.rs            # 12 litesvm tests
│   │   └── Anchor.toml
│   └── client/
│       ├── src/
│       │   ├── 01-pixi.js               # PixiJS WebGL setup
│       │   ├── 01-draw.js               # Canvas drawing primitives
│       │   ├── 01-net.js                # WebSocket client
│       │   ├── 02-data.js               # Card definitions (60 cards)
│       │   ├── 03-world-setup.js        # Map generation
│       │   ├── 04-state.js              # Global game state
│       │   ├── 05-rendering.js          # Render loop
│       │   ├── 06-world-systems.js      # NPC, fog, events
│       │   ├── 07-map.js                # Map screen logic
│       │   ├── 07-battle.js             # Battle UI + commit-reveal
│       │   ├── 07-battle-resolve.js     # Battle resolution events
│       │   ├── 08-overlays.js           # Screen overlays
│       │   ├── 08-world-interact.js     # World interaction
│       │   ├── 08-screens.js            # UI screens
│       │   ├── 09-game-loop.js          # Main loop
│       │   ├── 10-input.js              # Keyboard/touch input
│       │   └── 11-save-init.js          # Save/load + init
│       ├── onchain.js                   # Solana TX builder (Phantom integration)
│       ├── build.js                     # Module concatenator → index.html
│       └── template.html               # HTML shell with OGP/PWA meta
├── zk/
│   ├── circuits/commit_reveal.circom    # Poseidon circuit (264 constraints)
│   ├── build/                           # Compiled .wasm + .zkey
│   └── verification_key.json
├── multiplayer/
│   └── server.js                        # Pure WebSocket relay (no game authority)
├── x402/
│   └── agent-broker.js                  # x402 micropayment AI intel broker
├── react-dist/                          # React wallet+lobby UI (TypeScript)
├── tests/
│   ├── card-engine.test.js              # 53 card engine tests
│   └── battle-mechanics.test.js         # 49 battle mechanics + ZK tests
├── docs/
│   ├── PLAN.md                          # This file
│   └── magicblock-migration.md          # ER migration guide (Q2 2026)
├── SECURITY.md                          # Threat model + audit status
├── manifest.json                        # PWA manifest
└── og-image.svg                         # OGP image (1200×630)
```

---

## Anchor Program: 13 Instructions

| Instruction | Phase | Description |
|-------------|-------|-------------|
| `create_game` | Lobby | Initialize game + card_pool PDAs |
| `join_game` | Lobby | Initialize player_state PDA |
| `start_game` | Lobby→Game | Shuffle card pool (PRNG), deal hands |
| `deposit_stake` | Lobby | Lock 0.5 SOL into stake_vault PDA |
| `commit_action` | Commit | Store SHA256 commit hash in commit PDA |
| `reveal_action` | Reveal | Verify hash, store revealed action |
| `verify_zk_proof` | Reveal | Groth16 BN254 on-chain proof verify |
| `resolve_round` | Resolution | Execute all revealed actions (steal/barrier/draw) |
| `mint_card_nft` | Any | Mint SPL Token + Metaplex metadata |
| `handle_verify_zk` | Resolution | ZK result handler |
| `register_agent` | Setup | Register AI agent on-chain |
| `agent_action` | Battle | Submit AI agent battle action |
| `claim_prize` | End | Winner claims entire prize pool |

## PDA Scheme

```
game:        ["game",       game_id_le8]
player:      ["player",     game_id_le8, player_pubkey]
card_pool:   ["card_pool",  game_id_le8]
commit:      ["commit",     game_id_le8, round_le8, player_pubkey]
stake_vault: ["stake_vault", game_id_le8]
```

`round` is part of the commit PDA seed — this prevents replay attacks across rounds.

---

## Balance Parameters (GDD v1.0)

| Parameter | Value | Reasoning |
|-----------|-------|-----------|
| Card types | 60 | Full collection goal (5 rarities × 12 types) |
| Starting hand | 3 cards | Enough to play, not enough to win |
| Entry stake | 0.5 SOL | Real stakes; Prize Pool = entry × N players |
| Max floor depth | B5 | Deeper = rarer drops |
| Barrier priority | Highest | Ensures defense is valid response |
| Steal limit | No cap (balance via barrier) | Creates bluffing meta |

**Why information asymmetry works**:
- ZK-hidden positions mean you can't safely scout without a barrier
- Scout intel purchased from AI broker (x402) gives a real edge
- Commit-reveal prevents action switching after seeing rival's move
- The optimal play is never obvious — creates genuine decision tension

---

## x402 AI Intel Economy

Three intel endpoints, each gated by x402 micropayment (USDC on devnet):

| Endpoint | Price | Data Returned |
|----------|-------|---------------|
| `/intel/location` | $0.002 | Target's current area + approximate floor |
| `/intel/hand` | $0.004 | Target's estimated hand contents |
| `/intel/strategy` | $0.003 | Recommended action based on game state |

**Unit economics**: At 10 intel queries per season × 5,000 MAU × $0.003 avg = **$150/day** in intel revenue at scale. The x402 broker takes a 10% platform cut; 90% goes to the AI rival's operational budget.

---

## Roadmap

See [README.md](../README.md#roadmap) for the full Q2/Q3/Q4 2026 roadmap.

Key architectural upgrades:
1. **MagicBlock ER** (Q2) — see [docs/magicblock-migration.md](./magicblock-migration.md)
2. **Session Keys** (Q2) — documented as stub in `onchain.js`
3. **VRF** (Q3) — replace on-chain PRNG with Switchboard / MagicBlock VRF
4. **cNFT** (Q3) — Metaplex Bubblegum compressed NFTs for cost-efficient card minting

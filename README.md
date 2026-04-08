# 0xARK

> **GI x Dark Forest x FRLG — ZK card-stealing PvP on Solana**

Explore a fog-covered island. Collect 5 card types to win. Steal from rivals. Hide your hand with ZK. Let AI agents trade intel for micropayments.

**[Play Now](https://r0ze998.github.io/0xark/)** | [GDD v0.3](GDD-v0.3.md) | [Solana Program](solana/oxark/)

---

## How It Works

3 players are dropped onto an island shrouded in Fog of War. Each area holds different cards:

| Area | Cards Available | Vibe |
|------|----------------|------|
| **Port Town** | Crystal, Shadow | Safe zone, NPCs, shops |
| **Deep Forest** | Flame, Storm | Tall grass encounters, high risk |
| **Ancient Ruins** | Void, Crystal | Rare drops, dangerous |

**You must visit all areas to complete your collection.**

### Actions (1 per turn, simultaneous commit-reveal)

| Action | Effect | Constraint |
|--------|--------|-----------|
| Draw | Get a card from current area | Area-specific pool |
| Steal | Take rival's card | **Same area only** |
| Barrier | Block steal attempts | 2 uses |
| Scout | See rival's hand + location | Works anywhere |
| Move | Travel to adjacent area | Costs your turn |
| Use Card | Consume for powerful effect | Card is destroyed |

### Card Consumption

Every card can be held (for completion) or consumed (for power):

| Card | Consume Effect |
|------|---------------|
| Crystal | Next Steal guaranteed (pierces Barrier) |
| Shadow | Invisible for 1 turn |
| Flame | Burn target's card |
| Storm | Nullify all Barriers |
| Void | Copy target's card |

**The core dilemma: hold it for the win, or use it to survive.**

### Win Conditions
1. **Complete** — Collect all 5 unique card types
2. **Timeout** — Most unique cards after 30 rounds
3. **Elimination** — All rivals have 0 cards

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Smart Contract | **Anchor (Rust)** on Solana |
| ZK | Circom + groth16-solana (commit-reveal) |
| AI Agent Payment | x402 + USDC micropayments |
| Frontend | Canvas (FRLG pixel art) |
| Wallet | Phantom |

---

## Architecture

```
solana/oxark/programs/oxark/src/
├── state.rs          — Game, PlayerState, CardPool, CommitAction, Area
├── constants.rs      — Card tables, area configs, spell limits
├── error.rs          — 15 error codes
├── instructions/
│   ├── create_game   — Init game + card pool
│   ├── join_game     — Join + set starting area
│   ├── start_game    — Deal initial cards
│   ├── commit_action — SHA256 hash commit
│   ├── reveal_action — Hash verify + action validate
│   └── resolve_round — Simultaneous resolution
│                       Move→Shadow→Storm→Barrier→Steal→Flame→Scout→Draw→Void
└── tests/
    └── test_game.rs  — 5 passing tests (LiteSVM)
```

---

## Development

```bash
# Build
cd solana/oxark && anchor build

# Test
cargo test

# Play (frontend)
open solana/client/index.html
# or visit https://r0ze998.github.io/0xark/
```

---

## Colosseum Frontier Hackathon

0xARK is being built for the [Colosseum Frontier Hackathon](https://colosseum.com/frontier) (April 6 — May 11, 2026).

**Tracks**: Gaming / AI / Stablecoins

**Differentiation**: First Solana game combining ZK hidden hands + AI agent micropayments (x402) + area-based strategy.

---

## Links

- **Live**: [r0ze998.github.io/0xark](https://r0ze998.github.io/0xark/)
- **GDD**: [v0.3](GDD-v0.3.md) | [v0.2](GDD-v0.2.md) | [v0.1](GDD.md)
- **Research**: [Solana Frontier Research](https://github.com/r0ze998/0xark/blob/main/docs/PLAN.md)
- **Builder**: [@r0ze_____](https://x.com/r0ze_____)

---

*Design Philosophy: 触って面白い最小限のものを、ブレないビジョンで磨く。説明しない、足さない、削る。*

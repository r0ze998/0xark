# 0xARK Phase 1 Implementation Plan

> **Goal**: Validate "does the steal/defend/scout loop create interesting decisions?"

---

## Design Decisions

### Turn Structure (Simultaneous Commit-Reveal)

```
Round Start
  -> Each player commits (hash of action + salt)
  -> All commits received -> Reveal phase
  -> Each player reveals action + salt
  -> System resolves all actions simultaneously
  -> Round End -> next round or game over
```

### Actions (1 per turn)

| Action | Effect | Countered by |
|--------|--------|-------------|
| Draw | Take random card from shared pool | — |
| Steal (窃盗) | Take random card from target's hand | Barrier |
| Barrier (防壁) | Block Steal attempts this turn | — |
| Scout (偵察) | See target's hand contents | — |

### Phase 1 ZK: Commit-Reveal (not full ZK proofs)

Full ZK proofs require client-side proof generation, custom circuits, and complex verification contracts. Commit-reveal gives 90% of the experience for 10% of the effort.

**Trade-off**: Determined players could read raw contract storage. Acceptable for Phase 1 playtest. Phase 2 upgrades to proper ZK.

### Resolution Priority

Barrier → Steal → Scout → Draw

---

## Initial Balance

| Parameter | Value | Reasoning |
|-----------|-------|-----------|
| Card types | 5 | Minimal collection goal |
| Copies per card | 3 | Enough for 3 players to compete |
| Total pool | 15 cards | 5 types × 3 copies |
| Initial hand | 2 random cards | Start with some, not enough |
| Initial Steal spells | 3 | Enough for aggression |
| Initial Barrier spells | 2 | Scarcer than Steal — forces risk |
| Initial Scout spells | 1 | Information is precious |
| Max rounds | 20 | ~10 min (30s per round) |
| Reveal timeout | 10 blocks | ~20 seconds on Katana |

**Why this works**:
- 3 Steals vs 2 Barriers = can't Barrier every Steal. Must predict when to defend.
- 1 Scout = must choose carefully when to gather intel.
- 3 copies per card = multiple players can hold same type, Steal stays valuable.

---

## Project Structure

```
0xark/
├── contracts/                    # Dojo project root
│   ├── Scarb.toml
│   ├── dojo_dev.toml
│   ├── src/
│   │   ├── lib.cairo
│   │   ├── models/
│   │   │   ├── game.cairo        # Game, GamePlayer
│   │   │   ├── player.cairo      # PlayerState, PlayerCard
│   │   │   ├── card.cairo        # CardPool
│   │   │   └── action.cairo      # CommittedAction
│   │   ├── systems/
│   │   │   ├── game_system.cairo # Create, join, start, end
│   │   │   ├── action_system.cairo # Commit, reveal, resolve
│   │   │   └── card_system.cairo # Distribution, transfer
│   │   ├── utils/
│   │   │   ├── hash.cairo        # Pedersen hash for commit-reveal
│   │   │   └── random.cairo      # Pseudo-random (Phase 1)
│   │   └── tests/
│   │       ├── test_game.cairo
│   │       ├── test_actions.cairo
│   │       └── test_cards.cairo
│   └── manifests/
├── client/                       # React frontend
│   ├── src/
│   │   ├── dojo/
│   │   │   ├── setup.ts          # Dojo SDK init
│   │   │   ├── contractCalls.ts  # System call wrappers
│   │   │   └── models.ts         # TS types mirroring Cairo
│   │   ├── hooks/
│   │   │   ├── useGame.ts
│   │   │   ├── usePlayer.ts
│   │   │   └── useActions.ts
│   │   └── components/
│   │       ├── GameLobby.tsx
│   │       ├── GameBoard.tsx
│   │       ├── HandView.tsx
│   │       ├── ActionPanel.tsx
│   │       ├── RevealPhase.tsx
│   │       ├── PlayerList.tsx
│   │       └── GameOver.tsx
└── docs/
    └── PLAN.md
```

---

## Cairo Models

### Game (`models/game.cairo`)

```cairo
#[derive(Copy, Drop, Serde, PartialEq)]
#[dojo::model]
pub struct Game {
    #[key]
    pub game_id: u32,
    pub host: ContractAddress,
    pub status: u8,            // 0=Lobby, 1=Commit, 2=Reveal, 3=Resolving, 4=Finished
    pub round: u8,
    pub max_rounds: u8,
    pub player_count: u8,
    pub max_players: u8,
    pub cards_in_pool: u8,
    pub winner: ContractAddress,
}

#[derive(Copy, Drop, Serde)]
#[dojo::model]
pub struct GamePlayer {
    #[key]
    pub game_id: u32,
    #[key]
    pub index: u8,
    pub address: ContractAddress,
}
```

### Player (`models/player.cairo`)

```cairo
#[derive(Copy, Drop, Serde)]
#[dojo::model]
pub struct PlayerState {
    #[key]
    pub game_id: u32,
    #[key]
    pub player: ContractAddress,
    pub card_count: u8,
    pub steal_count: u8,
    pub barrier_count: u8,
    pub scout_count: u8,
    pub has_committed: bool,
    pub has_revealed: bool,
}

#[derive(Copy, Drop, Serde)]
#[dojo::model]
pub struct PlayerCard {
    #[key]
    pub game_id: u32,
    #[key]
    pub player: ContractAddress,
    #[key]
    pub slot: u8,              // 0-4
    pub card_id: u8,           // 1-5, 0=empty
}
```

### Card (`models/card.cairo`)

```cairo
#[derive(Copy, Drop, Serde)]
#[dojo::model]
pub struct CardPool {
    #[key]
    pub game_id: u32,
    #[key]
    pub card_id: u8,
    pub remaining: u8,
}
```

### Action (`models/action.cairo`)

```cairo
#[derive(Copy, Drop, Serde)]
#[dojo::model]
pub struct CommittedAction {
    #[key]
    pub game_id: u32,
    #[key]
    pub round: u8,
    #[key]
    pub player: ContractAddress,
    pub hash: felt252,
}
```

---

## Commit-Reveal Flow

### Commit (Client)
1. Player selects action + target
2. Generate random `salt` (felt252)
3. Compute `hash = pedersen(pedersen(action_type, target), salt)`
4. Call `commit(game_id, hash)`
5. Store `{action_type, target, salt}` in localStorage

### Reveal (Client)
1. Retrieve stored `{action_type, target, salt}`
2. Call `reveal(game_id, action_type, target, salt)`

### Verify (Contract)
1. Recompute hash from revealed data
2. Compare with stored CommittedAction.hash
3. Match → process; mismatch → revert

### Timeout
- No reveal within 10 blocks → action treated as Skip
- 3 consecutive skips → auto-forfeit

---

## Implementation Steps

### Phase 1A: Contract Foundation (Steps 1-7)

| Step | Task | Risk |
|------|------|------|
| 1 | `sozo init` — scaffold Dojo project | Low |
| 2 | Game model | Low |
| 3 | Player models (PlayerState, PlayerCard) | Medium |
| 4 | Action model (CommittedAction) | Low |
| 5 | CardPool model | Low |
| 6 | Pedersen hash utility | Low |
| 7 | Pseudo-random utility | Medium |

### Phase 1B: Contract Systems (Steps 8-10)

| Step | Task | Risk |
|------|------|------|
| 8 | GameSystem — create, join, start | Low |
| 9 | ActionSystem — commit, reveal, resolve | **High** |
| 10 | CardSystem — distribute, transfer, draw, win check | Medium |

Step 9 edge cases:
- Two players Steal each other simultaneously
- Steal from player with 0 cards
- Draw from empty pool
- Player fails to reveal (timeout)

### Phase 1C: Tests (Steps 11-13)

| Step | Task |
|------|------|
| 11 | Game lifecycle tests |
| 12 | Action resolution tests (every combination) |
| 13 | Card system tests |

### Phase 1D: Deploy (Steps 14-15)

| Step | Task |
|------|------|
| 14 | Configure dojo_dev.toml for Slot |
| 15 | `sozo build && sozo migrate` |

### Phase 1E: React Frontend (Steps 16-25)

| Step | Task |
|------|------|
| 16 | `npm create vite` + install Dojo SDK deps |
| 17 | Dojo SDK setup (provider, Torii, burner wallets) |
| 18 | Contract call wrappers + client-side hash |
| 19 | GameLobby — create/join/start |
| 20 | GameBoard — main view composition |
| 21 | HandView — your 5 card slots |
| 22 | ActionPanel — commit phase UI (core interaction) |
| 23 | RevealPhase — reveal + resolution display |
| 24 | PlayerList — other players (public info only) |
| 25 | GameOver — winner + final reveal |

### Phase 1F: Integration (Steps 26-28)

| Step | Task |
|------|------|
| 26 | Torii subscription hooks |
| 27 | Action history log |
| 28 | E2E playtest (3 browser windows) |

---

## Dependency Graph

```
Step 1 (init)
├── Steps 2-7 (models + utils) — parallel
│   ├── Step 8 (GameSystem) → Step 11 (tests)
│   ├── Step 10 (CardSystem) → Step 13 (tests)
│   └── Step 9 (ActionSystem) → Step 12 (tests)
│       └── Steps 14-15 (Slot deploy)
│
Step 16 (init React) — parallel with contracts
├── Step 17 (SDK setup) — needs Step 15
├── Step 18 (contract calls)
├── Steps 19-25 (components) — mostly parallel
├── Step 26 (Torii hooks)
└── Step 27 (history log)
    └── Step 28 (E2E playtest)
```

---

## Risks & Mitigations

| Risk | Severity | Mitigation |
|------|----------|------------|
| Hand readable from chain | High | Accept for Phase 1. Phase 2 = real ZK |
| On-chain randomness exploitable | Medium | Pseudo-random OK for playtest. Phase 2 = Pragma VRF |
| Dojo version vs Slot | Medium | Pin version. Deploy early (Step 15) |
| Salt lost on browser refresh | Medium | localStorage persistence |
| Action resolution edge cases | High | Extensive unit tests (Step 12) |

---

## Success Criteria

- [ ] 3 players can create, join, start a game
- [ ] Commit-reveal flow hides actions until all commit
- [ ] Steal takes card when no Barrier
- [ ] Barrier blocks Steal
- [ ] Scout reveals target's hand
- [ ] Draw adds card from pool
- [ ] Win triggers at 5/5 collection
- [ ] Game ends at max rounds
- [ ] Full game < 10 minutes
- [ ] "Do I want to play again?" = yes

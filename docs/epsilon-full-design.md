# ε-full (Epsilon-Full) Architecture Design

**0xARK — MagicBlock ER-Based Trustless Card Battle System**

| Field | Value |
|---|---|
| Document version | 0.1.0 |
| Status | DRAFT |
| Program ID (devnet) | `5i37jWBiA7bV9XmokyDWHQxjJ5s1sBnSEkPSB4J2XfmN` |
| Hackathon deadline | 2026-05-11 |
| Target branch | `docs-epsilon-full-design` |
| Last updated | 2026-04-28 |

---

## 目次 (Table of Contents)

1. [設計理念 — Design Philosophy](#1-設計理念--design-philosophy)
2. [アーキテクチャ全体図 — System Architecture](#2-アーキテクチャ全体図--system-architecture)
3. [Move Schema — Memo Encoding](#3-move-schema--memo-encoding)
4. [State Derivation Function](#4-state-derivation-function)
5. [damage_calc() Design](#5-damage_calc-design)
6. [ZK Circuits](#6-zk-circuits)
7. [Phase Roadmap (P10–P14+)](#7-phase-roadmap-p10p14)
8. [Move / Area Removal Plan](#8-move--area-removal-plan)
9. [5/11 Hackathon Submission — ε-full lite](#9-511-hackathon-submission--ε-full-lite)
10. [Post-5/11 北極星 — North Star](#10-post-511-北極星--north-star)
11. [Appendix — Data Schemas](#11-appendix--data-schemas)

---

## 1. 設計理念 — Design Philosophy

### 1.1 "真実はon-chain" (Truth Lives On-Chain)

ε-fullの根幹原則：**ゲームの真実はすべてon-chainトランザクション履歴に存在する。**
WebSocketリレーはUX高速化のためのキャッシュに過ぎない。

- Anything that determines game outcome MUST be reconstructable from the ER transaction log alone.
- The server (WS relay) may DROP, REORDER, or be completely unavailable — the game state must still be derivable from chain.
- No authoritative server state. The server is a convenience layer, not a source of truth.

### 1.2 Path A — DB-less, Server Stateless, Third-Party Verifiable

```
Path A (ε-full target)
├── Server holds NO persistent game state
├── Any observer with ER tx access can reconstruct full game history
├── Dispute resolution requires only: ER tx log + ZK proofs
└── x402 payment, ER execution, ZK verification = fully trustless stack
```

Path A contrasts with the current Path B (server-authoritative WS relay) that remains in place as fallback during the P10–P13 transition.

### 1.3 The Full Trustless Stack

```
x402 (payment verification)
  ↓
MagicBlock ER (ephemeral rollup — fast, cheap, on-chain sequenced)
  ↓
ZK Proofs (hand privacy via Poseidon commitment, future damage proof)
  ↓
Base Chain (Solana devnet / mainnet — settlement, delegation, undelegation)
```

Each layer is independently verifiable. A player disputing a loss can present:
1. The ER tx sequence (public)
2. Their private ZK witness (hand commitment reveal)
3. The deterministic `damage_calc()` output

And any third party can validate the outcome without trusting either player or the server.

---

## 2. アーキテクチャ全体図 — System Architecture

### 2.1 Layer Roles

```
┌─────────────────────────────────────────────────────────────────────┐
│                         BASE CHAIN (Solana)                         │
│                                                                     │
│  • Game account creation (Game, PlayerState, CommitAction PDAs)     │
│  • delegate_session  ── lock accounts into ER session               │
│  • undelegate_session── return accounts to base chain               │
│  • resolve_round     ── final damage application (base chain only)  │
│  • Winner settlement, NFT state changes                             │
└───────────────────────────────┬─────────────────────────────────────┘
                                │  CPI (delegate / undelegate)
                                │  settlement txs
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│               MAGICBLOCK EPHEMERAL ROLLUP (ER)                      │
│          endpoint: https://devnet-router.magicblock.app             │
│                                                                     │
│  • commit_action  ── player submits SHA-256 action hash             │
│  • reveal_action  ── player reveals (action_type, target, salt)     │
│  • hand_commit    ── Poseidon ZK hand commitment (via memo)         │
│  • hand_reveal    ── card IDs revealed (via memo)                   │
│  • phase_advance  ── phase transition signal (via memo)             │
│  • round_resolve  ── resolve trigger (via memo, P12+)               │
│  • match_end      ── match termination signal (via memo)            │
│                                                                     │
│  All ER txs are sequenced and publicly observable.                  │
│  Memo field carries Move Schema payload (see §3).                   │
└───────────────────────────────┬─────────────────────────────────────┘
                                │  tx subscription / observation
                                │  (handlers/sync.js — P13)
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      WS RELAY (server)                              │
│                                                                     │
│  • Current: authoritative state (Path B)                            │
│  • ε-full target: cache + broadcast only (Path A)                   │
│  • Falls back to ER tx subscription if WS drops (P13)              │
│                                                                     │
│  Handlers: duel_hand_committed, duel_hand_revealed,                 │
│            duel_phase_advance, duel_battle_resolved, duel_ended     │
└─────────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         CLIENTS (Browser)                           │
│                                                                     │
│  • Run damage_calc() deterministically (both clients agree)         │
│  • Verify ZK proofs locally                                         │
│  • Subscribe to ER txs as fallback (P13)                            │
│  • Display game state derived from Move Schema tx log               │
└─────────────────────────────────────────────────────────────────────┘
```

### 2.2 Delegation Lifecycle

```
Match start
    │
    ▼
[Base Chain] join_game()
    │  host calls delegate_session (CPI to ER program)
    ▼
[ER] Game accounts now live on ephemeral rollup
    │
    │  === GAME ROUNDS (on ER) ===
    │
    │  Round N:
    │    1. Both players: commit_action (ER) + hand_commit memo (ER)
    │    2. Both players: reveal_action (ER) + hand_reveal memo (ER)
    │    3. phase_advance memo (ER)
    │    4. damage_calc() runs client-side (deterministic)
    │    5. round_resolve memo (ER) — P12+ (TBD: also ER instruction?)
    │    Repeat for N rounds
    │
    ▼
[ER] match_end memo
    │  undelegate_session sent via Magic Router
    │  (Magic Router → Base Chain)
    ▼
[Base Chain] resolve_round (final) — HP written, winner set
    │
    ▼
Match complete — winner settles tokens/NFTs on base chain
```

### 2.3 Timing Guarantees

| Operation | Chain | Latency target |
|---|---|---|
| `delegate_session` | Base Chain | ~400ms (1 block) |
| `commit_action` | ER | ~50ms |
| `reveal_action` | ER | ~50ms |
| Memo (hc/hr/pa/rs/me) | ER | ~50ms |
| `undelegate_session` | Base → via Magic Router | ~400ms |
| `resolve_round` (final) | Base Chain | ~400ms |

---

## 3. Move Schema — Memo Encoding

All ε-full game events are recorded as JSON payloads in the **SPL Memo** field of ER transactions. This makes the full game history reconstructable from ER tx logs without any additional server data.

### 3.1 Memo Envelope Format

```json
{
  "t": "<memo_type>",
  "v": 1,
  "g": "<game_id>",
  "r": <round_number>,
  "p": "<player_pubkey (base58, first 8 chars for brevity — TBD: full?)>",
  "d": { <type-specific payload> }
}
```

**Fields:**

| Key | Type | Description |
|---|---|---|
| `t` | string(2) | Memo type code (see §3.2) |
| `v` | u8 | Schema version (currently 1) |
| `g` | string | Game PDA address (base58) |
| `r` | u16 | Round number (0-indexed) |
| `p` | string | Signer pubkey (base58) |
| `d` | object | Type-specific data (see §3.3) |

**Size budget:** SPL Memo max is 566 bytes (UTF-8). Envelope overhead ~120 bytes. Payload budget: ~440 bytes per memo.

### 3.2 Memo Type Registry

| Code | Name | Direction | Sent to |
|---|---|---|---|
| `co` | Action Commit | Player → ER | ER (commit_action instruction + memo) |
| `re` | Action Reveal | Player → ER | ER (reveal_action instruction + memo) |
| `hc` | Hand Commit | Player → ER | ER (memo-only tx) |
| `hr` | Hand Reveal | Player → ER | ER (memo-only tx) |
| `pa` | Phase Advance | Host → ER | ER (memo-only tx) |
| `rs` | Round Resolve | Host → ER | ER (memo-only tx, TBD: instruction?) |
| `me` | Match End | Host → ER | ER (memo-only tx) |

### 3.3 Per-Type Payload Specifications

#### `co` — Action Commit

Records that a player has committed a hashed action this round.

```json
{
  "t": "co",
  "v": 1,
  "g": "GamePDA...",
  "r": 3,
  "p": "PlayerPubkey...",
  "d": {
    "h": "deadbeef...32bytes_hex",
    "cards_len": 2
  }
}
```

| Field | Type | Description |
|---|---|---|
| `h` | hex string (64 chars) | SHA-256(action_type:1B \| target_pubkey:32B \| salt:32B) |
| `cards_len` | u8 | Number of cards played (0–3) |

**Validation rules:**
- `h` must be exactly 64 hex chars
- `cards_len` in range [0, 3]
- Signer must be a registered player in game `g`
- Round `r` must match current on-chain round
- Player must not have already committed this round (idempotency check via on-chain `has_committed`)

**Size estimate:** ~200 bytes

#### `re` — Action Reveal

Records the revealed action after commit phase closes.

```json
{
  "t": "re",
  "v": 1,
  "g": "GamePDA...",
  "r": 3,
  "p": "PlayerPubkey...",
  "d": {
    "action_type": 3,
    "target": "TargetPubkey...",
    "salt": "randomhex...64chars",
    "cards": [12, 47, 0]
  }
}
```

| Field | Type | Description |
|---|---|---|
| `action_type` | u8 | ActionType enum value (see §5.1) |
| `target` | string | Target player pubkey (base58), or `""` if no target |
| `salt` | hex string (64 chars) | 32-byte salt used in commit hash |
| `cards` | u8[] (len 0–3) | Card IDs played this action |

**Validation rules:**
- SHA-256(action_type:1B \| target:32B \| salt:32B) MUST match on-chain stored `hash[32]` from commit
- `action_type` must be a valid ActionType enum value (0–10, excluding legacy Move=10 in ε-full)
- Salt must be 64 hex chars
- Player must have committed this round (`has_committed == true`)
- Player must not have already revealed (`has_revealed == false`)

**Size estimate:** ~280 bytes

#### `hc` — Hand Commit

Records a ZK hand commitment (Poseidon hash) for privacy-preserving hand hiding.

```json
{
  "t": "hc",
  "v": 1,
  "g": "GamePDA...",
  "r": 3,
  "p": "PlayerPubkey...",
  "d": {
    "commitment": "poseidon_hash_hex_64chars",
    "proof_cid": ""
  }
}
```

| Field | Type | Description |
|---|---|---|
| `commitment` | hex string (64 chars) | Poseidon(card_ids[10], salt_lo, salt_hi, round, pubkey_lo, pubkey_hi) |
| `proof_cid` | string | IPFS CID of ZK proof (optional, TBD for β) |

**ZK Circuit:** `circuits/hand_commitment/hand_commitment.circom`
- Inputs: card_ids[10] (private), salt_lo (private), salt_hi (private), round (public), pubkey_lo (public), pubkey_hi (public)
- Output: commitment (public)

**Validation rules:**
- `commitment` must be 64 hex chars
- Round `r` must match current game round
- One `hc` per player per round (re-commit invalidates previous — TBD: allow or reject?)

**Size estimate:** ~200 bytes

#### `hr` — Hand Reveal

Reveals the actual hand contents, allowing verification against the `hc` commitment.

```json
{
  "t": "hr",
  "v": 1,
  "g": "GamePDA...",
  "r": 3,
  "p": "PlayerPubkey...",
  "d": {
    "card_ids": [1, 5, 12, 23, 44, 0, 0, 0, 0, 0],
    "salt_lo": "hex32chars",
    "salt_hi": "hex32chars"
  }
}
```

| Field | Type | Description |
|---|---|---|
| `card_ids` | u8[10] | Full hand (10 slots, 0 = empty) |
| `salt_lo` | hex string (32 chars) | Low 16 bytes of salt |
| `salt_hi` | hex string (32 chars) | High 16 bytes of salt |

**Validation rules:**
- Verifier MUST compute Poseidon(card_ids, salt_lo, salt_hi, round, pubkey_lo, pubkey_hi) and compare against stored `hc` commitment
- If mismatch → cheating detected, dispute mechanism triggered (TBD: slash mechanism in β)
- Must have a matching `hc` for same round and player
- `card_ids` values must be in range [0, 59] (60-card catalog) or 0 (empty)

**Size estimate:** ~220 bytes

#### `pa` — Phase Advance

Signals a phase transition in the current round.

```json
{
  "t": "pa",
  "v": 1,
  "g": "GamePDA...",
  "r": 3,
  "p": "HostPubkey...",
  "d": {
    "from_phase": "CommitPhase",
    "to_phase": "RevealPhase"
  }
}
```

| Field | Type | Description |
|---|---|---|
| `from_phase` | string | Departing phase name |
| `to_phase` | string | Entering phase name |

**Valid phase transitions:**

```
Lobby → CommitPhase
CommitPhase → RevealPhase  (after both players have committed)
RevealPhase → Finished     (after resolve; only if max_rounds reached or HP == 0)
RevealPhase → CommitPhase  (next round begins)
```

**Validation rules:**
- Signer must be game host
- Transition must be valid per above table
- CommitPhase → RevealPhase requires `commit_count == player_count`
- RevealPhase → CommitPhase or Finished requires `reveal_count == player_count`

**Size estimate:** ~150 bytes

#### `rs` — Round Resolve

Records the round resolution trigger and outcome summary.

```json
{
  "t": "rs",
  "v": 1,
  "g": "GamePDA...",
  "r": 3,
  "p": "HostPubkey...",
  "d": {
    "dmg": {
      "PlayerPubkeyA...": 15,
      "PlayerPubkeyB...": 8
    },
    "hp_after": {
      "PlayerPubkeyA...": 85,
      "PlayerPubkeyB...": 72
    },
    "winner": ""
  }
}
```

| Field | Type | Description |
|---|---|---|
| `dmg` | map[pubkey → u16] | Damage dealt to each player this round |
| `hp_after` | map[pubkey → u16] | Remaining HP for each player after round |
| `winner` | string | Winner pubkey if match ended, else `""` |

**Validation rules:**
- `dmg` values must match `damage_calc()` output given revealed actions (verifiable by any observer)
- `hp_after` must equal previous round's `hp_after` minus `dmg`
- Signer must be host
- TBD: Should `resolve_round` instruction on-chain also emit this data, making memo redundant?

**Size estimate:** ~250 bytes

#### `me` — Match End

Records match termination and final outcome.

```json
{
  "t": "me",
  "v": 1,
  "g": "GamePDA...",
  "r": 8,
  "p": "HostPubkey...",
  "d": {
    "winner": "WinnerPubkey...",
    "reason": "hp_depleted",
    "final_hp": {
      "PlayerPubkeyA...": 0,
      "PlayerPubkeyB...": 42
    },
    "total_rounds": 8
  }
}
```

| Field | Type | Description |
|---|---|---|
| `winner` | string | Winner pubkey (base58) |
| `reason` | string | `"hp_depleted"` \| `"max_rounds"` \| `"forfeit"` \| `"timeout"` |
| `final_hp` | map[pubkey → u16] | HP at match end |
| `total_rounds` | u16 | Total rounds played |

**Validation rules:**
- `reason == "hp_depleted"` requires at least one player HP == 0
- `reason == "max_rounds"` requires `r == max_rounds`
- Winner must be the player with highest HP (or last standing)
- Triggers `undelegate_session` via Magic Router

**Size estimate:** ~220 bytes

---

## 4. State Derivation Function

### 4.1 Definition

```
deriveGameState(erTxSequence: ErTx[]) → GameState
```

Pure, deterministic function. Given only the ordered sequence of ER transactions for a game, produces the complete game state at any point in history. No server state required.

### 4.2 Input

```typescript
interface ErTx {
  signature: string;       // ER tx signature
  slot: number;            // ER slot (determines ordering)
  signer: string;          // Signer pubkey (base58)
  memo: MemoPayload | null; // Parsed Move Schema payload
  instruction?: string;    // "commit_action" | "reveal_action" | null
  timestamp: number;       // Unix ms
}

type MemoPayload =
  | CoPayload   // co
  | RePayload   // re
  | HcPayload   // hc
  | HrPayload   // hr
  | PaPayload   // pa
  | RsPayload   // rs
  | MePayload;  // me
```

### 4.3 Output

```typescript
interface DerivedGameState {
  gameId: string;
  status: "Lobby" | "CommitPhase" | "RevealPhase" | "Finished";
  round: number;
  players: {
    [pubkey: string]: DerivedPlayerState;
  };
  rounds: RoundRecord[];   // Full history
  winner: string | null;
  lastTxSlot: number;
}

interface DerivedPlayerState {
  pubkey: string;
  hp: number;              // Derived from cumulative damage
  hand: number[] | null;   // null until hr revealed
  committed: boolean;
  revealed: boolean;
  revealedAction: ActionType | null;
  revealedTarget: string | null;
  handCommitment: string | null;  // From hc
}

interface RoundRecord {
  round: number;
  commits: Record<string, CoPayload>;
  reveals: Record<string, RePayload>;
  handCommits: Record<string, HcPayload>;
  handReveals: Record<string, HrPayload>;
  resolvedDamage: Record<string, number>;
  hpAfter: Record<string, number>;
}
```

### 4.4 Derivation Algorithm

```
function deriveGameState(txs: ErTx[]): DerivedGameState:
  // 1. Sort by slot (ER sequence is canonical)
  txs = sortBySlot(txs)

  state = initialState()

  for tx in txs:
    memo = tx.memo
    if memo is null: continue

    switch memo.t:
      case "co": applyCommit(state, memo, tx.signer)
      case "re": applyReveal(state, memo, tx.signer)
      case "hc": applyHandCommit(state, memo, tx.signer)
      case "hr": applyHandReveal(state, memo, tx.signer)  // verify commitment
      case "pa": applyPhaseAdvance(state, memo, tx.signer)
      case "rs": applyRoundResolve(state, memo, tx.signer)
      case "me": applyMatchEnd(state, memo, tx.signer)

  return state
```

### 4.5 Invalidation Rules

A tx is **ignored** (not applied) if any of the following hold:

| Rule | Description |
|---|---|
| INVALID_SIGNER | Signer is not a registered player or host for this game |
| INVALID_ROUND | `memo.r` does not match expected round |
| WRONG_PHASE | Memo type is not valid for current phase (e.g., `re` before `co`) |
| DUPLICATE_COMMIT | Player already has a `co` record for this round |
| DUPLICATE_REVEAL | Player already has a `re` record for this round |
| COMMITMENT_MISMATCH | `hr` Poseidon output != stored `hc` commitment |
| INVALID_TRANSITION | `pa` transition is not in the valid set |
| UNKNOWN_MEMO_TYPE | `t` field is not a recognized type code |

**Critical:** Slot ordering is the canonical tie-breaker. If two txs from the same player have the same type and round, the lower-slot tx wins and the higher-slot tx is ignored.

---

## 5. damage_calc() Design

### 5.1 ActionType Enum (ε-full)

Move=10 is **removed** in ε-full (legacy dungeon concept). Area/position concepts are eliminated.

```rust
// programs/oxark/src/state/action.rs (ε-full target)
pub enum ActionType {
    None = 0,
    Draw = 1,
    Steal = 2,
    Barrier = 3,
    Scout = 4,
    // Move = 10,  ← REMOVED in ε-full
    UseCrystal = 5,
    UseShadow = 6,
    UseFlame = 7,
    UseStorm = 8,
    UseVoid = 9,
}
```

### 5.2 Input Schema

```typescript
interface DamageCalcInput {
  playerA: {
    pubkey: string;
    hp: number;
    action: ActionType;
    target: string;
    cards: CardStats[];  // cards played this round
    barrier: boolean;    // barrier active from previous round
    stealCount: number;
  };
  playerB: {
    pubkey: string;
    hp: number;
    action: ActionType;
    target: string;
    cards: CardStats[];
    barrier: boolean;
    stealCount: number;
  };
  round: number;
  gameId: string;
}

interface CardStats {
  id: number;
  bp: number;        // Battle Power
  hp: number;        // Hit Points (card HP, not player HP)
  ini: number;       // Initiative
  ability_key: string;
}
```

### 5.3 Resolution Order (ε-full — Move Removed)

The resolution order follows the spirit of the existing `resolve_round.rs` but with Move (legacy) **eliminated**.

```
Priority (highest → lowest):

1. Shadow  (UseShadow = 6)   — dark suppression
2. Storm   (UseStorm = 8)    — area sweep
3. Barrier (Barrier = 3)     — shield activation
4. Steal   (Steal = 2)       — hand interference
5. Crystal (UseCrystal = 5)  — elemental attack (resolve together with Steal)
6. Flame   (UseFlame = 7)    — direct burn
7. Scout   (Scout = 4)       — information gather
8. Draw    (Draw = 1)        — card draw
9. Void    (UseVoid = 9)     — null / counter-nullify
```

**TBD:** Exact damage formulas per action type are not finalized. Current codebase uses `bp` sum with modifiers. Full formula pending γ-calc design doc.

### 5.4 damage_calc() Algorithm (Pseudocode)

```
function damage_calc(input: DamageCalcInput): DamageResult:
  results = { damageToA: 0, damageToB: 0, effects: [] }

  // Resolve in priority order
  resolvePhase("Shadow",  input, results)
  resolvePhase("Storm",   input, results)
  resolvePhase("Barrier", input, results)
  resolvePhasePair("Steal", "Crystal", input, results)
  resolvePhase("Flame",   input, results)
  resolvePhase("Scout",   input, results)
  resolvePhase("Draw",    input, results)
  resolvePhase("Void",    input, results)

  return results

interface DamageResult:
  damageToA: number     // damage dealt to Player A
  damageToB: number     // damage dealt to Player B
  effects: EffectLog[]  // for animation / replay
```

### 5.5 Both-Client Agreement Check

ε-full requires that `damage_calc()` produce **identical results on both clients**. This is enforced as follows:

1. Both clients independently run `damage_calc()` after both reveals are complete.
2. Each client sends its computed `dmg` values as part of the `rs` memo.
3. If the two `rs` memos disagree on `dmg` values, a **violation is detected**.

```
Agreement check:
  clientA_dmg = damageCalc(input)
  clientB_dmg = damageCalc(input)  // same input, same function
  if clientA_dmg !== clientB_dmg:
    → VIOLATION: log dispute, halt round, escalate (TBD: slashing in β)
  else:
    → CONSENSUS: proceed with rs memo, update HP
```

**Determinism requirements for `damage_calc()`:**
- No floating point arithmetic — use integer arithmetic only
- No random number generation within the function
- Card stats loaded from a canonical, content-addressed source (TBD: on-chain catalog or IPFS with CID pinned in game PDA)
- Ability resolution is purely a function of (action, cards, opponent state) — no external state

### 5.6 Violation Detection

| Violation Type | Detection | Response |
|---|---|---|
| `rs` memo mismatch (dmg disagrees) | Both clients' `rs` memos differ | TBD — log + halt (β: on-chain dispute) |
| `hr` commitment mismatch | Poseidon(hr data) ≠ hc commitment | Cheating detected — TBD slash in β |
| Missing reveal | Player fails to reveal before timeout | TBD — forfeit / timeout mechanism |
| Invalid action type | `re` memo contains removed ActionType (e.g., Move=10) | Tx ignored by derivation function |

---

## 6. ZK Circuits

### 6.1 hand_commitment (KEEP — core ε-full primitive)

**File:** `circuits/hand_commitment/hand_commitment.circom`

**Purpose:** Prove knowledge of a hand (10 card IDs + salt) that hashes to a public commitment, without revealing the hand.

**Circuit signature:**
```
// Private inputs
signal input card_ids[10];
signal input salt_lo;
signal input salt_hi;

// Public inputs
signal input round;
signal input pubkey_lo;
signal input pubkey_hi;

// Output
signal output commitment;

// Constraint
commitment === Poseidon([card_ids[0..9], salt_lo, salt_hi, round, pubkey_lo, pubkey_hi])
```

**Usage in ε-full duel flow:**
1. At round start: player generates witness, computes `commitment`, sends `hc` memo.
2. After reveal phase: player broadcasts `hr` memo (card_ids + salt).
3. Any verifier runs Poseidon locally to verify `hr` against `hc`.
4. Full ZK proof submission (with `proof_cid`) is optional in ε-full lite, required in β.

**Status:** Implemented. Needs wiring into duel flow (P10 task).

### 6.2 dungeon_position (REMOVE — legacy dungeon, not applicable in ε-full)

**File:** `circuits/dungeon_position/dungeon_position.circom`

**Purpose (legacy):** Prove valid 1-step movement in 16×16×3 dungeon grid.

**Status in ε-full:** **REMOVED.** The dungeon/area/move concept is eliminated from ε-full. This circuit file should be archived and deleted from the active circuit build.

**Removal steps:**
1. Move file to `circuits/archive/dungeon_position.circom`
2. Remove from circuit compilation scripts
3. Remove `position_commitment[32]` from `PlayerState` struct (see §8)
4. Remove `area` field from `PlayerState` struct (see §8)

**Timeline:** P10 (cleanup task, low risk since circuit is not in use)

### 6.3 damage_proof (FUTURE — β full implementation)

**Status:** Not yet designed. TBD.

**Intended purpose:** Allow a player to prove their `damage_calc()` output is correct without revealing their private card hand, using a ZK circuit that takes:
- Private: card_ids (hand), action details
- Public: commitment, opponent's revealed action, damage result

**Design considerations (TBD):**
- Circuit size may be large (card ability resolution is complex logic)
- May require Groth16 or PLONK depending on constraint count
- Requires canonical card stat encoding on-chain or via IPFS CID
- Verification key needs to be stored on-chain or in program
- This is the final piece that makes "full trustless" work without server mediation

**Target:** Post-5/11 β phase. Not required for hackathon submission.

---

## 7. Phase Roadmap (P10–P14+)

### Overview

```
Phase 10 ──── Phase 11 ──── Phase 12 ──── Phase 13 ──── Phase 14+
  (ER prod)   (γ damage)   (Move Schema)  (ER observe)   (β full)
  [5/11]      [5/11]        [5/11]         [5/11]        [post-5/11]
```

### Phase 10 — ER Production Switch

**Target:** 2026-05-11
**Effort:** Medium (2–3 days)

**Goal:** Wire UI to `startGameMB` (MagicBlock-enabled game start). Switch `commit_action` and `reveal_action` calls to use `_mbMode = true` flag in `solana/client/onchain.js`.

**Completion criteria:**
- `startGameMB` function callable from UI
- `commit_action` sent to ER endpoint (devnet-router)
- `reveal_action` sent to ER endpoint
- `delegate_session` fires on game start
- `undelegate_session` fires on game end (via Magic Router)
- E2E test: 1 full round on ER devnet (manual verification OK)

**Dependencies:**
- `delegate_session` CPI (done)
- `undelegate_session` CPI (done)
- Magic Router endpoint configured (done)
- `_mbMode` flag in onchain.js (done)

**TBD:**
- Exact UI entrypoint for `startGameMB` (button wiring)
- Error handling if ER endpoint unreachable (fallback to base chain?)

### Phase 11 — γ Damage Recalculation

**Target:** 2026-05-11
**Effort:** Medium (2–3 days)

**Goal:** Both clients agree on `damage_calc()` output. Implement deterministic damage function in client JS/TS with same logic as `resolve_round.rs`.

**Completion criteria:**
- `damage_calc()` function implemented in `solana/client/` (TypeScript/JS)
- Same resolution order as §5.3
- Both clients independently compute identical damage for same input
- Unit tests covering all 9 action types
- Disagreement detection logic stubbed (log to console)

**Dependencies:**
- Card catalog accessible client-side (already in `docs/CARD_CATALOG.md`)
- Reveal data available after `reveal_action` ER tx

**TBD:**
- Exact damage formula per action type (currently: `bp` sum + modifiers, full formula TBD)
- Ability resolution for 13 special ability keys

### Phase 12 — Move Schema as Memo Encoding

**Target:** 2026-05-11
**Effort:** Medium (2–3 days)

**Goal:** All 7 memo types (`co/re/hc/hr/pa/rs/me`) are encoded in SPL Memo fields of ER transactions.

**Completion criteria:**
- `encodeMemo(type, payload)` utility implemented
- `decodeMemo(memoString)` utility implemented
- `commit_action` ER tx includes `co` memo
- `reveal_action` ER tx includes `re` memo
- `hc` memo sent as standalone ER tx (memo-only)
- `hr` memo sent as standalone ER tx (memo-only)
- `pa` memo sent by host on phase transitions
- `rs` memo sent by host after resolve
- `me` memo sent by host on match end

**Dependencies:**
- SPL Memo program interaction (existing in codebase)
- ER tx sending utility (existing `_mbMode` path)

**TBD:**
- Whether `rs` should also be a formal ER instruction (or memo-only is sufficient)
- Memo size enforcement (must stay under 566 bytes)

### Phase 13 — handlers/sync.js ER Tx Observation

**Target:** 2026-05-11
**Effort:** High (3–4 days)

**Goal:** `handlers/sync.js` subscribes to ER tx events for the game. If WS relay drops, the client reconstructs game state from ER tx log using `deriveGameState()`.

**Completion criteria:**
- ER tx subscription implemented (WebSocket to `devnet-router.magicblock.app`)
- `deriveGameState()` function implemented (see §4)
- Fallback trigger: if WS relay silent for >5s, switch to ER-derived state
- Reconnect logic: if WS relay comes back, reconcile states
- Integration test: drop WS relay mid-game, verify client continues from ER state

**Dependencies:**
- Move Schema (P12) must be complete first
- `damage_calc()` (P11) must be complete first

**TBD:**
- ER WebSocket subscription API (confirm `devnet-router` supports `logsSubscribe` or equivalent)
- State reconciliation strategy when WS relay returns with conflicting state
- Performance: how many ER txs to fetch on reconnect (pagination TBD)

### Phase 14+ — β Full Implementation (Post-5/11)

**Target:** Post-2026-05-11
**Effort:** Very High (2–4 weeks)

**Goal:** Full trustless card battle. `damage_proof.circom` ZK circuit enables third-party verification of damage without server.

**Milestones:**
- `damage_proof.circom` circuit designed and compiled
- Verifier key stored on-chain
- `resolve_round` becomes ER-capable (currently base chain only)
- On-chain HP tracking (remove client-side HP management)
- On-chain dispute resolution (slash cheating players)
- `damage_calc()` logic ported to Rust (on-chain verification)

**Dependencies:**
- All P10–P13 complete
- ZK circuit design for `damage_proof` (complexity TBD)
- On-chain card stat catalog (required for verifier)

---

## 8. Move / Area Removal Plan

### 8.1 What Is Being Removed

The original 0xARK design included a dungeon exploration mode with:
- Player position on a 16×16×3 grid
- `Move` action (ActionType = 10) for grid movement
- `area` field on `PlayerState`
- `position_commitment[32]` field on `PlayerState` (ZK dungeon position)
- `dungeon_position.circom` circuit

In ε-full, 0xARK is a **pure card battle game**. Dungeon/area/move concepts are fully removed.

### 8.2 ActionType Enum Changes

```rust
// BEFORE (current resolve_round.rs)
pub enum ActionType {
    None = 0,
    Draw = 1,
    Steal = 2,
    Barrier = 3,
    Scout = 4,
    Move = 10,      // ← REMOVE
    UseCrystal = 5,
    UseShadow = 6,
    UseFlame = 7,
    UseStorm = 8,
    UseVoid = 9,
}

// AFTER (ε-full)
pub enum ActionType {
    None = 0,
    Draw = 1,
    Steal = 2,
    Barrier = 3,
    Scout = 4,
    // Move removed
    UseCrystal = 5,
    UseShadow = 6,
    UseFlame = 7,
    UseStorm = 8,
    UseVoid = 9,
}
```

**Impact:** Wire values 0–9 are preserved. Wire value 10 becomes invalid. No re-encoding needed for existing action types 0–9.

### 8.3 resolve_round.rs Area Check Removal

Current `resolve_round.rs` has a Move resolution block at the top of priority order:

```rust
// REMOVE: Move legacy resolution block
// ActionType::Move => { ... area/position logic ... }
```

Also remove:
- Any `area` field reads/writes
- `move_target` field usage (currently on PlayerState — confirm if still needed)
- `position_commitment` field writes

### 8.4 PlayerState Schema Migration

| Field | Status in ε-full |
|---|---|
| `game_id` | KEEP |
| `player` | KEEP |
| `player_index` | KEEP |
| `area` | **REMOVE** |
| `cards[5]` | KEEP |
| `card_count` | KEEP |
| `steal_count` | KEEP |
| `barrier_count` | KEEP |
| `scout_count` | KEEP |
| `has_committed` | KEEP |
| `has_revealed` | KEEP |
| `revealed_action` | KEEP |
| `revealed_target` | KEEP |
| `move_target` | **REMOVE** (Move action gone) |
| `card_timestamps[5]` | KEEP (cooldown tracking) |
| `position_commitment[32]` | **REMOVE** (dungeon_position circuit gone) |
| `current_queue` | KEEP |
| `hp` | **ADD** (TBD: currently client-side only — β milestone) |

### 8.5 Migration Steps

1. **Rust program (`programs/oxark/`):**
   - Remove `area` and `move_target` and `position_commitment` from `PlayerState` struct
   - Remove `ActionType::Move` variant
   - Remove Move resolution block from `resolve_round.rs`
   - Remove area-check assertions

2. **Client JS (`solana/client/`):**
   - Remove `area` from `PlayerState` deserialization
   - Remove Move action from action type mapping

3. **ZK Circuits:**
   - Move `circuits/dungeon_position/` to `circuits/archive/`
   - Remove from compile scripts

4. **Tests:**
   - Remove Move-action test cases
   - Remove area-dependent test assertions

5. **Docs:**
   - This document supersedes any prior dungeon/area design docs
   - `docs/SHOGI_DESIGN.md` (if area-based) — mark as archived

**TBD:** Anchor account migration — if PlayerState is already deployed on devnet with `area` and `position_commitment` fields, a migration instruction or account reinitialization may be required. For hackathon purposes, redeployment with fresh PDAs is acceptable.

---

## 9. 5/11 Hackathon Submission — ε-full lite

### 9.1 Definition of ε-full lite

"ε-full lite" is the subset of ε-full that is deliverable by 2026-05-11. It demonstrates the core trustless primitives without requiring the full `damage_proof.circom` circuit.

### 9.2 Deliverables (5/11 Target)

| # | Feature | Phase | Status |
|---|---|---|---|
| 1 | `commit_action` / `reveal_action` on ER | P10 | Code ready, needs UI wiring |
| 2 | `delegate_session` on game start | P10 | Implemented |
| 3 | `undelegate_session` via Magic Router | P10 | Implemented |
| 4 | Move Schema in tx memos | P12 | Not started |
| 5 | `damage_calc()` deterministic on both clients | P11 | Not started |
| 6 | `deriveGameState()` from ER tx log | P13 | Not started |
| 7 | WS fallback to ER subscription | P13 | Not started |
| 8 | `hand_commitment.circom` in duel flow | P10 | Circuit exists, not wired |

### 9.3 "業界初" Claim Elements

The following properties, demonstrated together, constitute a first-in-industry claim for a trustless card battle game:

1. **ZK hand commitment on-chain:** Hand privacy via Poseidon ZK circuit recorded on ephemeral rollup — game cannot be front-run or hand-peeked by server.

2. **Full game state derivable from ER tx log:** `deriveGameState(erTxSequence)` is a pure function. No server database required for dispute resolution.

3. **Deterministic damage across both clients:** `damage_calc()` runs identically on both clients. Server cannot manipulate damage outcomes.

4. **x402 + ER + ZK stack:** Payment (x402) → Execution (MagicBlock ER) → Privacy (ZK) — three trustless layers fully composed in a card game.

5. **MagicBlock ER integration:** Real-time card game actions (commit/reveal) on Solana ER with ~50ms latency — settles to base chain automatically.

### 9.4 Demo Script Key Points

**Demo flow (10-minute version):**

```
1. SETUP (1min)
   - Show two browser windows (Player A, Player B)
   - Both connect wallets

2. GAME START (2min)
   - Host calls startGameMB → delegate_session fires
   - Show Solana Explorer: ER session active
   - Show Magic Router dashboard (TBD: if available)

3. ROUND 1 — COMMIT (2min)
   - Player A: commit_action → ER tx with `co` memo
     Show ER tx signature in browser
   - Player A: hand_commit → ER tx with `hc` memo + Poseidon hash
   - Player B: same
   - Show: "Both commitments on ER. Server cannot see actions."

4. ROUND 1 — REVEAL (2min)
   - Player A: reveal_action → ER tx with `re` memo
   - Player A: hand_reveal → ER tx with `hr` memo + card IDs
   - Show: Commitment verification (Poseidon(hr) == hc)
   - Show: damage_calc() running same on both clients
   - Show: `rs` memo agreement

5. TRUSTLESS VERIFICATION (2min)
   - Open third browser tab (observer)
   - Observer calls deriveGameState(ER txs)
   - Observer sees identical game state to players
   - "Zero trust in server demonstrated"

6. MATCH END (1min)
   - Host sends `me` memo
   - undelegate_session via Magic Router
   - Winner settles on base chain
```

---

## 10. Post-5/11 北極星 — North Star

### 10.1 β Full Implementation Goal

The ultimate goal of ε-full → β is: **a card battle game where neither player, nor the server, nor anyone else can cheat — provably, mathematically, forever.**

```
β milestone definition:
  - damage_proof.circom circuit operational
  - resolve_round instruction ER-capable (not just base chain)
  - HP managed on-chain (PlayerState.hp field)
  - On-chain slash mechanism for commitment mismatch
  - Full card catalog on-chain (or IPFS CID pinned in program)
  - No server state required for any game outcome determination
```

### 10.2 damage_proof Circuit Direction

**Problem:** In ε-full lite, `damage_calc()` agreement relies on both clients being honest about which cards they played. If a player lies in their `hr` memo but the `hc` commitment matches fabricated card IDs, damage can be manipulated.

**Solution (β):** `damage_proof.circom` proves:
```
Given:
  - Private: actual card_ids (hand), salt
  - Public: hand_commitment (from hc), opponent_action, claimed_damage_result

Prove:
  1. Poseidon(card_ids, salt, ...) == hand_commitment
  2. damage_calc(card_ids, opponent_action) == claimed_damage_result

Without revealing: card_ids or salt
```

**Circuit complexity estimate (TBD):**
- `damage_calc()` has 9 action types with up to 3 cards each
- Ability resolution adds conditional branches (13 ability keys)
- Estimate: 100k–500k constraints (TBD)
- Proof system: Groth16 (fixed proof size) preferred for on-chain verification
- Proving time: TBD (target < 5 seconds on modern hardware)

### 10.3 Trustless Significance

The combination of ε-full lite → β represents a meaningful contribution to the field:

**Current state of blockchain games:**
- Most "on-chain games" still rely on centralized servers for game logic
- ZK proofs in games are typically limited to asset ownership, not gameplay fairness
- Real-time action games on-chain require Layer-2 / rollup solutions that are not yet widely used in gaming

**0xARK β contribution:**
- First card battle game where hand privacy AND damage fairness are both ZK-provable
- Demonstrates MagicBlock ER as a viable game execution layer for real-time competitive games
- Establishes the commit-reveal-prove pattern for PvP games on Solana

### 10.4 Research / Academic Angle (TBD)

TBD: Whether to write a technical paper or formal specification for the ε-full / β protocol as part of a broader academic or research contribution. The damage_proof circuit design and state derivation function formalization are potential candidates for publication.

---

## 11. Appendix — Data Schemas

### 11.1 Current On-Chain Game State Schema

```rust
// programs/oxark/src/state/game.rs
pub struct Game {
    pub game_id: [u8; 32],
    pub host: Pubkey,
    pub status: GameStatus,  // Lobby | CommitPhase | RevealPhase | Finished
    pub round: u8,
    pub max_rounds: u8,
    pub player_count: u8,
    pub max_players: u8,
    pub winner: Pubkey,
    pub commit_count: u8,
    pub reveal_count: u8,
}

pub struct PlayerState {
    pub game_id: [u8; 32],
    pub player: Pubkey,
    pub player_index: u8,
    pub area: u8,                      // ← REMOVE in ε-full
    pub cards: [u8; 5],
    pub card_count: u8,
    pub steal_count: u8,
    pub barrier_count: u8,
    pub scout_count: u8,
    pub has_committed: bool,
    pub has_revealed: bool,
    pub revealed_action: u8,
    pub revealed_target: Pubkey,
    pub move_target: Pubkey,           // ← REMOVE in ε-full
    pub card_timestamps: [i64; 5],
    pub position_commitment: [u8; 32], // ← REMOVE in ε-full
    pub current_queue: u8,
    // pub hp: u16,                    // ← ADD in β
}

pub struct CommitAction {
    pub game_id: [u8; 32],
    pub round: u8,
    pub player: Pubkey,
    pub hash: [u8; 32],
    pub phase: u8,
    pub played_cards: [u64; 3],
    pub played_cards_len: u8,
}
```

### 11.2 Card Catalog Summary

- Total cards: 60 (v3.0-plus: 58 in metadata + 2 extended Legendaries)
- Clans: BF (Bloodfire), SB (Stoneblade), HB (Hollow Bone), IC (Icecryst), NS (Nightspore)
- Rarities: C (Common), U (Uncommon), R (Rare), L (Legendary)
- Stats per card: `bp` (Battle Power), `hp` (Hit Points), `ini` (Initiative)
- Special abilities: 13 ability keys (full list in `docs/CARD_CATALOG.md`)
- Notable Legendary: #55 Sceptre of Valerius (ability_key: `hand_peek_steal`)

### 11.3 Program Endpoints

| Endpoint | Chain | Function |
|---|---|---|
| Base Chain RPC | Solana devnet | Standard program instructions |
| `https://devnet-router.magicblock.app` | MagicBlock ER | ER instructions + undelegate |

### 11.4 Glossary

| Term | Definition |
|---|---|
| ER | Ephemeral Rollup (MagicBlock's Layer-2) |
| Path A | DB-less, server stateless game architecture (ε-full target) |
| Path B | Server-authoritative WS relay (current state) |
| ε-full | Epsilon-full: trustless card battle with ZK + ER |
| ε-full lite | Hackathon-scoped subset of ε-full (P10–P13) |
| β | Post-hackathon: full `damage_proof.circom` implementation |
| Move Schema | 7 memo types encoding all game events on ER |
| `hc` | Hand Commit memo (Poseidon ZK commitment) |
| `hr` | Hand Reveal memo (card IDs + salt) |
| `co` | Action Commit memo (SHA-256 hash) |
| `re` | Action Reveal memo (action_type, target, salt) |
| `pa` | Phase Advance memo |
| `rs` | Round Resolve memo |
| `me` | Match End memo |
| Magic Router | MagicBlock's routing layer for base chain ↔ ER bridging |

---

*Document maintained by r0ze / 株式会社雪風. TBD items should be resolved before β implementation begins.*

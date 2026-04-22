# Day 12 Handoff Report

**Completed:** 2026-04-23  
**Tag:** v-phd-day12  
**Branch:** phase-d-reborn  

---

## What Was Built

### T-D12-A0: Pre-flight ✅

- Branch: phase-d-reborn (continued from Day 11)
- Build: `node build.js` clean (25 modules, 30811 lines)
- Rust: `cargo check` 0 errors (23 warnings, all pre-existing)

### T-D12-A1–A5: Circuit Build ✅

**Circuit:** `circuits/hand_commitment/hand_commitment.circom`
- Poseidon(15): 15 inputs → 1 commitment output
- Inputs: card_ids[10] + salt_lo/hi + round + pubkey_lo/hi
- Public: round, pubkey_lo, pubkey_hi
- 576 constraints

**Artifacts generated:**
- `hand_commitment.r1cs`, `hand_commitment_js/hand_commitment.wasm` (3.3MB)
- `hc_0000.zkey` → `hc_final.zkey` (779KB)
- `verification_key.json` (extracted VK for Rust embedding)
- `proof.json` + `public.json` (test proof: verified OK)

**Client files:**
- `solana/client/hand_commitment.wasm` ✅
- `solana/client/hand_commitment_final.zkey` ✅
- `solana/client/template.html`: snarkjs CDN 0.7.4 → 0.7.5

### T-D12-B: Anchor Instructions ✅

**`state.rs`:**
- `DuelState` account: 5 rounds × 2 players, commitments + reveals
- Events: `DuelInitialized`, `HandCommitted`, `HandRevealed`

**`instructions/init_duel.rs`:**
- PDA seeds: `["duel", duel_id.as_ref()]`
- Emits `DuelInitialized`

**`instructions/commit_hand.rs`:**
- Full Groth16 verification via embedded VK const arrays
- VK from verification_key.json: 5 IC points (nPublic=4)
- `compute_vk_x_hc()`: IC[0] + sig[0]*IC[1] + ... + sig[3]*IC[4]
- Stores `public_signals[0]` (commitment) to `DuelState`
- Uses `alt_bn128_pairing` syscall (same pattern as `verify_dungeon_move.rs`)

**`instructions/reveal_hand.rs`:**
- Accepts `card_ids: [u64; 10]` + `commitment_hash: [u8; 32]`
- Compares client-supplied hash to stored commitment
- ⚠️ DEF-16: No on-chain Poseidon re-computation — see Known Deferrals

**`error.rs`:** Added `WrongDuel`, `WrongRound`, `NotADuelParticipant`, `CommitmentNotSet`, `HandAlreadyRevealed`, `DuelOver`

### T-D12-C2: Frontend ZK Helpers ✅

**Added to `solana/client/src/08-duel-scene.js`:**

```js
bytesToBigInt(bytes)          // Uint8Array → BigInt
fieldToBytes(bigintVal)       // BigInt → Uint8Array(32)
proofG1ToBytes(g1)            // snarkjs G1 → 64 bytes
proofG2ToBytes(g2)            // snarkjs G2 → 128 bytes (EIP-197)
generateHandCommitmentProof(  // full proof generation
  playerHand, round, pubkeyArg)
```

- Uses `/hand_commitment.wasm` + `/hand_commitment_final.zkey`
- Returns `{ proofBytes, salt, commitmentBytes }`
- `proofBytes.publicSignals[0]` = commitment field element

### T-D12-C3: _lockIn() ZK Wiring ✅

**`_lockIn()` (08-duel-scene.js):**
- `DS.mode !== 'hotseat'` + `activeSide === 0` → calls `_commitHandZK()`
- Non-blocking async (fire-and-forget)

**`_commitHandZK()` (new):**
- Shows `(COMMITTING…)` toast
- Calls `generateHandCommitmentProof(DS.p[0].hand, DS.round, pubkeyArg)`
- Stores `DS.p[0]._handSalt`, `._handCommitment`, `._handProof`
- Shows `COMMITTED ✓` toast on success
- If wallet connected + `DS._duelId` set → calls `_emitCommitHandTx()`

**`_emitCommitHandTx()` (new):**
- Builds `commit_hand` instruction (disc + proof_a[64] + proof_b[128] + proof_c[64] + signals[128])
- Signs + sends via `window.solana.signTransaction`
- Logs TX signature on success

### T-D12-D: WebSocket Duel Sync Protocol ✅

**`multiplayer/server.js` — 5 new message types:**

| Type | Sender | Relay To | Notes |
|------|--------|----------|-------|
| `duel_hand_committed` | Player | Opponent | commitment_hex only (no proof/cards) |
| `duel_hand_revealed` | Player | Opponent | card_ids after battle |
| `duel_phase_advance` | Host | All | phase + round transition |
| `duel_battle_resolved` | Host | All | p1/p2 hp deltas |
| `duel_ended` | Host | All | winner pubkey |

All types validate and sanitize inputs before relay.

### T-D12-E: M3 Duel Intro Cutscene ✅

**`_drawDuelIntroCutscene()` + `_drawHexSeal()` (08-duel-scene.js):**

- 105-frame (~1.75s) overlay at duel start
- Fade in (0–20) → hold (20–80) → fade out (80–105)
- ZK hex seal: outer hex + inner rotating hex + spokes + center dot
- 6 orbiting colored tokens
- Hall name in tier color (bronze/silver/gold)
- "DUEL" title + round count
- ZK status: "ZK SEALING…" → "ZK COMMITTED ✓" once `_handCommitment` set
- `DS._introActive` flag, non-blocking (game continues behind overlay)

### T-D12-F: Tests ✅

**`tests/t112-d12-zk-duel.js` — 18/18 PASS:**
- T-D12-F1: bytesToBigInt/fieldToBytes round-trip (5 tests)
- T-D12-F1: proofG1/G2ToBytes serialization shape (4 tests)
- T-D12-F1: generateHandCommitmentProof (valid hand, shapes, empty hand)
- T-D12-F3: Cheat detection — mismatched/correct commitment comparison (2 tests)
- T-D12-F3: Reveal card_ids padding (3 tests)
- Slow proof simulation — resolves after delay (1 test)

**T-D12-F2: SKIPPED — DEF-16**
- `commit([1,2,3,4,5]) → reveal([1,2,3,4,10])` should revert with `CommitmentMismatch`
- Currently passes silently because `reveal_hand.rs` compares client-supplied hash, not Poseidon(card_ids)
- See Known Deferrals below

---

## Known Deferrals

### DEF-16: On-chain Poseidon(15) for reveal_hand
**Priority:** CRITICAL — security gap  
**Target:** Day 13 Group A0 (before Delegate pattern)  
**Detail:** `reveal_hand.rs` compares `commitment_hash` byte-for-byte against stored commitment.  
Client supplies the hash — a malicious client can send a correct hash with wrong card_ids.  
**Fix:** Add `light-poseidon` dependency, compute `Poseidon([card_ids..., salt_lo, salt_hi, round, pubkey_lo, pubkey_hi])` on-chain, compare against stored commitment.

### DEF-11: Frontend unlock_lore_shard CPI after duel end
**Target:** Day 13 or Day 12 remaining capacity  
**Detail:** `_exitDuelScene()` should call `unlock_lore_shard(card_mint, 1, 'duel_win')` for winner

---

## Files Modified

| File | Change |
|------|--------|
| `circuits/hand_commitment/hand_commitment.circom` | NEW — Poseidon(15) circuit |
| `circuits/hand_commitment/build/*` | NEW — compiled artifacts |
| `solana/client/hand_commitment.wasm` | NEW — browser proof file |
| `solana/client/hand_commitment_final.zkey` | NEW — browser zkey |
| `solana/client/template.html` | snarkjs CDN 0.7.4→0.7.5 |
| `solana/oxark/programs/oxark/src/state.rs` | DuelState + events |
| `solana/oxark/programs/oxark/src/error.rs` | 6 new error variants |
| `solana/oxark/programs/oxark/src/instructions/init_duel.rs` | NEW |
| `solana/oxark/programs/oxark/src/instructions/commit_hand.rs` | NEW (Groth16 verifier) |
| `solana/oxark/programs/oxark/src/instructions/reveal_hand.rs` | NEW (DEF-16 MVP) |
| `solana/oxark/programs/oxark/src/instructions.rs` | 3 new mods |
| `solana/oxark/programs/oxark/src/lib.rs` | 3 new dispatches |
| `solana/client/src/08-duel-scene.js` | C2/C3 ZK helpers + M3 cutscene |
| `multiplayer/server.js` | 5 new duel WS message types |
| `tests/t112-d12-zk-duel.js` | NEW — 18 tests |

---

## Build Status

| Check | Result |
|-------|--------|
| `node build.js` | ✅ 0 errors |
| `cargo check` | ✅ 0 errors (23 pre-existing warnings) |
| `node tests/t112-d12-zk-duel.js` | ✅ 18/18 PASS |

---

## Day 13 Handoff

**Must-do (DEF-16 first):**
1. `light-poseidon` integration in `reveal_hand.rs`
2. T-D12-F2 test: commit/reveal cheat attempt should now revert
3. Delegate pattern (MagicBlock ER)

**Suggested:**
- DEF-11: `unlock_lore_shard` CPI after duel win
- Online mode (`DS.mode = 'online'`) wire-up via WebSocket matchmaking
- `DS._duelId` population from `init_duel` PDA derivation

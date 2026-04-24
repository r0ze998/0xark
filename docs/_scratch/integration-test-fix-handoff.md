# Integration Test Fix Handoff

**Branch**: `phase-d-reborn`  
**Tag**: `v-phd-integration-test-fix`  
**Date**: 2026-04-24

---

## What was fixed

### 1. CommitAction / RevealAction struct fields (programs/oxark/tests/test_game.rs)

The v3.0-plus handlers added `phase: u8` and `played_cards: Vec<u64>` to `CommitAction`, and `played_cards: Vec<u64>` to `RevealAction`. The Anchor-type integration test file used struct literal syntax and was missing these fields at all 9 call sites.

Fixed: added `phase: 0, played_cards: vec![]` to CommitAction, `played_cards: vec![]` to RevealAction.

### 2. Borsh deserialization in resolve_round.rs

`PlayerState::try_from_slice()` uses Borsh 1.x strict mode which fails when trailing bytes remain. `PlayerState::SIZE` allocates 33 bytes for `Option<Pubkey>` but the `None` case only writes 1 byte, leaving 32 trailing zeros.

Fixed: switched to `BorshDeserialize::deserialize(&mut slice)` which is reader-based and does not require consuming all bytes.

### 3. BPF stack overflow — evolve_cards.rs

`EvolveCards::try_accounts` put three `CardBattleHistory` structs (~644 bytes each) on the stack, exceeding the 4096-byte BPF limit.

Fixed: wrapped `parent_a_history`, `parent_b_history`, `child_history`, and `season_stats` in `Box<Account<'info, ...>>`.

### 4. BPF stack overflow — sha2 dependency

The `sha2 = "0.10"` crate's `hybrid_array` and `crypto_common` generics overflow the BPF stack. This caused `LiteSVM::add_program` to return `InvalidAccountData`.

Fixed: replaced all `sha2::Sha256` usage in production code with `solana_sha256_hasher::hashv` (calls the `sol_sha256` BPF syscall — no stack-heavy generic code). `sha2` retained as dev-dependency only for tests.

Files changed:
- `programs/oxark/src/instructions/resolve_round.rs`
- `programs/oxark/src/instructions/reveal_action.rs`
- `programs/oxark/src/instructions/reveal_card.rs`
- `programs/oxark/Cargo.toml` (sha2 moved to dev-deps, added solana-sha256-hasher)

### 5. Raw-bytes test encoding (tests/test_game.rs)

The outer `oxark-tests` crate uses manual byte serialization. After the sha2/struct fixes, these tests also needed the new fields:
- `commit_action`: added `phase` (1 byte) and `played_cards` vec len (4 bytes) at 8 call sites
- `reveal_action`: added `played_cards` vec len (4 bytes) at 5 call sites
- `reveal_action`: changed commit account metas from `new_readonly` to `new` (writable) at 5 call sites

### 6. ZK narrative (README + docs)

`reveal_hand` uses plaintext Poseidon re-computation (not a ZK proof). All "ZK-hidden hands" references updated to "ZK commit-reveal" across:
- `README.md` (6 substitutions)
- `docs/pitch-video-script.md`
- `docs/colosseum-submission-draft.md`
- `docs/arena-submission.md`
- `docs/GDD.md` (8 substitutions)

---

## Test results after fix

```
37 unit tests  — ok
6 integration tests (programs/oxark/tests/test_game.rs) — ok  
20 integration tests (tests/test_game.rs) — ok
+ doc/IDL/poseidon tests — all ok
```

Total: **all tests green**, 0 failures.

---

## Key technical insight: include_bytes! gotcha

`programs/oxark/tests/test_game.rs` embeds the SBF binary at compile time via `include_bytes!("../../../target/deploy/oxark.so")`. Any change to Rust source requires `cargo build-sbf` before the test binary can pick it up. The outer `tests/test_game.rs` loads from the filesystem at runtime (no include_bytes!) and always uses the latest `.so`.

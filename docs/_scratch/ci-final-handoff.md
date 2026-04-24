# CI Final Handoff — v-phd-ci-final

**Tag**: `v-phd-ci-final`
**Date**: 2026-04-24
**Author**: Claude (session continuation)

---

## What was done

### 1. CI full green-ification

#### a) `.github/workflows/ci.yml` — Anchor Rust Tests job

**Problem**: `cargo test` ran in `solana/oxark/tests` without the SBF binary built first.
`tests/test_game.rs` embeds `target/deploy/oxark.so` via `include_bytes!` at compile time — binary must exist before `cargo test` is invoked. CI had no Solana CLI and no `cargo build-sbf` step, causing `add_program` to fail with `InvalidAccountData`.

**Fix**: Rewrote the `anchor-tests` job to:
1. Cache `~/.local/share/solana` and `~/.cache/solana` (Agave CLI + platform-tools)
2. Install Agave/Solana CLI v4.0.0 from `https://release.anza.xyz/v4.0.0/install`
3. Run `cargo build-sbf --manifest-path programs/oxark/Cargo.toml` (produces `target/deploy/oxark.so`)
4. Run `cargo test` from `solana/oxark` workspace root (picks up all 107 tests: 37 unit + 70 integration)

Cache key changed from `cargo-` to `cargo-sbf-` to avoid stale cache without Solana toolchain.

#### b) `solana/client/react/package-lock.json` — regenerated

**Problem**: `npm ci` failed in CI because `@types/react@19.2.14` was missing from the lockfile.

**Fix**: Ran `rm package-lock.json && npm install` in `solana/client/react/`. Fresh lockfile committed.

---

### 2. Docs test count update: 141 → 274

Actual test counts (verified locally before this commit):
- **107 Anchor/Rust**: 37 unit (`#[cfg(test)]` in `programs/oxark/src/`) + 70 litesvm integration (`programs/oxark/tests/test_game.rs` + `tests/test_game.rs`)
- **102 Client JS**: 53 card-engine + 49 battle-mechanics
- **65 AI Agent**: 7 basic + 10 burn + 10 evolve + 23 imprint + 15 steal

Files updated:
- `README.md` (line 15 badge + line 227 feature bullet)
- `docs/pitch-video-script.md` (stats overlay + closing line)
- `docs/colosseum-submission-draft.md` (paragraph 5 + TEST COVERAGE section)
- `docs/x-posts-thread.md` (post 10)

---

## Test execution summary (local, pre-commit)

```
cargo test (solana/oxark)         107 tests, 0 failures
node tests/card-engine.test.js    53 passed, 0 failed
node tests/battle-mechanics.test.js  49 passed, 0 failed
node tests/test_*.js (ai-agent)   65 passed, 0 failed
                                  ─────────────────────
                                  274 total, 0 failures
```

---

## CI jobs expected state after merge

| Job | Expected | Notes |
|-----|----------|-------|
| Node.js Unit Tests | ✅ green | card-engine + battle-mechanics |
| Anchor Rust Tests | ✅ green | Solana CLI installed, SBF built first |
| React Wallet UI Build | ✅ green | fresh package-lock.json |
| Game Client Build | ✅ green | unchanged |
| AI Agent Tests | ✅ green | unchanged |

---

## Root cause archive (for future devs)

**Why `cargo build-sbf` before `cargo test`?**
`programs/oxark/tests/test_game.rs` uses `include_bytes!("../../../target/deploy/oxark.so")` — the SBF binary is embedded at Rust compile time. Without a prior `cargo build-sbf`, the path doesn't exist and the crate fails to compile.

**Why did the SBF binary fail verification previously?**
Two issues (fixed in prior commit `c3a4d38`):
1. `EvolveCards::try_accounts` exceeded the 4096-byte BPF stack limit — fixed by boxing large account structs
2. `sha2` crate's generic `hybrid_array` and `crypto_common` functions exceeded the stack limit — fixed by replacing with `solana_sha256_hasher::hashv` (syscall-based, zero BPF stack cost)

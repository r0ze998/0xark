# Maintenance SOP

Operational procedures for keeping cross-cutting invariants intact. Each section
is self-contained.

---

## Damage-Calc Parity (3 implementations)

The battle resolver is implemented **three times** and every copy must produce
byte-identical results for identical inputs. A one-sided edit is a correctness
bug: it desyncs on-chain settlement from what clients/agents predicted (wrong
winner, wrong loot).

| # | File | Role | Parity guard |
|---|------|------|--------------|
| 1 | `tools/ai-agent/src/damage-calc.js` | **CANONICAL** (Node ESM) — the source fixtures are generated from | — (source of truth) |
| 2 | `solana/oxark/programs/oxark/src/damage_calc.rs` | on-chain resolver (Rust) | ✅ `tests/test_damage_calc.rs` cross-tests it against the fixtures every `cargo test` |
| 3 | `solana/client/src/lib/damage-calc.js` | browser client (ESM) | ⚠️ **none** — hand-kept mirror; see "Residual risk" |

### Parity graph

```
tools/ai-agent/src/damage-calc.js   (CANONICAL)
          │  node tools/generate-fixtures.js
          ▼
fixtures/damage_calc.json   (180 cases — the parity contract)
          │  include_str! + cargo test
          ▼
solana/oxark/.../src/damage_calc.rs   ← cross-tested (CI: "Anchor Rust Tests")

solana/client/src/lib/damage-calc.js  ← hand-kept mirror of the canonical copy
                                          (NOT cross-tested — see Residual risk)
```

### Version stamp

Each of the 3 impls carries a `PARITY-BASELINE:` header line:

```
PARITY-BASELINE: fixtures-sha256=828c18a5 (2026-07-27)
```

- `fixtures-sha256` = the first 8 hex of `sha256(fixtures/damage_calc.json)`
  (full: `828c18a59fb415a67372a7d75d60687498264f911c86470d954169ed064c031d`).
  The fixtures file is a bare JSON array (the Rust test deserializes `Vec<Fixture>`),
  so it cannot hold an in-band comment — the hash lives in the impl headers instead.
- The date is the last regeneration / parity-baseline date.

**Why the fixtures hash and not the ZK "circuit hash":** `damage_calc` is the pure
battle-math resolver; it is independent of the `hand_commitment` Groth16 circuit
(`*_final.zkey`), which only binds commit-reveal. A circuit hash never moves when the
battle math changes, so it cannot detect damage-calc drift. The fixtures file *is*
the damage-calc parity contract, so its content hash is the correct pin.

### Detect drift (fast check)

```sh
# 1. The stamp must match the actual fixtures file:
shasum -a 256 fixtures/damage_calc.json          # must start 828c18a5

# 2. All 3 impls must carry the SAME stamp:
grep -rn "PARITY-BASELINE: fixtures-sha256=" \
  tools/ai-agent/src/damage-calc.js \
  solana/client/src/lib/damage-calc.js \
  solana/oxark/programs/oxark/src/damage_calc.rs
# → the three sha values must be identical to each other AND to (1).
```

A mismatch means someone changed an implementation (or the fixtures) without
propagating it — investigate before merging.

### Regeneration SOP (run on ANY damage-calc logic change)

Whenever you change battle math in **any** of the 3 files (or in the shared
`abilities.js` / card tables they read):

1. **Make the logic change in the CANONICAL copy first**
   (`tools/ai-agent/src/damage-calc.js`), then port the identical change to the
   other two (`solana/client/src/lib/damage-calc.js`, `damage_calc.rs`).

2. **Regenerate the fixtures** from the canonical copy:
   ```sh
   node tools/generate-fixtures.js          # rewrites fixtures/damage_calc.json (~180 cases)
   ```

3. **Run the Rust cross-test** — this is the hard gate that proves JS↔Rust parity:
   ```sh
   cd solana/oxark && cargo test --test test_damage_calc
   ```
   If it fails, the Rust port does not match the canonical JS — fix `damage_calc.rs`,
   do **not** weaken the fixtures.

4. **Manually diff the client copy** against the canonical copy (no automated guard):
   ```sh
   diff tools/ai-agent/src/damage-calc.js solana/client/src/lib/damage-calc.js
   ```
   Only the header comments (Node vs browser wording) should differ. Any logic
   delta is a bug.

5. **Bump the stamp** — update `PARITY-BASELINE: fixtures-sha256=<new8> (<today>)`
   in **all three** impl headers to the new `shasum -a 256 fixtures/damage_calc.json`.

6. Commit the fixtures + all 3 impls + stamps **together** in one changeset, so the
   parity move is atomic and reviewable.

### Residual risk & suggested follow-up

The client copy (#3) has **no automated cross-test** — a logic edit there that
skips this SOP will not be caught by CI. The stamp makes an *intentional* change
visible in review (mismatched sha across the 3 files), but it cannot catch a
silent client-only edit that never regenerates fixtures.

Closing that gap is a **code change** (out of scope for this docs-only SOP). Suggested
ticket: add a Node cross-test that runs the client copy against `fixtures/damage_calc.json`
(mirroring `test_damage_calc.rs`) and wire it into the "Node.js Unit Tests" CI job.

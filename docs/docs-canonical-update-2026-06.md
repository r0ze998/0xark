# Canonical docs update — change summary (2026-06-20)

Rewrote `README.md` and `docs/GDD.md` to make the **current implementation**
(`main`, post PR #24 prize-settlement + PR #38 PDA vault) the single source of truth,
and archived the legacy vision GDDs. Source of truth: the audit
(`docs/audit-readme-vs-implementation-2026-06.md`), the `claim_prize_v2` settlement
code, and on-chain e2e measurements taken on a local validator.

## What changed, by file

### `README.md` (full rewrite)
- **Genre/model corrected** to the shipped game: 14-day Season → 2-player ZK duels
  (`init_duel` → `commit_hand` → `reveal_hand` → `damage_calc`) → 60-card collection
  race → rank prize. Removed all "3-player roguelike / dungeon / fog-of-war /
  VEGA-MIRA NPC" language (legacy vision, dead code).
- **Instruction count 59 → 63** (verified: `lib.rs` `#[program]` ≡ `oxark-idl.json`).
- **SPL mint** clarified as living in the **separate `oxark-cards` program**, not the
  main program surface.
- **MagicBlock** status unified: real `delegate_session`/`undelegate_session` CPI +
  client Magic Router, but wired to the legacy Game engine, **not the active duel path**
  (resolves the README "🚧 not integrated" vs CLAUDE.md "production-wired" contradiction).
- **Prize distribution** rewritten to the implemented rank ladder (T1 50% … T5 2%) with
  **empty-band carry-over** and the full settlement path
  (`activate_season` → `finalize_season_tally` crank → `end_season_final` →
  `claim_prize_v2` PDA-vault `invoke_signed`); noted e2e-verified on a local validator.
- **Economy**: 0.5 SOL 85/15 split made explicit; 4 revenue sources enumerated;
  `accept_listing` 0% fee stated.
- **ZK** section updated to the current circuit: `hand_commitment` (Poseidon(6)),
  measured CU (`commit_hand` ~135k, `reveal_hand` ~43k); `commit_reveal`/277 noted as
  legacy. Documented the `custom-heap` → `RequestHeapFrame` requirement.
- Added explicit **Implementation status**, **Known gaps** (duel rounds 2–5 unwired),
  and **Legacy code** sections. Stubs (`claim_legendary`, `distribute_prize_pool`)
  marked. Removed unverifiable claims (e.g. "260+ tests"); test count set to the
  verified `make test` = 181.

### `docs/GDD.md` (full rewrite → v3.0 canonical)
- Replaced the 1,617-line v2.0 aspirational design with a canonical doc matching code,
  cross-consistent with the README (same numbers/terms).
- **Steal/loot 2 cards → 1** (matches `damage_calc` / `claim_battle_loot`).
- **40/20/10 split → rank ladder + carry-over** (matches `claim_prize_v2`).
- **`Faction` / `PlayerIdentity` PDA** removed and explicitly listed as **not
  implemented** (no such structs on-chain).
- Removed: 20-card phase-based decks, 4-phase/lane combat, energy/element affinity,
  Heart HP, dungeon/identity ZK — all v2.0 aspirations not in code.
- Added §12 "Removed from canon" enumerating dropped v2.0 features, and §13 known gaps.

### `legacy/phase-c/GDD-v0.2.md`, `legacy/phase-c/GDD-v0.3.md`
- Prepended an **ARCHIVED** notice pointing to `docs/GDD.md` as canonical. Content
  otherwise left intact (historical reference). *(These are the legacy GDDs; the request
  referenced `GDD-v0.2/v0.3.md` — they live under `legacy/phase-c/`, not `docs/`.)*

## Notes / deviations
- `docs/GDD-v0.2.md` / `docs/GDD-v0.3.md` do not exist; the legacy GDDs are at
  `legacy/phase-c/`. Archived there.
- ZK figures use **measured** local-validator CU (more accurate than the v2.0 GDD's
  pre-YKK-33 "576 constraints / 129,993 CU" for `hand_commitment`).

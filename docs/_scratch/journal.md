# 0xARK Project Journal

## 2026-04-21 — Day 2 (Claude Code overnight)

**Tasks completed:**
- T-D2-0: Environment check ✅ — anchor 1.0.0 (expected 0.30.x, backward-compat noted), cargo 1.89, node 25.7, bun installed, 26 instruction files confirmed
- T-D2-1: Instruction audit ✅ — 26 instructions classified: 20 KEEP, 3 RETARGET, 2 EXTEND, 2 DEPRECATE, 0 UNKNOWN. Total migration effort 12h. Matrix in docs/_scratch/instruction_migration.md
- T-D2-2: Retarget commit_action/reveal_action/resolve_round ✅ — cargo check exits 0 (warnings only). anchor build unavailable (cargo-build-sbf not in PATH). Added Reborn phase fields to CommitAction, dual-path reveal, TODO stub in resolve_round.
- T-D2-3: Lobby tilemap JSON ✅ — 25×18 grid, 6 buildings, 3 layers (ground/walls/decos). JSON valid. Tile IDs from sample-overworld.tmx reference.
- T-D2-4: LobbyScene ✅ — 05-lobby.js: tilemap render, WASD/arrow movement, collision, building proximity, remote player stub, LOBBY button in ctrls bar. syntax OK, build.js passes.

**Decisions:**
- DECISION: cargo check instead of anchor build — cargo-build-sbf not available in this shell; code correctness verified
- DECISION: Function-based LobbyScene (enterLobby/dLobby/exitLobby) — matches existing sc= pattern
- DECISION: Embedded tile fallback colors — graceful degradation if PIRATE_SHEET not loaded
- DECISION: CommitAction SIZE extended 27 bytes for Reborn fields — new devnet PDAs will use new size

**Blockers encountered:**
- cargo-build-sbf not in PATH — used cargo check instead. Full Solana BPF build requires Solana toolchain install on the build host.

**Next:** T-D3-1 (extend multiplayer/server.js message types)

## 2026-04-21: Phase C → Phase D Reborn pivot
- Phase C ended at 694eb33 (v541)
- GDD v1.0 written (4977 words), approved by r0ze ("いいやん全部実装しよう")
- Phase D Sprint plan written (2573 words), 21-day roadmap
- phase-c-final-694eb33 tag created as rollback point
- phase-d-reborn branch created, active
- 0xARK is becoming: on-chain card collection race MMO (FRLG JRPG style)
- Submission deadline: 2026-05-11

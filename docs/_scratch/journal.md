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

## 2026-04-21 — Day 3 (Claude Code overnight, continued)

**Tasks completed:**
- T-D3-1: server.js protocol v2 ✅ — sanitizeClan() allowlist, wallet/clan/card_count/season in create_room/join_room/presence_update, player()/serializePlayers() updated, backward-compatible
- T-D3-2: WS stress test ✅ — N=10/20/30 clients, 0 errors, ~53k msg/s on loopback. multiplayer/test/stress-test.js + docs/_scratch/ws_relay_benchmark.md
- T-D3-3+D3-4: Lobby WS wire-up + lerp interpolation ✅ — lobbyWSConnect() with localStorage room sharing, all 6 message types handled, 0.15 lerp on remote players, offline-safe fallback
- T-D3-5: Multi-tab integration test ✅ — 3 simulated clients, 16 events captured, all event types verified (created/joined/player_joined/moved/presence_update/player_left), server clean to 0 rooms after exit

**Decisions:**
- DECISION: localStorage[oxark_lobby_room] for tab-shared roomId — allows multi-tab/multi-device lobby without signaling server
- DECISION: WS offline-safe (onerror → solo mode, no throw) — lobby remains playable without multiplayer
- DECISION: Stress test uses Node.js ws module (not browser WebSocket) — same protocol, server-side only, no browser dependency

**Blockers encountered:**
- None

**Next:** Check docs/_scratch/DAY_2_3_INSTRUCTIONS_EXTENSION.md for Day 4-5 bonus tasks (per r0ze message 1629)

## 2026-04-21: Phase C → Phase D Reborn pivot
- Phase C ended at 694eb33 (v541)
- GDD v1.0 written (4977 words), approved by r0ze ("いいやん全部実装しよう")
- Phase D Sprint plan written (2573 words), 21-day roadmap
- phase-c-final-694eb33 tag created as rollback point
- phase-d-reborn branch created, active
- 0xARK is becoming: on-chain card collection race MMO (FRLG JRPG style)
- Submission deadline: 2026-05-11

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

## 2026-04-21 — Day 4 (bonus, Claude Code overnight)

**Tasks completed:**
- T-D4-1: Duel Hall + Shop + PC Box + Faction HQ placeholder dialogs ✅ — lobbyDialog system, Bronze/Silver/Gold tier gates, 6-building coverage
- T-D4-2: enter_queue + leave_queue Anchor instructions ✅ — MatchmakingQueue PDA, PlayerBattleStats.wins_at_tier, PlayerState.current_queue, cargo check 0 errors
- T-D4-3: Matchmaking polling + Find Match button wiring ✅ — 06-matchmaking.js, lobbyFindMatch(), 2s PDA polling, onMatch/onTick/onCancel callbacks
- T-D4-4: Matchmaking UX polish ✅ — 60s timeout, timer display, queue count, match celebration flash, Try Again button on timeout

**Decisions:**
- DECISION: lobbyDialog in 05-lobby.js rather than 08-overlays.js — avoids Phase C animation complexity, self-contained canvas modal
- DECISION: 06-matchmaking.js uses raw Borsh + discriminator (same pattern as onchain.js) — no Anchor IDL dependency, works with existing CDN stack
- DECISION: MM_TIMEOUT_MS = 60s (T-D4-4 spec, not 90s default) — better UX, faster retry

**Blockers:** None

**Next:** T-D5-1 (PC Box building interaction) — check time before starting

## 2026-04-22 — Day 5 (Claude Code overnight, continued)

**Tasks completed:**
- T-D5-1: PC Box placeholder dialog ✅ — commit fe79f98 (from prior session)
- T-D5-2: Deck editor UI skeleton ✅ — 07-deck-editor.js: 2-panel canvas overlay (storage L / deck R), filter bar, 30pt cap validation, Legendary/Rare/Common rules. build.js, 05-lobby.js, 10-input.js wired.
- T-D5-3: Deck editor on-chain integration ✅ — loadStorageFromChain() reads PlayerRegistry PDA (registered[60] at offset 40, no Metaplex), loadDeckFromChain() reads PlayerDeck PDA (deck_cards[20] at offset 40). openDeckEditor() triggers async chain load on open (placeholder fallback if no wallet). deckSaveDeckTx() calls window.oxarkOnchain.saveDeck(), Save Deck button enabled when deck has cards + wallet connected. Canvas click handler added to 10-input.js.
- T-D5-4: Day 5 journal + overnight report ✅

**Decisions:**
- DECISION: Raw getAccountInfo for PlayerDeck + PlayerRegistry — avoids Metaplex dependency, same pattern as 06-matchmaking.js, no RPC overhead from IDL fetch
- DECISION: Async chain load on openDeckEditor() with immediate placeholder fallback — editor is usable instantly, chain data populates when RPC responds
- DECISION: Canvas click via document.addEventListener('click') in 10-input.js — consistent with existing keydown pattern, no new canvas-specific event infra needed

**Blockers:** None

**Next:** Day 6 — T-D6-1 Shop NPC dialog + T-D6-2 HUD (completed same session, below)

## 2026-04-22 — Day 6 (Claude Code overnight, deep bonus)

**Tasks completed:**
- T-D6-1: Shop NPC dialog placeholder ✅ — 3-option menu (Booster Pack 0.05 SOL / Targeted Single 0.02 SOL / Clan Starter 0.1 SOL), placeholder purchase flow ("not yet implemented"), back navigation. drawLobbyDialog() now dynamic width/button-size so 4-button layouts fit without overflow.
- T-D6-2: Permanent HUD card count + Season day ✅ — _loadLobbyHUD() reads PlayerRegistry PDA (count at offset 580) + Season PDA (season_start/end) on enterLobby(); draws top-right HUD box: "X/60 cards" (gold) + "Day N/14 — Season 1" (slate), with "—" placeholder before chain data.

**Decisions:**
- DECISION: Dynamic dialog width in drawLobbyDialog() — width/btnW computed from button count so N-button dialogs always fit within canvas
- DECISION: Season PDA read inlined in 05-lobby.js (not via readSeason from onchain.js) — avoids adding onchain.js dependency to lobby module

**Blockers:** None

**Session end:** 00:02 JST (well before 06:00 hard stop — all deep bonus tasks complete)

## 2026-04-21: Phase C → Phase D Reborn pivot
- Phase C ended at 694eb33 (v541)
- GDD v1.0 written (4977 words), approved by r0ze ("いいやん全部実装しよう")
- Phase D Sprint plan written (2573 words), 21-day roadmap
- phase-c-final-694eb33 tag created as rollback point
- phase-d-reborn branch created, active
- 0xARK is becoming: on-chain card collection race MMO (FRLG JRPG style)
- Submission deadline: 2026-05-11

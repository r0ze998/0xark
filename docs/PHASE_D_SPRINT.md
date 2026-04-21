# 0xARK Reborn — Phase D Sprint Plan

**Kickoff:** 2026-04-21  
**Submission:** 2026-05-11  
**Duration:** 21 days  
**GDD ref:** `docs/GDD.md` v1.0

> This document translates GDD Section 14 (Roadmap) into daily-executable task packages for Claude Code. Each task has: ID, description, dependencies, DoD (Definition of Done), and estimated hours.

---

## 0. Resolved decisions (r0ze green-lit, 2026-04-21)

1. Full GDD scope approved ("いいやん全部実装しよう")
2. Server strategy: **1 single server instance for MVP** (no sharding)
3. Card pool: **20-card sample first, then iterate; 60-card final set finalized by 5/5**
4. Card art: **AI generation (Midjourney / Flux) → Clip Studio retouch → Figma compose**, r0ze handles manually during week 3
5. Card ability design: Claude Code drafts text, r0ze reviews
6. Mobile: works mobile-responsive (existing), no native PWA push for hackathon submission

---

## 1. Phase C wind-down (Day 1, 2026-04-21, ≤2h)

Before Phase D begins, archive Phase C work cleanly.

- **T-PhC-1**: `git log --oneline | head -50` — confirm last Phase C commit (expected around v541)
- **T-PhC-2**: Create archive branch `phase-c-final` from current main
- **T-PhC-3**: Create new branch `phase-d-reborn` from main
- **T-PhC-4**: Archive `docs/PHASE_C_PLAN.md` → `docs/archive/PHASE_C_PLAN.md`
- **T-PhC-5**: Commit `docs/GDD.md` and `docs/PHASE_D_SPRINT.md` to repo root
- **T-PhC-6**: Update README.md with "Phase D Reborn in progress" banner linking to GDD
- **T-PhC-7**: Post to project journal: "Phase C ended at v541, Phase D Reborn started"

**DoD:** `phase-d-reborn` branch exists with GDD + Sprint docs committed; README reflects pivot.

---

## 2. Week 1 (2026-04-22 → 2026-04-27): Architecture + Lobby MVP

### Day 2 (Tue 4/22) — Dead code removal + Lobby scaffolding

- **T-D2-1** (3h): Remove dungeon-specific code from `oxark/src/lib.rs` — `verify_dungeon_move` renamed to `verify_hand_commitment` stub; delete position-based commit-reveal instructions that don't have other uses; keep `LegendPDA`, `AgentListing`, `PlayerState`, ER delegation intact
- **T-D2-2** (2h): Remove dungeon rendering from frontend: `/docs/js/07-map.js` becomes `07-lobby.js` with empty scaffolding; delete dungeon tile logic; keep camera/input/PixiJS init
- **T-D2-3** (3h): Draft lobby tilemap layout (FRLG-style, 3 buildings: Shop / PC / Duel Hall / Faction HQ in corners, spawn in center); use existing Kenney tiles; hardcoded JSON map file
- **T-D2-4** (2h): Render lobby tilemap on page load; player sprite walks with arrow keys (reuse movement system); no server sync yet

**Branch strategy:** Each Day's work goes into sub-branch `phase-d-reborn/day-N-<slug>`, merged to `phase-d-reborn` with PR-style review at end of day.

**DoD:** User can load site, see lobby town, walk around with arrow keys. Old dungeon code gone.

### Day 3 (Wed 4/23) — Real-time player sync via MagicBlock ER

- **T-D3-1** (4h): Extend `PlayerState` PDA to include `position: (u16, u16)` and `faction: u8`; add instruction `update_position(new_pos)` delegated to ER; rebuild
- **T-D3-2** (3h): Frontend: on every 500ms tick, if player moved, send `update_position` via ER; subscribe to all active `PlayerState` PDAs in lobby; render other players as sprites
- **T-D3-3** (2h): Optimize: batch position updates to avoid ER rate limit; add client-side interpolation for smooth movement
- **T-D3-4** (1h): Test with 2-3 browser tabs simultaneously — confirm cross-visibility

**DoD:** 2+ browser tabs see each other's sprite moving in real time. Latency feels <200ms.

### Day 4 (Thu 4/24) — Duel Hall NPC + Matchmaking queue

- **T-D4-1** (2h): Add Duel Hall building interaction: walk up to NPC, press E/Enter, dialog opens
- **T-D4-2** (3h): Add `MatchmakingQueue` PDA (global, single instance): `waiting_players: Vec<Pubkey>`; instructions `join_queue()`, `leave_queue()`, `match_found() -> creates GameSession`
- **T-D4-3** (3h): Match logic (simple FIFO for MVP): when 2+ players in queue, pair them, create `GameSession` PDA, both clients redirect to duel screen
- **T-D4-4** (2h): UI: "Find Match" button in NPC dialog; 30-second spinner with cancel; "Opponent found!" transition

**DoD:** Two users can both click "Find Match" in separate tabs, get paired, both end up on duel screen (placeholder UI fine).

### Day 5 (Fri 4/25) — PC Box deck editor UI

- **T-D5-1** (3h): Add PC Box building interaction; dialog opens with placeholder
- **T-D5-2** (4h): Deck editor UI: left pane shows all owned NFT cards (query via Metaplex), right pane shows current deck (20 slots); drag-and-drop or click-to-add/remove
- **T-D5-3** (2h): Deck validation: exactly 20 cards, max 2 copies of any card, must have Faction assigned
- **T-D5-4** (1h): Persist deck selection: add `current_deck: [u64; 20]` to `PlayerState`; `save_deck()` instruction; load on session start

**DoD:** Player can enter PC Box, see their NFT cards (need at least 20 dummy cards minted for testing), build and save a deck.

### Day 6-7 (Sat-Sun 4/26-27) — Shop + Faction + Emote + Polish

**Day 6:**
- **T-D6-1** (3h): Shop NPC interaction + dialog flow; tutorial script for first-time visitors
- **T-D6-2** (3h): Shop purchase flow: booster pack (calls `oxark-cards::mint_card_nft`), targeted single (admin-controlled inventory), faction starter; pay in SOL via System Program transfer
- **T-D6-3** (2h): Display current card count X/60 in HUD (top-right corner)

**Day 7:**
- **T-D7-1** (3h): Faction selection: on first login, walk to Guildhall, 5 Faction selection UI, persist to `PlayerState.faction`
- **T-D7-2** (2h): Faction HQ building interaction, dialog shows same-Faction member list (placeholder)
- **T-D7-3** (2h): Emote radial menu (6 emotes, 3-second bubble above player head)
- **T-D7-4** (2h): Week-1 review; commit checkpoint; tag `v-phd-week1`

**DoD (Week 1):** User can: log in, walk around town, see other players, visit Shop + buy cards, visit PC Box + build deck, choose Faction, visit Faction HQ, emote, enter Duel Hall + queue for match. No actual duel mechanic yet.

---

## 3. Week 2 (2026-04-28 → 2026-05-04): Duel Core + ZK

### Day 8 (Mon 4/28) — 3-lane duel board UI (no ZK yet)

- **T-D8-1** (3h): Duel scene layout: 3 lanes in middle (each is a drop zone), hand at bottom, opponent cards at top (face-down)
- **T-D8-2** (3h): Drag card from hand to lane; visual placeholder for opponent playing (face-down card appears)
- **T-D8-3** (2h): Energy tracker UI (round number = energy available); cost validation (can't play if cost > energy)
- **T-D8-4** (2h): "Lock in round" button for both players; placeholder reveal animation

**DoD:** 2 tabs can connect to a duel, drag cards to lanes, lock in rounds (no game logic yet, just UI flow).

### Day 9 (Tue 4/29) — Hand commitment ZK circuit

- **T-D9-1** (4h): Design `hand_commitment.circom`: inputs = `card_ids[20]` (hand), `played_indices[k]` (which to play, 1-3 cards), `salt`; outputs = `new_commitment = Poseidon(remaining_cards, new_salt)`, `played_cards_revealed`
- **T-D9-2** (3h): Compile circuit (circom 2.1.6), run pot12 setup (reuse existing trusted setup file), generate verification key
- **T-D9-3** (3h): Adapt existing `verify_dungeon_move` instruction → `verify_hand_commitment`: update VK bytes, adjust input count

**DoD:** Circuit compiles, VK embedded in program, on-chain verify instruction accepts a valid proof (tested with manual input).

### Day 10 (Wed 4/30) — ZK proof integration into duel flow

- **T-D10-1** (4h): Frontend: when player locks in round, browser generates proof via snarkjs; proof + new commitment submitted in transaction
- **T-D10-2** (3h): On-chain `resolve_round` instruction: verify both players' proofs; if valid, reveal played cards; update `GameSession`
- **T-D10-3** (3h): Error handling: invalid proof → round forfeit; timeout (60s per round) → auto-forfeit

**DoD:** Full round with ZK hand commitment works end-to-end: play, commit, verify, reveal.

### Day 11 (Thu 5/1) — Lane scoring, game end, card transfer

- **T-D11-1** (3h): Lane scoring logic: sum of power per lane, winner of each lane, first to 2 lanes wins; card abilities apply (start simple — just +power modifiers)
- **T-D11-2** (3h): Game end flow: show winner, transition back to lobby after 10 seconds
- **T-D11-3** (3h): Card reward: on win, transfer 2 random non-owned cards from loser; use `oxark-cards::transfer_card` (may need new instruction)
- **T-D11-4** (1h): Ante handling: 0.01 SOL escrowed at match start, 0.018 SOL to winner at end

**DoD:** Complete duel: match → play 5 rounds → win → cards transferred → back to lobby with updated X/60 count.

### Day 12 (Fri 5/2) — Identity commitment ZK + Ninja mechanics

- **T-D12-1** (4h): `identity_commitment.circom` (smaller circuit): inputs = `faction`, `build_hash`, `salt`; output = `Poseidon(...)`; add to Season-start flow
- **T-D12-2** (3h): `PlayerIdentity` PDA per player per Season; `commit_identity()` instruction called on first duel of Season
- **T-D12-3** (3h): Ninja Faction special: 2-3 ability cards that leverage identity commitment (cloak, false flag); implement in card rule text

**DoD:** Ninja players can deploy cards that interact with identity layer. Identity peek via x402 returns a Poseidon preimage disclosure.

### Day 13-14 (Sat-Sun 5/3-4) — x402 integration + polish

**Day 13:**
- **T-D13-1** (3h): Scout peek integration into duel UI: button in duel, 0.005 SOL payment via facilitator, reveals 1 card
- **T-D13-2** (3h): Identity peek: 0.02 SOL, reveals opponent's Season identity
- **T-D13-3** (2h): Hint buy: 0.002 SOL, reveals total energy cost of opponent's current round
- **T-D13-4** (1h): Facilitator deployed to Railway; production URL embedded in frontend

**Day 14:**
- **T-D14-1** (4h): Card P2P listing: player creates listing, another buys (oxark-cards already has `list_card`, need frontend + facilitator integration)
- **T-D14-2** (4h): Bug bash + balance pass on rewards
- **T-D14-3** (2h): Week-2 review; tag `v-phd-week2`

**DoD (Week 2):** Full duel with ZK + x402 + card transfer + ante working end-to-end. Both ZK commitments (hand + identity) live. Ninja flavor cards exist.

---

## 4. Week 3 (2026-05-05 → 2026-05-11): Season + AI Agent + Content + Submission

### Day 15 (Mon 5/5) — Season engine

- **T-D15-1** (3h): `Season` PDA: `start_ts`, `end_ts`, `prize_pool`, `is_active`; instructions `start_season()`, `end_season()`, `claim_prize()`
- **T-D15-2** (3h): Automatic Season end detection: either 60/60 achieved (per-player check on `mint_card_nft`) or 14-day timer
- **T-D15-3** (2h): Prize Pool calculation + distribution logic (40/20/10/20/10 split per GDD Section 8)
- **T-D15-4** (2h): Season status HUD: "Day X of 14" + "Leading: 58/60 (player XYZ)"

**DoD:** Season 1 is live on devnet, timer running, leader tracking works.

### Day 16 (Tue 5/6) — AI Agent Tier-1

- **T-D16-1** (4h): `tools/ai-agent/` Node.js script: connects to a configured wallet, polls lobby, enters queues, plays duels via LLM strategy (Anthropic API)
- **T-D16-2** (3h): Agent plays rules-based move (cost-respecting card selection, lane diversification); hook for LLM upgrade via env variable
- **T-D16-3** (2h): Test: run 1 agent in background, r0ze plays against it in live demo
- **T-D16-4** (1h): Record gameplay clip for pitch video

**DoD:** AI agent plays a full duel against r0ze from start to finish, no human intervention.

### Day 17 (Wed 5/7) — Card artwork finalization

- **T-D17-1** (6h, r0ze-led): Midjourney / Flux generate 60 card portraits in FRLG pixel style; batch prompt with Faction themes; Clip Studio Paint retouch for consistency
- **T-D17-2** (3h): Figma template for card composition (portrait + name + ability text + rarity badge); export 60 PNGs
- **T-D17-3** (2h): Upload to Arweave; update Metaplex metadata URIs for 60 cards; mint initial Season 1 supply

**DoD:** All 60 Season 1 cards have final artwork and on-chain metadata.

### Day 18 (Thu 5/8) — Balance + bug fix + beta testing

- **T-D18-1** (4h): Play 20+ test duels (r0ze vs agent, r0ze vs r0ze via tabs); log issues
- **T-D18-2** (3h): Balance pass: adjust 5-10 card powers/costs; adjust Shop prices; adjust ante amount if needed
- **T-D18-3** (2h): Recruit 3-5 beta testers (Solana Japan community); get feedback
- **T-D18-4** (1h): Hotfix critical bugs

**DoD:** Reports from 3+ beta testers say "this is fun, I'd play again."

### Day 19 (Fri 5/9) — Pitch video production

- **T-D19-1** (3h): Script (3-4 minute pitch; cover problem, solution, tech stack, demo, team)
- **T-D19-2** (5h): Record 15-20 clips: lobby walkthrough, duel from both sides, ZK scout peek, AI agent match, season leaderboard
- **T-D19-3** (2h): Rough edit; voiceover draft in Japanese + English subtitle

**DoD:** Rough cut of pitch video exists, storyboard complete, all B-roll shot.

### Day 20 (Sat 5/10) — Polish everything for submission

- **T-D20-1** (4h): Final edit of pitch video (music, transitions, captions); upload to YouTube
- **T-D20-2** (3h): README rewrite for submission: problem statement, architecture diagram, tech stack, install instructions, demo links, team; extend existing v480 README
- **T-D20-3** (2h): Technical deep-dive video (5-8 min) for judges who want detail; focus on ZK + x402 + ER
- **T-D20-4** (2h): Twitter thread draft + Farcaster post draft

**DoD:** All submission materials ready: video, README, code on main branch, live demo URL works.

### Day 21 (Sun 5/11) — Submit + launch

- **T-D21-1** (2h): Final sanity check: visit https://r0ze998.github.io/0xark/ from clean browser, run through full user journey; fix any last issue
- **T-D21-2** (2h): Submit to Colosseum Frontier Hackathon with all required materials
- **T-D21-3** (2h): Launch Twitter thread + Farcaster post + post in Solana Japan Discord + MagicBlock Discord
- **T-D21-4** (rest of day): Monitor; respond to community questions; celebrate

**DoD:** Submission live on Colosseum platform; launch posts published; 0xARK Reborn is shipped.

---

## 5. Risk register + mitigations

| Risk | Prob | Impact | Mitigation |
|------|------|--------|------------|
| ZK circuit doesn't compile or verify fails | Medium | High | Day 9-10 are fully allocated; fall back to "commit-reveal without ZK for MVP" if catastrophe |
| Card art takes 40h instead of 20h | Medium | Medium | Start AI generation in Week 1 background (parallel); simplified portraits if needed |
| MagicBlock ER has rate limit issues with 20+ concurrent players | Medium | Medium | Throttle position updates to 500ms; test early on Day 3; if needed, shard to single Faction |
| Matchmaking has edge cases (disconnect, double-match) | High | Low | Test with fuzz scenarios Day 4; tolerate some edge cases for MVP |
| r0ze burns out mid-sprint | Medium | High | Claude Code takes night shifts; r0ze forced rest days if 4+ consecutive 10h+ days; check-in via Telegram |
| Critical bug surfaces Day 20-21 | Medium | High | Freeze features Day 18; Day 19-21 are polish-only; keep v-phd-week2 tag as rollback point |
| x402 facilitator production deploy fails | Low | Medium | Deploy early Day 13, not Day 20; test with devnet first then flip to mainnet-beta config |

---

## 6. Daily cadence

- **9:00 JST**: r0ze reviews overnight Claude Code work
- **9:30-12:00**: r0ze focuses on design / art / community
- **12:00-13:00**: Lunch break (strict)
- **13:00-18:00**: r0ze implementation sessions + Claude Code handoffs
- **18:00-20:00**: Dinner break (strict, no screens)
- **20:00-22:00**: r0ze wraps his day, queues up Claude Code tasks for overnight
- **22:00-06:00**: Claude Code runs autonomously (Mac mini, Telegram-monitored); async testing
- **06:00-09:00**: r0ze sleeps (minimum 6h)

Rest days: **one full rest day per week** (no screens after 14:00). Sunday recommended. Skipped only if absolutely needed.

---

## 7. Definition of "Submission Ready" (2026-05-11 end-of-day)

Must have:

- ✅ Live demo accessible at GitHub Pages URL, works on desktop Chrome
- ✅ Full loop playable: sign-in → walk lobby → buy cards → build deck → duel (with ZK + x402) → win/lose → Season leaderboard updates
- ✅ At least 3 human testers played the game
- ✅ AI agent plays a duel end-to-end (recorded)
- ✅ README on main branch with submission description
- ✅ Pitch video 3-4 min uploaded to YouTube
- ✅ Technical demo video 5-8 min uploaded to YouTube
- ✅ All programs deployed on devnet (oxark, oxark-cards)
- ✅ x402 facilitator on production URL (Railway/Fly.io)
- ✅ Submitted to Colosseum platform

Nice to have:

- 🟡 Mainnet deployment (stretch)
- 🟡 5+ beta testers (stretch)
- 🟡 Twitter thread with 100+ engagement
- 🟡 Constellation grants contact made

---

## 8. Post-submission (post-5/11)

- Week 1 (5/12-18): rest, respond to judges, collect community feedback
- Week 2 (5/19-25): address top 3 community issues, publish Season 1 mainnet-beta launch date
- Week 3 (5/26-6/1): mainnet deploy, Season 1 official launch
- Month 2 (June): Season 2, sponsor contacts, ConsensusOS cross-integration discussions

---

*End of Phase D Sprint Plan v1.0*

*Ready for Claude Code execution. Expected first task: T-PhC-1 (git log check) today 2026-04-21.*

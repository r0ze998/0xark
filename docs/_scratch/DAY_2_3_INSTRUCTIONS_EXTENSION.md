# 0xARK Phase D — Day 2+3 Instructions EXTENSION (Day 4-5 bonus tasks)

**Purpose:** Extend overnight session if Day 2+3 completes ahead of schedule.  
**Read only AFTER completing T-D3-6 (Day 3 wrap).**  
**Hard stop time:** 2026-04-22 06:00 JST regardless of progress.

---

## 0. When to read this document

- ✅ Completed T-D3-6 (Day 3 wrap commit + journal + overnight report)
- ✅ Current time is earlier than 2026-04-22 05:00 JST (need ≥ 1 hour before hard stop)
- ✅ No active HALT condition

If ANY of above fails: **STOP HERE**. Do not start Day 4 tasks. Proceed to "Section 99: Hard stop" at bottom.

---

## 1. Pre-flight for Day 4

Before starting Day 4 tasks, send Telegram:

```
🟡 [HH:MM] Day 2+3 COMPLETE ahead of schedule
Proceeding to Day 4 bonus tasks per EXTENSION instructions
Expected next hard stop: 06:00 JST
```

---

## 2. Pre-approved decisions (no HALT required)

The following decisions are **pre-approved by r0ze**, no Telegram halt required:

1. **New PDA `MatchmakingQueue`** (global singleton, per-Hall variant or 3 instances) — OK to add
2. **New instruction `enter_queue`** — OK to add
3. **New instruction `leave_queue`** — OK to add
4. **New field in `PlayerState`: `current_queue: Option<Pubkey>`** — OK to add
5. **Extend `PlayerBattleStats` with `wins_at_tier: [u8; 3]`** (Bronze/Silver/Gold win counts) — OK to add

However, still HALT if:
- Any existing PDA layout would change (breaking layout change)
- Any instruction signature would change (breaking API change)
- Build/tests fail > 20 min debug

---

## PART 7 — Day 4 tasks (bonus, if time permits)

### T-D4-1: Duel Hall building interaction (1h)

**Goal:** Player walks up to Bronze/Silver/Gold Hall, presses Enter, sees a placeholder "Find Match" dialog.

**Steps:**

1. In LobbyScene (`solana/client/src/05-lobby.js`), extend the building proximity interaction (already logs `[Lobby] Interact: bronze_hall` etc.)
2. For each of bronze_hall / silver_hall / gold_hall, open an overlay dialog via existing `solana/client/src/08-overlays.js`:
   - Title: "🥉 Bronze Hall" / "🥈 Silver Hall" / "🥇 Gold Hall"
   - Body: "Ante: 0.005 SOL (Bronze) / 0.01 SOL (Silver) / 0.05 SOL (Gold)" — use correct value
   - Body continued: "Current queue: [N] players" (placeholder, actual count later)
   - Button: "Find Match" (disabled placeholder for now)
   - Button: "Close"
3. For Silver/Gold specifically, check if player has unlocked access:
   - Silver: needs `PlayerBattleStats.wins_at_tier[0] >= 5` (Bronze wins)
   - Gold: needs `wins_at_tier[1] >= 3` (Silver wins this Season)
   - If not unlocked, show "🔒 LOCKED — requires X Bronze wins (currently: Y)" instead of Find Match button
4. Shop + PC Box + Faction HQ interactions: add similar placeholder overlays, button "Close" only, body "Coming Day 4-6"

5. Commit: `T-D4-1: Duel Hall + Shop + PC Box placeholder dialogs in Lobby`

**Self-verify gate:** Manual test — click each of 6 buildings, each opens a dialog, close returns to walking.

---

### T-D4-2: Anchor — enter_queue + leave_queue instructions (4h)

**Goal:** Add two new Anchor instructions for matchmaking queue management. Build-check only, no deploy overnight.

**Steps:**

1. Design `MatchmakingQueue` PDA in `solana/oxark/programs/oxark/src/state.rs`:
   ```rust
   #[account]
   pub struct MatchmakingQueue {
       pub tier: u8,              // 0=Bronze, 1=Silver, 2=Gold
       pub season: u16,           // current Season
       pub players: Vec<Pubkey>,  // FIFO queue, max 64
       pub created_at: i64,
       pub bump: u8,
   }
   ```
   PDA seed: `[b"queue", tier.to_le_bytes().as_ref(), season.to_le_bytes().as_ref()]`

2. Create `solana/oxark/programs/oxark/src/instructions/enter_queue.rs`:
   - Inputs: `tier: u8` (0/1/2)
   - Signer: player
   - Checks:
     - Tier gate: verify `PlayerBattleStats.wins_at_tier` for Silver/Gold eligibility
     - Player not already in any queue (`PlayerState.current_queue` is None)
   - Effect: appends player pubkey to `MatchmakingQueue.players`, sets `PlayerState.current_queue = Some(queue_pda)`
   - If queue length reaches 2 after push, emit `QueueMatchReady` event with both pubkeys

3. Create `solana/oxark/programs/oxark/src/instructions/leave_queue.rs`:
   - Inputs: `tier: u8`
   - Signer: player (must be in queue)
   - Effect: removes player pubkey from queue, clears `PlayerState.current_queue`

4. Add `PlayerState.current_queue: Option<Pubkey>` field in `state.rs`
   - ⚠️ This is a layout change to an existing PDA — but r0ze pre-approved it
   - Use `#[serde(default)]` + Option for backward-compat migration. If old `PlayerState` accounts exist in devnet, they'll need migration — document in commit message but don't migrate overnight.

5. Wire into `lib.rs` — add `pub fn enter_queue(...)` / `pub fn leave_queue(...)` entry points

6. Run `anchor build` — must pass

7. Commit: `T-D4-2: enter_queue + leave_queue instructions + MatchmakingQueue PDA`

**Self-verify gate:** `anchor build` exits 0. `cd solana/oxark/ && anchor test --skip-deploy` runs and passes existing tests (new instructions not yet tested, that's OK).

**⚠️ Safety gate:** If `PlayerState` layout change causes test failures on existing instructions, HALT + Telegram report. Don't try to fix mid-night.

---

### T-D4-3: Matchmaking polling logic (2h)

**Goal:** When a player enters queue, the client polls (or subscribes to) the queue PDA. When both slots fill, both clients navigate to a placeholder duel scene.

**Steps:**

1. In `solana/client/src/` create `06-matchmaking.js`:
   - Function `enterQueue(tier)`: calls `enter_queue` instruction via existing Anchor client, then starts polling
   - Function `pollQueue(tier)`: every 2s, fetches the `MatchmakingQueue` PDA, checks:
     - If this player is still in the queue → continue polling
     - If queue length == 2 and this player is first or second → match found, stop polling
     - If this player was removed (e.g., matched) → fetch `Game` PDA if exists, navigate to duel scene
   - Function `leaveQueue(tier)`: calls `leave_queue` instruction, stops polling

2. In Duel Hall overlay (from T-D4-1), wire up the "Find Match" button:
   - On click → `enterQueue(tier)` with correct tier 0/1/2
   - Button changes to "Waiting... (N players in queue)" spinner
   - On match found → placeholder alert "Match found! Duel scene not yet implemented" + navigate back to Lobby

3. Add "Cancel" button during waiting → `leaveQueue(tier)`, return to dialog

4. Commit: `T-D4-3: Matchmaking polling + Find Match button wiring`

**Self-verify gate:** Manual test — 2 tabs, both click Find Match in Bronze → both see "match found" alert within 5 seconds.

---

### T-D4-4: Matchmaking UX polish (1h)

**Goal:** Show live queue count, timer, better visual feedback.

**Steps:**

1. While in queue: display elapsed time "00:15", queue length "2/2 — matching..."
2. On match: brief celebratory animation (1s sparkle effect via existing particle system from Phase C, `solana/client/src/08-overlays.js` victory particles)
3. On cancel: button returns to Find Match smoothly
4. On timeout (> 60s in queue alone): dialog "No opponents found. Try Bronze Hall?" with buttons

5. Commit: `T-D4-4: Matchmaking UX polish — timer, queue count, match celebration`

---

### T-D4-5: Day 4 wrap (20 min)

1. Update journal
2. Update overnight report with Day 4 section
3. Send Telegram: "✅ Day 4 complete, proceeding to Day 5 if time permits"

---

## PART 8 — Day 5 tasks (bonus, if time permits)

**Pre-check before starting:** Must be before 05:00 JST. Otherwise proceed to Section 99.

### T-D5-1: PC Box building interaction (1h)

Similar to T-D4-1 but for PC Box building. Overlay dialog with placeholder "Open Deck Editor" button (disabled for now), "Close" button, body text "Storage: [N] cards | Deck: [K]/20".

Commit: `T-D5-1: PC Box placeholder dialog`

---

### T-D5-2: Deck editor skeleton (3h)

**Goal:** Frontend-only MVP of deck editor. No save/load yet, just UI.

**Steps:**

1. Create `solana/client/src/07-deck-editor.js`:
   - Scene/overlay layout: 2-panel split
   - Left panel: "Storage" — scrollable list of player's NFT cards (use placeholder card data for now — array of 30 fake cards)
   - Right panel: "Deck" — 20 empty slots, each showing card thumbnail when filled
   - Bottom: "Save Deck" button (disabled for now), "Close" button
   - Top: "Filter by Clan" dropdown (5 options + All)

2. Drag-and-drop or click-to-toggle (pick simplest — click to add to first empty deck slot, click in deck to remove)

3. Deck validation visual: slot turns red if > 2 copies of same card, deck count shows "18/20" etc.

4. Uses `design/DESIGN_TOKENS.json` palette for colors

5. Commit: `T-D5-2: Deck editor UI skeleton (frontend only, no save)`

**Self-verify gate:** Manual test — open editor, click cards to add to deck, remove from deck, filter works.

---

### T-D5-3: Deck editor — real NFT integration (2h)

**Goal:** Wire editor to actual player's NFT cards instead of placeholders.

**Steps:**

1. In `solana/client/src/04-state.js` (or similar state module), add function `getPlayerCards(wallet)`:
   - Queries Metaplex for all NFTs owned by wallet from the 0xark-cards program
   - Returns array of `{ mint, name, clan, element, bp, hp, tp, rarity }`
   - Use existing Anchor/Metaplex client patterns from Phase C

2. In deck editor, replace placeholder cards with real ones from `getPlayerCards()`

3. Add `saveDeck(deckCardMints)` that calls existing `save_deck` instruction with the 20 mints

4. Add `lockDeck()` that calls existing `lock_deck` instruction

5. Add `loadDeck()` on editor open: reads existing `PlayerDeck` PDA and pre-fills the deck panel

6. Wire "Save Deck" button

7. Commit: `T-D5-3: Deck editor — real NFT integration + save/load via save_deck/lock_deck`

**Self-verify gate:** Save a deck, close editor, reopen, deck preserved.

**⚠️ Safety gate:** If Metaplex/NFT fetching requires significant refactor or environment setup (e.g., missing RPC creds), HALT at 1h + Telegram. Don't try to fix overnight.

---

### T-D5-4: Day 5 wrap (20 min)

Same format as T-D4-5.

---

## PART 9 — Day 6+ tasks (deep bonus, unlikely to reach)

If you reach here, you are a legend. Proceed only if before 04:00 JST.

### T-D6-1: Shop NPC dialog + placeholder purchase (2h)

Similar structure to Duel Hall interaction. Placeholder 3-option menu (Booster / Targeted Single / Clan Starter), all buttons currently show "Not implemented" alert. Groundwork only.

Commit: `T-D6-1: Shop NPC dialog placeholder`

---

### T-D6-2: HUD — card count X/60 + Season Day N/14 (1h)

Permanent overlay in all Lobby scenes:
- Top-right: `X/60 cards`
- Below: `Day N/14 — Season 1`

Read from `PlayerDeck` PDA for count, `Season` PDA for day.

Commit: `T-D6-2: Permanent HUD card count + Season day`

---

## Section 99: Hard stop

At any point, if the current time reaches **2026-04-22 06:00 JST** OR if you've been instructed to stop:

1. **Finish current commit** (if any uncommitted work, commit with message `WIP: [task] — partial, stopped at hard limit`)
2. Push everything to `phase-d-reborn`
3. Update `docs/_scratch/journal.md` with stop time and reason
4. Update `docs/_scratch/overnight_report_2026-04-22.md` with final status
5. Send Telegram:

```
🎯 [06:00] HARD STOP REACHED
Total duration: ~6.5 hours
Last task: [T-D?-?]
Completion rate: [Day 2: ?/5 tasks, Day 3: ?/6 tasks, bonus: ?]
Commits: [count]
Report: docs/_scratch/overnight_report_2026-04-22.md
Status: [complete | partial]
Ready for r0ze review.
```

6. **STOP executing tasks.** Wait for r0ze morning instructions.

---

## Priority order summary

```
MUST:      T-D2-0, T-D2-1, T-D2-2, T-D2-3, T-D2-4, T-D2-5
MUST:      T-D3-1, T-D3-2, T-D3-3, T-D3-4, T-D3-5, T-D3-6
BONUS 1:   T-D4-1, T-D4-2, T-D4-3, T-D4-4, T-D4-5
BONUS 2:   T-D5-1, T-D5-2, T-D5-3, T-D5-4
DEEP:      T-D6-1, T-D6-2
```

Hard stop at 06:00 JST regardless of position in list.

---

*End of Day 2+3 Instructions EXTENSION v1.0*  
*Document version: 2026-04-21 23:25 JST*  
*Intended audience: Claude Code (Mac mini) after completing Day 2+3 core tasks*

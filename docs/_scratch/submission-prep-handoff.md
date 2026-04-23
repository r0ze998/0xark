# Handoff: Submission Prep — v-phd-submission-prep

**Date:** 2026-04-24
**Tag:** `v-phd-submission-prep`
**Commit:** `docs: submission prep — pitch / beta / colosseum / x / lore / ci`

---

## Deliverables (6 of 6 complete)

| Task | File | Status | Notes |
|------|------|--------|-------|
| E7 Pitch script | `docs/pitch-video-script.md` | ✓ | EN + JP 3-min + 30-sec cut |
| E10 Beta form | `docs/beta-feedback-form.md` | ✓ | 27Q JP + EN (covers all brief sections) |
| E12 Colosseum draft | `docs/colosseum-submission-draft.md` | ✓ | All fields + 3 short desc variants |
| E13 X posts | `docs/x-posts-thread.md` | ✓ | 7 posts, all ≤280 chars, image placeholders |
| B4 Lore Shards | `docs/LORE_SHARDS.md` | ✓ | 5 clan face cards × 3 shards appended |
| F3 GitHub CI | `.github/workflows/ci.yml` | ✓ | ai-agent job added, bundle threshold → 30k |

---

## E7 — Pitch Script Details

- Full 3-minute English version: HOOK → PROBLEM → 3 PILLARS → DEMO → WHY SOLANA → CLOSE
- Full 3-minute Japanese version: parallel structure, same beats
- 30-second cut at end of file (for Twitter/SNS)
- [image/video] placeholders throughout for video editor
- Autonomous Agent Sandbox as primary narrative frame (not ZK-first)
- Manus+Gemini responses woven in: Lease-default, +1 BP cap, Competitive Gold Mode, Solo narrative
- Director's notes section: recording setup, music suggestion, narration order
- Key phrases table (EN ↔ JP) for caption/subtitle use

**r0ze next action for E8:** Use `docs/pitch-video-script.md` as teleprompter. Record JP first (native), EN dubbed separately. OBS 1280×720 @ 60fps.

---

## E10 — Beta Form Details

- 27 questions (exceeds 24-question spec — added Q25-27 as player attribute section)
- JP version primary, EN version parallel (identical questions)
- Covers all v3.0-plus mechanics: Burn, Evolve, Steal-Lease, Imprint, Competitive Gold Mode
- Sections: Pre-game / Duel experience / v3.0-plus mechanics / AI Agent / Technical / Overall / Player profile
- Format ready for Google Form import (each ## section = new Form section)

**r0ze next action for E11:** Copy JP questions into Google Form, share link with beta testers. EN form can be separate form or combined with language toggle.

---

## E12 — Colosseum Draft Details

- Short description: 3 variants (Agent-first / Mechanics-first / Market-angle), all ≤280 chars
- Long description: 5 paragraphs (What it is / 4 NFT mechanics / AI thesis / Why Solana / Current state)
- All form fields covered: Tracks, Technical Innovation (8 bullets), Demo Video placeholder, Repo, Team, Sponsors, Tests, Roadmap, Unique Differentiation
- Unique Differentiation section explicitly shows Manus+Gemini critique → response table
- Demo Video field: placeholder only — fill after E8-E9 recording

**r0ze next action for submission day:** Open Colosseum form, copy-paste from this draft. Adjust Demo Video link only. Minor tone tweaks optional.

---

## E13 — X Posts Details

- 7-post thread: Hook → ZK → x402 → 4 mechanics → Supply floor → AI agent → CTA
- All ≤280 chars (verified in draft)
- [image/video] placeholder on each post specifying what asset to create
- Post 6 (AI agent) can use video clip — highest impact visual
- Hashtags and @ mentions on Post 7 only to avoid spam-flag risk on earlier posts

**r0ze next action:** Create/collect images for Posts 4 and 6 (highest priority). Schedule thread 2-3 days before submission deadline.

---

## B4 — Lore Shards Details

Added section "## v3.0-plus Cards — Season 1 Clan Face Cards" to `docs/LORE_SHARDS.md` with all 3 shards for 5 new cards:

| Card | Clan | Ability | Shards written |
|------|------|---------|----------------|
| #1 Powder-Charge Boarder | Black Flag | Self-Burn | 1+2+3 ✓ |
| #13 Oath-Branded Squire | Hollow Blade | Veteran Imprint | 1+2+3 ✓ |
| #23 Ancestral Ranger | Iron Circle | Imprint self-scale | 1+2+3 ✓ |
| #27 Soul-Binder | Nameless Silk | On-Destroy Imprint | 1+2+3 ✓ |
| #35 Mint Master | Sovereign Bourse | Clan Evolve + Imprint | 1+2+3 ✓ |

**Note:** The 6 Rares and 4 Legendaries listed in the brief (Ghost Fleet, King's Last Guard, Faceless Weaver, Prince in Exile, Assassin's Letter, Kingdom's Forgotten Oath, Sceptre, Nameless Blade, Elyon Crown, Kingmaker's Ring) **already had all 3 shards in LORE_SHARDS.md v0.1**. No changes needed for those 10 cards.

**Remaining deferred shards:** 45 cards still at Shard 1 only — noted in Appendix as Season 2 content.

---

## F3 — CI Details

Updated `.github/workflows/ci.yml` (existing file, not replaced):

**Changes made:**
1. Bundle size sanity check: `10000` → `30000` lines (catches missing v3.0-plus modules)
2. Added `ai-agent-test` job:
   - Runs on ubuntu-latest + Node 20
   - `npm ci` in `tools/ai-agent/`
   - Runs 5 unit test files: `test_basic_decisions.js`, `test_burn_decisions.js`, `test_evolve_decisions.js`, `test_imprint_strategy.js`, `test_steal_decisions.js`
   - Requires `ANTHROPIC_API_KEY` secret in repo settings

**Existing jobs kept intact:**
- `node-tests` (card engine + battle mechanics)
- `anchor-tests` (litesvm, Cargo cache)
- `react-build` (TypeScript + React wallet UI)
- `game-build` (concatenation build → index.html)

**r0ze next action:** Add `ANTHROPIC_API_KEY` to GitHub repo secrets (Settings → Secrets → Actions). The e2e test (`t44-agent-e2e.js`) is NOT in CI — it needs a live WebSocket server. The 5 unit tests run without server.

---

## r0ze Next Actions (Priority Order)

1. **main merge + push** — merge `v3.0-plus-ui-fix` and `submission-prep` commits
2. **Live URL smoke test** — verify UI bug fixes are live after merge
3. **E8 Pitch video recording** — use `docs/pitch-video-script.md`
4. **E9 Demo clip** — capture Burn/Evolve/Steal/AI agent for Post 6 and Colosseum video
5. **E11 Beta tester招集** — distribute `docs/beta-feedback-form.md` (Google Form setup)
6. **Add ANTHROPIC_API_KEY** to GitHub repo secrets (for CI ai-agent-test job)
7. **E12 submission** — copy from `docs/colosseum-submission-draft.md` when form opens
8. **E13 X posts** — collect images for Posts 4 and 6, schedule thread pre-submission

---

*End of submission-prep-handoff.md*
*6 tasks, single commit. Deadline: Colosseum Frontier 2026-05-11.*

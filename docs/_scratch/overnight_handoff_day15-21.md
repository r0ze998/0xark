# 0xARK Overnight Handoff — Days 15-21 Complete

**Date:** 2026-04-22  
**Branch:** phase-d-reborn  
**Latest commit:** v457  
**All tags pushed:** v-phd-day15 → v-phd-day21

---

## What was done

### Day 15 (v453)
- **Legendary system on-chain** (T-D15-A/B):
  - `LegendarySupply` PDA: 4 species (Sceptre/Blade/Crown/Ring), cap 10/season
  - `PlayerDuelStats` PDA: tracks Gold Hall wins + Legendary claims per season
  - 4 new Anchor instructions: `init_legendary_supply`, `record_gold_hall_win`, `claim_legendary`, `distribute_prize_pool`
  - NFT mint stubbed — claim is recorded on-chain, actual Metaplex CPI deferred to when art URIs are ready
- **AI duel agent** (T-D15-C): `tools/ai-agent/duel-agent.js`
  - Polls queue every 5s, joins after 30s human wait
  - LLM Summon decisions via claude-haiku-4-5 with full game state prompt
  - Rule-based fallback on API error
  - Tutorial mode (AGENT_DIFFICULTY=tutorial): plays at 70% human win rate
- **Legendary transfer on Gold Hall loss** (T-D15-E):
  - `selectTransferCards()` now returns bonus `legendary` field when Gold Hall
  - Victory scene: gold aura pulsing "LEGENDARY CLAIMED: [name] #[mint]" banner
  - Tap banner → Card Detail scene
  - `triggerVictoryScene` accepts `legendaryTransferred: { card_id, name, mint, mintNumber }`
- **05-lobby.js**: Faction HQ → Legendary Chamber button (shows if `window.lobbyPendingLegendaryClaims > 0`), PC Box → View Cards → card_storage

### Day 16 (v454)
- **Portrait pipeline** (T-D16):
  - `tools/arweave-upload/batch-upload.js`: Irys batch uploader for 64×64 PNG card portraits, resumes from portrait-uris.json
  - `tools/arweave-upload/gen-metadata.js`: Metaplex-standard metadata JSON for all 60 cards (includes `--upload` flag for Arweave)
  - `card-portraits.json`: placeholder at repo root (GitHub Pages CDN)
  - `getPortraitImg(cardId)` in `02-data.js`: fetches URIs non-blocking, caches in localStorage
  - `drawCardFrame` tries portrait first, falls back to pixel sprite
- **How to activate portraits**: Upload PNGs → get portrait-uris.json → update card-portraits.json at repo root

### Day 17 (v455)
- **Balance pass**:
  - Attack BP R1: 3→4, R2: 5→6 (early aggression viable)
  - Defense HP: +1 across all rarities (tanks survive longer)
  - Flee INI: +1 across all rarities (flee reliably goes first)
  - Recovery HP: +1 (healers survive to use effects)
  - Energy cost R4: 4→3 (reduces summon lockout)
  - Energy floor: round 1 now grants 2 per element (was 1, making R2+ cards impossible to summon)
- **Beta feedback button**: lobby bottom-left "[BETA FEEDBACK]" → opens Google Form
  - Replace placeholder URL in `solana/client/src/10-input.js` (search `forms.gle/0xARKBetaFeedback`)

### Days 18-20 (v456)
- `docs/arena-submission.md`: Full Reborn rewrite — halls, AI agent, Legendary economy, submission checklist
- `docs/x-post-draft.md`: 7 posts updated + visual content briefs (all Reborn-specific)
- `docs/pitch-video-script.md`: 3-minute Reborn script with timing marks and recording notes

### Day 21 (v457)
- `README.md`: Updated for Reborn — banner, What Is, hall table, demo steps, traction table, architecture

---

## What r0ze needs to do (cannot automate)

1. **Arena registration** — submit to Colosseum Frontier web form (see docs/arena-submission.md for content)
2. **Pitch video** — record with OBS per docs/pitch-video-script.md (3 min)
3. **X post** — post docs/x-post-draft.md POST 7 (hackathon submission announcement)
4. **Card portrait art** — Midjourney/Clip Studio batch, 64×64 PNG, name `card-01.png`...`card-60.png`
   - Then: `IRYS_PRIVATE_KEY=<key> node tools/arweave-upload/batch-upload.js`
   - Then: `node tools/arweave-upload/gen-metadata.js`
   - Then: update `card-portraits.json` at repo root with real URIs
   - Then: `git add card-portraits.json && git commit && git push` → GitHub Pages deploys auto
5. **Google Form** — create beta feedback form, replace URL in `10-input.js` (search `forms.gle/0xARKBetaFeedback`)
6. **Devnet init** — `init_legendary_supply(1)` for Season 1 LegendarySupply PDA
7. **AI agent** — `ANTHROPIC_API_KEY=sk-... AGENT_HALL=bronze node tools/ai-agent/duel-agent.js`

---

## Build status

- `cargo check`: 0 errors (23 pre-existing warnings, harmless)
- `node build.js`: ✓ 32643 lines, 28 modules
- All tags v-phd-day9 through v-phd-day21 pushed to GitHub

---

## If something breaks

- Balance issue: edit `BP_TBL`/`HP_TBL`/`INI_TBL`/`COST` arrays in `solana/client/src/08-duel-scene.js` lines ~84-88
- Portrait not loading: check `_portraitUriMap` in browser console, verify `card-portraits.json` at `/0xark/card-portraits.json`
- Legendary banner not showing: check `DS.loserLegendary` is set in `08-duel-scene.js` `_launchVictoryScene()`
- AI agent: check `ANTHROPIC_API_KEY` env var, review `tools/ai-agent/logs/` for errors

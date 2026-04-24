# Cleanup Handoff — v-phd-cleanup-1

**Date:** 2026-04-23  
**Tag:** v-phd-cleanup-1  
**Branch:** phase-d-reborn  
**Commit:** 68d518a

## Completed

### Group A: README 差し替え ✅
- `README.md` → Phase D Reborn version (3-pillar: ZK/AI/NFT, Hall tiers table, tech stack)
- Old README backed up to `legacy/phase-c/README_OLD_PHASE_C.md`
- Removed non-existent `design/demos/day13-victory.gif` img tag from new README
- Program ID confirmed: `5i37jWBiA7bV9XmokyDWHQxjJ5s1sBnSEkPSB4J2XfmN` ✅

### Group B: Repo root cleanup ✅
- `client/` (React/Dojo Phase C) → `legacy/phase-c/client/`
- `x402/` (old agent broker) → `legacy/phase-c/x402/`
- `zk/` (Phase C circuits) → `legacy/phase-c/zk/`
- `GDD-v0.2.md`, `GDD-v0.3.md`, `GDD.md.bak` → `legacy/phase-c/`
- `logs/` → added to .gitignore
- **Note:** `commit_reveal.wasm`, `commit_reveal_final.zkey`, `verification_key.json` KEPT at root
  - build.js copies these from `solana/client/` to root for GitHub Pages serving
  - Game client still loads them for ZK proof generation
  - Moving to legacy would break the live demo

### Group C: GDD 統一 ✅
- Root `GDD.md` removed (staged delete)
- `docs/GDD.md` is canonical v2.0 (1604 lines, already committed)
- `CLAUDE.md` → `docs/CLAUDE.md`
- `TASKS.md` → `docs/TASKS.md`

### Group D: docs/ 整理 ✅
- `docs/AI_AGENT_SPEC.md` — added (25KB)
- `docs/SETUP.md` — created (prerequisites + build commands)
- `docs/RULES.md`, `docs/LORE_SHARDS.md`, `docs/CARD_CATALOG.md` — already at latest version
- All README links verified functional

### Group E: Build + commit + tag ✅
- `node build.js` → 32644 lines, 0 errors ✅
- `cargo check` → 23 warnings, 0 errors ✅
- Commit: `68d518a` — 50 files changed
- Tag: `v-phd-cleanup-1` pushed

## Pending (manual)
- Push `main` branch (currently on `phase-d-reborn`) or merge to main if that's the submission target
- Verify `https://r0ze998.github.io/0xark/` after deploy (GitHub Actions runs on push to main)

## Files NOT changed (intentional)
- `index.html` root — GitHub Pages artifact, kept
- `commit_reveal.wasm` / `.zkey` / `verification_key.json` — GitHub Pages serving required
- `nft/`, `assets/`, `circuits/`, `design/`, `multiplayer/`, `solana/`, `tools/` — all intact
- `SECURITY.md`, `manifest.json`, `og-image.*`, `package.json` — kept at root

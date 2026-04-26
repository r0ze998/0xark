# UI v2 Rebuild — Handoff

**Branch:** ui-v2-rebuild  
**Tag:** v-phd-ui-v2  
**Date:** 2026-04-27  
**Status:** Complete — awaiting r0ze review → main merge → live

---

## What Was Done

Full UI v2 rebuild from scratch per CC_UI_V2_REBUILD_REQUEST.md decisions:

- Q1=A: 仮想ボタン完全廃止 ✅
- Q2=A: Phase C 完全削除 → `legacy/phase-c-ui/` 隔離 ✅
- Q3=A: Card tap で deck 追加 ✅
- Q4=C: SHOP/AGENT/LORE/SETTINGS 全実装 ✅
- Q5=B: Modern web 3.0 dark + neon purple (#0a0a0f + #8b5cf6) ✅
- Q6=B: Title hero scene 実装 ✅

---

## Architecture

| File | Purpose | Lines |
|------|---------|-------|
| `src/01-styles.css` | Design system, tokens, all scene CSS | 895 |
| `src/02-router.js` | DOM scene router (registerScene/enterScene) | 112 |
| `src/scenes/title.js` | Title hero, particle bg, wallet connect | 69 |
| `src/scenes/menu.js` | Wallet card + 6-cell feature grid | 59 |
| `src/scenes/lobby.js` | Bronze/Silver/Gold halls, confirm modal | 69 |
| `src/scenes/deck-editor.js` | BUILD/EVOLVE tabs, card tap, copy limit | 238 |
| `src/scenes/shop.js` | Card grid, rarity filter, x402 buy | 154 |
| `src/scenes/agent.js` | Default agents list, x402 hire | 126 |
| `src/scenes/lore.js` | Card catalog, type filter, lore shards | 155 |
| `src/scenes/settings.js` | Wallet/disconnect, audio sliders | 67 |
| `src/scenes/result.js` | VICTORY/DEFEAT, rewards, particles | 55 |
| `src/scenes/how-to-play.js` | Static rules (content in template HTML) | 10 |
| `legacy/phase-c-ui/` | Phase C 全ファイル隔離 (参照不可) | — |

Duel scene: canvas-only, `src/08-duel-scene.js` unchanged.

---

## Test Counts (all green)

| Suite | Count |
|-------|-------|
| Rust (cargo test) | 113 |
| card-engine.test.js | 53 |
| battle-mechanics.test.js | 49 |
| v3-plus-abilities.test.js | 41 |
| AI agent tests (5 files) | 95 |
| **Total** | **351** |

280 threshold ✅ exceeded.

---

## Deploy

Built: `node solana/client/build.js` → 27 modules, 17448 lines, version v2  
Pushed: `origin/ui-v2-rebuild` + `origin/gh-pages`  
Live URL: https://r0ze998.github.io/0xark

**To merge to main after verification:**
```
git checkout main
git merge ui-v2-rebuild
git push origin main
```

---

## 7-Bug Verification Checklist (r0ze で実機確認)

- [ ] 1. BATTLE → Lobby が Phase C に飛ばない (scene-lobby が表示される)
- [ ] 2. Deck Editor でカードをタップ → Title に戻らず deck に追加される
- [ ] 3. Title screen の文字サイズが適正 (巨大すぎない)
- [ ] 4. 仮想ボタン (D-pad / A / B / START) が画面上にない
- [ ] 5. Phase C 残骸 background (海・雲・船) が表示されない
- [ ] 6. Deck Editor で "Coming Soon" トーストが暴発しない
- [ ] 7. Console errors 0 件 (DevTools で確認)

---

## Next Steps (r0ze)

1. Live URL で上記 7 bug checklist を確認
2. OK なら `git checkout main && git merge ui-v2-rebuild && git push`
3. GitHub Actions deploy-pages.yml が自動で gh-pages 更新 (main push trigger)

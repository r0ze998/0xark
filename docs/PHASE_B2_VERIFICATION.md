# Phase B2 視覚検証レポート

生成日: 2026-04-19  
対象ブランチ: main (v452a)  
検査ファイル: `src/05-rendering.js`, `src/06-world-systems.js`, `src/07-battle.js`, `src/07-battle-resolve.js`, `src/07-map.js`, `src/08-overlays.js`, `src/00-tokens.js`

---

## 検証概要

| 画面 | Phase | 実装状況 | Hex Literal 数 | ブラウザ確認 |
|------|-------|----------|----------------|------------|
| Title screen | B2-1 | OK (v452a) | 4 (候補あり) | 必要 |
| Town screen | B2-3 | OK | 0 (GBA prim 経由) | 必要 |
| Battle vs_splash | B2-4 | OK (v454) | 0 | 必要 |
| Battle select | B2-4 | OK | 多数 (legacy) | 必要 |
| Battle confirming | B2-4 | OK | 多数 (legacy) | 任意 |
| Battle resolving | B2-4 | OK | 多数 (legacy) | 必要 |
| Battle result | B2-4 | OK | 多数 (legacy) | 必要 |
| Dungeon screen | B2-5 | OK | 0 (GBA prim 経由) | 必要 |
| Collection screen | B2-6 | OK | 0 (`_RC()` 経由) | 必要 |
| Victory screen | B2-7 | partial | 2 (#ffffc8, #fff) | 必要 |

---

## 各画面の検証

### Title Screen (B2-1)

**実装状況**: OK — v452a で `_titleSkySeaCanvas` + `_titleMoonCanvas` に移行完了

**GBA Primitive 対応表**:

| preview 要素 | 実装関数 / 手法 |
|-------------|----------------|
| 夜空グラデーション | `_titleSkySeaCanvas` (bake 済み offscreen canvas) |
| 月ディスク + halo | `_titleMoonCanvas` (bake 済み, `sail_cream` token) |
| 星 120 個 | Euler recurrence `_STAR_SS/SC` (sin-addition、per-frame) |
| 0x ロゴ | `window.TOKENS.resolveColor('gold_accent')` |
| ARK ロゴ | `window.TOKENS.resolveColor('sail_cream')` |
| タグライン | `window.TOKENS.resolveColor('menu_border')` |
| ガレオン (hull/sail/flag) | `hull_wood`, `sail_cream`, `flag_red` (token 経由) |
| ガレオン hull inset | `'#a07040'`, `'#5c3818'` (未トークン化) |
| 海面 + 反射 | `_titleSkySeaCanvas` 内 `ocean_shallow/deep` token |
| メインメニュー | `drawGBADialog()` + `drawMenuButton()` (token 完全対応) |
| OPTIONS overlay | `drawTitleOptionsOverlay()` + `window.TOKENS.resolveColor()` |

**Hex Literal 混入**:
- `'#a07040'` (hullTop — hull highlight) — line 1923 `[suspicious]`
- `'#5c3818'` (hullBot — hull shadow) — line 1924 `[suspicious]`
- コメント内 `@phase-b2-token-candidate: hull_highlight / hull_shadow` が存在 → トークン化作業待ち

**@deprecated 残存**:
- `_titleVoidGradCanvas`, `_titleRuneGridCanvas`, `_moonHaloCanvas`, `_moonDiskCanvas` に `@deprecated (phase-b2-title)` タグあり
- B2-8 cleanup まで保持 (ポリシー準拠)
- [browser check] これら deprecated canvas が描画パスに混入していないか実行時確認が必要

**Call Chain**:
```
dTitle()
  └─ g.drawImage(_titleSkySeaCanvas, 0, 0)          // baked sky+sea
  └─ g.drawImage(_titleMoonCanvas, mx, my)           // baked moon
  └─ txShadow('0x'/'ARK', ...)  ← TOKENS.resolveColor()
  └─ txShadow(tagTxt, ...)      ← TOKENS.resolveColor('menu_border')
  └─ [galleon drawing block]    ← hull_wood/sail_cream/flag_red tokens + 2 hex literals
  └─ [orbit cards]              ← CARD_RARITY_COL array
  └─ [star loop]                ← Euler recurrence, no per-frame trig
  └─ drawGBADialog()            ← TOKENS 完全対応
  └─ drawMenuButton()           ← TOKENS 完全対応
  └─ drawTitleOptionsOverlay()  ← TOKENS 完全対応
```

**潜在問題**:
- `_TITLE_VOID_COLS` (`['#5014b4',...]`) が module scope に宣言されているが、v452a 以降の `dTitle()` では使用されていない可能性がある `[suspicious]` — 参照箇所を grep で確認すること
- `#9945FF` が `_titleRuneGridCanvas` (deprecated) 内に存在。Solana brand color なので除外対象だが、deprecated canvas が誤って描画されないか確認が必要

**推奨確認項目**:
- [browser check] 月 (cream disk) が右上 `W-116, 116` に正しく表示されるか
- [browser check] ガレオンの hull highlight/shadow が前の moon-canvas 版と比べて色差が大きくないか
- [browser check] OPTIONS overlay が X キーで開閉し、menu_border の金色が正しく表示されるか

---

### Town Screen (B2-3)

**実装状況**: OK — tile layer は GBA primitive 関数群が `_RC()` を完全使用

**GBA Primitive 対応表**:

| preview 要素 | 実装関数 |
|-------------|---------|
| 草タイル | `drawGBAGrass()` → `_RC('grass_mid')`, `_RC('grass_dark')` |
| 木タイル | `drawGBATree()` → `_RC('grass_dark')`, `_RC('text_dark')` |
| 砂浜タイル | `drawGBASand()` → `_RC('sand_beach')` |
| 水タイル | `drawGBAWater()` → `_RC('ocean_shallow')`, `_RC('ocean_deep')` |
| 道タイル | `drawGBAPath()` → `_RC('path_tan')`, `_RC('path_shadow')` |
| フェンス | `drawGBAFence()` → `_RC('path_tan')`, `_RC('text_dark')` |
| 茂み | `drawGBABush()` → `_RC('grass_dark')`, `_RC('text_dark')` |
| 花 | `drawGBAFlower()` → `_RC('flower_pink/yellow/white')` |
| 建物 (7種) | `drawGBAHouse()` → roof/wall/path token |
| 看板 | `drawGBATownSigns()` |
| FIRST PORT バナー | `drawGBALocationBanner('FIRST PORT')` |

**Hex Literal 混入**: 0 (tile primitive 内はすべて `_RC()` 使用)

**Call Chain**:
```
dMap()
  └─ drawMapBg(currentMap)      // @deprecated no-op (v453a)
  └─ drawGBADungeonBG()         // inDungeon のみ
  └─ [tile cache layer]
     └─ drawTile(x, y)          // per-tile GBA primitive dispatch
  └─ drawGBATownSigns()         // currentMap===0 のみ
  └─ drawGBALocationBanner()    // currentMap===0 のみ
  └─ drawTownAnimatedOverlays() // !inDungeon, fr%2
  └─ drawTownAmbientParticles()
  └─ drawPirateDecorations()
  └─ [HUD + fog layers]
```

**潜在問題**:
- `drawMapBg` は `@deprecated (phase-b2-cleanup)` タグで no-op 化済み (`getBgSheet` が常に null)。B2-8 で削除予定だが現在は残存 `[browser check]`

**推奨確認項目**:
- [browser check] 水タイルの波アニメーション (`drawTownAnimatedOverlays`) が毎偶数フレームで正常動作するか
- [browser check] 7種の建物 (shop/gacha/stats/log/dungeon/tavern/synth) が正しい roof color token で描画されるか
- [browser check] `drawGBALocationBanner('FIRST PORT')` が画面内で見切れないか

---

### Battle Screens (B2-4) — 5 states

#### vs_splash

**実装状況**: OK — v454 で `drawGBAVsSplash()` への完全委譲が完了

**Call Chain**:
```
drawVsSplash()
  └─ drawGBAVsSplash(t, vsRivalIdx, tauntLbl, tauntAlpha)  // 05-rendering.js
     └─ _drawGBABandStripes()  ← _RC('flag_red'/'vega_deep'/'mira_deep'/'text_dark')
     └─ _drawGBAPortraitBlock() ← _RC() 完全対応
     └─ txShadow(names/tags)   ← _RC('menu_border'/'vega_pulse'/'mira_amber')
     └─ [VS box]               ← _RC('text_dark'/'menu_border')
     └─ [white flash]          ← hard-coded rgba(255,255,255, alpha)
```

**Hex Literal 混入**: 0 (drawGBAVsSplash 内は _RC() 完全対応)

**推奨確認項目**:
- [browser check] VEGA (left-bottom) / MIRA (right-bottom) のスライドイン方向が preview と一致するか

---

#### select

**実装状況**: OK — `drawGBABattleBG()` + `drawGBABattleHUD('select')` + `drawGBABattleArena()` の 3 primitive 呼び出し確認済み

**Call Chain**:
```
drawSelectPhase()
  └─ drawGBABattleBG()          // baked offscreen BG per floor
  └─ drawGBABattleHUD('select') // HP boxes, orbs, phase label
  └─ drawGBABattleArena()       // sprites + tell bubbles (_RC() 使用)
  └─ [action grid]              // hex literals 多数 (legacy module-scope arrays)
  └─ [card select panel]        // hex literals 多数
```

**Hex Literal 混入**: 多数 (module-scope static arrays: `_ACTION_COLORS_EX`, `_BTYPE_COL`, `_BAR_THREAT_COLS`, `_SCT_TYPE_COL` 等)

注: これらは `07-battle.js` の先頭で module scope に宣言された静的テーブルであり、描画ループ内でのアロケーション削減のため hoisting されている。B2-4 設計上は「GBA prim 移行中」のステータス。

**推奨確認項目**:
- [browser check] action grid (DRAW/STEAL/BARRIER/SCOUT/USE CARD) の色が token ベースに移行した後の見た目と乖離がないか
- [browser check] tell speech bubble (!) が VEGA (vega_pulse) / MIRA (mira_amber) で正しく色分けされているか

---

#### confirming

**実装状況**: OK — `drawGBABattleBG()` + `drawGBABattleHUD('confirming')` + `drawGBABattleArena()` + `drawGBASealScroll()` の呼び出し確認済み

**Call Chain**:
```
drawConfirmingPhase()
  └─ drawGBABattleBG()
  └─ drawGBABattleHUD('confirming')
  └─ drawGBABattleArena()
  └─ drawGBASealScroll(t0, bpAction)  // diagonal stripe flash, token 対応
```

**Hex Literal 混入**: module-scope 静的テーブル由来 (select と同様)

**推奨確認項目**: select との差異 (seal scroll アニメーション) のみ、任意確認で可

---

#### resolving

**実装状況**: OK — `drawResolvingPhase()` が GBA prim 3本を呼び出し。`drawGBARevealVFX()` を追加でコール

**Call Chain**:
```
drawResolvingPhase()   // 07-battle-resolve.js
  └─ drawGBABattleBG()
  └─ drawGBABattleHUD('resolving')
  └─ drawGBABattleArena()
  └─ drawGBARevealVFX(evT, pCol, rCol)  // VFX effects
```

**Hex Literal 混入**: `07-battle-resolve.js` に 96 行で hex literal 検出 (VFX 粒子色: `'#48b8e8'`, `'#64c8ff'`, `'#c8f0ff'`, `'#501e78'` 等)

`drawGBARevealVFX()` 内の粒子エフェクト (BARRIER 水色, STEAL 紫, MAGIC 炎) は現時点で token 未移行 `[suspicious]`

**推奨確認項目**:
- [browser check] STEAL 演出 (particle burst) が `#dc5028` / `#ffc83c` の色でレンダリングされるか確認
- [browser check] BARRIER 演出 (arc ring) が `#64c8ff` で描画されるか確認

---

#### result

**実装状況**: OK — `drawResultPhase()` が `drawGBABattleBG()` + `drawGBABattleHUD('result')` + `drawGBABattleArena()` + `drawGBAResultBanner()` を呼び出し

**Call Chain**:
```
drawResultPhase()   // 07-battle-resolve.js
  └─ drawGBABattleBG()
  └─ drawGBABattleHUD('result')
  └─ drawGBABattleArena()
  └─ drawGBAResultBanner(t, panX, panY, panW)  // v458: GBA styled summary header
```

**Hex Literal 混入**: `_RES_ACT_COLS`, `_RES_RAR_COLS`, `_RES_STEAL_COLS` など module-scope 静的テーブル (legacy)

**推奨確認項目**:
- [browser check] 勝利/敗北の rarity strip 色 (common=`#808898`, rare=`#b060e0` 等) がカード rariry と一致するか

---

### Dungeon Screen (B2-5)

**実装状況**: OK — `drawGBADungeonBG()` が `dMap()` 内から正しく呼び出されている。floor 別 baked canvas を使用

**GBA Primitive 対応表**:

| preview 要素 | 実装関数 |
|-------------|---------|
| 天井/柱/地平線 | `drawGBADungeonBG()` → `_btlBgDungeon[fl]` (baked per floor) |
| 床タイル | `drawGBADungeonFloor()` (tile layer 経由) |
| 壁タイル | `drawGBADungeonWall()` |
| 階段 | `drawGBADungeonStairs()` |
| フロアバナー | `drawGBADungeonBanner(currentFloor)` |
| 霧 | `drawFogOverlay()` + `drawFogParticles()` |
| ambient | `drawDungeonAtmos()` + `drawDungeonAmbientParticles()` |
| vignette | `drawDungeonVignette()` |
| rival ダイヤ | `drawGBARivalDiamond()` |
| フォグマーク | `drawGBAFogMarks()` |

**Hex Literal 混入**: 0 (dungeon tile primitive 内は `_RC()` 使用)

注: `_btlBgDungeon` の bake 時に `_floorAtm` 配列の RGB 数値リテラルが使用されているが、これは template literal 形式 (`rgb(${a[0]},...)`) であり、`#` hex literal ではない。

**Call Chain**:
```
dMap()
  └─ drawGBADungeonBG()           // baked dungeon backdrop
  └─ [tile cache] drawTile(x,y)
     └─ drawGBADungeonFloor()
     └─ drawGBADungeonWall()
     └─ drawGBADungeonStairs()
  └─ drawGBADungeonBanner(floor)  // FLOOR I..V ラベル
  └─ drawDungeonAtmos()
  └─ drawDungeonVignette()        // Euler recurrence per floor
  └─ drawFogOverlay()
  └─ drawGBAFogMarks()
  └─ drawGBARivalDiamond()
```

**推奨確認項目**:
- [browser check] 各フロア (B1-B5) のバナー色が floor config に従って変化するか (B1=`#6090e0`, B5=`#e0a020` 相当)
- [browser check] `drawDungeonVignette()` の Euler recurrence が floor ごとに異なる脈動速度で動作するか
- [browser check] 霧が dungeon_fog token (`#100818`) の色で正しく描画されるか

---

### Collection Screen (B2-6)

**実装状況**: OK — `dCrd()` が `_RC()` を通じて `menu_blue`, `menu_border`, `text_dark`, `text_light`, `vega_pulse` を使用

**GBA Primitive 対応表**:

| preview 要素 | 実装関数 / token |
|-------------|-----------------|
| 背景 | `bx(0,0,W,H,_RC('menu_blue'))` |
| HUD strip | `win(0,0,W,26)` + `_RC('menu_border')`, `_RC('text_light')` |
| progress bar fill | `_RC('menu_border')` / `_RC('vega_pulse')` |
| binder grid slot | `drawGBABinderSlot()` (05-rendering.js) |
| nav bar | `_RC('text_dark')`, `_RC('menu_border')`, `_RC('text_light')` |

**Hex Literal 混入**: 0 (`dCrd()` 関数内)

注: card detail panel `drawCardDetailPanel()` 内では `RARITY_COLOR` 配列 (`'#888898'`, `'#60b060'` 等) を参照しているが、これは `08-overlays.js` module scope で宣言された legacy 色配列であり、token 未移行 `[suspicious]`

**Call Chain**:
```
dCrd()
  └─ bx(background)              ← _RC('menu_blue')
  └─ win(HUD strip)
  └─ txShadow(labels)            ← _RC() 経由
  └─ bx(progress bar)            ← _RC('menu_border'/'vega_pulse')
  └─ drawGBABinderSlot(x,y,...)  ← 05-rendering.js
  └─ bx(nav bar)                 ← _RC('text_dark'/'menu_border')
  └─ drawCardDetailPanel()       ← RARITY_COLOR array (legacy hex) [suspicious]
```

**推奨確認項目**:
- [browser check] 8×5 バインダーグリッドが 40 枚/ページで正しくレイアウトされるか
- [browser check] 未収集カードのスロットが silhouette で表示され、収集済みカードが rarity 色のアクセントで強調されるか
- [browser check] `drawCardDetailPanel()` の rarity 色が RARITY_COLOR 配列と一致するか (Common=#888898)

---

### Victory Screen (B2-7)

**実装状況**: partial — 大部分は `_RC()` 使用だが、粒子エフェクト内に hex literal 2件

**GBA Primitive 対応表**:

| preview 要素 | 実装関数 / token |
|-------------|-----------------|
| 背景 | `bx(0,0,W,H,_RC('menu_blue'))` |
| ラジアルグラデーション | `_RC('mira_amber')` + `_RC('flag_red')` |
| ✦ sparkle装飾 | `_RC('menu_border')` |
| confetti | `_CONFETTI_COLS` array (hoisted, 未確認) |
| Title panel | `win()` + `txShadow('THE SEAL IS BROKEN')` ← `_RC('menu_border')` |
| Fan cards | `drawCardFrame()` |
| stats panel | `_RC('text_light')` |
| prize ratio | `_RC('menu_border')` |
| Solana ロゴ | `drawSolanaLogo()` + `'#9945FF'` (brand color, 除外対象) |
| クレーム btn | `'#14F195'` (brand color, 除外対象) |
| 粒子 | `g.fillStyle='#ffffc8'` (hard-coded) |
| 粒子 | `g.fillStyle='#fff'` via `'#fff'` (card reveal sparkle) |

**Hex Literal 混入**: 2件 (Solana brand 除く)
- line 659: `g.fillStyle='#ffffc8'` — fan card reveal sparkle 色 `[suspicious]`
- line 72 (相当): `'#fff'` — card acquisition particle 色 (08-overlays.js) `[suspicious]`

**Call Chain**:
```
dVictory()
  └─ bx(background)              ← _RC('menu_blue')
  └─ radialGradient              ← _RC('mira_amber'/'flag_red')
  └─ [✦ sparkle]                 ← _RC('menu_border')
  └─ [confetti loop]             ← _CONFETTI_COLS (source 要確認)
  └─ win() + txShadow(title)     ← _RC('menu_border')
  └─ drawBattleSprite(pl[0])
  └─ [fan card loop]             ← drawCardFrame() + '#ffffc8' sparkle
  └─ win() + txShadow(stats)     ← _RC('text_light')
  └─ win() + txShadow(prizes)    ← _RC('menu_border')
  └─ drawSolanaLogo()            ← '#9945FF' (brand)
  └─ [claim/mint buttons]        ← '#14F195'/'#9945FF' (brand)
  └─ win() + txShadow(best)      ← _RC('menu_border'/'text_light')
```

**推奨確認項目**:
- [browser check] 60フレーム後に fan card が順次スライドインするか (si*12 delay)
- [browser check] `#ffffc8` の粒子が fan card 出現演出として自然に見えるか
- [browser check] 「THE SEAL IS BROKEN」タイトルパネルが `menu_border` (金) で正しく描画されるか
- [browser check] ARK.rune purple aura が title panel 背後に薄く表示されるか (globalAlpha=0.3+...)

---

## 総合チェック

### Hex Literal 検査

| ファイル | `'#...` 検出行数 | 状況 |
|---------|----------------|------|
| `07-battle.js` | 157 行 | module-scope 静的テーブル群 (legacy, B2-4 移行中) |
| `07-battle-resolve.js` | 96 行 | VFX 粒子・rarity 色テーブル (未移行) |
| `08-overlays.js` | 131 行 | log 分類色 + card anim 粒子色 (未移行) |
| `06-world-systems.js` | 124 行 | rarity burst color, floor accent, minimap 色等 |
| `05-rendering.js` | 多数 | tile bake 時の raw RGB string (template literal) |

**B2 段階での許容判定**:
- Solana brand colors (`#9945FF`, `#14F195`, `#c090ff`) は意図的なため除外
- GBA prim 関数 (`drawGBAGrass` 等) は `_RC()` 完全移行済み ✓
- Title / Town / Dungeon / Collection の描画主経路は `_RC()` 準拠 ✓
- Battle VFX 粒子・log 分類色・rarity 静的テーブルは B2-8 cleanup 対象 (現時点では許容)

### Deprecated 関数 残存チェック

| 関数 / シンボル | ファイル | タグ | 削除予定 |
|----------------|---------|------|--------|
| `_titleVoidGradCanvas` | `06-world-systems.js` | `@deprecated (phase-b2-title)` | B2-8 |
| `_titleRuneGridCanvas` | `06-world-systems.js` | `@deprecated (phase-b2-title)` | B2-8 |
| `_moonHaloCanvas` | `06-world-systems.js` | `@deprecated (phase-b2-title)` | B2-8 |
| `_moonDiskCanvas` | `06-world-systems.js` | `@deprecated (phase-b2-title)` | B2-8 |
| `getBgSheet()` | `01-pixi.js` | `@deprecated (phase-b2-cleanup)` | B2-8 |
| `drawMapBg()` | `01-pixi.js` | `@deprecated (phase-b2-cleanup)` | B2-8 |

**アクション不要**: 全て policy (B2-0 PHASE_B2_PLAN.md) に従い B2-8 まで保持。  
[browser check] deprecated canvas が `dTitle()` に誤って参照されていないことを実行時に確認すること。

### Call Chain 整合性

| 画面 | 主描画関数 | GBA prim 呼び出し | 整合性 |
|------|-----------|-------------------|--------|
| Title | `dTitle()` | `drawGBADialog()`, `drawMenuButton()`, `drawTitleOptionsOverlay()` | OK |
| Town | `dMap()` | `drawGBAGrass/Tree/Water/Path/House...` (tile dispatch) | OK |
| vs_splash | `drawVsSplash()` | `drawGBAVsSplash()` | OK (v454) |
| select | `drawSelectPhase()` | `drawGBABattleBG()`, `drawGBABattleHUD()`, `drawGBABattleArena()` | OK |
| confirming | `drawConfirmingPhase()` | + `drawGBASealScroll()` | OK |
| resolving | `drawResolvingPhase()` | + `drawGBARevealVFX()` | OK |
| result | `drawResultPhase()` | + `drawGBAResultBanner()` | OK |
| Dungeon | `dMap()` | `drawGBADungeonBG()`, `drawGBADungeonBanner()` | OK |
| Collection | `dCrd()` | `drawGBABinderSlot()` | OK |
| Victory | `dVictory()` | `win()`, `txShadow()`, `bx()` | partial |

---

## 朝の r0ze ブラウザ確認項目

優先度順:

1. **[CRITICAL]** Title screen — galleon が正しく描画されるか (v452a render fix)
2. **[HIGH]** Title screen — 月 (cream disk) が `W-116, 116` に表示され halo が自然か
3. **[HIGH]** Battle vs_splash — VEGA/MIRA portrait スライドインが preview と一致するか
4. **[HIGH]** Battle resolving — STEAL/BARRIER VFX 粒子が意図した色と動きで出るか
5. **[HIGH]** Dungeon B1-B5 — フロアバナーと vignette が floor ごとに変化するか
6. **[MEDIUM]** Collection screen — 8×5 バインダーグリッドのレイアウト確認
7. **[MEDIUM]** Victory screen — fan card スライドインとタイトルパネル表示確認
8. **[MEDIUM]** Town screen — 水タイル波アニメーションと建物 7 種の roof color
9. **[LOW]** Title OPTIONS overlay — BIND VAULT / MULTIPLAYER / CREDITS 表示
10. **[LOW]** deprecated canvas (`_titleVoidGradCanvas` 等) が描画に混入しないこと

---

## スクリーンショット計画 (Puppeteer)

```javascript
// 推奨ブレークポイント: 960×640 (GBA canvas 2× render)
const SCREENS = [
  { state: 'title',       url: '/?state=title',      file: 'ss_title.png'      },
  { state: 'title_opts',  url: '/?state=title_opts', file: 'ss_title_opts.png' },
  { state: 'town',        url: '/?state=town',        file: 'ss_town.png'       },
  { state: 'dungeon_b1',  url: '/?state=dungeon&floor=1', file: 'ss_dungeon_b1.png' },
  { state: 'dungeon_b5',  url: '/?state=dungeon&floor=5', file: 'ss_dungeon_b5.png' },
  { state: 'vs_splash',   url: '/?state=vs_splash',  file: 'ss_vs_splash.png'  },
  { state: 'battle_sel',  url: '/?state=select',     file: 'ss_battle_sel.png' },
  { state: 'battle_res',  url: '/?state=result',     file: 'ss_battle_res.png' },
  { state: 'collection',  url: '/?state=collection', file: 'ss_collection.png' },
  { state: 'victory',     url: '/?state=victory',    file: 'ss_victory.png'    },
];
// 各スクリーンで waitForSelector('#main-canvas') 後に page.screenshot()
// design/preview/0N_*.html と目視比較する
```

対象プレビューファイル:
- `design/preview/01_title.html`
- `design/preview/02_town.html`
- `design/preview/03_dungeon.html`
- `design/preview/04_battle.html`
- `design/preview/05_collection.html`
- `design/preview/06_victory.html`

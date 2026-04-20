# UX Audit T51 — 2026-04-21

## T40 (v484) 完了内容確認

| 項目 | 状態 | 実装詳細 |
|------|------|---------|
| UX-1 矢印連打 | ✅ 完了 | `10-input.js`: hold-to-walk、115ms/step。`_lastDirCode` で最後の方向追跡、diagonal-skip 防止 |
| UX-2 カクカク移動 | ✅ 完了 | `05-rendering.js`: camera lerpT 0.12 → 0.20、3フレームで目標到達 |
| UX-3 文字小さい | ❌ 未対応 | 下記分析参照 |
| UX-4 カード多すぎ | ❌ 未対応 | 下記分析参照 |

---

## UX-3 カード入手メッセージ 文字サイズ

**問題箇所**: `src/08-overlays.js:122`
```js
txShadow(_acqObtainedLbl, W/2-130, cy_+ch/2+38, 14, '#303028', ...);
// ↑ fontSize=14 が小さすぎ
```

**囲み枠**: `win(W/2-150, cy_+ch/2+12, 300, 40)` — 高さ40pxが狭い

**修正方針 (B: modal 拡大)**:
- fontSize 14 → 20
- win 高さ 40 → 52、テキスト位置調整
- カード名の表示時間は既に 120フレーム (2秒) で十分

---

## UX-4 カードドロップ率

**問題箇所**: `src/06-world-systems.js:856-858`
```js
if(Math.random()>(0.30+bonus))return; // tall grass: 30% base
if(Math.random()>(0.15+bonus))return; // regular: 15% base
```

**現状分析**:
- 30% tall grass + streak/danger/rubberband ボーナス → 最大 70% (高すぎ)
- 1マップ探索で 10-15 枚ドロップは典型的
- target: 1マッチで 2-4 枚

**修正方針**:
- 0.30 → 0.15 (tall grass)
- 0.15 → 0.075 (regular grass)
- ボーナス上限は維持 (rubber-band は重要)

---

## keydown handler 実装方式

`src/10-input.js`: keydown + keyup イベント両方キャプチャ。
`src/09-game-loop.js:processHeldMovement()`: 115ms インターバルで held key をチェック。
`isMoving` フラグ: `wildEncounterActive || encounterExclActive` でガード。

---

## カード UI (UX-3/4) 現状

- カード入手時: `drawCardAcquisition()` — アニメ120フレーム、particles、rarity glow
- フォントサイズ: 14px (小さい) → 修正: 20px
- 想定ドロップ/ラウンド: 1-3枚 (多い) → 修正: 0.5-1枚
- Drop rate 設計: T61でレアリティ導入予定。本タスクはrateのみ調整。

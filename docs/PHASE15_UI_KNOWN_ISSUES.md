# Phase 15 UI — Known Issues & Remaining Work

Branch: `phase15-ui-fix` / Tag: `v-phd-phase15-ui-fix`

---

## 修正済み不整合 (phase15-ui-fix で対応)

### BUG-1: 真っ黒画面 (Critical — Fixed)
**原因**: `app.js` が `DOMContentLoaded` イベントリスナーで起動していた。
しかし `app.js` は `index.html` の `<script type="module">` 内の動的 `import()` で読み込まれるため、
`DOMContentLoaded` はすでに発火済み → `navigate('main', ...)` が一度も呼ばれず黒画面。

**修正**: `DOMContentLoaded` リスナーを削除し、`app.js` のトップレベルで `boot()` を直接呼ぶ。

### BUG-2: 旧世界観 (Elyon) の混入 (Fixed)
**原因**: `index.html` の CSS 変数が旧 Elyon 世界観 (`--clan-black-flag` 等) のままだった。
game-design-v2 は 6勢力 (Knight/Merchant/Pirate/Scholar/Monk/Engineer)。

**修正**:
- `index.html`: `--clan-black-flag` → `--clan-knight` 等 6変数に置換
- `index.html`: タイトル / ローディングテキストから "Succession War of Elyon" 削除
- `Card.js`: `FACTION_COLORS` を CSS 変数参照に変更
- `main-screen.js`: tagline 修正

### BUG-3: 個性↔Legendary マッピング誤り (Fixed)
game-design-v2 の正しいマッピング:

| Legendary | 勢力      | ID | 個性       | 修正前   |
|-----------|-----------|----|------------|----------|
| Sentinel  | Knight    | 10 | Conqueror  | ✓        |
| Magnate   | Merchant  | 20 | Patron     | ✓        |
| Marauder  | Pirate    | 30 | Phoenix    | ✓        |
| Oracle    | Scholar   | 40 | **Detective** | ~~Sage~~ |
| Ascetic   | Monk      | 50 | Hermit     | ✓        |
| Architect | Engineer  | 60 | **Sage**   | ~~Detective~~ |

**修正ファイル**: `LegendaryProgress.js`, `loot.js`

---

## Mock化したエンドポイント

以下は server 接続が未完のため、UI 上で mock 動作する:

| エンドポイント | 画面 | Mock内容 |
|---|---|---|
| matchmaking | main-screen.js | 2.5秒後に自動マッチ成立 |
| x402 `/x402/peek-vault-content` | interruption.js | カード id 21-25 を返す |
| ZK `hand_commitment` circuit | preparation.js | `Date.now()` ベースの文字列 commitment |
| ZK `reveal_hand` | interruption.js | 前の commitment をそのまま使用 |
| `damageCalc` seed | reveal.js | `crypto.getRandomValues(32byte)` |

---

## 5/11 までに必要な追加実装

### 高優先度

1. **multiplayer server wiring**
   - `matchId` / `opponentPubkey` を WebSocket (01-net.js) から受け取り state に反映
   - opponent の `fieldCards` を reveal フェーズで server から取得
   - 現状: opponent フィールドは preparation フェーズの自分フィールドのミラーで動作

2. **x402 peek 実接続**
   - `interruption.js` の `doPeek()` → `window.x402.scoutPeek()` が実際に呼べる状態に
   - server 側: `/x402/peek-vault-content` エンドポイントの実装確認

3. **ZK commit-reveal フロー**
   - `preparation.js`: `window.zkCardCommit.computeCommitment()` が `hand_commitment.wasm` + `.zkey` で動くか確認
   - wasm ファイルはすでに `solana/client/` 直下に存在

4. **Waitlistサイト** (独立タスク)
   - `register_waitlist` instruction の呼び出し UI
   - Phase 15 UI とは別ページ or モーダルで実装

### 中優先度

5. **スクリーンショット取得**
   - 5画面のスクリーンショットをデモ資料用に撮影

6. **モバイル対応**
   - 現状 1024×576 固定。スペック上は 375×667 対応必要
   - `@media (max-width: 768px)` でのスケールダウンを追加

7. **エラーハンドリング UI**
   - x402 支払い失敗時のエラートースト未実装
   - Wallet 未接続時に "Connect Wallet first" ガイダンスが必要

### 低優先度 (5/11後)

8. **観戦 UI** — スコープ外
9. **Audio (BGM/SFX)** — スコープ外
10. **Trade Floor** — スコープ外

---

## CARD_ART_PROMPTS_v2_1_FINAL.md の扱い

- **現状**: UI コードには Elyon 世界観 (Black Flag 等) の参照なし
- **今後**: 5/11後に美術発注フローを再評価
- **変更禁止**: このファイルは本タスクでは未変更

---

## 動作確認方法 (ローカル)

```bash
cd solana/client
npx serve . -l 4300
# open http://localhost:4300
```

期待動作:
1. ローディング画面 → メイン画面 (60枚 vault grid) が表示される
2. faction フィルターボタンが動作する
3. START BATTLE → 2.5秒後に準備フェーズへ遷移
4. 準備: vault からカードを5枚選択 → CONFIRM で中断フェーズへ
5. 中断: READY ボタンで reveal へ
6. Reveal: ~17秒アニメ (SKIP 可) → loot フェーズへ
7. Loot: カード選択 → CONTINUE でメインに戻る

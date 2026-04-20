# Phase C 実装計画 — Colosseum Frontier 2026 (4/21–5/11)

> **作成日**: 2026-04-19  
> **更新日**: 2026-04-20 (v470: B-full 5軸統合に全面改訂)  
> **期間**: 21日間 (4/21–5/11)  
> **ハッカソン**: Colosseum Frontier 2026  
> **締め切り**: 2026-05-11

---

## コアナラティブ (v470)

> "Solana 上の次世代 Fully On-Chain Game — ZK で情報を隠し、
> MagicBlock ER で低レイテンシに動き、AI agent が x402 で参戦し、
> プレイヤー同士が x402 でマイクロ取引する"

5 つの技術軸を統合し、単なるデモではなく **経済圏を持つ生きたゲーム**として提出する。

---

## 技術軸一覧

| 軸 | 内容 | 重要度 |
|----|------|--------|
| C-1 | MagicBlock ER (インフラ記録・issue 投稿) | 記録・加点 |
| C-2 | ZK Circuit 深化 + プログラム分離 | **critical** |
| C-3 | Demo Video + Pitch | **critical** |
| C-4 | Tokenomics 設計 | **critical** |
| C-5 | Sponsor Integration (Helius) | important |
| C-6 | GTM (pitch動画・β tester・SNS) | **critical** |
| C-7 | x402 統合 (3実装 + Tokenomics設計) | **critical** |
| C-8 | AI Agent auto-play bot | important |

---

## C-1: MagicBlock ER (縮小・記録フェーズ)

### 状況

Day 2 で delegate_session SDK 書き換え完了。on-chain 委任確認済み。
ER 実行は MagicBlock インフラ (Solana 2.2.1) と我々のビルド (Solana 3.1.12) の
バージョンミスマッチによりブロック。我々の責務外のインフラ問題。

### タスク列

| # | タスク | 優先度 | 見積 | 依存 |
|---|--------|--------|------|------|
| C1-1 | MagicBlock GitHub issue 投稿 (mb_github_issue.md を元に投稿) | **important** | 1h | — |
| C1-2 | MagicBlock ER latency 実測 | **best-effort** | 0h | MagicBlock 側対応後 |

**合計見積: 1h**

> **方針**: ER 実機 latency 測定は best-effort に降格。
> GitHub issue 投稿で「技術的に取り組んだ記録」を残す。
> MagicBlock 側が 3.x 対応したタイミングで再検証。

---

## C-2: ZK Circuit 深化

### 現状

- `commit_reveal.circom`: Poseidon(actionType, targetArea, salt) == commitHash
- 264 constraints, Groth16 BN254
- ブラウザ snarkjs で proof 生成動作確認済み
- オンチェーン Groth16 verifier コード済みだが未デプロイ

### タスク列

| # | タスク | 優先度 | 見積 | 依存 |
|---|--------|--------|------|------|
| C2-1 | `verify_zk_proof` を独立 Anchor プログラムとして分離デプロイ | **critical** | 6h | — |
| C2-2 | 既存 oxark プログラムから verifier プログラムへ CPI 連結 | **critical** | 3h | C2-1 |
| C2-3 | フロントエンド: proof 生成 → submit E2E 動作確認 | **critical** | 3h | C2-2 |
| C2-4 | proof キャッシュ (同じ入力なら再生成しない) | **important** | 2h | C2-3 |
| C2-5 | `dungeon_position.circom` 設計: `Poseidon(x, y, salt) == posHash` | **critical** | 10h | — |
| C2-6 | `dungeon_position` trusted setup + browser proving テスト | **critical** | 6h | C2-5 |
| C2-7 | proof 生成を Web Worker に移動してメインスレッドをブロックしない | **important** | 3h | C2-3 |
| C2-8 | `mint_card_nft` を独立 Anchor プログラムとして分離デプロイ | **important** | 4h | — |

**合計見積: 37h**

### dungeon_position.circom 設計案

```circom
pragma circom 2.0.0;
include "poseidon.circom";

template DungeonPosition() {
    signal input x;        // 実際の X 座標 (private)
    signal input y;        // 実際の Y 座標 (private)
    signal input salt;     // ランダム salt (private)
    signal output posHash; // 公開コミットメント

    component hasher = Poseidon(3);
    hasher.inputs[0] <== x;
    hasher.inputs[1] <== y;
    hasher.inputs[2] <== salt;
    posHash <== hasher.out;
}

component main = DungeonPosition();
```

---

## C-3: Pitch / Demo Video 制作計画

### タスク列

| # | タスク | 優先度 | 見積 | 依存 |
|---|--------|--------|------|------|
| C3-1 | HUD からデバッグ情報を除去・UI 整理 | **critical** | 3h | — |
| C3-2 | ローディング画面実装 (ZK proof 生成中のスピナー等) | **critical** | 2h | — |
| C3-3 | commit-reveal バトルのアニメーション強化 (reveal エフェクト) | **critical** | 4h | — |
| C3-4 | OBS キャプチャ設定確認 + 1080p 60fps 録画テスト | **critical** | 1h | — |
| C3-5 | Pitch script 最終版 (3分 Hook→Problem→Demo→Tech→Tokenomics→CTA) | **critical** | 3h | — |
| C3-6 | Technical demo script (ZK + ER + x402 + AI agent の技術デモ) | **critical** | 2h | C7-1 |
| C3-7 | Base gameplay 録画 (ダンジョン→バトル→カード奪取) | **critical** | 4h | C3-1,C3-2,C3-3 |
| C3-8 | x402 シーン録画 (Scout peek + Agent hire) | **important** | 2h | C7-1,C7-2 |
| C3-9 | AI Agent auto-play シーン録画 | **important** | 2h | C8-1 |
| C3-10 | 動画編集: カット・BGM・テロップ・ナレーション合成 | **critical** | 6h | C3-7,C3-8 |
| C3-11 | 再撮影バッファ | **critical** | 3h | C3-10 |

**合計見積: 32h**

### 動画スクリプト構成 (3分)

```
0:00–0:15  Hook       — "60枚のカードを最初に集めた者がすべてを奪う"
0:15–0:45  Problem    — ブロックチェーンゲームのUX問題・秘匿性の欠如
0:45–1:30  Demo       — ライブプレイ: ダンジョン → commit-reveal バトル → カード奪取
1:30–2:00  Tech       — ZK fog-of-war, MagicBlock sub-100ms, x402 AI agents
2:00–2:30  Tokenomics — Prize Pool, Season system, x402 Information Marketplace
2:30–3:00  CTA        — "devnet で今すぐプレイ" + GitHub リンク
```

---

## C-4: Tokenomics 設計

### タスク列

| # | タスク | 優先度 | 見積 | 依存 |
|---|--------|--------|------|------|
| C4-1 | `deposit_stake` / `claim_prize` 命令 E2E テスト (litesvm) | **critical** | 4h | — |
| C4-2 | Prize Pool 清算ロジック設計: 複数コンプ時の比例分配 or 早い者勝ち | **critical** | 3h | C4-1 |
| C4-3 | `create_season` / `end_season` on-chain テスト | **critical** | 3h | C4-2 |
| C4-4 | Tokenomics paper 最終化 (x402経済圏含む) | **critical** | 4h | C7-design |
| C4-5 | Legends システム: 全時間帯最速コンプをゲーム内に表示 | **important** | 3h | C4-3 |

**合計見積: 17h**

### 収益構造サマリ

| 収益柱 | 仕組み | カット率 |
|--------|--------|---------|
| Information Marketplace | ダンジョン情報売買 (x402) | 5% |
| Agent Economy | AI エージェント参戦手数料 (x402) | 固定額 (TBD) |
| Card P2P | プレイヤー間カード取引 (x402) | 2.5% |
| Prize Pool | シーズンエントリー費累積 (0.5 SOL/人) | 清算時 100% |

---

## C-5: Sponsor Integration (Helius)

### タスク列

| # | タスク | 優先度 | 見積 | 依存 |
|---|--------|--------|------|------|
| C5-1 | Helius devnet API キー取得 + RPC エンドポイント切り替え | **critical** | 1h | — |
| C5-2 | Helius Webhook: `card_minted`, `battle_resolved` イベント設定 | **important** | 3h | C5-1 |
| C5-3 | Helius Webhook イベントをフロントエンドにプッシュ (WebSocket 経由) | **important** | 3h | C5-2 |

**合計見積: 7h**

---

## C-6: GTM (Go-to-Market)

### 方針

Pitch 動画 + β tester + Twitter/Farcaster に集中。

### タスク列

| # | タスク | 優先度 | 見積 | 依存 |
|---|--------|--------|------|------|
| C6-1 | README 全面書き直し (5軸統合ナラティブ、デモGIF付き) | **critical** | 3h | — |
| C6-2 | Twitter/X: ZK fog-of-war ゲーム設計スレッド (3–5 ツイート) | **critical** | 2h | — |
| C6-3 | Twitter/X: commit-reveal バトル GIF キャプチャ + 投稿 | **critical** | 2h | C3-3 |
| C6-4 | Farcaster: ゲームデブフレーム作成 (デイリーダンジョン結果共有) | **important** | 3h | — |
| C6-5 | クローズドベータ: 5/4–5/11 に 10 名テスター招待・フィードバック収集 | **critical** | 3h | — |
| C6-6 | ハッカソン提出フォーム記入 (説明文・動画リンク・GitHub) | **critical** | 2h | C3-10 |
| C6-7 | Pitch video 録画・編集 (5/7–5/8) | **critical** | 4h | C3-5 |
| C6-8 | Technical demo 録画・編集 (5/9) | **critical** | 3h | C3-6 |

**合計見積: 22h**

---

## C-7: x402 統合

詳細設計 → `docs/X402_DESIGN.md` 参照。

### 実装対象 (必須 3 実装)

| # | タスク | 優先度 | 見積 | 依存 |
|---|--------|--------|------|------|
| C7-1 | Scout peek: x402 でダンジョン情報を購入 | **critical** | 6h | — |
| C7-2 | Agent hire: x402 で AI agent をダンジョンに派遣 | **critical** | 6h | C8-1 |
| C7-3 | Card P2P: プレイヤー間のリアルタイムカード取引 | **critical** | 6h | — |
| C7-design | Tokenomics paper: 残り 12 取引タイプの設計提示 | **important** | 4h | — |

**合計見積: 22h**

---

## C-8: AI Agent auto-play bot

### 概要

LLM (Claude API) が game state を読み取り、
commit_action → reveal_action を自律的に実行する bot。
1 マッチの自動プレイを録画し、デモ動画に組み込む。

### タスク列

| # | タスク | 優先度 | 見積 | 依存 |
|---|--------|--------|------|------|
| C8-1 | Agent: game state 読み取り + action 決定ロジック (LLM連携) | **important** | 6h | — |
| C8-2 | Agent: x402 Agent hire API 統合 (C7-2 と連動) | **important** | 3h | C7-2,C8-1 |
| C8-3 | Agent: 1 マッチ自動プレイ録画 | **important** | 2h | C8-2 |

**合計見積: 11h**

---

## 21 日スケジュール (4/21–5/11)

| 日程 | 主タスク |
|------|---------|
| 4/21 (月) | ZK: dungeon_position.circom 設計開始、C1-1 GitHub issue 投稿 |
| 4/22 (火) | ZK: dungeon_position.circom 継続、C5-1 Helius RPC 切り替え |
| 4/23 (水) | ZK: dungeon_position.circom 完了 (C2-5)、resolve_round 動作検証 |
| 4/24 (木) | x402: Scout peek 実装 (C7-1 前半) |
| 4/25 (金) | x402: Scout peek 完成 (C7-1)、C6-1 README 全面書き直し |
| 4/26 (土) | ZK split: verify_zk_proof 別プログラム分離 (C2-1,C2-2) |
| 4/27 (日) | NFT split: mint_card_nft 別プログラム分離 (C2-8) |
| 4/28 (月) | x402: Agent hire 実装 (C7-2) |
| 4/29 (火) | x402: Card P2P 実装 (C7-3) |
| 4/30 (水) | AI Agent bot 実装 (C8-1,C8-2) |
| 5/1 (木) | AI Agent bot 完成 + 録画 (C8-3) |
| 5/2 (金) | ZK: dungeon_position trusted setup + browser proving (C2-6 前半) |
| 5/3 (土) | ZK: browser proving 完成 (C2-6)、Base gameplay 録画 (C3-7) |
| 5/4 (日) | Tokenomics paper 最終化 (C4-4)、C7-design 設計提示 |
| 5/5 (月) | Pitch script + Technical demo script (C3-5,C3-6) |
| 5/6 (火) | UI 整理・HUD クリーンアップ (C3-1,C3-2,C3-3) |
| 5/7 (水) | Pitch video 録画・編集 (C6-7) |
| 5/8 (木) | x402/AI シーン録画、クローズドβ開始 (C3-8,C3-9,C6-5) |
| 5/9 (金) | Technical demo 録画・編集 (C6-8)、Farcaster 投稿 |
| 5/10 (土) | Twitter/X スレッド投稿 (C6-2,C6-3)、提出フォーム記入 (C6-6) |
| 5/11 (日) | **DEADLINE** — 最終確認 → 提出 🏴‍☠️ |

---

## Critical Path

```
[C2-5] dungeon_position.circom
    ↓
[C2-6] trusted setup + browser proving
    ↓
[C2-1] verify_zk_proof 別プログラム分離
    ↓
[C2-2] CPI 連結
    ↓
[C2-3] E2E proof→submit 確認
    ↓                            ↘
[C4-2] Prize Pool 清算ロジック   [C3-7] Base gameplay 録画
    ↓                            ↓
[C4-4] Tokenomics paper          [C3-10] 動画編集
                                 ↓
[C6-6] 提出フォーム ←——————————[動画 URL 確定]
    ↓
[5/11 提出]

並行（非ブロッキング）:
[C7-1] Scout peek → [C7-2] Agent hire → [C7-3] Card P2P
[C8-1] Agent bot → [C8-2] x402統合 → [C8-3] 録画
[C5-1] Helius RPC → [C5-2] Webhook → [C5-3] フロントプッシュ
```

---

## 時間配分サマリ

| セクション | 見積 | 区分 |
|-----------|------|------|
| C-1 MagicBlock (縮小) | 1h | 技術 |
| C-2 ZK | 37h | 技術 |
| C-4 Tokenomics実装 | 17h | 技術 |
| C-5 Helius | 7h | 技術 |
| C-7 x402統合 | 22h | 技術 |
| C-8 AI Agent | 11h | 技術 |
| **技術小計** | **95h** | — |
| C-3 Demo Video | 32h | プレゼン |
| C-6 GTM | 22h | プレゼン |
| **プレゼン小計** | **54h** | — |
| **合計** | **149h** | 5h×21日=105h基準 (バッファ含む) |

---

## リスクと緩和策

| リスク | 深刻度 | 緩和策 |
|--------|--------|--------|
| dungeon_position.circom が想定超え | 高 | C2-5 を 10h 確保。circuit 複雑化したら公開 trusted setup 流用 |
| x402 Agent hire と AI bot の連携が複雑 | 中 | C7-2 と C8 を 4/28–5/1 に集中させる |
| プログラム分離でサイズ制限に引っかかる | 中 | verify_zk_proof は既存コードが小さい、分離は現実的 |
| MagicBlock ER が期間内に 3.x 対応 | 低(期待) | issue 投稿で track。対応があれば best-effort で再統合 |
| デモ動画クオリティ不足 | 高 | 5/7 完成目標、5/8–5/9 に再撮影バッファ確保 |

# Phase C 実装計画 — Colosseum Frontier 2026 (4/20–5/11)

> **作成日**: 2026-04-19  
> **更新日**: 2026-04-20 (判断 6 件反映)  
> **期間**: 22日間 (4/20–5/11)  
> **ハッカソン**: Colosseum Frontier 2026  
> **締め切り**: 2026-05-11

---

## 概要

Phase B2 が完了し、タイトル画面・ガレオン描画・コアゲームループが動作している状態からスタートする。Phase C の目標は「審査員が見て納得するデモ + 技術的深度の証明 + 提出書類の完成」の3点に集約される。

**Critical Path の骨格:**
1. ZK verifier を devnet で有効化 → Prize Pool 請求フローを証明可能にする
2. MagicBlock ER セッションキー統合 → ウォレットポップアップ撲滅で UX 完成
3. Helius RPC + Webhook → リアルタイムイベント監視
4. デモ動画 3 分を 5/7 までに完成 → 5/11 提出に 4 日のバッファ

MagicBlock 統合はデモ動画に間に合えば加点要素だが、**ビデオ撮影は ZK verifier 有効化に依存しない**。並行で進められる。

---

## C-1: Solana Integration 強化

### 現状

- Anchor プログラム `2gMYzenV6HQoTJA2899XxnLgzTbaWdVmegLqL7nMpVS3` が devnet にデプロイ済み (7 instructions)
- `verify_zk_proof`, `mint_card_nft`, `deposit_stake`, `claim_prize`, `create_season`, `end_season`, `register_agent`, `deactivate_agent` の 8 命令はコード済みだがバイナリサイズ制限で除外中
- WebSocket relay server は純粋リレー（ゲームロジックなし）

### ギャップ

- `verify_zk_proof` が live でないため ZK の実証ができない
- `deposit_stake` / `claim_prize` が無効 → Prize Pool フローがデモ不可
- セッションキー未実装 → バトルごとにウォレットポップアップが発生
- CI/CD パイプライン未整備（リグレッション検知なし）

### タスク列

| # | タスク | 優先度 | 見積 | 依存 |
|---|--------|--------|------|------|
| C1-1 | `verify_zk_proof` + `deposit_stake` + `claim_prize` を別プログラムとして分離デプロイ | **critical** | 6h | — |
| C1-2 | MagicBlock ER: `DELeGGvXpWV2fqJUhqcF5ZSYMS4JTLjteaAMARRSaeSh` へのアカウント委任実装 | **critical** | 10h | — |
| C1-3 | セッションキー生成・署名フロー (MagicBlock SDK) をフロントエンドに統合 | **critical** | 6h | C1-2 |
| C1-4 | `commit_frequency: 10` 設定で ER バリデーター接続確認 | **important** | 2h | C1-2 |
| C1-5 | `deposit_stake` / `claim_prize` の E2E テスト (litesvm) | **important** | 4h | C1-1 |
| C1-6 | GitHub Actions: `cargo test` + litesvm CI パイプライン | **important** | 3h | C1-5 |
| C1-7 | WebSocket サーバー: 接続数上限・reconnect ロジック追加 | **important** | 3h | — |
| C1-8 | Helius devnet RPC への切り替え (公開 RPC から移行) | **important** | 1h | — |
| C1-9 | Helius Webhook: カードミント・バトル結果トランザクション監視 | **important** | 4h | C1-8 |
| C1-10 | `mint_card_nft` devnet 有効化 + フロントエンド連携 | **nice-to-have** | 4h | C1-1 |

**合計見積: ~43h** (C1-2 を 8h→10h に増枠、Sonic/Pyth スキップ分 2h 再配分)

### MagicBlock 統合詳細

```typescript
// セッションキー委任フロー (概略)
import { MagicBlockEngine } from "@magicblock-labs/magicblock-engine";

const engine = new MagicBlockEngine({
  delegateAuthority: "DELeGGvXpWV2fqJUhqcF5ZSYMS4JTLjteaAMARRSaeSh",
  commitFrequency: 10,
});

// ゲームアカウントを ER に委任
await engine.delegateAccount(playerAccountPubkey);

// セッション中は wallet popup なしで署名
const sessionKeypair = engine.createSessionKey({ ttl: 3600 });
```

---

## C-2: ZK Circuit 深化

### 現状

- `commit_reveal.circom`: `Poseidon(actionType, targetArea, salt) == commitHash`
- 264 constraints, Groth16 BN254
- ブラウザ snarkjs で proof 生成動作確認済み
- オンチェーン Groth16 verifier コード済みだが未デプロイ

### ギャップ

- ダンジョン位置秘匿サーキット未設計（アクション ZK とは別）
- ブラウザ proof 生成レイテンシ ~2–3 秒 → UX に影響
- オンチェーン verifier がアクティブでない → ZK の実証力が弱い

### タスク列

| # | タスク | 優先度 | 見積 | 依存 |
|---|--------|--------|------|------|
| C2-1 | オンチェーン Groth16 verifier を devnet に分離プログラムとしてデプロイ | **critical** | 5h | C1-1 |
| C2-2 | `verify_zk_proof` 命令から verifier プログラムを CPI 呼び出し | **critical** | 3h | C2-1 |
| C2-3 | フロントエンド: proof 生成 → submit フロー E2E 動作確認 | **critical** | 3h | C2-2 |
| C2-4 | proof キャッシュ実装 (同じ入力なら再生成しない) | **important** | 2h | C2-3 |
| C2-5 | `dungeon_position.circom` 設計: `Poseidon(x, y, salt) == posHash` | **important** | 10h | — |
| C2-6 | `dungeon_position` trusted setup + browser proving テスト | **important** | 6h | C2-5 |
| C2-7 | proof 生成をバックグラウンド Worker に移動してメインスレッドをブロックしない | **important** | 3h | C2-3 |

**合計見積: ~32h** (C2-5 を 6h→10h、C2-6 を 4h→6h に増枠; Sonic/Pyth スキップ分 6h 再配分。TEE 代替評価タスクは不採用確定により削除)

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

> **方針確定**: 位置秘匿は ZK フル実装 (`dungeon_position.circom`) で進める。MagicBlock TEE 代替は不採用。C2-5, C2-6 を **4/21–4/25 スロット**で実装する。

---

## C-3: Pitch / Demo Video 制作計画

### 現状

- `docs/pitch-video-script.md` にスクリプト草案あり
- フロントエンド: GBA ピクセルアート、タイトル画面、ゲームループ動作
- キャプチャ環境: OBS 設定未確認

### ギャップ

- HUD クリーンアップ未実施（デバッグ情報が残存）
- ローディング画面・エラーステート未整備
- commit-reveal バトルのビジュアルフィードバックが弱い
- 日本語 / 英語ナレーション台本の最終版がない

### タスク列

| # | タスク | 優先度 | 見積 | 依存 |
|---|--------|--------|------|------|
| C3-1 | HUD からデバッグ情報を除去・UI 整理 | **critical** | 3h | — |
| C3-2 | ローディング画面実装（ZK proof 生成中のスピナー等） | **critical** | 2h | — |
| C3-3 | commit-reveal バトルのアニメーション強化 (reveal エフェクト) | **critical** | 4h | — |
| C3-4 | OBS キャプチャ設定確認 + 1080p 60fps 録画テスト | **critical** | 1h | — |
| C3-5 | スクリプト最終版作成 (3 分・Hook→Problem→Demo→Tech→Tokenomics→CTA) | **critical** | 3h | — |
| C3-6 | 本録画: ダンジョン探索 → ライバル遭遇 → バトル → カード奪取 | **critical** | 4h | C3-1, C3-2, C3-3, C3-5 |
| C3-7 | x402 インテル購入シーンの録画 | **important** | 2h | C3-6 |
| C3-8 | 動画編集: カット・BGM・テロップ・ナレーション合成 | **critical** | 6h | C3-6, C3-7 |
| C3-9 | 再撮影バッファ (5/7 までに完成前提) | **critical** | 3h | C3-8 |

**合計見積: ~28h**

### 動画スクリプト構成

```
0:00–0:15  Hook     — "60枚のカードを最初に集めた者がすべてを奪う"
0:15–0:45  Problem  — ブロックチェーンゲームのUX問題・秘匿性の欠如
0:45–1:30  Demo     — ライブプレイ: ダンジョン → commit-reveal バトル → カード奪取
1:30–2:00  Tech     — ZK fog-of-war, MagicBlock sub-100ms, x402 AI agents
2:00–2:30  Tokenomics — Prize Pool, Season system, Information Marketplace
2:30–3:00  CTA      — "devnet で今すぐプレイ" + GitHub リンク
```

---

## C-4: Tokenomics 設計

### 現状

- CLAUDE.md: 参加費 **0.5 SOL 固定**、スターターカード 3 枚
- x402 AI agent ブローカー: USDC マイクロペイメント実装済み (ガチャ支払い専用)

### ギャップ

- Prize Pool 清算ロジック（複数コンプ時の処理）未設計
- シーズン on-chain 命令 (`create_season` / `end_season`) が未テスト

### タスク列

| # | タスク | 優先度 | 見積 | 依存 |
|---|--------|--------|------|------|
| C4-1 | エントリー費用: **0.5 SOL 固定**確定 — deposit_stake 命令・フロントエンド表示を SOL で統一 | **critical** | 1h | — |
| C4-2 | シーズン期間: **2週間** — シーズン1 (4/21–5/4) + シーズン2 (5/5–) で "生きてる" 状態で提出 | **critical** | 1h | — |
| C4-3 | Prize Pool 清算ロジック設計: 複数コンプ時の比例分配 or 早い者勝ち | **critical** | 3h | C4-1, C4-2 |
| C4-4 | `create_season` / `end_season` 命令の on-chain 実装 + テスト | **critical** | 5h | C4-3 |
| C4-5 | Information Marketplace: 5% 手数料徴収ロジック実装 | **important** | 3h | C4-1 |
| C4-6 | Legends システム: 全時間帯最速コンプをゲーム内に表示 | **important** | 3h | C4-4 |
| C4-7 | ガチャをコスメティック限定に制限（マーズカジノ回避設計確認） | **important** | 2h | — |
| C4-8 | Tokenomics ドキュメント (提出用) 執筆 | **important** | 2h | C4-3 |

**合計見積: ~20h** (Pyth C4-9 スキップで -2h)

### 収益構造サマリ

| 収益柱 | 仕組み | カット率 |
|--------|--------|---------|
| Information Marketplace | ダンジョン情報売買 | 5% |
| Agent Economy | AI エージェント出品手数料 | 固定額 (TBD) |
| Prize Pool | シーズンエントリー手数料累積 (0.5 SOL/人) | 清算時 100% |

> **ガチャ設計方針**: コスメティック（カードスキン・フレーム）のみ対象。ゲーム強度に影響するカードはガチャ対象外とし、ギャンブル・ルートボックス規制を回避する。

---

## C-5: Sponsor Integration

### 現状

- MagicBlock: SDK 調査済み、統合コード未実装
- Helius: 公開 devnet RPC 使用中、Webhook 未設定
- Sonic SVM: **不採用** — Colosseum 公式スポンサートラック・バウンティ廃止のため
- Pyth: **不採用** — エントリー費用が SOL 固定のため USDC 価格フィード不要

### タスク列

| # | タスク | 優先度 | 見積 | 依存 |
|---|--------|--------|------|------|
| C5-1 | Helius devnet API キー取得 + RPC エンドポイント切り替え | **critical** | 1h | — |
| C5-2 | Helius Webhook: `card_minted`, `battle_resolved` イベント設定 | **important** | 3h | C5-1 |
| C5-3 | Helius Webhook イベントをフロントエンドにプッシュ (WebSocket 経由) | **important** | 3h | C5-2 |
| C5-4 | MagicBlock ER アクセス申請 + テストネット接続確認 | **critical** | 2h | — |
| C5-5 | MagicBlock ER: セッションキー統合 (C1-2, C1-3 と同じ作業) | **critical** | — | C1-2 |
| C5-6 | スポンサーロゴ + 統合説明をゲーム内 About 画面に追加 (旧 C5-8) | **nice-to-have** | 1h | — |

**合計見積: ~10h 除く重複分** (Sonic C5-6 / Pyth C5-7 スキップで -6h)

> **採用スポンサー**: MagicBlock (ER セッションキー) + Helius (RPC + Webhook) の 2 本柱。Solana devnet/mainnet のみ。

---

## C-6: GTM (Go-to-Market)

### 現状

- ライブデモ: https://r0ze998.github.io/0xark/ (動作中)
- GitHub: https://github.com/r0ze998/0xark
- SNS チャンネル: Farcaster, Twitter/X

### ギャップ

- GTM コンテンツ未作成
- クローズドベータ参加者未確保

### タスク列 (3 軸: Twitter / Farcaster / β)

| # | タスク | 優先度 | 見積 | 依存 |
|---|--------|--------|------|------|
| C6-1 | Twitter/X: ZK fog-of-war ゲーム設計スレッド (3–5 ツイート) | **critical** | 2h | — |
| C6-2 | Twitter/X: commit-reveal バトルの GIF キャプチャ + 投稿 | **critical** | 2h | C3-3 |
| C6-3 | Farcaster: ゲームデブフレーム作成 (デイリーダンジョン結果共有) | **important** | 3h | — |
| C6-4 | Farcaster: コレクタブルカードフレーム (カード画像共有機能) | **important** | 3h | C6-3 |
| C6-5 | クローズドベータ: 5/4–5/11 に 10 名テスター招待・フィードバック収集 | **critical** | 3h | — |
| C6-6 | README + GitHub Pages ランディングページ更新 | **important** | 2h | — |
| C6-7 | ハッカソン提出フォーム記入 (説明文・動画リンク・GitHub) | **critical** | 2h | C3-8 |

**合計見積: ~17h** (MIROSS C6-5 削除で -2h)

---

## Day-by-Day スケジュール (4/20–5/11)

### Week 1: Solana + ZK 基盤固め (4/20–4/26)

| 日付 | 主要タスク | 完了目標 |
|------|-----------|---------|
| 4/20 (日) | C5-1 Helius RPC 切り替え、C5-4 MagicBlock ER アクセス申請 | Helius 接続確認 |
| 4/21 (月) | C1-2 MagicBlock ER アカウント委任実装、**C2-5 dungeon_position.circom 設計開始** | ER 委任コード動作 |
| 4/22 (火) | C1-3 セッションキー UI 統合、C1-4 commit_frequency 確認、**C2-5 継続** | ウォレットポップアップ消滅 |
| 4/23 (水) | C1-1 verify_zk_proof + deposit_stake + claim_prize 分離プログラムデプロイ、**C2-5 完了** | devnet に verifier 着地 |
| 4/24 (木) | C2-1 Groth16 verifier devnet デプロイ、C2-2 CPI 連結、**C2-6 dungeon_position 開始** | ZK verify フロー動作 |
| 4/25 (金) | C2-3 E2E proof→submit 確認、C5-2 Helius Webhook 設定、**C2-6 完了** | proof submit on-chain 成功 + dungeon_position ZK 完成 |
| 4/26 (土) | C1-6 GitHub Actions CI/CD 構築 | PR ごとに cargo test 自動実行 |

### Week 2: ゲームループ完成 + Tokenomics (4/27–5/3)

| 日付 | 主要タスク | 完了目標 |
|------|-----------|---------|
| 4/27 (日) | C1-5 deposit_stake / claim_prize litesvm テスト | テスト全通過 |
| 4/28 (月) | C4-3 Prize Pool 清算ロジック設計、C4-4 create_season / end_season 実装 | シーズン開始・終了 on-chain |
| 4/29 (火) | C4-1 0.5 SOL 表示統一、C4-5 手数料ロジック実装 | Marketplace 手数料動作 |
| 4/30 (水) | C2-4 proof キャッシュ、C2-7 Web Worker 移行 | proof 生成 UX 改善 |
| 5/1 (木) | C3-1 HUD 整理、C3-2 ローディング画面 | デモ撮影前 UI 完成 |
| 5/2 (金) | C3-3 バトルアニメーション強化 | commit-reveal reveal エフェクト完成 |
| 5/3 (土) | C5-3 Helius→WebSocket プッシュ連結 | リアルタイムイベント表示 |

### Week 3: デモ制作 + GTM (5/4–5/8)

| 日付 | 主要タスク | 完了目標 |
|------|-----------|---------|
| 5/4 (日) | C3-4 OBS 設定確認、C3-5 スクリプト最終化 | 撮影準備完了 |
| 5/5 (月) | C3-6 本録画 (ダンジョン→バトル→カード奪取)、C3-7 x402 シーン録画 | 素材収録完了 |
| 5/6 (火) | C3-8 動画編集 (カット・BGM・テロップ) | 動画初稿完成 |
| 5/7 (水) | C6-1 Twitter/X スレッド投稿、C6-2 GIF キャプチャ投稿 | SNS 発信開始 |
| 5/8 (木) | C6-5 クローズドベータ開始 (10 名招待)、C4-6 Legends システム | ベータフィードバック収集開始 |

### Final Stretch: 提出準備 (5/9–5/11)

| 日付 | 主要タスク | 完了目標 |
|------|-----------|---------|
| 5/9 (金) | 動画ファイル最終化・YouTube/Vimeo アップロード、C6-6 README 更新 | 提出用素材完成 |
| 5/10 (土) | C6-7 ハッカソン提出フォーム記入・プレビュー確認、最終 QA | フォーム記入完了 |
| 5/11 (日) | **DEADLINE** — 最終確認 → 提出 | 提出完了 🏴‍☠️ |

---

## Critical Path

```
[C1-1] verify_zk_proof 分離デプロイ
    ↓
[C2-1] Groth16 verifier devnet デプロイ
    ↓
[C2-2] CPI 連結
    ↓
[C2-3] E2E proof→submit 動作確認
    ↓                              ↘
[C4-4] create_season/end_season    [C3-6] 本録画
    ↓                              ↓
[C4-3] Prize Pool 清算ロジック     [C3-8] 動画編集
                                   ↓
[C6-7] 提出フォーム ←————————————[動画 URL 確定]
    ↓
[5/11 提出]

並行（非ブロッキング）:
[C1-2] MagicBlock ER → [C1-3] セッションキー (UX 加点、動画には任意)
[C2-5] dungeon_position.circom → [C2-6] trusted setup (4/21–4/25)
[C5-1] Helius RPC → [C5-2] Webhook → [C5-3] フロントへのプッシュ
```

**最小 critical path**: C1-1 → C2-1 → C2-2 → C2-3 → C3-6 → C3-8 → C6-7 → 提出

---

## リスクと緩和策

| リスク | 深刻度 | 緩和策 |
|--------|--------|--------|
| プログラムサイズ制限で `verify_zk_proof` を分離できない | 高 | Verifier を独立した小さな Anchor プログラムとしてデプロイ（既存プログラムに依存しない） |
| MagicBlock ER アクセスが期間内に承認されない | 中 | ウォレットポップアップあり版をフォールバックとして維持、セッションキーは加点要素と位置づける |
| ブラウザ proof 生成が 3 秒超で UX に影響 | 中 | Web Worker 移行 (C2-7) + proof キャッシュ (C2-4) で対応。最悪 proof は事前生成済みサンプルを使用 |
| dungeon_position.circom 実装が想定超え | 中 | C2-5 を 10h (増枠済み) として確保。MagicBlock TEE は非採用確定だが、proof生成デモはサンプルで代替可能 |
| デモ動画クオリティが不十分 | 高 | 5/7 完成を目標とし、5/8–5/9 に再撮影バッファを確保 |
| クローズドベータのフィードバックで大きなバグ発見 | 中 | ベータ開始を 5/4 に前倒し、5/8–5/9 を修正バッファとして確保 |

---

## 時間配分サマリ (8h 再配分後)

| セクション | 旧見積 | 変更 | 新見積 |
|-----------|--------|------|--------|
| C-1 Solana | 41h | C1-2 +2h (MagicBlock 増枠) | **43h** |
| C-2 ZK | 28h | C2-5 +4h, C2-6 +2h, C2-8 削除 (-2h) | **32h** |
| C-3 Demo | 28h | 変更なし | **28h** |
| C-4 Tokenomics | 22h | C4-9 削除 (-2h) | **20h** |
| C-5 Sponsor | 16h | C5-6 削除 (-3h), C5-7 削除 (-3h) | **10h** |
| C-6 GTM | 19h | C6-5 削除 (-2h) | **17h** |
| **合計** | **154h** | **-8h (Pyth/Sonic) +8h (再配分)** | **150h** |

---

*このドキュメントは 2026-04-20 に判断 6 件を反映して更新しました。*

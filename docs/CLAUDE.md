# 0xARK — CLAUDE.md

> ZKで全てが隠された島のカード奪い合いPvPゲーム — Solana onchain

## 開発哲学 (最優先ルール)

1. **ゲーム体験が第一優先** — 技術的に面白くても、プレイ体験として面白くなければ採用しない
2. **技術はその技術にしかできないことをやる** — BlockchainはNFT所有権と不正防止、ZKは秘匿、AI agentは人間にできない行動、x402はマイクロペイメント。技術のためだけに使わない
3. **設計が成立しないときは必ず議論する** — 実装前に不備・矛盾を洗い出してr0zeに確認。一人で判断して進めない

---

## Core Narrative

0xARK positions itself as a next-gen Fully On-Chain Game on Solana, integrating ZK for information asymmetry, MagicBlock ER for low-latency execution, AI agents competing via x402 micropayments, and player-to-player microtransactions through x402.

---

## プロジェクト概要

**コンセプト**: デッキ構築型カードバトル × Solana NFT PvP  
**オーナー**: r0ze (株式会社雪風)  
**連絡**: Telegram @r0ze998 (chat_id: 5126103942)

## リポジトリ構成

```
/Users/hiroprotagonist/Projects/0xark/
├── solana/client/index.html   # メインゲームクライアント (Vanilla JS + PixiJS v7)
├── solana/client/onchain.js   # Solana/Anchor連携
├── contracts/src/             # Anchor smart contract
├── zk/                        # Circom ZKサーキット
├── multiplayer/               # WebSocketサーバー
├── x402/                      # AIエージェント (x402 broker)
├── GDD-v0.3.md                # 旧ゲームデザインドキュメント (参考)
└── TASKS.md                   # タスク管理
```

**Live demo**: https://r0ze998.github.io/0xark  
**GitHub**: https://github.com/r0ze998/0xark

## 技術スタック

| レイヤー | 技術 | ゲーム内での役割 |
|---------|------|----------------|
| Smart Contract | Anchor (Solana) | カードNFT発行・Prize Pool管理 |
| Program ID | `5i37jWBiA7bV9XmokyDWHQxjJ5s1sBnSEkPSB4J2XfmN` | devnet |
| Game Client | Vanilla HTML/JS + PixiJS v7 WebGL | フロントエンド |
| ZK (Circom) | Poseidon circuit + browser snarkjs | 手札コミット-リビール（情報非対称） |
| AI Agent | x402 broker | カードバトル自動対戦・x402 scout-peek |
| x402 | マイクロペイメント | ガチャ支払い |
| Multiplayer | WebSocket | リアルタイムPvP |

---

## GDD v1.0 (現行設計)

### 🎯 勝利条件
60種のカードを全て集める → Prize Poolのすべてのトークンを総取り

### 💰 ゲーム参加
Wallet接続 → 0.5 SOL デポジット → スターターカード3枚支給 → はじまりのまちへ

---

### 🏙 はじまりのまち（安全地帯）
- NFTカードマーケットプレイス（売買）
- トレードショップ（欲しいカード指定してオファー）
- ガチャ（SOL / x402 で支払い）
- AI案内人（ルール説明・初回ガイド）

---

### ⚔️ カードバトル（デッキ構築型）
- 手持ちのカードからデッキを構築してバトル
- 詳細ターン構造: **TBD**
- 敗北時: カード1枚を失う（取り方の詳細: **TBD**）

---

### 🃏 カード仕様
- 全60種、5段階レアリティ
- 種類: 攻撃 / 守備 / 逃走 / 魔法 / 回復
- Solana NFTとして発行（所有権オンチェーン）

### カード入手方法
1. バトル勝利（AI agent / プレイヤーから奪う）
2. ガチャ
3. マーケットプレイスで購入
4. プレイヤー間トレード
5. 錬成（設計: **TBD**）

---

## TBD（後で設計・議論が必要）

- カードバトルの詳細ターン構造・リソース設計
- 敗北時のカード喪失ロジック
- デッキ枚数制限
- 60種カードリスト（属性・効果・レアリティ内訳）
- 錬成レシピ
- NFTミントのタイミング（購入時? ドロップ時?）
- Prize Pool清算ロジック（複数コンプした場合は？）

---

## MagicBlock ER 本番化済み (Phase 10 — 2026-04-28)

| 項目 | 内容 |
|------|------|
| 本番UI接続 | `index.html` の `nav:matchmaking` が `startGameMB()` を呼び出す |
| ERステータス | バトル開始時にバナー表示 (緑: ER ACTIVE / 橙: ER UNAVAILABLE) |
| フォールバック | delegation失敗時は `_mbMode=false` でbase layer透過動作 |
| ルーター | `https://devnet-router.magicblock.app` |
| E2Eテスト | `solana/oxark/t15-e2e.js` — commit→reveal→undelegateサイクル検証 |
| 実行方法 | `DEVNET_RPC=https://api.devnet.solana.com node solana/oxark/t15-e2e.js` |

`startGameMB()` の戻り値: `{ sig: string, erActive: boolean }`  
`getMbMode()` でERモードの現在値を取得可能 (`window.oxarkOnchain.getMbMode()`)

---

## 開発ルール

- コード変更前に必ず現在のバージョン確認
- バージョンは v29 → v30 のようにインクリメント (現在: v100)
- コミットメッセージ: `vXX: <変更内容>`
- メインファイル: `index.html`（ルート — UIエントリポイント）
- GDD変更時はこのCLAUDE.mdも必ず更新

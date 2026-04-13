# 0xARK — CLAUDE.md

> ZKで全てが隠された島のカード奪い合いPvPゲーム — Solana onchain

## 開発哲学 (最優先ルール)

1. **ゲーム体験が第一優先** — 技術的に面白くても、プレイ体験として面白くなければ採用しない
2. **技術はその技術にしかできないことをやる** — BlockchainはNFT所有権と不正防止、ZKは秘匿、AI agentは人間にできない行動、x402はマイクロペイメント。技術のためだけに使わない
3. **設計が成立しないときは必ず議論する** — 実装前に不備・矛盾を洗い出してr0zeに確認。一人で判断して進めない

---

## プロジェクト概要

**コンセプト**: デッキ構築型カードバトル × ローグライクダンジョン × Solana NFT PvP  
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
| Program ID | `2gMYzenV6HQoTJA2899XxnLgzTbaWdVmegLqL7nMpVS3` | devnet |
| Game Client | Vanilla HTML/JS + PixiJS v7 WebGL | フロントエンド |
| ZK (Circom) | Poseidon circuit + browser snarkjs | ダンジョン内位置秘匿 |
| AI Agent | x402 broker | ダンジョン内の強力な敵 |
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

### 🏚 ダンジョン
- ローグライク風ランダムマップ、フロア制
- 深いほどレアカード出やすい
- **ZK**: 他プレイヤーの位置は自分の視野内に入るまで不明
- AI agentとプレイヤーが敵として出現 → エンカウントでカードバトル
- フロアクリア → カード1枚獲得
- 脱出: クリアで通常脱出 / 脱出カード使用でいつでも脱出

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
2. ダンジョンフロアクリア報酬
3. ガチャ
4. マーケットプレイスで購入
5. プレイヤー間トレード
6. 錬成（設計: **TBD**）

---

## TBD（後で設計・議論が必要）

- カードバトルの詳細ターン構造・リソース設計
- 敗北時のカード喪失ロジック
- デッキ枚数制限
- ダンジョンフロア数・難易度曲線
- 60種カードリスト（属性・効果・レアリティ内訳）
- 錬成レシピ
- NFTミントのタイミング（購入時? ドロップ時?）
- Prize Pool清算ロジック（複数コンプした場合は？）

---

## 開発ルール

- コード変更前に必ず現在のバージョン確認
- バージョンは v29 → v30 のようにインクリメント (現在: v77)
- コミットメッセージ: `vXX: <変更内容>`
- メインファイル: `solana/client/index.html`（大きいファイル、慎重に編集）
- GDD変更時はこのCLAUDE.mdも必ず更新

# x402 統合設計 — 0xARK

> **更新日**: 2026-04-20 (v470)  
> **対象**: Phase C x402 経済圏設計

---

## ナラティブでの位置付け

x402 は 0xARK の **情報経済圏**を支えるプロトコル。
ゲーム内の「価値ある情報」と「AI の行動力」をマイクロペイメントで取引可能にする。
USDC/SOL による決済がウォレットポップアップなしで瞬時に走り、
プレイヤー間・Player vs AI の経済ループを実現する。

---

## x402 タッチポイント一覧

### カテゴリー 1: Information Marketplace (情報売買)

| # | 取引タイプ | 説明 | 価格感 | 実装優先 |
|---|-----------|------|--------|---------|
| 1 | **Scout peek** | 他プレイヤーのダンジョン内エリア情報を購入 | ~0.01 USDC | **必須** |
| 2 | Floor map reveal | ダンジョンフロアのマップ全体開示 | ~0.05 USDC | 設計のみ |
| 3 | Card location hint | 特定カードの所在エリアヒント | ~0.02 USDC | 設計のみ |
| 4 | Battle history | 他プレイヤーの過去バトル履歴 | ~0.01 USDC | 設計のみ |

### カテゴリー 2: Agent Economy (AI エージェント参戦)

| # | 取引タイプ | 説明 | 価格感 | 実装優先 |
|---|-----------|------|--------|---------|
| 5 | **Agent hire** | AI エージェントをダンジョンに派遣してカード収集 | ~0.1 USDC/回 | **必須** |
| 6 | Agent bounty | 特定プレイヤーへの攻撃依頼 | ~0.2 USDC | 設計のみ |
| 7 | Agent subscription | 24h 連続稼働エージェント | ~1 USDC/日 | 設計のみ |
| 8 | Guild agent pool | 複数エージェントの共有契約 | ~0.5 USDC/時 | 設計のみ |

### カテゴリー 3: Card P2P (プレイヤー間取引)

| # | 取引タイプ | 説明 | 価格感 | 実装優先 |
|---|-----------|------|--------|---------|
| 9 | **Card P2P trade** | リアルタイムカード売買 (NFT エスクロー) | 自由設定 | **必須** |
| 10 | Card auction | タイムリミット付きカードオークション | 自由設定 | 設計のみ |
| 11 | Card rental | 1 ゲームセッション限定貸し出し | ~0.05 USDC | 設計のみ |
| 12 | Deck template sale | デッキ構成情報の販売 | ~0.02 USDC | 設計のみ |

### カテゴリー 4: Premium Services (課金サービス)

| # | 取引タイプ | 説明 | 価格感 | 実装優先 |
|---|-----------|------|--------|---------|
| 13 | Fast lane entry | 次シーズン優先参加権 | ~0.1 USDC | 設計のみ |
| 14 | Cosmetic gacha | カードスキン・フレームのみ | ~0.05 USDC | 設計のみ |
| 15 | Analytics dashboard | 自分のゲーム統計詳細 | ~0.1 USDC/月 | 設計のみ |

---

## 実装優先順位

### Phase C 必須実装 (3 件)

#### 1. Scout peek (C7-1) — 4/24–4/25 実装

```
プレイヤー A → x402 支払い (~0.01 USDC)
    ↓
x402 agent-broker.js → 検証・転送
    ↓
ダンジョン情報 API → プレイヤー A のエリア範囲外情報を返却
    ↓
フロントエンド: fog-of-war の一部が一時的に開示
```

**実装対象ファイル**:
- `x402/agent-broker.js` — Scout peek エンドポイント追加
- `solana/client/src/07-screens.js` — dungeon HUD に Peek ボタン追加
- `multiplayer/server.js` — ダンジョン位置情報 API 追加

#### 2. Agent hire (C7-2) — 4/28 実装

```
プレイヤー → x402 支払い (~0.1 USDC)
    ↓
x402 broker → AI agent bot を 1 ゲームセッション起動
    ↓
AI agent → Claude API でアクション決定 → commit_action / reveal_action 実行
    ↓
バトル結果 → プレイヤーに通知 (WebSocket)
```

**実装対象ファイル**:
- `x402/agent-broker.js` — Agent hire エンドポイント + bot 起動
- AI agent bot モジュール (C8-1 と共用)

#### 3. Card P2P (C7-3) — 4/29 実装

```
売り手 → カード NFT をエスクロー PDA にロック
    ↓
買い手 → x402 支払い → 即時決済
    ↓
エスクロー PDA → NFT 転送 + SOL 転送
```

**実装対象ファイル**:
- `programs/oxark/src/instructions/` — card_escrow.rs 追加
- `x402/agent-broker.js` — P2P マッチング API

### Phase C 設計のみ (Tokenomics paper に記載)

取引タイプ 2–4, 6–8, 10–15 は設計書として `docs/TOKENOMICS.md` に記述。
実装は Phase D 以降。

---

## 手数料モデル

| 取引タイプ | 手数料率 | 受取先 |
|-----------|---------|--------|
| Information Marketplace | 5% | Protocol treasury |
| Agent Economy | 固定 0.01 USDC | Protocol treasury |
| Card P2P | 2.5% | Protocol treasury + Seller |
| Premium Services | 0% (全額サービス側) | — |

---

## 技術スタック

- **決済プロトコル**: x402 (HTTP 402 Payment Required)
- **通貨**: USDC on Solana devnet
- **ブローカー**: `x402/agent-broker.js` (既存、拡張)
- **AI**: Claude API (Haiku 4.5 for action decisions)
- **エスクロー**: Solana PDA (card_escrow instruction)

---

## ナラティブでの訴求ポイント

1. **AI が x402 で自律的に経済活動** → AI agent が自分で支払いして情報収集
2. **プレイヤー間の情報非対称性が価値** → ZK で隠した情報が x402 で売れる
3. **ゼロクリック決済** → ウォレットポップアップなしのマイクロ取引
4. **完全オンチェーン経済** → Prize Pool + x402 + NFT の 3 層が連動

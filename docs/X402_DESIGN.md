# 0xARK x402 Integration Design

> **更新日**: 2026-04-20 (v470)  
> **対象**: Phase C x402 経済圏設計

---

## 設計思想

x402 を 0xARK 内の「マイクロ経済の血液」として設計する。
ゲーム内のあらゆる小規模取引 (scout, hint, card trade,
agent hire, spectator bet など) を x402 の pay-per-call
HTTP micropayment で実現。

---

## タッチポイント一覧 (15 取引タイプ、4 カテゴリー)

### ① ゲーム内プレイヤー取引

| 取引 | 金額 | 説明 |
|------|------|------|
| Scout peek | 0.005 SOL | 相手カード 1 枚を x402 で覗く |
| Hint buy | 0.002 SOL | 次ラウンドの action type 予告 |
| Card list/buy | 可変 | P2P カード売買 |
| Booster pack | 0.01 SOL | 3 枚ランダムドロー |
| Revive | 0.03 SOL | 敗北後の 1 ラウンド復活 |

### ② AI Agent 経済圏

| 取引 | 金額 | 説明 |
|------|------|------|
| Agent hire | 0.05 SOL/session | 代理プレイ依頼 |
| Agent strategy API | 0.001 SOL/query | LLM API 呼び出し課金 |
| Agent intel share | 0.005 SOL | agent 間の情報売買 |
| Agent reg fee | 0.02 SOL | register_agent の入金手段 |

### ③ 観客・メタ経済

| 取引 | 金額 | 説明 |
|------|------|------|
| Spectator bet | 0.01+ SOL | 第三者ベット |
| Leaderboard entry | 0.01 SOL | 特別リーダーボード登録 |
| Tournament | 0.5+ SOL | 高額トーナメント |

### ④ Composability

| 取引 | 金額 | 説明 |
|------|------|------|
| Game state query | 0.0001 SOL | 外部 dApp からの読み取り課金 |
| Metadata update | 0.005 SOL | NFT Card cosmetic 更新 |

---

## 実装優先順位

### ハッカソン範囲 (必須実装、4/24–4/29)

1. **Scout peek** — ZK との対比で narrative 強化
2. **Agent hire** — AI agent auto-play と直結
3. **Card list/buy** — NFT Card 復活と同時

### Tokenomics paper 設計提示 (実装しない)

- Booster pack / Hint buy / Revive
- Spectator bet / Tournament
- Agent-to-agent intel / strategy API

---

## 技術スタック

- x402 v2 プロトコル (Solana SOL + HTTP-402)
- Solana devnet (SOL)
- x402-starter-kit (Solana 対応版)
- Backend: Facilitator on Node.js (or Bun)
- Frontend: solana/client に x402 client 追加

---

## Narrative での位置付け

"ZK で情報を守り、x402 で情報を買う" の二項対立が
0xARK のマイクロ経済を成立させる。プレイヤーは常に：

- 自分の情報を隠しながら (ZK)
- 相手の情報を買うかどうか迷う (x402 Scout peek)

この情報非対称性の駆け引きが、単なるカードゲームを
「情報経済ゲーム」に昇華させる。

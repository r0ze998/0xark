# 0xARK

> **期間限定オンチェーンPvPカード奪い合いゲーム on Starknet**

ZKで手札を隠し、呪文で奪い合い、AIエージェントに戦略を託す。誰が何を持っているかは見えない。信頼できるのはコードだけ。

---

## What is 0xARK?

プレイヤーは期間限定の「箱舟（ARK）」に放り込まれ、100枚の指定カードを集めてクリアを目指す。カードは探索やトレードで手に入るが、呪文で他プレイヤーから奪うこともできる。

- 🃏 **手札はZKで秘匿** — 誰が何を持ってるか分からない
- ⚔️ **呪文で奪い合い** — 窃盗、強奪、偵察、防壁
- 🤖 **AIエージェントが分身** — 寝てる間もエージェントが防御・交渉・探索
- 💰 **x402で自律経済** — エージェント間の情報売買・傭兵・保険が勝手に生まれる
- ⏳ **シーズン制** — 2〜4週間の期間限定。終了時に上位者だけがカードを永続NFTとして持ち出せる

---

## Core Experience

> 「あいつが持ってるはず」という推理と、「奪われるかもしれない」という緊張が常に共存する。

```
探索（ARKを歩く、街を訪れる）
  ↓
遭遇（アイテム / 他プレイヤー / エージェント）
  ↓
判断（戦う / 逃げる / 交渉する / 呪文で奪う）
  ↓
獲得 or 喪失（カードが増える or 減る）
  ↓
管理（バインダー整理、呪文温存、次の行動計画）
  ↓
探索へ戻る
```

---

## Card System

### バインダー
- **指定ポケット**: 100スロット（No.000〜099）。対応するカード1枚のみ収納可能
- **フリーポケット**: 45スロット。呪文・余剰カードを自由に格納
- 100枚コンプ = **ゲームクリア**

### カード化ルール
- アイテム入手 → 即カード化（グローバル限度枚数内なら）
- カード化後、**Nブロック以内にバインダーに格納**しないと自動でアイテム化（不可逆）
- 「実体化（ゲイン）」するとアイテムとして使えるが、**ランクB以上は二度とカード化不可**
- 番号違いの指定ポケットに入れると**カードは破壊される**

### グローバル限度枚数
各カードはゲーム全体で存在できる枚数がスマートコントラクトで強制される。**誰にも変更不可。**

| ランク | 限度枚数 | 性質 |
|--------|---------|------|
| SS | 1〜5枚 | 独占可能。狙われる覚悟が必要 |
| S | 6〜13枚 | 少数精鋭。情報戦の対象 |
| A | 11〜30枚 | レア。トレード価値が高い |
| B〜E | 20〜120枚 | 中堅〜実用的 |
| F〜H | 130枚〜 | コモン |

### ゲイン待ち（待機キュー）
限度枚数がMAXの時にアイテムを入手 → オンチェーンキューに入る → 誰かがカードを消費した瞬間、先着順で自動カード化。

---

## Spells

| 呪文 | 効果 | 対抗 |
|------|------|------|
| **窃盗** | 相手のフリーポケットからランダム1枚奪取 | 防壁 |
| **強奪** | 相手の指定ポケットから狙い撃ち | 堅牢 |
| **偵察** | 相手のバインダー内容を一部覗く | — |
| **防壁** | 呪文攻撃を1回無効化 | — |
| **堅牢** | 指定カード1枚を一定期間奪取不可 | — |
| **交換** | 双方合意でカード交換 | — |

> 呪文の使用履歴はオンチェーンで**公開**。手札はZKで**秘匿**。だから推理が成立する。

---

## Why Blockchain?

0xARKは「ブロックチェーンゲーム」ではなく「ブロックチェーンでしか作れないゲーム」。

| 要素 | なぜオンチェーンか |
|------|------------------|
| カード限度枚数 | 運営が改ざん不可能 |
| ZK手札秘匿 | サーバーが不正できない。プレイヤー自身が証明を生成 |
| AIエージェント | パーミッションレス。運営がBANできない |
| x402決済 | $0.001単位のマイクロ決済が成立 |
| 持ち出しNFT | ゲーム終了後も永続。運営が消せない |

**「信頼不要の対戦環境」— 運営を信頼しなくても、ゲームが公正に動くことが数学的に保証される。**

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Smart Contract | Cairo (Starknet) |
| Game Framework | Dojo (ECS) |
| ZK | Starknet native STARK proofs |
| AI Agent | Natural language → Torii → onchain action |
| Payment | x402 (agent-to-agent micropayments) |
| Wallet | Cartridge Controller (session keys) |
| Frontend | React |
| Deploy (test) | Slot |
| Deploy (prod) | Starknet Mainnet |

---

## Season Design

- **1 Season = 2〜4 weeks**
- Entry requires token stake
- **Win**: First to collect all 100 designated cards
- **Timeout**: Card count ranking
- **Carry-out**: Top players take 1〜3 cards as permanent NFTs
- Everything else resets. NFTs persist forever.

---

## Autonomous World Design

Every design decision passes through 3 filters:

1. **Composability** — Can third parties extend it without permission?
2. **Emergence** — Can gameplay arise that designers didn't predict?
3. **Blockchain necessity** — Is it impossible on Web2?

→ Deep dive: [GDD.md](GDD.md) Section 10

---

## Roadmap

### Phase 1: Core Prototype ← **now**
- [x] Game Design Document
- [x] Autonomous World design (AI Agent / x402 / ZK / Composability)
- [ ] Minimal prototype (3 players, 5 cards, 3 spells, commit-reveal)
- [ ] Core experience validation

### Phase 2: Expansion
- [ ] 100 card types + full spell set
- [ ] Map & exploration
- [ ] Full ZK implementation
- [ ] AI Agent integration
- [ ] Closed playtest (10-20 players)

### Phase 3: Season 1
- [ ] Frontend
- [ ] x402 agent economy
- [ ] Starknet Mainnet deploy
- [ ] Community (Discord)
- [ ] Season 1 launch

---

## Links

- **GDD**: [GDD.md](GDD.md)
- **Inspiration**: Greed Island (HxH) × Dark Forest × Starknet ZK
- **Built by**: [r0ze](https://x.com/r0ze_____) & neo

---

*Design Philosophy: 触って面白い最小限のものを、ブレないビジョンで磨く。説明しない、足さない、削る。*

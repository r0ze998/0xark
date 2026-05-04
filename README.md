# 0xARK

> Card battle on Solana, with ZK proofs, x402 micropayments, and AI agents.

[![Live Demo](https://img.shields.io/badge/Live%20Demo-Online-success)](https://r0ze998.github.io/0xark/)
[![Devnet](https://img.shields.io/badge/Solana-Devnet-9945FF)](#-live-on-chain-evidence)
[![License](https://img.shields.io/badge/License-MIT-blue)](LICENSE)

---

## 🎮 Live Demo

🔗 https://r0ze998.github.io/0xark/

Try it now:
1. Connect Phantom wallet (Devnet)
2. Get devnet SOL: https://faucet.solana.com/
3. Register Waitlist (0.5 SOL deposit)
4. Receive 5 starter cards
5. Battle, burn, evolve, claim prizes

Live multiplayer server: https://oxark-multiplayer.fly.dev

---

## 🏆 Hackathon Submission

**Colosseum Frontier 2026** (締切 2026-05-11)
- Track: Gaming + AI
- Developer: [r0ze](https://twitter.com/r0ze_____) (Yukikaze)
- 4ヶ月ソロ開発

---

## ⚡ 30秒で分かる 0xARK

- 🎴 **60枚のNFTカード** で **14日間の on-chain TCG**
- 🔐 **ZK proofs** で手札秘匿 + 不正検証 (Solana で初実装級)
- 💰 **x402 micropayments** (HTTP 402 standard) で 0.005 SOL から peek/draw
- 🤖 **AI agents** (Claude Haiku 4.5) が戦略アドバイス + autonomous battle
- 🔥 **Burn / Evolve / Imprint** で NFT が永久変化

---

## 🔗 Live On-Chain Evidence

| Event | TX hash | Explorer |
|---|---|---|
| GameWorld PDA init | `4EUynBDn…` | [Solana Explorer](https://explorer.solana.com/tx/4EUynBDnBvXQ7vYkWdvyvWNagocC18xBwpvo2k2zPZo5paHTczPCWQaKV2aXUK625y1vqwBndxfqj2WZVcJE4ra5?cluster=devnet) |
| Anchor program upgrade (ZK Phase 2) | `2Wu8wQCd…` | [Solana Explorer](https://explorer.solana.com/tx/2Wu8wQCdRZQwhbx4rpwB6m59GanjMoUPoKGF8GYGM6vgoAdaUZybRtQszeRwPtm3mfyERSbaxgkmo6v1oBMQDLcR?cluster=devnet) |
| ZK proof verify e2e | `5WoVAmNC…` | [Solana Explorer](https://explorer.solana.com/tx/5WoVAmNCB8ttyoybigKZAcpU3PQavJApTuLuXr9GQXpNhBTSVsbv8CQFjS58x1HkXGuanjMun3devi3cyk2irJqf?cluster=devnet) |

Anchor program: [`5i37jWBiA7bV9XmokyDWHQxjJ5s1sBnSEkPSB4J2XfmN`](https://explorer.solana.com/address/5i37jWBiA7bV9XmokyDWHQxjJ5s1sBnSEkPSB4J2XfmN?cluster=devnet) (devnet)

---

## 🧪 Tech Stack

### Core
- Solana (Anchor, devnet → mainnet 2027年1月)
- Circom 2.x + snarkjs (Groth16 BN254)
- Node.js + WebSocket (Fly.io)
- Phantom wallet adapter
- Vanilla JS + GBA palette (sprite-seas デザイン)

### Web3 Innovations
- ZK proof on-chain verify via `alt_bn128_pairing` precompile
- x402 (HTTP 402) SOL micropayment, Coinbase x402 spec 準拠
- NFT mechanics: Burn, Evolve, Imprint (on-chain 永続)

### AI
- Claude Haiku 4.5 via Anthropic API
- AI Strategy Advisor (`/x402/ai-strategy-advice` endpoint)
- AI Move Delegation (`/x402/ai-move` endpoint)

---

## 🏗 Architecture

```
┌────────────────────────────────────────────────────┐
│  Frontend (GitHub Pages)                            │
│  - Phantom wallet                                   │
│  - 60-card vault grid + 4 battle screens           │
│  - 4 rarity frames (sprite-seas design)            │
└──────────────────┬──────────────────────────────────┘
                   │
       ┌───────────┴───────────┐
       │                       │
       ▼                       ▼
┌──────────────┐     ┌──────────────────┐
│ ZK Layer     │     │ Multiplayer      │
│ - Circom     │     │ Server           │
│ - snarkjs    │     │ - WebSocket      │
│ - Groth16    │     │ - x402 endpoint  │
└──────┬───────┘     │ - Redis          │
       │             │   (replay防止)   │
       │             └─────────┬────────┘
       │                       │
       └───────────┬───────────┘
                   ▼
┌──────────────────────────────────────────┐
│ Anchor Program (Solana devnet)            │
│ Program ID: 5i37jW...XfmN                 │
│ - register_waitlist (0.5 SOL deposit)     │
│ - burn_card / evolve_cards                │
│ - grant_imprint / claim_battle_loot       │
│ - claim_prize_v2 / check_legendary        │
│ - verify_zk_proof (alt_bn128 pairing)     │
│ - 18+ PDAs, 52 instructions               │
└────────────────────────────────────────────┘
                   ▲
                   │
          ┌────────┴────────┐
          │ AI Agent        │
          │ Claude          │
          │ Haiku 4.5       │
          └─────────────────┘
```

---

## 🎯 Game Design

### 14-day 1-shot Season
- 60 unique cards across 6 clans (Knight / Merchant / Pirate / Scholar / Monk / Engineer)
- 6 Legendaries with unique personalities (Conqueror / Patron / Phoenix / Detective / Hermit / Sage)
- 14 days to collect, win, burn, evolve

### Tier Prize Distribution

| Tier | Cards | Reward Share |
|---|---|---|
| T1 | 60 cards (full collection) | 50% |
| T2 | 50–59 cards | 25% |
| T3 | 30–49 cards | 15% |
| T4 | 10–29 cards | 8% |
| T5 | 1–9 cards | 2% |

### v3+ Mechanics
- **Burn**: 永久消失 + ability 効果 (例: "Burn: deal 3 damage to all enemy cards")
- **Evolve**: 2枚合体 → 1枚 child card 生成
- **Steal**: バトル勝利で敗者から1枚奪取 (`claim_battle_loot`, SlotHashes random)
- **Imprint**: 勝利の刻印が Legendary card に永久記録

---

## 🔬 ZK Proof System

### Circuit (`hand_commitment.circom` v2)
- 5枚 cards + salt + pubkey + round → Poseidon commit
- Range check: `1 <= card_id <= 60`
- Uniqueness check: 5枚すべてユニーク
- 2040 constraints (BN254)

### On-Chain Verify
- `verify_zk_proof` Anchor instruction
- `alt_bn128_pairing` precompile 使用
- `ZkProofRecord` PDA で replay 防止
- pubkey + round の整合性 on-chain 照合

### Battle Flow Active
- preparation: client 側で proof 生成 (~250ms)
- reveal: server 経由で on-chain verify
- 不正 reveal は ZK 失敗で reject

詳細: [`docs/ZK_REVIEW_VERIFICATION.md`](docs/ZK_REVIEW_VERIFICATION.md)

---

## 💰 x402 Micropayment System

### 13 endpoints

| Endpoint | Price |
|---|---|
| `/x402/match-battle` | 0.001 SOL |
| `/x402/peek-vault-size` | 0.0005 SOL |
| `/x402/peek-vault-content` | 0.005 SOL |
| `/x402/draw-extra` | 0.01 SOL |
| `/x402/ai-strategy-advice` | 0.003 SOL |
| `/x402/ai-move` | 0.005 SOL |
| `/x402/co` `/re` `/hc` `/hr` `/pa` `/rs` `/me` | 0.0001 SOL |

### Security (Phase A + B クローズ済み)
- **Replay防止**: Redis 永続化 (sig + nonce、TTL 付き)
- **Price hardcode**: client 側 `EXPECTED_PRICES` (server 宣言値を検証)
- **Memo nonce 強制**: `X402_REQUIRE_MEMO=true` デフォルト
- **Memo format 統一**: `endpoint=path;nonce=uuid;v=1`
- **recipient allowlist** + dev-bypass production block

詳細: [`docs/X402_INTEGRATION_LOG.md`](docs/X402_INTEGRATION_LOG.md)

---

## 🤖 AI Agent

Claude Haiku 4.5 を使った2つの AI 機能:

### Strategy Advisor
- ユーザーの場 + 相手の見える情報から推奨アクション提示
- `primaryAction` + `alternativeActions` + `reasoning` JSON
- 0.003 SOL micropayment

### AI Move Delegation
- AI が autonomous で battle 進行
- agent vs agent battle 可能
- 0.005 SOL micropayment

---

## 🗺 Roadmap

### Devnet (現在 → 2026年)
- ✅ 2026-05: Hackathon submission (Colosseum Frontier)
- ✅ 2026-05: ZK Phase 1–3 + devnet e2e
- ✅ 2026-05: x402 Critical A + B (全クローズ)
- 🔲 2026-06: Public preparation (Discord / Twitter / landing page)
- 🔲 2026-07: Waitlist 14-day Season 1 (devnet)
- 🔲 2026-08–12: Season 2/3 (devnet) + audit + legal

### Mainnet (2027年〜)
- 2027-01: Mainnet Season 1
- 以降: 継続的ゲーム展開

---

## 🛡 Audits

| Source | Score | Critical 対応 |
|---|---|---|
| Internal Audit | 73 issues found | 主要対応済 |
| GPT — ZK Proof | 7.2/10 → 9.0+/10 | 5/5 Critical resolved |
| GPT — x402 | 7.2/10 → 9.0+/10 | 5/5 Critical resolved |
| Grok — Overall | 89/100 | Top 12–18 圏 |

詳細:
- [`docs/COMPREHENSIVE_AUDIT.md`](docs/COMPREHENSIVE_AUDIT.md)
- [`docs/ZK_REVIEW_VERIFICATION.md`](docs/ZK_REVIEW_VERIFICATION.md)
- [`docs/x402-review-bundle.md`](docs/x402-review-bundle.md)

---

## 📊 Test Coverage

| Suite | Count |
|---|---|
| Anchor (Rust) | 35 tests |
| Client (JS) | 110+ tests |
| ZK e2e | 6 tests + devnet integration |
| x402 security | 54 tests (Phase A + B) |
| **合計** | **200+ passing** |

---

## 📚 Documentation

| Doc | 内容 |
|---|---|
| [`docs/game-design-v2.md`](docs/game-design-v2.md) | Game design specification |
| [`docs/COMPREHENSIVE_AUDIT.md`](docs/COMPREHENSIVE_AUDIT.md) | Internal security audit (73 items) |
| [`docs/V3_PLUS_INTEGRATION_LOG.md`](docs/V3_PLUS_INTEGRATION_LOG.md) | v3+ mechanics integration |
| [`docs/SERVER_WIRING_PLAN.md`](docs/SERVER_WIRING_PLAN.md) | Multiplayer server architecture |
| [`docs/ONCHAIN_INTEGRATION_LOG.md`](docs/ONCHAIN_INTEGRATION_LOG.md) | Anchor program deployment log |
| [`docs/X402_INTEGRATION_LOG.md`](docs/X402_INTEGRATION_LOG.md) | x402 micropayment implementation |
| [`docs/ZK_REVIEW_VERIFICATION.md`](docs/ZK_REVIEW_VERIFICATION.md) | ZK proof system verification |
| [`docs/POST_HACKATHON_ROADMAP.md`](docs/POST_HACKATHON_ROADMAP.md) | Post-submission roadmap |

---

## 🚀 Local Development

```bash
# Clone
git clone https://github.com/r0ze998/0xark.git
cd 0xark

# Anchor program
cd solana/oxark
anchor build
anchor deploy --provider.cluster devnet

# Client
cd ../client
npx serve . -l 4200
# open http://localhost:4200

# Multiplayer server
cd ../../multiplayer
npm install
node server.js  # localhost:3500

# AI Agent (optional)
cd ../tools/ai-agent
npm install
npm test
```

---

## 👤 About

Built solo by **r0ze** (4ヶ月) under Yukikaze.

- Twitter: [@r0ze_____](https://twitter.com/r0ze_____)
- GitHub: [@r0ze998](https://github.com/r0ze998)
- Other projects: ConsensusOS, ZeroGarden

---

## 📝 License

[MIT](LICENSE)

---

<div align="center">

### Season 1 launches 2026-07 (devnet) · Mainnet 2027-01

**[Play now ▶](https://r0ze998.github.io/0xark/)**

</div>

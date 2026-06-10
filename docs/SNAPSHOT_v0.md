# 0xARK — 現在地スナップショット v0

**作成日**: 2026-06-08  
**方針**: コード変更なし・状態把握のみ。推測で埋めず、確認できないものは「未確認」と明記。

---

## A. 開発・技術面

### A1. テスト状況

#### Rust (cargo test) — 2026-06-08 実行結果

| テストスイート | Pass | Fail | Ignored |
|---|---|---|---|
| lib unit tests (IDL print + unit) | 59 | 0 | 0 |
| damage_calc integration | 1 | 0 | 0 |
| test_game.rs (LiteSVM integration) | 11 | 0 | 1 |
| test_initialize.rs | 1 | 0 | 0 |
| v3_plus module tests | 35 | 0 | 0 |
| doc-tests | 0 | 0 | 0 |
| **合計** | **107** | **0** | **1** |

**Ignored テスト**:
- `test_verify_zk_proof_valid` — ZK proof のテスト用フィクスチャが未整備のため skip（`#[ignore]`）

**結論**: ✅ ビルド・テスト全通過。落ちているテストなし。

#### JS テスト

| ファイル | 状況 |
|---|---|
| `client/test/x402-co-re-flow.test.js` | ❌ 実行不可 — `require()` を使用、`package.json` の `"type":"module"` と非互換 |
| `client/test/x402-memo.test.js` | ❌ 実行不可 — 同上 |

**結論**: JS テストは CJS/ESM 不整合で実行不可。テストコードそのものは古く、現在の実装との整合性も未確認。

---

### A2. Critical 脆弱性 C1–C7 — 修正状況

| # | 脆弱性 | 状況 | 根拠 |
|---|---|---|---|
| C1 | `claim_prize_v2` 二重請求 | ❌ **未着手** | `handle_claim_prize_v2` は transfer 前後で `deposit_amount` をゼロ化しない（`claim_prize_v2.rs` 全体確認）|
| C2 | `register_waitlist` 任意 recipient | ❌ **未着手** | `prize_pool` / `ops_treasury` に `/// CHECK: validated by address constraint` とあるが実際の Anchor constraint 属性なし（`register_waitlist.rs:33-38`）|
| C3 | `resolve_round` remaining_accounts | ⚠️ **一部対応** | `account_info.owner == &crate::ID` のみ（`resolve_round.rs:409`）。PDA シード検証なし — 同一 program オーナーの任意アカウントを渡せる |
| C4 | `claim_battle_loot` loser 未検証 | ❌ **未着手** | `loser_pubkey` 引数は `DuelState.player_1/2` と照合されない（`claim_battle_loot.rs` 確認）|
| C5 | `burn_card` rarity caller-supplied | ❌ **未着手** | `rarity: u8` を instruction 引数として受け取り、on-chain state から読まない（`burn_card.rs:15`）|
| C6 | `record_gold_hall_win` 自己申告 | ❌ **未着手** | `RecordGoldHallWin` struct に `DuelState` アカウントなし。勝者 `player` が signer のみで誰でも自己申告可能（`legendary.rs:48-62`）|
| C7 | ZK proof クロス duel リプレイ | ❌ **未着手** | `commit_hand.rs` に `ZkProofRecord` PDA なし。`verify_zk_proof.rs` は PDA を作成するが dead code（下記 A3 参照）|

**追記 — C1 補足**: `prize_pool` のアドレス制約は `claim_prize_v2` では正しく実装済み（`constraint = prize_pool.key() == game_world.prize_pool`）。ただし二重請求防止（reentrancy / 二回呼び出し）のための `deposit_amount` ゼロ化が抜けており、`game_status == 2` 期間中に同じ player が複数回呼べる。

**7件すべて未修正**（C3 は owner チェックのみ部分対応）。

---

### A3. ZK Dispatch フロー

#### init_duel → commit_hand → reveal_hand

| ステップ | ファイル | 状況 | 詳細 |
|---|---|---|---|
| `init_duel` | `instructions/init_duel.rs` | ✅ 実装済み | DuelState PDA 初期化、player_1/2 登録 |
| `commit_hand` | `instructions/commit_hand.rs` | ✅ 実装済み | Groth16 BN254 verifier を呼び出し（`groth16_verify_hc()`）、成功時に `duel.player_1_zk_verified[round_idx] = true` |
| `reveal_hand` | `instructions/reveal_hand.rs` | ✅ 実装済み | `zk_verified[round_idx]` を gate として確認、Poseidon(15) を on-chain 再計算してコミットメント照合 (`CommitmentMismatch` error) |

**ZK コア検証フローは実装完了**。ただし C7 の通り、同一 proof の replay 防止が `commit_hand` レベルでは未実装。

#### verify_zk_proof.rs の現状

- ✅ 完全な Groth16 verifier として実装済み（公開入力検証 + ZkProofRecord PDA 作成による replay 防止）
- ❌ **Dead code** — `commit_hand` は独自に verification を行い、この instruction を呼ばない
- ❌ **クライアントから未呼び出し** — `preparation.js` / `reveal.js` に RPC 呼び出しなし
- 削除候補（攻撃面削減のため）

#### verify_dungeon_move.rs の現状

- ✅ 実装済み（dungeon 用 ZK verifier）
- ❌ **Dead code** — 現バトルフローで呼び出し元なし
- 削除候補

---

### A4. devnet デプロイ

| 項目 | 値 |
|---|---|
| Program ID (oxark) | `5i37jWBiA7bV9XmokyDWHQxjJ5s1sBnSEkPSB4J2XfmN` |
| Program ID (oxark-cards) | `236FNPRbJr5W7qeV9fJCYsxDEkruSK6fnNAipf47Mq1S` |
| Upgrade Authority | `DPMPhnVezSq5im35p4w3bC6XjpNZuuvCDVSAVxw4Q28R` |
| oxark.so 最終ビルド日時 | 2026-05-31 00:46 JST (8日前) |
| 最終 devnet deploy 日時 | **未確認** — sandbox から devnet に疎通不可。docs/devnet-program-info.md は 2026-04-27 生成（古い） |
| Cluster | devnet (`api.devnet.solana.com`) |

**T9 e2e (Phantom 2枚) の前提条件**:

| 条件 | 状況 |
|---|---|
| oxark.so を devnet に最新版で deploy | ⚠️ 未確認（5/31 ビルドが devnet に反映されているか不明）|
| `init_duel` / `commit_hand` / `reveal_hand` を叩く RPC 設定 | ✅ `onchain.js` 実装済み |
| RequestHeapFrame(262144) が先頭に入った TX | ✅ `revealHand` 実装済み |
| Phantom 2ウォレット + devnet SOL | ❌ r0ze 人力操作が必要（sandbox 不可）|
| Multiplayer WS サーバー (Fly.io) | ❌ 未デプロイ（r0ze が `fly deploy` 要）|

**T9 blockers**: Fly.io デプロイ + r0ze Phantom 操作の 2点。クライアント側コードは準備完了。

---

## B. 機能・プロダクト面

### B1. プレイヤー体験フロー

| ステップ | 状況 | 備考 |
|---|---|---|
| 起動 / ページロード | ✅ 動く | `npx serve . -l 4200` で起動。Phantom 接続確認 UI あり |
| ウォレット接続 (Phantom) | ✅ 動く | wallet adapter 実装済み。未接続時は操作ブロック済み |
| カード入手 (buy_pack) | ⚠️ 部分的 | `buy_pack` instruction は on-chain 実装済み。ただし oxark-cards program (mint) との連携は devnet で要確認 |
| 対戦エントリー (register_waitlist) | ✅ コード完成 | C2 脆弱性あり。機能的には動作する想定 |
| デッキ準備 → 対戦マッチング | ⚠️ 部分的 | WS マッチング: Fly.io 未デプロイのため現状は localhost 限定 |
| Prep フェーズ (ZK commit) | ✅ 動く | `preparation.js`: ZK proof 生成 → `commitHand` TX 送信。OXARK_ALLOW_NO_ZK bypass 削除済み |
| Interruption フェーズ (peek, swap) | ⚠️ 部分的 | UI 完成。x402 peek 支払いは `02-x402.js` 実装だが Fly.io 経由のためオフライン |
| Reveal フェーズ (reveal TX + 演出) | ✅ コード完成 | `reveal.js`: `_revealFailed` フラグで TX 失敗時ナビゲーションブロック実装済み。RequestHeapFrame(262144) 先頭配置済み |
| 勝敗判定 (damage_calc) | ✅ 動く | on-chain `resolve_round` + client-side `damage-calc.js` 一致確認済み |
| 報酬 (loot / claim_prize_v2) | ⚠️ 部分的 | `loot.js` UI 完成。`claim_battle_loot` (C4) と `claim_prize_v2` (C1) は脆弱性あり — 機能はするが悪用可能 |

**「UI はあるが裏が繋がっていない」画面**:
- `interruption.js` の x402 peek/swap: UI あり、payment flow は Fly.io サーバー依存のためオフライン

---

### B2. 画面・UI 棚卸し

**アクティブ (app.js に全件 wired)**:

| ファイル | 画面 | 判定 |
|---|---|---|
| `src/components/home-screen.js` | ホームハブ (SHOP/TRADE ボタン) | ✅ 機能する |
| `src/components/main-screen.js` | Vault ビューア + マッチメイキング | ✅ 機能する |
| `src/components/shop-screen.js` | パックショップ + カード演出 | ✅ 機能する (buy_pack on-chain) |
| `src/components/trade-screen.js` | P2P マーケットプレイス | ⚠️ 表示のみ — create/accept/cancel listing は on-chain 実装済みだが UI から直接呼んでいるか未確認 |
| `src/components/preparation.js` | Prep フェーズ (3分, ZK commit) | ✅ 機能する |
| `src/components/interruption.js` | Interruption フェーズ (1分, peek, swap) | ⚠️ 部分的 (x402 offline) |
| `src/components/reveal.js` | Reveal フェーズ + バトル演出 | ✅ 機能する |
| `src/components/loot.js` | Loot フェーズ (winner picks card) | ✅ 機能する (C4 脆弱性あり) |
| `src/components/card-detail.js` | カード詳細モーダル (burn/evolve) | ⚠️ 部分的 (burn C5 脆弱性あり) |

**アーカイブ / 未接続**:
- `src/screens/_archive/` — 存在しない（16画面は実装されておらず、`docs/POST_HACKATHON_ROADMAP.md` 記載の Season 2 タスク）

---

### B3. ゲームコア機能

| 機能 | 判定 | 詳細 |
|---|---|---|
| カード mint | ⚠️ オンチェーン動作 (devnet 未確認) | `oxark-cards` program: `buy_pack` → SPL token mint。devnet へのデプロイ/初期化状態が未確認 |
| カード所持表示 | ✅ オンチェーン | `PlayerState.vault_bitmap` で 60枚管理。UI に反映 |
| duel commit-reveal | ✅ オンチェーン (コード完成) | `init_duel → commit_hand (ZK) → reveal_hand (Poseidon 照合)` 全工程実装済み |
| damage_calc (勝敗判定) | ✅ オンチェーン | `damage_calc.rs` + `resolve_round` でオンチェーン完結。クライアントも同ロジック |
| claim_prize_v2 | ⚠️ オンチェーン動作・C1 脆弱性あり | 機能はする。二重請求防止未実装 |
| claim_battle_loot | ⚠️ オンチェーン動作・C4 脆弱性あり | 機能はする。loser_pubkey 未検証 |

---

### B4. Agent 対戦

| 項目 | 状況 |
|---|---|
| AI agent vs agent 自動対戦 | ❌ 未実装 |
| `agent_hire` instruction | ✅ on-chain 実装済み (x402 支払いログ取得まで) |
| agent が `commit_hand` を叩けるか | ❌ 人間 UI 経由のみ。agent 自律 TX 送信ロジックなし |
| 実装予定 | Season 2 / Post-hackathon（`POST_HACKATHON_ROADMAP.md`）|

---

### B5. x402 / 課金まわり

| 機能 | 判定 | 詳細 |
|---|---|---|
| Scout peek (interruption) | ⚠️ モック | `02-x402.js` に実装あり。WS サーバー経由のため Fly.io 未デプロイでオフライン |
| Agent hire (x402) | ⚠️ モック | `agent_hire` instruction は on-chain 完成。フロントエンドからの支払いフローはサーバー依存 |
| Card P2P (create/cancel/accept_listing) | ⚠️ On-chain 実装済み・UI 未確認 | `trade-screen.js` は表示のみか不明 |
| x402 サーバー (Fly.io) | ❌ 未デプロイ | `r0ze が fly deploy` 実行要。`fly.toml` / `Dockerfile` は完成 |
| 本番モードでの x402 有効化 | ✅ コード上は実装済み | `TREASURY_PUBKEY` + `SOLANA_RPC` + `REDIS_URL` が揃えば production mode 自動有効 |

---

## C. 公開ブロッカー

### C-1. セキュリティ (mainnet 前に必須修正)

```
🔴 [BLOCK] C1 claim_prize_v2 — 二重請求可能。transfer 前に deposit_amount=0 要
🔴 [BLOCK] C2 register_waitlist — prize_pool/ops_treasury 任意アドレス。Anchor constraint 追加要
🔴 [BLOCK] C4 claim_battle_loot — loser_pubkey を DuelState.player_1/2 で検証要
🔴 [BLOCK] C5 burn_card — rarity を on-chain state から読む実装要
🔴 [BLOCK] C6 record_gold_hall_win — DuelState 参照 + consumed フラグ要
🔴 [BLOCK] C7 commit_hand — ZkProofRecord PDA でプルーフ使用済みマーク要
⚠️ [WARN]  C3 resolve_round — PDA シード検証追加要（owner check のみでは不十分）
```

### C-2. インフラ・デプロイ

```
🔴 [BLOCK] Fly.io 未デプロイ — WS マッチング・x402 支払い・peek が全て offline
🔴 [BLOCK] devnet 最新ビルド (5/31 oxark.so) の再デプロイ確認 — r0ze 実行要
⚠️ [WARN]  T9 e2e (Phantom 2枚デュエル) 未検証 — devnet + Fly.io 揃ってから
```

### C-3. テスト

```
⚠️ [WARN]  JS テスト (x402-co-re-flow, x402-memo) が実行不可 — CJS/ESM 不整合
⚠️ [WARN]  test_verify_zk_proof_valid が ignored のまま — proof fixture 未整備
```

### C-4. Dead code 削除判断 (r0ze 判断待ち)

```
🗑️ verify_zk_proof instruction — 現フローで未使用。mainnet 前に削除推奨
🗑️ verify_dungeon_move instruction — 同上
```

### C-5. 「UI はあるが裏が繋がっていない」項目 (要特記)

| 画面 / 機能 | 見た目 | 実態 |
|---|---|---|
| Interruption の x402 peek | ボタンあり・演出あり | WS サーバー必須 → Fly.io 未デプロイで無音 |
| Trade 画面 | マーケットプレイス表示 | on-chain listing 命令との接続が確認できず |
| Agent 対戦ボタン (あれば) | — | 自律 AI 対戦ロジックなし (Season 2) |

---

## 付録: 技術スタック確認

| 項目 | 値 |
|---|---|
| Anchor version | 1.0.0 |
| Rust lib.rs pub fn 数 | **61** (CLAUDE.md 記載の 52 から 9命令追加済み) |
| anchor-spl features | `["token", "associated_token"]` |
| ephemeral-rollups-sdk | 0.6.6 (disable-realloc feature) |
| Groth16 verifier | `solana-bn254 = "3"` + `ark-bn254 = "0.5"` |
| Poseidon | `pso-poseidon = "0.2.0"` |
| LiteSVM heap | 256KB (`ComputeBudget { heap_size: 256*1024 }`) |
| JS テストフレームワーク | なし (手製 assert) |

---

*このファイルはコード調査のみに基づく。devnet 実機確認が必要な項目は「未確認」と明記した。*

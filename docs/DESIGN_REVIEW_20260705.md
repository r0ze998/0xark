# 0xARK 要件定義・設計 再整理 — v1.0

> 作成: 2026-07-05
> 作成方法: GitHub repo（main HEAD `0cdbd4a`）全読 + `docs/` 設計文書群 + Linear（YKKZ）全チケット + 過去設計セッション記録の突き合わせ
> 位置づけ: 要件定義〜設計工程の**振り返り兼、現時点の正**。GDD v2.0 以降に散らばった設計判断（design v3 / YKK-42系 / セッション記録）を1枚に統合する。個別文書との食い違いは §7 の乖離一覧が優先。

---

> **更新 (2026-07-05 later / merge `dc540b8`)**: 本書初版で P0 とした来歴ゲート穴は、PR #32 のマージで**実装・オンチェーン検証とも解消**した。あわせて reveal timeout・energy 制・promote 全ティア ladder + コストが入った。実装は本書初版の仮称と一部名前が違う（`settle_duel_card_history` → **`settle_duel_history`**）。§6.1・§6.2・§4.4・§5・§7・§8 を追随更新済み。main = `dc540b8`、`make test` = 227 passed / 0 failed / 1 ignored（実ログ確認）。

---

## 0. この文書の読み方

0xARK の設計文書は生成時期の異なる4世代が repo に共存しており（GDD v2.0、TOKENOMICS v1.0、CARD_SYSTEM_DESIGN v1.0、design v3）、**どれか1つを読むと現状を誤認する**状態になっている。本書は:

- §1–2 が「いま何を作っているか」の要件正本
- §3 が「なぜそうなったか」の変遷（工程の振り返り）
- §4 が「どう作られているか」の実装済み設計
- §5–6 が判断ログと未決事項
- §7 が既存文書との乖離マップ（GDD更新の優先箇所）

---

## 1. プロダクト定義（不変レイヤー）

### 1.1 テーゼ

**「運営者への信頼」を「数学的検証」に置き換える。ゲームはそのテーゼの最小完全証明。**（Games Eat the Future First）

0xARK はこのテーゼの第一号実装。ゲーム内のすべての勝敗・資産移転・希少性が、運営者の裁量ではなくオンチェーンの検証（Groth16 / Poseidon / PDA制約）で決まることを目指す。

### 1.2 One-liner と訴求階層（YKK-28 確定 / 2026-06-09）

1. **"Steal or die."** — メカニクスが一言でわかる顔
2. **"No token. Can't be rugged."** — 聞かれたら効く信頼担保（最初に言う言葉ではない）
3. ZK / AI / x402 — 深掘りした人（投資家・技術者）にだけ出てくる最深層

不採用を明示: 「AI agent arena」枠ではない（人間がプレイするカードバトル）。「ZKを売りにする」のはマーケ的に外し（技術moatであって刺さりどころではない）。

### 1.3 対外ポジショニング（2026-07 確定方向）

- カテゴリ名: **Algorithmic TCG**（未定義カテゴリの定義権を取りに行く）
- 4軸タクソノミー: **供給アルゴリズム / レアリティアルゴリズム / 価格アルゴリズム / バランスアルゴリズム**
- 対外語彙: **provable scarcity**（証明可能な希少性）/ **performance-derived rarity**(戦績由来レアリティ)
- 最近接TAM: Collector Crypt の Solana ユーザー基盤（Solana on-chain TCG 出来高 $1B 超の主要因）
- 差別化テーゼ: **"Numbers with nowhere to hide."** — トークン無し・全数値オンチェーンで、隠れる場所のない経済

### 1.4 世界観 v1（YKK-29 / 語彙ゼロ移植）

- 創造者なき世界。あらゆる物・力・現象が**有限・固定枚数のカード**に変換されている
- **奪うことが正規ルール**（ズルではなくゲーム公式の正当行為）— rug の対極としての「盗む」
- 登録（オンチェーン刻印）して初めて自分のもの
- ビジュアル: FRLG系 GBA風 JRPG（cream-and-goldダイアログ、`design/DESIGN_TOKENS.json` に固定palette）

---

## 2. 要件定義（現行 Gen 3 スコープ）

### 2.1 機能要件と実装状態

凡例: ✅ 実装済み・配線済み / ⚠️ 実装済みだが欠陥あり or 未配線 / 🚧 設計確定・未実装 / 📝 設計中

| # | 機能要件 | 状態 | 実装 / 根拠 |
|---|---|---|---|
| FR-1 | 2人デュエル: 5ラウンド・3勝先取・各ラウンド独立（累積HPなし）・引き分けはノーカウント | ✅ | `init_duel → commit_hand → reveal_hand`、YKK-41 (PR #30) |
| FR-2 | 手札秘匿: reveal まで相手に手札が漏れない（frontrun / copy 不可） | ✅ | Groth16 BN254 オンチェーン検証 + Poseidon(6) commit（§4.2） |
| FR-3 | 不正 reveal の拒否: commit と異なる手札は通らない | ✅ | reveal_hand がオンチェーンで Poseidon 再計算・照合 |
| FR-4 | 決定論的バトル解決: 同一入力→同一結果、運営介在ゼロ | ✅ | `damage_calc`（Rust、整数演算のみ、seed = SHA-256(salt₁‖salt₂‖round)） |
| FR-5 | カード60種コレクション（1シーズン14日、60/60でChampion） | ✅ | GameWorld PDA、`card_data.rs` 60枚テーブル |
| FR-6 | 来歴の不可逆記録: カード単位の wins/losses/kos/dmg/所有履歴 | ✅ | `CardBattleHistory` PDA 完備。書き込みは `settle_duel_history`（trustless）+ `update_card_battle_history`（admin専用化）で権限化済み（旧P0解消、§6.1） |
| FR-7 | 来歴ゲート昇格: 戦歴でしかアンロックできない単体昇格（同一mint・履歴連続） | ✅ | `promote_card` 全ティア ladder（C→U/U→R/R→L）+ ティア別 SOL コスト。ゲートのデータ源は `settle_duel_history` で権限化。promote 13 + settle 9 テスト緑（§4.4） |
| FR-8 | カード steal: 勝者が敗者から NFT 1枚永久奪取（エスクロー + タイムアウト付き） | ⚠️ | **reveal/stall timeout は実装済**（`claim_timeout_win`, 600s, テスト7件緑）。NFT奪取本体・エスクローは YKK-44 で未実装（YKK-47法務待ち） |
| FR-9 | Shop: パック購入（Standard 0.05 / Premium 0.15 SOL、phase制ドロップ率） | ✅ | `buy_pack`、GameWorld にドロップ率(ppm)を admin 調整可能に保持 |
| FR-10 | Trade Floor: P2P 売買（最低 0.001 SOL、プラットフォーム手数料 0%） | ✅ | `create/cancel/accept_listing` |
| FR-11 | 参加登録: waitlist 0.5 SOL デポジット + スターター5枚 | ✅ | `register_waitlist`（85% prize_pool PDA / 15% ops_treasury） |
| FR-12 | 賞金分配: シーズン終了時、vault枚数tier別・順位ベース分配（二重請求不可） | ✅ | `finalize_season_tally → end_season_final → claim_prize_v2`（YKK-38 PDA vault + invoke_signed、C1 claimed flag） |
| FR-13 | x402 マイクロペイメント: peek/intel 等の従量課金（HTTP 402） | ⚠️ | サーバ13エンドポイント実装済（Coinbase spec、Redis replay防止）。**バトルUIにclient未ロード**、Fly.io本番デプロイ未（YKK-14） |
| FR-14 | AI agent: 戦略助言・自律プレイ（x402で対価支払い） | ⚠️/🚧 | `/x402/ai-strategy-advice` 実装済（Claude Haiku 4.5）・UI未接続。自律TX署名は未実装 |
| FR-15 | Imprint: 戦績由来の刻印（Veteran/Elder/Kingslayer 等、レアリティ別上限） | ⚠️ | 実装・レアリティはオンチェーン読み（C5是正済）。ただし付与トリガーが FR-6 経路 |
| FR-16 | エネルギー制・昇格コスト等の恒常 sink | ⚠️ | **energy 基盤 + `refill_energy` 実装済**（MAX5 / regen4h / cost1/duel / refill 0.003 SOL）。promote コストも実装（§4.5）。デュエル入口での energy 消費配線は未（PlayerState 未ロード）。数値は placeholder |
| FR-17 | MagicBlock Ephemeral Rollups によるリアルタイム対戦 | 🚧 | `er-sdk-patch` vendor済み、未統合（post-hackathon） |

### 2.2 非機能要件

| # | 非機能要件 | 現状 |
|---|---|---|
| NFR-1 | **Trustless outcome**: 勝敗・資産移転に運営者の裁量ポイントが存在しないこと | デュエル解決は達成。来歴書き込み（P0）と matchmaking（init_duel は server authority が作成）に信頼点が残る |
| NFR-2 | **Solana 実行制約内**: 1 TX ≤ 1.4M CU | commit_hand ≈135K CU / reveal_hand ≈43K CU（YKK-33 で >8M→43K に解消）。custom-heap 256KB が default のため**全TXに RequestHeapFrame(262144) 必須**（YKK-40） |
| NFR-3 | **No token / no rug**: 独自トークン発行なし、SOLネイティブ | 確定（TOKENOMICS §4.1 + YKK-43）。$ARK は community-gated の将来オプション扱い |
| NFR-4 | **検証可能性**: 誰でも結果を再計算・監査できる | damage_calc は client JS と bit-exact ミラー。seed 導出・ソート順まで決定論契約を明文化 |
| NFR-5 | **法令適合**: 換金NFT奪取構成の賭博/暗号資産規制クリア | **未確認（YKK-47, Urgent）**。弁護士確認が前提。結果次第で FR-8 の根本が変わる |
| NFR-6 | **mainnet 暗号強度**: trusted setup が単独生成でない | 現状 dev setup（toxic waste 単独保有）= devnet 限定。mainnet 前に多者 ceremony + VK差し替え必須（YKK-35） |
| NFR-7 | **ソロ運営可能**: crank 系操作が自動化可能な形 | finalize は strictly-increasing pubkey cursor のバッチ crank。Mac mini 常時稼働構成で運用可能 |
| NFR-8 | **鍵管理**: devnet は upgrade authority 保持、mainnet で放棄/multisig | SECURITY.md 明記。※ lib.rs doc comment の「No admin key」記述は devnet 実態と不一致（§7） |

### 2.3 事業要件

- **収益モデル（2026-06 確定）**: entry 0.5 SOL（rake 15% → ops_treasury）/ パック売上 50% / x402 50% / Metaplex royalty 5%（非強制）/ accept_listing 0%
- **目標**: ¥30M net ⇒ 必要ユーザー **N ≈ 4,800+**。主収益ドライバーは**パック購入**。x402 は現規模ではノイズ（narrative 資産として維持）
- **12月期限**: 河野式逆算の6ヶ月計画にアンカー（ローンチ + 収益目標）
- **チャネル**: 英語X（一次）→ Substack（信頼基盤）→ Discord/Telegram はプレイヤーベース形成後
- **実績**: Colosseum Frontier 2026 提出済（2026-05-11、Gaming 主 + AI / Stablecoins 副、solo）
- 注: カテゴリ命名（Algorithmic TCG）だけでは N=4,800 の獲得は解けない — 獲得施策は別途（既知の未解決）

---

## 3. 設計の変遷 — 4世代の工程振り返り

repo と Linear に残る設計は4世代。**捨てた理由**まで含めて記録する（同じ検討を繰り返さないため）。

### Gen 0 — Phase C「ZK海賊カード探索」(〜2026-04 前半)

- 3人戦。`create_game / join_game / start_game / commit_action / reveal_action / resolve_round`
- 13枚プール・5タイプ（Crystal/Shadow/Flame/Storm/Void）・3エリア（Port/Forest/Ruins）・勝利条件 = 5タイプ収集
- commit = SHA-256(action‖target‖salt)、PDA seed に round を含めてリプレイ防止
- **現況**: エンジンは lib.rs に配線されたまま残存（レガシー）。クライアント未使用。YKK-30（reveal_count≥1 で解決可能）/ YKK-31（3人戦レーン no-op）という仕様穴持ち。**修理 vs 削除の判断未了**
- 遺産: commit-reveal の骨格、PDA replay 防止パターン、`verify_zk_proof`（277制約 commit_reveal 回路）

### Gen 1 — 60枚化と初期経済 (2026-04-20〜21)

- CARD_SYSTEM_DESIGN v1.0: 60枚 = 5タイプ×12、r1–5 の5段レアリティ、4軸ステータス（power/speed/cost/duration）、シナジー3種
- TOKENOMICS v1.0: entry 0.5 SOL → 勝者80% / dev20%、SOLネイティブ宣言
- 同時期の創作セッションで GI型「登録制コレクション」「SS世界3枚固定」「断末魔」「1万人Shard分割」等を探索 → **世界観の骨（有限・登録・奪取）だけ残して具体案は棄却**（YKK-29 で語彙ゼロ移植として再構築）
- 捨てた理由: タイプ×レアリティだけでは戦略が浅い / 5段レアリティとドロップ均一が噛み合わない

### Gen 2 — GDD v2.0「Reborn」(2026-04-22, ハッカソン提出の土台)

- FRLG風JRPG世界（町・ルート・5クラン）、Bronze/Silver/Gold Duel Hall、ante 0.01/0.05/0.1 SOL、**勝者が2枚奪取**
- 4フェーズ制ラウンド（Draw/Energy/Summon/Battle）、3レーン、5元素相性、20枚デッキ
- 60枚 = 30C/20U/6R/4L、Legendary は 4種×10枚キャップ、Battle History PDA・Lore Shards・AI agent・x402 を初めて正式仕様化
- 24件の設計判断を Appendix B に記録（この decision log 文化は継続資産）
- 提出実績 (05-11): Phase 15 バトルフロー5画面 + ZK オンチェーン検証 + SPL mint CPI + WebSocket マルチプレイ（Fly.io）。Wave 1–4 の16画面は実装済み・未配線で Season 2 送り
- **Gen 3 で上書きされた点**: フェーズ制/レーン/エネルギーの盤面設計 → damage_calc 一括解決に置換。2枚奪取 → 1枚。5クラン → 6ファクション。レアリティ構成 30/18/6/6 に変更

### Gen 3 — design v3「来歴中心設計」(2026-06〜現行)

3AIレビュー（v1 の崩壊リスク: デフレ・新規枯渇・賭博性）を経て、**来歴(provenance)を設計の背骨に反転**:

- **steal の再定義**: ゼロサムの暴力（敗者が消える負のNW効果）→ **来歴を生む全員参加の生産活動**（正のNW効果）。問いは「stealするか否か」ではなく「stealを来歴生産として設計するには」
- **単体昇格**（合成棄却）: 同一 mint のままレアリティを上書き → CardBattleHistory が連続 = 「俺の相棒を育てる」物語。2枚burn合成は履歴を切るので不採用（evolve_cards を unwire）。技術検証済み（YKK-46 spike Done, 2026-06-25）
- **上位ほど金で買えない**: 昇格ゲートは戦歴のみ（Pay-to-Win 構造の破壊）
  - C→U: wins ≥ 10（実装済 = `PROMOTE_COMMON_TO_UNCOMMON_WINS`）
  - U→R: wins ≥ 25 かつ (legendary_kills ≥ 1 or owners_dropped ≥ 1)（たたき台）
  - R→L: wins ≥ 50 かつ acquisition_source == duel_won かつ kos ≥ N（たたき台、YKK-43 で数値確定）
- **縦横両立**: judge_winner が5枚のBP合計で判定 + ファクションパッシブ/スロット相互作用 → 育成（縦）と60枚収集（横）が追加ルールなしで噛み合う（1枚傑出では勝てない構造）
- **デュエル骨格**: 5R・3勝先取・ラウンド独立・カードは保有プールから毎R5枚選択・再利用可（NFT非消費）= 手持ち5枚でも参加可 → 新規の壁を下げつつ「60枚 = 選択肢の差」
- **経済方向**: 換金は市場売買へ（CryptoKitties方式）。昇格コストを恒常 sink に。ante/rake の扱いは法務（YKK-47）待ちの残論点

---

## 4. 現行アーキテクチャ設計（実装済みの正）

### 4.1 システム全体

```
┌─ Client (vanilla JS, GBA風 5画面) ── snarkjs WASM proof生成 (~272ms)
│        │ RequestHeapFrame(262144) 必須（全TX）
▼        ▼
Anchor program `oxark`  (5i37jWBiA7bV9XmokyDWHQxjJ5s1sBnSEkPSB4J2XfmN, devnet)
│  63 instructions / state.rs 1538行 / Rust test 約139本 (litesvm + unit)
│  ├ デュエルコア: init_duel / commit_hand / reveal_hand (+ groth16.rs / poseidon_helper.rs / damage_calc.rs)
│  ├ 経済: register_waitlist / buy_pack / listing系 / claim_prize_v2 / season finalize crank
│  ├ 来歴: CardBattleHistory / CardMintRecord / promote_card / grant_imprint
│  └ レガシー: Phase C エンジン（game/commit_action/resolve_round 系, クライアント未使用）
├ Anchor program `oxark-cards`: SPL mint CPI (mint/burn)・カード市場
├ multiplayer/server.js: WebSocket マッチメイキング + x402 facilitator（13 endpoints, Redis replay防止）
├ circuits/hand_commitment: circom 2.1.6 v3 回路 + zkey（dev setup）
└ er-sdk-patch: MagicBlock ER SDK vendor（未統合）
```

ビルド規律: `make test` が SBF build → cargo test を強制（litesvm は `.so` を include_bytes! するため、cargo test 単独は stale binary を黙って検証する事故がある — 実際に踏んだ教訓の制度化）。

### 4.2 デュエルコア — ZK commit-reveal（本体設計）

**フロー（1ラウンド）**:

```
commit_hand(P1) ──┐  Groth16検証: proof + public_signals[commitment, round, pubkey_lo, pubkey_hi]
commit_hand(P2) ──┤    ├ round一致 (回路signal == 命令引数 == duel.round)
                  │    ├ 署名者pubkey一致 (copy attack防止: 相手proofの流用不可)
                  │    ├ double-commit拒否 (高価な検証の前に安価なガード)
                  │    └ commitment を DuelState[round-1] に保存, zk_verified=true
reveal_hand(P1) ──┤  Poseidon(6) syscall 再計算 → 保存commitmentと照合 → salt/cards保存
reveal_hand(P2) ──┘  両者reveal揃った2人目のTX内で:
                       seed = SHA-256(p1_salt ‖ p2_salt ‖ round)
                       damage_calc(p1_cards, p2_cards, seed) → BP合計比較で round point
                       3勝到達 or 5R消化 → winner/ended_at確定, それ以外 round += 1
```

**設計上の要点**:

- **コミットメント構造**: `Poseidon(round, pubkey_lo, pubkey_hi, cards_packed, salt_lo, salt_hi)`。round と pubkey を焼き込むことで**ラウンド跨ぎ再利用・他人proof流用・クロスデュエル流用**を回路レベルで殺す（C7 の教訓を commit 系に一般化）
- **ラウンド乱数**: 両者の salt から導出 = どちらか一方では操作不能、かつ2人目の reveal 時点で初めて確定（reveal 前に結果を知る経路がない）
- **勝敗判定の所在**: reveal_hand の中（第2 reveal のTX）で完結。resolve 用の追加TXや運営 crank が不要 = 信頼点を増やさない
- **旧・既知の穴（解消済）**: 負け確定側の reveal 放棄でデュエルが永久スタックしたが、`claim_timeout_win`（`DUEL_STALL_TIMEOUT_SECONDS=600`）で解消。自分の手番を済ませた側が、放棄した相手から勝ちを取れる（相互スタック・期限前・請求側が未 reveal のケースは拒否、テスト7件緑）

### 4.3 バトル解決 — damage_calc（決定論契約）

- Rust 実装は client `damage-calc.js` と**bit-exact ミラー**（整数演算のみ・float禁止）
- 入力: 各プレイヤー `[u64;10]`（先頭5枚が有効、0パディング。回路のパッキングと同じ形）
- カード定義: `card_data.rs` 静的60枚 `[id, faction, rarity, bp, hp, ini, action_type, is_legendary]`
  - 6ファクション × 10枚（Knight / Merchant / Pirate / Scholar / Monk / Engineer）
  - 各ファクション C5 / U3 / R1 / L1 ⇒ 全体 **Common30 / Uncommon18 / Rare6 / Legendary6**
- パッシブ6種（各ファクションの Rare が保有）: KnightAura(+1BP味方Knight) / MerchantGoldAura(Legendary在場で全体+1BP) / PirateIntimidate(同スロット-3HP) / ScholarImprintScale(imprint数×+1BP, max3) / MonkSoulHarvest(全体barrier) / EngineerOverclock(Engineer3枚で+2BP)
- 解決順: INI降順 → seed_byte昇順 → 元index昇順の3段安定ソート。スロット相互作用（同スロット衝突、UseFlame隣接など）→ BP合計で judge_winner
- Burn ability は未実装（burnEffects 常に空）— 将来拡張枠として明示

### 4.4 来歴・昇格システム（provenance layer）

- **CardBattleHistory PDA**（seed: `["card_battle_history", card_mint]`, 636B）: wins / losses / kos / dmg_dealt / times_summoned / owners_history(ring 10) / owners_dropped_count / acquisition_source(mint·shop·duel_won·p2p) / imprints[5] / legendary_kills / lease_* / evolved_from_*
- **CardMintRecord PDA**: レアリティのオンチェーン正（C5是正パターン: 呼び出し側申告を信用しない）
- **promote_card**（全ティア ladder, `dc540b8`）: 所有証明（ATA amount≥1）+ record を mint にピン + ティア別ゲート → **同一mintのまま rarity を書き換え**（履歴連続）。ゲート: C→U `wins≥10` / U→R `wins≥25 ∧ (legendary_kills≥1 ∨ owners_dropped≥1)` / R→L `wins≥50 ∧ acquisition==duel_won ∧ kos≥30`（`evaluate_promotion` pure helper, unit 13件）。**ティア別 SOL コスト**を gate 通過後に ops_treasury へ徴収（0.01 / 0.03 / 0.1 SOL、`game_world`+`ops_treasury`+`system_program` アカウント追加、owner writable）
- **settle_duel_history**（P0 解消, `dc540b8`）: `promote_card` の wins ゲートに food を供給する trustless 書き込み経路。完成 DuelState から ①winner 署名 ②card_id を CardMintRecord から解決 ③winner の revealed 手札に含有 ④保有証明（ATA≥1、species farming 防止）⑤DuelState の u64 bitmap 2本で二重精算防止。**1枚/命令**、client が複数を1txにバッチ。v1 は wins のみ（losses/kos は mint 確定する YKK-44 側へ）。litesvm 統合テスト9件緑
- **update_card_battle_history は admin専用化**（旧: 無権限で誰でも wins 注入可能だった＝旧P0）。auto-imprint も admin 経路
- **Imprint 自動付与**: Veteran(累計10勝, +1BP) / Elder(50勝, +1HP + cosmetic frame) / LineageMark(所有者3人以上) / Kingslayer(+2BP vs Legendary)。stat imprint はレアリティ別上限
- **evolve_cards は unwire**（2枚burn→新mintは履歴を切るため v3 で棄却。参照用にソースのみ残置。YKK-36 は moot）
- ✅ 旧P0（wins 書き込み無権限）は §6.1 の通り解消済み。詳細は上の settle_duel_history / admin専用化

### 4.5 経済設計 — 実装済みマネーフロー

```
IN                                          OUT
register_waitlist 0.5 SOL ─┬─ 85% → prize_pool PDA ──→ claim_prize_v2 (tier×順位, claimed flag)
                           └─ 15% → ops_treasury
buy_pack 0.05 / 0.15 SOL ──┬─ 50% → ops_treasury        （分配は finalize crank 後のみ）
                           └─ 50% → prize_pool PDA
x402 (0.005 SOL〜) ────────── 50/50 慣行（server側）
accept_listing ───────────── 買→売 直送金 100%（手数料0, min 0.001 SOL）
Metaplex royalty 5% ──────── 非強制（設計上の宣言のみ）
```

- prize_pool は **PDA vault**（seeds=`[b"prize_pool"]`）+ invoke_signed 送金（YKK-38: 「共有口座の署名要求で本番不成立」を是正）。migrate 系の footgun も除去済み（YKK-39）
- ドロップ率は GameWorld に ppm 保持・admin調整可: Legendary phase1 0% → phase2 1.5%（開始7日後 threshold）、Rare 2%→2.5%、Uncommon 18%
- シーズン: 14日、waitlist 締切 gate、finalize は strictly-increasing pubkey cursor の batch crank（二重集計不能）
- **promote コスト（sink, `dc540b8`）**: 昇格 gate 通過後にティア別 SOL を ops_treasury へ（C→U 0.01 / U→R 0.03 / R→L 0.1 SOL）。戦い続けないと上に行けない恒常 sink（3AI の「sink 頭打ち」批判への回答）
- **energy 制（anti-whale + sink, `dc540b8`）**: `ENERGY_MAX=5` / 自然回復 `4h` ごと+1（満稼働で6/日）/ デュエル入口で `1` 消費 / `refill_energy` で満タン復帰 `0.003 SOL` → ops。※ 消費配線はデュエルフロー側が未実装（PlayerState 未ロード）。数値は全て placeholder（YKK-43 balancing 待ち）
- 賭博性の主因（ante/rake）の最終形は YKK-47 の弁護士回答待ち。v3 ノートは「トークン ante 撤廃・換金は市場売買へ」の方向を記録

### 4.6 主要アカウント / PDA（Gen 3 で生きているもの）

| Account | Seeds | 役割 |
|---|---|---|
| `DuelState` | `["duel", duel_id]` | 2人デュエルの全状態: commitment/revealed/salt/zk_verified 各×5R、round_wins、winner、hall_tier、ante |
| `GameWorld` | 単一 | シーズン時計・prize_pool/ops_treasury 参照・ドロップ率・finalize カーソル |
| `PlayerState`(v2系) | player毎 | deposit / vault_count / claim 状態 |
| `CardBattleHistory` | `["card_battle_history", mint]` | 来歴（§4.4） |
| `CardMintRecord` | `["card_mint_record", mint]` | レアリティ正 + bump |
| `Listing` | listing毎 | Trade Floor 出品 |
| `ZkProofRecord` | proof毎 | verify_zk_proof のクロスデュエルreplay防止（C7） |
| Legacy: `game / player / card_pool / commit / stake_vault` | Phase C | 3人戦エンジン（未使用・要処遇判断） |

### 4.7 ZK 回路の変遷（v1→v3）と現行仕様

| 版 | 内容 | 帰結 |
|---|---|---|
| v1 `commit_reveal.circom` | action単位 Poseidon(3), 277制約 | Phase C 用。`verify_zk_proof` として現役（optional layer） |
| v2 hand_commitment | Poseidon(15) 直 hash（15入力） | Groth16 検証は通るが、reveal 側のオンチェーン再計算が **>8M CU**（上限1.4M）で devnet 実行不能（YKK-33）。litesvm 初回 BPF 実行まで不可視だった教訓 |
| **v3 hand_commitment（現行）** | 5枚の card_id（各<64=6bit）を1フィールドに packing → **Poseidon(6)** を `sol_poseidon` syscall（12入力上限内）で再計算 | syscall コスト **2,738 CU**（61·6²+542）。reveal_hand 全体 ≈43K CU。回路内 range check 1≤id≤60 で packing の単射性を保証 |

- 公開シグナル: `[commitment, round, pubkey_lo, pubkey_hi]`（snarkjs順）。半割は big-endian 前半=lo（client `_splitSalt` と一致、PR #19 の踏襲）
- endianness 契約: syscall 出力 LE → reveal_hand が BE 反転して保存 commitment（snarkjs publicSignals[0] の BE）と照合
- ⚠️ commitment 値が v2 と異なるため zkey/VK は作り直し済み。**現 zkey は dev setup（単独 contribution）** — mainnet 前に多者 ceremony 必須（YKK-35）。過去に「VKに対応する回路がrepoに無い」孤児化事故（0b69efe）があり、VK⇔zkey⇔回路の対応検証をデプロイ手順に組み込み済み

---

## 5. 確定済み設計判断ログ（日付・根拠つき）

GDD Appendix B（v2.0 の24判断）以降に確定したものを中心に。**太字 = Gen 2 からの変更**。

| 日付 | 判断 | 根拠 |
|---|---|---|
| 2026-04-22 | GDD v2.0 の24判断（phase制盤面 / Hall制 / ante / 60枚構成ほか） | Appendix B 参照。以後の変更点は本表とし、GDD側は §7 で棚卸し |
| 2026-04-28 | NFT スタック = **標準 SPL Token via anchor-spl**（Bubblegum cNFT / Light Protocol 不採用） | C-1 判断。CPI の単純さ・監査容易性優先 |
| 2026-06-09 | マーケ訴求階層（Steal or die → No token → 技術） / 英語FOCG一本 / AI arena 枠を明示不採用 | YKK-28 |
| 2026-06-09 | 世界観 v1: GI構造の語彙ゼロ移植、「盗む = rugの対極」 | YKK-29 |
| 2026-06-10〜24 | C1–C7 全解消（二重請求 / 送金先任意指定 / 任意PlayerState改変 / loot敗者検証 / 呼出側レアリティ / DuelState無証明勝利記録 / クロスデュエルreplay） | Linear milestone "Security Remediation"。**「呼び出し側申告を信用しない」が設計原則に昇格** |
| 2026-06-16→24 | reveal_hand を **Poseidon(6) syscall 方式に全面変更**（v3回路・zkey作り直し） | YKK-33: v2 が CU 上限で構造的に不成立 |
| 2026-06-20 | **5R・3勝先取・ラウンド独立**。カードは保有プールから毎R5枚・再利用可（NFT非消費） | YKK-42 epic。「経済が崩壊しないか」を紙で固めてから実装する方針も同時確立 |
| 2026-06-20 | custom-heap 256KB を default 維持し、**全TXに RequestHeapFrame 必須**をクライアント契約に | YKK-40（init_duel すら 32KB heap で fault する実測） |
| 2026-06-24 | prize_pool を PDA vault + invoke_signed に（共有口座署名モデル廃止） | YKK-38/39 |
| 2026-06-25 | **単体昇格 = 同一mintメタデータ更新**の技術成立を確認 | YKK-46 spike Done。設計前提の事前潰し |
| 2026-06-25〜07-01 | promote_card 実装（C→U, wins≥10）・**evolve_cards unwire** | YKK-45 / PR #31。「履歴を切る合成は捨てる」の実装反映 |
| 2026-06-26 | 法務確認を**独立・最優先タスク**として切り出し | YKK-47。「過疎る」でなく「逮捕されうる」リスクは受容不能、AIで結論を出せない領域と明示 |
| 2026-07-02 | **steal は 1枚永久奪取**（GDD の2枚から変更） | YKK-44: シミュレーションで60枚レースが速すぎた |
| 2026-07-02 | SOLネイティブ最終確認（独自トークン論点をクローズ、$ARK は post-hackathon オプションのまま） | YKK-43 / GDD統合方針セッション |
| 2026-07 | 対外語彙 = provable scarcity / performance-derived rarity。Algorithmic TCG 4軸で定義権を取る | 市場調査（Solana on-chain TCG $1B超、カテゴリ未定義） |

**運用面の確定事項**（工程の教訓の制度化）:
- `make test` = SBF build 強制（stale `.so` 事故の再発防止）
- Claude Code へのプロンプトは standalone code block（モバイル1タップコピー）
- 設計は「コードの正しさ」と別に「経済が崩壊しないか」を紙で先に固める（YKK-42 方式）
- 大型変更は litesvm で BPF 実行して初めて CU/heap の現実が見える — ネイティブ単体テストだけで通すのは盲点製造機（YKK-33/40 の教訓）

---

## 6. 未決事項・既知ギャップ（優先度順）

### 6.1 ✅ 旧P0 — 来歴ゲートの無権限書き込み（解消済 `dc540b8`）

`update_card_battle_history`（lib.rs 配線中）のアカウント構造が `payer: Signer` + system_program のみ。**権限チェックもデュエル証明も無い**。任意のウォレットが任意 mint に `wins_delta` を注入でき、promote_card の wins≥10 ゲートを自己申告で突破できる。

- 性質: C5（呼出側レアリティ）・C6（無証明勝利記録）と完全同型の第3例 = **呼び出し側申告の来歴**。YKK-45 で CardBattleHistory が経済ゲートに昇格した瞬間に信頼前提が破綻した
- **解消方法**: 新命令 **`settle_duel_history`**（実装名。初版の仮称 `settle_duel_card_history` から改名）が trustless 書き込み経路を提供。完成 DuelState から winner署名 + card_id をCardMintRecordで解決 + revealed含有 + 保有証明 + u64 bitmap で二重精算防止。回路変更ゼロ・既存データで完結
- **確定した2判断**（初版で「r0ze 判断待ち」としていた点）: ① `update_card_battle_history` は **admin-gate 温存**（完全unwireではなく）② settle 粒度は **1枚/命令**（client が複数を1txバッチ）
- **テスト**: `provenance_settle.rs` 統合テスト9件（settle 4 + timeout 4 + non-admin 1）+ promote unit 13件。全て litesvm で緑（初版指摘の promote テスト0件も解消）
- **実装時に踏んだ落とし穴**（教訓）: (a) `settle_duel_history` の SBF スタックオーバーフロー（frame 5376B/5056B）→ 重い4アカウントを `Box<Account>` 化して解消（commit_hand と同型）。放置すれば devnet で Access violation クラッシュ。(b) `provenance_settle.rs` が `tests/Cargo.toml` に未登録で一度も走っていなかった → 登録して初めて緑を実証。**「テストがある」と「テストが走っている」は別**
- **未決の残り**: admin-gate 温存を mainnet でも許容するか。本書の立場は「devnet 可・mainnet 前に unwire 検討」（admin が来歴を書ける信頼点は "歴史でしかアンロックできない" の対外主張と競合しうる）

### 6.2 ✅ 旧P1 — reveal timeout（解消済 `dc540b8`）

`claim_timeout_win` 命令として実装済（`DUEL_STALL_TIMEOUT_SECONDS=600`）。自分の手番を済ませた側が、期限超過後に放棄側から勝ちを取れる。相互スタック・期限前・請求側が未 reveal のケースは拒否（テスト7件緑）。YKK-44 エスクロー本体の前提となる土台が整った（エスクロー自体は YKK-47 法務待ち）。

### 6.3 実装ブロッカー / インフラ

| 項目 | 内容 | 所在 |
|---|---|---|
| devnet v3 デプロイ | 鍵・送金が絡む人間タスク。runbook 準備済み。これが YKK-12 を塞ぐ | YKK-34 (Urgent) |
| e2e devnet 検証 | Phantom 2ウォレットで init_duel→…→勝敗確定の実機通し。ZKフローの最終証明 | YKK-12 (In Progress) |
| x402 本番 | Fly.io デプロイ（TREASURY_PUBKEY / SOLANA_NETWORK env）+ client memo 付与 | YKK-14 / YKK-13 |
| mainnet ZK | trusted setup 多者 ceremony + VK差し替え | YKK-35 |
| CI | GitHub Actions（test 自動化） | YKK-17 |

### 6.4 設計バランス未決（YKK-43/44 の中身）

- 昇格ゲート数値（U→R / R→L の閾値、kos N）とトークンコスト = 恒常 sink の強さ
- steal の詳細: エスクロー設計、エネルギー制、奪取対象選定の乱数源
- Prize Pool 同時コンプ処理・デッキ枚数制限（GDD TBD 残件）

### 6.5 レガシー処遇

Phase C 3人戦エンジン（YKK-30: reveal 1人で resolve 可能 / YKK-31: 3人戦レーン no-op）。クライアント未使用のため**修理より削除が有力**だが未決。残すなら attack surface として C 級監査対象。

### 6.6 データ整合

YKK-48: `nft/card/*.json` のレアリティが `card_data.rs`（オンチェーン正 30/18/6/6）と乖離（Epic 混入・全枚数不一致）。表示・メタデータ層の信頼を損なうため promote/steal の前に是正。

---

## 7. ドキュメント正本マップと乖離一覧

### 正本マップ（どのドメインは何を信じるか）

| ドメイン | 正本 | 補助 |
|---|---|---|
| カード定義・レアリティ | `card_data.rs`（オンチェーン） | CARD_CATALOG.md は表示用 |
| デュエルルール（現行） | コード（init_duel/commit_hand/reveal_hand/damage_calc）+ YKK-42 | GDD §5 は Gen 2 で stale |
| 経済数値 | コード（constants.rs / GameWorld）+ 2026-06 確定モデル | TOKENOMICS v1.0 は思想面のみ有効 |
| 来歴・昇格 | `0xARK-design-v3-provenance.md` + promote_card 実装 | |
| steal / トークン | YKK-44 / YKK-43（+ 未コミットの session-summary-2026-07-02） | |
| マーケ・世界観 | YKK-28 / YKK-29 | GDD §1–2 の精神は有効 |
| セキュリティ原則 | SECURITY.md + C1–C7 チケット群 | lib.rs doc comment は下記の通り一部不正確 |

### 乖離一覧（発見分すべて）

| # | 項目 | GDD/docs | 実装・最新判断 | 対応 |
|---|---|---|---|---|
| 1 | レアリティ構成 | GDD: 30/20/6/4 | card_data.rs: **30/18/6/6** / metadata: Epic混入 | YKK-48 + GDD追記 |
| 2 | ファクション数 | GDD: 5クラン | card_data.rs: **6ファクション**（Knight/Merchant/Pirate/Scholar/Monk/Engineer） | GDD更新 |
| 3 | steal 枚数 | GDD: 2枚 | **1枚**（2026-07-02, シミュレーション根拠） | GDD更新 |
| 4 | 盤面設計 | GDD: 4フェーズ/3レーン/エネルギー/20枚デッキ | **5枚一括 damage_calc**、DuelState.phase は未使用フィールド | GDD §5 を v3 で書換 or superseded 明記 |
| 5 | 賞金分配 | TOKENOMICS: 勝者80% | **tier×順位分配 + 85/15 スプリット**（claim_prize_v2） | TOKENOMICS 改版 |
| 6 | admin key | lib.rs doc「No admin key」 | devnet は upgrade authority 保持（SECURITY.md が正） + `ADMIN_PUBKEY` 定数も存在 | doc comment 修正 |
| 7 | Poseidon 記述 | lib.rs/reveal_hand コメントに Poseidon(15)+45KB heap の旧記述残存 | 実体は **Poseidon(6) syscall**（poseidon_helper が正） | コメント掃除 |
| 8 | instruction 数 | CLAUDE.md: 52 | lib.rs: **63**（post-hackathon +11） | CLAUDE.md 更新 |
| 9 | 命令の生死 | GDD Appendix C に transform_common / mint_legendary 等 | 一部未実装/改名。evolve_cards は unwire | Appendix C 棚卸し |
| 10 | ante | GDD: Hall ante 0.01/0.05/0.1 実装前提 | ante はフィールドのみ・エスクロー未実装、扱いは YKK-47 待ち | 判断後に反映 |
| 11 | 命令名（本書内） | 初版 §6.1/§8: 仮称 `settle_duel_card_history` | 実装名は **`settle_duel_history`**（card 抜き） | 本更新で修正済 |
| 12 | promote_card 構造 | 初版 §4.4: 単体 C→U・wins≥10・5アカウント | 全ティア ladder + ティア別コスト・8アカウント（game_world/ops_treasury/system_program 追加） | 本更新で §4.4 反映 |

---

## 8. 推奨ネクストアクション（本書からの導線）

1. ~~**P0 の2判断 → settle 実装 + テスト**~~ **完了**（`dc540b8`）: `settle_duel_history`（admin-gate 温存・1枚粒度）+ 統合テスト9件。YKK-45 は Done 相当
2. ~~**reveal timeout 実装**~~ **完了**（`dc540b8`）: `claim_timeout_win`（600s、テスト7件）
3. **YKK-34 デプロイ実施**（r0ze 手番）→ YKK-12 e2e 完走 = ZKフローの実機証明
4. `docs/0xARK-session-summary-2026-07-02.md` / `HANDOFF-TO-FABLE.md` を repo に commit（設計判断の正本散逸防止）
5. **GDD v3.0 改版 or SUPERSEDED 注記**（§7 の10件を反映）— 本書をその下書きとして流用可
6. YKK-47 弁護士アポ（実装と並走・最優先のまま）

---

**現在の次段（`dc540b8` 以降）**:
- **YKK-34 devnet v3 デプロイ**（r0ze 手番、鍵要）→ YKK-12 e2e 実機通し。DuelState がまた成長した（settle bitmap + 旧サイズ変更）ので fresh deploy 必須
- **energy 消費のデュエル入口配線**（現状 refill/regen 判定はあるが、デュエル入口で実際に 1 消費する経路が未接続）
- **YKK-47 弁護士確認**（NFT奪取本体 YKK-44 の前提、Urgent のまま）
- **mainnet 前**: admin-gate 温存の是非（§6.1）、trusted setup 多者 ceremony（YKK-35）
- **doc 保守**: 本書は `dc540b8` 時点。GDD v3.0 全面改版はまだ（§7 の乖離は本書が吸収）

---

*Sources: repo main@0cdbd4a（lib.rs / state.rs / instructions/* / card_data.rs / damage_calc.rs / poseidon_helper.rs / circuits/hand_commitment / constants.rs）、docs/（GDD v2.0・TOKENOMICS v1.0・CARD_SYSTEM_DESIGN v1.0・design-v3-provenance・COMPREHENSIVE_AUDIT・POST_HACKATHON_ROADMAP・SECURITY.md・CLAUDE.md）、Linear YKKZ 全48チケット、2026-07-02 引き継ぎセッション記録。*

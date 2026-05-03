# 0xARK Game Design v2

**作成日:** 2026-05-01  
**ステータス:** Draft — Phase 15 実装の正典  
**対象:** 5/11 ハッカソン提出 + 本番リリース初版

> このドキュメントは **何を実装するか** (ゲーム設計) を記述する。  
> **どう実装するか** (技術アーキテクチャ) は [`docs/epsilon-full-design.md`](./epsilon-full-design.md) を参照。  
> 両ドキュメントは矛盾しない — ε-full の Move Schema (memo encoding) はバトル進行を運ぶインフラとして機能し、本ドキュメントのバトルルールがそのインフラ上で動く。

---

## 目次

1. [ゲーム概要](#1-ゲーム概要)
2. [経済モデル](#2-経済モデル)
3. [賞金分配](#3-賞金分配)
4. [カード構成](#4-カード構成)
5. [Legendary 6枚](#5-legendary-6枚)
6. [バトルルール](#6-バトルルール)
7. [ActionType 6種類](#7-actiontype-6種類)
8. [damage_calc 詳細仕様](#8-damage_calc-詳細仕様)
9. [Waitlist](#9-waitlist)
10. [旧 ε-full design との関係](#10-旧-ε-full-design-との関係)
11. [5/11 実装スコープ (Phase 15)](#11-511-実装スコープ-phase-15)
12. [Known Limitations](#12-known-limitations)

---

## 1. ゲーム概要

### 基本コンセプト

- **1回限りの2週間ゲーム世界** — Season 1 は開始から14日間で完結。延長なし
- **60枚コンプリートレース** — 全60種のカードを最初に集めたプレイヤーが最大報酬を獲得
- **Waitlist 登録制** — 事前登録者のみ参加可能。期限後は次 Season 待ち
- **ナラティブ** — 6つのプレイスタイル (Knight / Merchant / Pirate / Scholar / Monk / Engineer) が競う Web3 カードバトルゲーム

### ゲームの目標

参加者は 0.5 SOL をデポジットして参加し、バトルを通じて他プレイヤーからカードを奪取しながらコレクションを完成させる。60種すべてを集めた時点で勝利条件達成。

---

## 2. 経済モデル

### デポジット

| 項目 | 金額 | 配分 |
|------|------|------|
| 参加デポジット | 0.5 SOL | 運営 15% / Prize Pool 85% |
| 初期カード | ランダム 5枚 | デポジットに含む |

### x402 マイクロペイメント

各エンドポイントの収益は **運営 50% / Prize Pool 50%** に分配。

| エンドポイント | 価格 | 説明 |
|---|---|---|
| `/x402/match-battle` | 0.001 SOL | バトルマッチング料 |
| `/x402/peek-vault-size` | 0.0005 SOL | 相手の vault 枚数のみ確認 |
| `/x402/peek-vault-content` | 0.005 SOL | 相手の手札内容を確認 |
| `/x402/draw-extra` | 0.01 SOL | 追加ドロー |
| `/x402/ai-strategy-advice` | 0.003 SOL | AI戦略アドバイス |
| `/x402/ai-move` | 0.005 SOL | AI による1手委譲 (Phase 14 実装済み) |

> **Note**: `/x402/ai-move` は Phase 14 で既に実装済み。`/x402/match-battle` / `/x402/peek-vault-size` / `/x402/peek-vault-content` / `/x402/draw-extra` / `/x402/ai-strategy-advice` は Phase 15 実装対象。

---

## 3. 賞金分配

### Tier 別累進分配

| Tier | 条件 | Prize Pool 割合 | 分配方式 |
|------|------|----------------|---------|
| Tier 1 | 60枚コンプリート | 50% | 達成者で均等分配 |
| Tier 2 | 50〜59枚 | 25% | 保有枚数比例分配 |
| Tier 3 | 30〜49枚 | 15% | 保有枚数比例分配 |
| Tier 4 | 10〜29枚 | 8% | 保有枚数比例分配 |
| Tier 5 | 1〜9枚 | 2% | 保有枚数比例分配 |

### タイムアウト規則

- Season 終了時 (14日後) に誰も 60枚コンプリートしていない場合、**最高保有者が Tier 1 獲得**
- 持ち越しなし — Season 1 の Pool は Season 1 内で完全清算

### Known Economic Property

Tier 4〜5 (参加者の約 78%) はデポジット以下のリターンとなる。これはトーナメント型経済として意図的な設計 (詳細 → [Section 12](#12-known-limitations))。

---

## 4. カード構成

### 全体

- **総数**: 60種類
- **構成**: 6勢力 × 10枚
- **レアリティ**: Common 5 / Uncommon 3 / Rare 1 / Legendary 1 (各勢力)

### 6勢力

| 勢力 | テーマ | BP | HP | INI | アイデンティティ |
|------|--------|----|----|-----|----------------|
| Knight (騎士) | 守護 | 中 | 高 | 中 | 耐久・防御特化 |
| Merchant (商人) | 取引 | 中 | 中 | 中 | x402 経済連携 |
| Pirate (海賊) | 略奪 | 高 | 低 | 高 | 奪取・先手特化 |
| Scholar (学者) | 知識 | 低 | 中 | 高 | 情報・peek 特化 |
| Monk (僧) | 内省 | 中 | 高 | 低 | 安定・ActionType 耐性 |
| Engineer (技師) | 構築 | 高 | 中 | 中 | ドロー・構築特化 |

### 勢力シナジー

同勢力カードを **3枚以上** 場に出した場合に発動。

| 勢力 | シナジー効果 |
|------|------------|
| Knight × 3 | HP +2 (全自陣カード) |
| Merchant × 3 | x402 アクション 10% 割引 |
| Pirate × 3 | 奪取確率上昇 |
| Scholar × 3 | peek-vault-content 1回無料 |
| Monk × 3 | ActionType 無効化への抵抗 |
| Engineer × 3 | Draw 効果倍増 |

> **5/11 スコープ**: シナジー効果の詳細実装は 5/11 後対応 (Section 11 参照)。

---

## 5. Legendary 6枚

各 Legendary は **先着10人** に配布 (合計 60枚 distribution)。  
入手条件はプレイスタイル別チャレンジ達成による。

### 一覧

| # | 名前 | 勢力 | 入手称号 | 入手条件 | 能力 |
|---|------|------|---------|---------|------|
| 1 | Sentinel | Knight | Conqueror | 5連勝した最初の10人 | バトル開始時、自カード全員 HP +3 |
| 2 | Magnate | Merchant | Patron | x402 累計支出 1 SOL 達した最初の10人 | バトル中、自陣 ActionType 効果 +50% |
| 3 | Marauder | Pirate | Phoenix | 残り3日で Tier 5→Tier 3 達成した最初の10人 | バトル勝利時、追加でランダム1枚奪取 (計2枚) |
| 4 | Oracle | Scholar | Detective | 10人以上の違う相手を peek した最初の10人 | バトル開始時、相手の手札全部見える |
| 5 | Ascetic | Monk | Hermit | x402 一切使わず5連勝した最初の10人 | バトル中、ActionType 一切作動しない (両者) |
| 6 | Architect | Engineer | Sage | 10試合連続で違う ActionType 使った最初の10人 | バトル中、自陣 ActionType 2つ発動可能 |

> **Note**: Legendary 能力の詳細実装は 5/11 後対応 (Section 11 参照)。入手判定: **リアルタイム判定** 確定 (T-8 確定 → Phase 15 B-6 実装)。

---

## 6. バトルルール

### 1試合の流れ

```
1. マッチング
   - 両プレイヤーが /x402/match-battle (0.001 SOL × 2) を支払い

2. 準備フェーズ
   - vault から自由に 5枚選択
   - 各カードに ActionType (6種類から1つ) を割当
   - Legendary は最大 1枚まで
   - Rare を持っていないプレイヤーは Common のみ可 (Rare 要件免除)
   - ZK commit (Poseidon hash) で手札をコミット

3. 中断フェーズ (任意)
   - /x402/peek-vault-content (0.005 SOL) で相手手札を覗ける
   - peek 後、自分の手札から 1枚差し替え可 (無料、ZK再commit)

4. Reveal + ZK 検証
   - 両者が手札を公開
   - ZK proof で commit 整合性を検証

5. Legendary 効果発動 (バトル開始時タイミング)
   - INI 順に発動
   - 衝突時 (同 INI) は INI 高い方が優先

6. ActionType 発動
   - 全10カード (P1 × 5 + P2 × 5) の INI 高い順に順次発動

7. ペア戦闘
   - 同位置同士 (INI でソートした P1 の i番目 vs P2 の i番目)
   - INI 先攻が BP で相手 HP を削る
   - 各ペアは独立

8. 勝敗判定
   - 残り BP 合計で比較 → 多い方が勝者

9. Loot (勝者が奪取)
   - 敗者の場5枚から 1枚ランダム奪取 (破壊カード含む)

10. カード戻し
    - 奪取された 1枚以外は全員 vault に戻る
```

### 制約事項

- 1試合の最大時間: 準備フェーズ 3分 + 中断フェーズ 1分 + Reveal 自動 = 合計約 4〜5分 (T-2 確定)
  - 準備フェーズ タイムアウト時: vault からランダム 5枚、ActionType もランダム割当
  - 中断フェーズ タイムアウト時: peek なし、差し替えなしで進行
- 中断フェーズのタイムアウト: 1分 (T-3 確定)
- 同一相手との連続マッチング制限: TBD (T-4)

---

## 7. ActionType 6種類

各カードに1つ割り当て。全10カードの INI 高い順に順次発動。

| # | 名前 | 効果 |
|---|------|------|
| 1 | UseCrystal | 自 BP +5 |
| 2 | Barrier | 自カードへの最初の攻撃を1回無効化 |
| 3 | UseFlame | 対応する敵カードに固定5ダメージ |
| 4 | UseStorm | 敵全カードの BP -2 + 敵 Barrier 無効化 |
| 5 | UseShadow | 自カードを不可視化 (ペアスキップ — 戦闘なし) |
| 6 | UseVoid | 対応する相手カードの ActionType を打ち消し |

> **damage_calc との対応**: Phase 11 (γ版) で実装済みの `damage-calc.js` は UseCrystal / Barrier / UseFlame / UseStorm / UseShadow / UseVoid の8アクションを処理する。本 v2 設計の ActionType 番号との対応は Phase 15 で整合させる。

---

## 8. damage_calc 詳細仕様

### 入力

```
P1 の場 5枚:
  各カード: { faction, bp, hp, ini, actionType, isLegendary }

P2 の場 5枚:
  各カード: { faction, bp, hp, ini, actionType, isLegendary }

共通 salt:
  deterministic random source (commit 時の salt を XOR 合成)
```

### 処理ステップ

```
Step 0: 勢力シナジー判定
  - P1 の場 5枚で同勢力 3枚以上 → 対応シナジー発動フラグ立て
  - P2 同様

Step 1: ペアリング
  - P1 の 5枚を INI 降順にソート
  - P2 の 5枚を INI 降順にソート
  - 同位置同士をペアにする (P1[0] vs P2[0], ..., P1[4] vs P2[4])

Step 2: Legendary 効果発動 (バトル開始時タイミング)
  - 全 10 カードのうち isLegendary=true のカードを INI 降順に処理
  - 各 Legendary の能力を適用 (Section 5 参照)

Step 3: ActionType 発動
  - 全 10 カードを INI 降順にソートして順次処理
  - 各カードの actionType に応じた効果を適用 (Section 7 参照)
  - INI 同値の場合: salt ベースの決定論的タイブレーク

Step 4: 5ペアの戦闘
  - 各ペアについて:
    - INI が高い方が先攻 (同値 → salt タイブレーク)
    - 先攻: 自 BP で相手 HP を削る
    - 後攻: 相手が生存していれば自 BP で先攻の HP を削る
    - UseShadow 発動済みのカードはペアスキップ
  - 各ペアは独立 (他ペアの結果に影響されない)

Step 5: 勝敗判定
  - P1 残存 BP 合計 vs P2 残存 BP 合計
  - 多い方が勝者
  - 同値の場合: salt ベースの決定論的タイブレーク

Step 6: 破壊カード / 生存カード判定
  - HP <= 0 のカード → destroyed フラグ
  - HP > 0 のカード → survived フラグ
```

### 出力

```
{
  winner: 'p1' | 'p2',
  p1Cards: [{ ...card, finalHp, finalBp, destroyed }] × 5,
  p2Cards: [{ ...card, finalHp, finalBp, destroyed }] × 5,
  lootPool: [...敗者の場5枚 (destroyed 含む)],  // 勝者が1枚選択 or ランダム1枚
  p1BpTotal: number,
  p2BpTotal: number,
  synergyP1: { faction, active } | null,
  synergyP2: { faction, active } | null,
}
```

> **実装状況**: Phase 11 の `damage-calc.js` (tools/ai-agent/src/damage-calc.js + solana/client/src/lib/damage-calc.js) は ActionType 8種 (UseCrystal / Barrier / UseFlame / UseStorm / UseShadow / UseScout / Draw / UseVoid) を処理する既存実装。  
> Phase 15 では 6勢力カードデータと ActionType マッピングを統合し、シナジー Step 0 を追加する。

---

## 9. Waitlist

- ゲーム開始 **14日前** まで登録受付 (T-5 確定)
- 登録者全員参加 (先着制ではなく全員参加)
- 期限後は参加不可 — 次 Season 待ち
- 登録方法: Waitlist サイトから **Phantom 接続 + 即時 0.5 SOL deposit** (T-6 確定)
  - 後払い不可、登録時に即時 deposit が必須
- Waitlist PDA 設計: 各 PlayerState を player wallet seed で derive。GameWorld は singleton PDA (T-7 確定 → Phase 15 B-7 実装)

---

## 10. 旧 ε-full design との関係

| ドキュメント | 記述内容 | 役割 |
|---|---|---|
| `docs/epsilon-full-design.md` | MagicBlock ER + ZK + memo Schema | **どう実装するか** (技術) |
| `docs/game-design-v2.md` (本書) | ゲームメカニクス / 経済モデル / カード設計 | **何を実装するか** (設計) |

### 統合関係

- ε-full の **Move Schema** (`/x402/co`, `/x402/re`, `/x402/hc`, `/x402/hr`, `/x402/pa`, `/x402/rs`, `/x402/me`) はバトルの各フェーズ進行を on-chain memo として記録するインフラ
- game-design-v2 のバトルルール (Section 6) の各ステップが、このインフラ上で実行される
- **整合性確認**: 両ドキュメントに矛盾なし。ε-full は実装手段、本書はルール仕様

### 旧 GDD.md との関係

- `docs/GDD.md` (v2.0, 2026-04-22) は5勢力 (Black Flag / Sovereign Bourse / Hollow Blade / Iron Circle / Nameless Silk) を定義
- 本書 game-design-v2 は6勢力 (Knight / Merchant / Pirate / Scholar / Monk / Engineer) に再設計
- **GDD.md は旧設計として維持するが、Phase 15 以降は本書が正典**

---

## 11. 5/11 実装スコープ (Phase 15)

### 必須実装 (5/11 提出に含める)

| 項目 | 詳細 |
|------|------|
| PlayerState 拡張 | `vault_bitmap` (u64 × 1, 60bit), `deposit_amount` (u64), `win_streak` (u8), `legendary_progress` (各Legendary 進捗カウンタ), `last_action_type` (u8) |
| 6勢力カードデータ | 60枚の bp/hp/ini/faction/rarity/actionType 定義 |
| バトルルール | 新 damage_calc (Step 0〜6、Section 8 準拠) |
| 賞金分配ロジック | Tier 1〜5 累進分配 + タイムアウト処理 (Section 3 準拠) |
| Waitlist 管理 | 登録 PDA + 締切判定 |
| 6 Legendary 入手判定 | リアルタイム判定 (T-8 確定 → B-6 実装) — 各バトル終了後 + x402 支払い後 + peek 後にトリガー |

### 5/11 後対応

| 項目 | 理由 |
|------|------|
| 勢力シナジー詳細効果 | バランス調整が必要 |
| Legendary 6枚の能力詳細 | ZK integration が複雑 |
| バランス調整 | 実プレイデータが必要 |
| AI Agent 経済主体化 | Phase 17 以降 |
| 新 x402 エンドポイント 5種 | `/x402/match-battle` 等 |

---

## 12. Known Limitations

Claude レビューで指摘された点を正面から認識し記録する。

| 項目 | 内容 | 対応方針 |
|------|------|---------|
| **経済格差** | Tier 4〜5 (約 78%) はデポジット以下のリターン | トーナメント型経済として意図的。参加者は了承の上でエントリー |
| **Sybil 耐性** | 複数ウォレットで Legendary 独占が可能 | Phase 17 で Sybil 対策設計予定 |
| **ZK circuit 監査** | Groth16 BN254 circuit は mainnet 前に audit 必要 | mainnet 前に外部 audit を実施 |
| **持続可能性** | Season 1 終了後の継続モデル未設計 | Season 2 設計は 5/11 後 |
| **Legendary 先着10人** | 人数が少ないため特定プレイヤーへの集中リスク | 5/11 後にレビュー |

---

## TBD リスト

| # | 箇所 | 内容 |
|---|------|------|
| T-1 | Section 1 | Season 1 の正確な開始日 (マーケティング決定後) |
| T-4 | Section 6 | 同一相手との連続マッチング制限 (Phase 15 実装中に判断) |
| T-9 | Section 4 | 勢力シナジー詳細効果 (5/11後) |
| T-10 | Section 5 | Legendary 能力詳細実装 (5/11後) |

### 確定済み (Phase 15 で解決)

| 旧 # | 内容 | 確定値 |
|------|------|-------|
| T-2 | 1試合の最大時間 | 準備 3分 + 中断 1分 + Reveal 自動 |
| T-3 | 中断フェーズのタイムアウト | 1分 |
| T-5 | Waitlist 登録期限 | ゲーム開始 14日前 |
| T-6 | 登録方法 | Phantom 接続 + 即時 0.5 SOL deposit |
| T-7 | Waitlist PDA 設計 | player wallet seed PlayerState + singleton GameWorld |
| T-8 | Legendary 入手判定方式 | リアルタイム判定 (B-6) |

---

---

## 13. NFT メカニクス (Phase 16 追加)

*Phase 16 (2026-05-02) で追加。5/11 ハッカソンデモ対象。*

### 13-1. Burn メカニクス

カードを永久破壊し、バトル効果を発動する。

| 属性 | 仕様 |
|------|------|
| 対象 | Burn 能力を持つ Common 6枚 (各勢力 1枚) |
| 実行タイミング | バトル外 — Vault 画面の Card Detail UI から実行 |
| 効果発動 | 次のバトルの Step 0.5 (パッシブ発動直後) に適用 |
| on-chain | `burn_card` Anchor 命令 (SPL Token 永続破壊) |
| 保護 | Rare/Legendary は burn 不可 (rarity ≥ 2) |

**Burn 対象 Common 6枚:**

| カード ID | 名前 | Burn 効果 |
|----------|------|----------|
| 5 | Sacrificial Squire (Knight) | 自陣の他 Knight カード BP +3 |
| 15 | Coin Burner (Merchant) | 自陣全カードの BP ×1.2 (切り捨て) |
| 25 | Powder Charge (Pirate) | 敵全カードに固定 3 ダメージ |
| 35 | Burning Tome (Scholar) | 相手手札を公開 (scout_event) |
| 45 | Mantra Burner (Monk) | 自陣全カードに Barrier 付与 |
| 55 | Forge Worker (Engineer) | 自陣の他 Engineer カード BP +5 |

### 13-2. Evolve / Merge メカニクス

同勢力の Common 2 枚を融合して、マージ限定 Uncommon を生成する。

| 属性 | 仕様 |
|------|------|
| 対象 | 同勢力の Common 2 枚 (親カード) |
| 結果 | マージ限定 Uncommon 1 枚 (子カード) |
| 入手制限 | バトル奪取・ドロップ・ガチャでは入手不可 |
| on-chain | `evolve_cards` Anchor 命令 (親 2 枚 burn + 子 mint) |

**マージ限定 Uncommon 6 枚:**

| カード ID | 名前 | 親カード (ID) |
|----------|------|-------------|
| 8 | Knight Champion | Squire (1) + Guard (2) |
| 18 | Merchant Magnate | Peddler (11) + Trader (12) |
| 28 | Pirate Quartermaster | Cutthroat (21) + Raider (22) |
| 38 | Scholar Lorekeeper | Apprentice (31) + Archivist (32) |
| 48 | Monk Ascender | Novice (41) + Initiate (42) |
| 58 | Engineer Forgemaster | Tinkerer (51) + Mechanic (52) |

60 枚コンプには必ずマージ限定カード 6 枚が必要 → 全 60 枚収集の戦略的障壁。

### 13-3. Imprint メカニクス (5/11 実装分)

バトル後、特定条件達成でカードに永続的な記録 (Imprint) が刻まれる。

| ImprintKey | 条件 | 種別 |
|-----------|------|------|
| `FirstBlood` | プレイヤーの初勝利 | Stat (+1 BP permanent) |
| `FlawlessVictory` | 自カード破壊ゼロで勝利 | Cosmetic (エフェクト) |
| `LegendaryDefeat` | Legendary カード持ちを倒した | Stat (+2 BP vs Legendary) |

on-chain: `grant_imprint` Anchor 命令。5/11 デモでは mock (コンソールログ) として動作。残り 8 種 ImprintKey は 5/11 後対応。

### 13-4. Steal / Provenance (統合済み)

バトル奪取時に `record_card_owner_change_with_steal` 命令で所有権変遷を on-chain 記録。5/11 ではモック呼び出しのみ。

### 13-5. Lease メカニクス (5/11 後対応)

一時貸出機能 (30 分リース)。UI/フロー実装は 5/11 後。on-chain PDA は実装済み。

---

*— 0xARK game-design-v2.md, 2026-05-01 / Phase 16 追加 2026-05-02*

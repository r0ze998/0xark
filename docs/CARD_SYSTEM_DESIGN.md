# 0xARK Card System Design v1.0

> 設計基盤 for T61 (レアリティ実装) → T62 (シナジー) → T63 (チュートリアル)
> 作成: 2026-04-21 (T60)

---

## 1. 現状分析

### 現行カードセット

| 属性 | IDs | 枚数 |
|------|-----|------|
| Attack (攻撃) | 1–12 | 12 |
| Defense (守備) | 13–24 | 12 |
| Flee (逃走) | 25–36 | 12 |
| Magic (魔法) | 37–48 | 12 |
| Recovery (回復) | 49–60 | 12 |
| **合計** | 1–60 | **60** |

### 現行レアリティ

| r値 | 名称 | 枚数 |
|-----|------|------|
| 1 | Common | 10 |
| 2 | Uncommon | 12 |
| 3 | Rare | 18 |
| 4 | Epic | 10 |
| 5 | Legendary | 10 |

### 現行アクションタイプ (9種)

`attack` / `defense` / `flee` / `magic` / `recovery`
→ バトル内では: `Move` / `Shadow` / `Storm` / `Barrier` / `Steal` / `Flame` / `Scout` / `Draw` / `Void`

### 課題

- カードステータスが型 (t) とレアリティ (r) のみ — 深みが不足
- ドロップが均一で floor ごとの差別化が弱い (T51で rate 調整済み)
- シナジーシステムなし → デッキ構築の戦略性が薄い

---

## 2. 提案: 3-tier レアリティ再設計

### ドロップ率 (1バトル当たり)

| Tier | Drop Rate | 枚数 | 特徴 |
|------|-----------|------|------|
| Common | 70% | 42枚 | base action、1種効果 |
| Rare | 25% | 15枚 | boosted effect または dual-type |
| Legendary | 5% | 3枚 | 季節限定、強力効果、named cards |

> 実装: `Math.random() < 0.70` → Common pool, `< 0.95` → Rare, else → Legendary

### 既存レアリティとのマッピング

| 新Tier | 旧r値 | 旧名 |
|--------|-------|------|
| Common | 1–2 | Common / Uncommon |
| Rare | 3–4 | Rare / Epic |
| Legendary | 5 | Legendary |

---

## 3. カードステータス 4軸

各カードに以下を付与 (T61で実装):

| 軸 | 型 | 範囲 | 意味 |
|----|----|------|------|
| `power` | u8 | 1–10 | 効果の強さ (攻撃ダメージ、防御値等) |
| `speed` | u8 | 1–5 | resolve_round での優先度 (5が最速) |
| `cost` | u8 | 0–3 | 使用コスト (単位: 0.001 SOL lamport tier) |
| `duration` | u8 | 1–3 | 効果持続ラウンド数 |

### 既存カードへのデフォルト値割当

レアリティとタイプから自動算出:

```
power    = r * 2 - 1   (r=1→1, r=2→3, r=3→5, r=4→7, r=5→9)
speed    = (flee:5, attack:4, magic:3, defense:2, recovery:1)
cost     = max(0, r - 2)  (r=1,2→0, r=3→1, r=4→2, r=5→3)
duration = (magic:2, recovery:2, others:1)
```

### 代表的なカード例

| ID | Name | Type | r | Power | Speed | Cost | Duration |
|----|------|------|---|-------|-------|------|----------|
| 1 | AEGIS | attack | 5 | 9 | 4 | 3 | 1 |
| 4 | STRIKE | attack | 1 | 1 | 4 | 0 | 1 |
| 12 | VOIDBLADE | attack | 5 | 9 | 4 | 3 | 1 |
| 13 | GUARD | defense | 1 | 1 | 2 | 0 | 1 |
| 24 | TITAN | defense | 5 | 9 | 2 | 3 | 1 |
| 25 | DASH | flee | 1 | 1 | 5 | 0 | 1 |
| 46 | MAELSTROM | magic | 4 | 7 | 3 | 2 | 2 |
| 60 | PHOENIX | recovery | 5 | 9 | 1 | 3 | 3 |

---

## 4. シナジー設計 (T62で実装)

3つのシナジーを実装:

### Synergy 1: Pathfind (Move + Scout)

```
card_a: Move
card_b: Scout
synergy: Pathfind
効果: 次3ラウンド、全rival位置が自分に可視化
icon: 🧭
```

### Synergy 2: Typhoon Shield (Storm + Barrier)

```
card_a: Storm
card_b: Barrier  
synergy: TyphoonShield
効果: 自分への攻撃を反射、そのラウンドのみ
icon: 🌪️
```

### Synergy 3: Soul Burn (Shadow + Flame)

```
card_a: Shadow
card_b: Flame
synergy: SoulBurn
効果: 敵に継続ダメージ (次2ラウンド、各ラウンド-1カード)
icon: 🔥
```

---

## 5. デッキ構築

| 設定 | 値 | 備考 |
|------|----|------|
| 最大所持枚数 | 20枚 | 現在は上限なし (実装: T61) |
| バトル開始時ドロー | 5枚 | 手札 |
| ラウンドごとドロー | 1枚 | |
| デッキ重複 | 不可 | unique cards only |
| シナジー発動 | 同一ラウンドで両カード使用 | |

---

## 6. Progression 設計

### レベルシステム

```
level = vault.size  (コレクション枚数 = プレイヤーレベル)
表示: "Lv.12 Navigator" etc.
```

### レアリティ補正 (level-up bonus)

```
rare_bonus   = floor(level / 20) * 0.01   // 20枚ごとに+1%
legend_bonus = floor(level / 50) * 0.005  // 50枚ごとに+0.5%
```

### Legendary Card 配布

- 季節 (Season) 終了時にdev/on-chain programから配布
- 条件: `vault.size >= 50` かつそのシーズン参加
- 配布方法: `createSeason` / `endSeason` instruction 経由

---

## 7. 実装順序

```
T61: カードレアリティ + ステータス実装
  - on-chain CardData struct 拡張 (rarity, power, speed, cost, duration)
  - 60枚カタログ (CARD_CATALOG.md)
  - drop logic: 3-tier weighted random
  - frontend: rarity color coding + 4軸表示

T62: シナジー / コンボ実装
  - on-chain SYNERGY_TABLE constant
  - resolve_round で synergy check
  - frontend: "SYNERGY!" VFX

T63: チュートリアル
  - isTutorial フラグ
  - step-by-step overlay (6ステップ)
  - tutorial mini-dungeon (小マップ、敵1体)
  - skip + localStorage save
```

---

## 8. 設計上の制約・TBD

- **カードバトル詳細**: ターン構造・リソース設計は別途 TBD (GDD v1.0)
- **敗北時カード喪失**: ロジック未定 (GDD TBD)
- **錬成レシピ**: 未定
- **NFTミントタイミング**: 購入時 or ドロップ時 (GDD TBD)
- **Prize Pool清算**: 複数コンプの場合 (GDD TBD)

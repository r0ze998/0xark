# T20.2 — ZK Circuit Design: dungeon_position
Date: 2026-04-20

---

## 0xARK ダンジョン位置モデル

```
3 エリア (area: 0=Port, 1=Forest, 2=Ruins)
× 16×16 タイルグリッド (x: 0-15, y: 0-15)
= 768 possible positions per player
```

各プレイヤーは 1 position を保持。  
position は `Poseidon(x, y, area, salt)` のコミットメントとしてオンチェーンに保存。  
ZK proof により「正当な移動を行った」ことを、新旧位置を明かさずに証明する。

---

## 回路が証明すること

### Statement

> "I know valid (x, y, area, salt_old) and (new_x, new_y, new_area, salt_new)
> such that:
> 1. Poseidon(x, y, area, salt_old) == old_commitment  
> 2. Poseidon(new_x, new_y, new_area, salt_new) == new_commitment  
> 3. The move (dx, dy, darea) is valid: |dx| + |dy| + |darea| == 1  
> 4. new_x, new_y are within bounds [0, 15]  
> 5. new_area is within bounds [0, 2]"

---

## 入力・出力仕様

### Private inputs (証人、オフチェーンのみ)

| シグナル | 型 | 説明 |
|---------|-----|------|
| `x` | u4 (0-15) | 現在の X 座標 |
| `y` | u4 (0-15) | 現在の Y 座標 |
| `area` | u2 (0-2) | 現在のエリア |
| `salt_old` | u64 | 旧コミットのソルト |
| `dx` | i2 (-1/0/+1) | X 移動量 |
| `dy` | i2 (-1/0/+1) | Y 移動量 |
| `darea` | i2 (-1/0/+1) | エリア移動量 |
| `salt_new` | u64 | 新コミットのソルト |

### Public inputs (オンチェーン検証に渡す)

| シグナル | 型 | 説明 |
|---------|-----|------|
| `old_commitment` | BN254 field | 移動前のコミット (on-chain) |
| `new_commitment` | BN254 field | 移動後のコミット (on-chain に書く) |

### Output

Groth16 proof `[a, b, c]` — Solana `verify_zk_proof` instruction に渡す

---

## 制約詳細

### 制約 1: 旧コミット検証

```circom
Poseidon(x, y, area, salt_old) === old_commitment
```

### 制約 2: 新コミット計算

```circom
new_x = x + dx
new_y = y + dy
new_area = area + darea
Poseidon(new_x, new_y, new_area, salt_new) === new_commitment
```

### 制約 3: 移動有効性 (L1 距離 == 1)

```
|dx| + |dy| + |darea| == 1
```

circom での実装: `dx`, `dy`, `darea` は {-1, 0, +1} の整数だが、
フィールド演算のため BN254 フィールド上の値で表現する。

```circom
// abs(dx) の計算: dx^2 が 0 または 1 → IsZero で分岐
// abs(dx) + abs(dy) + abs(darea) === 1
```

詳細は骨格コードの TODO コメント参照。

### 制約 4: 境界チェック

```circom
0 <= new_x <= 15  (4bit LessEqThan)
0 <= new_y <= 15  (4bit LessEqThan)
0 <= new_area <= 2  (2bit LessEqThan)
```

---

## 制約数見積もり

| 制約 | 推定数 |
|------|--------|
| Poseidon(4) × 2 | ~500 |
| 境界チェック (LessEqThan × 6) | ~60 |
| 移動チェック (abs × 3 + sum) | ~30 |
| 小計 | **~600** |

→ pot12 (2^12 = 4096) で十分。

---

## Dark Forest との比較

| 項目 | Dark Forest | 0xARK |
|------|------------|-------|
| 位置表現 | 2D (x, y) 大座標 | 3D (x, y, area) 16×16 グリッド |
| 移動制約 | x^2+y^2 <= maxDist^2 | \|dx\|+\|dy\|+\|darea\| == 1 |
| Salt per move | Yes | Yes |
| Poseidon inputs | 3 | 4 |
| 曲線 | BN254 | BN254 |

---

## オンチェーン統合フロー

```
[Client]
  1. 毎ターン: new_salt = random()
  2. new_commitment = Poseidon(new_x, new_y, new_area, new_salt) (circomlibjs)
  3. snarkjs.groth16.fullProve(inputs, wasmFile, zkeyFile) → {proof, publicSignals}
  4. proof を commit_action に付与 → WebSocket 経由でサーバーに

[Server / Anchor Program verify_zk_proof]
  5. old_commitment (on-chain), new_commitment (from proof) を public inputs として
  6. groth16-solana::verify_proof() → 検証成功でポジション更新
```

---

## 今後の拡張

- **area 遷移制限**: 特定の境界タイルでのみ darea != 0 を許可 (Phase D)
- **視野制約**: "プレイヤーの視野内に入った場合のみ位置開示" (Phase D)
- **再入可能性**: 同じ commitment を 2 度使えない nonce 管理 (nullifier)

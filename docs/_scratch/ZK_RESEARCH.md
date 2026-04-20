# T20.1 — ZK Research Notes
Date: 2026-04-20

---

## ツールチェーン最新バージョン

| ツール | 最新安定版 | 現在使用 | 備考 |
|--------|-----------|---------|------|
| circom | **v2.2.2** (2025-03) | 2.1.0 (zk/circuits) | 2.1.x→2.2 は BC 変なし |
| snarkjs | **0.7.6** | 0.7.6 | 既導入済 (zk/package.json) |
| circomlib | **2.0.5** | 2.0.5 | 既導入済 |
| rapidsnark | 最新 | 未使用 | ブラウザ不要なら省略可 |

**結論**: 新回路は `pragma circom 2.1.6` を使う。snarkjs / circomlib はそのまま流用。

---

## Groth16 Trusted Setup

- **Powers of Tau**: BN128 (= BN254) 曲線。一度生成したら複数回路で共用可能。
- Hermez の perpetual-powers-of-tau (pot12〜pot28) を使い回せる。
- 新回路ごとに **Phase 2** ceremony (groth16 setup) は必要。
- `dungeon_position` の制約数予測: ~600 (Poseidon×2 + 境界チェック×6 + 移動チェック×3)
  → pot12 (2^12 = 4096 constraints) で十分。
- 既存 `commit_reveal` の pot12 ファイルを使い回す。

---

## Poseidon 互換性

### Circom 側
```circom
include "circomlib/circuits/poseidon.circom";
component hasher = Poseidon(4);  // x, y, area, salt
```
- circomlib の Poseidon は **Iden3 仕様** (BN254 スカラーフィールド)

### Rust 側 (Anchor program)
- `poseidon-rs` crate: Iden3 仕様 ✓
- `light-poseidon` crate: Iden3 仕様 ✓
- Anchor の `solana_program::hash` は SHA-256 — **使用禁止**

### JavaScript 側 (browser verify + test)
- `circomlibjs` の `buildPoseidon()`: Iden3 仕様 ✓ (既に package.json に circomlibjs@0.1.7)

**結論**: circomlib/circomlibjs/poseidon-rs は全て互換。Anchor 側は `poseidon-rs` または `light-poseidon` を使う。

---

## Solana On-chain Verification

- **groth16-solana** (Lightprotocol): BN254 Groth16 検証 < 200K CU
  - crates.io: `groth16-solana`
  - `prepare_inputs()` + `verify_proof()` API
  - 既存 `verify_zk_proof` instruction でこのクレートを使用予定

### 注意点
- Solana の `alt_bn128` syscall を使用 → devnet で利用可
- Proof format: `[a, b, c]` (snarkjs の calldata 出力と一致)
- Public inputs: `[old_commitment, new_commitment]` — u256 として渡す

---

## Dark Forest 参考実装

- Dark Forest v0.6: `circuits/move.circom`
  - Poseidon(x, y, PLANETHASH_KEY) == commitHash の構造
  - 移動距離チェック: `x^2 + y^2 <= maxDist^2`
  - https://github.com/darkforest-eth/darkforest-v0.6

- 0xARK の違い: 距離制約は L1 (|dx|+|dy|+|darea|==1) のみ、座標秘匿はコミットで対処

---

## ブラウザ Proof Generation

- snarkjs 0.7.x の `groth16.fullProve()` は WebWorker 経由でブラウザ動作
- WASM witness calculator: circom 2.x の `--wasm` フラグで生成
- `dungeon_position` (~600 constraints) の browser proof 時間: **< 1秒** (Dark Forest 実測より推定)
- mobile ではもう少し遅い可能性あり (2〜3秒)

---

## 互換性チェックリスト

- [x] circom 2.1.x → 2.1.6 で pragma 統一
- [x] snarkjs 0.7.6 既導入
- [x] circomlib 2.0.5 既導入 (Poseidon template 利用可)
- [x] BN254 curve — circom / Solana / groth16-solana 全て統一
- [x] Poseidon(n) の入力数: circomlib は可変 `Poseidon(n)` テンプレート
- [ ] Anchor 側 verify_zk_proof: groth16-solana クレート追加 (C2-7 で実装)
- [ ] pot12.ptau: commit_reveal 用の既存ファイルを dungeon_position でも使う

---

## 潜在的な問題

1. **フィールド境界**: BN254 のスカラーフィールド < 2^254 — x,y,area,salt は 64bit で十分
2. **salt の uniqueness**: 毎ラウンド新 salt を生成しないと commitment が推測可能
3. **move_darea のエリア遷移**: area transition は特定マス (entry point) でしか発生しない制約が必要 → 今回は boundary check のみで簡略化

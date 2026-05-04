# ZK Review Verification — GPT Top 3 指摘の実コード検証

検証日: 2026-05-04  
対象: docs/zk-review-bundle.md の3ファイル

---

## 前提: ZKパイプラインの構造確認

検証開始前に重要な構造的事実を確認した:

| コンポーネント | 回路 | 実際の接続 |
|---|---|---|
| `circuits/hand_commitment/hand_commitment.circom` | Poseidon(15), 4 public signals | **on-chain verifier 未接続** |
| `verify_zk_proof.rs` の埋め込みVK | `legacy/phase-c/zk/circuits/commit_reveal.circom` (Poseidon(3), 1 public signal) | Phase C legacy — Phase 15 battlesでは未使用 |
| Phase 15 実際のコミット | SHA-256 via `duel-ws.js:computeHandCommitment()` | on-chain `commit_hand` instructionに接続済み |

**重要**: `hand_commitment.circom` と `verify_zk_proof.rs` は現状 **別回路のVKを持ち、接続されていない**。  
Phase 15 battleの本番パスは SHA-256 commit/reveal。ZK は snarkjs が利用可能な場合のオーバーレイ。

---

## 検証1: Public Input Binding (GPT #1)

**指摘**: pubkey が circuit に拘束されていない場合、別 (cards, salt) を後出し可能。

### 調査結果

`circuits/hand_commitment/hand_commitment.circom`:

```circom
// line 22-23: pubkey_lo/pubkey_hi は明示的に public
signal input pubkey_lo;
signal input pubkey_hi;

// line 42-43: Poseidon の入力 [1], [2] として組み込み
hasher.inputs[1]  <== pubkey_lo;
hasher.inputs[2]  <== pubkey_hi;

// line 55 (main component)
component main { public [round, pubkey_lo, pubkey_hi] } = HandCommitment();
```

- `pubkey_lo`, `pubkey_hi` は **public input** として宣言 ✅
- `card_ids[10]` は private だが Poseidon hash の入力 [3..12] に組み込まれており、commitment 出力に暗号学的に拘束されている ✅
- snarkjs の publicSignals: `[commitment, round, pubkey_lo, pubkey_hi]` の4要素

**判定: ✅ 回路設計は安全**

ただし以下の留意点あり:

**⚠️ VK不整合 (接続問題)**: `verify_zk_proof.rs` は `IC[0]` + `IC[1]` のみ (public input 1個のVK)。  
`hand_commitment.circom` は public signal が4個必要。現状このまま `verify_zk_proof` を呼んでも  
`hand_commitment` の proof は **検証に失敗する**。回路とVKが一致していない。

---

## 検証2: Replay Prevention (GPT #3, #8)

**指摘**: ZK proof が再送可能、nullifier / used flag が必要。

### 調査結果

`verify_zk_proof.rs` の `handle_verify_zk()` 全体:

```rust
// line 208: has_committed チェック (1回限定ではない)
require!(ctx.accounts.player_state.has_committed, ErrorCode::NotCommitted);

// line 210-212: Groth16 verify
let vk_x = compute_vk_x(&public_inputs)?;
let valid = groth16_verify(&proof_a, &proof_b, &proof_c, &vk_x)?;
require!(valid, ErrorCode::InvalidProof);

// line 214-219: ログのみ — state 更新なし
msg!("ZK proof VERIFIED for player {} round {} game {}", ...);

Ok(())
```

verify 成功後:
- `has_committed` を `false` に更新しない
- `has_verified` フラグを立てない
- "used proof" PDA を初期化しない

→ 同一 proof を何度送っても `Ok(())` が返る。**Replay 完全無防備**。

**ただし重要なコンテキスト**:  
`verify_zk_proof` は Phase C legacy instruction。Phase 15 の実際の battle flow では使われていない。  
Phase 15 では `reveal_hand` instruction がオンチェーン Poseidon 検証を実行し、  
`DuelLootRecord` PDA による重複防止が別途実装されている。

**判定: ❌ `verify_zk_proof.rs` 単体は Replay 無防備**  
ただしこの instruction は Phase 15 では呼ばれないため、現在の本番ゲームフローへの直接影響はない。

---

## 検証3: Circuit Constraint (GPT #6)

**指摘**: `cards = [999×10]` でも proof が通る可能性。

### 調査結果

`hand_commitment.circom` 全体を精査した結果:

```circom
// card_ids の入力定義
signal input card_ids[10];  // line 27: "card catalog IDs, 0 = empty slot"

// Poseidon 入力への代入 — constraints なし
for (var i = 0; i < 10; i++) {
    hasher.inputs[3 + i] <== card_ids[i];  // line 47-49
}

commitment <== hasher.out;  // line 51
```

- `LessThan` / `GreaterEqThan` / `IsEqual` 等の比較コンポーネント: **ゼロ** ✅
- `include "circomlib/circuits/comparators.circom"`: **なし** (commit_reveal.circom にはある)
- range check (0 ≤ card_id ≤ 60): **なし**
- uniqueness check (重複禁止): **なし**

比較: `legacy/phase-c/zk/circuits/commit_reveal.circom` は正しく実装:
```circom
include "circomlib/circuits/comparators.circom";
component actionMin = GreaterEqThan(4);  // actionType >= 1
component actionMax = LessEqThan(4);     // actionType <= 10
```

**判定: ❌ Critical constraint 欠如**  
`card_ids = [999, 999, 999, 999, 999, 999, 999, 999, 999, 999]` でも valid proof が生成される。  
`card_id = 0` (empty slot) の扱いも未定義のため、空スロットを悪用した proof も通過する。

---

## 総合判定

### 5/11 対応必須

**なし** — 以下の理由:
- Phase 15 の本番 battle フローは SHA-256 commit/reveal (on-chain `commit_hand` / `reveal_hand`)
- `03-zk-prove.js` は snarkjs 未ロード時に `ok: false, fallback: 'sha256'` を返すだけ
- `verify_zk_proof` instruction は Phase 15 battle flow から呼ばれていない
- ZK プルーフがなくてもゲームは正常動作する

### 5/11 後対応必須 (ZK を本番有効化する前)

| # | 問題 | 重要度 | 対応内容 |
|---|------|--------|---------|
| 1 | `hand_commitment.circom`: range check なし | ❌ Critical | `LessThan(7)` で card_id ∈ [1, 60] を拘束 |
| 2 | `hand_commitment.circom`: uniqueness check なし | ❌ Critical | IsEqual × 45 pairs で重複禁止を証明 |
| 3 | VK不整合: on-chain verifier が Phase C legacy 回路のVK | ❌ Critical | `hand_commitment.circom` の trusted setup 実行 → 新VK埋め込み |
| 4 | `verify_zk_proof.rs`: replay 無防備 | ❌ Critical | verify 後に PDA 初期化 or `zk_verified` フラグ更新 |
| 5 | `pubkey_lo/hi` の on-chain 照合なし | ⚠️ High | verify 後にsigner pubkeyと publicSignals[2],[3] を比較 |

### 既に対応済み

- Phase 15 コミット: SHA-256 + duel_id + round PDA で実質的に1回限定 ✅
- `commit_reveal.circom` (Phase C): range check + uniqueness あり ✅
- `multiplayer/server.js`: x402 replay を `usedSigs` Map で防止 ✅
- circuit の pubkey 拘束設計自体は正しい ✅

---

## 修正工数見積もり (5/11 後 — ZK 有効化時)

| タスク | 工数 |
|--------|------|
| `hand_commitment.circom` に range + uniqueness constraints 追加 | 2-3h |
| 新回路のコンパイル + trusted setup (Powers of Tau) | 1-2h |
| Anchor verifier の VK 差し替え + IC array 拡張 (4 public inputs 対応) | 2h |
| `verify_zk_proof.rs` に replay 防止 PDA 追加 | 1h |
| E2E テスト (browser proof generation → on-chain verify) | 2-3h |
| **合計** | **8-11h** |

---

## GPT 指摘の評価

| GPT指摘 | 実コード検証結果 |
|---------|----------------|
| #1 Public Input Binding | **部分的に正しい** — 回路設計は安全だがVK不整合で接続されていない |
| #3/#8 Replay Prevention | **正しい** — `verify_zk_proof.rs` は replay 無防備 |
| #6 Circuit Constraint | **正しい** — range/uniqueness constraint が完全に欠如 |

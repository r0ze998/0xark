# 0xARK · CC Implementation Brief — UI v4 Migration

**Repo**: github.com/r0ze998/0xark
**Live**: r0ze998.github.io/0xark
**Branch**: 新規 `ui-v4-mockup-pack` を main から切る
**Hackathon**: Colosseum Frontier 2026 (deadline 2026-05-11、残 14 日)
**Companion**: Mockup Pack v3 PDF (`docs/mockups/0xARK_Succession_War_Mockups_v3.pdf`)、Hero Sheet Pack v1 (Claude Design 並行作業中)

---

## 背景

旧 UI が 3 世代混在しとる:
- **Phase C** (最古、static mockup ベース)
- **v3.0-plus** (中期、機能追加で継ぎ接ぎ)
- **menu-ui** (近期、別実装試行)

過去に `ui-v2-rebuild` で統合試みたが失敗で凍結。今回 Mockup Pack v3 (16 screens) で UI を完全に統一する。

**ゴール**: 旧 3 世代を削除し、Mockup Pack v3 の 16 screens を vanilla JS で実装。submission demo まで動作する状態に。

---

## Phase 1 — Cleanup (旧 UI 削除)

### Step 1.1 ブランチ作業
```bash
git checkout main
git pull
git checkout -b ui-v4-mockup-pack
```

### Step 1.2 削除対象の特定 (CC が repo grep)

**削除する**:
- Phase C UI 由来のファイル (古い HTML / JS / CSS)
- v3.0-plus UI 由来のファイル
- menu-ui UI 由来のファイル
- 旧 entry point (旧 `index.html`、旧 `main.js` 等)
- 旧 stylesheet (旧 UI に紐づく CSS / SCSS)
- 旧 component / view ディレクトリ (該当するもの)

**残す**:
- `programs/` (Anchor)
- `tests/` (113 Rust + 200 client + 95 AI)
- `circuits/` (Circom + Groth16)
- `server/` (x402)
- `agent/` (AI agent backend)
- NFT minting scripts
- 共通 assets (logo / VT323 font / sound effects)
- `docs/` 全部 (README、REFACTOR_SUMMARY、ZK_VERIFICATION 等)
- Solana client / wallet 接続 logic
- `CLAUDE.md`、`memory.md`

### Step 1.3 削除戦略
- ファイルごと `git rm`、history は git で残るので別途 backup 不要
- ただし旧 UI screenshot を `docs/legacy_ui_archive/` に 1 枚ずつ保存 (failure case 比較用、3 世代 × 1-2 枚)
- `ui-v2-rebuild` branch は触らん (既に凍結済み)

### Step 1.4 cleanup commit
```
chore(ui): remove legacy UI (Phase C / v3.0-plus / menu-ui)
```

---

## Phase 2 — Implementation (Mockup Pack v3 移植)

### Tech stack (現行踏襲)
- **Vanilla JS** (no React、no Vue、no framework)
- **CSS** plain or Tailwind (現行 repo の方を採用、新規導入はしない)
- **VT323 webfont** (Google Fonts or self-host、Mockup Pack v3 と同じ)
- **GBA palette** は CSS custom property で集中管理
- **2px hard border / no AA** は `image-rendering: pixelated` + CSS border

### CSS variable spec
```css
:root {
  /* Clan primary */
  --clan-black-flag: #1a3a5c;
  --clan-hollow-blade: #8c1c2e;
  --clan-iron-circle: #2d5a3d;
  --clan-bourse: #c9a227;
  --clan-nameless-silk: #5a2a7a;

  /* UI base */
  --bg-deep: #0a0e1a;
  --bg-mid: #1a1f33;
  --accent-gold: #c9a227;
  --accent-red: #d63b3b;
  --text-cream: #e8dfc8;
  --border-hard: 2px solid #000;
}
```

### Scene 実装順 (Wave 別)

#### Wave 1 — Submission demo critical (推定 6-8 hr / buffer 込み 12-16 hr)
| # | Scene | 備考 |
|---|---|---|
| 1 | Title A Cinematic Hero | entry point、wallet connect button |
| 2 | M1 Main Lobby (Crown Plaza) | navigation hub、5 clan flag visible |
| 3 | M3 Duel Opening (ZK Commitment) | ZK commit 演出は既存 prover 結果を反映 |
| 4 | M2 Duel Board (4-Phase Battle) | core gameplay、Anchor program 接続点 |
| 5 | M4 Victory | card transfer 演出、tx hash 表示 |

→ Wave 1 完了で **submission video 撮影可能** な最小構成

#### Wave 2 — System screens (推定 4-6 hr / buffer 込み 8-12 hr)
| # | Scene | 備考 |
|---|---|---|
| 6 | S1 Menu Hub (Captain's Cabin) | navigation grid、6 entry |
| 7 | S2 Deck Editor | 60 card storage、20 slot deck |
| 8 | S3 Bourse Shop (x402) | server endpoint と接続 |
| 9 | S8 Defeat | card transfer 逆方向 |

#### Wave 3 — Polish (推定 3-5 hr / buffer 込み 6-10 hr)
| # | Scene | 備考 |
|---|---|---|
| 10 | M5 Card Detail | card inspection、lore shard |
| 11 | S4 Agent Hub | AI agent backend 接続 |
| 12 | S5 Lore Catalog | 5 clan tab、180 shard |
| 13 | S6 Settings | wallet / network / audio / display |
| 14 | S7 How To Play | 9 chapter onboarding |

#### Wave 4 — 任意 (推定 1-2 hr)
| # | Scene | 備考 |
|---|---|---|
| 15 | Title B Information Dense | A/B test 用、なくても submission 影響なし |
| 16 | Title C Card-First | 同上 |

### 実装ガイドライン
- 1 scene = 1 module (`src/screens/{scene_id}.js` 推奨、CC 判断)
- 共通 layout / palette / typography は `src/style/sprite-seas.css` に集約
- Wave 完了ごとに commit (`feat(ui): wave 1 — title + duel core`)
- `console.error` 0 を維持
- mobile responsive は後回し (1024×576 desktop 優先)
- character sprite は **Hero Sheet Pack v1 受領待ち**、それまで placeholder (灰色矩形 + 名前ラベル) で OK

---

## Phase 3 — Integration (既存 logic 接続)

| Screen | 接続先 | 備考 |
|---|---|---|
| Title A | Phantom wallet | 既存 logic 流用 |
| M2/M3/M4 | Anchor program (`5i37jWBiA7bV9XmokyDWHQxjJ5s1sBnSEkPSB4J2XfmN`) | 既存 client 維持 |
| M3 | ZK prover (Circom + Groth16) | 既存 binding |
| S3 | x402 server | endpoint TBD (Fly.io deploy 後確定) |
| S4 | AI agent backend | 既存 binding、Haiku 4.5 セッション管理 |
| S5/S6 | Solana RPC (helius) | 既存 |

---

## Deliverable

- PR: `feat(ui): v4 mockup pack migration (16 screens)`
- 各 Wave ごとに commit
- `README.md` に v4 migration note 追記
- 完了後 `r0ze998.github.io/0xark` で動作確認 (gh-pages deploy)
- screenshot diff: 旧 UI vs v4 を `docs/v4_comparison.md` に記録

---

## 工数見積 (memory 既往: CC ペースは想定の半分)

| Phase | 楽観 | 現実 (×2 buffer) |
|---|---|---|
| Phase 1 (cleanup) | 1 hr | 2-3 hr |
| Phase 2 Wave 1 | 6-8 hr | 12-16 hr |
| Phase 2 Wave 2 | 4-6 hr | 8-12 hr |
| Phase 2 Wave 3 | 3-5 hr | 6-10 hr |
| Phase 2 Wave 4 | 1-2 hr | 2-4 hr |
| Phase 3 (integration) | 2-3 hr | 4-6 hr |
| **合計** | **17-25 hr** | **34-51 hr** |

**Submission deadline (5/11) まで残 14 日**:
- Wave 1 + Phase 1 + 主要 Phase 3 = submission 最低限 (推定 18-25 hr 現実値)
- これは r0ze の他 pending (Fly.io / pitch video / beta tester) と並行可能か要判断

---

## 注意事項

1. **character sprite 待ち**: Claude Design で Hero Sheet Pack v1 並行作業中。Wave 1-2 は placeholder で進行可、受領後 (推定 1-2 日) に差し替え
2. **NFT stack 確認 pending**: S6 の NFT 表記は当面 `NFT STACK · TBD`、CC が Cargo.toml / deps 確認した結果で確定
3. **Mainnet deploy 判断は別 task**: 本 brief は devnet 動作確認まで
4. **31 vs 48 instructions 整合**: 別 task として残ってる、本 migration とは独立
5. **submission 直結度**: Wave 1 > Wave 2 > Phase 1 cleanup > Wave 3 > Wave 4。時間切れの場合 Wave 4 を切る判断推奨

---

## CC 実行時の最初の動き

1. `ui-v4-mockup-pack` branch 作成
2. `find . -name "*.html" -not -path "./node_modules/*"` 等で旧 UI ファイル列挙
3. `r0ze` に削除対象リストを提示して確認 (1 度だけ)
4. 確認後に `git rm` 実行 → cleanup commit
5. Wave 1 着手 → Title A から実装開始

以上。

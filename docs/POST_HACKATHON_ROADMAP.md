# 0xARK — Post-Hackathon Roadmap (Season 2)

Items deferred after the 2026-05-11 hackathon submission.

---

## Wave 1–4 Screens Re-integration

16 screen components in `src/screens/_archive/` are implemented but not wired  
to `solana/client/app.js`. Priority order for Season 2:

| Priority | Screen | File | Reason |
|----------|--------|------|--------|
| 1 | M1 Lobby | `m1-lobby.js` | Multiplayer entry point — needed before open beta |
| 2 | Title A | `title-a.js` | Branding / first impression |
| 3 | S2 Deck Editor | `s2-deck-editor.js` | Deck building UX |
| 4 | S3 Bourse Shop | `s3-bourse.js` | Gacha / marketplace |
| 5 | S5 Lore Catalog | `s5-lore.js` | World-building (6 tabs, KLG/Royal) |
| 6 | S4 Agent Hub | `s4-agent-hub.js` | AI agent management |
| 7 | S7 How To Play | `s7-howtoplay.js` | New player onboarding |
| 8 | M3 Duel Open | `m3-duel-open.js` | Duel entry flow |
| 9 | M4 Victory | `m4-victory.js` | Win celebration |
| 10 | S8 Defeat | `s8-defeat.js` | Loss screen |
| 11 | S1 Menu Hub | `s1-menu.js` | Navigation hub |
| 12 | S6 Settings | `s6-settings.js` | Preferences |
| 13 | M2 Duel Board | `m2-duel-board.js` | Full duel board |
| 14 | M5 Card Detail | `m5-card-detail.js` | Full-screen card view |
| 15 | Title B | `title-b.js` | Alt title |
| 16 | Title C | `title-c.js` | Alt title |

---

## GDD v1.0 TBD Items

| Item | Priority | Notes |
|------|----------|-------|
| カード喪失ロジック (敗北時) | ~~HIGH~~ | ~~Core economic mechanic~~ → **DONE** (claim_battle_loot, Phase 19) |
| デッキ枚数制限 | HIGH | Prevents hand-overflow exploit |
| 錬成レシピ詳細 | MEDIUM | Beyond 2×Common → 1×Uncommon |
| Prize Pool同時クリア処理 | MEDIUM | Race condition when 2 players hit 60 cards |
| 60種カードリスト確定版 | MEDIUM | Currently 60 IDs exist, full attribute list TBD |

---

## Security / Quality Items (from Comprehensive Audit 2026-05-03)

High-priority code hardening before mainnet:

- `server.js`: HTTP body size limit, usedSigs bounded Map, playerPubkey validation
- `onchain.js`: Borsh offset verification, BigInt for game IDs, bounds checks on account reads
- `02-x402.js`: PublicKey validation, split payment cross-check, fetch timeouts
- `strategy-advisor.js`: Context field allowlisting, API key empty-string check

See `docs/COMPREHENSIVE_AUDIT.md` §A for full list.

---

## ZK Mainnet v1 (Season 2)

- Compile `card_commit.circom` for single-card ZK proofs
- Wire `proveHandCommit()` into the preparation phase commit flow
- On-chain verifier integration for Groth16 proofs

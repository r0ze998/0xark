# 0xARK — Claude Code Reference

## Project
On-chain TCG × ZK × x402 × AI agents on Solana.  
Program ID: `5i37jWBiA7bV9XmokyDWHQxjJ5s1sBnSEkPSB4J2XfmN`  
Hackathon deadline: 2026-05-11

## NFT Stack (C-1 confirmed 2026-04-28)
**Standard SPL Token via `anchor-spl`** — NOT Bubblegum cNFT, NOT Light Protocol.  
Deps: `anchor-spl = "1.0.0"` with `["token", "associated_token"]` features.  
Cards are standard SPL token mints managed by the `oxark-cards` program.

## IDL / Instruction Count (C-2, 2026-04-28)
| Source | Count | Status |
|--------|-------|--------|
| `programs/oxark/src/lib.rs` | 48 `pub fn` | Authoritative |
| `target/idl/oxark.json` | 31 | **Stale** — needs `anchor build` |
| `solana/client/oxark-idl.json` | 16 | **Very stale** — needs redeploy |

**Fix**: Run `anchor build` in `solana/oxark/` to regenerate IDL, then copy  
`target/idl/oxark.json` → `solana/client/oxark-idl.json`.  
Then run `init_season_stats(season_id=1)` on devnet.

## UI v4 Screens
Screens live in `src/screens/`. Each exports `mount(container, detail)` / `unmount(container)`.  
Design system: `src/style/sprite-seas.css` (VT323, 1024×576, GBA palette).

| Screen | File | Status |
|--------|------|--------|
| Title A | `title-a.js` | ✓ Wave 1 |
| M1 Lobby | `m1-lobby.js` | ✓ Wave 1 |
| M3 Duel Open | `m3-duel-open.js` | ✓ Wave 1 |
| M2 Duel Board | `m2-duel-board.js` | ✓ Wave 1 |
| M4 Victory | `m4-victory.js` | ✓ Wave 1 |
| S1 Menu Hub | `s1-menu.js` | ✓ Wave 2 |
| S8 Defeat | `s8-defeat.js` | ✓ Wave 2 |
| S3 Bourse Shop | `s3-bourse.js` | ✓ Wave 2 |
| S2 Deck Editor | `s2-deck-editor.js` | ✓ Wave 2 |
| M5 Card Detail | `m5-card-detail.js` | Wave 3 |
| S4 Agent Hub | `s4-agent-hub.js` | Wave 3 |
| S5 Lore Catalog | `s5-lore.js` | Wave 3 (6 tabs incl. Royal/KLG) |
| S6 Settings | `s6-settings.js` | Wave 3 |
| S7 How To Play | `s7-howtoplay.js` | Wave 3 |
| Title B | `title-b.js` | Wave 4 |
| Title C | `title-c.js` | Wave 4 |

## Hero Sprite Mapping (placeholders until /sprites/ PNGs arrive)
| Hero | Screens |
|------|---------|
| Vega | M1, M3, M4, S2, Title A |
| Kuro | M3 |
| Blade Marshal | S2, S5, S3 |
| KLG | M5 |
| Bloodhand | S8 |

## KLG / Royal clan (D confirmed 2026-04-28)
- S5 Lore Catalog has 6 tabs: BF / HB / IC / Bourse / NS / **Royal**
- Royal = KLG (King's Last Guard), currently 1 hero, grid layout for future expansion
- KLG palette: `#d8b034` gold / `#f4ecd0` light / `#9098a8` armor / `#7a8088` dark / `#8c1c2e` red / `#000`
- M5 Card Detail clan band = gold (Royal palette)

## Dev server
```
npx serve . -l 4200
# open http://localhost:4200
```

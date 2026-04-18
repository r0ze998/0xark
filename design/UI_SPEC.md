# UI_SPEC.md — 0xARK Screen Layouts

**Coordinate system**: logical 240×160 px (GBA native). Renderer scales to 480×320 at runtime via `stage.scale = 2`. All coords below are **logical**. PixiJS `roundPixels = true` required.

**Token refs**: any `tok:path.to.key` → look up in `DESIGN_TOKENS.json`. Do not inline hex values.

**Layers**: respect `tok:z_layers.*` draw order. HUD / dialog / banner are the top 3 layers, always above sprites.

---

## 1. TITLE — `01_title`

**Backdrop**
- Sky gradient: fill `0..0..240..100`, `tok:palette.derived_dungeon.dungeon_quiet` → `tok:palette.locked.ocean_deep` vertical.
- Sea gradient: `0..100..240..160`, `tok:palette.locked.ocean_deep` → `tok:palette.derived_dungeon.dungeon_quiet` vertical.
- Horizon line: `0,100 → 240,100`, 1px, `tok:palette.derived_dungeon.dungeon_quiet`.
- Wave accents: 1px horizontal lines at `y=118` (`ocean_shallow` 80% alpha) and `y=132` (`ocean_deep` 90% alpha, 0.5px thick via subpixel render).

**Moon** — right-top anchor
- Position: center `(212, 28)`, radius `7`, fill `tok:palette.locked.sail_cream`.
- Halo: concentric 1px rings at `r=9` (`ocean_deep`), `r=11` (`sail_cream` 20%), `r=13` (`sail_cream` 8%).

**Logo** "0xARK"
- Center `(120, 42)`.
- Text: `"0x"` → size `tok:typography.sizes_px.xxl` (64), color `tok:palette.locked.gold_accent`.
- Text: `"ARK"` → same size, color `tok:palette.locked.sail_cream`.
- Shadow: offset `(+4,+4)` color `dungeon_quiet`; offset `(+2,+2)` color `text_dark` (double drop).
- Letter spacing: `tok:typography.letter_spacing.default`.

**Tagline** "A ZK PIRATE CARD GAME"
- Center `(120, 56)`, size `sm` (16), color `menu_border`, letter-spacing `loose` (0.12).

**Ship sprite** — center
- Bounds: `(56, 82) → (120, 122)` (64×40 box in logical px).
- Hull: trapezoid `polygon(8%,0 92%,0 100%,100% 0,100%)` of bounds, height 11, fill `hull_wood`, border 1px `text_dark`.
- Hull trim: 1px horizontal `gold_accent` stripe at 40% hull height.
- Mast: 2px wide, 25 high, centered, fill `text_dark`.
- Sail: 36×19, fill `sail_cream`, border 1px `text_dark`, inner 1px ring `menu_border`.
- Jolly-roger X: two 9×1 lines at 45°/–45° on sail center, `text_dark`.
- Flag: 7×5, fill `flag_red`, border 1px `text_dark`, attached right of mast top.
- Reflection: `(80, 124) → (136, 125)`, repeating-stripe pattern `ocean_shallow` 2px on / 2px off, alpha 70%.

**Menu box** — bottom-center
- Anchor: `(72, 116)`, size `76×22`.
- Recipe: `drawGBADialog(72, 116, 76, 22, menu_blue, menu_border)`.
- Items: `"NEW SEASON"` (selected), `"CONTINUE"`.
- Font: `sm` (16), line height 1.
- Cursor: `►` at `x=72+4`, color `menu_border`.

**Footer** "SOLANA · GROTH16 · BY YUKIKAZE"
- Center `(120, 153)`, size `xs` (8), color `fg_hint`, letter-spacing `loosest`.
- `"BY YUKIKAZE"` highlighted `menu_border`.

---

## 2. TOWN — `02_town`

**Tile grid**: 15×10 cells of 16px each. Coords below are **tile indices** `(col,row)` converted to px as `(col*16, row*16)`.

**Grass base** — full 240×160
- Fill `tok:palette.derived_overworld.grass_mid`.
- Grid hint: 1px lines every 16px both axes, alpha 15% of `grass_dark`.

**Tree border** — each tile is 16×16, recipe `drawTreeTile(x,y)`
- Fill `grass_dark`, inset `-2,-2` shadow `#1c5028`, inset `+2,+2` highlight `grass_mid`, 1px outer `text_dark`.
- Occupy:
  - Top row: cols 0–14 (all 15)
  - Left col: rows 1–8
  - Right col: rows 1,2,7,8 (break rows 3–6 for harbor)
  - Bottom row: cols 0–14

**Water / harbor** — right side
- Water tiles: cols 14, rows 3–6 (4 tiles of 16×16 each at `(224,48)..(224,96)`). Fill `ocean_shallow` with inset-top 4px `ocean_deep` 50% overlay, inset-bottom 2px `ocean_deep`, 1px outer `ocean_deep`.
- Sand strip: `(208,48)` 16×64, fill `sand_beach`.
- Dock: `(208,84)` 28×6, repeating 3px `hull_wood` / 1px `#5c3818` pattern, 1px outer `text_dark`.
- Anchored ship: `(228,74)` 10×9, top 4px `sail_cream`, bottom 5px `hull_wood`, 1px outer `text_dark`. Mast 1×5 at `(232,69)`, flag 4×3 at `(233,69)` fill `flag_red`.

**Path network** — recipe `drawPathRect(x,y,w,h)` fill `path_tan`, 1px outer `path_shadow`
- Main horizontal spine: `(16,96) 192×16`
- Drops to top buildings: `(48,64) 16×32`, `(120,64) 16×32`, `(176,64) 16×32`
- Drops to bottom buildings: `(48,112) 16×32`, `(120,112) 16×32`, `(176,112) 16×32`
- Harbor spur: `(192,96) 16×16`

**Buildings** — 6 houses, all 36×32 px, recipe `drawHouse(x, y, w, h, roofToken)`
| id | pos | roof token |
|---|---|---|
| shop   | `(30,30)`  | `roof_red` |
| gacha  | `(102,30)` | `#7040a0` (purple) |
| stats  | `(158,30)` | `menu_blue` |
| log    | `(30,110)` | `#c8a868` (barn tan) |
| dungeon | `(102,110)` | `roof_red` |
| tavern | `(158,110)` | `menu_blue` |

**Signs** — recipe `drawSign(x, y, text)`
- Size: 16–20×10, fill `sail_cream`, 1px border `text_dark`, inset bottom 2px `path_tan`. Text size `6` (exception: hand-tuned for dense labels), color `text_dark`. Post: 2×4 `hull_wood` under center.
- Positions: under each building door.

**Decorations**
- Bushes (8×6): fill `grass_dark`, 1px border, inset `(+1,+1)` `grass_mid` highlight. Placed at path edges near buildings.
- Flowers (3×3 px): colors rotate `vega_pulse` / `gold_accent` / `sail_cream`. Clumps of 1–2 along main road.

**HUD bar** — recipe `drawHUD()`
- Bounds: `(0,0) → (240,14)`, fill `menu_blue`, bottom border 1px `text_dark`, below that 1px `menu_border`, below that 1px `text_dark` (total 3px shadow stack).
- Text: size `sm` (16), color `text_light`.
- Slots left → right with `spacing.3` (12px) gap:
  1. `♥ HP 78/100`
  2. `◆ 0.5◎` (SOL balance)
  3. `V: TWN` color `vega_pulse`
  4. `M: B2` color `mira_pulse`
  5. right-aligned: `CARDS 12/60`

**Location banner** — recipe `drawLocationBanner(text, cx, y)`
- Center `(120, 22)`, auto-width to fit text + 32 px padding.
- Height 16, fill `menu_blue`, border 2px `text_dark` + 1px inner `menu_border`.
- Text: `"FIRST PORT"` size `sm` (16), color `menu_border`.
- Slide-in animation: translateY `-16 → 0` over `tok:animations_ms.banner_slide_in` (300ms), easeOutQuad.

**Dialog box** — recipe `drawGBADialog(8, 128, 224, 30, menu_blue, menu_border)`
- Text starts `(12, 132)`, size `sm` (16), color `text_light`, line height 1.1.
- Cursor `►` in `menu_border` at start of line.

**NPC sprites** (placeholder gradient columns until sprites arrive)
- Old sailor: `(72, 82)` 12×14.
- Player: `(104, 100)` 12×14.

---

## 3. DUNGEON B1–B5 — `03_dungeon`

**Backdrop**
- Fill `tok:palette.derived_dungeon.dungeon_fog` (#100818).

**Floor grid** — 24px dungeon tiles, recipe `drawDungeonFloor(x,y,w,h)`
- Fill `dungeon_floor` (#c89060), inset 1px darken 40% for edges.
- Floor grid lines: 1px every 24px, alpha 20% of `dungeon_wall`.

**Walls** — recipe `drawDungeonWall(x,y,w,h)`
- Fill `dungeon_wall` (#482818), 1px outer `text_dark`, inset-top 2px `#5c3818` highlight.

**Fog-of-war overlay**
- Full-screen `dungeon_fog` at alpha 82%, with circular `destination-out` cutout radius 48 around player tile. Radius animates 46↔50 at `tok:animations_ms.breathe` (3600ms).

**Rival pulse indicator** — shown only when same floor
- Position: appears at random fog coord each frame (or actual tile if SCOUT used).
- Visual: 8×8 `vega_pulse` diamond, alpha pulses 40%↔100% at 800ms period.

**HUD (same as town)** with floor position slot
- `V: B3` if rival on deeper floor (pink)
- Otherwise `V: TWN` (muted)
- `M: B2` (amber)

**Location banner** "B1 — TIDEPOOL" etc. Banner color stays `menu_blue` + `menu_border`; floor number prefix in `menu_border`.

**Player sprite** — 12×16, centered in current tile.

**Stairs** — 16×16, 4 stacked horizontal stripes alternating `dungeon_floor` / `#5c3818`. Up-stair: lighter top. Down-stair: darker top.

---

## 4. BATTLE — 5 states

**Shared HUD** (all battle states)
- Top bar: `(0,0) → (240,14)`, recipe `drawBattleHUD()`. Same styling as town HUD but text layout:
  - Left: `ROUND 04` in `menu_border`
  - Center: phase label (`COMMIT` / `SIGN TX` / `REVEALING` / `RESULT`)
  - Right: rival status, colored by identity (`vega_pulse` / `mira_pulse`).

**Shared arena backdrop** (states 2, 4, 5)
- `(0,0) → (240,88)` fill `tok:palette.locked.ocean_deep` (sky/upper).
- `(0,88) → (240,160)` fill `tok:palette.derived_dungeon.dungeon_floor` (ground).
- 1px horizon line at `y=88`, color `text_dark`.

**HP boxes** (states 2 & 5) — recipe `drawHPBox(x, y, variant, pct, name, meta)`
- Size: 70×24, `min_width` 70 logical px.
- Variants: `you` (top-right), `vega` (top-left), `mira` (top-left).
- `you` at `(162, 20)`, `vega`/`mira` at `(8, 20)`.
- Title: name + level, size `sm` (16), color per variant.nm.
- Bar: recipe `drawHPBar(x+2, y+12, 66, pct, variant)`.
- Meta line: size `xs` (8), color matching variant.nm.

**Combatant placeholders**
- YOU: `(30, 85)` 36×36 — placeholder column gradient per current code.
- Rival: `(174, 35)` 36×36.

---

### 4.1 `battle_01_vs_splash` — hold `tok:animations_ms.vs_splash_hold` (800ms)
- Full screen fill `text_dark`.
- Band top `(0..0..240..80)`: repeating 45° `flag_red`/`text_dark` stripes, 8px per stripe.
- Band bottom `(0..80..240..160)`: repeating -45°, `menu_blue`/`text_dark`.
- Player portrait box `(20, 30)` 48×48, placeholder gradient (current columns).
- Rival portrait box `(172, 82)` 48×48, placeholder.
- `"YOU · L.10"` tag: `(8, 12)` size `md` (24), color `menu_border`, shadow `text_dark` (+2,+2).
- `"VEGA · L.12"` tag: `(160, 130)` size `md`, color `vega_pulse`, shadow `text_dark`.
- `"VS"` center: `(120, 80)`, size `xxl` (64), color `menu_border`, shadow offset `(+4,+4) text_dark` and `(-4,-4) flag_red`. Box: 56×36 centered, fill `text_dark`, border 4px `menu_border`, outer 4px `text_dark`.
- Transition: on `vs_splash_hold` elapse → `battle_02_select`.

---

### 4.2 `battle_02_select` — user commits an action
- Arena backdrop visible.
- VEGA hpbox top-left `(8,20)`.
- YOU hpbox top-right `(162,20)`.
- Combatants visible (placeholders).
- **Action menu** bottom-right — recipe `drawActionMenu(x, y, w, items, selectedIdx)`
  - Bounds `(150, 100) → (232, 152)`, 82×52.
  - Fill `sail_cream`, border 2px `text_dark`, inner 2px `menu_border`.
  - Title row `"CHOOSE ACTION"`: size `xs` (8), color `hull_wood`, 1px bottom border `hull_wood`.
  - Items (5): `DRAW (+)`, `STEAL (⚔)`, `BARRIER (◈)`, `SCOUT (✦)`, `USE CARD (★)`.
  - Selected row: fill `flag_red`, text `menu_border`, cursor `►` in `menu_border`.
  - Icon glyph size `md` (24) column, then label size `sm` (16).
  - Pad 3×2.
- Dialog-bottom left `(8, 130)` 134×22 with prompt `"What will you commit?"` + subline `"ZK-HIDDEN UNTIL REVEAL"` in `menu_border` size `xs`.

State transitions:
- ↓/↑ changes `selectedIdx`
- Z/confirm → `battle_03_confirming`

---

### 4.3 `battle_03_confirming` — sealed / waiting
**Override backdrop**
- Fill `tok:palette.derived_dungeon.dungeon_quiet` (#0c0818).
- Pixel noise: 2 radial-dot layers at 8×8 and 12×12 tile size, colors `text_dark` and `#1c1438`, alpha 90%.
- Breath vignette: radial gradient from transparent center to `dungeon_quiet` 60% at 90%, alpha pulses 70%↔100% at `tok:animations_ms.breathe` (3600ms), ease-in-out.

**Combatants**: faded to alpha 60%.

**Sealed chests** — 2 instances, recipe `drawChestSprite('sealed')`
- Rival chest: `(164, 36)` 32×32, label below `"VEGA SEALED"` size `xs` color `vega_pulse`, 0.08 letter-spacing.
- Player chest: `(44, 86)` 32×32, label below `"YOU · SEALING..."` size `xs` color `ocean_shallow`.
- Both chests sway ±1° at `tok:animations_ms.sway` (3200ms), player offset -1.6s for desync.
- Both chests have gold shimmer: box-shadow `0..0 10px gold_accent 45%` pulses at `tok:animations_ms.shimmer` (2800ms).

**Commit card** — `(72, 60)` 96×28
- Fill `sail_cream`, border 2px `text_dark`, inner 2px `menu_border`.
- Line 1: `"► STEAL (COMMITTED)"` size `sm` (16), color `hull_wood`.
- Line 2: `"SHA-256 hash broadcast to chain"` size `xs` color `fg_hint`.
- Line 3: `"0x4ae9…3c1f"` size `xs` color `fg_hint`, letter-spacing `tight`.

**Dialog-bottom**: `"Your action is sealed on-chain. Waiting for reveal phase…"` subline in `menu_border`.

State transitions:
- On-chain commit confirm → `battle_04_resolving`.

---

### 4.4 `battle_04_resolving` — Groth16 verify + clash
- Arena backdrop restored.
- Combatants full opacity, slight flash animation.
- Reveal VFX overlay (full-screen, alpha):
  - Radial gold burst at 50%/50%, inner transparent, mid `gold_accent` 30% at radius 45%, outer transparent at 60%.
  - Thin 45° gold stripes `gold_accent` 20%, 6px on / 6px off.
- Chests open — recipe `drawChestSprite('opening')` at same positions as state 3.
- Big text `"CLASH!"` center `(120, 80)`, size `xl` (48), color `menu_border`, shadow offset `(+3,+3) flag_red`, `(-2,-2) text_dark`. Flash 300ms step-end.
- Dialog-bottom: `"Groth16 proof verified. Settling round on Solana…"` subline in `menu_border` size `xs`.

State transitions: on tx confirm → `battle_05_result`.

---

### 4.5 `battle_05_result`
- Arena backdrop dimmed (brightness 75%).
- HP boxes restyled for outcomes:
  - VEGA top-left variant `vega` with meta `"STEAL BLOCKED"`.
  - YOU top-right variant `you` with meta `"BARRIER HELD ✓"`.
- **Result banner** — recipe `drawResultBanner(text)` center `(120, 80)`
  - Size `xl` (48), color `menu_border`, shadows `(+4,+4) flag_red` and `(-2,-2) text_dark`.
  - Box: fill `text_dark`, border 3px `menu_border`, outer 3px `text_dark`, inner 3px `flag_red`.
  - Text values: `VICTORY!` / `BLOCKED!` / `HIT!` / `STOLEN!` / `DEFEAT`.
- **Loot card mini** — `(20, 96)` 50×44, recipe `drawCardMini(x, y, cardData)`.
  - Art tile 32×32 filled by card rarity color (`flag_red` common, etc.).
  - Footer name size `sm`, No. label size `xs` `hull_wood`.
  - Label below: `"SAFE"` / `"STOLEN"` / `"LOST"` size `xs` `menu_border`/`vega_pulse`/`fg_muted`.
- **Result log** — `(8, 130) → (232, 152)` bottom dialog
  - Line 1: `"► VEGA used STEAL."`
  - Line 2: `"YOU used BARRIER — BLOCKED!"`
  - Line 3: size `xs` color `fg_muted`: `"tx: 5sK2…9bQe · CU 94k"`.

State transitions: `Z` → next round (back to `battle_02_select`) or round-end → dungeon.

---

## 5. CARD DETAIL / COLLECTION — `05_collection`

**Layout**
- Grid: 10 cols × 6 rows at tile size 32px `card_small` tile. Effective usable area 240×144 below a 16px HUD.
- Cell size 20×28, spacing 4px.

**Rarity tiers** (5) encoded by left-border stripe color:
| tier | stripe token | count |
|---|---|---|
| Common    | `hull_wood`   | 24 |
| Uncommon  | `grass_mid`   | 16 |
| Rare      | `ocean_shallow` | 10 |
| Epic      | `vega_magenta` | 7 |
| Legendary | `gold_accent` | 3 |

**Card mini** per cell — recipe `drawCardMini(x, y, {collected, rarity, art})`
- Border 1px `text_dark`. Top 20×20 art. Bottom 8px footer with `No.0NN` in size `xs` color `hull_wood`.
- If not collected: full cell filled `text_dark` alpha 70%, art replaced with `"?"` in `fg_muted`.
- Rarity stripe: 4px left column in rarity color.

**Category tabs** — left-edge column 20×20 buttons at `(2,18)` vertical stack. 5 icons:
- ⚔ Attack, ◆ Defense, ✦ Escape, ★ Magic, ✿ Recovery. Selected tab: fill `flag_red`, border `menu_border`.

**Stats panel** — right-edge sidebar 60×120 at `(178, 20)`
- Fill `menu_blue`, border 2px `text_dark` + 2px inner `menu_border`.
- Shows selected card: large art 40×40, name size `sm`, rarity stripe, description 4 lines size `xs`.
- `"COLLECTED 12/60"` at bottom size `xs` color `menu_border`.

---

## 6. VICTORY / GAME OVER — `06_victory`

**Backdrop** — solid `menu_blue` with 45° gold stripe pattern at 12% alpha.

**Title banner** — center `(120, 32)`
- `"VICTORY!"` / `"GAME OVER"` — size `xxl` (64), color `menu_border`, shadow `(+4,+4) text_dark`, `(-2,-2) flag_red`.
- Box: auto-width + 32px pad, fill `text_dark`, border 4px `menu_border`, outer 4px `text_dark`.

**Stats block** — `(28, 72) → (148, 140)` 120×68
- Recipe: `drawGBADialog(...)`.
- Lines (size `sm` 16, left-aligned):
  - `"FLOORS CLEARED  5"` — label in `fg_muted`, value in `menu_border`.
  - `"CARDS WON       7"`
  - `"TIME            08:42"`
  - `"RIVAL BOUNTY    +0.3◎"`

**Prize pool claim** — `(156, 72) → (232, 140)` 76×68
- Recipe `drawPrizeCard(state)`.
- States: `available` / `pending` / `claimed`.
  - `available`: bg `menu_blue`, border `menu_border`, gold `◎` coin icon 24×24 at top, `"CLAIM 0.5◎"` size `sm` in `menu_border`, flashing cursor `►`.
  - `pending`: same visual but with animated `"…"` cycling at `tok:animations_ms.cursor_blink`.
  - `claimed`: fill `text_dark`, border `fg_muted`, strikethrough text `"CLAIMED"` in `fg_muted`.

**Dialog-bottom** with share prompt: `"Tweet your run · Press X"`.

---

## 7. LANDING PAGE — `07_landing`

**Viewport**: 1280×720 (not GBA). Pixel art stays pixelated; HTML document not Pixi.

**Hero section** — 1280×480
- Background: tiled GBA seas at 4× zoom. Full-bleed.
- Centered `"0xARK"` logo at 256px base font, same double-shadow treatment.
- Tagline: `"A ZK PIRATE CARD GAME ON SOLANA"` size 32px, `menu_border`, letter-spacing 0.1em.
- CTA buttons: `[PLAY DEMO] [CONNECT WALLET] [GDD]` — 3 inline buttons, `drawMenuButton(...)` recipe at 2× scale.

**Core loop strip** — 1280×160
- 5 icon+label tiles in a row, no gaps between: `EXPLORE → BATTLE → COMMIT → REVEAL → CLAIM`.
- Each tile: 256×160, alternating fill `menu_blue` / `ocean_deep`.
- Icon: 64×64 pixel sprite (chest, sword, scroll, etc.) in `menu_border` color.
- Label: size 24px `text_light` below icon.
- Arrow between: 16px `►` in `menu_border`.

**Footer**: `"Built by Yukikaze · Colosseum Frontier Hackathon submission"` size 16px `fg_hint`.

---

## Shared animation timings (ms)

See `tok:animations_ms.*`:
- `cursor_blink`: 500 — menu cursors, waiting prompts
- `breathe`: 3600 — fog-of-war, confirming vignette
- `sway`: 3200 — sealed chests, hanging lanterns
- `shimmer`: 2800 — gold trim on commit chests
- `vs_splash_hold`: 800 — state 1 duration
- `paywall_shatter`: 600 — x402 unlock burst
- `chest_crack`: 500 — state 4 chest opening
- `banner_slide_in`: 300 — location banners
- `dialog_reveal`: 200 — dialog text reveal per line
- `shake_hit`: 200 — damage shake

## Accessibility / portability notes

- **Integer pixel snap**: PixiJS `roundPixels = true`, `resolution = 1`.
- **Font rendering**: load `fonts/VT323-Regular.ttf` via `PIXI.Assets` before first text draw. Any fallback must be pixel bitmap; never system serif/sans.
- **Scaling**: `app.stage.scale.set(2)` for rendering; capture resolution stays logical 240×160.
- **Sprites**: placeholder columns remain usable; when real sprite sheets are loaded, drop in as `PIXI.Sprite` at the same anchor coords — no layout shift.

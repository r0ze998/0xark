# UI_SPEC v2.0 — Phase D Reborn Screen Layouts

**Source**: 5 design mockups (Desktop/0xark/preview*.webp, M1–M5)  
**Canvas**: 480×320 logical (same as Phase C). All coords logical px unless noted.  
**Renderer**: canvas 2D (05-lobby.js) — not PixiJS.  
**Layers (draw order, bottom→top)**: background → floor → buildings → remote players → local player → HUD-fixed → dialogs → overlays

---

## Section 1 — LOBBY: The Crown Plaza (`sc === 'lobby'`)

Reference mockup: **M1 · Main Lobby — The Crown Plaza (1/5)**

### 1.0 Gap vs. current implementation

| Element | Current (Day 6) | Target (M1) |
|---------|-----------------|-------------|
| Background | `#0a1218` solid | Sunset gradient sky + silhouette horizon |
| Floor | Pirate sheet tiles / fallback solid | Stone cobblestone grey grid |
| Area title | None | "THE CROWN PLAZA" gold-framed center-top |
| Top-right HUD | 1 box, 2 lines (T-D6-2) | 3 stacked panels |
| Bottom bar | [Z] prompt only | Full-width: player info + ticker + SOL balance |
| Buildings | Brown rect + gold border | Drawn sprites with awning/columns/icons |
| Building labels | Centered inside rect | Below building, always visible |
| Local player | Gold square + direction triangle | Block character (head + clan-colored body) |
| Remote players | Clan-colored rectangle | Block character matching local style |
| Debug overlay | "LOBBY x:N y:N" top-left | Remove |

---

### 1.1 Background layers

**Sky gradient** (not camera-scrolled — fixed)
- Bounds: `(0, 0) → (W, H*0.45)` — top 45% of canvas
- `createLinearGradient(0, 0, 0, H*0.45)`
  - stop 0.0 → `#c04820` (warm orange-red)
  - stop 0.5 → `#803060` (amber-purple mid)
  - stop 1.0 → `#2a1838` (deep purple)
- Draw BEFORE camera translate (fixed to canvas)

**Horizon silhouette**
- Bounds: `(0, H*0.42) → (W, H*0.42 + 10)`
- Fill `#141420` — dark city silhouette strip
- 2–3 irregular rectangle "towers" shapes: widths 40/20/30px, heights 6/10/4px, spaced across width
- Draw BEFORE camera translate

**Floor tiles** (replaces pirate-sheet dependency)
- Per tile `(tx, ty)`: fill `#888898`, then 1px grid lines at tile edges in `rgba(60,60,80,0.3)`
- Ocean (tileId=18): fill `#1a2840`
- Cliff/border (tileId=36): fill `#4a3828`
- Path (tileId=3): fill `#a89878` with subtle hash crosshatch `rgba(0,0,0,0.08)` at 8px intervals

---

### 1.2 Building sprites

Replace current `rgba(60,40,20,0.7)` rect + `strokeRect` with per-building drawn sprites.
All drawn within `(bx, by, bw, bh)` = `(obj.x*TS, obj.y*TS, obj.w*TS, obj.h*TS)`.

#### 1.2.1 SHOP `(x:0, y:14, w:4, h:3)` → 128×96px

```
drawLobbyBuildingShop(bx, by, bw, bh):
  // Body
  fillRect(bx+4, by+12, bw-8, bh-16) = '#d8c898' // cream stone
  strokeRect 1px '#5a4020'
  // Awning: top 14px, alternating 8px stripes red/cream
  for i in 0..ceil((bw-8)/8):
    fill col i%2 ? '#cc3333' : '#e8d0a0'
    rect(bx+4+i*8, by+12, min(8, bw-8-i*8), 14)
  // Awning shadow
  fillRect(bx+4, by+26, bw-8, 3) = 'rgba(0,0,0,0.25)'
  // Windows: 2× at ~25% and 65% width, y=by+32, 16×16
  drawWindow(bx+20, by+32)
  drawWindow(bx+bw-36, by+32)
  // Door: 14×22, bottom-center
  fillRect(bx+bw/2-7, by+bh-22, 14, 22) = '#7a4020'
  strokeRect 1px '#3a1a08'
  // Door knob: 3×3 '#c8a040' at right-center
  // Label below building
  fillText('SHOP', bx+bw/2, by+bh+12) // see §1.6
```

#### 1.2.2 FACTION HQ `(x:9, y:3, w:7, h:3)` → 224×96px

```
drawLobbyBuildingFactionHQ(bx, by, bw, bh):
  // Base body: grey-cream stone
  fillRect(bx, by+8, bw, bh-8) = '#c0b898'
  // Columns: 4× 8px wide, full body height, evenly spaced
  for i in [1,2,3,4]:
    x = bx + i*(bw/5) - 4
    fillRect(x, by+10, 8, bh-10) = '#e8e0d0'
    strokeRect 1px '#a09070'
  // Pediment (triangular roof suggestion): filled rect top
  fillRect(bx+8, by, bw-16, 12) = '#c0b898'
  strokeRect 1px '#5a4820'
  // Clan banners: 2 hanging from pediment bottom
  // Banner A (left-of-center): 14×40px, clan A color (default '#cc3333')
  // Banner B (right-of-center): 14×40px, clan B color (default '#c8a020')
  drawBanner(bx+bw*0.35-7, by+10, 14, 40, LOBBY_BANNER_A_COLOR)
  drawBanner(bx+bw*0.65-7, by+10, 14, 40, LOBBY_BANNER_B_COLOR)
  // Crown icon centered top
  fillText('♛', bx+bw/2, by+9) // 10px gold
  // Label
  fillText('FACTION HQ', bx+bw/2, by+bh+12)
```

`LOBBY_BANNER_A_COLOR` and `LOBBY_BANNER_B_COLOR`: top-2 clans by player count from WS, fallback `['#cc3333','#c8a020']`.

#### 1.2.3 PC BOX `(x:5, y:14, w:4, h:3)` → 128×96px

```
drawLobbyBuildingPCBox(bx, by, bw, bh):
  // Body: dark blue-grey
  fillRect(bx+4, by+12, bw-8, bh-16) = '#2a3050'
  strokeRect 1px '#404868'
  // Blue accent strip: top 12px of body
  fillRect(bx+4, by+12, bw-8, 12) = '#4060c0'
  // Diamond icon centered
  fillText('♦', bx+bw/2, by+bh/2+4) = '#80a0ff', 22px VT323
  // 2 small square windows
  drawWindow(bx+14, by+bh-30, '#4060c0')
  drawWindow(bx+bw-30, by+bh-30, '#4060c0')
  // Label
  fillText('PC BOX', bx+bw/2, by+bh+12)
```

#### 1.2.4 BRONZE HALL `(x:10, y:14, w:4, h:3)` → 128×96px

```
drawLobbyBuildingArenaHall(bx, by, bw, bh, tier):
  // tier: 0=Bronze, 1=Silver, 2=Gold
  const colors = {
    0: { body:'#484858', star:'#888898', crown:'#c8a040', label:'BRONZE HALL' },
    1: { body:'#505868', star:'#c0c8d8', crown:'#b0b8c8', label:'SILVER HALL' },
    2: { body:'#604820', star:'#e0c040', crown:'#e0c040', label:'GOLD HALL'   },
  }[tier]
  const borderColor = tier===2 ? '#e0c040' : '#888898'
  // Body
  fillRect(bx+2, by+8, bw-4, bh-10) = colors.body
  strokeRect 2px borderColor
  // Crown icon top-center
  fillText('♛', bx+bw/2, by+14) = colors.crown, 10px
  // Stars row (tier+2 stars) at y=by+22
  const stars = tier+2 // Bronze=2, Silver=3, Gold=4
  for s in 0..stars:
    fillText('★', bx+bw/2 + (s-(stars-1)/2)*12, by+22) = colors.star, 10px
  // Oval entrance: ellipse at center-bottom of building
  g.beginPath()
  g.ellipse(bx+bw/2, by+bh-24, 22, 14, 0, 0, Math.PI*2)
  fillStyle '#0a0a14'
  g.fill()
  // Entrance glow: 2 green dots (lights) at ellipse edge
  // left light: (bx+bw/2-18, by+bh-24), radius 3, '#40cc60'
  // right light: (bx+bw/2+18, by+bh-24), radius 3, '#40cc60'
  g.beginPath(); g.arc(bx+bw/2-18, by+bh-24, 3, 0, Math.PI*2); fill '#40cc60'
  g.beginPath(); g.arc(bx+bw/2+18, by+bh-24, 3, 0, Math.PI*2); fill '#40cc60'
  // Label
  fillText(colors.label, bx+bw/2, by+bh+12)
```

Silver and Gold Halls use same recipe: pass tier=1/tier=2.

#### 1.2.5 SILVER HALL `(x:15, y:14, w:4, h:3)` → same recipe, tier=1
#### 1.2.6 GOLD HALL `(x:20, y:14, w:4, h:3)` → same recipe, tier=2

---

### 1.3 Player & remote player sprites

Recipe: `drawLobbyCharacter(cx, cy, clanColor, nameStr, isLocal)`

```
drawLobbyCharacter(cx, cy, clanColor, nameStr, isLocal):
  const TS = LOBBY_TS  // 32
  const sx = cx + TS/2, sy = cy + TS/2  // sprite center
  
  // Drop shadow
  g.fillStyle = 'rgba(0,0,0,0.35)'
  g.fillRect(sx-7, sy+9, 14, 4)
  
  // Legs: 2 small rects
  g.fillStyle = '#2a2028'
  g.fillRect(sx-5, sy+3, 4, 6)
  g.fillRect(sx+1, sy+3, 4, 6)
  
  // Body: clan-colored rect
  g.fillStyle = clanColor
  g.fillRect(sx-6, sy-5, 12, 10)
  g.strokeStyle = 'rgba(0,0,0,0.5)'; g.lineWidth=1
  g.strokeRect(sx-6, sy-5, 12, 10)
  
  // Head: skin tone
  g.fillStyle = '#c8a060'
  g.fillRect(sx-5, sy-14, 10, 10)
  g.strokeStyle = '#5a3818'; g.lineWidth=1
  g.strokeRect(sx-5, sy-14, 10, 10)
  
  // Eyes (2px each, direction-based)
  g.fillStyle = '#2a1808'
  // (simplified: always show front-face for now)
  g.fillRect(sx-3, sy-12, 2, 2)
  g.fillRect(sx+1, sy-12, 2, 2)
  
  // Local player: yellow hat strip
  if (isLocal):
    g.fillStyle = '#e0c040'
    g.fillRect(sx-5, sy-15, 10, 3)
  
  // Name label above sprite
  g.fillStyle = isLocal ? '#f0e0a0' : '#8888aa'
  g.font = '9px VT323, monospace'
  g.textAlign = 'center'
  g.fillText(nameStr.slice(0,8), sx, cy+2)
```

**Local player name**: `window.solana?.publicKey?.toBase58().slice(0,6)+'…'` or `'YOU'`
**Remote player name**: `rp.wallet.slice(0,6)+'…'` as before

---

### 1.4 Area title — "THE CROWN PLAZA"

Fixed, not camera-scrolled. Draw AFTER g.restore() (HUD layer).

```
// Center-top gold panel
const title = 'THE CROWN PLAZA'
g.font = 'bold 14px VT323, monospace'
g.textAlign = 'center'
const tw = g.measureText(title).width + 28
const tx = (W - tw) / 2, ty = 6, th = 20
g.fillStyle = '#0e0e22'
g.fillRect(tx, ty, tw, th)
g.strokeStyle = '#c8a460'; g.lineWidth = 2
g.strokeRect(tx+1, ty+1, tw-2, th-2)
g.fillStyle = '#f0e0a0'
g.fillText(title, W/2, ty+14)
```

---

### 1.5 Top-right HUD — 3 stacked panels (replaces T-D6-2 single box)

All panels right-anchored at `W-4`, stacked from `y=4`.

```
Panel 1 — cards (H=20px, W=122px):
  bg '#0e0e22', border 1px '#c8a460'
  text: '♦ {lobbyHudCards ?? '—'} / 60 CARDS'
  ♦ in '#c8a460', rest in '#f0d060'
  font: 'bold 13px VT323, monospace'
  x=W-4 right-aligned, y=4..24

Panel 2 — day/season (H=16px, W=122px):
  bg '#0e0e22', border 1px '#333350'
  text: 'DAY {lobbyHudDay ?? '—'} / {lobbyHudTotalDays} – SEASON 1'
  color '#8888cc', font '12px VT323, monospace'
  y=25..41

Panel 3 — event name (H=14px, W=122px):
  bg '#0c0c1c', border 1px '#222240'
  text: lobbyHudEventName ?? 'SUCCESSION WAR OF ELYON'
  color '#555570', font '11px VT323, monospace'
  y=42..56
```

`lobbyHudEventName`: optional — read from Season PDA `name` field or hardcode `'SUCCESSION WAR OF ELYON'` for now.

---

### 1.6 Bottom info bar — full-width

Height: 36px, anchored `y = H - 36 = 284`.
Draw AFTER g.restore(), BEFORE dialogs.

```
// Bar background
g.fillStyle = '#1a2040'
g.fillRect(0, H-36, W, 36)
g.strokeStyle = '#c8a460'; g.lineWidth=1
g.strokeRect(0, H-36, W, 1)  // top border gold

// LEFT section: player info (w=160px)
g.fillStyle = '#111830'
g.fillRect(0, H-36, 160, 36)
g.strokeStyle = '#333358'; g.lineWidth=1
g.strokeRect(160, H-36, 1, 36)  // divider
g.fillStyle = '#c8a460'
g.font = '12px VT323, monospace'; g.textAlign='left'
g.fillText('▶', 8, H-20)
g.fillStyle = '#f0e0a0'
g.fillText(lobbyBottomName, 20, H-20)    // 'CAPT. VEGA' or wallet short
g.fillStyle = '#6080e0'
g.fillText(lobbyBottomClan, 20, H-8)     // 'BLACK FLAG' or '—'

// CENTER section: ticker (w=W-160-84=236px at 480)
g.fillStyle = '#aaaacc'
g.font = '11px VT323, monospace'; g.textAlign='center'
const tickerText = lobbyBottomTicker || 'THE KING IS DEAD. THE CONTEST CONTINUES.'
g.fillText(tickerText.slice(0,38), 160 + 118, H-18)  // static for now, scroll later

// RIGHT section: SOL balance (w=84px)
g.fillStyle = '#111830'
g.fillRect(W-84, H-36, 84, 36)
g.strokeStyle = '#c8a460'; g.lineWidth=1
g.strokeRect(W-84, H-36, 1, 36)  // divider
g.fillStyle = '#c8a460'
g.font = '12px VT323, monospace'; g.textAlign='right'
g.fillText('♦', W-56, H-20)
g.fillStyle = '#f0d060'
g.fillText(lobbyBottomSol ?? '—', W-6, H-20)  // '2.41' or '—'
```

**New state vars**:
```js
let lobbyBottomName   = 'YOU';        // wallet short or display name
let lobbyBottomClan   = '—';          // clan from WS presence or '—'
let lobbyBottomTicker = '';           // event text from Season PDA or default
let lobbyBottomSol    = null;         // SOL balance string (async loaded)
```

**Loading**: in `enterLobby()`, async:
- `lobbyBottomName`: from localStorage `oxark_wallet_name` or wallet pubkey short
- `lobbyBottomClan`: from WS `presence_update` self-message
- `lobbyBottomSol`: `conn.getBalance(playerKey)` → `(lamports/1e9).toFixed(3)`

---

### 1.7 Building labels (always visible below buildings)

Replace current label-inside-rect with below-building labels.
Draw in world-space (inside `g.save/g.restore` camera block), AFTER building sprites.

```
for obj of LOBBY_OBJECTS:
  const lx = (obj.x + obj.w/2) * TS
  const ly = (obj.y + obj.h) * TS + 10
  
  // Measure + background pill
  g.font = 'bold 10px VT323, monospace'
  g.textAlign = 'center'
  const lw = g.measureText(obj.label).width + 10
  g.fillStyle = 'rgba(0,0,0,0.6)'
  g.fillRect(lx - lw/2, ly-10, lw, 13)
  
  // Text
  g.fillStyle = '#f0e0a0'
  g.fillText(obj.label, lx, ly)
```

Note: update `LOBBY_OBJECTS` labels: remove emoji (`🥉 BRONZE` → `BRONZE HALL`), use clean text.

---

### 1.8 Proximity prompt — updated position

With the bottom bar occupying y=284–320, move prompt to just above it:

```
if (lobbyNearBuilding):
  g.fillStyle = 'rgba(14,14,34,0.85)'
  g.fillRect(W/2-100, H-60, 200, 22)
  g.strokeStyle = '#c8a460'; g.lineWidth=1
  g.strokeRect(W/2-100, H-60, 200, 22)
  g.fillStyle = '#f0e0a0'
  g.font = '13px VT323, monospace'; g.textAlign='center'
  g.fillText('[Z] Enter ' + lobbyNearBuilding.label, W/2, H-44)
```

---

### 1.9 Remove debug overlay

Remove (or guard with `window.LOBBY_DEBUG`):
```js
// DELETE this block:
g.fillStyle = 'rgba(0,0,0,0.5)'
g.fillRect(4, 4, 130, 18)
g.fillStyle = '#aaa'
g.fillText(`LOBBY  x:${lobbyPx} y:${lobbyPy}`, 8, 17)
```

---

## Section 2 — DUEL: ZK Commitment Opening (`M3`)
*(Separate Day spec — placeholder, details TBD)*

## Section 3 — BATTLE: Card Arena (`M2`)
*(Separate Day spec — placeholder, details TBD)*

## Section 4 — VICTORY Screen (`M4`)
*(Separate Day spec — placeholder, details TBD)*

## Section 5 — CARD INSPECTION Modal (`M5`)
*(Separate Day spec — placeholder, details TBD)*

---

## Day 8 Task List — Lobby Re-implementation

Based on Section 1 above. Ordered by dependency (parallelizable within groups).

### Group A — Background & floor (no dependencies)
| Task | Est | Spec ref |
|------|-----|----------|
| **T-D8-1** Background: sky gradient + horizon silhouette | 45min | §1.1 |
| **T-D8-2** Floor: cobblestone tile recipe + cliff/ocean/path colors | 30min | §1.1 |

### Group B — HUD panels (depends on state vars from T-D6-2)
| Task | Est | Spec ref |
|------|-----|----------|
| **T-D8-3** Top-right HUD: replace single box → 3 stacked panels | 45min | §1.5 |
| **T-D8-4** Area title "THE CROWN PLAZA" | 20min | §1.4 |
| **T-D8-5** Bottom info bar: draw + wire state vars (name/clan/SOL/ticker) | 1.5h | §1.6 |

### Group C — Building sprites (depends on B — need bottom bar H to avoid collision)
| Task | Est | Spec ref |
|------|-----|----------|
| **T-D8-6** SHOP sprite | 30min | §1.2.1 |
| **T-D8-7** FACTION HQ sprite + clan banner wiring | 45min | §1.2.2 |
| **T-D8-8** PC BOX sprite | 20min | §1.2.3 |
| **T-D8-9** Arena Halls (Bronze/Silver/Gold) shared recipe | 45min | §1.2.4–6 |
| **T-D8-10** Building labels below buildings | 20min | §1.7 |

### Group D — Player sprites & polish
| Task | Est | Spec ref |
|------|-----|----------|
| **T-D8-11** Player sprite: `drawLobbyCharacter()` recipe | 45min | §1.3 |
| **T-D8-12** Remote player sprites: apply same recipe | 20min | §1.3 |
| **T-D8-13** Proximity prompt: reposition above bottom bar | 15min | §1.8 |
| **T-D8-14** Remove debug overlay | 5min | §1.9 |

**Total estimate: ~7.5h**  
Parallelizable: A+B can run concurrently, C after B, D after C.

---

## Color Reference (Section 1)

| Role | Hex |
|------|-----|
| Sky top | `#c04820` |
| Sky mid | `#803060` |
| Sky bottom | `#2a1838` |
| Horizon silhouette | `#141420` |
| Floor stone | `#888898` |
| Floor grid line | `rgba(60,60,80,0.3)` |
| Path | `#a89878` |
| Ocean | `#1a2840` |
| Cliff | `#4a3828` |
| Gold border | `#c8a460` |
| Panel bg dark | `#0e0e22` |
| Panel bg navy | `#111830` |
| Bottom bar bg | `#1a2040` |
| Title text | `#f0e0a0` |
| Card count text | `#f0d060` |
| Day/season text | `#8888cc` |
| Event name text | `#555570` |
| Player name (local) | `#f0e0a0` |
| Clan text | `#6080e0` |
| SOL balance | `#f0d060` |
| Ticker text | `#aaaacc` |
| Player skin | `#c8a060` |
| Player hat | `#e0c040` |

---

*UI_SPEC v2.0 — 0xARK Phase D Reborn*  
*Authored: 2026-04-22, based on design mockups M1–M5*

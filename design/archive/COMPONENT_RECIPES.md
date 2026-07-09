# COMPONENT_RECIPES.md — PixiJS Drawing Primitives

Implementation-ready recipes for the 0xARK rendering layer. Each recipe maps to one reusable function in `solana/client/src/05-rendering.js` or `06-world-systems.js`.

**Conventions**
- All sizes/positions are **logical px** (GBA-native 240×160 coord space). Renderer scales ×2.
- All color args are **token keys** (e.g. `"menu_blue"`), not hex. Resolve via `tokens.palette.locked[key]` / `tokens.palette.semantic[key].ref` chain. Provide a `resolveToken(key)` helper that walks `ref` indirection.
- Integer pixel snap: `g.position.set(x|0, y|0)`, `PIXI.settings.ROUND_PIXELS = true`.
- Each recipe returns a `PIXI.Container` or `PIXI.Graphics` so callers can position, animate, and destroy uniformly.
- Text uses one `PIXI.TextStyle` factory `makeText(size, colorToken, letterSpacing)` — always VT323, weight 400.

---

## Index

1. `drawGBADialog(x, y, w, h, fillToken, borderToken)`
2. `drawHPBar(x, y, w, pct, colorToken)`
3. `drawMenuButton(x, y, label, icon, selected)`
4. `drawActionIcon(shape, colorToken)` — `+` `⚔` `◈` `✦` `★`
5. `drawChestSprite(state)` — `'sealed' | 'opening' | 'open'`
6. `drawLocationBanner(text, x, y)`

Plus supporting primitives used by these: `drawHPBox`, `drawMenuList`, `drawCardMini`.

---

## 1. drawGBADialog

**Signature**

```js
drawGBADialog({
  x, y, w, h,
  fillToken   = 'menu_blue',
  borderToken = 'menu_border',
  outerBorderToken = 'text_dark',
  text = null,        // optional string to render with padding
  textSize = 24,      // tokens.typography.sizes_px.md
  textColorToken = 'text_light',
  cursorGlyph = null  // e.g. '►'
}) -> PIXI.Container
```

**Visual anatomy** (outside-in)

```
┌──────────────────────────┐  ← text_dark, 2px  (outer)
│ ┌──────────────────────┐ │  ← menu_border, 2px (inner)
│ │                      │ │
│ │ ► What will you ...  │ │  ← fill (menu_blue), 16/12 pad
│ │                      │ │
│ └──────────────────────┘ │
└──────────────────────────┘
```

**Pseudocode**

```js
const container = new PIXI.Container();
const g = new PIXI.Graphics();
const dark = resolveToken('text_dark');
const inner = resolveToken(borderToken);
const fill = resolveToken(fillToken);

// outer 2px band
g.beginFill(dark); g.drawRect(0, 0, w, h); g.endFill();
// inner 2px band
g.beginFill(inner); g.drawRect(2, 2, w-4, h-4); g.endFill();
// fill
g.beginFill(fill); g.drawRect(4, 4, w-8, h-8); g.endFill();
container.addChild(g);

if (text) {
  const t = makeText(textSize, textColorToken, tokens.typography.letter_spacing.default);
  t.text = (cursorGlyph ? cursorGlyph + ' ' : '') + text;
  t.position.set(tokens.spacing_px[4], tokens.spacing_px[3]); // 16, 12
  container.addChild(t);
}

container.position.set(x|0, y|0);
return container;
```

**Notes**
- No radii. All rects pixel-aligned.
- To render multi-line text, split on `\n` and stack `PIXI.Text` nodes by `size * line_height.normal` (1.1).
- Animate reveal: set each text node's `.alpha = 0` then stagger fade-in over `dialog_reveal` (200ms) per line.

---

## 2. drawHPBar

**Signature**

```js
drawHPBar({
  x, y,
  w = 66,
  pct,                    // 0..1
  variant = 'you'         // 'you' | 'vega' | 'mira' | 'low'
}) -> PIXI.Container
```

**Visual anatomy**

```
┌───────────────────────┐   ← text_dark outline (1px)
│█████████░░░░░░░░░░░░░│   ← fill by variant
│ highlight on top row  │   ← rgba(255,255,255,0.6) 1px
└───────────────────────┘
height = 8, pad = 1
```

**Pseudocode**

```js
const h = tokens.component_tokens.hp_bar.height;     // 8
const pad = tokens.component_tokens.hp_bar.pad;      // 1
const fillKey = tokens.component_tokens.hp_bar.fills[variant]; // 'hp_you' etc
const fill = resolveToken(fillKey);
const dark = resolveToken('text_dark');

const container = new PIXI.Container();
const g = new PIXI.Graphics();

// outline
g.beginFill(dark); g.drawRect(0, 0, w, h); g.endFill();
// bg (dark hollow)
g.beginFill(0x000000, 0.3); g.drawRect(pad, pad, w-2*pad, h-2*pad); g.endFill();
// fill
const fillW = Math.max(0, Math.round((w - 2*pad) * pct));
g.beginFill(fill); g.drawRect(pad, pad, fillW, h-2*pad); g.endFill();
// inner highlight (top 1px of filled region)
g.beginFill(0xffffff, 0.6); g.drawRect(pad, pad, fillW, 1); g.endFill();
container.addChild(g);

// auto-switch to low variant when pct < 0.25
if (pct < 0.25 && variant === 'you') {
  // re-fill in hp_low; cheap: redraw or tween color
}

container.position.set(x|0, y|0);
return container;
```

**Animation**
- Damage: tween `pct` from old→new over 400ms, ease-out. During tween, flash 1px `gold_accent` inner highlight.
- Low-HP blink: below 25%, toggle fill between `hp_low` and `text_dark` at 400ms period.

---

## 3. drawMenuButton

**Signature**

```js
drawMenuButton({
  x, y,
  w,                    // fixed or auto from label width
  label,
  icon = null,          // glyph char (optional leading icon)
  selected = false
}) -> PIXI.Container
```

**Visual — unselected**

```
  ♥ NEW SEASON
```
- No background. Icon + label, size `sm` (16), color `text_light`.

**Visual — selected**

```
► ♥ NEW SEASON
```
- Cursor `►` prepended in `menu_border`.
- If inside a boxed menu (act-menu style): row fills `flag_red`, label → `menu_border`.

**Pseudocode**

```js
const container = new PIXI.Container();
const sel = tokens.component_tokens.menu_button;
const padX = sel.padding.x;
const padY = sel.padding.y;
const size = sel.text_size; // 16

if (selected && container.inBoxedMenu) {
  const bg = new PIXI.Graphics();
  bg.beginFill(resolveToken('flag_red'));
  bg.drawRect(0, 0, w, size + 2*padY);
  bg.endFill();
  container.addChild(bg);
}

const textColor = selected ? 'menu_border' : 'text_light';
const parts = [];
if (selected) parts.push(sel.cursor_glyph);
if (icon) parts.push(icon);
parts.push(label);

const t = makeText(size, textColor, tokens.typography.letter_spacing.default);
t.text = parts.join(' ');
t.position.set(padX, padY);
container.addChild(t);
container.position.set(x|0, y|0);

return container;
```

**Notes**
- Selected cursor `►` blinks off every 500ms (`cursor_blink`): `cursor.alpha = (Math.floor(t/500) % 2)`.
- For top-level title menu (no box bg), use alpha only — no fill.

---

## 4. drawActionIcon

**Signature**

```js
drawActionIcon({
  shape,                // '+' | 'sword' | 'diamond' | 'sparkle' | 'star'
  size = 24,
  colorToken = 'text_light'
}) -> PIXI.Graphics
```

**Glyph map** (used everywhere in action menus)

| Shape | Glyph | Meaning | Primary color token |
|---|---|---|---|
| `plus`    | `+` | DRAW     | `menu_border` |
| `sword`   | `⚔` | STEAL    | `flag_red` |
| `diamond` | `◈` | BARRIER  | `ocean_shallow` |
| `sparkle` | `✦` | SCOUT    | `vega_pulse` |
| `star`    | `★` | USE CARD | `gold_accent` |

**Recipe (pixel-drawn, not text glyph)**

For maximum pixel fidelity, draw each as `PIXI.Graphics` primitives rather than relying on font glyphs (fonts vary). 16×16 sprite at `size=16`, `2×` for `size=32`.

```js
const g = new PIXI.Graphics();
const color = resolveToken(colorToken);
const dark  = resolveToken('text_dark');
const s = size / 16; // scale factor

switch (shape) {
  case 'plus':
    g.beginFill(color);
    g.drawRect(7*s, 3*s, 2*s, 10*s);  // vert bar
    g.drawRect(3*s, 7*s, 10*s, 2*s);  // horiz bar
    g.endFill();
    // 1px dark outline: stroke equivalent via 4 offset draws
    break;

  case 'sword':
    g.beginFill(color);
    // blade
    g.drawPolygon([8*s,1*s, 10*s,3*s, 10*s,11*s, 8*s,13*s, 6*s,11*s, 6*s,3*s]);
    g.endFill();
    g.beginFill(dark);
    // guard
    g.drawRect(4*s, 11*s, 8*s, 1*s);
    // grip
    g.drawRect(7*s, 12*s, 2*s, 3*s);
    g.endFill();
    break;

  case 'diamond':
    g.beginFill(color);
    g.drawPolygon([8*s,2*s, 14*s,8*s, 8*s,14*s, 2*s,8*s]);
    g.endFill();
    g.beginFill(0xffffff, 0.4);
    g.drawPolygon([8*s,4*s, 11*s,7*s, 8*s,8*s, 5*s,7*s]); // highlight
    g.endFill();
    break;

  case 'sparkle':
    g.beginFill(color);
    g.drawRect(7*s, 1*s, 2*s, 14*s);   // vert
    g.drawRect(1*s, 7*s, 14*s, 2*s);   // horiz
    g.drawRect(3*s, 3*s, 2*s, 2*s);    // TL sparkle
    g.drawRect(11*s, 3*s, 2*s, 2*s);   // TR
    g.drawRect(3*s, 11*s, 2*s, 2*s);   // BL
    g.drawRect(11*s, 11*s, 2*s, 2*s);  // BR
    g.endFill();
    break;

  case 'star':
    g.beginFill(color);
    // 5-point pixel star
    g.drawPolygon([8*s,1*s, 10*s,6*s, 15*s,6*s, 11*s,9*s, 13*s,14*s,
                   8*s,11*s, 3*s,14*s, 5*s,9*s, 1*s,6*s, 6*s,6*s]);
    g.endFill();
    break;
}

return g;
```

**Notes**
- Keep all icons at 16×16 source, scale by integer multiples only.
- Call site passes token; this recipe should not hardcode color.

---

## 5. drawChestSprite

**Signature**

```js
drawChestSprite({
  state,               // 'sealed' | 'opening' | 'open'
  variant = 'rival',   // 'rival' | 'player' — small color accent
  size = 32
}) -> PIXI.Container
```

**States**

### `sealed`
- 32×32 body:
  - Top half (16px): fill `#a07040` (lid), bottom edge 1px `text_dark`.
  - Bottom half: fill `hull_wood`, bottom edge 1px `#5c3818`.
  - Outer 1px border `text_dark`.
- Clasp: 4×4 `menu_border` centered at front seam (y=14).
- Lock: 8×10 `menu_border`, 1px `text_dark` outline, centered at front face (y=18).
  - Shackle: 6×4 `menu_border` arch above lock, 1px `text_dark`.
- Gold shimmer: 2px `menu_border` outer glow pulsing `shimmer` (2800ms).
- Sway: rotate ±1° at `sway` (3200ms).

### `opening`
- Lid rotated +35° around bottom-left of lid piece.
- Lock broken off: draw 2 halves falling — left 4×5 (-2,+4) offset rotated -20°, right 4×5 (+4,+4) rotated 25°.
- Light beam: 3 wedges of `gold_accent` at alpha 70/50/30% radiating upward from chest mouth, 18/24/30 px tall.
- Sparkle specks: 4 random 2×2 `menu_border` rects at alpha 100% within 16px radius of chest center.
- Crack timing: `chest_crack` (500ms) ease-out.

### `open`
- Lid fully open (at ~75°).
- Interior: fill `text_dark` with 1 highlight rect `gold_accent` 4×4 at front (coin) OR scroll mini — caller decides via extra prop.
- No shimmer. Static.

**Pseudocode sketch**

```js
const container = new PIXI.Container();
const body = new PIXI.Graphics();
drawChestBody(body, size);
container.addChild(body);

if (state === 'sealed') {
  const shackle = drawLock();
  container.addChild(shackle);
  attachSwayAnim(container);
  attachShimmerFilter(body);
}
else if (state === 'opening') {
  const lid = drawLid(); lid.pivot.set(0, size/2); lid.rotation = deg(-35);
  container.addChild(lid);
  container.addChild(drawLightBeams());
  container.addChild(drawSparkles());
  playCrackTween(lid, tokens.animations_ms.chest_crack);
}
else if (state === 'open') {
  const lid = drawLid(); lid.pivot.set(0, size/2); lid.rotation = deg(-75);
  container.addChild(lid);
  container.addChild(drawInterior());
}

return container;
```

**Call sites**
- Battle state 3: `drawChestSprite({ state: 'sealed', variant })` for both rival + player.
- Battle state 4: swap in-place to `state: 'opening'`.
- Battle state 5: swap to `state: 'open'` if the chest revealed loot (optional).

---

## 6. drawLocationBanner

**Signature**

```js
drawLocationBanner({
  text,
  cx,                   // center x
  y,
  animate = true        // slide-in from above
}) -> PIXI.Container
```

**Visual**

```
┌──────────────────────┐   ← text_dark 2px outer
│┌────────────────────┐│   ← menu_border 2px inner
││ FIRST PORT         ││   ← menu_border text, size 16
│└────────────────────┘│
└──────────────────────┘
```

**Pseudocode**

```js
const cfg = tokens.component_tokens.location_banner;
const t = makeText(cfg.text_size, cfg.text_ref, tokens.typography.letter_spacing.loose);
t.text = text;
const padX = cfg.padding.x;
const padY = cfg.padding.y;
const w = t.width + 2 * padX;
const h = cfg.text_size + 2 * padY;

const container = new PIXI.Container();
const bg = new PIXI.Graphics();
bg.beginFill(resolveToken('text_dark'));      bg.drawRect(0, 0, w, h);         bg.endFill();
bg.beginFill(resolveToken(cfg.border_ref));   bg.drawRect(2, 2, w-4, h-4);     bg.endFill();
bg.beginFill(resolveToken(cfg.fill_ref));     bg.drawRect(4, 4, w-8, h-8);     bg.endFill();
container.addChild(bg);

t.position.set(padX, padY);
container.addChild(t);

container.position.set((cx - w/2)|0, y|0);

if (animate) {
  const targetY = y|0;
  container.y = targetY - 16;
  // tween to targetY over tokens.animations_ms.banner_slide_in (300ms) easeOutQuad
}

return container;
```

**Notes**
- Auto-width: always measure text first.
- Holds 2.5s, then fades out over 300ms on screen change (caller manages lifetime).

---

## Supporting primitives

### `drawHPBox({ x, y, variant, name, level, pct, meta })`

Used by battle HUD. Variants map to `tokens.component_tokens.hpbox.variants`.

```js
// draw outer+inner bands per variant
// row 1: name + "L."+level
// row 2: drawHPBar(... pct, variant)
// row 3: meta (size xs, color = variant.nm)
```

### `drawActionMenu({ x, y, items, selectedIdx })`

Boxed list using `drawGBADialog` shell + stacked `drawMenuButton` rows with `inBoxedMenu=true` flag so the selected row paints red. Icon column uses `drawActionIcon` at `size=24`.

### `drawCardMini({ x, y, card })`

Rarity-stripe-first pattern:

```js
// 1. border: 1px text_dark rect (20×28)
// 2. rarity stripe: 4×28 along left edge, fill = rarityColor(card.rarity)
// 3. art square: 16×20 at (4,0), art fill from sprite sheet OR rarity color at alpha 60%
// 4. footer: 20×8 at (0,20), fill sail_cream
// 5. text "No."+cardNo size 8 hull_wood centered in footer
// 6. if !card.collected: overlay text_dark alpha 70%, "?" in fg_muted center
```

---

## Integration checklist for Claude Code

1. Import tokens once at app boot:
   ```js
   import tokens from '../../design/DESIGN_TOKENS.json';
   const resolveToken = (k) => { /* walk .ref chain, fall back to k */ };
   ```
2. Add `PIXI.settings.ROUND_PIXELS = true`, `app.stage.scale.set(2)`, `app.renderer.resolution = 1`.
3. Load VT323 via `PIXI.Assets.load({ alias: 'VT323', src: 'fonts/VT323-Regular.ttf' })` before first text.
4. Replace in `05-rendering.js`:
   - `drawCardFrame` → use `drawCardMini` + rarity stripe recipe.
   - `drawBattleSprite` → keep existing sprite logic, but wrap identity HP bars via `drawHPBox`.
5. Replace in `06-world-systems.js`:
   - HUD draw → `drawHUD()` (composes 5 slot labels using `makeText`).
   - Title → `drawGBADialog` + `drawMenuButton` list.
   - Map banners → `drawLocationBanner`.
6. Replace in `07-screens.js`:
   - Battle phases 1–5 → one function per phase that composes recipes above.
   - Expose `setBattlePhase(n)` to flip state.

Keep **all existing game logic / state machines** intact. These recipes are pure presentation — they take data, produce containers. No gameplay coupling.

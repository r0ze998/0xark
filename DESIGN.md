---
version: 1.0
name: 0xARK — Sprite Seas Design System
description: >
  GBA-era pixel TCG on Solana. A deep-navy night canvas with cream text; one
  gold accent that always means "value / decision / commitment"; six faction
  hues that only ever mean "identity"; a four-step rarity ladder. Hard 1–2px
  square borders, integer-pixel discipline, VT323 with a strict 13px floor.
  Every on-chain action is staged as a physical ritual — seal, crack, engrave,
  promote, steal, open. Nothing rendered may contradict on-chain truth
  (card_data.rs / damage_calc). Locked direction: Sprite Seas (道A), deepened
  2026-07-08. Supersedes design/DESIGN_TOKENS.json (PixiJS era) for all
  HTML/CSS client work.

colors:
  # ── Surfaces ────────────────────────────────────────────
  bg-deep:        "#0a0e1a"                 # canvas — the night sea
  bg-mid:         "#1a1f33"                 # raised tile / input
  bg-panel:       "rgba(10,14,26,0.88)"     # floating panel over art
  overlay-scrim:  "rgba(0,0,0,0.6)"         # modal backdrop
  # ── Text ────────────────────────────────────────────────
  text-cream:     "#e8dfc8"                 # primary text
  text-dim:       "rgba(232,223,200,0.55)"  # captions only, ≥13px
  # ── Semantic accents (chrome / status — never faction) ──
  accent-gold:    "#c9a227"   # THE accent: value, CTA, commitment, focus
  accent-gold-bright: "#d8b034"  # legendary glow, hover lift
  accent-red:     "#d63b3b"   # danger, loss, opponent side
  accent-blue:    "#4a90d9"   # intel, info, links
  accent-warn:    "#f5c842"   # warning toast text
  success:        "#4a9c6f"   # confirmations
  hp-green:       "#5ab87a"   # HP values
  # ── Faction identity (ONLY on faction-scoped elements) ──
  clan-knight:    "#4a90d9"
  clan-merchant:  "#c9a227"
  clan-pirate:    "#d63b3b"
  clan-scholar:   "#8b6cb8"
  clan-monk:      "#6a8a6a"
  clan-engineer:  "#d4884a"
  # ── Rarity ladder ────────────────────────────────────────
  rarity-c:       "#8a8a8a"
  rarity-u:       "#4a9c6f"
  rarity-r:       "#4a7ab5"
  rarity-l:       "#d8b034"

typography:
  display-xl: { fontFamily: "VT323, monospace", fontSize: 72px, letterSpacing: 0.10em, lineHeight: 1.0 }  # victory/defeat title
  display:    { fontFamily: "VT323, monospace", fontSize: 48px, letterSpacing: 0.12em, lineHeight: 1.0 }  # logo, round bridge
  title:      { fontFamily: "VT323, monospace", fontSize: 32px, letterSpacing: 0.08em, lineHeight: 1.1 }  # timers, screen titles
  heading:    { fontFamily: "VT323, monospace", fontSize: 24px, letterSpacing: 0.08em, lineHeight: 1.1 }  # panel titles
  body:       { fontFamily: "VT323, monospace", fontSize: 20px, letterSpacing: 0.02em, lineHeight: 1.4 }  # default
  ui:         { fontFamily: "VT323, monospace", fontSize: 16px, letterSpacing: 0.02em, lineHeight: 1.4 }  # buttons, chips, log
  caption:    { fontFamily: "VT323, monospace", fontSize: 13px, letterSpacing: 0.04em, lineHeight: 1.4 }  # ABSOLUTE FLOOR

rounded:
  none: 0        # pixel art has square corners
  chip: 2px      # permitted ONLY on toast / badge

spacing: { 1: 4px, 2: 8px, 3: 12px, 4: 16px, 5: 24px, 6: 32px, 7: 48px }

stage:
  logical:      { width: 1024, height: 576 }   # all screens author to this box
  scaling:      fit-scale with letterbox; CSS `zoom` preferred (crisp text), transform fallback
  integer-snap: floor(scale) when scale ≥ 2 (pixel authenticity on large displays)
  orientation:  landscape-first (desktop priority); portrait shows a "rotate device" overlay
  viewport:     wrapper 100vw × 100dvh, background #000, content centered

motion:
  t-fast:   80ms    # hover, press
  t-base:   160ms   # flips, panel in/out
  t-slow:   320ms   # screen wipe
  ceremony: 600–1600ms budget per ritual beat sequence (see Rituals)
  ease-pop:  cubic-bezier(0.16, 1, 0.3, 1)
  ease-step: steps(3, end)          # sprite-like motion
  reduced-motion: pulse/shake/parallax OFF, opacity fades kept

z-layers: { hud: 10, dialog: 50, modal: 100, toast: 200, ceremony: 300 }

components:
  gba-btn:          { bg: "{bg-mid}", border: "2px {accent-gold}", text: "{text-cream}", fs: 20px, hoverBg: "{accent-gold}", hoverText: "{bg-deep}", press: "translateY(1px)" }
  gba-btn-primary:  { bg: "{accent-gold}", text: "{bg-deep}", border: "2px #000", fs: 22px, hoverBg: "{accent-gold-bright}" }
  gba-btn-ghost:    { bg: transparent, border: "1px rgba(201,162,39,0.35)", text: "{text-dim}", hoverBorder: "{accent-gold}", hoverText: "{text-cream}" }
  gba-btn-danger:   { border: "2px {accent-red}", hoverBg: "{accent-red}", hoverText: "#fff" }
  panel:            { bg: "{bg-panel}", border: "2px {accent-gold}", pad: "12px 16px" }
  chip:             { border: "1px rgba(201,162,39,0.35)", fs: 15px, ls: 0.08em, pad: "3px 10px" }
  card-tile:        { size: "80×112", shows: "faction abbr + rarity letter (13px) / BP (24px) / name (13px ellipsis)", note: "no HP/INI on tile" }
  card-frame:       { aspect: "5/7", frames: "public/img/frames/frame_{common|uncommon|rare|legendary}.png", minWidth: 112px, statLabelsHiddenBelow: 140px }
  timer:            { fs: 32px, color: "{accent-gold}", urgentAt: 30s, urgentColor: "{accent-red}", ariaLive: polite }
  energy-pips:      { icon: "px-bolt", filled: "{accent-gold}", empty: "rgba(201,162,39,0.25)", label: "n/5 + next-regen countdown" }
  round-pips:       { win: "● {accent-gold}", pending: "○ {text-dim}", loss: "● {accent-red}", header: "ROUND n/5" }
  battle-telop:     { rows: 2, fs: 16px, channels: { gold: "{accent-gold}", red: "{accent-red}", dim: "{text-dim}", combat: "{accent-blue}" } }
  toast:            { pos: bottom-center, rounded: "{rounded.chip}", variants: [info, success, warn, error], rule: "on-chain toasts MUST carry a tx short-link" }
  demo-badge:       { text: "DEMO MODE", bg: "rgba(214,59,59,0.15)", border: "1px {accent-red}", textColor: "{accent-red}", pos: "header, persistent while any fallback is active" }
  tx-link:          { fs: 13px, color: "{accent-blue}", format: "abcd1234… → explorer", selectable: true }
  focus-ring:       { outline: "2px solid {accent-gold}", offset: 2px }
---

# 0xARK — Sprite Seas Design System

## Overview

0xARK looks like a game you'd have played on a bus ride home from school in
2004 — and every number on screen is on-chain truth. The design language holds
those two facts together.

The canvas is a deep navy night (`{colors.bg-deep}`). Cream text
(`{colors.text-cream}`) does the reading work. **Gold**
(`{colors.accent-gold}`) is the single chromatic event of the chrome: it marks
value, decisions, and on-chain commitment — buttons, borders, the prize pool,
the seal on your hand. Red is danger and the opponent. Blue is intel. Six
faction hues exist, but they are *identity paint*, never chrome. Rarity is a
four-step ladder (grey → green → blue → gold) that never changes meaning.

Structure is hard-edged: 1px and 2px square borders, integer pixel positions,
zero border-radius (2px on toasts only). Type is VT323, one weight, with a
non-negotiable 13px floor. Icons are hand-placed pixels, never OS emoji.

The signature of this system is the **ritual layer**: commit is a chest being
locked, reveal is that chest cracking open, recording history is an engraving,
promotion is the frame itself transmuting around an unchanged card. ZK and
provenance are abstract; the rituals make them physical. Spend the boldness
there — keep everything around them quiet and disciplined.

## How AI agents must use this file

1. **Read this file before any UI work.** It is the single design authority
   for the active client (`solana/client/`). It supersedes
   `design/DESIGN_TOKENS.json` (PixiJS era — archived) and absorbs the
   normative rules of `design/UI_SPEC.md`.
2. **Code serves this spec, not the inverse.** If rendered output contradicts
   this file, the code is wrong.
3. **No raw hex in components.** Every color resolves through the CSS custom
   properties in `tokens.css` (Appendix A). CI guard:
   `grep -rn "#c9a227\|#0a0e1a\|#d63b3b\|#4a90d9\|#e8dfc8" solana/client/src solana/client/app.js` → must return 0 hits.
4. **Display truth comes from one place** (see Data-truth rules). Never
   re-derive card names, rarity, faction, stats, or rule text inside a screen.
5. **New/changed components update this file in the same PR** (governance
   carried over from `docs/VISUAL_DIRECTION.md`).

## Colors

### Role rules (the part that prevents drift)

- **Gold = value / decision / commitment.** CTAs, panel borders, the seal,
  engraving, prize pool, energy. If something costs, earns, or commits — gold.
- **Red = danger / loss / opponent.** Destructive buttons, the opponent's side
  of any versus layout, defeat, the DEMO badge.
- **Blue = intel / info.** Peek, AI advice, links, tx links, the INTEL phase
  label, combat telop channel.
- **Faction hues are identity paint only.** They may appear exclusively on
  faction-scoped elements: faction abbr text, the clan bar on a card frame,
  faction filter buttons, synergy banners. They must never color free-standing
  chrome or status text. (Three faction hues intentionally share values with
  semantic accents — knight/blue, merchant/gold, pirate/red — the scoping rule
  above is what keeps them unambiguous.)
- **Rarity ladder is fixed**: `{colors.rarity-c}` grey → `{colors.rarity-u}`
  green → `{colors.rarity-r}` blue → `{colors.rarity-l}` gold. Used on rarity
  bars, pack-reveal staging, promote ceremony. Never for anything else.
- `{colors.text-dim}` is for captions and metadata at 13px+. Never body copy.

## Typography

### Hierarchy

| Token | Size | Tracking | Use |
|---|---|---|---|
| `display-xl` | 72px | 0.10em | Victory / defeat titles |
| `display` | 48px | 0.12em | Logo, round-bridge interstitial |
| `title` | 32px | 0.08em | Phase timers, screen titles |
| `heading` | 24px | 0.08em | Panel titles |
| `body` | 20px | 0.02em | Default text |
| `ui` | 16px | 0.02em | Buttons, chips, battle telop |
| `caption` | 13px | 0.04em | Metadata, tx links — **absolute floor** |

### Principles

- **13px is a hard floor.** VT323 is a bitmap-style face designed around 16px;
  below 13px it stops being text. If information doesn't fit, remove
  information from that surface (move it to detail views) — do not shrink.
- **One weight.** VT323 ships regular only; `font-weight: bold` produces
  synthesized faux-bold that breaks the pixel grid. Emphasize with size and
  color, never weight. (Existing `bold` declarations are cleanup targets.)
- **Uppercase + tracking for labels**, sentence case for sentences.
- **Japanese (future):** VT323 has no CJK glyphs. When JP ships, pair with
  **DotGothic16** (Google Fonts, pixel-native Japanese) as the JP face at the
  same scale; do not let the monospace fallback render JP.

## Stage & Layout

- All screens are authored to a **1024×576 logical box**. One scaler makes
  every screen fit every display; screens never implement their own
  responsiveness.
- **Scaler spec** (implemented once, in `index.html`):
  - Wrapper `#stage-viewport`: `100vw × 100dvh`, background `#000`
    (letterbox), content centered, `overflow: hidden`.
  - `scale = min(vw/1024, vh/576)`; if `scale ≥ 2`, snap to `floor(scale)`
    for integer pixel authenticity.
  - Prefer CSS `zoom` (text re-renders crisply at fractional scales);
    `transform: scale()` as fallback.
  - Portrait (`vh > vw`): dim stage, show "ROTATE DEVICE ⟳" overlay in
    `title` type. Desktop-first; portrait-native layout is out of scope.
- **Spacing grid**: 4/8/12/16/24/32/48 only. GBA dialog padding: 12px
  vertical, 16px horizontal.
- **Selection**: `user-select: none` globally, **except** `.tx-link`,
  addresses, and error details, which are selectable.

## Iconography — px-icon set

OS emoji are banned (they are anti-aliased, multi-color, and off-palette).
All glyphs come from one pixel icon set.

- **Format**: inline SVG sprite, 16×16 unit grid, `shape-rendering:
  crispEdges`, drawn from whole-pixel rects. Fill via `currentColor` so icons
  inherit token colors. Scale only by integers (16/32/48).
- **Class pattern**: `<svg class="px-icon"><use href="#px-battle"/></svg>`.

Required glyphs (v1):

| id | Use | Replaces |
|---|---|---|
| `px-battle` | nav: battle | ⚔ |
| `px-vault` | nav: vault | 📦 |
| `px-shop` | nav: shop | 💰 |
| `px-trade` | nav: trade | 🤝 |
| `px-home`, `px-back` | navigation chrome | ← |
| `px-crystal` `px-barrier` `px-flame` `px-storm` `px-shadow` `px-void` | the 6 ActionTypes | ◆🛡⚡🌀◎✦ |
| `px-bolt` | energy pip | — |
| `px-coin` | SOL / cost | ◎ |
| `px-eye` | peek / intel | 👁 |
| `px-chip` | AI advice | 🤖 |
| `px-lock`, `px-chest` | seal / commit | ⏳ |
| `px-crack` | reveal | — |
| `px-chisel` | engrave victory | — |
| `px-crown` | legendary / champion | ♛ |
| `px-star` | legendary marker | ★ |
| `px-skull` | steal / KO | ✕ |
| `px-burn` | burn | 🔥 |
| `px-arrow-up` | promote | ⚗ |
| `px-check` `px-cross` `px-warn` | status | ✓ ✕ ⚠ |

## Components

- **Buttons** (`gba-btn` family): square, 2px border, VT323 20px. Hover
  inverts to gold fill / navy text over `{motion.t-fast}`. Press =
  `translateY(1px)` (no scale). Primary is gold-filled with hard black border;
  ghost is the quiet variant; danger swaps gold for red. Disabled: 45%
  opacity, no pointer.
- **Panel / chip**: panels are `{colors.bg-panel}` with gold 2px border;
  chips are the 15px metadata unit with the dim gold hairline.
- **Card tile (`card-tile`)** — for grids and any render < 112px wide.
  80×112. Row 1: faction abbr (faction hue) + rarity letter. Center: BP at
  24px. Bottom: name at 13px, single line, ellipsis. No HP/INI on tiles.
- **Card frame (`card-frame`)** — the PNG-framed presentation card
  (`frame_{rarity}.png`). Minimum render width **112px**; hide stat labels
  (keep values) below 140px. Provenance chips (see Rituals/Provenance) mount
  on the frame's lower-left.
- **Timer**: 32px gold; at ≤30s turns red with a pulse (pulse disabled under
  reduced-motion). Always `aria-live="polite"`.
- **Energy pips**: 5 bolt glyphs, gold filled / 25%-gold empty, plus
  `n/5` and next-regen countdown. Present on home, main, preparation.
- **Round pips**: `ROUND n/5` + win markers (`● gold` yours, `● red`
  opponent's, `○` pending). Present on every battle-flow header.
- **Toast**: bottom-center, 2px radius allowed, four variants. Any toast
  confirming an on-chain action **must** include a `tx-link`.
- **DEMO badge**: appears in the header the moment any fallback path
  (mock matchmaking, mock peek, skipped payment) activates, and stays for the
  session. Real mode is proven by tx-links, demo mode is confessed by the
  badge — the UI never blurs the two.

## Rituals — staging on-chain actions

Each ritual is: **intro beats (fixed) → idle loop (absorbs variable
chain/proof latency) → confirm beat (fires on tx confirmation) → toast with
tx-link**. All rituals are skippable after first play (per session). Sound
hooks are named now, wired later.

| Ritual | Trigger | Beats | SFX hook |
|---|---|---|---|
| **SEAL** | `commit_hand` (proof ~272ms + tx) | 5 cards flip face-down → stack → wrap into scroll → drop into chest → *idle: chest shimmer* → lock snaps shut, `COMMITTED · Groth16` chip | `sfx-lock` |
| **CRACK** | reveal phase opens | chest shakes ×2 → crack lines → burst → cards fan out face-down | `sfx-crack` |
| **ENGRAVE** | `settle_duel_history` (winner-signed) | chisel strike sweeps across the 5 used cards → `+1 WIN` counters tick → gold dust settles → "recorded on-chain forever" | `sfx-engrave` |
| **PROMOTE** | `promote_card` | the card art holds still; the **frame** cross-fades C→U (or U→R, R→L) with a rarity-color flash sweep — same mint, new tier | `sfx-promote` |
| **STEAL** | YKK-44 (post legal) | loser's card slides from its row → hooked → flies to winner's side → sockets in. Until YKK-44 ships, the loot act shows a **sealed slot**: "STEAL — sealed pending review", never a fake loss | `sfx-steal` |
| **PACK OPEN** | `buy_pack` reveal | pack tears → cards fan face-down → staged flips: Commons chain at `t-base`; Rare holds 400ms + blue flash; Legendary full-screen gold flash + 1200ms hold | `sfx-flip`, `sfx-legendary` |

Battle presentation (reveal screen) is not a ritual but follows the same law:
it **replays `damageCalc().effects[]` in order** — synergy banner → legendary
banner → actions in INI order → pair duels (advance, hit flash + shake, HP
pop, KO shatter) → BP tug-of-war verdict. The log is a 2-row telop under the
board, never the main event.

## Provenance surfaces

Provenance is the product's spine; it must be visible wherever a card is.

- **Card detail**: PROVENANCE panel — `W / KO / LGD-K / DMG` counters, owner
  ring (`3 owners · 2 dropped`), acquisition tag (`DUEL WON` in red),
  imprint badges, and the **promotion gate** progress bar with cost
  (`C→U ████████░░ 8/10 W · 0.01 SOL`).
- **Vault grid**: lightweight chips on frames — `W12` in gold, imprint dot,
  red dot for duel-won cards.
- **Trade listing**: CardFrame + `W12 · 2 owners` line. History is the price
  story.

## Accessibility floor

- Interactive cards: `role="button"`, `tabindex="0"`, Enter/Space activate;
  grids support arrow-key movement.
- All timers `aria-live="polite"`; phase changes announced.
- `@media (prefers-reduced-motion: reduce)`: kill pulse/shake/flash loops,
  keep opacity fades; rituals collapse to intro+confirm stills.
- Focus visible everywhere: gold 2px ring, 2px offset.
- `{colors.text-dim}` never below 13px (contrast holds at caption size).

## Data-truth rules

- Card names, faction, rarity, stats: **only** from `lib/cards.js` /
  `Card.js` exports. No screen may define its own id→rarity or id→faction
  mapping. (Shop and trade currently do — cleanup targets.)
- ActionType rule text: derived from `damage_calc` semantics (Rust is the
  authority); the selector descriptions are generated/verified against it.
- Tier thresholds, drop rates, costs: read from one shared module /
  GameWorld — never duplicated per screen.
- Assets never change optimistically. On-chain mutations render as `pending`
  until confirmed; failures roll back visibly. Losing a card client-side
  while the chain disagrees is forbidden.

## Do's and Don'ts

**Do**
- Route every color through `tokens.css`; keep the CI grep at zero.
- Author to 1024×576 and let the stage scaler do the rest.
- Give every on-chain confirmation a ritual + tx-link.
- Light the DEMO badge the instant a fallback fires.
- Emphasize with size and color; keep borders 1px or 2px; snap to integers.

**Don't**
- No emoji, anywhere in the UI.
- No text below 13px.
- No `font-weight: bold` on VT323.
- No border-radius (except 2px toast/badge).
- No gradients or soft drop shadows as decoration — glow is reserved for
  gold/red ritual moments.
- No per-screen re-implementations of card facts, tiers, or synergy math.
- No silent demo fallbacks, no optimistic asset destruction.

## Appendix A — tokens.css

The canonical CSS mapping ships as `solana/client/src/style/tokens.css`
(1:1 with the frontmatter; legacy variable names from the current
`index.html :root` are kept as aliases until the hex cleanup lands).

## Appendix B — F0 cleanup greps (with measured baseline @ `6444dc8`)

All targets are **0**. Baselines measured 2026-07-08 so progress is checkable.

```sh
# raw hex outside tokens.css                      — baseline: 85 hits
grep -rn "#c9a227\|#0a0e1a\|#1a1f33\|#d63b3b\|#4a90d9\|#e8dfc8\|#d8b034" \
  solana/client/src solana/client/app.js --include="*.js" | grep -v tokens.css

# emoji / symbol glyphs in UI strings             — baseline: 58 hits
# (note: GNU grep needs the (*UTF) prefix for astral code points)
grep -rnP "(*UTF)[\x{1F300}-\x{1FAFF}\x{2600}-\x{27BF}\x{2300}-\x{23FF}]" \
  solana/client/src solana/client/app.js --include="*.js"

# px sizes below the 13px floor                   — baseline: 34 hits
grep -rn "font-size: *\(8\|9\|10\|11\|12\)px" solana/client/src --include="*.js"
# rem sizes below the floor (≤0.79rem)            — baseline: 4 hits
grep -rn "font-size: *0\.[0-7]" solana/client/src --include="*.js"

# faux bold on VT323                              — baseline: 9 hits
grep -rn "font-weight: *bold\|bold .*VT323" solana/client/src --include="*.js"

# stale round hardcodes (F1 scope, tracked here)  — baseline: 4 hits
grep -rn "duelId, 1," solana/client/src/components
```

---
*Supersedes: `design/DESIGN_TOKENS.json` (archive to `design/archive/`).
Absorbs: normative rules from `design/UI_SPEC.md` §1.7 (no emoji) and
`docs/VISUAL_DIRECTION.md` (governance, no-hex rule). Companion:
`0xark-frontend-review.md` v1.0 (findings F-1…F-23, phases F0–F3).*

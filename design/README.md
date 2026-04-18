# 0xARK — Design Handoff Package

**Target**: Claude Code (Opus 4.7, terminal) rewriting PixiJS v7 rendering against a locked spec.
**Source stack**: Vanilla JS + PixiJS v7. Touched files:
- `solana/client/src/05-rendering.js` — `drawCardFrame`, `drawBattleSprite`
- `solana/client/src/06-world-systems.js` — HUD, title, map
- `solana/client/src/07-screens.js` — battle phase rendering

## Contents

```
design/
├── README.md                 ← you are here
├── DESIGN_TOKENS.json        ← all color/type/spacing/border tokens
├── UI_SPEC.md                ← per-screen pixel coords + token refs (7 screens)
├── COMPONENT_RECIPES.md      ← 6 reusable drawing primitives + supports
└── preview/                  ← HTML reference only — DO NOT import directly
    ├── 01_title.html
    ├── 02_town.html
    ├── 03_dungeon.html
    ├── 04_battle.html
    ├── 05_collection.html
    ├── 06_victory.html
    ├── kit.css · battle.css · intel.css
    ├── battle/               (01 vs, 02 select, 03 confirming, 04 resolving, 05 result)
    └── intel/                (01 menu, 02 confirm, 03 breaking, 04 reveal)
```

## How to use

1. **Read order**: `DESIGN_TOKENS.json` → `UI_SPEC.md` → `COMPONENT_RECIPES.md`.
2. **Preview HTMLs are visual reference only.** Layout/positions in UI_SPEC.md are authoritative.
3. **Never inline hex values** in rendering code. Always resolve through tokens — the whole point of this handoff is that any palette swap is a one-file edit.
4. Preserve all existing game logic, state machines, networking, and input handlers. These docs cover presentation only.

## Key coordinate conventions

- Logical canvas: **240×160 px** (GBA-native). Renderer scales ×2 → 480×320.
- `PIXI.settings.ROUND_PIXELS = true`, `renderer.resolution = 1`, integer snap on all positions.
- VT323 font, sizes 8/16/24/32/48/64 only.
- No radii. Pixel art has square corners.

## Priorities (if implementing in passes)

1. **Tokens + font load** — wire `DESIGN_TOKENS.json` + VT323 before any render.
2. **Primitives** — land all 6 recipes (`COMPONENT_RECIPES.md` §1–6).
3. **Battle phases 1–5** — most state-heavy, highest payoff.
4. **Overworld HUD + banners** — reused across town/dungeon.
5. **Title / Collection / Victory** — one-offs, do last.

## Preview notes

The HTML previews run at 4× zoom on `.gba-viewport { width: 240px; height: 160px; transform: scale(4) }` patterns. They exist for pixel-level eyeballing only. Any discrepancy between preview and `UI_SPEC.md` → spec wins.

# Phase B2 — Work Plan (Draft)

**Status:** Draft, pending review
**Kickoff condition:** 4/4 Phase B2 conditions from VISUAL_DIRECTION.md satisfied
**Visual authority:** `design/UI_SPEC.md` + `design/COMPONENT_RECIPES.md` + `design/DESIGN_TOKENS.json` + `design/preview/**/*.html`

---

## Implementation strategy

**Order:** Player-operation order — Title → Town → Battle → Dungeon → Collection → Victory.
**Fidelity:** Near-pixel match to `design/preview/**/*.html`. Discrepancies that read as "different" on eyeball inspection are not accepted. Discrepancies that read as "same aesthetic, minor pixel differences" are.
**Commit granularity:** One screen = one commit minimum. Primitive introductions can share a commit with the first screen that needs them.

---

## Phase B2 sub-phases

### B2-0 — Retirement commit (prerequisite)

Single commit moving legacy assets to `assets/retired/`.

Files to move:
- `bg-town.jpg`, `bg-dungeon*.jpg`
- `craftpix-exterior.png`, `craftpix-ground.png`, `craftpix-ruins*.png`, `craftpix-trees.png`, `craftpix-walls.png`
- `cpx-forest-*.png`
- `zelda-overworld.png`, `zelda-character.png`, `zelda-cave.png`, `zelda-objects.png`
- `overworld-rpg-tileset.png`, `dungeon-tileset.png`, `world-tileset.png`, `pirates-tilemap.png`

Code that references these paths (by string literal) must be located and either:
- Updated to reference a Kenney Monochrome Pirates equivalent, OR
- Marked with a `// TODO(phase-b2-<screen>): replace with Sprite Seas` comment so the B2 screen migration naturally addresses it.

Build must still pass after this commit. Game may look degraded (placeholder squares where assets were) — that's expected and acceptable during B2.

Commit message: `v450 — retire legacy visual assets to assets/retired/`

---

### B2-1 — Primitives introduction (alongside Title screen)

Introduce primitives as they're first needed, not all upfront. Title screen requires:

- `drawGBADialog(x, y, w, h, fillToken, borderToken)` — menu box and title banner
- `drawMenuButton(x, y, label, iconShape, selected)` — NEW SEASON / CONTINUE / BIND VAULT / MULTIPLAYER / CREDITS

Location: `solana/client/src/05-rendering.js` (add, do not delete existing functions — tag old ones `@deprecated (phase-b2-title)` for later cleanup).

All primitives resolve colors through `window.TOKENS.resolveColor()`. No hex literals.

---

### B2-2 — Title screen migration

Target: `design/preview/01_title.html` visual match.

Files touched:
- `solana/client/src/06-world-systems.js` — `drawTitle()` (or equivalent sc==='title' branch)
- Potentially `solana/client/src/01-pixi.js` if title effect primitives live there

Acceptance:
- Pixel-for-pixel layout against preview (modulo PixiJS antialiasing quirks at integer scales)
- VT323 font at correct sizes for each text element
- Menu items and cursor behavior identical to current (input handling untouched)
- No references to retired assets

Commit: `v451 — migrate Title screen to Sprite Seas`

---

### B2-3 — Town screen migration

Target: `design/preview/02_town.html` visual match.

Files touched:
- `solana/client/src/06-world-systems.js` — Town rendering
- `solana/client/src/03-world-setup.js` — if tile data structure changes
- New tile sprites: Kenney Monochrome Pirates (existing repo) + PixiJS Graphics for shop/gacha/stats buildings

Primitives added (if needed):
- `drawTileMap(tiles, x, y)` if tile rendering needs formalization
- `drawLocationBanner(text)` — "FIRST PORT" banner

Acceptance:
- Town layout matches preview (building positions, paths)
- SHOP / GACHA / STATS buildings visible and distinguishable by color
- HUD (top bar) visual matches preview
- Player sprite walks correctly (existing logic preserved)
- NPC VEGA/MIRA indicator in HUD correct
- `"TOWN - はじまりのまち - PATH"` bottom label

Commit: `v452 — migrate Town screen to Sprite Seas`

---

### B2-4 — Battle sequence (5 states, may split into 5 commits)

Target: `design/preview/battle/01_vs_splash.html` through `05_result.html`.

This is the most state-heavy migration. Claude Design produced separate preview files for each state.

Files touched:
- `solana/client/src/07-battle.js` — battle rendering main
- `solana/client/src/07-battle-resolve.js` — resolving/result states

Primitives added (if needed):
- `drawChestSprite(state)` — sealed / opening / open
- `drawInkBlotOrb(value)` — cost indicator (from earlier Verdant Codex draft, adapted to GBA)
- `drawHPBar(x, y, w, pct, colorToken)` — VEGA magenta / MIRA amber / YOU neutral

Acceptance per state:
- **01 vs_splash**: VS splash with both combatants silhouette + names
- **02 select**: 5 action buttons (DRAW/STEAL/BARRIER/SCOUT/USE CARD) with pixel icons, cursor navigation, "CHOOSE ACTION" banner
- **03 confirming**: Sealed chest/scroll, "SHA-256 hash broadcast to chain" caption, quiet background
- **04 resolving**: "CLASH!" / "Groth16 proof verified." / "Settling round on Solana."
- **05 result**: HP bars (correctly colored per identity), action results, stat plate, "CLAIM PRIZE"-style action indicator

Commit split options:
- **Option A (recommended):** 2 commits — `v453 migrate Battle states 01-02` + `v454 migrate Battle states 03-05`
- **Option B:** 5 commits, one per state
- **Option C:** 1 commit `v453 migrate Battle sequence (01-05)`

Default to Option A unless Claude Code requests Option B for size reasons.

---

### B2-5 — Dungeon screen migration

Target: `design/preview/03_dungeon.html` visual match.

Files touched:
- `solana/client/src/07-map.js` — dungeon rendering, fog-of-war, rival position indicators
- `solana/client/src/04-state.js` — read-only (for FSM state)

Primitives added (if needed):
- `drawFogTile(x, y, state)` — darkness / partial / revealed

Acceptance:
- B1-B5 floor transitions visually match preview
- Fog-of-war with `"?"` pattern for unexplored
- Rival position indicators (VEGA magenta, MIRA amber) when on same floor
- Floor banner "FLOOR I" / "FLOOR II" etc. styled as GBA location banner
- `_dungVigGrads` vignette effect replaced or retained per spec (check preview)

Commit: `v455 — migrate Dungeon screens to Sprite Seas`

---

### B2-6 — Collection screen migration

Target: `design/preview/05_collection.html` visual match.

Files touched:
- `solana/client/src/08-overlays.js` — Collection overlay

Primitives added (if needed):
- `drawCardFrame(x, y, rarityToken)` — 60-card binder grid slots

Acceptance:
- 60-slot binder grid matches preview layout
- Rarity tier colors correctly applied (pending confirmation with 02-data.js rarity definitions)
- Selected slot highlighted (gold border per preview)
- `"BINDER · 24/60"` header with CLOSE button
- Card detail panel on selection (if preview specifies)

Commit: `v456 — migrate Collection screen to Sprite Seas`

---

### B2-7 — Victory screen migration

Target: `design/preview/06_victory.html` visual match.

Files touched:
- `solana/client/src/08-overlays.js` — Victory/Game Over overlays

Acceptance:
- "VICTORY!" banner, stats table (CARDS / SEASON / BATTLES / PRIZE POOL)
- Radial red gradient background (PixiJS gradient or layered fills)
- `"► CLAIM PRIZE"` action button
- Decorative gold star particles (optional, if preview includes)

Commit: `v457 — migrate Victory screen to Sprite Seas`

---

### B2-8 — Cleanup commit

Delete deprecated primitives, remove `@deprecated` comments, prune unused helpers, confirm no references to retired assets remain.

Commit: `v458 — clean up deprecated rendering paths after Phase B2`

---

## Review checkpoints

r0ze reviews after each commit:

- Browser load the new build
- Visual comparison against `design/preview/**/*.html` for that screen
- Functional check (input, navigation, state transitions)
- Console clean (no new errors introduced)

If a commit fails review, Claude Code reverts and retries. No "let's fix it in the next commit" escalation.

---

## Risks and mitigations

### Risk 1: PixiJS Graphics can't reproduce a preview element cleanly

Mitigation: fall back to `PIXI.Graphics` → cached `PIXI.Texture` via `generateTexture()` for complex ornaments. Accepted cost: slightly more GPU memory.

### Risk 2: Text metrics don't match preview (VT323 rendering)

Mitigation: use `PIXI.BitmapText` with a VT323 bitmap font converted from the TTF. One-time conversion step, may require additional tooling. Fall back to `PIXI.Text` with manual integer-snap positioning if BitmapText is too heavy.

### Risk 3: Performance regression on older GPUs

Mitigation: benchmark after each screen migration. If frame time > 16.7ms on a baseline device (TBD), revert the offending primitive and simplify.

### Risk 4: Claude Design preview describes something PixiJS can't do

Mitigation: document the deviation in `docs/VISUAL_DIRECTION.md` as an approved divergence. Update preview if possible (via Claude Design session) so spec and impl stay aligned.

---

## Non-goals for Phase B2

- Final sprite quality (placeholder NPCs/cards acceptable — Phase C sources real art)
- Audio redesign
- Mobile / touch optimization beyond what already exists
- Landing page (`design/preview/...`) — deferred to Phase B2.5 or later
- x402 intel shop UI migration — deferred to Phase B2.5 (high complexity, not on critical path)

---

## Estimated timeline

Budget: ~2 weeks (2026-04-19 to 2026-05-02), leaving ~1 week buffer for Phase C + submission prep.

- B2-0 retirement: 0.5 day
- B2-1 + B2-2 Title: 1 day
- B2-3 Town: 2 days
- B2-4 Battle (5 states): 4-5 days
- B2-5 Dungeon: 2 days
- B2-6 Collection: 1 day
- B2-7 Victory: 0.5 day
- B2-8 cleanup + buffer: 1-2 days

Buffer days exist inside the 2-week window for risk materialization.

---

## Open questions (to resolve before kickoff)

1. Does Claude Code have capacity to render BitmapText / use PIXI.BitmapFontLoader without npm additions?
2. Is there a baseline device / browser for performance testing?
3. Do we want `assets/retired/` to be tracked in git or gitignored?
4. Should Phase B2 screen migrations include updating the `v440` → `v450` versioning scheme in the codebase (e.g. the `v439` tag shown on the current title screen)?

---

## Approval

This plan requires r0ze approval before Phase B2 kickoff. Changes to scope / fidelity / order after approval require an addendum commit referencing this document.

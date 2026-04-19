# VISUAL_DIRECTION — Sprite Seas (道A)

> Locked 2026-04-19 for the Colosseum Frontier 2026 submission cycle.

The visual system for 0xARK is a unified GBA-era pixel aesthetic:
Pokémon FireRed/LeafGreen overworld language for the Town and the
world map, Pokémon Mystery Dungeon: Red Rescue Team interior language
for the dungeon, unified across every screen by a single token-driven
palette. Internal name: **Sprite Seas (道A)**.

This document is short on purpose. It names the direction, names what
we retire to get there, and names the conditions under which Phase B2
(the full visual migration) may begin. Everything else — exact widths,
exact spacings, exact component anatomies — lives in `design/`.

---

## Why Sprite Seas

### 1. Differentiation in Colosseum Frontier

Colosseum Frontier 2026 will surface hundreds of submissions. Most will look like: dark fantasy cards, Solana-brand purple gradients, neon cyberpunk UI, or generic web3 chic. A pixel-perfect GBA aesthetic places 0xARK in a category of one among ZK card games. **Judges remember what looks different. Nothing else in the field will look like this.**

### 2. Concept-visual coherence

"ZK commit-reveal" is abstract. "Sealed scroll in a treasure chest that cracks open on reveal" is immediate. The pixel language — chests, scrolls, compass roses, ink — gives ZK mechanics a physical vocabulary players feel before they read. Abstraction becomes play.

### 3. Nostalgia as onboarding

The target player for 0xARK includes web3 natives who grew up on GBA. The visual is an instant handshake with that audience. It says: *this game was made by someone who respects what you loved.*

### 4. Technical focus

Pixel art constrains the asset pipeline to a known shape. Integer coordinates, fixed tile grids, locked palettes, no anti-aliasing. Every visual decision has a right answer. The team ships faster because the space of choices is smaller.

### 5. Strategic consistency

`ConsensusOS` is a platform for on-chain games. 0xARK's GBA identity positions Yukikaze as a studio that takes craft seriously — not a studio that ships generic mocks. The aesthetic investment here compounds into brand capital for future titles.

---

## Rules of engagement

- **Code serves spec, not the inverse.** If a PixiJS rendering function produces something that doesn't match `UI_SPEC.md`, the function is wrong.
- **`DESIGN_TOKENS.json` is the only palette.** No hex literals in rendering code. All colors resolved through `window.TOKENS.resolveColor()` (landed in Phase B1, v440).
- **Spec changes are deliberate.** Edits to `design/` happen in Claude Design first, re-exported, committed as a single "spec update" commit, then followed by a code migration commit.
- **Preview HTMLs are reference, not import target.** They render the intended look via CSS for visual verification. Production code uses PixiJS Graphics, Sprite, and Text APIs — not inlined HTML.

---

## What We Retire

Current `0xark/` root contains assets from earlier visual explorations that are now superseded. These will not be used in the Sprite Seas system:

**Japanese festival / fantasy tilesets:**
- `bg-town.jpg`, `bg-dungeon*.jpg`
- `craftpix-exterior.png`, `craftpix-ground.png`, `craftpix-ruins*.png`, `craftpix-trees.png`, `craftpix-walls.png`
- `cpx-forest-*` (forest mushroom/tree variants)

**Zelda-derived tilesets:**
- `zelda-overworld.png`, `zelda-character.png`, `zelda-cave.png`, `zelda-objects.png`

**General-purpose RPG tilesets that don't match Sprite Seas palette:**
- `overworld-rpg-tileset.png`, `dungeon-tileset.png`, `world-tileset.png`, `pirates-tilemap.png`

### Retirement plan

All of the above move to `assets/retired/` in a single commit during Phase B2 kickoff. They are **retired, not deleted** — git history preserves them, and `assets/retired/` preserves them at the filesystem level as well.

**Rationale for retention:**
- Insurance against a post-hackathon decision to revisit
- Reference material for future projects
- Honest acknowledgment of the work that led here

**Replacement primary asset set:**
- **Kenney Monochrome Pirates** (CC0, already in-repo) — base sprite vocabulary
- **PixiJS Graphics** — UI chrome, HUD, dialogs, frames (drawn procedurally from tokens)
- **Custom pixel sprites** — NPCs (VEGA, MIRA), cards, chests, props (Phase C, sourced via AI generation + hand refinement)

---

## Phase B2 Kickoff Conditions

Phase B2 (full visual migration to Sprite Seas) begins only when all four conditions are met:

1. **Lint lands (parallel).** v447b landed 2026-04-19 with Check #1 + #3. Build-time integration (v448) and enforcement move to parallel with Phase B2 — expected to land within the first 2-3 screen migrations.

2. **Retirement commit lands.** The assets listed above moved to `assets/retired/`. Any code that references them (by path string) either updated to a placeholder or explicitly TODO-tagged for Phase B2 replacement.

3. **VISUAL_DIRECTION.md approved.** This document reviewed and merged. (This commit, v449.)

4. **Phase B1 verified on `main`.** `window.TOKENS` resolving correctly in the browser, tokens available to all render paths. (Landed in v440, confirmed 2026-04-19.)

Until these four conditions are satisfied, no PR touching rendering code in a visual-substantive way is merged.

**2026-04-19 revision:** Condition 1 relaxed from "must land before kickoff" to "must land in parallel". The parallel approach lets Phase B2 visual work begin immediately while lint integration and enforcement catch up. Rationale: hackathon schedule + the visual migration benefits from lint running on new code as it's written, not just on pre-migration code.

---

## Phase B2 Scope Preview

For planning purposes only. The actual Phase B2 work plan is authored separately after the four conditions above are met.

**In scope:**
- Rewrite of the 6 primitives in `05-rendering.js` to match `COMPONENT_RECIPES.md`
- Migration of all 7+ screens to `UI_SPEC.md` layouts
- Switch from jpg/png backgrounds to tile-based procedural backgrounds
- HUD redesign to GBA dialog-box language
- Battle state sequence (vs_splash → select → confirming → resolving → result) visual implementation

**Out of scope (deferred to Phase B3 or C):**
- Final sprite art quality (placeholder sprites acceptable during B2)
- Audio redesign
- Animation polish beyond functional transitions
- Marketing / landing page visual
- Claude Design handoff bundle integration beyond what `UI_SPEC.md` directly dictates

---

## Governance

- **Edits to this document** require a commit prefixed `docs(direction):` with rationale in the body.
- **Challenges to the direction** (e.g. "should we actually do hybrid?") are welcome but must be raised in an issue and resolved before any rendering code diverges from the spec. In-code drift without document update is not permitted.
- **The document is short on purpose.** If you need more detail on a specific decision, that decision's reasoning belongs in the relevant `design/*.md` or a dedicated sub-doc, not here.

---

## Closing

> *A pirate game on Solana. ZK-hidden cards. x402 AI intel economy. And it looks like something you'd have played on a bus ride home from school in 2004.*

That's the line. Everything the visual system does has to earn it.

— Locked 2026-04-19 for the Colosseum Frontier 2026 submission cycle.

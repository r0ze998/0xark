# 0xARK — The Drowned Archive
Version 2.1 · September 7, 2026

## Authority and scope

The owner explicitly requested a zero-base, game-wide redesign. This document
supersedes the Sprite Seas / fixed GBA-stage visual rules in the previous revision.
The gameplay specification, card identities and on-chain authority are unchanged.
See the previous Git revision for the retired visual system. Do not reintroduce
its 1024×576 scaling, portrait-blocking overlay, pixel font or decorative frames.

This is a redesign of the existing `solana/client` application, not an alternate
marketing page. Home, collection, hand preparation, intel, combat, inter-round
bridge, results, card detail, packs, exchange and wallet entry share one system.

## Experience

**A quiet hand. A decisive move.** The player is a strategist at a sealed table in
an ancient coastal archive. The environment sets the tone; cards and decisions
remain the foreground. Home must immediately offer play and a visible collection,
not sales content, invented activity, testimonials or fake player counts.

1. **Orient** — a cinematic title screen, a physical fan of cards, one primary play
   action and persistent destinations.
2. **Build** — five spatial slots above the collection. Selecting a card fills the
   next empty slot. Explicitly selecting a filled slot enables replacement.
   Action controls remain beside the hand on desktop and below it on mobile.
   Faction filtering supports intentional composition. A planning strip shows
   catalog BP/HP totals and three-card faction synergy; these are not predicted
   combat totals. Keyboard navigation skips cards hidden by the filter.
3. **Seal** — one clear commitment action. Freeze the exact card/action snapshot
   before asynchronous proof/transaction work; edits are disabled while pending.
4. **Read** — the sealed table and read-only intelligence. No post-commit edits.
5. **Reveal** — the existing deterministic combat effect stream drives playback.
   Skipping may shorten animation, never resolve before the computed result.
   Card action labels remain visible after reveal. A scrollable battle record
   retains action events so players can review them instead of losing a two-line
   ticker. Auto-follow stops when the player scrolls up.
6. **Reflect** — round score, clear outcome, hands for comparison, next hand or home.
   Practice round bridges wait for the player instead of advancing automatically.
   Final-round playback totals show surviving BP and card counts only when the
   calculator supplied complete results. Victory includes a final-hand review.

## Visual language

- Green-black obsidian, aged brass, seafoam and warm ivory.
- Environment: the Drowned Archive, a coastal fortress/library at night.
- Card back: a fine brass astrolabe engraved in black-green stone.
- Thin borders, restrained surface contrast and generous breathing room.
- Avoid decorative dashboard boxes around every label. The table and the card
  silhouette provide the main structure.
- Display typography: Cormorant Garamond, with Georgia fallback.
- Controls and prose: Manrope, with system sans fallback.
- Numbers: IBM Plex Mono, with system monospace fallback.
- Main prose starts at 16px, control labels at 14px where space allows, compact
  tactical labels and metadata at 12–13px. Never reduce an entire screen with zoom.
- Dark overlays behind text; no bright art behind body copy.

The functional tokens live in `solana/client/src/style/tokens.css`.
Extracted component base styles live in `src/style/*.js` and are installed with
`src/lib/inject-style.js`. These remain synchronous, lazy style elements so the
existing cascade order and document-relative asset URLs are preserved. Keep
style IDs stable. The design linter includes these modules.
`archive.css` is the presentation layer over existing lazily mounted components.
Its `#app` scope is intentional: it wins over legacy component selectors while
preserving dynamic state, inline transforms, disabled controls and combat hooks.

## Cards

**Archive Standard** uses a 5:8 silhouette with an opaque black-green faction cap,
portrait window, name band and three-column BP/HP/initiative band. Brass edges
carry the archive identity; artwork does not sit behind the name or statistics.
The faction is always written in full beside its crest. Rarity has a written label
and one to four marks, so neither faction nor rarity depends on colour alone.
Catalog numbers remain visible as stable collection references.

`CardFrameHTML` is the production renderer across collection, hand preparation,
intel and combat. Names and stats are real catalog data. Preserve `data-id`,
`.card-frame`, `.cf-hp .stat-value`, and the combat effect classes. Selected actions
remain outside the card frame, as decisions made by the player rather than fixed
card attributes. Selected, locked and knocked-out states retain their existing
game hooks. Face-down rendering includes no faction, number, name or statistics.

Tactical cards have a 140px reading floor. Five-card rows scroll horizontally when
needed, and collection grids reflow rather than hiding names, faction or stat
labels. Long names wrap across the solid band. The separate card-design page is
a design study; changes to gameplay cards belong in the shared production frame.

All sixty cards now use their approved individual Drowned Archive illustrations.
`src/lib/card-art-assets.js` is the lightweight URL catalog shared by the game
and art review. Each actual ID resolves to its own WebP; missing art must not fall
back to another character. Keep document-relative asset paths for GitHub Pages.
Images are lazy-loaded and decoded asynchronously; facedown cards render no image
or identity-bearing attributes before reveal.

The larger portrait window keeps illustrations near square at collection sizes;
name and statistic bands retain their 140px reading floor. Missing cards retain
legible text and a written ownership badge, with only the artwork subdued. Detail
has a keyboard-operable full-art toggle and one scrolling modal surface. The
exchange listing dialog uses illustrated native buttons and reports transaction
errors within its native top layer. Functional line icons retain historical
`pxIcon` names and IDs for compatibility while matching the engraved Archive style.

Art prompts and provenance are in `design/cards/`; environment and card-back
provenance is in `design/archive-assets.md`. The six original Legendary identities
are preserved in their new illustrations. None of this changes ownership, card
statistics, promotion rules or combat outcomes.

Face-down cards must not expose their identity. Ownership is derived from actual
vault data in live mode; browsing the full catalog does not imply ownership.

## Responsive and accessible behavior

- Full viewport, no 1024×576 logical-stage zoom or forced rotation.
- Desktop: 92px navigation rail, 80px screen headers, readable scrolling content.
- Medium viewport: 76px rail and reflowed collection/battle sections.
- Mobile: bottom navigation, vertically stacked panels, reachable actions.
- Five-card tactical rows may scroll horizontally instead of shrinking card text
  into unreadable miniatures.
- Visible keyboard focus; native buttons and select labels; keyboard card browsing.
- Modal pack opening uses the native dialog top layer with Escape, focus
  containment and focus restoration.
- Reduced motion shortens CSS animation; combat retains its existing reduced-motion
  handling and skip control.
- Live navigation is locked while a duel is active to protect recovery state.

## Practice versus live game

The private review build is explicitly practice-only. It has 30 sample cards
spanning six factions and a deterministic set of local opponent hands. It uses
the existing combat calculator, but is not multiplayer or a verified on-chain duel.

`runtime.js` chooses the environment **before** importing the application.
Practice does not import Solana, x402, proof libraries or the wallet adapter.
Transaction-shaped methods reject; the WebSocket client refuses live connections.
Practice reads and writes no production battle session storage. Timers are
untimed; pack openings and exchange listings are explicitly labeled samples.
Practice never issues transaction signatures, grants owned cards or records wins.

The normal GitHub client remains wallet-gated. It provides a clearly labeled free
practice link without bypassing the registration requirement for real gameplay.
No contract, circuit, card-stat, economic-rule or STEAL feature-flag changes are
part of this visual redesign.

## Review routes

`?devview=home` is the entry. `?devview=menu` is the screen index.
Other fixtures: `main`, `preparation`, `interruption`, `reveal`, `loot`,
`loss`, `shop`, `trade`, `card-detail`.
The main practice CTA starts with an empty hand; “Deal me five” fills only holes.
Sealing continues through actual local combat and the first-to-three round loop.

## Verification and release

Run the client unit tests, the design linter, module syntax/import checks and local
asset checks. A private practice preview must not be described as a live-wallet or
multiplayer test. Browser/visual verification is a separate explicitly requested
step in this environment. Do not overwrite the public game merely to publish a
design review.

`scripts/prepare-archive-preview.mjs` stages this existing buildless client into
`dist` with a preview-only flag and a restrictive connection policy. It never
edits the live source entrypoint. The Sites manifest identifies the private review
site, not the public GitHub Pages deployment.

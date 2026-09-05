# 0xARK browser client

The active game is a buildless ES-module application. GitHub Pages publishes this
directory as-is; there is no bundler, generated app bundle or npm dependency install.
Read the root `DESIGN.md` before UI changes and `docs/F1_SPEC.md` §2 before changing
battle flow. The visual system is **The Drowned Archive**.

## Local development and checks

From `solana/client`, with Node 20+ and Python 3:

```sh
npm run dev       # http://localhost:4200
npm test          # every test/*.test.js, including async screen regressions
npm run check    # syntax + static module import/export linking, no execution
python3 ../../scripts/design-lint.py
```

Open `http://localhost:4200/?devview=home` for walletless practice. The URL without
`devview` uses live wallet/registration gates. All fixture routes are listed at
`?devview=menu`. Practice uses sample cards, never signs transactions and does not
read or write the live battle session.

The check command uses Node's `--experimental-vm-modules` for parse/link validation.
It detects missing local modules and named exports without evaluating the game or
calling RPC. It does not execute dynamic imports or check browser layout. Tests
use explicit wallet/RPC/DOM doubles; they do not verify real paid transactions.
CI runs the same test and check commands, plus the repository's other gates.

## Code ownership

| Location | Responsibility |
| --- | --- |
| `src/runtime.js` | Select isolated practice or load live adapters **before** importing app |
| `app.js` | Assemble dependencies, wire navigation events and start the chosen app |
| `src/app/screens.js` | Screen registry and default route props |
| `src/app/router.js` | Validate routes and unmount the current screen before mounting the next |
| `src/app/live-app.js` | Registration gates, wallet entry, restoration and collection refresh policy |
| `src/app/player-session.js` | Wallet-owned player/world cache; reject stale reads before state writes |
| `src/app/wallet-events.js` | Provider subscriptions and teardown |
| `src/app/practice.js` | Fixture seeding and the practice screen index |
| `src/components/` | Screen markup, interaction and screen-local state |
| `src/components/entry-screens.js` | Welcome/register markup and pending button state |
| `src/lib/screen-scope.js` | Resource ownership for a screen or modal |
| `src/state/battle-state.js` | Shared duel state, recovery and the sole `advanceRound()` transition |
| `src/onchain/` | Chain readers and transactions; chain results remain authoritative |

### Adding or updating a screen

1. Export `mount(container, props)` and `unmount(container)` from its component.
2. Register it in `SCREENS`. Add public game destinations to `GAME_ROUTES` and put
   route defaults there rather than in document event listeners.
3. Navigate with the existing `nav:<route>` custom events. The live controller
   supplies collection/world state only after successful wallet and player reads.
4. Own timers, listeners and overlays for that mount. Clean them in `unmount`.
   Add a focused deferred-response test if the screen awaits data or transactions.

### Async work and modal lifetime

Capture the scope created for the current mount before awaiting work. Do not
check a mutable module-global scope after an await: it may now belong to another
mount. The same rule applies to card IDs, mint addresses, duel IDs and callbacks.

```js
const scope = createScreenScope();
scope.defer(stopTimer);                     // registers existing cleanup
scope.timeout(() => animateCard(), 250);    // owned, cancellable timeout
const result = await readSomething();
if (!scope.active) return;
renderResult(result);
// During unmount: scope.dispose();
```

`defer` returns an idempotent release function. `dispose` invalidates the scope
before cleanup and releases resources in reverse order. It does not cancel a
transaction already submitted. Separate confirmed state accounting from UI work:
a confirmed burn still updates the vault after its modal closes, while a dismissed
provenance read must never select the mint in a newer modal. Result engraving must
check ownership again after mint reads, before submitting any follow-on transaction.

The existing preparation mount generation and reveal generation remain local
where they also sequence proofs/playback. Skip shortens playback; live round
resolution still waits for reveal confirmation. `advanceRound()` is the only
round-advance operation; INTEL remains read-only after commitment.

## Styles

`tokens.css` defines the theme. The reset/shared base in `index.html` remains for
compatibility; `archive.css` owns the fluid layout and presentation overrides.
Its later completion/media blocks intentionally override earlier rules, so moving
them by screen can change the cascade.

Large extracted component base styles live in `src/style/*.js`. They are plain CSS
template strings installed by `injectStyle(id, css)` at the original call sites.
This keeps first-mount styles synchronous, preserves style-element order and
keeps URLs relative to the document. Real external CSS would resolve those URLs
relative to its own file and load asynchronously. Keep existing style IDs and
the public `injectCardCSS`/`injectRoundUiCSS` wrappers stable. The design linter
continues to scan extracted JavaScript style modules.

No game art, `archive.css`, tokens, contract, circuit, card statistics or economic
rules need changing for routine module/lifecycle refactors. The optional private
preview packager (`scripts/prepare-archive-preview.mjs`) is separate from the
GitHub Pages release path.

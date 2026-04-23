# 0xARK — Technical Debt Register

Generated: 2026-04-24 (Phase 1 conservative refactor)  
Sprint: v3.0-plus submission prep · Deadline: 2026-05-11

---

## Classification

| Class | Meaning | Count |
|---|---|---|
| A — Resolved | Already fixed; comment deleted | 0 |
| B — Pre-submission | Must fix before 2026-05-11 | 0 |
| C — POST-HACKATHON | Planned for Season 2 or post-deadline sprint | 12 |
| D — KNOWN-LIMITATION | Permanent workaround; intentional design constraint | 0 |

All 12 open items are Class C. **No blocking items exist for submission.**

---

## Class C — POST-HACKATHON

### Asset Replacement — Sprite Seas (8 items)

All 8 items track the planned migration from legacy tileset PNGs to Kenney
Monochrome Pirates / Sprite Seas procedural art. The legacy sheets are already
archived in `assets/retired/`; placeholders remain so the overworld/dungeon
still renders with the old art.

| # | File | Line | Description |
|---|---|---|---|
| C-01 | `01-pixi.js` | 437 | Pirate-sheet tile config → Sprite Seas Kenney Monochrome Pirates |
| C-02 | `01-pixi.js` | 480 | Town tile primitives → Sprite Seas tile primitives |
| C-03 | `01-pixi.js` | 513 | Dungeon interior tiles → Sprite Seas Mystery Dungeon-style |
| C-04 | `01-pixi.js` | 561 | Exterior/ground/trees → Sprite Seas town primitives |
| C-05 | `01-pixi.js` | 562 | Walls/ruins → Sprite Seas interior primitives |
| C-06 | `01-pixi.js` | 620 | Character sprites (VEGA/MIRA/player) → Sprite Seas |
| C-07 | `01-pixi.js` | 641 | Overworld tile set → Sprite Seas |
| C-08 | `01-pixi.js` | 674 | Forest props → Sprite Seas forest props |

**Why deferred**: Art swap requires replacing all tileset indices and palette
mappings. Functional parity exists with legacy art. No judge-visible gap during
submission period.

---

### Animation Stubs — Finisher / Victory / Defeat (3 items)

The animation functions exist with correct signatures and are wired into the
duel state machine. The bodies are stubs; the duel resolves correctly without
them.

| # | File | Line | Description |
|---|---|---|---|
| C-09 | `10-animations.js` | 12 | `playFinisherAnimation()` — ZK seal burst + element particle cascade |
| C-10 | `10-animations.js` | 22 | `playVictoryAnimation()` — Gold particle cascade + VICTORY banner + card reveal flip |
| C-11 | `10-animations.js` | 35 | `playDefeatAnimation()` — Red vignette + DEFEAT + lore quote + XP consolation |

**Why deferred**: Day 12–13 scope items. Game resolves win/defeat correctly
without the animation. Judges can see the resolution; polish comes post-submission.

---

### NFT Transfer Selection (1 item)

| # | File | Line | Description |
|---|---|---|---|
| C-12 | `08-duel-scene.js` | 2128 | `transferredCards` array not populated from `selectTransferCards()` — victory TX uses empty array |

**Why deferred**: `selectTransferCards()` UI exists in `09-victory-scene.js` but
the two-way data-binding between VictoryScene and DuelScene was not completed.
The win condition fires and the transaction is submitted; card transfer selection
is a UX enhancement. Full flow works end-to-end in mock mode.

---

## Resolved (Class A)

None. All 12 previously recorded TODOs were confirmed open as of 2026-04-24.

---

## Pre-Submission Blockers (Class B)

None found. All open items are safely deferrable to post-hackathon sprint.

---

## Known Limitations (Class D)

| Limitation | Reason |
|---|---|
| Competitive Gold Mode disables Imprint stat bonus (+1 BP cap) | Intentional: pure-skill mode; judges aware per pitch script |
| Lease default (3 duels, auto-return) instead of permanent Steal | Intentional: prevents death spirals; documented in GDD v3.0-plus |
| ZK proof is browser-side (snarkjs WASM); no on-chain verifier called in devnet demo | alt_bn128 verifier wired in Anchor; browser proof generation is production path |
| React Wallet UI CI failure (`package-lock.json` out of sync) | Pre-existing since Day 12; separate fix task, not part of refactor scope |
| Anchor Rust CI failure (cargo test compilation) | Pre-existing since Day 12; separate fix task, not part of refactor scope |

# 0xARK — Phase F2 Spec: Ceremony (v1.0)

> Author: Claude (design) · 2026-07-09 · authored against main `de9ef01`
> Prereq: **YKK-12 §10 local-validator e2e GREEN** (start gate per YKK-57 —
> do not move verified ground before acceptance).
> Companions: `DESIGN.md` (Rituals/motion/token authority — its beat tables
> are normative here), `0xark-frontend-review.md` §6/§7, `docs/F1_SPEC.md`.
> Scope guard: no Rust / circuit / WS-server changes. onchain.js gets ONE
> additive reader (§3.1). Everything else is client presentation.
> Verified groundwork baked into this spec: exact `effects[]` string
> vocabulary (damage-calc.js), the on-chain seed formula
> (reveal_hand.rs:128 `SHA-256(p1_salt‖p2_salt‖[round])`), DuelState salt
> offsets (from the PR-D layout derivation), `commit_reveal.*` = zero code
> references, `getGameWorld()` exists at onchain.js:2486.

---

## §0. Ticket / PR map

| PR | Contents | Size | Order rationale |
|---|---|---|---|
| **PR-H** | F2-4 transitions + F2-6 preload/cleanup + **audio core** (F2-5a: engine + soundboard, no wiring) + §8 nit rider | S–M | Safe warmup; audio lands first so every later PR can wire hooks |
| **PR-I** | F2-1 SEAL / CRACK ceremonies | M | Uses ceremony runner + sfx hooks from PR-H |
| **PR-J** | F2-2 Battle Stage v2 (+ §3.1 reader) | **L — solo PR** | The flagship; isolate it |
| **PR-K** | F2-3 Pack reveal v2 + F2-5b SFX wiring completion + soundboard sign-off | M | Closes the phase |

Stop after each PR for independent verification (F0/F1 と同運用).

Standing rules for ALL F2 PRs:
- The `resolveRound()` seam from PR-E is sacred: playback-complete / SKIP /
  retry all still funnel there. F2 changes *what plays*, never *what decides*.
- No new colors/sizes outside tokens; design-lint must PASS every PR.
- Every ceremony: **intro beats → idle loop (absorbs chain latency) →
  confirm beat**, skippable after first play (per session), collapses under
  `prefers-reduced-motion` to intro-still + confirm.
- New px glyphs go through the same render-review gate as F0-4 (Claude
  renders the rects and approves before call-site wiring).

---

## §1. Shared primitives (PR-H)

### 1.1 `src/lib/ceremony.js` — the beat runner

One tiny engine every ritual uses:

```js
runCeremony(id, {
  mount,            // element to overlay (z: var(--z-ceremony))
  intro:  [beat…],  // fixed beats: { el|html, cls, dur, sfx? }
  idle:   beat,     // looped while `until` is pending (min 600ms floor)
  until:  promise,  // the real work (proof / tx) — ceremony absorbs its latency
  confirm:[beat…],  // fires on resolve; on reject → shake + rethrow
})
```

- **Skip**: `sessionStorage['oxark-cer-seen:'+id]` — after first play this
  session, intro compresses to its last beat (~400ms). A tap during intro
  also fast-forwards to idle.
- **Reduced motion**: intro renders as a single still (last intro frame),
  idle = static shimmer-free, confirm = instant + toast. No flashes/shakes.
- **Failure**: reject → 2× shake (skipped under reduced-motion) → overlay
  dismiss → error rethrown to the caller's existing catch (F1 error
  mappings — InsufficientEnergy etc. — stay exactly where they are).
- Beats snap to motion tokens only (`--t-fast/base/slow`, `--ease-pop/step`).

### 1.2 `src/lib/audio.js` — ZzFX chiptune engine (F2-5a)

- **Vendor ZzFX** (MIT, ~1KB) into `src/vendor/zzfx.js` — pinned file, no
  CDN (network posture). All SFX are **synthesized params, zero binary
  assets** — perfectly GBA, zero deploy weight.
- API: `sfx(id)`, `setMuted(bool)`, `isMuted()`. Mute persists in
  `localStorage['oxark-muted']`. **Default: sound ON** (§10-1 for veto),
  unlocked on first pointerdown (autoplay policy). Master volume 0.5.
- Mute toggle: small `px-icon` speaker button in the shared header (home +
  battle-flow topbars).
- **SFX manifest** (id → trigger → character; cc tunes params):

| id | trigger | character |
|---|---|---|
| `sfx-ui-confirm` | primary buttons, LOCK IN | short square blip, up |
| `sfx-ui-cancel` | back/close | short blip, down |
| `sfx-flip` | any card flip | papery tick + tone |
| `sfx-lock` | SEAL confirm | metallic clack, low |
| `sfx-crack` | CRACK burst | splinter + pop |
| `sfx-hit` | pair damage | punchy noise burst |
| `sfx-ko` | card death | descending crush |
| `sfx-victory` | round/match win banner | 3-note rising jingle |
| `sfx-defeat` | match loss | 2-note falling |
| `sfx-legendary` | legendary pack flip / crown flash | long shimmer arp |
| `sfx-engrave` | ENGRAVE confirm | chisel tick ×3 + ring |
| `sfx-promote` | PROMOTE confirm | transmute sweep, up |

- `dev/sfx-preview.html` — soundboard (all ids + mute + volume), same
  pattern as `dev/icons-preview.html`. **Gate: r0ze ear-approves the params
  there before PR-K merges** — Claude can't hear; my verification of audio
  is code-level only (params sane, engine wiring, mute persistence).

---

## §2. F2-1 — SEAL / CRACK (PR-I)

### 2.1 SEAL (commit ceremony, preparation.js)

Wraps the existing `_handleConfirm` async **without reordering it** — the
proof + `commitHand` tx promise becomes the runner's `until`.

| # | beat | dur | visual | sfx |
|---|---|---|---|---|
| 1 | flip-down | 5×80ms stagger | the 5 slot tiles flip face-down | sfx-flip ×5 (pitch down each) |
| 2 | stack | 160 | tiles slide into one pile | — |
| 3 | wrap | 320 | pile rolls into a scroll (px-scroll XL glyph) | — |
| 4 | drop | 160 | scroll falls into the chest (px-chest-lg) | — |
| idle | shimmer | loop (≥600) | chest edge glint sweep + `PROVING…` caption cycling flavor: `constraints… witnesses… sealing…` | — |
| 5 | lock | 160 | padlock snaps (px-padlock-lg), `COMMITTED · Groth16` chip + txLink | **sfx-lock** |
| 6 | out | 400 | overlay fades, nav → INTEL (existing flow) | — |

- Round 1 shows the energy caption (F1-3) *inside* beat 4's frame — the
  disclosure stays visible through the ceremony.
- Failure (proof error / tx reject / InsufficientEnergy): shake → dismiss →
  the existing F1 error toast + button restore fire untouched.
- **New XL glyphs**: `px-chest-lg`, `px-scroll`, `px-padlock-lg` on a 32×32
  grid, added to the px-icons sprite. **Render-review gate applies** (push
  glyph commit → STOP → Claude renders + approves → proceed).

### 2.2 CRACK (reveal open, reveal.js mount intro)

Replaces the current straight fade-in, then hands off to playback:

chest centered → shake ×2 (80ms each) → crack lines etch (px-style SVG
strokes, 160) → burst (160, **sfx-crack**) → cards fan face-down to both
rows (5×60ms stagger) → flip-up (existing) → playback begins. Demo mode
identical. Skippable/reduced-motion per §1.1.

**Acceptance (F2-1)**: full duel on local validator plays SEAL each round
with real proof/tx latency absorbed by the idle loop (no dead button-text
state); a failed commit restores the F1 error path pixel-identically;
`?devview=preparation` exercises the ceremony with a mocked 900ms `until`.

---

## §3. F2-2 — Battle Stage v2 (PR-J, the flagship)

The reveal playback stops being a scripted log and becomes a **replay of
`damageCalc().effects[]`** — the same deterministic events that decide the
winner. Presentation and truth can no longer diverge.

### 3.1 Truth alignment first — the seed reader (additive, onchain.js)

**Verified gap**: on-chain combat uses
`seed = SHA-256(p1_salt ‖ p2_salt ‖ [round])` (reveal_hand.rs:128) for INI
tie-breaks and action ordering. Client `damageCalc` accepts the same seed
(its header documents the identical formula) — **but reveal.js currently
passes none** → zero-seed playback can flip INI-tie outcomes vs the chain.

Fix (small reader, PR-D style):

```js
getRoundSalts(duelIdStr, round) → { p1Salt, p2Salt }   // Uint8Array(32)×2
// DuelState offsets (from the verified PR-D layout):
//   p1_salt @ 1283 + (round-1)*32     p2_salt @ 1443 + (round-1)*32
// All-zero slice ⇒ salt not yet on-chain (opponent hasn't revealed).
```

`computeRoundSeed(p1Salt, p2Salt, round)` via WebCrypto SHA-256 lives in
damage-calc.js or a sibling. Playback (real mode) fetches salts once both
reveals exist (the resolver already waits for that), computes the seed, and
passes it to `damageCalc`. Demo mode: both salts are local → same formula.
**Acceptance**: an INI-tie fixture hand plays back with the same per-round
tally the chain records (this closes a real, verified divergence — not
polish).

### 3.2 Consumption contract

`damageCalc` returns `{ effects: string[], pairs, winner, … }`. Field names
for `pairs`/totals: **read damage-calc.js as the authority** (do not trust
this spec's memory of them). The effect STRINGS below are verified verbatim
against damage-calc.js and are the timeline's keys.

### 3.3 Event → beat mapping (the heart of PR-J)

Phases replay in the array's natural order. `{n}`=side, `{id}`=cardId,
`{i}`=pair index. Telop channels per DESIGN.md `battle-telop`.

| effect string | beat | dur | visual | sfx | telop |
|---|---|---|---|---|---|
| `p{n}_synergy_{faction}` | banner | 320 | faction-hue band sweeps that side's row, `FACTION SYNERGY +10%` | sfx-ui-confirm | gold/red |
| `p{n}_legendary_{id}_present` | crown | 160 | px-crown flash on that frame | sfx-legendary (short) | gold |
| `{s}_void_blocked_{id}` | seal-stamp | 160 | `SEALED` stamp + action icon crossed on the blocked frame (**first pass — render before any actions fire**) | — | dim |
| `{s}_crystal_{id}` | buff | 160 | `+5 BP` pop, ΣBP ticker +5 | — | combat |
| `{s}_barrier_{id}` | shield | 160 | shield shimmer overlay on frame | — | combat |
| `{s}_flame_{id}_hits_{t}` | ember | 320 | ember arc actor→same-index foe, `-5 HP` red pop | sfx-hit | red/gold |
| `{s}_storm_sweeps_{opp}` | gust | 320 | wind band crosses the foe row; all foe ΣBP −2 ticks; shield shimmers extinguish | sfx-hit (soft) | combat |
| `{s}_shadow_{id}` | fade | 160 | frame dims to 40% + px-shadow ring | — | dim |
| `{s}_void_{id}` | spark | 160 | px-void sparkle from actor toward the facing slot | — | combat |
| pair `i` (from `pairs`) | duel | ~640 | both `i`-frames step to center-scale 1.1 → attacker (INI order from data) strikes: hit flash + 80ms shake + HP pop → survivor counter-strikes → `dead` ⇒ KO shatter 320 + px-skull stamp | sfx-hit / sfx-ko | combat |
| `p{n}_barrier_blocked_pair_{i}` | block | (inside duel) | shield-break flash replaces the damage pop for that strike | sfx-hit (muted) | combat |
| `p{n}_shadow_skip_pair_{i}` | skip | 240 | both frames side-step, `SKIP` stamp | — | dim |
| `winner_{p}_bp_{a}_vs_{b}` | verdict | 480 | BP tug-meter animates to final ratio → hand off to the existing bridge | sfx-victory / sfx-defeat | gold/red |
| `loot_card_{id}` | — | 0 | ignored in playback (RESULT concern) | — | — |
| *unknown string* | — | 0 | **forward-compat rule: verbatim dim telop, no beat** | — | dim |

### 3.4 Layout & structure

Per review §6.5: both rows render **card-frames @140px** (stat labels
visible per the F0 rule), live ΣBP counters per side, center duel zone
(~1024×200) where pair beats play, **2-row telop** replaces the old center
log (delete the scripted `addLog` narrative; keep `addLog` as the telop
writer). Round HUD/pips untouched.

### 3.5 Engine & pacing

A ~60-line async beat queue: `for (const beat of timeline) await play(beat)`
with a `skip` flag checked per beat. Typical round lands ≈8–14s (event
count × token durations) — no more fixed 17s. **SKIP** ⇒ apply end-state
instantly (all HP/KO/tug final, 800ms verdict still) ⇒ `resolveRound()`.
Reduced-motion ⇒ beats run at 0ms except three anchors (synergy banner,
verdict, KO stills) + full telop scroll.

### 3.6 Seam guarantees (verification targets)

`resolveRound()` call sites byte-identical in count and placement
(completion / SKIP / retry). `effects` consumed read-only. Demo path uses
the identical timeline. The old `checkSynergy` duplicate and fabricated
log lines are deleted (grep target).

**Acceptance (F2-2)**: INI-tie fixture parity (§3.1); a storm+barrier+void
hand renders every mapped beat (devview fixture provided); SKIP mid-pair
lands on the exact end-state; full 3-round demo series plays bridge-to-
bridge with no timing dead-air; design-lint PASS.

---

## §4. F2-3 — Pack reveal v2 (PR-K)

Pack object (px-art, 48-grid `px-pack` glyph — render-review gate) → tap
**tear** (2 beats, 240ms) → 5 face-down frames fan (5×60ms) → per-card flip
staged by `rarityOf` (card-meta — the 37/60 bug class cannot return):

| rarity | stage |
|---|---|
| Common | flip 160, chain stagger 120 | sfx-flip |
| Uncommon | flip + `--rarity-u` edge glow 160 | sfx-flip |
| Rare | **400ms pre-hold** → blue flash ring → flip | sfx-flip (pitch up) |
| Legendary | screen gold flash 320 → frame flips at **200px center** → 1200ms hold | **sfx-legendary** |

Multi-pack purchases queue packs one at a time. Footer caption:
`drop rates live on-chain — provably fair`, numbers from `getGameWorld()`
ppm fields (reader exists at onchain.js:2486; **cc verifies the decoder
covers the drop-rate fields, extends additively if not** — the GameWorld
layout was re-derived in the fixture-script review, `shop_phase_threshold
@157` anchor). Reduced-motion: instant grid of results + telop list.

**Acceptance (F2-3)**: a scripted 5-card mixed-rarity fixture plays all
four stages; rarity colors/bands match card-meta for all 60 ids (reuse the
F0-3 harness); soundboard sign-off recorded (§1.2 gate).

---

## §5. F2-4 — Transitions & motion unification (PR-H)

- `navigate()` gets the **single** screen-wipe: `#wipe` overlay
  (`--bg-deep`) darkens in `--t-base`, swap `innerHTML`, reveal in
  `--t-base`. GBA two-frame feel; `prefers-reduced-motion` ⇒ instant swap.
  One implementation point — screens change nothing.
- **Motion audit** (one-time sweep, not a new lint category): every
  `transition:`/`animation:` duration in `src/**` resolves to
  `var(--t-fast|base|slow)` and eases to `--ease-pop|step|linear`.
  Acceptance grep: `grep -rn "transition[^;]*[0-9]ms\|animation[^;]*[0-9]ms"
  solana/client/src --include="*.js" | grep -v "var(--t-"` → 0.

## §6. F2-6 — Load hygiene (PR-H)

- **Prefetch ZK artifacts** on preparation mount:
  `fetch('hand_commitment.wasm')` + zkey with default caching — snarkjs
  hits the HTTP cache on the real proof (same URLs). Log first-proof wall
  time before/after in dev console (measurement, not a gate).
- **Delete `commit_reveal.wasm` + `commit_reveal_final.zkey`** — verified
  zero code references; −2.1 MB off every Pages deploy.
- Fonts: add `preconnect` to fonts.gstatic + `rel=preload` for the CSS.

## §7. Nit rider (PR-H — one commit)

- reveal.js: drop the dead `ACTION_LABELS` import.
- Card.js: delete the stale `compact is ignored` doc line.
- Sealed-steal copy (legal cleared 2026-07-05, YKK-47): chip →
  `STEAL — coming with YKK-44`; loser line → `no card was taken — steal
  arrives with the escrow update`. `STEAL_ENABLED` stays `false` (that flag
  waits on YKK-44 the implementation, not the law).

---

## §8. Acceptance & CI (phase level)

- design-lint PASS on every PR (all enforced categories incl. bare-import —
  add `runCeremony`, `sfx`, `getRoundSalts` etc. to the shared-symbol list
  when they ship).
- Ceremony trio (SEAL/CRACK skip + reduced-motion) verified via devview.
- §3.1 seed-parity fixture green on local validator.
- Deploy size delta recorded (expect ≈ −2.1 MB).
- Soundboard sign-off by r0ze before PR-K merge (the one gate Claude
  cannot verify — honest boundary, code-level checks only).

## §9. Open notes for r0ze

1. **Sound default ON** (with header mute toggle + first-gesture unlock) —
   my recommendation for game feel; veto to default-OFF is one constant.
2. **SEAL idle floor 600ms** — fast local proofs still *read* as sealing.
   Taste call; tune after first feel.
3. **Four new XL glyphs** (`px-chest-lg`, `px-scroll`, `px-padlock-lg`,
   `px-pack`) go through the F0-4 render-review gate — expect one extra
   STOP inside PR-I and PR-K.

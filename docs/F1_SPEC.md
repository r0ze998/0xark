# 0xARK — Phase F1 Spec: Game Truth (v1.0)

> Author: Claude (design) · 2026-07-08 · authored against `6444dc8`; F0 now merged — branch from main `d5cc335`
> Prereq: **Phase F0 merged and verified** (tokens.css, px-icons, card-meta.js,
> stage scaler all exist). F1 branches from post-F0 main.
> Companions: `DESIGN.md` (visual/ritual authority), `0xark-frontend-review.md`
> (findings F-1…F-23). This spec is implementation-ready for Claude Code.
> Scope guard: no circuit changes, no Rust program changes, no WS server
> changes. Everything here is client-side + onchain.js read/wire work.

---

## §0. Ticket map (updated — F1-0 added)

| # | Ticket | Depends on |
|---|---|---|
| **F1-0** | onchain.js reader plumbing (NEW — extracted prerequisite) | F0 |
| F1-1 | Client round loop (round HUD, pips, bridge, hardcode removal) | F1-0 |
| F1-2 | Interruption → INTEL redesign | — |
| F1-3 | Energy HUD + refill + commit disclosure | F1-0 |
| F1-4 | EVOLVE removal → PROMOTE UI | F1-0 |
| F1-5 | RESULT honesty (fake loss removal, sealed steal, pending burn) | — |
| F1-6 | ENGRAVE VICTORY (settle_duel_history wiring + ritual) | F1-0 |
| F1-7 | DEMO badge, tx-link style, network config | — |
| F1-8 | ActionType rule-text audit vs damage_calc.rs | — |

Suggested PR grouping: **PR-D** = F1-0 alone (pure additive, fast review).
**PR-E** = F1-1 + F1-2 (the battle-flow rewrite). **PR-F** = F1-3 + F1-4 +
F1-6 (provenance/energy wiring). **PR-G** = F1-5 + F1-7 + F1-8 (honesty &
chrome).

---

## §1. F1-0 — onchain.js reader plumbing

Verified current state: `getDuelState` decodes only `{winner, endedAt, round}`;
`getPlayerState` decodes only `{vault, vault_count, deposit_amount}`; only
`readCardBattleHistoryCreatedAt` exists for CBH; there is **no cardId→mint
enumeration**. `promoteCard` / `settleDuelHistory` take **mint addresses**, so
F1-4/F1-6 are blocked without this section.

All layouts come from `solana/oxark/programs/oxark/src/state.rs` —
**derive offsets from the Rust source, never guess.** Two known hazards:

1. `PlayerState.current_queue: Option<Pubkey>` at offset 169 shifts every
   later field by +32 when `Some` (existing decoder already handles this for
   vault/deposit — extend the same branch, don't fork it).
2. `DuelState` grew twice post-hackathon (YKK-41 round_wins, settle bitmaps).
   The comment block inside `getDuelState` is stale; re-derive.

### 1.1 `getDuelStateFull(duelIdStr)` (new; keep old fn as thin wrapper)

Returns:

```js
{
  player1, player2,            // base58
  round,                       // u8 (1-5)
  p1RoundWins, p2RoundWins,    // u8 — YKK-41 fields
  winner, startedAt, endedAt,
  committed: [bool×5][2],      // per round × per player: commitment present
  revealed:  [bool×5][2],      //                        : reveal present
}
```

`committed/revealed` presence: derive from the per-round commitment /
revealed-cards slots being non-zero (exact test per state.rs field types —
e.g. commitment `[u8;32]` all-zero = absent). These two matrices power the
wait-state UI in §2.4 and the stall detection in §2.5.

### 1.2 `getPlayerState` — extend (same function, additive fields)

Add to the returned object: `energy` (u8), `energyLastTs` (i64 — the regen
anchor; exact field name per state.rs), and export the constants the client
must mirror: `ENERGY_MAX = 5`, `ENERGY_REGEN_SECS = 4*3600` (read from
`constants.rs`, hardcode with a `// mirror of constants.rs` comment + the
Rust path).

Client-side projection (display only — chain is authoritative at spend time):

```js
energyNow = min(ENERGY_MAX, energy + floor((now - energyLastTs)/REGEN))
nextPipInSecs = energyNow >= MAX ? null : REGEN - ((now - energyLastTs) % REGEN)
```

### 1.3 `getCardMintRecord(mintStr)` (new)

Decode CardMintRecord → `{ cardId, rarity }`. PDA finder already exists
(`findCardMintRecordPDA`).

### 1.4 `getOwnedCardMints()` (new)

```
conn.getParsedTokenAccountsByOwner(wallet, { programId: TOKEN_PROGRAM })
  → filter amount === '1' && decimals === 0
  → for each mint: getCardMintRecord(mint)   // batch via getMultipleAccounts
  → Map<cardId, [{ mint, rarity }]>          // multiple copies possible
```

Cache per session (module-level, invalidate on buyPack / burn / promote /
future steal). This map is the bridge between the id-based UI and the
mint-based provenance layer.

### 1.5 `getCardBattleHistory(mintStr)` (new)

Full CBH decode: `{ wins, losses, kos, dmgDealt, timesSummoned,
ownersDroppedCount, ownersHistoryCount, acquisitionSource, imprints[],
legendaryKills }` (+ whatever else state.rs holds; decode all scalar fields,
skip lease_* for now). Used by F1-4 (gates), F1-6 (post-engrave refresh),
and all of F3.

**Acceptance (F1-0)**: a temporary `window.__oxarkDebugReaders()` (dev-only,
stripped later) logs all five readers against a local-validator fixture;
values match `solana account` dumps for the same PDAs.

---

## §2. F1-1 — Client round loop

### 2.1 State machine (client)

```
matchmaking ──matched──▶ PREPARATION (round r)
     ▲                       │ commit_hand(r) ok        [SEAL ritual]
     │                       ▼
     │                   INTEL (60s)          ← §3 (F1-2)
     │                       │ LOCK IN / timeout
     │                       ▼
     │                   REVEAL(r):
     │                     reveal_hand(r) tx ──fail──▶ retry line (existing)
     │                     wait opponent  ──600s──▶ [CLAIM TIMEOUT WIN]──▶ RESULT
     │                     both revealed → battle playback (effects[])
     │                       │
     │                       ▼  poll getDuelStateFull (500ms × ≤20)
     │                 ended_at > 0 ?
     │                   │yes                │no
     │                   ▼                   ▼
     │                RESULT          ROUND BRIDGE (score) ──▶ PREPARATION(r+1)
     └────────────── nav:main ◀── CONTINUE
```

### 2.2 Round-scoped vs duel-scoped state

`battle-state.js` gains one function — `advanceRound(ds)` — that is the
**only** legal way to move to the next round:

| Reset per round | Persist across rounds |
|---|---|
| `fieldCards`, `commitment`, `salt`, `zkProofBytes`, `zkPublicSignals`, `zkPublicInputBytes`, `hasPeeked`, `opponentField`, `battleResult` | `matchId`, `duelId`, `opponentPubkey`, `opponentPlayerId`, `isHost`, `vault`, `playerPubkey` |

`advanceRound(ds)` sets `round: ds.round`, `p1RoundWins/p2RoundWins` (new
state keys), clears the reset column, then `nav:preparation`.

**duelId is constant for the entire 5-round duel.** The `-R1` suffix in the
demo fallback (`${matchId}-R1`) is a misleading legacy name — keep the value
(server compatibility) but add a comment, and never regenerate it per round.

### 2.3 Hardcode removal (baseline: 4 hits)

Replace literal `1` with `getState().round` at: `interruption.js:285,303`,
`reveal.js:147,149`. CI grep `grep -rn "duelId, 1," solana/client/src/components`
moves from report-only to **fail** in this PR.

### 2.4 Round HUD (DESIGN.md `round-pips`)

Shared header fragment mounted on preparation / intel / reveal:
`ROUND n/5` + pips (`●` gold = my round wins, `●` red = opponent's, `○`
pending). Data source: state (`p1RoundWins/p2RoundWins` mapped to my-side via
`player1 === myPubkey`). Also shown large on the bridge.

### 2.5 Reveal wait + stall

After my reveal tx confirms and playback ends, if the opponent's reveal for
round r is absent (`revealed` matrix), show `WAITING FOR OPPONENT…` with a
live elapsed counter. At **600s** (mirror `DUEL_STALL_TIMEOUT_SECONDS`),
surface `⚑ CLAIM TIMEOUT WIN` → `claimTimeoutWin(duelId)` → on confirm,
poll `getDuelStateFull` → RESULT. Error mapping: "too early" → keep waiting;
"claimer not revealed" → cannot happen from this screen (we gate on our own
reveal), but map defensively.

### 2.6 Round bridge (new lightweight overlay, not a routed screen)

1024×576 overlay, `display` type: `ROUND {r} — {YOU TAKE IT | OPPONENT TAKES
IT | DRAW}`, score `2 – 1`, pips, auto-advance 1600ms (tap to skip) →
`advanceRound()`. Draw detection: round counter advanced but neither
round_wins incremented (draws are no-count per FR-1).

### 2.7 Demo mode parity

Demo path (no WS/chain) simulates the same machine: bot commits/reveals
instantly, `p1RoundWins/p2RoundWins` tracked locally, first to 3 (max 5
rounds) → RESULT. DEMO badge (§7) is lit the whole time. This keeps the demo
honest *and* exercises the loop without a validator.

**Acceptance (F1-1)**: local-validator 2-wallet duel plays R1→R3 with a 3–0
score, bridge shown twice, pips correct on both clients; a stalled opponent
surfaces the timeout claim at 600s; demo mode plays a full 5-round series.

---

## §3. F1-2 — Interruption → INTEL phase

### 3.1 What is removed (and why)

- **Swap UI + logic, entirely** (`_swapMode/_swapSlot`, swap vault,
  `doSwap`, action re-assign). Post-commit hand mutation cannot coexist with
  on-chain commit-reveal — a swapped hand makes `reveal_hand` fail forever
  (review F-2).
- **The premature WS reveal**: `interruption.js` currently calls
  `sendHandRevealed` in both `onReady` and `onTimeout`. Delete both. The only
  WS reveal path is the existing gated one in `reveal.js` (fires *after* the
  on-chain reveal tx confirms). This also closes a needless pre-reveal
  information channel.

### 3.2 Layout (1024×576, header shares the round HUD)

```
┌──────────────────────────────────────────────────────────┐
│ [chip INTEL PHASE·blue]   ⏱ 0:47      ROUND 2/5  ●○|○○   │
├──────────────────────────────────┬───────────────────────┤
│ OPPONENT — SEALED                │ INTEL                 │
│ [chest][chest][chest][chest][ch] │ [px-eye] PEEK         │
│  (post-peek: chests crack open,  │   0.005 SOL           │
│   card-frames face-up)           │ ─────────────         │
│                                  │ [px-chip] AI ADVICE   │
├──────────────────────────────────┤   0.003 SOL           │
│ YOUR HAND — LOCKED [px-lock]     │  (advice text panel)  │
│ [cf][cf][cf][cf][cf]             │ ─────────────         │
│  action chips shown, immutable   │ [✓ LOCK IN] (primary) │
└──────────────────────────────────┴───────────────────────┘
```

Opponent slots pre-peek render as **sealed chests** (px-chest tile, not the
generic face-down card) — the CRACK ritual's object. Your hand renders as
card-frames with a small `px-lock` badge; no click affordance.

### 3.3 Flows

- **PEEK**: button → pending → `window.x402.scoutPeek(matchId,
  opponentPubkey, window.solana, null)`; on result, run a per-slot chest
  CRACK-lite (stagger 120ms) revealing opponent frames; button becomes
  `PEEKED ✓` (disabled). x402 payment toast carries tx-link. **Fallback**
  (x402 absent/failed): current mock cards may still render, but the DEMO
  badge lights and the hint says `MOCK INTEL (demo)`. Never silently.
- **AI ADVICE**: button → `window.x402.payAiStrategyAdvice(context)` →
  advice renders in a scrollable panel (body type, max ~5 lines visible).
  Context payload: `{ round, myFieldCardIds, myActionTypes,
  opponentField (only if peeked) }`. ⚠ Open design note for r0ze: this
  discloses your hidden hand to the x402 server pre-reveal. Today's client
  already leaks it earlier via WS; after 3.1 this endpoint becomes the *only*
  pre-reveal disclosure. Ship as-is (server is already trusted for
  matchmaking) but the tradeoff is now explicit — flag in PR description.
- **LOCK IN / timeout (60s)**: pure navigation → `nav:reveal`. No state
  mutation, no WS send.

**Acceptance (F1-2)**: grep `sendHandRevealed` appears only in `reveal.js`;
no `_swap` identifiers remain; a real on-chain duel completes reveal after
visiting INTEL (the F-2 brick is impossible); peek and advice both show
tx-links in real mode and the DEMO badge in fallback.

---

## §4. F1-3 — Energy

- **Data**: extended `getPlayerState` (§1.2) + client projection formula.
  Refresh on screen mount + after any refill/commit tx.
- **Display** (DESIGN.md `energy-pips`): 5 `px-bolt` pips + `n/5` + `next ⚡
  in 2:14:07` countdown (caption type). Mounted on: home header, main/vault
  topbar, battle lobby, preparation topbar.
- **Refill**: pip row is clickable → small panel: `REFILL TO 5 — 0.003 SOL`
  → `refillEnergy()` → pending → pips sweep-fill animation (t-base stagger)
  → success toast + tx-link. Disabled at 5/5.
- **Commit disclosure**: on preparation, when `round === 1`, a caption line
  under CONFIRM & COMMIT: `consumes ⚡1 (charged once per duel)`. Rounds 2–5
  show nothing (no charge).
- **Gate**: battle lobby START disabled at `energyNow === 0` with inline
  refill CTA. Error mapping: `InsufficientEnergy` from commit → friendly
  message + refill CTA (belt-and-suspenders; the gate should prevent it).

**Acceptance (F1-3)**: with a drained fixture wallet, START is blocked with
the CTA; refill re-enables within one poll; pips/countdown match
`solana account` dump of PlayerState.

---

## §5. F1-4 — EVOLVE removal → PROMOTE UI

### 5.1 Remove

`main-screen.js`: EVOLVE tab, `_countEvolvable`, `_buildEvolveList`, evolve
badge. `card-detail.js`: evolve button, `_handleEvolve`, `_callEvolveOnchain`,
the fake `✓ EVOLVED` path, `MERGE ONLY` badge. UI imports of `MERGE_RECIPES /
isMergeOnly / getMergeRecipe` go away (leave `lib/cards.js` data untouched —
it may still serve reference/docs).

### 5.2 Add — PROMOTE section in card detail (per DESIGN.md Provenance)

Data path: `getOwnedCardMints()` → mints for this cardId →
`getCardBattleHistory(mint)` per copy → **v1 rule: auto-select the copy with
the highest `wins`** (multi-copy selector is F3 scope; note it in a caption:
`best copy shown (2 owned)`).

Gate table (mirror of `evaluate_promotion` in Rust — cite the file/fn in a
comment; **numbers must be read from one client constants module**, not
inlined per screen):

| Tier | Gate | Cost |
|---|---|---|
| C→U | wins ≥ 10 | 0.01 SOL |
| U→R | wins ≥ 25 AND (legendary_kills ≥ 1 OR owners_dropped ≥ 1) | 0.03 SOL |
| R→L | wins ≥ 50 AND acquisition == duel_won AND kos ≥ 30 | 0.10 SOL |

Rendering: one progress bar per condition (`wins ████████░░ 8/10`), unmet
conditions listed with current/required; met = gold check. Button
`[px-arrow-up] PROMOTE — 0.01 SOL`, disabled until all conditions met.
Flow: pending → `promoteCard(mint)` → on confirm run the **PROMOTE ritual**
(frame cross-fade C→U with rarity-color flash — DESIGN.md Rituals) → refresh
`getCardMintRecord` + CBH → toast + tx-link. Errors: gate fail / insufficient
SOL mapped to friendly text. Legendary tier: section shows `MAX TIER ★`.

**Acceptance (F1-4)**: zero `evolve` identifiers in `src/components`; a
fixture card with wins≥10 promotes on local validator and its vault frame
re-renders as Uncommon; a 9-win card shows `8/10`-style progress and a
disabled button.

---

## §6. F1-5 — RESULT honesty

- **Delete `updateVaultAfterLoss`** and its call; the loser's vault never
  mutates client-side. (CI grep addition: `updateVaultAfterLoss` → 0 hits.)
- **Steal act behind a flag**: `src/config.js` gains
  `export const STEAL_ENABLED = false;` (flip after YKK-47/YKK-44).
  - `false` (now): winner's third act shows a **sealed slot** —
    `[px-lock] STEAL — sealed pending review` (chip, dim). Loser sees the
    mirrored line `no card was taken — steal is not yet enabled`.
  - `true` (later): winner runs the existing `claimBattleLoot` path staged as
    the STEAL ritual (DESIGN.md); loser sees the hooked-card animation. ⚠
    Open note for r0ze: `claim_battle_loot` (Phase 19, vault-bitmap transfer)
    is economically a steal — confirm whether YKK-47 gates it too, or only
    the future NFT-mint transfer (YKK-44). The flag covers either answer.
- **Loser recap**: replace the fake-loss beat with a learning panel — both
  hands side-by-side (card-frames ≥112px) + final score. Title stays
  `display-xl` red.
- **Burn pending pattern** (`card-detail.js`): button → `BURNING…`
  (disabled) → await `burnCard` tx → only then success state + vault refresh
  + tx-link; on failure restore button + error toast. No fire-and-forget.

---

## §7. F1-6 — ENGRAVE VICTORY (settle_duel_history)

Winner-only act 2 on RESULT, available once `getDuelStateFull().winner ===
myPubkey && endedAt > 0`:

1. Resolve the 5 used cardIds → mints via `getOwnedCardMints()` (a card must
   still be held — ATA ≥ 1 is enforced on-chain; if a mint can't be resolved,
   render that slot as `— not held —` and settle the rest).
2. `[px-chisel] ENGRAVE VICTORY` (primary) → pending →
   `settleDuelHistory(duelId, mints)` (already batches 1 ix/card into one
   tx) → ENGRAVE ritual: chisel sweep across the 5 frames, `+1 WIN` counters
   tick per card, gold dust → toast `recorded on-chain forever` + tx-link.
3. Re-click / already-settled (on-chain bitmap) → map the error to a
   completed state: `✓ ENGRAVED` (disabled). Partial-failure: show per-card
   result if the tx errors on one ix (fallback: mark all unknown, offer
   retry).
4. Skippable (`CONTINUE` stays available) — but the button is the visual
   centerpiece of the winner screen; this is the game's signature on-chain
   verb.

**Acceptance (F1-6)**: on local validator, winning then engraving increments
`wins` on all 5 CBH PDAs (verified via §1.5 reader); second click shows the
completed state without a tx.

---

## §8. F1-7 — DEMO badge · tx-link · network config

- `src/config.js`: `NETWORK = 'devnet'`, `EXPLORER_TX_URL(sig)` builder
  (cluster param from NETWORK), `STEAL_ENABLED`. Footer `DEVNET` and program
  id strings read from config, not literals.
- `ui-shared.js` (from F0): `txLink(sig)` → `<a class="tx-link" …>abcd1234…
  ↗</a>`; `setDemoMode(reason)` lights a persistent header `DEMO MODE` badge
  (DESIGN.md `demo-badge`) and logs the reason. Call sites: matchmaking WS
  catch, scoutPeek fallback, any x402 fallback, `payMatchEnd` skip.
- Every on-chain success toast in F1 code paths carries `txLink(sig)` —
  audit existing toasts while there.

---

## §9. F1-8 — ActionType rule-text audit

Procedure (cc): extract the authoritative semantics of the 6 ActionTypes from
`solana/oxark/programs/oxark/src/damage_calc.rs` into a table (name → exact
mechanical effect incl. interactions: Barrier vs Void, Flame adjacency, Storm
sweep, Shadow pair-skip, Crystal modifier). Regenerate
`ActionTypeSelector.ACTION_TYPES[].desc` and any tooltip text from that
table. Deliverable in the PR description: the table + a line-cite per row —
I will verify it against the Rust source independently. Also fix
`ACTION_LABELS` glyphs to px-icons (F0 already swapped the glyph set; this
ticket owns the *words*).

---

## §10. Acceptance & CI deltas (phase-level)

- CI greps promoted to fail: `duelId, 1,` (0), `updateVaultAfterLoss` (0),
  `sendHandRevealed` outside reveal.js (0), `evolve` in components (0).
- Manual e2e (local validator, 2 wallets, per devnet runbook): register ×2 →
  match → R1 SEAL→INTEL→REVEAL → bridge → … → 3-win RESULT → ENGRAVE →
  promote a ≥10-win fixture card. Screenshot set for each ritual state.
- Demo mode: full 5-round series with badge lit throughout, zero tx-links
  shown.

## §11. Open notes for r0ze (decisions embedded above)

1. **AI-advice hand disclosure** (§3.3) — accepted-tradeoff default; veto if
   you want advice gated to public info only.
2. **`claim_battle_loot` vs YKK-47 scope** (§6) — is bitmap-vault transfer
   inside the legal gate? `STEAL_ENABLED=false` is safe either way.
3. **Multi-copy promote selection** (§5.2) — v1 auto-selects best copy;
   full selector lands with F3-1.

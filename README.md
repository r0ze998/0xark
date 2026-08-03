# 0xARK

**A card battle game on Solana where cards remember who held them.**

Every duel is settled on-chain. Every win is engraved onto the card that won
it. Cards carry an immutable battle history — wins, KOs, and the chain of
wallets that have owned them — and that history is what makes a card rare,
not a number stamped on it at mint.

Built with Anchor. Hands are hidden with a Groth16 commit–reveal so neither
player can see the other's play until both are locked in.

---

## Table of contents

- [How a duel works](#how-a-duel-works)
- [Provenance: the point of the whole thing](#provenance-the-point-of-the-whole-thing)
- [The cards](#the-cards)
- [Repository layout](#repository-layout)
- [Running it locally](#running-it-locally)
- [On-chain program](#on-chain-program)
- [ZK commit–reveal](#zk-commitreveal)
- [Client](#client)
- [Testing](#testing)
- [Known gaps and open design questions](#known-gaps-and-open-design-questions)
- [Contributing](#contributing)

---

## How a duel works

Best-of-five, first to three round wins.

```
  init_duel          two wallets are matched; the duel account is created
       │
       ▼
  commit_hand        each player picks 5 cards, hashes them with a private
       │             salt (Poseidon), and posts ONLY the hash. Costs 1 energy.
       │             Neither side can see the other's hand.
       ▼
  reveal_hand        each player posts the plaintext hand + salt. The program
       │             recomputes the hash and rejects any mismatch — you cannot
       │             change your mind after seeing the opponent's commitment.
       │             It also verifies you actually own every card you fielded.
       ▼
  resolution         when both hands are revealed, the program runs the combat
       │             math on-chain and writes the round winner.
       ▼
  settle_duel_history   the winner engraves the result onto the cards that
                        fought — wins, KOs, times summoned.
```

If an opponent commits and then disappears, `claim_timeout_win` lets the
other player claim the duel after `DUEL_STALL_TIMEOUT_SECONDS` (600s). A
stalled duel can't hold a player hostage.

**Energy** gates play: `ENERGY_MAX` is 5, a duel costs 1, and one point
regenerates every 4 hours. `refill_energy` buys a top-up for 0.003 SOL.

## Provenance: the point of the whole thing

Most card games mint a card with a rarity and that rarity never changes.
0xARK inverts it — **rarity is earned by the individual card.**

`CardBattleHistory` (a PDA keyed by the card's mint) accumulates:

| Field | Meaning |
|---|---|
| `wins` / `losses` / `kos` | what this specific card has done in battle |
| `times_summoned` | how often it's been fielded |
| `owners_history[10]` | the wallets that have held it, as a ring buffer |
| `owners_dropped_count` | how many times it has changed hands |
| `acquisition_source` | how the current owner got it |
| `current_owner_since` | when |
| `imprints[5]` | milestone marks earned at thresholds |

Once a card clears the thresholds, `promote_card` raises its rarity **in
place** — same mint, same history PDA:

| Promotion | Requires | Cost |
|---|---|---|
| Common → Uncommon | 10 wins | 0.01 SOL |
| Uncommon → Rare | 25 wins | 0.03 SOL |
| Rare → Legendary | 50 wins + 30 KOs | 0.1 SOL |

Promotion is deliberately a **single-card, in-place upgrade** rather than a
two-card fusion. Fusion would destroy one lineage to create another; the
whole design premise is that a card's history is continuous and unbroken.
An older `evolve_cards` instruction (burn two, mint one) existed and was
removed for exactly this reason.

## The cards

60 cards, verified against `solana/client/src/lib/cards.js`:

- **6 factions × 10 cards** — Knight, Merchant, Pirate, Scholar, Monk, Engineer
- **By rarity**: 30 Common, 18 Uncommon, 6 Rare, 6 Legendary

Each card has BP (attack), HP (durability), and INI (initiative), and the
stat shape defines the faction's identity: Pirates are glass cannons (high
BP, low HP, fast), Monks are immovable (high HP, lowest INI), Engineers hit
hard at middling speed.

Card stats live in **`cards.js` on the client and `card_data.rs` on-chain**,
and the two must agree — see [Testing](#testing) for the parity fixtures
that enforce it.

## Repository layout

```
solana/
  oxark/                 Anchor workspace
    programs/oxark/      the main program (52 instructions)
      src/
        lib.rs           #[program] — instruction entrypoints
        state.rs         account layouts (PlayerState, DuelState, …)
        instructions/    one file per handler
        damage_calc.rs   combat math (on-chain authority)
        groth16.rs       pairing verification for the ZK proof
        poseidon_helper.rs
        card_data.rs     the 60-card table
      tests/             duel_mechanics, damage-calc parity, init
    programs/oxark-cards/  separate program: 1-of-1 SPL card NFTs
    tests/               oxark-tests package (primitives, loot, provenance…)
    test-support/        shared test harness crate
  client/                browser client (vanilla ES modules, no framework)
    src/onchain/         pda.js · readers.js · tx.js · rpc.js
    src/components/      screens (preparation, reveal, vault, shop, trade)
    src/lib/             cards.js, damage-calc.js, audio, pixel icons
circuits/hand_commitment/  the Circom circuit + build scripts
multiplayer/             WebSocket matchmaking relay + x402 endpoints
fixtures/                cross-language parity fixtures (180 combat cases)
dev/                     local session scripts, previews
scripts/                 CI checks (IDL sync, design lint)
```

## Running it locally

**Prerequisites:** Rust + Solana CLI (Agave 3.x), Anchor, Node 18+, and
`solana-test-validator`.

```bash
# 1. build the program (also regenerates and syncs the client IDL)
cd solana/oxark && make build

# 2. run the on-chain test suite
cargo test

# 3. start a local validator and deploy
solana-test-validator
anchor deploy --provider.cluster localnet

# 4. serve the client
cd ../client && python3 -m http.server 4200

# 5. the WebSocket relay (matchmaking)
cd ../../multiplayer && npm install && node server.js
```

Then point a wallet at `http://localhost:8899` and open
`http://localhost:4200`.

> **Note on wallets:** the client signs with `signTransaction` and submits
> the transaction itself, rather than delegating submission to the wallet.
> That means a wallet showing "0 SOL" or "simulation failed" against a local
> validator is expected — the wallet is quoting a different cluster. The
> transaction still goes through.

`make build` runs `anchor build` and copies the generated IDL to
`solana/client/oxark-idl.json`. **Never hand-edit that file** — CI verifies
it against `lib.rs` down to argument names (`scripts/check-idl-sync.py`).

## On-chain program

52 instructions. The ones that matter:

**Duel**
`init_duel` · `commit_hand` · `reveal_hand` · `claim_timeout_win` ·
`settle_duel_history`

**Cards and provenance**
`buy_pack` · `promote_card` · `burn_card` · `init_card_mint_record` ·
`update_card_battle_history` · `record_card_owner_change`

**Economy**
`refill_energy` · `create_listing` · `accept_listing` · `cancel_listing` ·
`claim_prize_v2`

**Key accounts**

| Account | Holds |
|---|---|
| `PlayerState` | vault bitmap, energy, season stats |
| `DuelState` | commitments, revealed hands, salts, round state, winner |
| `CardMintRecord` | mint → card_id + rarity |
| `CardBattleHistory` | the provenance record described above |
| `TradeListing` | marketplace escrow |

Combat resolution is **deterministic and on-chain**. Initiative ties are
broken by a seed derived from both players' revealed salts —
`SHA-256(p1_salt ‖ p2_salt ‖ round)` — so neither player can influence it
alone, and the client can replay the exact same fight for animation.

## ZK commit–reveal

The circuit (`circuits/hand_commitment/`) proves that a player knows a hand
matching a published Poseidon commitment, without revealing it. Groth16,
verified on-chain in `groth16.rs`.

```
commit:  H = Poseidon(card_ids[10], salt, round, pubkey)   →  post H only
reveal:  post (card_ids, salt)  →  program recomputes H and compares
```

The commitment binds to the player's pubkey and the round, so a commitment
can't be replayed by someone else or into a different round.

> The circuit currently commits to **card IDs (species), not individual card
> mints.** See [known gaps](#known-gaps-and-open-design-questions).

> ⚠️ The proving key in this repository comes from a development ceremony
> and **is not suitable for production.** A real trusted setup is required
> before mainnet.

## Client

Vanilla ES modules, no framework, no build step. The pixel art, the GBA-era
palette, and the icon set are all drawn programmatically
(`src/lib/px-icons.js`) rather than shipped as image assets.

On-chain access is split into four modules:

| Module | Responsibility |
|---|---|
| `onchain/pda.js` | PDA derivation, program ID, error map |
| `onchain/readers.js` | deserializing account bytes into JS objects |
| `onchain/tx.js` | building and submitting instructions |
| `onchain/rpc.js` | connection and cluster config |

Account readers decode by **hardcoded byte offsets** rather than an IDL
deserializer, which keeps the client dependency-free but means
`state.rs` layouts are effectively frozen — reordering a field breaks the
client silently. Layout changes need matching offset updates in
`readers.js`.

## Testing

```bash
cd solana/oxark && cargo test     # 213 test cases across the workspace (litesvm)
```

Tests run against the real compiled `.so` through litesvm, which uses the
same rbpf VM as the chain — not a mock.

**Cross-language parity.** Combat math exists in three places: `damage_calc.rs`
(on-chain authority), `client/src/lib/damage-calc.js` (animation), and the
AI agent's copy. They must agree exactly, or the animation would show a
different fight than the chain settled. `fixtures/damage_calc.json` holds
180 generated cases, and `test_damage_calc.rs` runs the Rust implementation
against all of them. Each implementation carries a `PARITY-BASELINE` stamp
with the fixture hash; see `MAINTENANCE.md` for the regeneration procedure.

**CI** runs the test suite, an IDL sync check (instruction names *and*
argument names against `lib.rs`), and a design lint that rejects
off-palette colors.

## Known gaps and open design questions

This section is deliberately blunt. If you're reading the code, these are
the things that will confuse you, and they're honest open problems rather
than oversights we're hiding.

**Two ownership systems that aren't reconciled.**
The game tracks ownership in `PlayerState.vault_bitmap` — 60 bits, one per
card ID. That's what packs, duels, loot, and the trade floor all read and
write. Separately, `oxark-cards` mints real 1-of-1 SPL NFTs, and
`CardBattleHistory` is keyed by those mints. **No instruction keeps the two
in sync.** A card obtained through normal play has a bitmap bit but no NFT
and no provenance record; provenance currently attaches only to separately
minted NFTs. Unifying these is the largest open design question in the
project, and it blocks the "steal" mechanic below.

**A bitmap can't represent copies.** One bit per card ID means a player
either owns a species or doesn't — there's no way to hold two of the same
card, and no way to say *which* copy was played.

**The circuit commits to species, not instances.** `card_ids` is `[u64; 10]`
of catalog IDs. Consequently the chain records *what kind* of card was
played, never *which one*. Any feature that needs per-instance identity in
a duel (permanent card theft, most obviously) requires a circuit change —
and therefore a new trusted setup.

**Steal is designed but not implemented.** `StealType` (Lease / Ransom /
HandPeek / Legendary) and `claim_battle_loot` exist, but loot is gated off
(`STEAL_ENABLED = false`) pending the ownership question above, a legal
review of permanent transfer, and one known griefing vector: a player
holding an unclaimed loot from a finished duel could strip a card the victim
has already committed in a *different* live duel, forcing a forfeit. The
leading fix is snapshotting the fielded cards at commit time. This is
documented in `reveal_hand.rs` where the assumption lives.

**x402 micropayments depend on a broker the repo doesn't run for you.** The
endpoints, replay protection, and memo-nonce validation are implemented and
tested. The client module (`src/02-x402.js`) *is* loaded by `index.html` and
exposes ~20 paid calls on `window.x402`, but only three are reachable from
the battle UI: `scoutPeek` and `payAiStrategyAdvice` (INTEL phase,
`components/interruption.js`) and `payMatchEnd` (`components/loot.js`).
Without the broker running, those three fall back to a *visible* demo mode —
a toast (`MOCK INTEL (demo) — x402 peek offline`) or a demo-mode banner, not
a silent no-op. The remaining exports have no caller yet.

**MagicBlock ephemeral rollups are implemented but not enabled.**
`delegate_session` / `undelegate_session` are real Delegation Program CPIs
on chain, and `onchain/tx.js` has the matching builders plus a Magic Router
path — but `src/01-magicblock.js` is not in `index.html`'s script tags and
`_mbMode` defaults to `false`, so nothing routes through the ER at runtime.
The SDK also drags in a crate that overflows the SBF stack frame in dead
code paths; the build pins `--tools-version v1.52` to keep that non-fatal.

**The client's `ANCHOR_ERRORS` map is stale** — it stops around code 6066
while the program now defines codes past 6100. Unknown codes fall back to a
generic message rather than mismapping, but the map should be generated from
the IDL rather than maintained by hand.

## Contributing

Issues and PRs welcome. A few conventions that will save you a round trip:

- **Don't hand-edit `solana/client/oxark-idl.json`.** Run `make build` in
  `solana/oxark` with the program keypairs present. CI checks argument-level
  sync.
- **Append new error variants** to the end of the `ErrorCode` enum. Inserting
  in the middle renumbers every subsequent Anchor error code, and the client
  maps them by number.
- **Account layouts in `state.rs` are frozen** in field order. The client
  reads by byte offset. If you must change a layout, update `readers.js`
  offsets in the same PR.
- **Box large accounts** in instruction contexts. `DuelState` is 1624 bytes
  and a third unboxed account in one context will overflow the BPF stack.
- **Colors come from the palette.** `scripts/design-lint.py` rejects hex
  values outside the defined set.

## License

See `LICENSE`. Third-party notices: `solana/client/src/vendor/ZZFX-LICENSE` (ZzFX audio engine).

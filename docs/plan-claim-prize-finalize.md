# Implementation Plan — Season Prize Settlement Fix (claim_prize_v2)

Status: **PLAN ONLY — awaiting review. No code written.**
Addresses the 🔴 confirmed-but-dormant over-payment in `claim_prize_v2`
(see `docs/audit-readme-vs-implementation-2026-06.md` + the bug verification).

## Confirmed root causes (from verification)

1. `winner_60_count` and `tier{2..5}_total_vault` are only ever set to 0
   (`init_game_world.rs:53-58`) and **never populated** → `timeout_mode` is always
   on → every vault≥1 player computes Tier-1 = 50%/1 of the pool (`claim_prize_v2.rs:62,122,124,128`).
2. `game_status` is only set to 0 (`init_game_world.rs:54`); **nothing advances it
   to 2**, so claims can't open today (`claim_prize_v2.rs:53`) — dormant.
3. Working defenses to KEEP unchanged: balance guard (`claim_prize_v2.rs:70`),
   deposit-zero double-claim guard (`:55`/`:86`, the C1/YKK-5 fix).

The normal (non-timeout) path is ALSO broken: with `tierN_total_vault == 0`, tiers
2-5 always `return 0`. So the fix must populate the tallies for both paths.

---

## 1. Instruction / file changes (signatures)

### NEW

**`instructions/finalize_season_tally.rs`** — crank that aggregates participants.
```rust
#[derive(Accounts)]
pub struct FinalizeSeasonTally<'info> {
    #[account(mut, seeds = [GameWorld::SEED], bump = game_world.bump)]
    pub game_world: Account<'info, GameWorld>,
    #[account(constraint = admin.key() == ADMIN_PUBKEY @ ErrorCode::NotAdmin)]
    pub admin: Signer<'info>,
    // remaining_accounts = the PlayerState PDAs for `players`, in the SAME order
}
// players: the pubkeys whose PlayerState PDAs are in remaining_accounts, sorted
//          strictly ascending and strictly greater than game_world.finalize_cursor.
pub fn handle_finalize_season_tally(ctx, players: Vec<Pubkey>) -> Result<()>;
```
Logic: require `game_status == 1`. For each `(pk, acc)` in `zip(players, remaining)`:
- require `pk > finalize_cursor` (strictly increasing → no double-count, no reorder),
- require `acc.key == find_pda([b"player", pk])` and `acc.owner == program`,
- borsh-read `PlayerState`, `vc = vault_count()`,
- accumulate: `vc==60 → winner_60_count+=1`; `50..=59 → tier2_total_vault+=vc`;
  `30..=49 → tier3`; `10..=29 → tier4`; `1..=9 → tier5`; track `max_vault` /
  `max_vault_count` (reset count on new max, ++ on tie),
- set `finalize_cursor = pk`, `finalize_processed += 1`.

**`instructions/activate_season.rs`** — `0 → 1` (admin). Require `now >= waitlist_close_timestamp`. Sets `game_status = 1`. (Clean state machine; optional — could also let finalize accept status 0 with closed waitlist.)

**`instructions/end_season_final.rs`** — `1 → 2` (admin), the claim gate.
```rust
pub fn handle_end_season_final(ctx: Context<EndSeasonFinal>) -> Result<()>;
```
Require `game_status == 1` AND **`finalize_processed == total_participants`** (full
tally — this invariant is what prevents the bug reopening). If `winner_60_count == 0`
(timeout), subtract `max_vault * max_vault_count` from the tier band `max_vault` falls
in (so timeout champions are removed from their band's prorata denominator — they
claim Tier-1 instead). Set `game_status = 2`.

**`instructions/migrate_game_world_finalize.rs`** — realloc an EXISTING GameWorld
to add the new fields, zero-init them (admin). Mirrors `migrate_shop_fields.rs`.
(Fresh seasons get the fields via `init_game_world`; only needed if a pre-existing
GameWorld must be preserved. The season system has never gone live, so a fresh
`init_game_world` is the likely path and this may be skippable.)

### MODIFIED

- **`state.rs`** — add to `GameWorld`: `max_vault: u8`, `max_vault_count: u32`,
  `finalize_processed: u32`, `finalize_cursor: Pubkey`; bump `SIZE`. Add helper
  `fn tier_band(vc: u64) -> u8`.
- **`init_game_world.rs`** — zero-init the four new fields (cursor = default).
- **`instructions/claim_prize_v2.rs::compute_tier_prize`** — rewrite branches
  (logic below). **Leave the handler's balance guard (:70) and deposit guard
  (:55/:86) untouched.**
- **`lib.rs`** — add entrypoints: `finalize_season_tally`, `activate_season`,
  `end_season_final`, (`migrate_game_world_finalize`).

### Corrected `compute_tier_prize`
```
timeout = (winner_60_count == 0)
Tier-1 eligible:  !timeout ? vault==60 : vault==max_vault
Tier-1 divisor:   !timeout ? winner_60_count : max_vault_count
Tier-1 payout:    pool*50/100 / divisor
else (not Tier-1): existing tier bands 2..5, prorated by the now-POPULATED
                   tierN_total_vault (return 0 only if that band is genuinely empty)
```
Order-independent; ties at the top split the 50% evenly; tiers 2-5 actually pay.

---

## 2. GameWorld field additions + PDA size impact

| New field | Type | Bytes |
|---|---|---|
| `max_vault` | u8 | 1 |
| `max_vault_count` | u32 | 4 |
| `finalize_processed` | u32 | 4 |
| `finalize_cursor` | Pubkey | 32 |

**+41 bytes** → `GameWorld::SIZE` ~185 → ~226. Rent delta negligible (~+0.0003 SOL).
Existing GameWorld account (if any) needs **realloc** via the migrate instruction;
fresh `init_game_world` allocates the new size directly. No other struct changes.
(Chose a `finalize_cursor: Pubkey` over per-player "tallied" PDAs to avoid N small
rent-bearing accounts — see §3.)

---

## 3. Aggregation scale (single-tx vs crank)

- Participants are only **counted** (`total_participants`), not listed on-chain;
  there is no enumerable registry. Off-chain the crank discovers all PlayerState
  PDAs via `getProgramAccounts` (discriminator filter), sorts by pubkey, batches.
- **A single-tx finalize is impossible for N beyond ~25-30** (the ~64-accounts and
  1.4M-CU per-tx limits). So finalize **must be a crank**: batches of ~25 PlayerState
  accounts per `finalize_season_tally` tx, accumulated into GameWorld.
- The `finalize_cursor` (strictly-increasing pubkey) + `finalize_processed` counter
  make the crank **idempotent and reorder-proof across txs without any per-player
  account** (no per-player rent). N=1,000 → ~40 admin txs; N=10,000 → ~400 admin txs.
- `end_season_final` gates `→2` on `finalize_processed == total_participants`, so
  claims can't open on a partial tally.

---

## 4. Test plan (e2e: finalize → game_status=2 → claim)

Reuse the YKK-32 litesvm account-crafting approach (`set_account` to build GameWorld
+ PlayerStates with chosen `vault_bitmap`s).

1. **Unit (`compute_tier_prize`)** with populated tallies:
   - timeout: max-vault champion(s) get 50%/count; a 55-card player gets Tier-2
     prorata; a 5-card player gets Tier-5; sum of intended shares ≤ 100%.
   - normal (winner_60_count>0): 60-holders split 50%/winner_60_count; bands pay.
   - tie at max_vault: two champions each get 25% (50%/2).
2. **e2e (litesvm)** — craft GameWorld(status=1, total_participants=N, pool funded)
   + N PlayerStates (varied vaults). Run `finalize_season_tally` over sorted batches;
   assert cursor/processed advance and double-submitting a batch is rejected.
   `end_season_final` → status=2. Then call `claim_prize_v2` for every player **in
   several different orders** and assert:
   - each player's payout matches their **rank/tier**, identical across orderings
     (proves first-come-take-all is gone),
   - Σ payouts ≤ pool balance, tiers 2-5 pay non-zero, a second claim per player
     is rejected (deposit guard intact).
   - **Reproduce the old A/B/C scenario** (40/35/10 cards) and show A gets Tier-1,
     B Tier-3, C Tier-4 — not "first two take all".
3. **Negative**: `end_season_final` before full tally → rejected;
   `finalize`/`end` by non-admin → `NotAdmin`.

---

## 5. Risk / regression impact

- **Blast radius small**: `compute_tier_prize` is private, only called by
  `claim_prize_v2`; the balance + deposit guards are untouched → **C1/YKK-5 and the
  other C1-C7 fixes are unaffected**.
- **Existing 170 tests**: additive (new instructions; modified private fn that is
  currently unreachable at runtime). Expect all 170 still pass; the existing
  `deposit_amount_is_zeroed_after_claim` unit test stays valid.
- **Account-size change** (GameWorld +41B) is the main risk: a pre-existing
  GameWorld must be migrated (realloc) or re-initialized, else deserialization
  fails. Mitigate with the migrate instruction + a size assertion test. Since the
  season layer never went live, a fresh `init_game_world` is the clean path.
- **Admin-gating is a hard requirement**: `finalize`/`activate`/`end` must be
  `ADMIN_PUBKEY`-gated; `end` must require full tally. Without these the bug reopens
  or becomes griefable (someone ending the season early / with partial tallies).
- **IDL grows** (new instructions) → client/IDL resync; the crank is admin tooling,
  not the player client.
- Ships with the next program deploy — note **YKK-34 deploy is currently blocked**
  (`InvalidAccountData` on upgrade); this fix can't reach devnet until that's resolved.

---

## Open questions for review

1. Fresh `init_game_world` (no migration) acceptable, or must an existing GameWorld
   be preserved (→ migrate instruction required)?
2. Keep a separate `activate_season` (0→1), or let finalize run directly from
   status 0 once the waitlist timestamp has closed?
3. Timeout-champion semantics confirmed: top collector(s) take the full 50% Tier-1
   and are excluded from their natural band — correct?

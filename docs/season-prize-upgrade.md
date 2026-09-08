# Season prize contract update — 2026-09-08

## Observed devnet state

Read-only RPC inspection found:

- Program: `5i37jWBiA7bV9XmokyDWHQxjJ5s1sBnSEkPSB4J2XfmN` (executable).
- Upgrade authority / season admin: `DPMPhnVezSq5im35p4w3bC6XjpNZuuvCDVSAVxw4Q28R`.
- World: `9EZ1KsXTjErwhbxthCLkT9CZuBdEC53yiXdkacgsHSSf`, 185 bytes, status 0, three participants.
- Recorded allocation: 1,275,000,000 lamports.
- Legacy pool: `C8ui4h9tuYiU55VrMohAoFwjsm5RxKPpmQizX9eAAgMa`, observed balance 1,300,000,000 lamports.
- Current prize PDA: `8U8b8dsCB3XsZ3Uxn9r47sKrsidXtjnuuEB8kxbneKeX`, observed balance 0.
- Existing season end: Unix 1779074791 (already elapsed). Migration preserves that deadline.

These observations are not a funding guarantee. Re-run inspection before signing.
Neither required authority wallet is available in the development environment.
No devnet program upgrade, migration, settlement or prize transaction was sent.

## Contract changes

- Pack proceeds increment both revenue counters. At season close, the allocation
  is fixed to the actual prize PDA balance minus rent, including unrecorded prior
  pack proceeds and donations. The balance must cover the previously recorded
  allocation; close cannot silently reduce it. Later donations do not recalculate
  already-fixed entitlements.
- Registered collection mutations require an active season, a started clock,
  a time strictly before the deadline, and no tally progress. This covers packs,
  legendary awards, trade listing creation/purchase and battle loot. Registration
  remains limited to the waitlist. The admin reset cannot reset registered players.
- Tally requires the deadline, canonical registered PlayerStates, ascending unique
  owners and a bounded participant count. Closing and claiming require full tally.
- Claims pay the full entitlement or fail atomically. Underfunding preserves the
  claim. Payout intermediates use u128, preserving the existing rounding order.
- Listings still escrow cards out of the collection, so listed cards do not count
  toward the deadline snapshot. Cancellation freezes during tally. After close,
  claim first, then recover escrow. Zero-entitlement players can recover escrow
  while atomically consuming their zero claim; returning a card cannot create a
  fresh entitlement against the old tally.
- Fresh worlds fund prize-vault rent separately and close registration at game
  start, allowing the intended 14-day active window. Existing timestamps are not
  rewritten by migration. This update does not introduce repeatable new seasons.

## Migration guarantees

`migrate_season_prizes` accepts only the 185-byte canonical, program-owned world
with no prior settlement. It verifies the discriminator and original PDA bump,
preserves the existing participants, counters, timestamps and player accounts,
and appends the settlement fields and canonical prize-pool bump.

An external legacy pool must match the stored address, be a data-empty System
account, and co-sign. Exactly the recorded allocation moves; the remaining legacy
balance is untouched. For the observed state, 1.275 SOL moves and 0.025 SOL remains
in the legacy account. Audit that remainder before deciding whether it represents
additional prize revenue; the migration never guesses. The admin separately pays
the world extension and prize PDA rent. Replaying the migration fails without
moving money. Unknown layouts and already-settled worlds are rejected.

## Build and verify

```sh
cd solana/oxark
npm ci --ignore-scripts
anchor build --program-name oxark --ignore-keys
cp target/idl/oxark.json ../client/oxark-idl.json
cargo test
python3 check-deployed-vk.py target/deploy/oxark.so
```

Anchor 1.0 pins SBF tools v1.52 itself; do not pass `--tools-version` a second time.
`--ignore-keys` only skips the local build-keypair ID check. It grants no deployment
authority, and the program ID remains the source's `declare_id!` value. Never use
a generated local build keypair as the live upgrade authority.

The new LiteSVM settlement suite runs the freshly built SBF. Its admin scenarios
disable cryptographic signature verification **only inside the isolated test
ledger**, because the real admin key is not available. Account signer constraints,
PDA constraints and program execution still run. This is not proof of an actual
wallet signature or a devnet deployment. Existing player-signed integration tests
continue to cover prize claims with signature verification enabled.

## Execute on devnet with the existing authority wallets

1. Follow `devnet-v3-upgrade-runbook.md` size and VK gates, using this revision's
   freshly built binary. Explicitly pass `--url https://api.devnet.solana.com`.
   Extend the existing program allocation only if required, then upgrade with
   the existing upgrade-authority wallet. Verify deployed bytes and the new
   instruction dispatch before moving funds. Do not initialize a replacement world.
2. Inspect from the repository root:

   ```sh
   node scripts/season-prize-operator.mjs
   ```

3. Migrate with both authority wallets kept on the operator's own machine:

   ```sh
   node scripts/season-prize-operator.mjs --execute migrate \
     --admin-keypair /secure/admin.json \
     --legacy-pool-keypair /secure/legacy-pool.json \
     --journal /secure/prize-migration
   ```

4. Reconcile the participant count and any additional legacy prize revenue before
   settlement. For this expired season, the command activates it if still in
   waitlist, tallies canonical participants in sorted batches, and closes it:

   ```sh
   node scripts/season-prize-operator.mjs --execute settle \
     --admin-keypair /secure/admin.json --journal /secure/prize-settlement
   ```

5. A participating player's wallet can execute a devnet claim and verify the
   finalized inner System transfer amount:

   ```sh
   node scripts/season-prize-operator.mjs --execute claim \
     --player-keypair /secure/player.json --journal /secure/prize-player
   ```

Each write simulates first and stores its signed signature and blockhash expiry
before broadcast. If interrupted, verify the journal's signature; do not remove
an uncertain journal or blindly resend. Failed simulation writes no journal and
sends nothing. A finalized transaction receipt is the evidence of payment, not
a consumed deposit alone.

Keep `PRIZE_CLAIMS_ENABLED=false` until the deployed program/account verification
and a real-wallet claim/receipt pass. A CLI payout alone does not cover extension
wallet signing, reconnect and browser receipt recovery; test those before enabling
the public button. Mainnet remains outside this devnet update.

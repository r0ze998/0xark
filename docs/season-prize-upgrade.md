# Season prize contract update — 2026-09-08

## Observed devnet state

Read-only RPC inspection found:

- Program: `5i37jWBiA7bV9XmokyDWHQxjJ5s1sBnSEkPSB4J2XfmN` (executable).
- Upgrade authority / season admin: `DPMPhnVezSq5im35p4w3bC6XjpNZuuvCDVSAVxw4Q28R`.
- World: `9EZ1KsXTjErwhbxthCLkT9CZuBdEC53yiXdkacgsHSSf`, 185 bytes, status 0, registration counter 3; two canonical registered player accounts.
- Recorded allocation: 1,275,000,000 lamports.
- Legacy pool: `C8ui4h9tuYiU55VrMohAoFwjsm5RxKPpmQizX9eAAgMa`, observed balance 1,300,000,000 lamports.
- Current prize PDA: `8U8b8dsCB3XsZ3Uxn9r47sKrsidXtjnuuEB8kxbneKeX`, observed balance 0.
- Existing season end: Unix 1779074791 (already elapsed). Migration preserves that deadline.

These observations are not a funding guarantee. Re-run inspection before signing.
The world history shows three successful registrations, including two by the
same wallet. The repeated registration inflated the counter; no participant
account is removed by reconciling it to the two existing registered owners.
A historical pack purchase also sent 25,000,000 lamports to the old pool without
incrementing the recorded allocation. Its finalized inner System transfer was
verified. The audited transfer is therefore 1,300,000,000 lamports.

Evidence (all devnet):
- First distinct owner registration: `2YysxehT5qgqqxxsDoy1W8XGwCxyMHYiB7giQP6MwyfStdeZLVBbXcmfNLBjMGQLKZkzjQBLFGrLwezZHZnRU6eV`.
- Repeated owner, first registration: `5fEpawqCC9nuRUN4yxBtbdSiQ2L924SoeiKrjiys8pcXGeBQUdiiqp9XxvZe7mJBUDrYfiet98h5fqGgtrbAvAq6`.
- Same owner, second registration: `r2e6PNUNKMrxa4Mu9eK4C8voUEY2nTmAoqBnSsp7sJ2iEYLcgxRHH6SCbut1atsMzdMYJzxkWBH2UBNaEi6njBh`.
- Pack transfer: `2neT8yTevHcGGpV5BALg8zNDB6XhWkfvfGYsYFfyzcNrxDNkaEQ6dWhc1woA5pRvE96y3XxGg6Bg4ZkKaso7e1zv`.

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
preserves the existing timestamps and player accounts,
and appends the settlement fields and canonical prize-pool bump.

The admin supplies the complete, sorted canonical participant list. Every supplied
account must have the correct PDA, program owner, stored player and positive
deposit; duplicates and a count greater than the old counter fail. The migration
corrects the event counter to that unique count and emits the old/new counts.
**Completeness is an operator attestation**, not an on-chain enumeration proof:
legacy state has no participant registry. The operator must compare the entire
RPC account set with the complete registration history before signing. The
observed three events/two owners have been reconciled above.

An external legacy pool must match the stored address, be a data-empty System
account, and co-sign. The transfer is the recorded allocation plus an explicitly
specified, audited historical inflow; other legacy funds stay untouched. The extra
amount defaults to zero, never to the wallet balance. For the observed state,
use `--additional-prize-lamports 25000000`: the verified 1.3 SOL allocation moves.
Omitting that flag preserves the 0.025 SOL instead of silently sweeping it. The admin separately pays
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

When SBF tools cannot be downloaded locally, `anchor idl build --program-name oxark
--out target/idl/oxark.json -- --lib` generates the IDL from the same source without
running integration tests or creating a placeholder binary. The fresh SBF build
and all integration tests must still pass in CI.

The new LiteSVM settlement suite runs the freshly built SBF. Its admin scenarios
disable cryptographic signature verification **only inside the isolated test
ledger**, because the real admin key is not available. Account signer constraints,
PDA constraints and program execution still run. This is not proof of an actual
wallet signature or a devnet deployment. Existing player-signed integration tests
continue to cover prize claims with signature verification enabled.

## Execute on devnet with the existing authority wallets

### Use the tested CI binary

The `CI` workflow uploads `oxark-devnet-<full source SHA>` after the Anchor
integration tests, IDL instruction check and embedded verification-key check pass.
Choose a **successful push run on main** for the intended commit; PR runs contain
GitHub's temporary merge revision and are review artifacts. Check all CI jobs,
not only the artifact-producing job. Artifacts expire after 30 days.

Download and extract the artifact from that run's Artifacts section. It contains
only `oxark.so`, the committed `oxark-idl.json`, `manifest.json` and `SHA256SUMS`.
No wallet files are included. In the extracted directory run:

```sh
sha256sum --check SHA256SUMS
cat manifest.json
```

Match `sourceCommit` to the selected main commit, `ref` to `refs/heads/main`,
`event` to `push`, and `runUrl` to the successful CI run. The manifest records the
binary size for the live allocation check below. Checksums detect file corruption;
they are not a separate signature or proof that a run succeeded. The IDL is the
committed client IDL, not a fresh Anchor-generated CI IDL. Use the extracted
`oxark.so` for deployment and post-deployment byte comparison; rebuilding locally
would produce a different, separately unverified deployment artifact.

### Sign and verify

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
     --additional-prize-lamports 25000000 \
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

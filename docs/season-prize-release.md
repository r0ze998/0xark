# Season prize UI and claim readiness — 2026-09-08

The game now exposes a Prizes destination and a lobby reward link. It displays
recorded season allocation separately from the spendable prize vault balance,
collection progress, the five tier rules, the operator tally, final entitlement,
and a wallet-specific claim receipt. The chain remains the source of truth.

`PRIZE_CLAIMS_ENABLED` is **false**. The public claim adapter and UI both enforce
this release gate. Read-only season results and isolated practice examples are
available. This change does not deploy or modify the Solana program, close a
season, tally participants, or send a real wallet transaction.

## Implemented flow

- World, player and prize vault are read in one confirmed RPC account snapshot;
  program ownership, Anchor discriminators and supported account layouts are checked.
- All amounts use exact lamports. Calculation follows the Rust implementation's
  division order, timeout champions and downward carry-over for empty bands.
- An active season or partial tally never produces a claimable estimate. An
  underfunded vault does not offer a partial claim through this client.
- The sender rechecks eligibility and amount, simulates, captures the wallet,
  and checks mount/wallet ownership again before signing and broadcasting.
- A signed transaction signature and expiration height must be stored before
  broadcast. An ambiguous RPC response preserves the claim for verification.
- Recovery is keyed by network, program, wallet and season start. A pending
  signature disables another submission. Definitive failure or expiration allows
  an explicitly refreshed retry. Screen disposal cancels UI ownership, not an
  already-broadcast transaction.
- A receipt requires a finalized successful claim instruction for this program,
  the recipient's signature, and an inner System transfer from the prize PDA to
  that recipient. The amount comes from that transfer; the fee is shown separately.
  A zero deposit by itself is never described as proof of payment.
- Ended-season participants can reconnect after the deposit was consumed by a
  claim. They are routed to season results rather than asked to register again.
- Practice provides four clearly labeled examples, without a wallet, live pool
  reads, submission or fabricated on-chain receipt links.

## Gates before enabling real claims

1. **Reconcile pool accounting.** `buy_pack.rs` transfers a share to the prize PDA
   but does not increment `GameWorld.total_prize_pool`; payout math uses that field.
   Decide and implement the intended accounting before advertising the entire vault
   balance as distributable. Audit every other prize inflow as part of the same fix.
2. **Freeze the collection used by settlement.** The tally reads vault counts in
   batches; `claim_prize_v2` reads the current count again. Audit/fix every mutation
   path around tally and season close so the numerator cannot drift from the tally.
   The client cannot enforce this invariant against direct program calls.
3. **Verify deployed state and program.** Match the deployed executable and account
   layouts to the reviewed source, finalize the full participant tally using the
   authorized operator, and verify an actual devnet claim end to end. No claim or
   operator transaction was performed for this UI change.
4. **Review partial payment behavior.** The contract caps payout at spendable balance
   and consumes the claim. The client checks coverage before signing, but cannot
   atomically guarantee that coverage remains unchanged until execution. A program
   minimum-payout condition or fully reconciled/funded pool is needed for a stronger
   guarantee.

Only after these gates pass should the config flag change. Mainnet release and
real-value prize funding require their own deployment verification; the current
client is configured for devnet test SOL.

## Verification

Tests cover precision, payout bands, timeout champions, every band-occupancy
combination, account layouts, invalid accounts, incomplete tallies, insufficient
funding, persisted uncertain broadcasts, retries, stale reads, double clicks,
wallet changes, unavailable storage, receipt authenticity, release gating and
ended-season routing. Browser QA checks practice states, navigation and 320px /
375px layouts using an iframe viewport (not a physical phone). Mock RPC and signed
transaction tests are not a real-wallet or deployed-program payout test.

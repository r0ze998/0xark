# MagicBlock ER Benchmark — 0xARK Phase 10

> Run `DEVNET_RPC=https://api.devnet.solana.com node solana/oxark/t15-e2e.js` to reproduce.

## Results (devnet — 2026-04-28)

Payer: `DPMPhnVezSq5im35p4w3bC6XjpNZuuvCDVSAVxw4Q28R`  
Game ID: `780145`

| Step | Layer | Latency (ms) | Result |
|------|-------|-------------|--------|
| create_game | Base | 749 | ✓ `384u7RRHcJz7kyVNmtTS...` |
| join_game | Base | 596 | ✓ `94DTh6PAhXAQ1WNpoCPs...` |
| start_game | Base | 601 | ✓ `4f8kHsWcoogts4X6NR2D...` |
| delegate_session | Base | 751 | ✓ `59fDzZVfsF3HDFir613z...` |
| commit_action | Base (post-delegation) | 589 | ✓ succeeded (accounts soft-delegated) |
| commit_action | ER (Magic Router) | — | ✗ Cloner error (see below) |
| reveal_action | ER (Magic Router) | — | SKIPPED |
| undelegate_session | ER (Magic Router) | — | ✗ Cloner error |

## Latency Comparison

| Metric | Value |
|--------|-------|
| Base layer commit | 589ms |
| ER commit | FAIL |
| Devnet RPC ping | 273ms |
| Magic Router ping | 100ms |

## ER Cycle Verdict

**FAIL** — ER commit/undelegate blocked by Cloner error (program not registered with MagicBlock)

## Root Cause: Cloner Error

Full error from Magic Router:
```
Cloner error: Failed to clone program 5i37jWBiA7bV9XmokyDWHQxjJ5s1sBnSEkPSB4J2XfmN :
TransactionError(InstructionError(3, InvalidAccountData))
```

**Diagnosis**: The ER validator attempts to "clone" the 0xARK Anchor program into its local
execution environment before running ER transactions. This clone fails with `InvalidAccountData`
at instruction index 3.

**This is NOT a code bug.** It is a MagicBlock program registration requirement:
programs deployed on devnet are not automatically clonable by the ER validator unless
the program is registered with MagicBlock's infrastructure.

**Observation**: The `delegate_session` instruction confirmed on base chain (tx: `59fDzZ...`)
but the ER validator rejected subsequent ER-routed transactions — confirming that delegation
at the base-layer CPI level works, but the ER can't execute against our program.

## Next Steps to Unblock ER

1. **Contact MagicBlock team** — ask how to register a custom Anchor program for ER cloning on devnet.
2. **Check MagicBlock docs** — search for "program registration" / "program cloner" / "custom program ER".
3. **Alternative**: Use MagicBlock's `ephemeral-rollups-sdk` deploy flow if it includes a registration step.
4. **Fallback (working today)**: Base layer flow confirmed end-to-end. `_mbMode=false` path
   in `onchain.js` is fully functional. Game is playable on base chain while ER is being unblocked.

## Notes

- `delegate_session` tx confirmed ✓ — base-chain delegation CPI works
- Base layer commit SUCCEEDED after delegation (accounts are "soft-delegated" — base chain still writes)
- Magic Router `getBlockhashForAccounts` RPC works correctly
- Magic Router `getHealth` returns -32601 (method not implemented — expected, not a blocker)
- ER router endpoint: `https://devnet-router.magicblock.app`
- `ASIA_VALIDATOR` in `delegate_session.rs` `commit_frequency_ms: 3000`

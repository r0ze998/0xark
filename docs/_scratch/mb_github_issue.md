# GitHub Issue Draft — MagicBlock

**Title:** Devnet ER unable to clone programs built with Solana 3.1.12 / platform-tools v1.52 (InvalidAccountData)

---

**Body:**

Hi MagicBlock team,

While integrating MagicBlock ER into 0xARK
(ZK pirate card game, Colosseum Frontier 2026 submission),
we discovered the devnet ER cannot clone programs built with
the latest Solana toolchain.

## Environment

**Our build toolchain:**
- solana-cli 3.1.12 / platform-tools v1.52
- anchor 1.0.0
- ephemeral-rollups-sdk 0.6.6 (anchor feature)
- Program ID: `5i37jWBiA7bV9XmokyDWHQxjJ5s1sBnSEkPSB4J2XfmN`

**MagicBlock devnet ER (both endpoints, same infra):**
- `https://devnet-router.magicblock.app`
- `https://devnet.magicblock.app`
- solana-core: 2.2.1
- magicblock-core: 0.8.8
- git-commit: 6d77e7d

## What Works

`delegate_session` succeeds on-chain (base layer):
- game PDA owner → `DELeGGvXpWV2fqJUhqcF5ZSYMS4JTLjteaAMARRSaeSh` ✓
- player_state PDA owner → `DELeGG...` ✓
- Delegation records exist on devnet ✓
- `getBlockhashForAccounts` returns an ER blockhash for the delegated accounts ✓

## What Fails

When we send `commit_action` via the Magic Router (after delegation),
the ER returns:

```
RPC response error -32003: transaction verification error:
Cloner error: Failed to clone program 5i37jWBiA7bV9XmokyDWHQxjJ5s1sBnSEkPSB4J2XfmN :
TransactionError(InstructionError(3, InvalidAccountData))
```

This happens on both `devnet-router.magicblock.app` and `devnet.magicblock.app`.

## Root Cause Hypothesis

The ER's BPFLoader (Solana 2.2.1) cannot load/verify our program binary compiled
with platform-tools v1.52 (Solana 3.1.12 toolchain).
`InstructionError(3, InvalidAccountData)` occurs during the ER's internal
program cloning transaction, at instruction index 3 (likely the Deploy/Upgrade step).

Our program uses `anchor-lang 1.0.0` → `solana-program 2.3.0`, so the
*SDK dependency* is within 2.x range. The issue appears to be the
*compiler toolchain* version mismatch, not the SDK version.

## Question

1. Is there a supported Solana toolchain version for programs targeting the
   current devnet ER (2.2.1 / 0.8.8)?
2. Is an ER update planned that supports Solana 3.x compiled binaries?
3. Is there a way to force the ER to accept/re-clone our program?

Thank you!

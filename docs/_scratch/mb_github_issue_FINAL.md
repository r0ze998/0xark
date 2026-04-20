# GitHub Issue FINAL — MagicBlock ER Program Cloning Failure

**Title:** Devnet ER unable to clone programs built with Solana 3.1.12 / platform-tools v1.52 (InvalidAccountData)

---

Hi MagicBlock team,

While integrating MagicBlock ER into **0xARK**
(ZK pirate card game — Colosseum Frontier 2026 submission),
we discovered the devnet ER cannot clone programs compiled with
the latest Solana toolchain.

## Environment

**Build toolchain:**
- solana-cli 3.1.12 / platform-tools v1.52
- anchor-cli 1.0.0
- ephemeral-rollups-sdk 0.6.6
- Program ID: `5i37jWBiA7bV9XmokyDWHQxjJ5s1sBnSEkPSB4J2XfmN` (devnet)

**MagicBlock devnet ER (both endpoints):**
- `https://devnet-router.magicblock.app`
- `https://devnet.magicblock.app`
- solana-core: 2.2.1 / magicblock-core: 0.8.8 / commit: 6d77e7d

## Proof the Base-Layer Program Works (T24 ZK E2E — 2026-04-20)

Our program runs correctly on the **base layer devnet**. Today we ran a full
ZK dungeon position end-to-end test (create → join → commit → ZK proof → verify),
all passing on-chain:

| Instruction | Tx Signature |
|-------------|-------------|
| `create_game` | `55T6qghxQGHn699pgznyHuumFpHZuXF7D5s6kneJ3BXfz1b7Gwk6xDof5RYn7e4Y7zwFgPzVfbN7NxE2DfLMZnYD` |
| `join_game` | `8xy5hKer8jVGouJ4QJ5PxHRfaqpBUM2reXHC7dGZhiKqYYqB7oMWBjUJxL6EdcABS7jHqjRRPGXM8NxUAiwquR4` |
| `init_position` | `2jqjckCthJVd2MbqaQFp5eqKiVBW7KxUcdLXQCBAbk78gtZRv4HkX6nUaXDEt39vtBdFDU897bkJqic4jxrNTJJH` |
| `verify_dungeon_move` (Groth16 ZK) | `2pkmJpGv1dVGMvgpqqzrbgwtwQ2FTnscKSx4etPWdoVwQA9LmNZSDcFQvJqKDbDgv5rSSN5439JCwnzoiEPQnXg7` |

The `verify_dungeon_move` instruction runs a full Groth16 BN254 pairing check
on-chain (~200k CU) using `solana_bn254` alt-BN128 syscalls. All confirmed on devnet.

## What Works (ER side)

`delegate_session` succeeds on-chain (base layer):
- `game` PDA owner → `DELeGGvXpWV2fqJUhqcF5ZSYMS4JTLjteaAMARRSaeSh` ✓
- `player_state` PDA owner → `DELeGG...` ✓
- `getBlockhashForAccounts` returns an ER blockhash for delegated accounts ✓

## What Fails (ER side)

Sending `commit_action` via Magic Router (post-delegation) fails:

```
RPC error -32003: transaction verification error:
Cloner error: Failed to clone program 5i37jWBiA7bV9XmokyDWHQxjJ5s1sBnSEkPSB4J2XfmN:
TransactionError(InstructionError(3, InvalidAccountData))
```

Occurs identically on both `devnet-router.magicblock.app` and `devnet.magicblock.app`.

## Root Cause Hypothesis

The ER's BPFLoader (running Solana 2.2.1) cannot load/verify our program binary
compiled with platform-tools v1.52 (Solana 3.1.12 toolchain).
`InstructionError(3, InvalidAccountData)` fires at instruction index 3 during
the ER's internal program cloning transaction (likely the LoaderV3 Deploy/Upgrade step).

Our program uses `anchor-lang 1.0.0` → `solana-program 2.3.0` (SDK is within 2.x range).
The issue appears to be the **compiler/binary format** produced by platform-tools v1.52,
not the SDK version.

## Questions

1. Which Solana toolchain version is supported by the current devnet ER (2.2.1 / 0.8.8)?
2. Is an ER update planned for Solana 3.x compiled binaries?
3. Is there a workaround (e.g., recompile with an older toolchain) to make
   our program cloneable by the current ER?

Thank you — happy to provide any additional logs or test transactions.

**r0ze / 0xARK team**

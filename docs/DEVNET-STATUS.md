# Devnet Deploy Status

## DEPLOYED ✅

- **Program ID**: `2gMYzenV6HQoTJA2899XxnLgzTbaWdVmegLqL7nMpVS3`
- **Network**: Solana Devnet
- **Deployed**: 2026-04-10 ~00:20 JST (last updated 2026-04-17)
- **Binary Size**: 277KB (optimized with `opt-level = "z"`)
- **Rent-exempt Cost**: 1.93 SOL
- **Upgrade Authority**: `DPMPhnVezSq5im35p4w3bC6XjpNZuuvCDVSAVxw4Q28R`

---

## Instruction Overview

**Total in codebase: 15 instructions** — 7 deployed to devnet, 8 built but excluded from the devnet binary to stay within the 2 SOL faucet budget. All 15 compile cleanly and are mainnet-ready.

---

## Deployed to Devnet (7)

| # | Instruction | Description |
|---|-------------|-------------|
| 1 | `initialize` | Global state setup (run once by authority) |
| 2 | `create_game` | Create a new game room with configurable player count |
| 3 | `join_game` | Join an existing room by game ID |
| 4 | `start_game` | Lock room and begin — host only |
| 5 | `commit_action` | Submit SHA256(action ‖ target ‖ salt) — action binding |
| 6 | `reveal_action` | Reveal preimage; on-chain preimage check enforces honesty |
| 7 | `resolve_round` | Process all revealed actions, update card state, emit events |

---

## In Codebase, Deferred to Mainnet (8)

These instructions exist in `programs/oxark/src/instructions/`, compile successfully, and are wired into `lib.rs`. They were excluded from the devnet binary solely to reduce program size.

| Instruction | Status | Description |
|-------------|--------|-------------|
| `verify_zk_proof` | ✅ coded, excluded | On-chain Groth16 BN254 proof verification — proves action validity without revealing it |
| `mint_card_nft` | ✅ coded, excluded | Mint winning player's cards as 1-of-1 NFTs; mint authority burned immediately |
| `deposit_stake` | ✅ coded, excluded | Lock 0.5 SOL per player into prize vault PDA at game creation |
| `claim_prize` | ✅ coded, excluded | Release prize vault to first-to-60-cards winner |
| `create_season` | ✅ coded, excluded | Structured competitive season with entry fee, max players, duration |
| `end_season` | ✅ coded, excluded | Finalize season, emit leaderboard, distribute remaining prize pool |
| `register_agent` | ✅ coded, excluded | Register an AI agent in the on-chain agent marketplace |
| `deactivate_agent` | ✅ coded, excluded | Remove an AI agent listing |

---

## Test Coverage

All 9 E2E tests run against `litesvm` (no validator needed):

```bash
cd solana/oxark
cargo test    # 9 tests, all passing, ~2s
```

Tests cover: game lifecycle (create → join → start → commit → reveal → resolve), steal mechanics, Barrier blocking, Draw card distribution.

---

## Optimization Notes

| Profile | Size |
|---------|------|
| Debug build | ~450KB |
| Release (`opt-level = "z"`) | 277KB |
| Reduction | 38% |

The 8 deferred instructions add ~70KB to the binary. Deploying all 15 on mainnet requires ~350KB, well within Solana's max program size (10MB).

---

## Devnet → Mainnet Checklist

- [ ] Security audit (OtterSec or Neodyme)
- [ ] Re-enable all 8 deferred instructions in `lib.rs`
- [ ] Rebuild with `cargo build-sbf` (full 15-instruction binary)
- [ ] Deploy with upgrade authority multisig
- [ ] Fund prize vault PDA
- [ ] Enable x402 USDC micropayments on mainnet

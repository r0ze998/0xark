# T31 — NFT split log

> Completed: 2026-04-20

## oxark-cards Program

| Field | Value |
|-------|-------|
| Program ID | `236FNPRbJr5W7qeV9fJCYsxDEkruSK6fnNAipf47Mq1S` |
| IDL metadata | `7NeSu8SjsF51oWAhb7hNTAFcaJ4pAbgwbFPtqSFo3GD3` |
| ProgramData | `5jRETnh3KJdGCwLJBLMPhJUtpn8ZjzLJWC1vqTnQxdPc` |
| Network | devnet |
| Deploy slot | 456857458 |
| Binary size | 201K |

## E2E Test Results

- Test: `mint_solo_card(card_id=1)`
- Wallet: `DPMPhnVezSq5im35p4w3bC6XjpNZuuvCDVSAVxw4Q28R`
- card_mint PDA: `3iZQAt7D4F2gHNXcjwWJhKxfGVhKhzyELMm1tAwy21ni` (bump=255)
- player ATA: `8mf9fLyx1FZdxqFTTHZWsPidUuMzLvNq1rHYFZjVfob2`
- tx signature: `49BHY593S8yNxnekWd8XceoJq69tYoBmCXegVRXt1yWD8FK6eMu2EUPsNuCVRtHMxGKYiVmbSnKzuqfvw7x8rXXF`
- Result: PASS ✓ (amount=1, mint=expected, owner=wallet)

## What Changed

### Added: programs/oxark-cards/
- Standalone Anchor program with `mint_card_nft` and `mint_solo_card` instructions
- `mint_card_nft`: reads `Game` + `PlayerState` PDAs from main oxark program via `seeds::program`
- `mint_solo_card`: any wallet can mint any card_id (1-60) once
- State types mirrored from oxark (same Anchor discriminators)
- anchor-spl 1.0.0 with `idl-build` feature enabled

### Removed from programs/oxark/
- `instructions/mint_card_nft.rs`
- `instructions/mint_solo_card.rs`
- `mint` feature in Cargo.toml
- `anchor-spl` dependency (no longer needed)
- Both function declarations from `#[program]` module

### Result
- oxark: 14 instructions, no anchor-spl dependency, slimmer binary (441K → should reduce on next deploy)
- oxark-cards: 2 instructions, dedicated NFT mint program, deployed devnet

## TODO — Frontend Integration

- Update `solana/client/onchain.js` to use `oxark-cards` Program ID for mint calls
- Replace `mintCardWithMetadata` to use new IDL
- Wire mint button in React UI to `oxark-cards.mintSoloCard(card_id)`

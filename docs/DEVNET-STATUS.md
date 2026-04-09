# Devnet Deploy Status

## DEPLOYED ✅
- **Program ID**: `2gMYzenV6HQoTJA2899XxnLgzTbaWdVmegLqL7nMpVS3`
- **Deployed**: 2026-04-10 ~00:20 JST
- **Binary Size**: 277KB (optimized with opt-level="z")
- **Cost**: 1.93 SOL rent-exempt
- **Upgrade Authority**: DPMPhnVezSq5im35p4w3bC6XjpNZuuvCDVSAVxw4Q28R

## Active Instructions (7)
1. `initialize` — Global state setup
2. `create_game` — Create a new game room
3. `join_game` — Join an existing game
4. `start_game` — Start the game (host only)
5. `commit_action` — Submit SHA256 hash of action+salt
6. `reveal_action` — Reveal action with salt verification
7. `resolve_round` — Process all actions, update state

## Deferred Instructions (for mainnet)
- `verify_zk_proof` — On-chain Groth16 ZK proof verification
- `mint_card_nft` — Mint collected cards as NFTs
- `deposit_stake` / `claim_prize` — Entry fee + prize pool
- `create_season` / `end_season` — Season management
- `register_agent` / `deactivate_agent` — AI agent registry

## Optimization Notes
- Reduced from 450KB to 277KB (38% reduction)
- `opt-level = "z"` in Cargo profile
- Removed non-essential instructions (re-added post-hackathon)
- Fits within 2 SOL faucet budget

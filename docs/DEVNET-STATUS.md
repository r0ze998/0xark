# Devnet Deploy Status

## Issue
Solana devnet faucet has been rate-limited/down since 2026-04-08 ~14:00 JST.
As of 2026-04-09 ~12:00 JST, still unable to obtain SOL.

## Verified Working
- Local validator deploy: ✅ (Program ID: 3QEaocNMYiAMSqxXhnyBSzpcn3kjnzumrfGS67Gbbwum)
- All 5 tests pass against local validator: ✅
- Anchor build (release + test): ✅

## Workarounds Tried
1. `solana airdrop` — rate limited
2. `devnet-pow mine` — RPC timeout
3. Different RPC endpoints (Helius, Ankr) — auth required
4. Web faucet (faucet.solana.com) — no programmatic API
5. New keypair — still rate limited (global limit)
6. Various amounts (0.1 - 5 SOL) — all fail

## Next Steps
- User can try `! solana airdrop 2 --url devnet` from their terminal (different IP)
- User can use https://faucet.solana.com/ with CAPTCHA
- Deploy address: DPMPhnVezSq5im35p4w3bC6XjpNZuuvCDVSAVxw4Q28R (needs 2+ SOL)

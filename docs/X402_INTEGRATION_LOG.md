# Phase 19 — x402 SOL Integration Log

Wires `window.x402.*` to real SOL transactions on devnet (HTTP 402 spec, split payment).

---

## Endpoints Implemented

| Endpoint | Price (SOL) | Status |
|----------|-------------|--------|
| `/x402/match-battle` | 0.001 | Implemented |
| `/x402/peek-vault-size` | 0.0005 | Implemented |
| `/x402/peek-vault-content` | 0.005 | Implemented |
| `/x402/draw-extra` | 0.01 | Implemented |
| `/x402/ai-strategy-advice` | 0.003 | Implemented |
| `/x402/ai-move` | 0.005 | Pre-existing |
| `/x402/co` (commit) | 0.0001 | Pre-existing |
| `/x402/re` (reveal) | 0.0001 | Pre-existing |
| `/x402/hc` (hand commit) | 0.0001 | Pre-existing |
| `/x402/hr` (hand reveal) | 0.0001 | Pre-existing |
| `/x402/pa` (phase advance) | 0.0001 | Pre-existing |
| `/x402/rs` (round resolve) | 0.0001 | Pre-existing |
| `/x402/me` (match end) | 0.0001 | Updated to `_x402Pay` |

---

## Payment Flow (Phase 19)

```
client → POST /x402/<endpoint> (no payment)
server ← 402 + PAYMENT-REQUIRED header (Base64 JSON)
         {
           version: 'x402-v2',
           accepts: [{
             amount: <lamports>,
             payTo: <ops_treasury>,          // backward compat
             recipient: {
               ops:  { address, lamports },  // 50%
               pool: { address, lamports },  // 50%
             }
           }]
         }
client builds tx:
  - SystemProgram.transfer → ops_treasury (50%)
  - SystemProgram.transfer → prize_pool   (50%)
  - SPL Memo: "endpoint:/x402/match-battle;nonce:<uuid>"
client → Phantom sign + sendRawTransaction
client → POST /x402/<endpoint> + X-Payment: <sig>
server verifies:
  - sig not in usedSigs (replay check)
  - sum(ops_received + pool_received) >= required
  - memo endpoint binding (if X402_REQUIRE_MEMO=true)
server ← 200 OK + response payload
```

---

## Revenue Distribution

**50% ops_treasury / 50% prize_pool** for all endpoints.

Configured via server env vars:
```
OPS_TREASURY_PUBKEY=<ops_wallet>
PRIZE_POOL_PUBKEY=<prize_pool_wallet_or_game_world_pda>
```

When either env var is unset, both default to `TREASURY_PUBKEY` (single address mode).

---

## Backward Compatibility

- Old clients sending to single `payTo` address still work (server sums all known treasury addresses).
- `_payMove` (Phase 12 move endpoints) unchanged — still uses `spec.accepts[0].payTo`.
- `scoutPeek` / `hireAgent` unchanged.

---

## Files Changed

| File | Change |
|------|--------|
| `solana/client/src/02-x402.js` | Added `_x402Pay` helper + 5 new endpoint functions; updated `window.x402` export |
| `multiplayer/server.js` | Added 5 new routes; split-payment verification; updated 402 response with `recipient` |

---

## Environment Variables (Server)

| Var | Default | Description |
|-----|---------|-------------|
| `TREASURY_PUBKEY` | `11111...` (demo mode) | Legacy single treasury |
| `OPS_TREASURY_PUBKEY` | fallback to `TREASURY_PUBKEY` | Ops revenue wallet (50%) |
| `PRIZE_POOL_PUBKEY` | fallback to `TREASURY_PUBKEY` | Prize pool wallet (50%) |
| `X402_REQUIRE_MEMO` | `false` | Enforce memo endpoint binding |
| `SOLANA_RPC` | `https://api.devnet.solana.com` | RPC endpoint |

---

## Devnet Test Procedure

```bash
# 1. Fund devnet wallet
solana airdrop 2 <wallet_pubkey> --url devnet

# 2. Start server with real treasury
cd multiplayer
OPS_TREASURY_PUBKEY=<ops_wallet> \
PRIZE_POOL_PUBKEY=<pool_wallet> \
TREASURY_PUBKEY=<ops_wallet> \
SOLANA_RPC=https://api.devnet.solana.com \
X402_REQUIRE_MEMO=true \
node server.js

# 3. Start client
cd solana/client && npx serve . -l 4200

# 4. Phantom → devnet
# 5. Test each endpoint via UI
```

---

## Devnet Transaction Hashes

_Fill in as each endpoint is verified:_

| Endpoint | TX Hash | Date |
|----------|---------|------|
| `/x402/match-battle` | — | — |
| `/x402/peek-vault-size` | — | — |
| `/x402/peek-vault-content` | — | — |
| `/x402/draw-extra` | — | — |
| `/x402/ai-strategy-advice` | — | — |
| `/x402/me` | — | — |

---

## Replay Prevention

- Server: `usedSigs` Map with 120s TTL — same signature rejected on second use
- Memo: `nonce:<uuid>` per payment — unique per request
- `blockTime` check: transactions older than 60s rejected (legacy poll mode)

---

## Endpoint Binding Verification

When `X402_REQUIRE_MEMO=true`:
- Memo must contain `e:/x402/<endpoint>` matching the request path
- Checked by `validateMemo` in `multiplayer/memo-validator.js`

---

## Remaining for Mainnet (post 2026-05-11)

- Set real `OPS_TREASURY_PUBKEY` and `PRIZE_POOL_PUBKEY` (GameWorld PDA or separate wallet)
- Deploy server to Fly.io with env vars set (`fly secrets set ...`)
- Consider USDC support (x402 can support any SPL token)
- Increase `X402_MAX_AGE_MS` for mainnet confirmation latency

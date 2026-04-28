# x402 Integration Test — Devnet Procedure

Phase 9 unit tests cover logic in isolation. This document covers the manual
devnet flow to verify the full payment path end-to-end before mainnet/deploy.

## Required environment

```sh
# multiplayer server
TREASURY_PUBKEY=<your_devnet_treasury_pubkey>
SOLANA_RPC_URL=https://api.devnet.solana.com
X402_REQUIRE_MEMO=true          # enforce memo binding
SOLANA_NETWORK=devnet

# agent client
AGENT_DIRECT_X402=true
AGENT_PRIVATE_KEY=<base58_agent_keypair>
X402_BROKER_URL=http://localhost:3500  # or fly.io URL after deploy
BROKER_WALLET=<same as TREASURY_PUBKEY>
```

## Wallet funding

Both wallets need devnet SOL before testing.

```sh
solana airdrop 2 <treasury_pubkey> --url devnet
solana airdrop 2 <player_pubkey>   --url devnet
solana airdrop 2 <agent_pubkey>    --url devnet
```

## Test cases

### 1. Browser client — scout-peek happy path

1. Load the game client (npx serve . -l 4200)
2. Connect Phantom wallet (devnet)
3. Open browser console, run:
   ```js
   await window.x402.scoutPeek(1, '<target_pubkey>', window.solana, conn)
   ```
4. Approve transaction in Phantom (should include 2 instructions: transfer + memo)
5. Expected server response: `{ ok: true, ... }`

Expected server log:
```
[x402] Verified: 0.005 SOL
```

### 2. Agent client — x402ScoutPeek happy path

```sh
cd tools/ai-agent
AGENT_DIRECT_X402=true node -e "
import('./src/x402-client.js').then(m =>
  m.x402ScoutPeek({ playerId: '<target_pubkey>' })
    .then(r => console.log('OK', r))
    .catch(e => console.error('FAIL', e.message))
)"
```

Expected: returned data with `sig` field.

### 3. Replay prevention

Repeat the same signature:

```sh
curl -X POST http://localhost:3500/x402/scout-peek \
  -H 'Content-Type: application/json' \
  -d '{"playerPubkey":"<pubkey>","signature":"<used_sig>"}'
```

Expected: `{ ok: false, error: "signature already used" }`

### 4. Missing playerPubkey → 400

```sh
curl -X POST http://localhost:3500/x402/scout-peek \
  -H 'Content-Type: application/json' \
  -H 'X-Payment: somesig' \
  -d '{}'
```

Expected: HTTP 400 `{ ok: false, error: "playerPubkey required" }`

### 5. Missing signature → 400

```sh
curl -X POST http://localhost:3500/x402/scout-peek \
  -H 'Content-Type: application/json' \
  -d '{"playerPubkey":"<pubkey>"}'
```

Expected: HTTP 400 `{ ok: false, error: "signature required" }`

### 6. Probe (both absent) → 402

```sh
curl -X POST http://localhost:3500/x402/scout-peek \
  -H 'Content-Type: application/json' \
  -d '{}'
```

Expected: HTTP 402 with `PAYMENT-REQUIRED` header containing x402-v2 JSON.

### 7. Memo mismatch (X402_REQUIRE_MEMO=true)

Submit a payment transaction without a memo instruction and retry:

Expected: `{ ok: false, error: "memo required" }`

### 8. Rate limiting

Send > 20 requests from the same IP within 60s:

Expected: HTTP 429 with `Retry-After` header.

## Notes

- Endpoint path used in memo must match `req.url` on the server.
  Browser client currently calls `/scout-peek` (no `/x402` prefix).
  If the multiplayer server handles that path directly, memo endpoint = `/scout-peek`.
  If a separate broker handles it, adjust accordingly.
- `local-dev-bypass` mode (X-Payment header) bypasses all verification — only for dev.

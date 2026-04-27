# 0xARK — Sample x402 Information Market Cycle

**Generated**: 2026-04-27  
**Server**: `legacy/phase-c/x402/agent-broker.js` (Express, port 3402)  
**Broker wallet**: `DPMPhnVezSq5im35p4w3bC6XjpNZuuvCDVSAVxw4Q28R`

---

## Server Startup

```bash
cd legacy/phase-c/x402
BROKER_WALLET=DPMPhnVezSq5im35p4w3bC6XjpNZuuvCDVSAVxw4Q28R \
SOLANA_RPC_URL=https://api.devnet.solana.com \
node agent-broker.js

# → 0xARK Information Broker listening on port 3402
```

---

## Live Endpoint Responses (2026-04-27)

### GET /health

```bash
curl http://localhost:3402/health
```

```json
{
  "status": "ok",
  "agent": "0xARK Information Broker v1.0",
  "hasLiveState": false,
  "rivalFloors": { "VEGA": "Town", "MIRA": "Town" }
}
```

---

### GET /status (endpoint listing)

```bash
curl http://localhost:3402/status
```

```json
{
  "agent": "0xARK Information Broker v1.0",
  "network": "solana-devnet",
  "recipient": "DPMPhnVezSq5im35p4w3bC6XjpNZuuvCDVSAVxw4Q28R",
  "endpoints": [
    { "path": "POST /scout-peek",       "price": "0.005 SOL", "desc": "Peek one on-chain card from target player" },
    { "path": "POST /agent-hire",       "price": "0.05 SOL",  "desc": "Hire AI agent for auto-play session" },
    { "path": "POST /card-buy",         "price": "0.01 SOL fee", "desc": "x402 P2P card marketplace purchase" },
    { "path": "/intel/location/:id",    "price": "$0.002 USDC", "desc": "Rival floor position" },
    { "path": "/intel/hand/:id",        "price": "$0.003 USDC", "desc": "Rival card holdings" },
    { "path": "/intel/strategy",        "price": "$0.005 USDC", "desc": "Strategic analysis" },
    { "path": "/intel/market",          "price": "free", "desc": "Card pool status (60 cards)" }
  ],
  "stateAge": "using defaults",
  "timestamp": 1777280511069
}
```

---

### GET /intel/market (free endpoint)

```bash
curl http://localhost:3402/intel/market
```

```json
{
  "round": 0,
  "totalCards": 60,
  "availableCards": 60,
  "byFloor": [
    { "floor": "B1", "available": 12, "total": 12 },
    { "floor": "B2", "available": 12, "total": 12 },
    { "floor": "B3", "available": 12, "total": 12 },
    { "floor": "B4", "available": 12, "total": 12 },
    { "floor": "B5", "available": 12, "total": 12 }
  ]
}
```

All 60 cards available at devnet state. Floors B1-B5 correspond to dungeon depth.

---

### GET /intel/location/:playerId (priced — $0.002 USDC)

```bash
curl http://localhost:3402/intel/location/player1
```

**402 Payment Required response:**

```json
{
  "error": "Payment Required",
  "x402": {
    "version": 1,
    "scheme": "exact",
    "network": "solana-devnet",
    "amount": 0.002,
    "currency": "USDC",
    "recipient": "DPMPhnVezSq5im35p4w3bC6XjpNZuuvCDVSAVxw4Q28R",
    "description": "Rival floor position"
  }
}
```

HTTP 402. Client must provide `X-Payment: <solana-tx-sig>` header with a confirmed USDC transfer of exactly 0.002 USDC to the broker wallet.

---

### POST /scout-peek (priced — 0.005 SOL)

```bash
curl -X POST http://localhost:3402/scout-peek \
  -H "Content-Type: application/json" \
  -d '{"targetPlayer":"ExamplePlayer123","requestingPlayer":"AgentAlpha"}'
```

**402 Payment Required response:**

```json
{
  "error": "Payment Required",
  "x402": {
    "version": 1,
    "scheme": "exact",
    "network": "solana-devnet",
    "amount": 5000000,
    "currency": "SOL",
    "recipient": "DPMPhnVezSq5im35p4w3bC6XjpNZuuvCDVSAVxw4Q28R",
    "description": "Scout peek - reveal one card from target player"
  }
}
```

Payment in lamports (5,000,000 = 0.005 SOL). On successful payment with `X-Payment: <sig>`:

```json
{
  "success": true,
  "intel": {
    "type": "scout_peek",
    "targetPlayer": "ExamplePlayer123",
    "revealedCard": { "cardId": 45, "name": "THUNDER", "bp": 7 },
    "paidAt": "2026-04-27T09:00:00.000Z",
    "txSig": "<confirmed-solana-tx-sig>"
  }
}
```

---

## Payment Flow (Claude Agent)

When the AI agent decides Scout Peek is economically justified:

```
1. Agent evaluates: peek_value > 0.005 SOL cost?
   → peek_value = estimated BP advantage × expected duels remaining × 0.001 SOL/BP

2. If yes: Agent calls broker.scoutPeek(targetPlayer, agentWallet)
   → Broker constructs SOL transfer instruction (5_000_000 lamports)
   → Agent signs and submits via Solana RPC
   → Sub-400ms confirmation on devnet

3. Broker verifies tx: recipient == BROKER_WALLET, amount == 5_000_000
   → Checks LRU signature cache for replay

4. If verified: returns intel (one revealed card)
   → Agent incorporates into decision model for next round
```

**Phase 1 (current)**: Agent decision + server-side wallet execution  
**Phase 2 (Season 2)**: Agent holds own keypair, signs transaction directly

---

## Replay Protection

The broker maintains an LRU-capped signature cache:

```javascript
const SIG_CACHE_MAX = 10_000;  // rolling window
const sigCache = new LRUCache(SIG_CACHE_MAX);
// On each request: if sigCache.has(txSig) → reject 409 Conflict
```

---

*Generated 2026-04-27 · Tag: v-phd-devnet-assets*

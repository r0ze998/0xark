# 0xARK x402 AI Agent Economy

## Information Broker Agent

An autonomous AI agent that sells game intelligence via x402 micropayments (USDC on Solana).

### Endpoints

| Endpoint | Price | Returns |
|----------|-------|---------|
| `GET /intel/location/:id` | $0.002 | Player's current area |
| `GET /intel/hand/:id` | $0.003 | Player's card holdings |
| `GET /intel/strategy` | $0.005 | Optimal next action advice |
| `GET /intel/market` | $0.001 | Card pool remaining counts |

### How x402 Works

1. Client makes HTTP request
2. Server responds with `402 Payment Required` + payment details
3. Client's wallet signs a USDC transfer
4. Client retries with `X-Payment` header containing the signed transaction
5. Server verifies payment and returns intelligence

### AI Agent Integration

AI agents can autonomously:
- Query the broker for rival intel before choosing an action
- Budget their USDC based on game phase (spend more when close to winning)
- Sell their own scouting results back to the market

### Setup

```bash
npm install express
node agent-broker.js
```

### Tech

- **Protocol**: x402 (HTTP 402 Payment Required)
- **Payment**: USDC on Solana ($0.00025 tx fee)
- **Facilitator**: CDP (Coinbase) or PayAI
- **SDK**: `@x402/express` for production

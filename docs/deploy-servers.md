# Server Deployment Guide (Railway — 10 min)

Two servers need to be publicly deployed for the live demo to work:
1. **WebSocket multiplayer server** (`multiplayer/server.js`) — port 3500
2. **x402 AI broker** (`x402/agent-broker.js`) — port 3402

Without these running publicly, the live demo shows multiplayer as offline and x402 intel shop as offline.

---

## Option A: Railway (Recommended — free tier, 1-click)

Railway gives you a public HTTPS/WSS URL with zero config.

### Step 1: Create Railway project

1. Go to [railway.app](https://railway.app) → New Project → Deploy from GitHub
2. Select the `r0ze998/0xark` repo

### Step 2: Deploy WebSocket server

In the Railway project, create a **Service** pointing to `multiplayer/`:

```
Start command: node server.js
Root directory: multiplayer
Port: 3500
```

Environment variables (none required — uses devnet by default):
```
PORT=3500
SOLANA_RPC_URL=https://api.devnet.solana.com
```

Railway auto-generates a URL like `wss://0xark-multiplayer-production.up.railway.app`

### Step 3: Deploy x402 broker

Add another Service for `x402/`:

```
Start command: node agent-broker.js
Root directory: x402
Port: 3402
```

Environment variables:
```
PORT=3402
```

Railway auto-generates a URL like `https://0xark-broker-production.up.railway.app`

### Step 4: Update game client URLs

After both services are deployed, update `solana/client/src/01-net.js`:

```js
const _MP_DEFAULT_URL = localStorage.getItem('oxark_ws_url') || 'wss://YOUR-WS-URL.railway.app';
```

And `solana/client/src/04-state.js`:

```js
const X402_DEFAULT_URL = 'https://YOUR-BROKER-URL.railway.app';
```

Then rebuild:
```bash
node solana/client/build.js
```

Commit + push → GitHub Pages auto-deploys.

### Step 5: Override URLs without rebuild (for demo)

You can also override URLs via URL params without rebuilding:
```
https://r0ze998.github.io/0xark/?ws=wss://your-ws.railway.app&x402=https://your-broker.railway.app
```

This persists in localStorage, so subsequent visits use the deployed URLs.

---

## Option B: Render (Free tier, similar to Railway)

1. [render.com](https://render.com) → New Web Service → Connect GitHub
2. Create two services (multiplayer + x402) with the same start commands
3. Same URL update procedure as Railway

---

## Option C: Local + ngrok (Testing only)

```bash
# Start both servers
node multiplayer/server.js &
node x402/agent-broker.js &

# Expose via ngrok (requires ngrok account)
ngrok http 3500  # → wss://xxxxx.ngrok.io
ngrok http 3402  # → https://yyyyy.ngrok.io

# Use URL params to point the live demo at your local servers
https://r0ze998.github.io/0xark/?ws=wss://xxxxx.ngrok.io&x402=https://yyyyy.ngrok.io
```

---

## Post-Deployment Checklist

- [ ] WebSocket server responds to HTTP GET at `/` (health check)
- [ ] x402 broker responds at `/intel/market` (no auth required)
- [ ] Live demo shows "CONNECTED" in multiplayer lobby
- [ ] x402 shop shows prices (not OFFLINE)
- [ ] Rebuild + push after updating hardcoded URLs in source

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| WebSocket closes immediately | Check Railway logs; ensure `PORT` env var is set |
| x402 returns 500 | broker needs `BROKER_WALLET` env var set (or disable wallet check) |
| CORS errors in browser | x402 broker already has permissive CORS (`*`) |
| WSS vs WS | Railway/Render provide `wss://` (TLS required for HTTPS pages) |

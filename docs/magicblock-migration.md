# MagicBlock Ephemeral Rollup Migration Guide

## Why MagicBlock ER?

The current 0xARK architecture uses a WebSocket pure-relay server for real-time game state sync. While the Solana program is the authoritative source of truth, each battle action requires:

1. Player signs TX in Phantom (wallet popup)
2. TX sent to devnet RPC
3. RPC confirms (~400ms–2s)
4. Server broadcasts confirmation to all players
5. Clients re-read on-chain state

This means **every battle action = 1 wallet popup + 1–2 second confirmation delay**. At 5–10 actions per battle round, players click through 5–10 popups per round. This is the #1 UX barrier to mass adoption.

MagicBlock Ephemeral Rollups (ER) solve both problems: sub-second finality and session-key-based batch signing.

---

## Current Architecture

```
Player Wallet (Phantom)
    │ sign TX
    ▼
Multiplayer WebSocket Server (relay only)
    │ sendRawTransaction()
    ▼
Solana Devnet RPC
    │ confirm (~800ms avg)
    ▼
On-chain program state
    │ broadcast via WebSocket
    ▼
All clients refresh
```

**Bottlenecks:**
- Phantom popup per action (UX friction)
- ~800ms RPC confirmation latency per action
- WebSocket server is a trust-bearing relay (single point of failure, though stateless)

---

## Target Architecture (MagicBlock ER)

```
Player Wallet (Phantom)
    │ one-time session key authorization
    ▼
Session Key (ephemeral keypair, client-side)
    │ sign micro-TXs without popups
    ▼
MagicBlock ER Node
    │ sub-100ms finality (optimistic execution)
    ▼
Solana L1 (settlement every ~1s)
    │ periodic state commitment
    ▼
On-chain program state (same PDAs, same program ID)
```

**Gains:**
- No per-action wallet popups (session key signs locally)
- ~50–100ms action confirmation (ER optimistic execution)
- WebSocket server can be removed or reduced to chat-only relay
- Same Anchor program — ER is an execution environment, not a contract change

---

## Migration Steps

### Step 1: Add MagicBlock ER as a dependency

```bash
# In solana/client/react/
npm install @magicblock-labs/ephemeral-rollups-sdk

# Or CDN for the vanilla JS client
# <script src="https://cdn.jsdelivr.net/npm/@magicblock-labs/ephemeral-rollups-sdk@latest/dist/index.umd.js"></script>
```

### Step 2: Session Key Setup

Session keys are ephemeral keypairs that the player delegates signing authority to for the duration of a game session. The player signs once to authorize the session key; all subsequent actions are signed automatically.

```javascript
// FILE: solana/client/onchain.js (future)
// Currently: every TX requires Phantom popup
// Future: session key signs automatically

// ─── SESSION KEY STUB ─────────────────────────────────────────────────────
// NOT YET IMPLEMENTED — see docs/magicblock-migration.md
//
// Pattern:
//   1. Generate ephemeral keypair (sessionKeypair)
//   2. Ask Phantom to sign a delegation message authorizing sessionKeypair
//      to sign instructions from PROGRAM_ID on behalf of the player
//   3. Store sessionKeypair in memory (never in localStorage)
//   4. All battle actions are signed by sessionKeypair — no popup needed
//   5. Session key expires when player closes the tab or explicitly revokes

/*
import { SessionKeyManager } from '@magicblock-labs/ephemeral-rollups-sdk';

let _sessionKey = null;

async function initSessionKey() {
  if (_sessionKey) return _sessionKey;
  const manager = new SessionKeyManager({
    programId: getProgramId(),
    wallet: window.solana,
    connection: getConnection(),
  });
  _sessionKey = await manager.createSession({ expiryInSeconds: 3600 });
  return _sessionKey;
}

// Replace buildAndSend() calls with session-key-aware variant:
async function buildAndSendWithSessionKey(keys, data, computeUnits) {
  const sk = await initSessionKey();
  // sk.keypair.sign() instead of window.solana.signTransaction()
  // No Phantom popup required
}
*/
```

### Step 3: Point the connection at the ER RPC

MagicBlock provides an ER endpoint alongside the standard Solana RPC. The program ID does not change.

```javascript
// Current (devnet)
const DEVNET_RPC = 'https://api.devnet.solana.com';

// Future (MagicBlock ER + devnet)
const ER_RPC    = 'https://devnet.magicblock.app'; // ER execution
const BASE_RPC  = 'https://api.devnet.solana.com'; // L1 state reads

// Use ER_RPC for battle action TXs (commit, reveal, resolve)
// Use BASE_RPC for lobby TXs (create_game, join_game, deposit_stake, claim_prize)
```

### Step 4: Lock account delegation

Before battle starts, the game PDAs must be delegated to the ER:

```javascript
// Pseudo-code — actual SDK API TBD at integration time
async function delegateGameToER(gameId) {
  const [gamePDA]     = findGamePDA(gameId);
  const [cardPoolPDA] = findCardPoolPDA(gameId);
  // Lock accounts on L1; ER gains write authority during session
  await erSdk.delegateAccounts([gamePDA, cardPoolPDA], { sessionDuration: 3600 });
}

async function undelegateGameFromER(gameId) {
  // Flush final state back to L1 (settlement)
  await erSdk.undelegateAccounts([gamePDA, cardPoolPDA]);
}
```

### Step 5: Remove WebSocket relay for game actions

Once ER is handling state sync, the WebSocket server is no longer needed for TX relay. Keep it for:
- Room presence (join/leave events)
- Chat messages
- Proximity broadcast (ZK fog-of-war positions)

Remove from server.js:
- `case 'submit_tx'` handler
- `connection.sendRawTransaction()` logic
- All `@solana/web3.js` imports

---

## Files to Modify

| File | Change |
|------|--------|
| `solana/client/onchain.js` | Add `initSessionKey()`, replace `buildAndSend()` for battle actions |
| `multiplayer/server.js` | Remove `submit_tx` handler, remove Solana imports |
| `solana/client/src/01-net.js` | Update WebSocket message handling; remove TX relay client code |
| `solana/client/src/07-battle.js` | Replace `window.oxarkOnchain.*` calls with session-key-aware variants |
| `package.json` (react) | Add `@magicblock-labs/ephemeral-rollups-sdk` |

---

## Estimated Impact

| Metric | Before | After |
|--------|--------|-------|
| Battle action latency | ~800ms | ~50–100ms |
| Wallet popups per battle | 5–10 per round | 1 (session auth) |
| WebSocket server complexity | High (TX relay, RPC bridge) | Low (presence + chat only) |
| User friction | High (Phantom popup fatigue) | Low (one-time auth) |

---

## Timeline

**Q2 2026** — MagicBlock ER integration is the highest-priority architectural upgrade for post-hackathon development. The Anchor program does not need to change; only the client execution layer is affected.

**Resources:**
- MagicBlock ER docs: https://docs.magicblock.gg
- Ephemeral Rollups SDK: `@magicblock-labs/ephemeral-rollups-sdk`
- Session Keys reference: https://docs.magicblock.gg/session-keys

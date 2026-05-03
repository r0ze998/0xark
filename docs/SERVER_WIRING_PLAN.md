# Phase 17 — Server Wiring Plan

Wires the Phase 15/16 UI to the real multiplayer server for actual 2-player battles.

---

## Architecture

```
Browser A (host)              Multiplayer Server (WS)         Browser B (guest)
─────────────────────         ───────────────────────         ─────────────────────
startMatchmaking()
  duelWs.connect()
  duelWs.enqueueMatchmaking()──→ matchmaking_enqueue
                               ← matchmaking_waiting          (same flow)
                               ← matchmaking_matched (host) ─→ matchmaking_matched (guest)
  setState { isHost:true }                                     setState { isHost:false }
  nav:preparation                                              nav:preparation

onConfirm()
  computeHandCommitment()
  duelWs.sendHandCommitted() ──→ duel_hand_committed
                               (relayed to opponent)          ← duel_hand_committed
  nav:interruption                                             nav:interruption

onReady()
  duelWs.sendHandRevealed()  ──→ duel_hand_revealed
                               (relayed to opponent)          ← duel_hand_revealed
  nav:reveal                                                  nav:reveal

reveal: compute BP totals
  sendBattleResolved()       ──→ duel_battle_resolved         sendDamageClaim()
                               consensus check
                               ← duel_battle_resolved ────────────────────────────→
  nav:loot (on receipt)                                       nav:loot (on receipt)

onContinue() [host only]
  sendDuelEnded()            ──→ duel_ended
                               (relayed to opponent)
  x402.payMatchEnd()
  resetBattle(); disconnect()                                 resetBattle(); disconnect()
```

---

## Files Changed

| File | Change |
|------|--------|
| `solana/client/src/lib/duel-ws.js` | **NEW** — WebSocket client, ZK helpers |
| `solana/client/src/state/battle-state.js` | Added `isHost`, `duelId`, `opponentPlayerId`, `pendingBurnEffects[]`, `earnedImprints[]` |
| `solana/client/src/components/main-screen.js` | Real WS matchmaking in `startMatchmaking()`, demo fallback |
| `solana/client/src/components/preparation.js` | `duelWs.computeHandCommitment()` + `sendHandCommitted()` |
| `solana/client/src/components/interruption.js` | `sendHandRevealed()` in `onReady()` + `onTimeout()` |
| `solana/client/src/components/reveal.js` | Host: `sendBattleResolved()`; Non-host: `sendDamageClaim()`; both nav on `duel_battle_resolved` |
| `solana/client/src/components/loot.js` | Host: `sendDuelEnded()`; `x402.payMatchEnd()` |
| `multiplayer/handlers/matchmaking.js` | **NEW** — in-memory queue, `matchmaking_enqueue`/`cancel` |
| `multiplayer/handlers/sync.js` | Added `action_types` in hand_revealed relay; `winner` in battle_resolved relay |
| `multiplayer/handlers/index.js` | Added matchmaking handlers to dispatch table |

---

## Protocol Messages

### Matchmaking
```
C→S  matchmaking_enqueue   { wallet, name, card_count }
S→C  matchmaking_waiting   { roomId }
S→C  matchmaking_matched   { roomId, role: 'host'|'guest', opponentWallet, opponentId }
C→S  matchmaking_cancel
S→C  matchmaking_cancelled
```

### Duel
```
C→S  duel_hand_committed   { duel_id, round, commitment_hex }
S→C  duel_hand_committed   { playerId, duel_id, round, commitment_hex }  (relayed)

C→S  duel_hand_revealed    { duel_id, round, card_ids[], action_types[] }
S→C  duel_hand_revealed    { playerId, duel_id, round, card_ids[], action_types[] }  (relayed)

C→S  duel_battle_resolved  { duel_id, round, p1_hp_delta, p2_hp_delta, winner }  (host only)
C→S  duel_damage_claim     { duel_id, round, p1_hp_delta, p2_hp_delta }           (non-host)
S→C  duel_battle_resolved  (broadcast after consensus)
S→C  duel_violation        (broadcast if mismatch)

C→S  duel_ended            { duel_id, winner }  (host only)
S→C  duel_ended            (broadcast)
```

---

## ZK Commitment

Commitment = SHA-256( card_id_0 || card_id_1 || ... || card_id_4 || salt_32bytes )

- `duelWs.generateSalt()` — 32 random bytes (Poseidon-field clamped)
- `duelWs.computeHandCommitment(cardIds, salt)` — SubtleCrypto SHA-256
- `duelWs.toHex(bytes)` — hex string sent over wire

---

## Phase-11 Consensus

Both clients compute BP totals (`p1BpTotal`, `p2BpTotal`) from fully revealed card data.
BP totals are deterministic from card stats regardless of random seed.

- Host sends `duel_battle_resolved { p1_hp_delta, p2_hp_delta, winner }`
- Non-host sends `duel_damage_claim { p1_hp_delta, p2_hp_delta }`
- Server cross-checks; match → broadcasts `duel_battle_resolved`; mismatch → broadcasts `duel_violation`

---

## x402 Endpoints

| Hook | Endpoint | Caller |
|------|----------|--------|
| Match end | `payMatchEnd` via `window.x402` | Both (loot screen) |
| Scout peek | `scoutPeek` via `window.x402` | Either (interruption screen) |

---

## Demo / Offline Fallback

`startMatchmaking()` catches WS connect failure → mock `demo-{ts}` match after 2.5s, `isHost: true`.
All downstream screens tolerate `duelId === null` and `!duelWs.isConnected()` gracefully.

---

## 2-Player Localhost Test

```bash
# Terminal 1 — start multiplayer server
cd multiplayer && node server.js

# Terminal 2 — serve client
cd solana/client && npx serve . -l 4200

# Browser Tab A — http://localhost:4200  →  Start Battle  (becomes host)
# Browser Tab B — http://localhost:4200  →  Start Battle  (joins as guest)
# Both should match, play through Preparation → Interruption → Reveal → Loot
```

---

## Remaining for Devnet (post 2026-05-11)

- Replace demo fallback with real Anchor `burn_card` / `evolve_cards` / `grant_imprint` calls
- Wire `window.x402` payments with real USDC treasury on devnet
- Deploy multiplayer server to Fly.io (`fly deploy` in `multiplayer/`)
- Replace `ws://localhost:3500` with `wss://oxark-multiplayer.fly.dev`

# 0xARK x402 Integration Design

> **Version:** 2.0 — Implementation Reference (2026-04-20, v486)  
> **Status:** Scout peek LIVE · Agent hire IN PROGRESS · Card P2P IN PROGRESS  
> **Audience:** Hackathon judges, protocol engineers, security reviewers

---

## 設計思想

x402 を 0xARK 内の「マイクロ経済の血液」として設計する。  
ゲーム内のあらゆる小規模取引 (scout, hint, card trade, agent hire, spectator bet など) を x402 の pay-per-call HTTP micropayment で実現。

**Core tension:** "ZK で情報を守り、x402 で情報を買う" の二項対立が  
0xARK のマイクロ経済を成立させる。プレイヤーは常に：

- 自分の情報を隠しながら (ZK — Groth16 hidden positions)
- 相手の情報を買うかどうか迷う (x402 Scout peek — 0.005 SOL)

この情報非対称性の駆け引きが、単なるカードゲームを「情報経済ゲーム」に昇華させる。

---

## 1. Implementation Status

### Live (Implemented & Tested)

| Endpoint | Price | Status |
|----------|-------|--------|
| `POST /scout-peek` | 0.005 SOL | ✅ LIVE — E2E verified (t25-scout-e2e.js) |
| `GET /intel/location/:id` | $0.002 USDC | ✅ LIVE — payment-gated, devnet |
| `GET /intel/hand/:id` | $0.003 USDC | ✅ LIVE — payment-gated, devnet |
| `GET /intel/strategy` | $0.005 USDC | ✅ LIVE — strategy engine v1 |
| `GET /intel/market` | free | ✅ LIVE — card pool status |
| `POST /update-state` | free | ✅ LIVE — game state sync |

Test coverage: `x402/t25-scout-e2e.js` — 14/14 assertions pass against live devnet.

### In Progress (This Hackathon)

| Endpoint | Price | Status |
|----------|-------|--------|
| `POST /agent-hire` | 0.05 SOL/session | 🔄 T43 — facilitator + on-chain PDA |
| `POST /card-buy` | variable | 🔄 T42 — CardListing PDA + transfer |

### Designed Only (Post-Hackathon)

| Endpoint | Price | Notes |
|----------|-------|-------|
| `POST /hint-buy` | 0.002 SOL | Preview rival's next action type |
| `POST /booster-pack` | 0.01 SOL | Draw 3 random cards |
| `POST /revive` | 0.03 SOL | 1 post-defeat revival |
| `POST /spectator-bet` | 0.01+ SOL | Third-party match betting |
| `GET /intel/strategy` v2 | 0.001 SOL/query | LLM-backed, per-query billing |
| `POST /agent-intel-share` | 0.005 SOL | Agent-to-agent intel marketplace |

---

## 2. Scout Peek Deep Dive

### 2.1 Sequence Diagram

```
Client (browser)                  Facilitator (agent-broker.js)          Solana Devnet
     │                                       │                                  │
     │── POST /scout-peek ──────────────────▶│                                  │
     │   (no X-Payment header)               │                                  │
     │                                       │                                  │
     │◀── 402 Payment Required ──────────────│                                  │
     │    X-Payment-Required: {              │                                  │
     │      version: 1,                      │                                  │
     │      scheme: "exact",                 │                                  │
     │      network: "solana-devnet",        │                                  │
     │      amount: 5000000,  // lamports    │                                  │
     │      currency: "SOL",                 │                                  │
     │      recipient: "DPMPh...Q28R"        │                                  │
     │    }                                  │                                  │
     │                                       │                                  │
     │── sendSOL(5_000_000 lamports) ───────────────────────────────────────────▶│
     │   recipient = DPMPh...Q28R            │                                  │
     │                                       │                              confirms tx
     │◀── { signature: "3kJQ..." } ──────────────────────────────────────────────│
     │                                       │                                  │
     │── POST /scout-peek ──────────────────▶│                                  │
     │   X-Payment: "3kJQ..."                │                                  │
     │   { game_id: 42,                      │                                  │
     │     target_pubkey: "Vega..." }        │                                  │
     │                                       │── getParsedTransaction("3kJQ") ──▶│
     │                                       │◀── tx (postBalance diff +5M lam) ─│
     │                                       │                                  │
     │                                       │ verify: received >= 5_000_000 ✅  │
     │                                       │ trackSignature("3kJQ") // replay  │
     │                                       │                                  │
     │                                       │── getAccountInfo(PlayerState PDA) ▶│
     │                                       │◀── {cards: [7,0,0,0,0], area: 2} ─│
     │                                       │                                  │
     │◀── 200 { revealed: {id:7, name:       │                                  │
     │         "Inferno"}, totalCards: 1,    │                                  │
     │         area: 2, pda: "...", ts }     │                                  │
```

### 2.2 Payment Verification Logic

The facilitator verifies payment by checking native SOL balance change on the recipient account (`verifySolPayment` in `x402/agent-broker.js`):

```javascript
const keys = tx.transaction.message.accountKeys;
for (let i = 0; i < keys.length; i++) {
  if (keys[i].pubkey.equals(recipientPk)) {
    const pre  = tx.meta.preBalances[i]  ?? 0;
    const post = tx.meta.postBalances[i] ?? 0;
    const received = post - pre;
    if (received >= minLamports) {
      trackSignature(signature);  // replay protection
      return { ok: true, lamports: received };
    }
  }
}
```

This is a **balance diff check**, not a decoded instruction parse. It is robust to wrapping transactions and SPL-token-account-creation overhead because it checks the raw lamport delta on the recipient key.

### 2.3 Card Reveal Determinism

`/scout-peek` reveals `cards[0]` — the first non-zero card in the on-chain `PlayerState` account. This is:

- **Deterministic** — same result for any caller paying for the same game state snapshot
- **Unforgeable** — card data is read directly from the Anchor PDA, not from facilitator-held state
- **One-per-payment** — `trackSignature` prevents the same tx from being reused for multiple peeks

The card ID `c` satisfies `1 ≤ c ≤ 60` and maps to `CARD_TYPE_NAMES[c]` in the facilitator's static lookup.

### 2.4 On-Chain PlayerState Layout

The facilitator reads the `PlayerState` PDA directly without the Anchor IDL (raw byte offsets):

```
Offset  Size  Field
0       8     Anchor discriminator (sha256("account:PlayerState")[..8])
8       8     game_id (u64 LE)
16      32    player pubkey
48      1     player_index (u8)
49      1     area (u8)  — current map/floor
50      5     cards[5] (u8[5])  — held card IDs
55      1     card_count (u8)
...
136     32    position_commitment ([u8;32])
168     1     initialized (bool)
```

PDA derivation: `["player", game_id_le_bytes, player_pubkey]` under program `5i37j...`.

---

## 3. HTTP-402 Protocol Trace

### 3.1 First Request — Payment Required

```http
POST /scout-peek HTTP/1.1
Host: localhost:3402
Content-Type: application/json

{"game_id": 42, "target_pubkey": "VEGAabc..."}
```

**Response:**
```http
HTTP/1.1 402 Payment Required
Content-Type: application/json
X-Payment-Required: {"version":1,"scheme":"exact","network":"solana-devnet","amount":5000000,"currency":"SOL","recipient":"DPMPhnVezSq5im35p4w3bC6XjpNZuuvCDVSAVxw4Q28R","description":"Scout peek - reveal one card from target player"}
Access-Control-Allow-Origin: *
Access-Control-Expose-Headers: X-Payment-Required

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

### 3.2 Client Payment Transaction

The client sends a native SOL transfer using `@solana/web3.js`:

```javascript
const tx = new Transaction().add(
  SystemProgram.transfer({
    fromPubkey: wallet.publicKey,
    toPubkey:   new PublicKey("DPMPhnVezSq5im35p4w3bC6XjpNZuuvCDVSAVxw4Q28R"),
    lamports:   5_000_000,  // 0.005 SOL
  })
);
const signature = await sendAndConfirmTransaction(connection, tx, [wallet]);
```

### 3.3 Second Request — With Payment Proof

```http
POST /scout-peek HTTP/1.1
Host: localhost:3402
Content-Type: application/json
X-Payment: 3kJQmP7Xw...AbCdEfGhIj

{"game_id": 42, "target_pubkey": "VEGAabc..."}
```

**Response:**
```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "revealed": { "id": 7, "name": "Inferno" },
  "totalCards": 3,
  "area": 2,
  "pda": "8xKLmN...pQrStU",
  "timestamp": 1745193600000
}
```

### 3.4 Replay Attempt Response

```http
HTTP/1.1 402 Payment Required
Content-Type: application/json

{
  "error": "Payment verification failed",
  "reason": "Signature already used (replay attempt)"
}
```

### 3.5 USDC Endpoints (Intel API)

The intel endpoints (`/intel/location`, `/intel/hand`, `/intel/strategy`) use USDC instead of native SOL. The `X-Payment-Required` header differs:

```json
{
  "version": 1,
  "scheme": "exact",
  "network": "solana-devnet",
  "amount": 0.002,
  "currency": "USDC",
  "recipient": "DPMPhnVezSq5im35p4w3bC6XjpNZuuvCDVSAVxw4Q28R",
  "description": "Rival floor position"
}
```

USDC payment verification uses SPL token transfer parsing (`verifySolPayment` vs `verifyPayment` — two separate code paths in `agent-broker.js`).

---

## 4. ZK × x402 — Information Asymmetry as Game Mechanic

### 4.1 The Core Tension

In 0xARK, two cryptographic systems create opposing forces:

```
ZK (hide)                           x402 (reveal)
─────────────────────               ─────────────────────
Player commits position:            Player pays 0.005 SOL:
  H = Poseidon(x, y, nonce)           → scout-peek response
  proof: (x,y) is valid move             "VEGA holds Inferno"
  On-chain: verify(proof, H)         → decision: steal now?
  Rival sees: nothing
```

The ZK circuit proves "I moved legally" without revealing *where* I moved. x402 sells the answer to "where is my rival, and what cards do they hold?"

### 4.2 Game-Theoretic Analysis

This creates a **Bayesian information game**:

- Player A spends 0.005 SOL on a scout peek
- Player A learns Player B holds 3 Legendary cards
- Player A must now decide: attack (risk vs. reward) or avoid (preserve current cards)?

The expected value of a scout peek:

$$E[\text{peek}] = P(\text{win} | \text{informed}) \times V_{\text{card}} - P(\text{lose} | \text{informed}) \times V_{\text{my card}} - 0.005 \text{ SOL}$$

A rational player scouts when the information changes their strategy. This creates natural price discovery: if peek prices are too high, players skip intel and fight blind. If too low, every player scouts every round and intel loses value (known equilibrium collapses).

### 4.3 Dynamic Pricing (Post-Hackathon)

The current fixed-price model (0.005 SOL/peek) can evolve to:

- **Auction-based pricing** — price rises as more players request the same target's info
- **Reputation-based discounts** — agents that buy frequently get volume discounts
- **Floor-tier pricing** — B5 intel costs more than B1 intel (higher stakes)

The facilitator is the natural oracle for dynamic pricing because it holds game state from `/update-state`.

### 4.4 ZK × x402 Hackathon Narrative

This mechanic cannot exist without both axes operating simultaneously:

1. Without ZK: positions are visible on-chain → scout peek has no value
2. Without x402: information is either free (all players know all positions) or locked (no trading) → no microeconomy
3. With both: a functioning **information market** emerges where privacy has a price

This is the core innovation of 0xARK: **ZK creates the demand for x402**.

---

## 5. Security Considerations

### 5.1 Replay Attack Prevention

**Threat:** Attacker captures a valid payment transaction signature and reuses it to get multiple peeks for the price of one.

**Mitigation:**
```javascript
// usedSignatures: Set<string> — in-memory, survives process lifetime
if (usedSignatures.has(signature)) {
  return { ok: false, reason: 'Signature already used (replay attempt)' };
}
// After successful verification:
trackSignature(signature);  // adds to Set, evicts oldest 1k entries at 10k cap
```

The in-memory cache is **devnet-only**. For mainnet, signatures should be stored in a persistent store (Redis or Postgres) with TTL matching Solana's transaction history window (~90 days via `getSignaturesForAddress`).

### 5.2 Front-Running

**Threat:** Player A observes Player B's payment transaction in the mempool, extracts the `target_pubkey`, and submits their own scout peek with the same target before Player B's request is processed.

**Reality on Solana:** Solana does not have a traditional mempool — transactions are forwarded directly to the current leader. Front-running is significantly harder than on Ethereum. The payment verification adds 1–2 RPC round-trips (confirmation check), creating a ~500ms window where the signature is valid but unregistered. An attacker would need to observe the confirmed signature and hit the facilitator endpoint within that window — difficult in practice.

**Mitigation (post-hackathon):** Add a per-request nonce commitment: client pre-commits `H(nonce, game_id, target)` before payment, server verifies nonce was not used before revealing.

### 5.3 Spoofed Transfer Destination

**Threat:** Attacker crafts a valid Solana transaction that transfers SOL to a *different* wallet but still produces a valid tx signature, then submits that signature as "payment."

**Mitigation:**
```javascript
// We check: keys[i].pubkey.equals(recipientPk)
// Only the exact recipient's lamport delta is counted.
// A transfer to another wallet produces zero delta for recipientPk.
```

The balance-diff check is robust: the only way to make `post - pre >= minLamports` for `recipientPk` is to actually send SOL to that address.

### 5.4 Facilitator Trust Model

The facilitator is **semi-trusted**:

- It reads on-chain data (trustless — PDA is deterministic)
- It manages the `usedSignatures` cache (trusted — in-memory, not on-chain)
- It holds the `BROKER_WALLET` private key (trusted — signs nothing, only receives)
- It cannot modify on-chain game state — it has no program authority

The facilitator is the **weakest link** in the x402 security model. For mainnet:

1. Open-source the facilitator code (done — MIT licensed)
2. Publish the broker wallet address so anyone can verify receipts on-chain
3. Add on-chain `PaymentRecord` PDA to make replay protection trustless

### 5.5 Dev Bypass

The `local-dev-bypass` mechanism allows E2E testing without live SOL payments:

```javascript
if (signature === 'local-dev-bypass') return { ok: true, simulated: true };
```

This bypass is **only effective in devnet**. For mainnet deployment, the bypass constant should be removed and the environment variable `NODE_ENV=production` should disable it.

---

## 6. Touchpoint Reference

### ① Player-to-Player Transactions

| Transaction | Price | Status |
|-------------|-------|--------|
| Scout peek | 0.005 SOL | ✅ Live |
| Hint buy | 0.002 SOL | Design only |
| Card list/buy | variable | 🔄 T42 |
| Booster pack | 0.01 SOL | Design only |
| Revive | 0.03 SOL | Design only |

### ② AI Agent Economy

| Transaction | Price | Status |
|-------------|-------|--------|
| Agent hire | 0.05 SOL/session | 🔄 T43 |
| Agent strategy API | 0.001 SOL/query | Design only |
| Agent intel share | 0.005 SOL | Design only |
| Agent reg fee | 0.02 SOL | Design only |

### ③ Spectator / Meta Economy

| Transaction | Price | Status |
|-------------|-------|--------|
| Spectator bet | 0.01+ SOL | Design only |
| Leaderboard entry | 0.01 SOL | Design only |
| Tournament | 0.5+ SOL | Design only |

### ④ Composability

| Transaction | Price | Status |
|-------------|-------|--------|
| Game state query | 0.0001 SOL | Design only |
| Metadata update | 0.005 SOL | Design only |

---

## 7. Tech Stack

| Component | Technology |
|-----------|-----------|
| Protocol | x402 v2 (HTTP-402 + Solana SOL/USDC) |
| Network | Solana devnet (mainnet post-hackathon) |
| Facilitator | Node.js (Express) — `x402/agent-broker.js` |
| Payment verification | `@solana/web3.js` — `getParsedTransaction` + balance diff |
| Replay protection | In-memory Set (devnet) → Redis (mainnet) |
| Client integration | `solana/client/src/02-x402.js` |
| On-chain state | Anchor PDA — `PlayerState`, `AgentListing`, `AgentHireSession` |

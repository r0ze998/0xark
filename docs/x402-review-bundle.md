# x402 Implementation Review Bundle

Generated for external GPT review.  
Commit: see `git log --oneline -1` for current HEAD.

---

## 1. solana/client/src/02-x402.js

```javascript
/**
 * 02-x402.js — x402 micropayment client for 0xARK
 *
 * Handles the full x402 HTTP-402 flow:
 *   1. POST endpoint (no payment header) → 402 + PAYMENT-REQUIRED header (Base64 JSON)
 *   2. Parse payment spec; build SOL tx (1 or 2 transfers + memo)
 *   3. Sign + send via Phantom
 *   4. Retry with X-Payment: <tx_sig>
 *   5. Server verifies on-chain → 200 OK + content
 *
 * Supports split payments (50% ops_treasury / 50% prize_pool).
 * Backward-compatible with single-recipient servers.
 *
 * Dependencies: window.solana (Phantom/Backpack), window.solanaWeb3, window.x402Memo
 */

// Server URL: configurable via window.X402_BROKER_URL (default: multiplayer server)
const X402_BROKER_URL = typeof window !== 'undefined'
  ? (window.X402_BROKER_URL || 'http://localhost:3500')
  : 'http://localhost:3500';

/**
 * Scout peek — pay 0.005 SOL to reveal one card held by a target player.
 */
async function scoutPeek(gameId, target, wallet, conn) {
  const { Transaction, SystemProgram, PublicKey } = window.solanaWeb3 ?? {};
  if (!Transaction) throw new Error('solanaWeb3 not found on window');

  const fromPk       = new PublicKey(wallet.publicKey.toString());
  const playerPubkey = fromPk.toBase58();

  const probe = await fetch(`${X402_BROKER_URL}/scout-peek`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ game_id: gameId, target_pubkey: target }),
  });

  if (probe.status !== 402) {
    if (probe.ok) return probe.json();
    throw new Error(`Unexpected status ${probe.status} from scout-peek`);
  }

  const paymentSpec = JSON.parse(probe.headers.get('X-Payment-Required') || '{}');
  const lamports = paymentSpec.amount ?? 5_000_000;

  const toPk = new PublicKey(paymentSpec.recipient);

  const { blockhash } = await conn.getLatestBlockhash('confirmed');
  const tx = new Transaction({ recentBlockhash: blockhash, feePayer: fromPk });
  tx.add(SystemProgram.transfer({ fromPubkey: fromPk, toPubkey: toPk, lamports }));

  const memoHelper = typeof window !== 'undefined' ? window.x402Memo : null;
  if (memoHelper?.buildMemoIx) {
    const nonce = memoHelper.generateNonce();
    tx.add(memoHelper.buildMemoIx({ solanaWeb3: window.solanaWeb3, endpoint: '/scout-peek', nonce }));
  }

  const signed = await wallet.signTransaction(tx);
  const sig = await conn.sendRawTransaction(signed.serialize());
  await conn.confirmTransaction(sig, 'confirmed');

  const paid = await fetch(`${X402_BROKER_URL}/scout-peek`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Payment': sig },
    body: JSON.stringify({ game_id: gameId, target_pubkey: target, playerPubkey, signature: sig }),
  });

  if (!paid.ok) {
    const err = await paid.json().catch(() => ({}));
    throw new Error(err.reason ?? `scout-peek failed: ${paid.status}`);
  }

  return paid.json();
}

/**
 * Hire an AI agent via x402 micropayment (0.05 SOL).
 */
async function hireAgent(agentId, gameId, durationSeconds = 3600, wallet, conn) {
  const { Transaction, SystemProgram, PublicKey } = window.solanaWeb3 ?? {};
  if (!Transaction) throw new Error('solanaWeb3 not found on window');

  const fromPk       = new PublicKey(wallet.publicKey.toString());
  const playerPubkey = fromPk.toBase58();
  const probeBody    = JSON.stringify({ agent_id: agentId, game_id: gameId, duration_seconds: durationSeconds, hirer_pubkey: playerPubkey });

  const probe = await fetch(`${X402_BROKER_URL}/agent-hire`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: probeBody,
  });

  if (probe.status !== 402) {
    if (probe.ok) return probe.json();
    throw new Error(`Unexpected status ${probe.status} from agent-hire`);
  }

  const paymentSpec = JSON.parse(probe.headers.get('X-Payment-Required') || '{}');
  const lamports = paymentSpec.amount ?? 50_000_000;

  const toPk = new PublicKey(paymentSpec.recipient);

  const { blockhash } = await conn.getLatestBlockhash('confirmed');
  const tx = new Transaction({ recentBlockhash: blockhash, feePayer: fromPk });
  tx.add(SystemProgram.transfer({ fromPubkey: fromPk, toPubkey: toPk, lamports }));

  const memoHelper = typeof window !== 'undefined' ? window.x402Memo : null;
  if (memoHelper?.buildMemoIx) {
    const nonce = memoHelper.generateNonce();
    tx.add(memoHelper.buildMemoIx({ solanaWeb3: window.solanaWeb3, endpoint: '/agent-hire', nonce }));
  }

  const signed = await wallet.signTransaction(tx);
  const sig = await conn.sendRawTransaction(signed.serialize());
  await conn.confirmTransaction(sig, 'confirmed');

  const retryBody = JSON.stringify({
    agent_id: agentId, game_id: gameId, duration_seconds: durationSeconds,
    hirer_pubkey: playerPubkey, playerPubkey, signature: sig,
  });
  const paid = await fetch(`${X402_BROKER_URL}/agent-hire`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Payment': sig },
    body: retryBody,
  });

  if (!paid.ok) {
    const err = await paid.json().catch(() => ({}));
    throw new Error(err.reason ?? `agent-hire failed: ${paid.status}`);
  }

  return paid.json();
}

async function hireAgentDev(agentId, gameId = 0, durationSeconds = 3600) {
  const res = await fetch(`${X402_BROKER_URL}/agent-hire`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Payment': 'local-dev-bypass' },
    body: JSON.stringify({ agent_id: agentId, game_id: gameId, duration_seconds: durationSeconds, hirer_pubkey: 'DEV_BYPASS_PUBKEY' }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.reason ?? `agent-hire dev failed: ${res.status}`);
  }
  return res.json();
}

async function scoutPeekDev(gameId, target) {
  const res = await fetch(`${X402_BROKER_URL}/scout-peek`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Payment': 'local-dev-bypass' },
    body: JSON.stringify({ game_id: gameId, target_pubkey: target }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.reason ?? `scout-peek dev failed: ${res.status}`);
  }
  return res.json();
}

// ─── Security helpers ─────────────────────────────────────────────────────────

// H13: Reject endpoint paths with characters outside [a-zA-Z0-9/_-].
function _sanitizeMemoEndpoint(path) {
  const sanitized = path.replace(/[^a-zA-Z0-9/_-]/g, '');
  if (sanitized !== path) throw new Error(`Invalid endpoint path: ${path}`);
  return sanitized;
}

// H10: Assert split payment amounts sum to at least the required total.
function _validatePaymentSplit(splitRecipient, totalLamports) {
  const opsLamports  = splitRecipient.ops?.lamports  ?? 0;
  const poolLamports = splitRecipient.pool?.lamports ?? 0;
  const sum = opsLamports + poolLamports;
  if (sum < totalLamports) {
    throw new Error(`Invalid payment split: ${sum} lamports < required ${totalLamports}`);
  }
  if (totalLamports > 0 && sum > totalLamports * 1.01) {
    throw new Error(`Payment split exceeds required by >1%: ${sum} vs ${totalLamports}`);
  }
}

// ─── Phase 12: move memo payment helpers ─────────────────────────────────────

const MOVE_ENDPOINTS = ['/x402/co', '/x402/re', '/x402/hc', '/x402/hr', '/x402/pa', '/x402/rs', '/x402/me'];

function _buildMoveMemoStr(endpoint, fields) {
  const safeEndpoint = _sanitizeMemoEndpoint(endpoint);
  const nonce = _generateNonce();
  const parts  = [`e:${safeEndpoint}`];
  for (const [k, v] of Object.entries(fields)) parts.push(`${k}:${v}`);
  parts.push(`n:${nonce}`);
  return parts.join(';');
}

function _generateNonce() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID().replace(/-/g, '');
  }
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    return Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
  }
  throw new Error('No secure random source available');
}

async function _payMove(endpoint, memoFields, wallet, conn) {
  const { Transaction, SystemProgram, PublicKey, TransactionInstruction } = window.solanaWeb3 ?? {};
  if (!Transaction) throw new Error('solanaWeb3 not found on window');

  const fromPk       = new PublicKey(wallet.publicKey.toString());
  const playerPubkey = fromPk.toBase58();
  const memoStr      = _buildMoveMemoStr(endpoint, memoFields);

  const probe = await fetch(`${X402_BROKER_URL}${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ playerPubkey, memo: memoStr }),
  });
  if (probe.ok) return probe.json();
  if (probe.status !== 402) throw new Error(`Unexpected status ${probe.status} from ${endpoint}`);

  const spec     = JSON.parse(probe.headers.get('X-Payment-Required') || '{}');
  const lamports = spec.accepts?.[0]?.amount ? parseInt(spec.accepts[0].amount, 10) : 100_000;
  const toPk     = new PublicKey(spec.accepts?.[0]?.payTo ?? TREASURY_ADDR_FALLBACK);

  const { blockhash } = await conn.getLatestBlockhash('confirmed');
  const tx = new Transaction({ recentBlockhash: blockhash, feePayer: fromPk });
  tx.add(SystemProgram.transfer({ fromPubkey: fromPk, toPubkey: toPk, lamports }));
  tx.add(new TransactionInstruction({
    programId: new PublicKey('MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr'),
    keys: [],
    data: (() => { const enc = new TextEncoder(); return enc.encode(memoStr); })(),
  }));

  const signed = await wallet.signTransaction(tx);
  const sig    = await conn.sendRawTransaction(signed.serialize());
  await conn.confirmTransaction(sig, 'confirmed');

  const paid = await fetch(`${X402_BROKER_URL}${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Payment': sig },
    body: JSON.stringify({ playerPubkey, signature: sig, memo: memoStr }),
  });
  if (!paid.ok) {
    const err = await paid.json().catch(() => ({}));
    throw new Error(err.error ?? `${endpoint} failed: ${paid.status}`);
  }
  return paid.json();
}

// ─── Phase 19: unified x402 payment helper ───────────────────────────────────

const TREASURY_ADDR_FALLBACK = '11111111111111111111111111111111';

function _getDefaultConn() {
  const { Connection } = window.solanaWeb3 ?? {};
  if (!Connection) throw new Error('solanaWeb3 not loaded');
  return new Connection('https://api.devnet.solana.com', 'confirmed');
}

async function _x402Pay(endpoint, body = {}, wallet, conn) {
  const { Transaction, SystemProgram, PublicKey, TransactionInstruction } = window.solanaWeb3 ?? {};
  if (!Transaction) throw new Error('solanaWeb3 not loaded');

  const w      = wallet ?? window.solana;
  const c      = conn   ?? _getDefaultConn();
  if (!w?.isConnected && !w?.publicKey) throw new Error('Wallet not connected');

  const fromPk       = new PublicKey(w.publicKey.toString());
  const playerPubkey = fromPk.toBase58();

  // 1. Probe
  const probeRes = await fetch(`${X402_BROKER_URL}${endpoint}`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ ...body, playerPubkey }),
  });

  if (probeRes.ok) return probeRes.json();
  if (probeRes.status !== 402) {
    const errBody = await probeRes.json().catch(() => ({}));
    throw Object.assign(new Error(errBody.error ?? `x402 ${endpoint} returned ${probeRes.status}`), { code: 'ServerError' });
  }

  // 2. Parse PAYMENT-REQUIRED header
  const specBase64 = probeRes.headers.get('PAYMENT-REQUIRED') || probeRes.headers.get('X-Payment-Required');
  let spec = {};
  try { spec = specBase64 ? JSON.parse(atob(specBase64)) : {}; } catch (_) {}

  const accepts = spec.accepts?.[0] ?? {};
  const totalLamports = parseInt(accepts.amount, 10)
    || parseInt(probeRes.headers.get('X-Payment-Amount'), 10)
    || 0;

  // 3. Build transaction
  const { blockhash } = await c.getLatestBlockhash('confirmed');
  const tx = new Transaction({ recentBlockhash: blockhash, feePayer: fromPk });

  const splitRecipient = accepts.recipient;
  if (splitRecipient?.ops && splitRecipient?.pool
      && splitRecipient.ops.address !== splitRecipient.pool.address) {
    // H10: Verify split amounts
    _validatePaymentSplit(splitRecipient, totalLamports);
    tx.add(SystemProgram.transfer({
      fromPubkey: fromPk,
      toPubkey:   new PublicKey(splitRecipient.ops.address),
      lamports:   splitRecipient.ops.lamports,
    }));
    tx.add(SystemProgram.transfer({
      fromPubkey: fromPk,
      toPubkey:   new PublicKey(splitRecipient.pool.address),
      lamports:   splitRecipient.pool.lamports,
    }));
  } else {
    const payTo = accepts.payTo
      || probeRes.headers.get('X-Payment-Recipient')
      || TREASURY_ADDR_FALLBACK;
    tx.add(SystemProgram.transfer({
      fromPubkey: fromPk,
      toPubkey:   new PublicKey(payTo),
      lamports:   totalLamports,
    }));
  }

  // H13: Sanitize endpoint in memo
  const nonce   = _generateNonce();
  const memoStr = `endpoint:${_sanitizeMemoEndpoint(endpoint)};nonce:${nonce}`;
  tx.add(new TransactionInstruction({
    programId: new PublicKey('MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr'),
    keys: [],
    data: new TextEncoder().encode(memoStr),
  }));

  // 4. Sign + send
  const signed = await w.signTransaction(tx);
  const sig    = await c.sendRawTransaction(signed.serialize());
  await c.confirmTransaction(sig, 'confirmed');

  // 5. Retry with payment proof
  const paidRes = await fetch(`${X402_BROKER_URL}${endpoint}`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json', 'X-Payment': sig },
    body:    JSON.stringify({ ...body, playerPubkey, signature: sig, memo: memoStr }),
  });

  if (!paidRes.ok) {
    const errBody = await paidRes.json().catch(() => ({}));
    const msg = errBody.error ?? errBody.reason ?? `${endpoint} failed: ${paidRes.status}`;
    const code = paidRes.status === 402 ? 'PaymentFailed' : 'ServerError';
    throw Object.assign(new Error(msg), { code });
  }
  return paidRes.json();
}

// ─── Phase 19 endpoint wrappers ───────────────────────────────────────────────

async function payMatchBattle(body = {})                   { return _x402Pay('/x402/match-battle', body); }
async function payPeekVaultSize(targetPubkey, body = {})   { return _x402Pay('/x402/peek-vault-size', { target_pubkey: targetPubkey, ...body }); }
async function payPeekVaultContent(targetPubkey, body = {}){ return _x402Pay('/x402/peek-vault-content', { target_pubkey: targetPubkey, ...body }); }
async function payDrawExtra(body = {})                     { return _x402Pay('/x402/draw-extra', body); }
async function payAiStrategyAdvice(context = {})           { return _x402Pay('/x402/ai-strategy-advice', { public_state: context }); }

// Phase 12 move endpoints
async function payCommit({ matchId, round, playerSide = 's', hash }, wallet, conn) {
  return _payMove('/x402/co', { m: matchId, r: round, p: playerSide, h: hash }, wallet, conn);
}
async function payReveal({ matchId, round, playerSide = 's', actionType, target, salt }, wallet, conn) {
  return _payMove('/x402/re', { m: matchId, r: round, p: playerSide, a: actionType, g: target, s: salt }, wallet, conn);
}
async function payHandCommit({ matchId, round, commitment }, wallet, conn) {
  return _payMove('/x402/hc', { m: matchId, r: round, c: commitment }, wallet, conn);
}
async function payHandReveal({ matchId, round, cardIds }, wallet, conn) {
  return _payMove('/x402/hr', { m: matchId, r: round, i: cardIds.join(',') }, wallet, conn);
}
async function payPhaseAdvance({ matchId, round, phase }, wallet, conn) {
  return _payMove('/x402/pa', { m: matchId, r: round, p: phase }, wallet, conn);
}
async function payRoundResolve({ matchId, round, p1Delta, p2Delta }, wallet, conn) {
  return _payMove('/x402/rs', { m: matchId, r: round, d: `${p1Delta}/${p2Delta}` }, wallet, conn);
}
async function payMatchEnd({ matchId, winner }, wallet, conn) {
  if (!wallet && !conn) return _x402Pay('/x402/me', { m: matchId, w: winner });
  return _payMove('/x402/me', { m: matchId, w: winner }, wallet, conn);
}

async function payAiMove({ matchId, round, publicState }, wallet, conn) {
  const { Transaction, SystemProgram, PublicKey } = window.solanaWeb3 ?? {};
  if (!Transaction) throw new Error('solanaWeb3 not found on window');

  const fromPk       = new PublicKey(wallet.publicKey.toString());
  const playerPubkey = fromPk.toBase58();
  const endpoint     = '/x402/ai-move';

  const probe = await fetch(`${X402_BROKER_URL}${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ playerPubkey, match_id: matchId, round, public_state: publicState }),
  });
  if (probe.ok) return probe.json();
  if (probe.status === 503) {
    const err = await probe.json().catch(() => ({}));
    throw new Error(err.error ?? 'AI delegation not available');
  }
  if (probe.status !== 402) throw new Error(`Unexpected status ${probe.status} from ${endpoint}`);

  const amountHeader    = probe.headers.get('X-Payment-Amount');
  const recipientHeader = probe.headers.get('X-Payment-Recipient');
  const lamports        = amountHeader ? parseInt(amountHeader, 10) : 5_000_000;
  const toPk            = new PublicKey(recipientHeader ?? TREASURY_ADDR_FALLBACK);

  const { blockhash } = await conn.getLatestBlockhash('confirmed');
  const tx = new Transaction({ recentBlockhash: blockhash, feePayer: fromPk });
  tx.add(SystemProgram.transfer({ fromPubkey: fromPk, toPubkey: toPk, lamports }));

  const signed = await wallet.signTransaction(tx);
  const sig    = await conn.sendRawTransaction(signed.serialize());
  await conn.confirmTransaction(sig, 'confirmed');

  const paid = await fetch(`${X402_BROKER_URL}${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Payment': sig },
    body: JSON.stringify({ playerPubkey, signature: sig, match_id: matchId, round, public_state: publicState }),
  });
  if (!paid.ok) {
    const err = await paid.json().catch(() => ({}));
    throw new Error(err.error ?? `${endpoint} failed: ${paid.status}`);
  }
  return paid.json();
}

const _x402Exports = {
  payMatchBattle, payPeekVaultSize, payPeekVaultContent, payDrawExtra, payAiStrategyAdvice,
  payCommit, payReveal, payHandCommit, payHandReveal, payPhaseAdvance, payRoundResolve, payMatchEnd,
  payAiMove,
  scoutPeek, scoutPeekDev, hireAgent, hireAgentDev,
  X402_BROKER_URL, _x402Pay,
};

if (typeof module !== 'undefined') {
  module.exports = _x402Exports;
} else if (typeof window !== 'undefined') {
  window.x402 = _x402Exports;
}
```

---

## 2. multiplayer/server.js

```javascript
/**
 * 0xARK Multiplayer WebSocket Server — Pure Relayer (Phase 5)
 *
 * Architecture: The Solana program is the single source of truth for all game
 * state. This server is a stateless relay that:
 *   1. Manages WebSocket connections and room presence (lobby only)
 *   2. Relays player movement with ZK proximity filter
 *   3. Submits client-signed transactions to the Solana RPC
 *   4. Broadcasts tx confirmations so clients know to refresh on-chain state
 *   5. Relays chat messages
 */

import http from 'http';
import { WebSocketServer } from 'ws';
import { PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';

import { rooms, connection, COMMITMENT, RPC_URL, send, broadcast, usedSigs, rateLimits, gcRoundClaims } from './state.js';
import { HANDLERS } from './handlers/index.js';
import { validateMemo, MOVE_ENDPOINTS } from './memo-validator.js';

const PORT = process.env.PORT || 3500;

const MOVE_PRICE_LAMPORTS = parseInt(process.env.X402_MOVE_PRICE_LAMPORTS, 10) || 100_000;
const MOVE_PRICE_SOL = MOVE_PRICE_LAMPORTS / LAMPORTS_PER_SOL;

const AI_MOVE_PRICE_LAMPORTS = parseInt(process.env.X402_AI_MOVE_PRICE_LAMPORTS, 10) || 5_000_000;
const AI_MOVE_PRICE_SOL = AI_MOVE_PRICE_LAMPORTS / LAMPORTS_PER_SOL;

// ─── Rate limiting ────────────────────────────────────────────────────────────

const RATE_WINDOW_MS = 1_000;
const RATE_MAX_MSG   = 20;
const RATE_MAX_TX    = 3;
const MSG_SIZE_LIMIT = 32_768;

function initRateState(ws) {
  ws._rateWindow = Date.now();
  ws._rateMsg    = 0;
  ws._rateTx     = 0;
}

function rateLimited(ws, isTx = false) {
  const now = Date.now();
  if (now - ws._rateWindow > RATE_WINDOW_MS) {
    ws._rateWindow = now;
    ws._rateMsg    = 0;
    ws._rateTx     = 0;
  }
  ws._rateMsg++;
  if (isTx) ws._rateTx++;
  if (ws._rateMsg > RATE_MAX_MSG) return true;
  if (isTx && ws._rateTx > RATE_MAX_TX) return true;
  return false;
}

// ─── HTTP rate limiting ───────────────────────────────────────────────────────

const HTTP_RATE_MAX    = parseInt(process.env.RATE_LIMIT_MAX,       10) || 20;
const HTTP_RATE_WINDOW = parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 60_000;

function checkHttpRateLimit(ip, now = Date.now()) {
  let entry = rateLimits.get(ip);
  if (!entry || now - entry.windowStart >= HTTP_RATE_WINDOW) {
    entry = { count: 0, windowStart: now };
    rateLimits.set(ip, entry);
  }
  entry.count++;
  if (entry.count > HTTP_RATE_MAX) {
    const retryAfter = Math.ceil((HTTP_RATE_WINDOW - (now - entry.windowStart)) / 1000);
    return { limited: true, retryAfter };
  }
  return { limited: false };
}

// ─── x402 payment verification ────────────────────────────────────────────────

const TREASURY_ADDR    = process.env.TREASURY_PUBKEY || '11111111111111111111111111111111';
const OPS_TREASURY_ADDR  = process.env.OPS_TREASURY_PUBKEY  || TREASURY_ADDR;
const PRIZE_POOL_ADDR    = process.env.PRIZE_POOL_PUBKEY     || TREASURY_ADDR;
const SOLANA_NETWORK   = process.env.SOLANA_NETWORK  || 'devnet';
const X402_REQUIRE_MEMO = process.env.X402_REQUIRE_MEMO === 'true';

// ─── Environment validation ───────────────────────────────────────────────────

const REQUIRED_PROD_ENVS = ['TREASURY_PUBKEY', 'SOLANA_RPC'];

function validateEnv() {
  const isProd = process.env.NODE_ENV === 'production';
  for (const key of REQUIRED_PROD_ENVS) {
    if (!process.env[key]?.trim()) {
      if (isProd) {
        console.error(`[FATAL] ${key} is required in production. Exiting.`);
        process.exit(1);
      } else {
        console.warn(`[WARN] ${key} not set — demo mode active (payments skipped)`);
      }
    }
  }
}

validateEnv();

// Memo Program IDs (legacy + v2)
const MEMO_PROGRAM_IDS = new Set([
  'Memo1UhkJRfHyvLMcVucJwxXeuD728EqVDDwQDxFMNo',   // SPL Memo v1
  'MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr',   // SPL Memo v2
]);

function extractMemo(tx) {
  const message = tx?.transaction?.message;
  if (!message) return null;
  const accountKeys  = message.staticAccountKeys ?? message.accountKeys ?? [];
  const instructions = message.compiledInstructions ?? message.instructions ?? [];
  for (const ix of instructions) {
    const key = accountKeys[ix.programIdIndex];
    if (!key) continue;
    const programId = typeof key.toBase58 === 'function' ? key.toBase58() : String(key);
    if (!MEMO_PROGRAM_IDS.has(programId)) continue;
    const raw = ix.data;
    if (raw == null) continue;
    if (Buffer.isBuffer(raw))      return raw.toString('utf8');
    if (raw instanceof Uint8Array) return Buffer.from(raw).toString('utf8');
    if (typeof raw === 'string')   return raw;
  }
  return null;
}

const X402_POLL_ATTEMPTS = 10;
const X402_POLL_MS       = 500;
const X402_MAX_AGE_MS    = 60_000;

function _sumTreasuryReceived(tx, knownAddrs) {
  const accountKeys = tx.transaction.message.staticAccountKeys ?? tx.transaction.message.accountKeys;
  let total = 0;
  for (const addr of knownAddrs) {
    const idx = accountKeys.findIndex(k => k.toBase58() === addr);
    if (idx >= 0) {
      total += (tx.meta.postBalances[idx] ?? 0) - (tx.meta.preBalances[idx] ?? 0);
    }
  }
  return total;
}

async function _verifyX402Payment(playerPubkeyStr, amountSol, requestPath, sigHint = null) {
  if (!process.env.TREASURY_PUBKEY) {
    console.log('[x402] No TREASURY_PUBKEY — demo mode');
    return { ok: true, demo: true };
  }
  const knownAddrs = [...new Set([TREASURY_ADDR, OPS_TREASURY_ADDR, PRIZE_POOL_ADDR])];
  try {
    const expectedLamports = Math.floor(amountSol * LAMPORTS_PER_SOL);

    if (sigHint) {
      if (usedSigs.has(sigHint)) return { ok: false, error: 'signature already used' };
      const tx = await connection.getTransaction(sigHint, {
        commitment: COMMITMENT, maxSupportedTransactionVersion: 0,
      });
      if (!tx?.meta) return { ok: false, error: 'transaction not found' };
      if (X402_REQUIRE_MEMO) {
        const memoCheck = validateMemo(extractMemo(tx), requestPath);
        if (!memoCheck.ok) return { ok: false, error: memoCheck.error };
      }
      const received = _sumTreasuryReceived(tx, knownAddrs);
      if (received <= 0) return { ok: false, error: 'payment not directed to treasury' };
      if (received >= expectedLamports) {
        console.log(`[x402] Verified: ${amountSol} SOL`);
        usedSigs.set(sigHint, Date.now() + 120_000);
        return { ok: true, sig: sigHint, received, memo: extractMemo(tx) };
      }
      return { ok: false, error: 'insufficient payment' };
    }

    // Legacy: poll recent sigs by player pubkey
    const playerKey = new PublicKey(playerPubkeyStr);
    for (let attempt = 0; attempt < X402_POLL_ATTEMPTS; attempt++) {
      const sigs = await connection.getSignaturesForAddress(playerKey, { limit: 10 }, COMMITMENT);
      const now  = Date.now();
      for (const sigInfo of sigs) {
        if (!sigInfo.blockTime || sigInfo.err) continue;
        if (now - sigInfo.blockTime * 1000 > X402_MAX_AGE_MS) continue;
        if (usedSigs.has(sigInfo.signature)) return { ok: false, error: 'signature already used' };
        const tx = await connection.getTransaction(sigInfo.signature, {
          commitment: COMMITMENT, maxSupportedTransactionVersion: 0,
        });
        if (!tx?.meta) continue;
        if (X402_REQUIRE_MEMO) {
          const memoCheck = validateMemo(extractMemo(tx), requestPath);
          if (!memoCheck.ok) return { ok: false, error: memoCheck.error };
        }
        const received = _sumTreasuryReceived(tx, knownAddrs);
        if (received >= expectedLamports) {
          console.log(`[x402] Verified: ${amountSol} SOL from ${playerPubkeyStr}`);
          usedSigs.set(sigInfo.signature, Date.now() + 120_000);
          return { ok: true, sig: sigInfo.signature, received, memo: extractMemo(tx) };
        }
      }
      if (attempt < X402_POLL_ATTEMPTS - 1) await new Promise(r => setTimeout(r, X402_POLL_MS));
    }
    return { ok: false, error: 'Payment not detected within 5 seconds' };
  } catch (err) {
    console.error('[x402] Verification error:', err.message);
    return { ok: false, error: 'Verification failed: ' + err.message };
  }
}

function _readBody(req) {
  return new Promise((resolve) => {
    let data = '';
    req.on('data', chunk => { data += chunk; });
    req.on('end', () => { try { resolve(JSON.parse(data)); } catch { resolve({}); } });
  });
}

// ─── HTTP server ──────────────────────────────────────────────────────────────

const httpServer = http.createServer(async (req, res) => {
  const cors = () => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  };
  if (req.method === 'OPTIONS') { cors(); res.writeHead(204); res.end(); return; }

  if (req.method === 'GET' && (req.url === '/' || req.url === '/health')) {
    cors();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', rooms: rooms.size, connections: wss?.clients?.size ?? 0, rpc: RPC_URL }));
    return;
  }

  const X402_ROUTES = {
    '/x402/extra-action':  0.01,
    '/x402/scout-peek':    0.005,
    '/x402/counter-peek':  0.003,
    '/x402/match-battle':        0.001,
    '/x402/peek-vault-size':     0.0005,
    '/x402/peek-vault-content':  0.005,
    '/x402/draw-extra':          0.01,
    '/x402/ai-strategy-advice':  0.003,
    '/x402/co': MOVE_PRICE_SOL,
    '/x402/re': MOVE_PRICE_SOL,
    '/x402/hc': MOVE_PRICE_SOL,
    '/x402/hr': MOVE_PRICE_SOL,
    '/x402/pa': MOVE_PRICE_SOL,
    '/x402/rs': MOVE_PRICE_SOL,
    '/x402/me': MOVE_PRICE_SOL,
    '/x402/ai-move': AI_MOVE_PRICE_SOL,
  };

  if (req.method === 'POST'
      && (req.url === '/x402/ai-move' || req.url === '/x402/ai-strategy-advice')
      && !process.env.ANTHROPIC_API_KEY) {
    cors();
    res.writeHead(503, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: false, error: 'AI not configured (ANTHROPIC_API_KEY missing)' }));
    return;
  }

  if (req.method === 'POST' && X402_ROUTES[req.url] !== undefined) {
    cors();

    const ip = req.socket?.remoteAddress || 'unknown';
    const rl = checkHttpRateLimit(ip);
    if (rl.limited) {
      res.setHeader('Retry-After', String(rl.retryAfter));
      res.writeHead(429, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: false, error: 'rate limited', retryAfter: rl.retryAfter }));
      return;
    }

    const amountSol      = X402_ROUTES[req.url];
    const amountLamports = Math.floor(amountSol * LAMPORTS_PER_SOL);
    const body         = await _readBody(req);
    const playerPubkey = body.playerPubkey || req.headers['x-player-pubkey'] || '';
    const signature    = body.signature    || req.headers['x-payment']       || '';

    if (signature && !playerPubkey) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: false, error: 'playerPubkey required' }));
      return;
    }
    if (playerPubkey && !signature) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: false, error: 'signature required' }));
      return;
    }

    const result = await _verifyX402Payment(playerPubkey, amountSol, req.url, signature || null);

    if (!result.ok) {
      const opsLamports  = Math.floor(amountLamports * 0.5);
      const poolLamports = amountLamports - opsLamports;
      const paymentRequired = Buffer.from(JSON.stringify({
        version: 'x402-v2',
        accepts: [{
          scheme:  'solana-transfer',
          network: SOLANA_NETWORK,
          amount:  String(amountLamports),
          payTo:   OPS_TREASURY_ADDR,
          recipient: {
            ops:  { address: OPS_TREASURY_ADDR,  lamports: opsLamports  },
            pool: { address: PRIZE_POOL_ADDR,     lamports: poolLamports },
          },
        }],
      })).toString('base64');
      res.setHeader('PAYMENT-REQUIRED',    paymentRequired);
      res.setHeader('X-Payment-Recipient', OPS_TREASURY_ADDR);
      res.setHeader('X-Payment-Amount',    String(amountLamports));
      res.setHeader('X-Payment-Network',   SOLANA_NETWORK);
      res.writeHead(402, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: false, error: result.error }));
      return;
    }

    if (MOVE_ENDPOINTS.has(req.url)) {
      const memoStr = result.demo ? (body.memo || '') : (result.memo || body.memo || '');
      if (!result.demo && memoStr) {
        const memoCheck = validateMemo(memoStr, req.url);
        if (!memoCheck.ok) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ ok: false, error: memoCheck.error }));
          return;
        }
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true, memo: memoStr, fields: memoCheck.fields, sig: result.sig }));
        return;
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true, memo: memoStr, demo: result.demo }));
      return;
    }

    if (req.url === '/x402/ai-move') {
      let aiResult;
      try {
        const { delegateMove } = await import('../tools/ai-agent/src/move-delegate.js');
        aiResult = await delegateMove(body.public_state ?? {});
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: false, error: 'AI delegation failed: ' + err.message }));
        return;
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true, ...aiResult, sig: result.sig, demo: result.demo }));
      return;
    }

    if (req.url === '/x402/ai-strategy-advice') {
      let adviceResult;
      try {
        const { adviseStrategy } = await import('../tools/ai-agent/src/strategy-advisor.js');
        adviceResult = await adviseStrategy(body.context ?? body.public_state ?? {});
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: false, error: 'AI strategy advice failed: ' + err.message }));
        return;
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true, ...adviceResult, sig: result.sig, demo: result.demo }));
      return;
    }

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true, action: body.action ?? 'unknown', sig: result.sig, demo: result.demo }));
    return;
  }

  res.writeHead(404); res.end('Not found');
});

// ─── WebSocket server (omitted for brevity — no x402 logic) ─────────────────
// See full file: multiplayer/server.js
```

---

## 3. solana/client/src/lib/x402-memo.js

```javascript
// x402-memo.js — SPL Memo helper for x402 endpoint binding
// Dual-mode: browser (CDN globals → window.x402Memo) or Node CJS (require)

const SPL_MEMO_V2 = 'MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr';

function generateNonce() {
  const uuid = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`;
  return uuid.replace(/-/g, '');
}

function formatMemo(endpoint, nonce) {
  return `endpoint:${endpoint};nonce:${nonce}`;
}

function buildMemoIx({ solanaWeb3, endpoint, nonce }) {
  const { TransactionInstruction, PublicKey } = solanaWeb3;
  const memoStr = formatMemo(endpoint, nonce);
  const data = typeof TextEncoder !== 'undefined'
    ? new TextEncoder().encode(memoStr)
    : Buffer.from(memoStr, 'utf8');
  return new TransactionInstruction({ programId: new PublicKey(SPL_MEMO_V2), keys: [], data });
}

if (typeof module !== 'undefined') {
  module.exports = { generateNonce, formatMemo, buildMemoIx, SPL_MEMO_V2 };
} else if (typeof window !== 'undefined') {
  window.x402Memo = { generateNonce, formatMemo, buildMemoIx };
}
```

---

## 4. docs/X402_INTEGRATION_LOG.md

*(See full file at docs/X402_INTEGRATION_LOG.md in the repository)*

### Key sections summary:

**Endpoint table:**

| Endpoint | Price (SOL) |
|----------|-------------|
| `/x402/match-battle` | 0.001 |
| `/x402/peek-vault-size` | 0.0005 |
| `/x402/peek-vault-content` | 0.005 |
| `/x402/draw-extra` | 0.01 |
| `/x402/ai-strategy-advice` | 0.003 |
| `/x402/co..me` (move) | 0.0001 |
| `/x402/ai-move` | 0.005 |

**Payment flow:**
1. Client → POST (no payment) → 402 + PAYMENT-REQUIRED (Base64 JSON)
2. Client builds tx: `transfer(ops, 50%) + transfer(pool, 50%) + SPL Memo`
3. Client signs + sends
4. Client → POST + `X-Payment: <sig>` → 200 OK

**Replay prevention:** `usedSigs` Map with 120s TTL

**Memo endpoint binding:** `endpoint:/x402/<path>;nonce:<uuid>` in SPL Memo ix  
Enforced only when `X402_REQUIRE_MEMO=true`

---

## Review Notes for GPT

**Architecture questions to evaluate:**

1. **Replay attack surface**: `usedSigs` is in-memory (Map), resets on server restart. No on-chain record. Is the 120s TTL + `X402_MAX_AGE_MS=60s` window sufficient?

2. **Split payment H10 validation**: Client validates split amounts against server-declared total. But server *declares* the split. Can a malicious server declare a smaller total than expected?

3. **Memo binding** (`X402_REQUIRE_MEMO=false` default): Move endpoints use compact memo (`e:/x402/co;m:matchId;r:round;...`), not the `endpoint:/x402/co;nonce:...` format in `_x402Pay`. Are these two memo formats consistent or could the validator reject valid memos?

4. **`_payMove` vs `_x402Pay`**: Phase 12 move endpoints use `_payMove` (older helper, single-recipient spec header). Phase 19 endpoints use `_x402Pay` (split payment, Base64 PAYMENT-REQUIRED). Mixed client paths — are there cases where the wrong function is called?

5. **`hireAgent`/`scoutPeek`**: Parse `X-Payment-Required` as raw JSON (not Base64). Server sends Base64 `PAYMENT-REQUIRED` for Phase 19 routes. These legacy functions may be incompatible with the current server's 402 response format.

6. **`local-dev-bypass`**: `hireAgentDev`/`scoutPeekDev` send `'local-dev-bypass'` as `X-Payment` header. Server's `_verifyX402Payment` doesn't explicitly handle this token — it would attempt on-chain lookup of a non-existent signature. Is bypass handled elsewhere?

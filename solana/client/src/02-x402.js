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

// C2: Client-side price floor — server-declared amounts are validated against these.
// If the server declares less than the expected amount, payment is refused.
// Amounts in lamports (1 SOL = 1_000_000_000 lamports).
const EXPECTED_PRICES = Object.freeze({
  '/x402/match-battle':             1_000_000,  // 0.001 SOL
  '/x402/peek-vault-size':            500_000,  // 0.0005 SOL
  '/x402/peek-vault-content':       5_000_000,  // 0.005 SOL
  '/x402/draw-extra':              10_000_000,  // 0.01 SOL
  '/x402/ai-strategy-advice':       3_000_000,  // 0.003 SOL
  '/x402/ai-move':                  5_000_000,  // 0.005 SOL
  '/x402/co': 100_000, '/x402/re': 100_000, '/x402/hc': 100_000,
  '/x402/hr': 100_000, '/x402/pa': 100_000, '/x402/rs': 100_000,
  '/x402/me': 100_000,
  '/x402/extra-action':            10_000_000,
  '/x402/scout-peek':               5_000_000,
  '/x402/counter-peek':             3_000_000,
});

/**
 * Scout peek — pay 0.005 SOL to reveal one card held by a target player.
 *
 * @param {string|number} gameId   - On-chain game_id
 * @param {string}        target   - Target player's base58 pubkey
 * @param {object}        wallet   - Wallet adapter (must have signAndSendTransaction)
 * @param {object}        conn     - @solana/web3.js Connection
 * @returns {{ revealed: {id,name}|null, totalCards, area, timestamp }}
 */
async function scoutPeek(gameId, target, wallet, conn) {
  const { Transaction, SystemProgram, PublicKey } = window.solanaWeb3 ?? {};
  if (!Transaction) throw new Error('solanaWeb3 not found on window');

  const fromPk       = new PublicKey(wallet.publicKey.toString());
  const playerPubkey = fromPk.toBase58();

  // ── Step 1: probe endpoint to get x402 payment spec ──────────────────────
  const probe = await fetch(`${X402_BROKER_URL}/scout-peek`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ game_id: gameId, target_pubkey: target }),
  });

  if (probe.status !== 402) {
    if (probe.ok) return probe.json();
    throw new Error(`Unexpected status ${probe.status} from scout-peek`);
  }

  const paymentSpec = _parsePaymentRequiredHeader(probe.headers.get('X-Payment-Required') || probe.headers.get('PAYMENT-REQUIRED'));
  const lamports = paymentSpec.amount ?? 5_000_000;

  // ── Step 2: build + sign SOL transfer + memo ──────────────────────────────
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

  // ── Step 3: retry with payment proof ─────────────────────────────────────
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
 *
 * Flow:
 *   1. POST /agent-hire → 402 + payment spec
 *   2. Pay 0.05 SOL to broker wallet
 *   3. POST /agent-hire with X-Payment → session details
 *   4. Caller should call register_agent_hire on-chain with payment_sig
 *
 * @param {number}  agentId         - AgentListing agent_id
 * @param {string|number} gameId    - Game session ID (optional, pass 0 if none)
 * @param {number}  durationSeconds - Hire duration in seconds (default 3600)
 * @param {object}  wallet          - Wallet adapter (signTransaction)
 * @param {object}  conn            - @solana/web3.js Connection
 * @returns {{ hire_session_id, agent_id, expires_at, payment_sig, agent_endpoint }}
 */
async function hireAgent(agentId, gameId, durationSeconds = 3600, wallet, conn) {
  const { Transaction, SystemProgram, PublicKey } = window.solanaWeb3 ?? {};
  if (!Transaction) throw new Error('solanaWeb3 not found on window');

  const fromPk       = new PublicKey(wallet.publicKey.toString());
  const playerPubkey = fromPk.toBase58();
  const probeBody    = JSON.stringify({ agent_id: agentId, game_id: gameId, duration_seconds: durationSeconds, hirer_pubkey: playerPubkey });

  // ── Step 1: probe to get payment spec ────────────────────────────────────
  const probe = await fetch(`${X402_BROKER_URL}/agent-hire`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: probeBody,
  });

  if (probe.status !== 402) {
    if (probe.ok) return probe.json();
    throw new Error(`Unexpected status ${probe.status} from agent-hire`);
  }

  const paymentSpec = _parsePaymentRequiredHeader(probe.headers.get('X-Payment-Required') || probe.headers.get('PAYMENT-REQUIRED'));
  const lamports = paymentSpec.amount ?? 50_000_000;

  // ── Step 2: pay 0.05 SOL + memo ──────────────────────────────────────────
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

  // ── Step 3: retry with payment proof ─────────────────────────────────────
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

/**
 * Dev helper: hire agent with local-dev-bypass (no real payment).
 */
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

/**
 * Dev helper: scout peek with local-dev-bypass (no real payment).
 * Only works when broker is running with bypass enabled.
 */
async function scoutPeekDev(gameId, target) {
  const res = await fetch(`${X402_BROKER_URL}/scout-peek`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Payment': 'local-dev-bypass',
    },
    body: JSON.stringify({ game_id: gameId, target_pubkey: target }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.reason ?? `scout-peek dev failed: ${res.status}`);
  }
  return res.json();
}

// ─── Security helpers ─────────────────────────────────────────────────────────

// H1: Parse PAYMENT-REQUIRED header — handles Base64 JSON (v2) and raw JSON (legacy).
function _parsePaymentRequiredHeader(headerValue) {
  if (!headerValue) return {};
  try { return JSON.parse(atob(headerValue)); } catch (_) {}
  try { return JSON.parse(headerValue); } catch (_) {}
  return {};
}

// H3: Allowlist of known treasury addresses. Set window.OXARK_ALLOWED_TREASURIES (string[]).
// When set, any address not in the list causes payment to be refused (MITM protection).
const ALLOWED_TREASURIES = (typeof window !== 'undefined' && Array.isArray(window.OXARK_ALLOWED_TREASURIES))
  ? new Set(window.OXARK_ALLOWED_TREASURIES)
  : null;

function _validateRecipient(addr, source) {
  _requireTreasuryAddress(addr, source);  // H4: rejects null / System Program
  if (ALLOWED_TREASURIES && !ALLOWED_TREASURIES.has(addr)) {
    throw new Error(`Recipient not in allowed treasury list (${source}): ${addr}`);
  }
  return addr;
}

// H5: Reject endpoint paths with illegal chars, wrong prefix, or excessive length.
function _sanitizeMemoEndpoint(path) {
  if (!path || path.length > 64) throw new Error(`Invalid endpoint path: too long or empty`);
  if (!path.startsWith('/x402/')) throw new Error(`Invalid endpoint path: must start with /x402/`);
  const sanitized = path.replace(/[^a-zA-Z0-9/_-]/g, '');
  if (sanitized !== path) throw new Error(`Invalid endpoint path: ${path}`);
  return sanitized;
}

// H5: Validate nonce format — must be 16–64 chars of hex or UUID form.
function _sanitizeNonce(nonce) {
  if (!nonce || nonce.length < 16 || nonce.length > 64) {
    throw new Error(`Invalid nonce: length must be 16–64 chars`);
  }
  if (!/^[a-f0-9-]+$/i.test(nonce)) {
    throw new Error(`Invalid nonce: must be hex or UUID format`);
  }
  return nonce;
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

// C2: Validate that server-declared total lamports match the known price for this endpoint.
// Prevents a malicious server from under-declaring the required payment.
function _validateExpectedPrice(endpoint, declaredLamports) {
  const expected = EXPECTED_PRICES[endpoint];
  if (expected === undefined) return; // unknown endpoint — allow (new endpoints not yet in map)
  if (declaredLamports < expected) {
    throw new Error(`Payment price mismatch for ${endpoint}: expected >=${expected} lamports, server declared ${declaredLamports}`);
  }
  if (declaredLamports > expected * 1.01) {
    throw new Error(`Payment price excessive for ${endpoint}: expected ${expected} lamports, server declared ${declaredLamports}`);
  }
}

// H4: Never fall back to the System Program address as a payment recipient.
// '11111111111111111111111111111111' is Solana's System Program — any SOL sent there is burned.
function _requireTreasuryAddress(addr, source) {
  if (!addr || addr === '11111111111111111111111111111111') {
    throw new Error(`Treasury address missing or unsafe (${source}): refusing payment to System Program`);
  }
  return addr;
}

// C5: Unified memo format for all x402 endpoints.
// Format: "endpoint=<path>;nonce=<uuid>;v=1"
function _buildMemoStr(endpoint, nonce) {
  const safeEndpoint = _sanitizeMemoEndpoint(endpoint);
  const safeNonce    = _sanitizeNonce(nonce);
  return `endpoint=${safeEndpoint};nonce=${safeNonce};v=1`;
}

// ─── Phase 12: move memo payment helpers ─────────────────────────────────────
// Each function pays 0.0001 SOL (or server-configured price) and attaches the
// unified memo as an SPL Memo instruction in the payment tx.
// WS broadcast continues in parallel via existing handlers (dual-write).

const MOVE_ENDPOINTS = ['/x402/co', '/x402/re', '/x402/hc', '/x402/hr', '/x402/pa', '/x402/rs', '/x402/me'];

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

/**
 * Pay for a move endpoint with the compact memo attached.
 * Generic helper used by all 7 move functions below.
 *
 * @param {string} endpoint      - e.g. '/x402/co'
 * @param {object} memoFields    - key-value pairs (excluding 'e' and 'n')
 * @param {object} wallet        - wallet adapter
 * @param {object} conn          - @solana/web3.js Connection
 * @returns {{ ok, memo, fields?, sig?, demo? }}
 */
async function _payMove(endpoint, memoFields, wallet, conn) {
  const { Transaction, SystemProgram, PublicKey, TransactionInstruction } = window.solanaWeb3 ?? {};
  if (!Transaction) throw new Error('solanaWeb3 not found on window');

  const fromPk       = new PublicKey(wallet.publicKey.toString());
  const playerPubkey = fromPk.toBase58();
  // C5: unified memo format
  const memoStr      = _buildMemoStr(endpoint, _generateNonce());

  // ── Probe to get payment spec ─────────────────────────────────────────────
  const probe = await fetch(`${X402_BROKER_URL}${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ playerPubkey, memo: memoStr }),
  });
  if (probe.ok) return probe.json();
  if (probe.status !== 402) throw new Error(`Unexpected status ${probe.status} from ${endpoint}`);

  // H1: parse Base64 or raw JSON header; try both header names
  const spec     = _parsePaymentRequiredHeader(probe.headers.get('PAYMENT-REQUIRED') || probe.headers.get('X-Payment-Required'));
  const lamports = spec.accepts?.[0]?.amount ? parseInt(spec.accepts[0].amount, 10) : 100_000;
  // C2: validate against known price; H3+H4: allowlist + refuse System Program address
  _validateExpectedPrice(endpoint, lamports);
  const toPk = new PublicKey(_validateRecipient(spec.accepts?.[0]?.payTo, 'PAYMENT-REQUIRED'));

  // ── Build tx with payment + memo ──────────────────────────────────────────
  const { blockhash } = await conn.getLatestBlockhash('confirmed');
  const tx = new Transaction({ recentBlockhash: blockhash, feePayer: fromPk });
  tx.add(SystemProgram.transfer({ fromPubkey: fromPk, toPubkey: toPk, lamports }));
  tx.add(new TransactionInstruction({
    programId: new PublicKey('MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr'),
    keys: [],
    data: (() => {
      const enc = new TextEncoder();
      return enc.encode(memoStr);
    })(),
  }));

  const signed = await wallet.signTransaction(tx);
  const sig    = await conn.sendRawTransaction(signed.serialize());
  await conn.confirmTransaction(sig, 'confirmed');

  // ── Retry with payment proof ──────────────────────────────────────────────
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
// Handles 402→pay→retry cycle. Supports split-recipient (ops + pool) or single payTo.

function _getDefaultConn() {
  const { Connection } = window.solanaWeb3 ?? {};
  if (!Connection) throw new Error('solanaWeb3 not loaded');
  return new Connection('https://api.devnet.solana.com', 'confirmed');
}

/**
 * Unified x402 payment flow for any endpoint.
 *
 * @param {string} endpoint   - e.g. '/x402/match-battle'
 * @param {object} body       - request body for the final retry POST
 * @param {object} [wallet]   - wallet adapter (defaults to window.solana)
 * @param {object} [conn]     - Connection (defaults to devnet)
 * @returns {Promise<object>} - server response JSON
 */
async function _x402Pay(endpoint, body = {}, wallet, conn) {
  const { Transaction, SystemProgram, PublicKey, TransactionInstruction } = window.solanaWeb3 ?? {};
  if (!Transaction) throw new Error('solanaWeb3 not loaded');

  const w      = wallet ?? window.solana;
  const c      = conn   ?? _getDefaultConn();
  if (!w?.isConnected && !w?.publicKey) throw new Error('Wallet not connected');

  const fromPk       = new PublicKey(w.publicKey.toString());
  const playerPubkey = fromPk.toBase58();

  // ── 1. Probe to get payment spec ─────────────────────────────────────────
  const probeRes = await fetch(`${X402_BROKER_URL}${endpoint}`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ ...body, playerPubkey }),
  });

  if (probeRes.ok) return probeRes.json(); // Already paid or server skip
  if (probeRes.status !== 402) {
    const errBody = await probeRes.json().catch(() => ({}));
    throw Object.assign(new Error(errBody.error ?? `x402 ${endpoint} returned ${probeRes.status}`), { code: 'ServerError' });
  }

  // ── 2. Parse PAYMENT-REQUIRED header (H1: handles Base64 or raw JSON) ────
  const specRaw = probeRes.headers.get('PAYMENT-REQUIRED') || probeRes.headers.get('X-Payment-Required');
  const spec = _parsePaymentRequiredHeader(specRaw);

  const accepts = spec.accepts?.[0] ?? {};
  const totalLamports = parseInt(accepts.amount, 10)
    || parseInt(probeRes.headers.get('X-Payment-Amount'), 10)
    || 0;

  // C2: Validate server-declared price against known expected price for this endpoint.
  _validateExpectedPrice(endpoint, totalLamports);

  // ── 3. Build transaction ──────────────────────────────────────────────────
  const { blockhash } = await c.getLatestBlockhash('confirmed');
  const tx = new Transaction({ recentBlockhash: blockhash, feePayer: fromPk });

  const splitRecipient = accepts.recipient;
  if (splitRecipient?.ops && splitRecipient?.pool
      && splitRecipient.ops.address !== splitRecipient.pool.address) {
    // H10: Verify split amounts are not under-declared by the server.
    _validatePaymentSplit(splitRecipient, totalLamports);
    // H3+H4: Allowlist + refuse System Program address as payment recipient.
    tx.add(SystemProgram.transfer({
      fromPubkey: fromPk,
      toPubkey:   new PublicKey(_validateRecipient(splitRecipient.ops.address, 'split.ops')),
      lamports:   splitRecipient.ops.lamports,
    }));
    tx.add(SystemProgram.transfer({
      fromPubkey: fromPk,
      toPubkey:   new PublicKey(_validateRecipient(splitRecipient.pool.address, 'split.pool')),
      lamports:   splitRecipient.pool.lamports,
    }));
  } else {
    // Single payment (backward compat or same address)
    const payTo = accepts.payTo || probeRes.headers.get('X-Payment-Recipient');
    // H3+H4: Allowlist + refuse System Program address as payment recipient.
    tx.add(SystemProgram.transfer({
      fromPubkey: fromPk,
      toPubkey:   new PublicKey(_validateRecipient(payTo, 'payTo')),
      lamports:   totalLamports,
    }));
  }

  // C5: Unified memo format "endpoint=<path>;nonce=<uuid>;v=1"
  const nonce   = _generateNonce();
  const memoStr = _buildMemoStr(endpoint, nonce);
  tx.add(new TransactionInstruction({
    programId: new PublicKey('MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr'),
    keys: [],
    data: new TextEncoder().encode(memoStr),
  }));

  // ── 4. Sign + send ────────────────────────────────────────────────────────
  const signed = await w.signTransaction(tx);
  const sig    = await c.sendRawTransaction(signed.serialize());
  await c.confirmTransaction(sig, 'confirmed');

  // ── 5. Retry with payment proof ───────────────────────────────────────────
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

// ─── Phase 19: new game-design-v2 §3 endpoint wrappers ───────────────────────

/** Pay 0.001 SOL to start a ranked match battle. */
async function payMatchBattle(body = {}) {
  return _x402Pay('/x402/match-battle', body);
}

/** Pay 0.0005 SOL to peek an opponent's vault card count. targetPubkey: base58 */
async function payPeekVaultSize(targetPubkey, body = {}) {
  return _x402Pay('/x402/peek-vault-size', { target_pubkey: targetPubkey, ...body });
}

/** Pay 0.005 SOL to reveal the contents of an opponent's vault. targetPubkey: base58 */
async function payPeekVaultContent(targetPubkey, body = {}) {
  return _x402Pay('/x402/peek-vault-content', { target_pubkey: targetPubkey, ...body });
}

/** Pay 0.01 SOL to draw an extra card this round. */
async function payDrawExtra(body = {}) {
  return _x402Pay('/x402/draw-extra', body);
}

/** Pay 0.003 SOL to get AI strategic advice for the current game state. */
async function payAiStrategyAdvice(context = {}) {
  return _x402Pay('/x402/ai-strategy-advice', { public_state: context });
}

/** POST /x402/co — action commit */
async function payCommit({ matchId, round, playerSide = 's', hash }, wallet, conn) {
  return _payMove('/x402/co', { m: matchId, r: round, p: playerSide, h: hash }, wallet, conn);
}

/** POST /x402/re — action reveal */
async function payReveal({ matchId, round, playerSide = 's', actionType, target, salt }, wallet, conn) {
  return _payMove('/x402/re', { m: matchId, r: round, p: playerSide, a: actionType, g: target, s: salt }, wallet, conn);
}

/** POST /x402/hc — hand commit (Poseidon) */
async function payHandCommit({ matchId, round, commitment }, wallet, conn) {
  return _payMove('/x402/hc', { m: matchId, r: round, c: commitment }, wallet, conn);
}

/** POST /x402/hr — hand reveal */
async function payHandReveal({ matchId, round, cardIds }, wallet, conn) {
  return _payMove('/x402/hr', { m: matchId, r: round, i: cardIds.join(',') }, wallet, conn);
}

/** POST /x402/pa — phase advance (host only) */
async function payPhaseAdvance({ matchId, round, phase }, wallet, conn) {
  return _payMove('/x402/pa', { m: matchId, r: round, p: phase }, wallet, conn);
}

/** POST /x402/rs — round resolve (host only) */
async function payRoundResolve({ matchId, round, p1Delta, p2Delta }, wallet, conn) {
  return _payMove('/x402/rs', { m: matchId, r: round, d: `${p1Delta}/${p2Delta}` }, wallet, conn);
}

/** POST /x402/me — match end (host only). Accepts wallet+conn for legacy callers. */
async function payMatchEnd({ matchId, winner }, wallet, conn) {
  // Phase 19: prefer _x402Pay (split payment); fall back to _payMove for old API
  if (!wallet && !conn) {
    return _x402Pay('/x402/me', { m: matchId, w: winner });
  }
  return _payMove('/x402/me', { m: matchId, w: winner }, wallet, conn);
}

/** POST /x402/ai-move — delegate battle move to AI (0.005 SOL) */
async function payAiMove({ matchId, round, publicState }, wallet, conn) {
  const { Transaction, SystemProgram, PublicKey } = window.solanaWeb3 ?? {};
  if (!Transaction) throw new Error('solanaWeb3 not found on window');

  const fromPk       = new PublicKey(wallet.publicKey.toString());
  const playerPubkey = fromPk.toBase58();
  const endpoint     = '/x402/ai-move';

  // Probe — check payment spec (or early 503 if AI not configured)
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
  // C2: validate price; H3+H4: allowlist + refuse System Program address
  _validateExpectedPrice(endpoint, lamports);
  const toPk = new PublicKey(_validateRecipient(recipientHeader, 'X-Payment-Recipient'));

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
  // Phase 19: game-design-v2 §3 endpoints (real SOL, split payment)
  payMatchBattle,
  payPeekVaultSize,
  payPeekVaultContent,
  payDrawExtra,
  payAiStrategyAdvice,
  // Phase 12: move memo endpoints
  payCommit, payReveal, payHandCommit, payHandReveal,
  payPhaseAdvance, payRoundResolve, payMatchEnd,
  // Phase 14: AI move delegation
  payAiMove,
  // Legacy / dev helpers
  scoutPeek, scoutPeekDev, hireAgent, hireAgentDev,
  // Internals (exposed for testing)
  X402_BROKER_URL, _x402Pay,
  _parsePaymentRequiredHeader, _validateRecipient,
  _sanitizeMemoEndpoint, _sanitizeNonce, _buildMemoStr,
};

if (typeof module !== 'undefined') {
  module.exports = _x402Exports;
} else if (typeof window !== 'undefined') {
  window.x402 = _x402Exports;
}

/**
 * 02-x402.js — x402 micropayment client for 0xARK
 *
 * Handles the full x402 HTTP-402 flow:
 *   1. POST /scout-peek  →  402 + X-Payment-Required header
 *   2. User approves SOL payment (0.005 SOL)
 *   3. Retry with X-Payment: <tx_sig>
 *   4. Server verifies on-chain, returns revealed card
 *
 * Dependencies: window.solana (Phantom/Backpack wallet adapter)
 */

const X402_BROKER_URL = typeof window !== 'undefined'
  ? (window.X402_BROKER_URL || 'http://localhost:3402')
  : 'http://localhost:3402';

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

  const paymentSpec = JSON.parse(probe.headers.get('X-Payment-Required') || '{}');
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

  const paymentSpec = JSON.parse(probe.headers.get('X-Payment-Required') || '{}');
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

// ─── Phase 12: move memo payment helpers ─────────────────────────────────────
// Each function pays 0.0001 SOL (or server-configured price) and attaches the
// compact move memo as an SPL Memo instruction in the payment tx.
// WS broadcast continues in parallel via existing handlers (dual-write).

const MOVE_ENDPOINTS = ['/x402/co', '/x402/re', '/x402/hc', '/x402/hr', '/x402/pa', '/x402/rs', '/x402/me'];

function _buildMoveMemoStr(endpoint, fields) {
  const nonce = _generateNonce();
  const parts  = [`e:${endpoint}`];
  for (const [k, v] of Object.entries(fields)) parts.push(`${k}:${v}`);
  parts.push(`n:${nonce}`);
  return parts.join(';');
}

function _generateNonce() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID().replace(/-/g, '');
  }
  return Math.random().toString(36).slice(2).padEnd(16, '0');
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
  const memoStr      = _buildMoveMemoStr(endpoint, memoFields);

  // ── Probe to get payment spec ─────────────────────────────────────────────
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

// Fallback treasury for probes before spec is known (only used for toPk estimation)
const TREASURY_ADDR_FALLBACK = '11111111111111111111111111111111';

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

/** POST /x402/me — match end (host only) */
async function payMatchEnd({ matchId, winner }, wallet, conn) {
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

// Export for both ESM browser and Node.js test environments
if (typeof module !== 'undefined') {
  module.exports = {
    scoutPeek, scoutPeekDev, hireAgent, hireAgentDev, X402_BROKER_URL,
    payCommit, payReveal, payHandCommit, payHandReveal,
    payPhaseAdvance, payRoundResolve, payMatchEnd, payAiMove,
  };
} else if (typeof window !== 'undefined') {
  window.x402 = {
    scoutPeek, scoutPeekDev, hireAgent, hireAgentDev,
    payCommit, payReveal, payHandCommit, payHandReveal,
    payPhaseAdvance, payRoundResolve, payMatchEnd, payAiMove,
  };
}

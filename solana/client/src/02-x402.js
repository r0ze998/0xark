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
  // ── Step 1: probe endpoint to get x402 payment spec ──────────────────────
  const probe = await fetch(`${X402_BROKER_URL}/scout-peek`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ game_id: gameId, target_pubkey: target }),
  });

  if (probe.status !== 402) {
    // Already paid or endpoint changed — try to use the response directly
    if (probe.ok) return probe.json();
    throw new Error(`Unexpected status ${probe.status} from scout-peek`);
  }

  const paymentSpec = JSON.parse(probe.headers.get('X-Payment-Required') || '{}');
  const lamports = paymentSpec.amount ?? 5_000_000;

  // ── Step 2: build + sign SOL transfer to broker wallet ────────────────────
  const { Transaction, SystemProgram, PublicKey, LAMPORTS_PER_SOL } = window.solanaWeb3 ?? {};
  if (!Transaction) throw new Error('solanaWeb3 not found on window');

  const fromPk = new PublicKey(wallet.publicKey.toString());
  const toPk   = new PublicKey(paymentSpec.recipient);

  const { blockhash } = await conn.getLatestBlockhash('confirmed');
  const tx = new Transaction({ recentBlockhash: blockhash, feePayer: fromPk });
  tx.add(SystemProgram.transfer({ fromPubkey: fromPk, toPubkey: toPk, lamports }));

  const signed = await wallet.signTransaction(tx);
  const sig = await conn.sendRawTransaction(signed.serialize());
  await conn.confirmTransaction(sig, 'confirmed');

  // ── Step 3: retry with payment signature ─────────────────────────────────
  const paid = await fetch(`${X402_BROKER_URL}/scout-peek`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Payment': sig,
    },
    body: JSON.stringify({ game_id: gameId, target_pubkey: target }),
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
  const hirePubkey = wallet.publicKey.toString();

  // ── Step 1: probe to get payment spec ────────────────────────────────────
  const body = JSON.stringify({ agent_id: agentId, game_id: gameId, duration_seconds: durationSeconds, hirer_pubkey: hirePubkey });
  const probe = await fetch(`${X402_BROKER_URL}/agent-hire`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
  });

  if (probe.status !== 402) {
    if (probe.ok) return probe.json();
    throw new Error(`Unexpected status ${probe.status} from agent-hire`);
  }

  const paymentSpec = JSON.parse(probe.headers.get('X-Payment-Required') || '{}');
  const lamports = paymentSpec.amount ?? 50_000_000;

  // ── Step 2: pay 0.05 SOL ─────────────────────────────────────────────────
  const { Transaction, SystemProgram, PublicKey } = window.solanaWeb3 ?? {};
  if (!Transaction) throw new Error('solanaWeb3 not found on window');

  const fromPk = new PublicKey(hirePubkey);
  const toPk   = new PublicKey(paymentSpec.recipient);

  const { blockhash } = await conn.getLatestBlockhash('confirmed');
  const tx = new Transaction({ recentBlockhash: blockhash, feePayer: fromPk });
  tx.add(SystemProgram.transfer({ fromPubkey: fromPk, toPubkey: toPk, lamports }));

  const signed = await wallet.signTransaction(tx);
  const sig = await conn.sendRawTransaction(signed.serialize());
  await conn.confirmTransaction(sig, 'confirmed');

  // ── Step 3: retry with payment proof ─────────────────────────────────────
  const paid = await fetch(`${X402_BROKER_URL}/agent-hire`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Payment': sig },
    body,
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

// Export for both ESM browser and Node.js test environments
if (typeof module !== 'undefined') {
  module.exports = { scoutPeek, scoutPeekDev, hireAgent, hireAgentDev, X402_BROKER_URL };
} else if (typeof window !== 'undefined') {
  window.x402 = { scoutPeek, scoutPeekDev, hireAgent, hireAgentDev };
}

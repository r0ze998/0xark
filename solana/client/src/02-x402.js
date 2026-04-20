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
  module.exports = { scoutPeek, scoutPeekDev, X402_BROKER_URL };
} else if (typeof window !== 'undefined') {
  window.x402 = { scoutPeek, scoutPeekDev };
}

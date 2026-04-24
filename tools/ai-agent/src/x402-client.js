/**
 * x402-client.js — Agent Direct x402 Payment Client
 *
 * Allows the AI agent to independently pay for Scout Peek via x402 (Phase 1.5).
 * Agent uses its own Keypair to transfer SOL directly to the broker wallet.
 *
 * Activated by AGENT_DIRECT_X402=true.
 * When false (default), existing client-side fallback is used unchanged.
 *
 * Phase 1 (now):   Agent pays SOL, gets peek data. Client still controls keys.
 * Phase 2 (S2):    Agent holds its own wallet, signs transactions autonomously.
 *
 * Environment:
 *   AGENT_DIRECT_X402   — 'true' to enable (default: false)
 *   X402_BROKER_URL     — broker base URL (default: http://localhost:3402)
 *   AGENT_PRIVATE_KEY   — base58 secret key for agent wallet (required when enabled)
 *   SOLANA_RPC_URL      — RPC endpoint (default: https://api.devnet.solana.com)
 *   BROKER_WALLET       — recipient wallet pubkey (default: DPMPhnVezSq5im35p4w3bC6XjpNZuuvCDVSAVxw4Q28R)
 *
 * Usage (from duel-agent.js):
 *   import { x402ScoutPeek } from './src/x402-client.js';
 *   const result = await x402ScoutPeek({ playerId: 'opponent-wallet-pubkey' });
 */

// ─── Config ──────────────────────────────────────────────────────────────────

const ENABLED      = process.env.AGENT_DIRECT_X402 === 'true';
const BROKER_URL   = process.env.X402_BROKER_URL  || 'http://localhost:3402';
const BROKER_WALLET = process.env.BROKER_WALLET   || 'DPMPhnVezSq5im35p4w3bC6XjpNZuuvCDVSAVxw4Q28R';
const RPC_URL      = process.env.SOLANA_RPC_URL   || 'https://api.devnet.solana.com';
const SCOUT_PEEK_SOL = 0.005;
const SCOUT_PEEK_LAMPORTS = Math.floor(SCOUT_PEEK_SOL * 1_000_000_000);

// ─── Solana helpers (lazy-loaded — no crash when disabled) ────────────────────

let _solana = null;
async function _getSolana() {
  if (!_solana) {
    const web3 = await import('@solana/web3.js');
    _solana = web3;
  }
  return _solana;
}

// ─── Agent Keypair ────────────────────────────────────────────────────────────

let _agentKeypair = null;
async function _getAgentKeypair() {
  if (_agentKeypair) return _agentKeypair;
  const privateKeyB58 = process.env.AGENT_PRIVATE_KEY;
  if (!privateKeyB58) throw new Error('AGENT_PRIVATE_KEY env var required when AGENT_DIRECT_X402=true');
  const { Keypair } = await _getSolana();
  const bs58 = await import('bs58');
  const decoded = bs58.default.decode(privateKeyB58);
  _agentKeypair = Keypair.fromSecretKey(decoded);
  return _agentKeypair;
}

// ─── SOL Payment ─────────────────────────────────────────────────────────────

/**
 * Transfer SCOUT_PEEK_LAMPORTS from agent wallet to broker wallet.
 * Returns the confirmed transaction signature.
 */
async function _paySOL() {
  const { Connection, PublicKey, SystemProgram, Transaction, sendAndConfirmTransaction } = await _getSolana();
  const keypair    = await _getAgentKeypair();
  const connection = new Connection(RPC_URL, 'confirmed');
  const recipient  = new PublicKey(BROKER_WALLET);

  const tx = new Transaction().add(
    SystemProgram.transfer({
      fromPubkey: keypair.publicKey,
      toPubkey:   recipient,
      lamports:   SCOUT_PEEK_LAMPORTS,
    })
  );

  const sig = await sendAndConfirmTransaction(connection, tx, [keypair]);
  return sig;
}

// ─── x402 Scout Peek ─────────────────────────────────────────────────────────

/**
 * Attempt a Scout Peek via agent-direct x402 payment.
 *
 * Flow:
 *   1. GET /intel/location/:playerId → expect 402 with payment info
 *   2. Pay SOL from agent wallet
 *   3. GET /intel/location/:playerId with X-Payment: <txSig>
 *   4. Return peek data, or throw on failure
 *
 * @param {{ playerId: string }} opts
 * @returns {{ card: object, floor: number, sig: string }}
 */
export async function x402ScoutPeek({ playerId }) {
  if (!ENABLED) {
    throw new Error('AGENT_DIRECT_X402 is not enabled — use client-side fallback');
  }

  const url = `${BROKER_URL}/intel/location/${playerId}`;

  // Step 1: probe endpoint (expect 402)
  const probe = await fetch(url).catch(() => null);
  if (probe && probe.status !== 402 && probe.status !== 200) {
    throw new Error(`Broker returned unexpected status ${probe.status}`);
  }

  // Step 2: pay SOL
  const sig = await _paySOL();

  // Step 3: retry with payment header
  const paid = await fetch(url, {
    headers: { 'X-Payment': sig },
  });

  if (!paid.ok) {
    const body = await paid.text().catch(() => '');
    throw new Error(`Broker rejected payment: ${paid.status} ${body}`);
  }

  const data = await paid.json();
  return { ...data, sig };
}

// ─── Agent Info ───────────────────────────────────────────────────────────────

/**
 * Return agent wallet pubkey (or null if disabled/unconfigured).
 */
export async function agentWalletPubkey() {
  if (!ENABLED) return null;
  try {
    const kp = await _getAgentKeypair();
    return kp.publicKey.toBase58();
  } catch (_) {
    return null;
  }
}

/**
 * Check agent wallet SOL balance.
 */
export async function agentWalletBalance() {
  if (!ENABLED) return null;
  const { Connection } = await _getSolana();
  const kp = await _getAgentKeypair();
  const conn = new Connection(RPC_URL, 'confirmed');
  const lamports = await conn.getBalance(kp.publicKey);
  return lamports / 1_000_000_000;
}

// ─── Integration helper for duel-agent.js ────────────────────────────────────

/**
 * Call this from duel-agent.js instead of client-side Scout Peek when
 * AGENT_DIRECT_X402=true and the LLM decides use_scout_peek=true.
 *
 * Falls back gracefully to null (caller should use client-side path).
 *
 * @param {{ playerId: string, log: function }} opts
 * @returns {object|null}
 */
export async function tryAgentScoutPeek({ playerId, log = console.log }) {
  if (!ENABLED) return null;

  try {
    log('info', `[x402-agent] Attempting direct SOL payment (${SCOUT_PEEK_SOL} SOL) for scout peek`);
    const result = await x402ScoutPeek({ playerId });
    log('info', `[x402-agent] Scout peek SUCCESS — sig: ${result.sig}`);
    log('info', `[x402-agent] Peek data: ${JSON.stringify(result)}`);
    return result;
  } catch (err) {
    log('warn', `[x402-agent] Direct x402 failed (${err.message}) — using client-side fallback`);
    return null;
  }
}

// ─── Status export ────────────────────────────────────────────────────────────

export const x402Config = {
  enabled:        ENABLED,
  brokerUrl:      BROKER_URL,
  brokerWallet:   BROKER_WALLET,
  rpcUrl:         RPC_URL,
  scoutPeekSol:   SCOUT_PEEK_SOL,
};

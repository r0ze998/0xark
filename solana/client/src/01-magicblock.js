// ═══════════════════════════════════════
// MAGICBLOCK EPHEMERAL ROLLUPS — Client Utilities
// v465: Magic Router connection + delegation status + sendViaMagicRouter
// ═══════════════════════════════════════
// Architecture note (2026-04-20):
//   Full PDA delegation (Game/PlayerState/CardPool) requires Rust-side changes:
//     1. Add #[ephemeral] to the Anchor program module
//     2. Add delegate_session / undelegate_session instructions with #[delegate]/#[commit] macros
//   These stubs document the intended API; Rust integration is Phase C Day 2+.
//
//   What IS functional today (TypeScript-only path, Option A):
//     • Magic Router connection to devnet-router.magicblock.app
//     • sendViaMagicRouter() — auto-routes txs to ER if accounts are delegated,
//       otherwise falls back to base layer (transparent to caller)
//     • checkDelegationStatus() — query delegation state of any account
//     • mbDelegateGameAccounts() / mbUndelegateGameAccounts() — stubs (Rust req'd)
//
// Depends on: solanaWeb3 global (CDN IIFE), window.oxarkOnchain
// Exposes:    window.oxarkMB

// ─── Constants ────────────────────────────────────────────────────────────────
const MB_ROUTER_ENDPOINT = 'https://devnet-router.magicblock.app';
const MB_DELEGATION_PROGRAM_ID_STR = 'DELeGGvXpWV2fqJUhqcF5ZSYMS4JTLjteaAMARRSaeSh';
const MB_MAGIC_PROGRAM_ID_STR      = 'Magic11111111111111111111111111111111111111';
const MB_MAGIC_CONTEXT_ID_STR      = 'MagicContext1111111111111111111111111111111';

// Lazy singletons — created on first use to avoid top-level PublicKey calls
// before solanaWeb3 is fully loaded.
let _mbDelegationProgramId = null;
let _mbMagicProgramId      = null;
let _mbMagicContextId      = null;
let _mbRouterConnection    = null;

function mbDelegationProgramId() {
  if (!_mbDelegationProgramId) _mbDelegationProgramId = new solanaWeb3.PublicKey(MB_DELEGATION_PROGRAM_ID_STR);
  return _mbDelegationProgramId;
}
function mbMagicProgramId() {
  if (!_mbMagicProgramId) _mbMagicProgramId = new solanaWeb3.PublicKey(MB_MAGIC_PROGRAM_ID_STR);
  return _mbMagicProgramId;
}
function mbMagicContextId() {
  if (!_mbMagicContextId) _mbMagicContextId = new solanaWeb3.PublicKey(MB_MAGIC_CONTEXT_ID_STR);
  return _mbMagicContextId;
}

// ─── Connection ───────────────────────────────────────────────────────────────
// Returns a standard solanaWeb3.Connection pointed at the Magic Router RPC.
// The router speaks the standard Solana JSON-RPC protocol PLUS custom methods
// (getBlockhashForAccounts, getDelegationStatus). Delegated-account transactions
// are automatically routed to the Ephemeral Rollup validator; undelegated ones
// fall through to the base layer.
function getMagicRouterConnection() {
  if (!_mbRouterConnection) {
    _mbRouterConnection = new solanaWeb3.Connection(MB_ROUTER_ENDPOINT, 'confirmed');
  }
  return _mbRouterConnection;
}

// ─── getWritableAccounts ──────────────────────────────────────────────────────
// Mirrors the SDK's getWritableAccounts() — collects all writable pubkey strings
// from a Transaction's instructions (plus feePayer). Used to call the custom
// getBlockhashForAccounts RPC method so the router can pick the right validator.
function mbGetWritableAccounts(tx) {
  const seen = new Set();
  if (tx.feePayer) seen.add(tx.feePayer.toBase58());
  for (const ix of tx.instructions) {
    for (const key of ix.keys) {
      if (key.isWritable) seen.add(key.pubkey.toBase58());
    }
  }
  return Array.from(seen);
}

// ─── getBlockhashForAccounts ─────────────────────────────────────────────────
// Custom RPC method exposed by the Magic Router. Returns { blockhash, lastValidBlockHeight }
// routed to whichever validator owns the listed accounts (ER or base layer).
async function mbGetBlockhashForAccounts(writableAccounts) {
  const resp = await fetch(MB_ROUTER_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'getBlockhashForAccounts',
      params: [writableAccounts],
    }),
  });
  const json = await resp.json();
  if (json.error) throw new Error('[MagicBlock] getBlockhashForAccounts: ' + JSON.stringify(json.error));
  return json.result; // { blockhash, lastValidBlockHeight }
}

// ─── sendViaMagicRouter ───────────────────────────────────────────────────────
// Drop-in replacement for Connection.sendTransaction() that routes through the
// Magic Router. The router auto-selects the ER validator if any writable account
// is delegated; otherwise it routes to the Solana base layer. The caller signs
// the transaction as normal (Phantom wallet or keypair array).
//
// Usage:
//   const sig = await sendViaMagicRouter(tx, window.solana);  // Phantom
//
// Parameters:
//   tx        — solanaWeb3.Transaction (unsigned; feePayer must be set)
//   signer    — Phantom wallet object OR array of Keypairs for test/server use
//   opts      — optional { skipPreflight: bool, commitment: string }
//
// Returns: transaction signature string
async function sendViaMagicRouter(tx, signer, opts) {
  const conn = getMagicRouterConnection();
  const writableAccts = mbGetWritableAccounts(tx);

  // Get router-aware blockhash (routes to ER if any account is delegated)
  const bh = await mbGetBlockhashForAccounts(writableAccts);
  tx.recentBlockhash = bh.blockhash;
  tx.lastValidBlockHeight = bh.lastValidBlockHeight;

  const sendOpts = Object.assign({ skipPreflight: true }, opts);

  if (Array.isArray(signer)) {
    // Keypair array (e.g. tests, server-side scripts)
    tx.sign(...signer);
    const raw = tx.serialize();
    return await conn.sendRawTransaction(raw, sendOpts);
  }
  // Phantom wallet: sign via wallet adapter then send raw
  const signed = await signer.signTransaction(tx);
  const raw = signed.serialize();
  return await conn.sendRawTransaction(raw, sendOpts);
}

// ─── checkDelegationStatus ────────────────────────────────────────────────────
// Query the Magic Router for the delegation status of an account.
// Returns the router's result object (fields: delegated, validator, etc.)
// or null if the account is not delegated / router unreachable.
//
// Usage:
//   const status = await oxarkMB.checkDelegationStatus(gamePDA.toBase58());
//   if (status?.delegated) { /* use ER path */ }
async function checkDelegationStatus(accountPubkeyOrStr) {
  const addr = typeof accountPubkeyOrStr === 'string'
    ? accountPubkeyOrStr
    : accountPubkeyOrStr.toBase58();
  try {
    const resp = await fetch(MB_ROUTER_ENDPOINT + '/getDelegationStatus', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'getDelegationStatus',
        params: [addr],
      }),
    });
    const json = await resp.json();
    return json.result ?? null;
  } catch (e) {
    console.warn('[MagicBlock] checkDelegationStatus failed:', e.message);
    return null;
  }
}

// ─── mbPingRouter ─────────────────────────────────────────────────────────────
// Measures round-trip latency to the Magic Router vs the Solana devnet RPC.
// Returns { routerMs, baseMs } — useful for the Day 1 latency report.
async function mbPingRouter() {
  const t0 = performance.now();
  try {
    await fetch(MB_ROUTER_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'getHealth', params: [] }),
    });
  } catch (_) { /* ignore — we measure time regardless */ }
  const routerMs = Math.round(performance.now() - t0);

  const t1 = performance.now();
  try {
    await fetch('https://api.devnet.solana.com', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'getHealth', params: [] }),
    });
  } catch (_) { /* ignore */ }
  const baseMs = Math.round(performance.now() - t1);

  return { routerMs, baseMs };
}

// ─── Delegation stubs (Rust program changes required) ────────────────────────
// These functions document the intended delegation flow.
// Full implementation requires Phase C Day 2+ Rust changes:
//   • Add #[ephemeral] macro before #[program] in lib.rs
//   • Add delegate_session instruction with #[delegate] + AccountInfo<del> constraint
//   • Add undelegate_session instruction with #[commit] macro + commit_and_undelegate_accounts()
//   • The delegatedAccount must isSigner=true → only possible via owning program CPI
//
// When Rust is ready, these stubs become real calls via oxarkOnchain.delegateSession(gameId).

async function mbDelegateGameAccounts(gameId) {
  // TODO (Phase C Day 2): Call oxarkOnchain.delegateSession(gameId) once the
  // Rust program has delegate_session instruction with #[delegate] macro.
  // The instruction must pass the Game PDA as isSigner via program CPI.
  console.warn('[MagicBlock] mbDelegateGameAccounts: Rust program update required — stub only.');
  return { ok: false, reason: 'rust_program_update_required' };
}

async function mbUndelegateGameAccounts(gameId) {
  // TODO (Phase C Day 2): Call oxarkOnchain.undelegateSession(gameId) once the
  // Rust program has undelegate_session with commit_and_undelegate_accounts().
  console.warn('[MagicBlock] mbUndelegateGameAccounts: Rust program update required — stub only.');
  return { ok: false, reason: 'rust_program_update_required' };
}

// ─── Global export ────────────────────────────────────────────────────────────
window.oxarkMB = {
  // Constants (strings — instantiate PublicKey as needed)
  ROUTER_ENDPOINT:         MB_ROUTER_ENDPOINT,
  DELEGATION_PROGRAM_ID:   MB_DELEGATION_PROGRAM_ID_STR,
  MAGIC_PROGRAM_ID:        MB_MAGIC_PROGRAM_ID_STR,
  MAGIC_CONTEXT_ID:        MB_MAGIC_CONTEXT_ID_STR,

  // PublicKey accessors (lazy)
  delegationProgramId:     mbDelegationProgramId,
  magicProgramId:          mbMagicProgramId,
  magicContextId:          mbMagicContextId,

  // Connection
  getConnection:           getMagicRouterConnection,

  // Core utilities
  getWritableAccounts:     mbGetWritableAccounts,
  getBlockhashForAccounts: mbGetBlockhashForAccounts,
  sendViaMagicRouter:      sendViaMagicRouter,
  checkDelegationStatus:   checkDelegationStatus,
  pingRouter:              mbPingRouter,

  // Delegation stubs (Rust program update required for full impl)
  delegateGameAccounts:    mbDelegateGameAccounts,
  undelegateGameAccounts:  mbUndelegateGameAccounts,
};

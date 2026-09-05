// AUTO-SPLIT from onchain.js (YKK-15) — pure move, function bodies byte-identical.
// See PR: onchain.js -> src/onchain/{pda,readers,tx,rpc}.js + index.js shim.

const DEVNET_RPC = 'https://api.devnet.solana.com';

// ─── Lazy connection (reuses between calls) ───────────────────────────────
let _connection = null;
function getConnection() {
  if (!_connection) {
    _connection = new solanaWeb3.Connection(DEVNET_RPC, 'confirmed');
  }
  return _connection;
}

export {
  DEVNET_RPC,
  _connection,
  getConnection,
};

// config.js — client network + feature config (F1-7). Single source for the
// cluster, program id, explorer links, and feature flags. Screens/footers read
// from here, never from inline literals.

// Solana cluster this build targets.
export const NETWORK = 'devnet';

// oxark program id (matches CLAUDE.md / onchain.js PROGRAM_ID).
export const PROGRAM_ID = '5i37jWBiA7bV9XmokyDWHQxjJ5s1sBnSEkPSB4J2XfmN';

// Explorer tx link for the active cluster. mainnet-beta takes no cluster param.
export function EXPLORER_TX_URL(sig) {
  const q = NETWORK === 'mainnet-beta' ? '' : `?cluster=${NETWORK}`;
  return `https://explorer.solana.com/tx/${sig}${q}`;
}

// F1-5: the winner's "steal" act (claim_battle_loot vault transfer) is gated OFF
// until YKK-47/YKK-44 land. false → sealed slot + honest "no card taken" copy.
export const STEAL_ENABLED = false;

// ── legacy (kept for reference) ──────────────────────────────────────────────
// DEPRECATED (YKK-38): the prize pool is now the program PDA seeds=[b"prize_pool"],
// derived client-side via findPrizePoolPDA() in onchain.js. Kept for reference only.
export const PRIZE_POOL_PUBKEY    = 'C8ui4h9tuYiU55VrMohAoFwjsm5RxKPpmQizX9eAAgMa';
export const OPS_TREASURY_PUBKEY  = 'GN3aBaUFPpejXBy2u4SgXuwQkkqRFauqAfXNsXhTPz4f';

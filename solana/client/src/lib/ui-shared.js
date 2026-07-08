// ui-shared.js — small cross-screen UI primitives (F0-7 / finding F-23).
// De-duplicates logic that was copy-pasted across screens: the toast helper
// (3+ identical copies) and the season prize-tier table (home-screen vs
// PrizePool). One definition, imported everywhere.

// ── Toast ────────────────────────────────────────────────────────────────────
// Bottom-anchored transient message. The `wg-toast` CSS is injected once by
// app.js; the trade screen keeps its own `trade-toast` class via `className`.
// On-chain confirmations should pass a tx short-link in `msg` (DESIGN.md).
export function showToast(msg, type = 'info', { className = 'wg-toast', duration = 3000 } = {}) {
  const t = document.createElement('div');
  t.className = `${className} ${className}--${type}`;
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), duration);
  return t;
}

// ── Tx short-link ─────────────────────────────────────────────────────────────
// Minimal explorer link for on-chain confirmation toasts (DESIGN.md tx-link).
// F1-7 (PR-G) will centralize the cluster in config.EXPLORER_TX_URL; devnet is
// the current network (CLAUDE.md) so it is the stopgap default here.
export function txLink(sig, { cluster = 'devnet' } = {}) {
  if (!sig) return '';
  const short = String(sig).slice(0, 8);
  const url = `https://explorer.solana.com/tx/${sig}?cluster=${cluster}`;
  return `<a class="tx-link" href="${url}" target="_blank" rel="noopener">${short}… ↗</a>`;
}

// Convenience: success toast whose body carries a tx short-link.
export function showTxToast(label, sig, type = 'success') {
  const t = showToast(label, type);
  try { t.innerHTML = `${label} ${txLink(sig)}`; } catch (_) {}
  return t;
}

// ── Season prize tiers ───────────────────────────────────────────────────────
// Canonical tier table (mirrors claim_prize_v2 compute_tier_prize): vault-count
// band → share of the pool. `color` chrome for the tier chip (greys below T3 are
// the residual untokenized ladder). Single source for home-screen + PrizePool.
export const PRIZE_TIERS = [
  { tier: 1, min: 60, max: 60, percent: 50, color: 'var(--accent-gold-bright)' },
  { tier: 2, min: 50, max: 59, percent: 25, color: 'var(--accent-gold)' },
  { tier: 3, min: 30, max: 49, percent: 15, color: '#a0a0a0' },
  { tier: 4, min: 10, max: 29, percent:  8, color: '#808080' },
  { tier: 5, min:  1, max:  9, percent:  2, color: '#606060' },
];

// The tier whose [min,max] band contains `vaultCount`, or null (0 cards = none).
export function tierForVault(vaultCount) {
  return PRIZE_TIERS.find(t => vaultCount >= t.min && vaultCount <= t.max) ?? null;
}

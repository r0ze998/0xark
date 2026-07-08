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
// Explorer link for on-chain confirmation toasts (DESIGN.md tx-link). Cluster
// comes from config (F1-7) — no inline network literal.
import { EXPLORER_TX_URL } from '../config.js';

export function txLink(sig) {
  if (!sig) return '';
  const short = String(sig).slice(0, 8);
  return `<a class="tx-link" href="${EXPLORER_TX_URL(sig)}" target="_blank" rel="noopener">${short}… ↗</a>`;
}

// Convenience: success toast whose body carries a tx short-link.
export function showTxToast(label, sig, type = 'success') {
  const t = showToast(label, type);
  try { t.innerHTML = `${label} ${txLink(sig)}`; } catch (_) {}
  return t;
}

// ── DEMO MODE badge ───────────────────────────────────────────────────────────
// Lights a persistent header badge whenever the client silently falls back to a
// non-authoritative path (server down, x402 offline, payment skipped). Idempotent;
// logs the reason so a fallback is never invisible (DESIGN.md demo-badge).
let _demoLit = false;
export function setDemoMode(reason = 'demo fallback') {
  console.info('[DEMO MODE]', reason);
  if (_demoLit) return;
  _demoLit = true;
  if (typeof document === 'undefined') return;
  if (document.getElementById('demo-badge-css') == null) {
    const st = document.createElement('style');
    st.id = 'demo-badge-css';
    st.textContent = `.demo-badge{position:fixed;top:8px;left:50%;transform:translateX(-50%);`
      + `z-index:9999;font-family:var(--font-main);font-size:13px;letter-spacing:0.14em;`
      + `color:var(--bg-deep);background:var(--accent-gold);padding:2px 10px;`
      + `border:1px solid var(--bg-deep);pointer-events:none;}`;
    document.head.appendChild(st);
  }
  const badge = document.createElement('div');
  badge.className = 'demo-badge';
  badge.id = 'demo-badge';
  badge.textContent = 'DEMO MODE';
  badge.title = reason;
  document.body.appendChild(badge);
}

// Expose the shared UI primitives on window so components that ship before this
// module loads (or check optionally) can use them (interruption.js already does).
if (typeof window !== 'undefined') {
  window.oxarkUI = { ...(window.oxarkUI ?? {}), txLink, showTxToast, setDemoMode };
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

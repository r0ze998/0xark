// PrizePool.js — prize pool display
import { PRIZE_TIERS, tierForVault } from '../../lib/ui-shared.js';

/**
 * Returns HTML showing the current prize pool tiers.
 * @param {number} totalCards  — total cards registered (0-∞)
 * @param {number} vaultCount  — local player's vault count
 */
export function PrizePoolHTML(totalCards = 0, vaultCount = 0) {
  const myTier = tierForVault(vaultCount);

  return `<div class="pp-root">
    <div class="pp-title">PRIZE POOL</div>
    <div class="pp-tiers">
      ${PRIZE_TIERS.map(t => {
        const active = myTier?.tier === t.tier;
        return `<div class="pp-tier${active ? ' pp-tier--active' : ''}" style="--tc:${t.color};">
          <span class="pp-tier-label">TIER ${t.tier}</span>
          <span class="pp-tier-range">${t.min}${t.max !== t.min ? `–${t.max}` : ''} cards</span>
          <span class="pp-tier-share">${t.percent}%</span>
        </div>`;
      }).join('')}
    </div>
  </div>`;
}

export function injectPrizePoolCSS() {
  if (document.getElementById('style-pp')) return;
  const el = document.createElement('style');
  el.id = 'style-pp';
  el.textContent = PP_CSS;
  document.head.appendChild(el);
}

const PP_CSS = `
.pp-root { display: flex; flex-direction: column; gap: 4px; }
.pp-title { font-size: 13px; letter-spacing: 0.1em; color: var(--text-dim); }
.pp-tiers { display: flex; flex-direction: column; gap: 2px; }
.pp-tier {
  display: flex; align-items: center; gap: 8px;
  padding: 2px 6px; border: 1px solid rgba(255,255,255,0.08);
  font-size: 13px;
}
.pp-tier--active { border-color: var(--tc); background: color-mix(in srgb, var(--tc) 12%, transparent); }
.pp-tier-label { color: var(--tc); width: 48px; flex-shrink: 0; }
.pp-tier-range { color: var(--text-dim); flex: 1; }
.pp-tier-share { color: var(--tc); font-size: 13px; }
`;

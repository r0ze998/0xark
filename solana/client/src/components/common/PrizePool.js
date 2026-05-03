// PrizePool.js — prize pool display

/**
 * Returns HTML showing the current prize pool tiers.
 * @param {number} totalCards  — total cards registered (0-∞)
 * @param {number} vaultCount  — local player's vault count
 */
export function PrizePoolHTML(totalCards = 0, vaultCount = 0) {
  const TIERS = [
    { label: 'TIER 1', min: 60, max: 60, share: '50%',  color: '#d8b034' },
    { label: 'TIER 2', min: 50, max: 59, share: '25%',  color: '#c9a227' },
    { label: 'TIER 3', min: 30, max: 49, share: '15%',  color: '#a0a0a0' },
    { label: 'TIER 4', min: 10, max: 29, share: '8%',   color: '#808080' },
    { label: 'TIER 5', min:  1, max:  9, share: '2%',   color: '#606060' },
  ];

  const myTier = TIERS.find(t => vaultCount >= t.min && vaultCount <= t.max) ?? null;

  return `<div class="pp-root">
    <div class="pp-title">PRIZE POOL</div>
    <div class="pp-tiers">
      ${TIERS.map(t => {
        const active = myTier?.label === t.label;
        return `<div class="pp-tier${active ? ' pp-tier--active' : ''}" style="--tc:${t.color};">
          <span class="pp-tier-label">${t.label}</span>
          <span class="pp-tier-range">${t.min}${t.max !== t.min ? `–${t.max}` : ''} cards</span>
          <span class="pp-tier-share">${t.share}</span>
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
  font-size: 12px;
}
.pp-tier--active { border-color: var(--tc); background: color-mix(in srgb, var(--tc) 12%, transparent); }
.pp-tier-label { color: var(--tc); width: 48px; flex-shrink: 0; }
.pp-tier-range { color: var(--text-dim); flex: 1; }
.pp-tier-share { color: var(--tc); font-size: 13px; }
`;

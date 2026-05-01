// LegendaryProgress.js — 6-personality Legendary progress indicators

export const PERSONALITIES = [
  { id: 'conqueror', label: 'CONQUEROR', faction: 0, legendaryId: 10,  icon: '⚔',  color: '#6a9fd8' },
  { id: 'patron',    label: 'PATRON',    faction: 1, legendaryId: 20,  icon: '◈',  color: '#c9a227' },
  { id: 'phoenix',   label: 'PHOENIX',   faction: 2, legendaryId: 30,  icon: '⚡',  color: '#e05070' },
  { id: 'sage',      label: 'SAGE',      faction: 3, legendaryId: 40,  icon: '◎',  color: '#5ab87a' },
  { id: 'hermit',    label: 'HERMIT',    faction: 4, legendaryId: 50,  icon: '✦',  color: '#a070e0' },
  { id: 'detective', label: 'DETECTIVE', faction: 5, legendaryId: 60,  icon: '⬡',  color: '#d97a30' },
];

/**
 * @param {object} progress — { conqueror: 3, patron: 0, ... } progress toward each Legendary
 * @param {number} target   — total required (e.g. 10)
 * @param {number[]} owned  — list of owned card IDs
 */
export function LegendaryProgressHTML(progress = {}, target = 10, owned = []) {
  return `<div class="lgp-root" role="list" aria-label="Legendary progress">
    ${PERSONALITIES.map(p => {
      const current  = progress[p.id] ?? 0;
      const achieved = current >= target;
      const hasCard  = owned.includes(p.legendaryId);
      const pct      = Math.min(100, Math.round((current / target) * 100));

      return `<div class="lgp-row${achieved ? ' lgp-row--done' : ''}" role="listitem" style="--pc:${p.color};">
        <span class="lgp-icon">${p.icon}</span>
        <div class="lgp-info">
          <div class="lgp-label-row">
            <span class="lgp-label">${p.label}</span>
            ${achieved ? '<span class="lgp-check">✓</span>' : ''}
            ${hasCard  ? '<span class="lgp-card-check" title="Legendary owned">★</span>' : ''}
          </div>
          <div class="lgp-bar-bg">
            <div class="lgp-bar-fill" style="width:${pct}%;"></div>
          </div>
        </div>
        <span class="lgp-count">${current}/${target}</span>
      </div>`;
    }).join('')}
  </div>`;
}

export function injectLegendaryProgressCSS() {
  if (document.getElementById('style-lgp')) return;
  const el = document.createElement('style');
  el.id = 'style-lgp';
  el.textContent = LGP_CSS;
  document.head.appendChild(el);
}

const LGP_CSS = `
.lgp-root { display: flex; flex-direction: column; gap: 5px; }
.lgp-row {
  display: flex; align-items: center; gap: 8px;
  padding: 4px 6px; border: 1px solid rgba(255,255,255,0.07);
}
.lgp-row--done { border-color: var(--pc); background: color-mix(in srgb, var(--pc) 8%, transparent); }
.lgp-icon { font-size: 16px; width: 20px; text-align: center; flex-shrink: 0; color: var(--pc); }
.lgp-info { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 3px; }
.lgp-label-row { display: flex; align-items: center; gap: 6px; }
.lgp-label { font-size: 12px; letter-spacing: 0.06em; color: var(--text-cream); }
.lgp-check { font-size: 13px; color: #5ab87a; }
.lgp-card-check { font-size: 13px; color: #d8b034; }
.lgp-bar-bg {
  height: 4px; background: rgba(255,255,255,0.08); border-radius: 0;
  overflow: hidden;
}
.lgp-bar-fill { height: 100%; background: var(--pc); transition: width 0.4s ease; }
.lgp-count { font-size: 12px; color: var(--text-dim); flex-shrink: 0; width: 28px; text-align: right; }
`;

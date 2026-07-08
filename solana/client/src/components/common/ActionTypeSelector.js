// ActionTypeSelector.js — 6-action picker
import { pxIcon } from '../../lib/px-icons.js';

export const ACTION_TYPES = [
  { id: 0, icon: pxIcon('crystal'), label: 'CRYSTAL', desc: '+5 BP modifier'        },
  { id: 1, icon: pxIcon('barrier'), label: 'BARRIER', desc: 'Negate first hit'      },
  { id: 2, icon: pxIcon('flame'),   label: 'FLAME',   desc: 'Double ATK vs Common'  },
  { id: 3, icon: pxIcon('storm'),   label: 'STORM',   desc: '-2 BP on opponent'     },
  { id: 4, icon: pxIcon('shadow'),  label: 'SHADOW',  desc: 'Steal opponent card'    },
  { id: 5, icon: pxIcon('void'),    label: 'VOID',    desc: 'Ignore Barrier'        },
];

/**
 * Returns HTML for the action type selector.
 * @param {number|null} selectedId — currently selected action type
 */
export function ActionTypeSelectorHTML(selectedId = null) {
  return `<div class="ats-root" role="radiogroup" aria-label="Choose action type">
    ${ACTION_TYPES.map(a => `
      <button class="ats-btn${selectedId === a.id ? ' ats-btn--active' : ''}"
        data-action="${a.id}" title="${a.desc}"
        aria-pressed="${selectedId === a.id}">
        <span class="ats-icon">${a.icon}</span>
        <span class="ats-label">${a.label}</span>
      </button>`).join('')}
  </div>`;
}

export function injectActionTypeSelectorCSS() {
  if (document.getElementById('style-ats')) return;
  const el = document.createElement('style');
  el.id = 'style-ats';
  el.textContent = ATS_CSS;
  document.head.appendChild(el);
}

const ATS_CSS = `
.ats-root {
  display: flex; gap: 4px; flex-wrap: wrap;
}
.ats-btn {
  display: flex; flex-direction: column; align-items: center; gap: 1px;
  padding: 5px 8px; background: var(--bg-mid);
  border: 1px solid rgba(201,162,39,0.3);
  font-family: var(--font-main); cursor: pointer;
  transition: background 80ms, border-color 80ms;
  min-width: 52px;
}
.ats-btn:hover, .ats-btn--active {
  background: rgba(201,162,39,0.15);
  border-color: var(--accent-gold);
}
.ats-btn--active { background: rgba(201,162,39,0.22) !important; }
.ats-icon { font-size: 16px; line-height: 1; }
.ats-label { font-size: 13px; letter-spacing: 0.04em; color: var(--text-cream); }
`;

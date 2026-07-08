// ActionTypeSelector.js — 6-action picker
import { pxIcon } from '../../lib/px-icons.js';

// desc text is the AUTHORITATIVE mechanical effect, transcribed from
// solana/oxark/programs/oxark/src/damage_calc.rs (apply_action_types + run_combat).
// Do not paraphrase loosely — these gate what the player expects vs what resolves.
//   CRYSTAL(0) +5 BP self ...................... damage_calc.rs:384-390
//   BARRIER(1) block next incoming hit (once) .. set 392-398 / consume 464-488
//   FLAME(2)   -5 HP to card in the SAME slot .. 400-410 (applied 439-445)
//   STORM(3)   all foes -2 BP + clear barriers . 412-424
//   SHADOW(4)  skip this slot's pair (no combat) set 426-432 / skip 452-456
//   VOID(5)    nullify the facing card's action  first-pass 337-365 / skip 374-381
export const ACTION_TYPES = [
  { id: 0, icon: pxIcon('crystal'), label: 'CRYSTAL', desc: '+5 BP to this card'             },
  { id: 1, icon: pxIcon('barrier'), label: 'BARRIER', desc: 'Block the next hit (once)'      },
  { id: 2, icon: pxIcon('flame'),   label: 'FLAME',   desc: '-5 HP to the card facing it'    },
  { id: 3, icon: pxIcon('storm'),   label: 'STORM',   desc: 'All foes -2 BP, clear Barriers' },
  { id: 4, icon: pxIcon('shadow'),  label: 'SHADOW',  desc: "Skip this slot's fight"         },
  { id: 5, icon: pxIcon('void'),    label: 'VOID',    desc: 'Nullify the facing action'      },
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

// Card.js — renders one card tile; used by all battle screens
import { getCard } from '../../lib/cards.js';

export const FACTION_NAMES  = ['Knight','Merchant','Pirate','Scholar','Monk','Engineer'];
export const FACTION_ABBR   = ['KNT','MRC','PIR','SCH','MNK','ENG'];
export const FACTION_COLORS = [
  'var(--clan-knight)',    // Knight
  'var(--clan-merchant)',  // Merchant
  'var(--clan-pirate)',    // Pirate
  'var(--clan-scholar)',   // Scholar
  'var(--clan-monk)',      // Monk
  'var(--clan-engineer)',  // Engineer
];
export const RARITY_LABELS  = ['COM','UNC','RARE','LGD'];
export const ACTION_LABELS  = ['◆ CRYSTAL','🛡 BARRIER','⚡ FLAME','🌀 STORM','◎ SHADOW','✦ VOID'];
export const ACTION_ICONS   = ['◆','🛡','⚡','🌀','◎','✦'];
export const CARD_NAMES = {
   1:'Squire',    2:'Guard',       3:'Soldier',   4:'Paladin',  5:'Sacrificial Squire',
   6:'Warden',    7:'Crusader',    8:'Knight Champion', 9:'Vanguard', 10:'Sentinel',
  11:'Peddler',  12:'Trader',     13:'Broker',   14:'Merchant',15:'Coin Burner',
  16:'Magnifier',17:'Speculator', 18:'Merchant Magnate', 19:'Monopolist',20:'Magnate',
  21:'Cutthroat',22:'Raider',     23:'Corsair',  24:'Buccaneer',25:'Powder Charge',
  26:'Privateer',27:'Freebooter', 28:'Pirate Quartermaster',29:'Dreadnaught',30:'Marauder',
  31:'Apprentice',32:'Archivist', 33:'Mage',     34:'Sage',    35:'Burning Tome',
  36:'Diviner',  37:'Arcanist',   38:'Scholar Lorekeeper',39:'Seer',    40:'Oracle',
  41:'Novice',   42:'Initiate',   43:'Acolyte',  44:'Disciple',45:'Mantra Burner',
  46:'Devotee',  47:'Contemplator',48:'Monk Ascender',49:'Elder',   50:'Ascetic',
  51:'Tinkerer', 52:'Mechanic',   53:'Forger',   54:'Inventor',55:'Forge Worker',
  56:'Schematic',57:'Constructor',58:'Engineer Forgemaster',59:'Colossus',60:'Architect',
};

/**
 * Returns an HTML string for a card tile.
 * @param {object} opts
 *   id       — card id (1-60)
 *   owned    — greyed out if false (default true)
 *   selected — highlight border (default false)
 *   faceDown — show back of card (default false)
 *   showAction — show ActionType label (default true)
 *   compact  — smaller tile without stats (default false)
 *   hpCurrent — override displayed HP (for battle animation)
 *   dead     — show destroyed overlay (default false)
 */
export function CardHTML({
  id, owned = true, selected = false, faceDown = false,
  showAction = true, compact = false, hpCurrent = null, dead = false,
} = {}) {
  if (faceDown) {
    return `<div class="ark-card ark-card--facedown" aria-label="Hidden card">
      <div class="ark-card-back">?</div>
    </div>`;
  }

  const card = getCard(id);
  if (!card) return `<div class="ark-card ark-card--empty"></div>`;

  const color  = FACTION_COLORS[card.faction] ?? '#e8dfc8';
  const isLgd  = card.rarity === 3;
  const name   = CARD_NAMES[id] ?? `Card #${id}`;
  const hp     = hpCurrent ?? card.hp;

  const classes = [
    'ark-card',
    !owned   && 'ark-card--locked',
    selected && 'ark-card--selected',
    compact  && 'ark-card--compact',
    isLgd    && 'ark-card--legendary',
    dead     && 'ark-card--dead',
  ].filter(Boolean).join(' ');

  return `<div class="${classes}" data-id="${id}" style="--cc:${color};"
    role="img" aria-label="${name}${isLgd ? ' (Legendary)' : ''}${!owned ? ' (locked)' : ''}">
    <div class="ark-card-header">
      <span class="ark-card-faction" style="color:var(--cc);">${FACTION_ABBR[card.faction]}</span>
      <span class="ark-card-rarity">${RARITY_LABELS[card.rarity]}</span>
    </div>
    <div class="ark-card-name">${name}</div>
    ${isLgd ? '<div class="ark-card-legend">★</div>' : ''}
    ${compact ? '' : `
    <div class="ark-card-stats">
      <span class="ark-stat"><span class="ark-stat-label">BP</span><b>${card.bp}</b></span>
      <span class="ark-stat"><span class="ark-stat-label">HP</span><b class="ark-hp-val">${hp}</b></span>
      <span class="ark-stat"><span class="ark-stat-label">INI</span><b>${card.ini}</b></span>
    </div>
    ${showAction ? `<div class="ark-card-action" style="color:var(--cc);">${ACTION_LABELS[card.actionType]}</div>` : ''}
    `}
    ${!owned ? '<div class="ark-card-overlay"><span>?</span></div>' : ''}
    ${dead   ? '<div class="ark-card-dead-overlay"><span>✕</span></div>' : ''}
  </div>`;
}

export function injectCardCSS() {
  if (document.getElementById('style-ark-card')) return;
  const el = document.createElement('style');
  el.id = 'style-ark-card';
  el.textContent = CARD_CSS;
  document.head.appendChild(el);
}

const CARD_CSS = `
.ark-card {
  position: relative;
  width: 80px; height: 112px;
  display: flex; flex-direction: column; align-items: center;
  padding: 5px 4px 4px;
  background: var(--bg-mid);
  border: 1px solid color-mix(in srgb, var(--cc,#e8dfc8) 40%, transparent);
  cursor: pointer;
  transition: border-color 80ms, box-shadow 80ms;
  flex-shrink: 0;
  overflow: hidden;
}
.ark-card:hover:not(.ark-card--locked):not(.ark-card--dead) {
  border-color: var(--cc,#e8dfc8);
  box-shadow: 0 0 6px color-mix(in srgb, var(--cc,#e8dfc8) 40%, transparent);
}
.ark-card--selected {
  border-color: var(--accent-gold) !important;
  box-shadow: 0 0 10px rgba(201,162,39,0.5);
}
.ark-card--legendary {
  border-color: #d8b034;
  box-shadow: 0 0 8px rgba(216,176,52,0.4), inset 0 0 12px rgba(216,176,52,0.06);
}
.ark-card--legendary.ark-card--selected {
  box-shadow: 0 0 14px rgba(216,176,52,0.7);
}
.ark-card--locked { opacity: 0.3; cursor: default; filter: grayscale(0.6); }
.ark-card--dead { opacity: 0.35; filter: grayscale(1); }
.ark-card--compact { width: 60px; height: 82px; padding: 4px 3px; }
.ark-card--facedown {
  width: 80px; height: 112px;
  background: repeating-linear-gradient(-45deg,#1a1f33,#1a1f33 4px,#0a0e1a 4px,#0a0e1a 8px);
  border: 1px solid rgba(201,162,39,0.3);
  display: flex; align-items: center; justify-content: center;
}
.ark-card--empty { width: 80px; height: 112px; }
.ark-card-back { font-size: 32px; color: rgba(201,162,39,0.2); }

.ark-card-header {
  width: 100%; display: flex; justify-content: space-between;
  font-size: 10px; letter-spacing: 0.04em; line-height: 1;
  margin-bottom: 2px; flex-shrink: 0;
}
.ark-card-faction { font-weight: bold; }
.ark-card-rarity  { color: var(--text-dim); }

.ark-card-name {
  font-size: 9px; text-align: center; line-height: 1.15;
  color: var(--text-cream); letter-spacing: 0.02em;
  word-break: break-word; flex: 1; display: flex; align-items: center; justify-content: center;
  padding: 2px 1px;
}
.ark-card--compact .ark-card-name { font-size: 8px; }

.ark-card-legend {
  font-size: 14px; color: #d8b034; line-height: 1; flex-shrink: 0;
  text-shadow: 0 0 6px rgba(216,176,52,0.8);
}

.ark-card-stats {
  width: 100%; display: flex; justify-content: space-around;
  font-size: 9px; flex-shrink: 0; margin-top: 2px;
}
.ark-stat { display: flex; flex-direction: column; align-items: center; gap: 0; }
.ark-stat-label { color: var(--text-dim); font-size: 8px; }
.ark-stat b { color: var(--text-cream); font-size: 11px; }
.ark-hp-val { color: #5ab87a; }

.ark-card-action {
  font-size: 8px; letter-spacing: 0.02em; text-align: center;
  flex-shrink: 0; margin-top: 1px; white-space: nowrap; overflow: hidden;
  text-overflow: ellipsis; width: 100%;
}

.ark-card-overlay, .ark-card-dead-overlay {
  position: absolute; inset: 0;
  display: flex; align-items: center; justify-content: center;
  font-size: 28px; color: rgba(232,223,200,0.3);
}
.ark-card-dead-overlay { color: rgba(214,59,59,0.5); font-size: 36px; }
`;

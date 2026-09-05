// Card.js — renders one card tile; used by all battle screens
import { getCard, CARD_ART_URLS } from '../../lib/cards.js';
import { pxIcon, injectPxIconSheet } from '../../lib/px-icons.js';

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
// ActionTypes: plain-text NAMES for aria/text contexts; ICONS are px-icon SVG;
// LABELS combine both for HTML contexts (never put SVG in an attribute).
export const ACTION_KEYS    = ['crystal','barrier','flame','storm','shadow','void'];
export const ACTION_NAMES   = ['CRYSTAL','BARRIER','FLAME','STORM','SHADOW','VOID'];
export const ACTION_ICONS   = ACTION_KEYS.map(k => pxIcon(k));
export const ACTION_LABELS  = ACTION_KEYS.map((k, i) => `${ACTION_ICONS[i]} ${ACTION_NAMES[i]}`);
export const RARITY_KEYS    = ['c','u','r','l'];
export const RARITY_COLORS  = ['var(--rarity-c)','var(--rarity-u)','var(--rarity-r)','var(--rarity-l)'];
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
 *   hpCurrent — override displayed HP (for battle animation)
 *   dead     — show destroyed overlay (default false)
 */
export function CardHTML({
  id, owned = true, selected = false, faceDown = false,
  showAction = true, hpCurrent = null, dead = false,
} = {}) {
  if (faceDown) {
    return `<div class="ark-card ark-card--facedown" aria-label="Hidden card">
      <div class="ark-card-back">?</div>
    </div>`;
  }

  const card = getCard(id);
  if (!card) return `<div class="ark-card ark-card--empty"></div>`;

  const color  = FACTION_COLORS[card.faction] ?? 'var(--text-cream)';
  const isLgd  = card.rarity === 3;
  const name   = CARD_NAMES[id] ?? `Card #${id}`;
  const hp     = hpCurrent ?? card.hp;

  const classes = [
    'ark-card',
    !owned   && 'ark-card--locked',
    selected && 'ark-card--selected',
    isLgd    && 'ark-card--legendary',
    dead     && 'ark-card--dead',
  ].filter(Boolean).join(' ');

  // DESIGN.md card-tile: faction abbr + rarity LETTER (13px) / BP (24px) /
  // name (13px ellipsis). HP/INI/action are NOT on the tile — at the 13px floor
  // they don't fit in 80×112; they live on the card frame / detail view.
  return `<div class="${classes}" data-id="${id}" style="--cc:${color};"
    role="img" aria-label="${name}${isLgd ? ' (Legendary)' : ''}${!owned ? ' (locked)' : ''}">
    <div class="ark-card-header">
      <span class="ark-card-faction" style="color:var(--cc);">${FACTION_ABBR[card.faction]}</span>
      <span class="ark-card-rarity">${RARITY_KEYS[card.rarity].toUpperCase()}</span>
    </div>
    <div class="ark-card-bp"><b>${card.bp}</b></div>
    <div class="ark-card-name">${name}</div>
    ${isLgd ? `<div class="ark-card-legend">${pxIcon('star')}</div>` : ''}
    ${!owned ? '<div class="ark-card-overlay"><span>?</span></div>' : ''}
    ${dead   ? `<div class="ark-card-dead-overlay">${pxIcon('skull')}</div>` : ''}
  </div>`;
}

/**
 * Returns an HTML string for a full-size framed card tile (vault display).
 * Uses rarity-specific frame PNGs as background; art window shows the faction
 * abbr as an interim placeholder until real card art arrives.
 * Same props as CardHTML(); compact is ignored (framed cards are always full-size).
 */
export function CardFrameHTML({
  id, owned = true, selected = false, faceDown = false,
  hpCurrent = null, dead = false,
} = {}) {
  if (faceDown) {
    return `<div class="card-frame card-frame--facedown" aria-label="Hidden card">
      <div class="card-back-seal" aria-hidden="true"></div>
    </div>`;
  }

  const card = getCard(id);
  if (!card) return `<div class="card-frame card-frame--empty"></div>`;

  const rKey    = RARITY_KEYS[card.rarity]   ?? 'c';
  const cColor  = FACTION_COLORS[card.faction] ?? 'var(--text-cream)';
  const rColor  = RARITY_COLORS[card.rarity]  ?? 'var(--rarity-c)';
  const emoji   = FACTION_ABBR[card.faction]  ?? '?';
  const name    = CARD_NAMES[id] ?? `Card #${id}`;
  const hp      = hpCurrent ?? card.hp;

  const artwork = card.imageUrl ?? CARD_ART_URLS[(card.faction + 1) * 10];
  const artHtml = artwork
    ? `<img src="${artwork}" alt="${name}" class="card-art-img" decoding="async" loading="lazy" />`
    : `<div class="card-art-placeholder">${emoji}</div>`;

  const classes = [
    'card-frame',
    `rarity-${rKey}`,
    !owned   && 'card-frame--locked',
    selected && 'card-frame--selected',
    dead     && 'card-frame--dead',
  ].filter(Boolean).join(' ');

  return `<div class="${classes}" data-id="${id}"
    style="--cc:${cColor};--rc:${rColor};"
    role="img" aria-label="${name}, ${FACTION_NAMES[card.faction]}, ${RARITY_LABELS[card.rarity]}, BP ${card.bp}, HP ${hp}, initiative ${card.ini}${!owned ? ' (not owned)' : ''}">
    <div class="card-identity"><span>${FACTION_NAMES[card.faction]}</span><span class="card-rarity-label">${RARITY_LABELS[card.rarity]}</span></div>
    <div class="card-catalog-no">No. ${String(id).padStart(2, '0')}</div>
    <div class="clan-bar" style="background:var(--cc);"></div>
    <div class="rarity-bar" style="background:var(--rc);"></div>
    <div class="name-banner">${name}</div>
    <div class="art-window">
      ${artHtml}
    </div>
    <div class="stats-panel">
      <span class="stat-badge"><span class="stat-label">BP</span><span class="stat-value">${card.bp}</span></span>
      <span class="stat-badge cf-hp"><span class="stat-label">HP</span><span class="stat-value">${hp}</span></span>
      <span class="stat-badge"><span class="stat-label">INI</span><span class="stat-value">${card.ini}</span></span>
    </div>
    ${!owned ? '<div class="ark-card-overlay"><span>?</span></div>' : ''}
    ${dead   ? `<div class="ark-card-dead-overlay">${pxIcon('skull')}</div>` : ''}
  </div>`;
}

export function injectCardCSS() {
  injectPxIconSheet(); // every screen renders cards → guarantees the icon sprite
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
  border: 1px solid color-mix(in srgb, var(--cc,var(--text-cream)) 40%, transparent);
  cursor: pointer;
  transition: border-color 80ms, box-shadow 80ms;
  flex-shrink: 0;
  overflow: hidden;
}
.ark-card:hover:not(.ark-card--locked):not(.ark-card--dead) {
  border-color: var(--cc,var(--text-cream));
  box-shadow: 0 0 6px color-mix(in srgb, var(--cc,var(--text-cream)) 40%, transparent);
}
.ark-card--selected {
  border-color: var(--accent-gold) !important;
  box-shadow: 0 0 10px rgba(201,162,39,0.5);
}
.ark-card--legendary {
  border-color: var(--rarity-l);
  box-shadow: 0 0 8px rgba(216,176,52,0.4), inset 0 0 12px rgba(216,176,52,0.06);
}
.ark-card--legendary.ark-card--selected {
  box-shadow: 0 0 14px rgba(216,176,52,0.7);
}
.ark-card--locked { opacity: 0.3; cursor: default; filter: grayscale(0.6); }
.ark-card--dead { opacity: 0.35; filter: grayscale(1); }
.ark-card--facedown {
  width: 80px; height: 112px;
  background: repeating-linear-gradient(-45deg,var(--bg-mid),var(--bg-mid) 4px,var(--bg-deep) 4px,var(--bg-deep) 8px);
  border: 1px solid rgba(201,162,39,0.3);
  display: flex; align-items: center; justify-content: center;
}
.ark-card--empty { width: 80px; height: 112px; }
.ark-card-back { font-size: 32px; color: rgba(201,162,39,0.2); }

/* Tile floor (DESIGN.md): 13px minimum, emphasis via size+color not weight. */
.ark-card-header {
  width: 100%; display: flex; justify-content: space-between;
  font-size: var(--fs-caption); letter-spacing: var(--ls-caption); line-height: 1;
  margin-bottom: 2px; flex-shrink: 0;
}
.ark-card-rarity { color: var(--text-dim); }

/* BP is the tile's headline stat (24px). HP/INI moved to frame/detail. */
.ark-card-bp { flex-shrink: 0; line-height: 1; margin: 2px 0; }
.ark-card-bp b { font-size: var(--fs-heading); color: var(--text-cream); }

.ark-card-name {
  font-size: var(--fs-caption); text-align: center; line-height: 1.1;
  color: var(--text-cream); letter-spacing: var(--ls-normal);
  flex: 1; display: flex; align-items: center; justify-content: center;
  padding: 2px 1px; width: 100%;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}

.ark-card-legend {
  font-size: 14px; color: var(--rarity-l); line-height: 1; flex-shrink: 0;
  text-shadow: 0 0 6px rgba(216,176,52,0.8);
}

.ark-card-overlay, .ark-card-dead-overlay {
  position: absolute; inset: 0;
  display: flex; align-items: center; justify-content: center;
  font-size: 28px; color: rgba(232,223,200,0.3);
}
.ark-card-dead-overlay { color: rgba(214,59,59,0.5); font-size: 36px; }

/* ── Framed card (vault display) ─────────────────────────────────────── */
.card-frame {
  position: relative;
  aspect-ratio: 5 / 7;
  width: 100%;
  min-width: 112px;                 /* DESIGN.md card-frame minimum render width */
  container-type: inline-size;      /* enables the <140px stat-label hide below */
  background-size: 100% 100%;
  background-repeat: no-repeat;
  font-family: var(--font-main, 'VT323', monospace);
  image-rendering: pixelated;
  image-rendering: crisp-edges;
  cursor: pointer;
  flex-shrink: 0;
  overflow: hidden;
  transition: filter 80ms;
}
.card-frame.rarity-c { background-image: url('public/img/frames/frame_common.png'); }
.card-frame.rarity-u { background-image: url('public/img/frames/frame_uncommon.png'); }
.card-frame.rarity-r { background-image: url('public/img/frames/frame_rare.png'); }
.card-frame.rarity-l { background-image: url('public/img/frames/frame_legendary.png'); }

.card-frame--locked  { opacity: 0.25; cursor: default; filter: grayscale(0.8); }
.card-frame--dead    { opacity: 0.3;  filter: grayscale(1); }
.card-frame--facedown {
  aspect-ratio: 5 / 7; width: 100%;
  background: repeating-linear-gradient(-45deg,var(--bg-mid),var(--bg-mid) 4px,var(--bg-deep) 4px,var(--bg-deep) 8px);
  border: 1px solid rgba(201,162,39,0.3);
  display: flex; align-items: center; justify-content: center;
}
.card-frame--empty { aspect-ratio: 5 / 7; width: 100%; }
.card-frame--selected { filter: drop-shadow(0 0 4px var(--accent-gold)); }

.card-frame .clan-bar {
  position: absolute; left: 0; top: 0; bottom: 0; width: 4px; z-index: 2;
}
.card-frame .rarity-bar {
  position: absolute; right: 0; top: 0; bottom: 0; width: 4px; z-index: 2;
}
.card-frame .name-banner {
  position: absolute; top: 10%; left: 18%; right: 18%; height: 10%;
  display: flex; align-items: center; justify-content: center;
  color: #1a0f0f; font-size: 0.85rem;
  text-align: center; z-index: 3; line-height: 1;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.card-frame .art-window {
  position: absolute; top: 22%; left: 12%; right: 12%; bottom: 25%;
  display: flex; align-items: center; justify-content: center; z-index: 1;
  font-size: 3rem;
}
.card-frame .card-art-placeholder {
  font-size: 3rem; opacity: 0.75; line-height: 1;
  font-family: sans-serif;
}
.card-frame .card-art-img {
  width: 100%; height: 100%;
  object-fit: cover; object-position: center top;
  image-rendering: auto;
}
.card-frame .stats-panel {
  position: absolute; bottom: 11%; left: 15%; right: 15%; height: 8%;
  display: flex; flex-direction: row; justify-content: space-around; align-items: center;
  padding: 0 8%;
  color: #1a0f0f; z-index: 3;
}
.card-frame .stat-badge {
  display: inline-flex; flex-direction: row; align-items: baseline; gap: 3px;
}
.card-frame .stat-label { font-size: var(--fs-caption); opacity: 0.7; }
.card-frame .stat-value { font-size: 0.95rem; }
.card-frame .cf-hp .stat-value { color: #2a6e3a; }
/* DESIGN.md: below 140px render width, keep stat VALUES, hide the labels. */
@container (max-width: 139px) {
  .card-frame .stat-label { display: none; }
}

/* Legendary rarity — crown decoration offset + stats bump */
.card-frame.rarity-l .name-banner { top: 13%; height: 9%; align-items: flex-end; }
.card-frame.rarity-l .stats-panel { bottom: 13%; }
`;

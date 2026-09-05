import { injectStyle } from '../../lib/inject-style.js';
import { CARD_CSS } from '../../style/card.js';
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
  injectStyle('style-ark-card', CARD_CSS);
}

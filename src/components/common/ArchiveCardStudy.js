// Review-only card frame. Uses catalog truth; imports no live game adapters.
import { getCard } from '../../lib/cards.js?v=77ad227ec8af177423afb2231a00ef4e30b5a65e';
import { CARD_NAMES, FACTION_NAMES, FACTION_ABBR, FACTION_COLORS, ACTION_NAMES, ACTION_KEYS } from './Card.js?v=77ad227ec8af177423afb2231a00ef4e30b5a65e';
import { pxIcon } from '../../lib/px-icons.js?v=77ad227ec8af177423afb2231a00ef4e30b5a65e';

const RARITIES = ['COMMON', 'UNCOMMON', 'RARE', 'LEGENDARY'];
const CRESTS = ['barrier', 'coin', 'flame', 'eye', 'shadow', 'chip'];

export function ArchiveCardStudy({ id, hidden = false, selected = false, hp = null, destroyed = false, action = null } = {}) {
  if (hidden) return '<div class="study-card study-card--back" role="img" aria-label="Sealed card"><span class="study-back-label">0xARK<span>THE DROWNED ARCHIVE</span></span></div>';
  const card = getCard(id);
  if (!card) return '';
  const name = CARD_NAMES[id];
  const health = hp ?? card.hp;
  const damaged = health < card.hp;
  const classes = ['study-card', `study-rarity-${card.rarity}`, selected && 'study-selected', damaged && 'study-damaged', destroyed && 'study-destroyed'].filter(Boolean).join(' ');
  const art = card.imageUrl;
  return `<div class="study-unit"><article class="${classes}" style="--faction:${FACTION_COLORS[card.faction]}" aria-label="${name}, ${FACTION_NAMES[card.faction]}, ${RARITIES[card.rarity]}, BP ${card.bp}, HP ${health} of ${card.hp}, initiative ${card.ini}${selected ? ', selected' : ''}${destroyed ? ', knocked out' : ''}">
    <div class="study-cap"><span>${pxIcon(CRESTS[card.faction])} ${FACTION_ABBR[card.faction]}</span><span>${String(id).padStart(3, '0')} / 060</span></div>
    <div class="study-portrait"><img src="${art}" alt="" loading="lazy" decoding="async"><span class="study-rarity"><i aria-hidden="true">${'|'.repeat(card.rarity + 1)}</i>${RARITIES[card.rarity]}</span>${selected ? '<span class="study-state">SELECTED</span>' : destroyed ? '<span class="study-state">KNOCKED OUT</span>' : ''}</div>
    <div class="study-title"><span>${FACTION_NAMES[card.faction]}</span><h3>${name}</h3></div>
    <div class="study-stats"><div><span>BP</span><strong>${card.bp}</strong></div><div class="study-hp"><span>HP</span><strong>${health}${damaged ? `<small>/${card.hp}</small>` : ''}</strong></div><div><span>INI</span><strong>${card.ini}</strong></div></div>
  </article>${action !== null ? `<div class="study-action">${pxIcon(ACTION_KEYS[action])}<span>${ACTION_NAMES[action]}</span><span class="study-action-note">SELECTED ACTION</span></div>` : ''}</div>`;
}

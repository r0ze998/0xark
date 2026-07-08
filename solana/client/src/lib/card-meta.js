// card-meta.js — the single source for a card id's rarity / faction / color
// (F0-3, finding F-4). Everything is DERIVED FROM the cards.js dataset
// (getCard(id).rarity / .faction), never from a positional id formula: the data
// is authoritative and a formula would silently drift if the dataset changes.
//
// Palettes are reused from Card.js (RARITY_KEYS / RARITY_COLORS / FACTION_COLORS)
// so there is exactly one place that maps rarity/faction → token.
//
// All lookups guard invalid ids (return null or a safe default, never throw).

import { getCard } from './cards.js';
import { RARITY_KEYS, RARITY_COLORS, FACTION_COLORS } from '../components/common/Card.js';

/** Rarity index 0..3 (Common/Uncommon/Rare/Legendary), or null for a bad id. */
export function rarityOf(id) {
  const c = getCard(id);
  return c ? c.rarity : null;
}

/** Faction index 0..5 (Knight/Merchant/Pirate/Scholar/Monk/Engineer), or null. */
export function factionOf(id) {
  const c = getCard(id);
  return c ? c.faction : null;
}

/** Rarity key 'c'|'u'|'r'|'l', or null for a bad id. */
export function rarityKeyOf(id) {
  const r = rarityOf(id);
  return r == null ? null : RARITY_KEYS[r];
}

/** Rarity token, e.g. 'var(--rarity-l)'. Falls back to the Common token. */
export function rarityColorOf(id) {
  const r = rarityOf(id);
  return r == null ? RARITY_COLORS[0] : RARITY_COLORS[r];
}

/** Faction token, e.g. 'var(--clan-knight)'. Falls back to cream text. */
export function factionColorOf(id) {
  const f = factionOf(id);
  return f == null ? 'var(--text-cream)' : FACTION_COLORS[f];
}

/** True iff the card is Legendary (rarity 3). */
export function isLegendaryOf(id) {
  return rarityOf(id) === 3;
}

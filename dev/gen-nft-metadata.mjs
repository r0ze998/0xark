// dev/gen-nft-metadata.mjs — YKK-48: regenerate all 60 nft/card/N.json from the
// card-data TRUTH, replacing the retired Gen-2 set (e.g. old 10.json said
// "VENOM · Poison · Rare" — truth id10 = Sentinel · Knight · Legendary).
//
// SINGLE SOURCE of stats: solana/client/src/lib/cards.js  (CARD_DATA rows
//   [id, faction, rarity, bp, hp, ini, actionType, isLegendary]).
// Display names + faction labels come from the game's own display truth
//   (src/components/common/Card.js: CARD_NAMES, FACTION_NAMES).
//
// Per file we OVERWRITE only: name, description, attributes.
// We KEEP AS-IS: image, external_url, symbol, properties (incl. creators/files),
//   collection. Images are the old art — explicitly OUT OF SCOPE (see PR body).
// collection.json is NOT touched.
//
// Run:  node dev/gen-nft-metadata.mjs   (writes in place; idempotent)
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { CARD_DATA } from '../solana/client/src/lib/cards.js';
import { CARD_NAMES, FACTION_NAMES } from '../solana/client/src/components/common/Card.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const CARD_DIR = join(ROOT, 'nft', 'card');

// Full rarity words (cards.js line 5: 0=Common 1=Uncommon 2=Rare 3=Legendary).
const RARITY_FULL = ['Common', 'Uncommon', 'Rare', 'Legendary'];
const pad3 = (n) => String(n).padStart(3, '0');

let written = 0;
const summary = [];

for (const [id, faction, rarity, bp, hp, ini] of CARD_DATA) {
  const name        = CARD_NAMES[id];
  const factionName = FACTION_NAMES[faction];
  const rarityName  = RARITY_FULL[rarity];
  if (!name || !factionName || rarityName === undefined) {
    throw new Error(`missing truth for id ${id}: name=${name} faction=${factionName} rarity=${rarityName}`);
  }

  const file = join(CARD_DIR, `${id}.json`);
  const json = JSON.parse(readFileSync(file, 'utf8'));

  // Overwrite the three drifted fields from truth; keep everything else.
  json.name = `0xARK #${pad3(id)} — ${name}`;
  json.description =
    `${factionName} ${rarityName} · ${name} — BP${bp}/HP${hp}/INI${ini}. ` +
    `Provenance-bearing card from 0xARK, the on-chain ZK card game on Solana.`;
  json.attributes = [
    { trait_type: 'Card ID', value: id },
    { trait_type: 'Faction', value: factionName },
    { trait_type: 'Rarity',  value: rarityName },
    { trait_type: 'BP',      value: bp },
    { trait_type: 'HP',      value: hp },
    { trait_type: 'INI',     value: ini },
  ];

  writeFileSync(file, JSON.stringify(json, null, 2) + '\n');
  written++;
  summary.push(`#${pad3(id)} ${factionName.padEnd(8)} ${rarityName.padEnd(9)} ${name}`);
}

console.log(summary.join('\n'));
console.log(`\nregenerated ${written} / 60 nft/card/*.json from cards.js truth`);
if (written !== 60) { console.error('EXPECTED 60 FILES'); process.exit(1); }

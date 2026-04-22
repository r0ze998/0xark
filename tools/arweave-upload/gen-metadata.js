#!/usr/bin/env node
/**
 * T-D16-4: gen-metadata.js — Metaplex-compatible NFT metadata generator for 0xARK cards
 *
 * Reads tools/arweave-upload/portrait-uris.json (produced by batch-upload.js)
 * and emits one metadata JSON per card at tools/arweave-upload/metadata/card-XX.json.
 *
 * Metadata format follows Metaplex Token Metadata Standard v1.1.
 *
 * Usage:
 *   node gen-metadata.js
 *   node gen-metadata.js --upload   # also uploads metadata JSONs to Arweave
 *
 * After running with --upload, writes tools/arweave-upload/metadata-uris.json
 * which maps card_id → metadata Arweave URI. Use this in the Anchor mint instruction.
 */

import fs   from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname  = path.dirname(fileURLToPath(import.meta.url));
const URI_FILE   = path.join(__dirname, 'portrait-uris.json');
const META_DIR   = path.join(__dirname, 'metadata');
const META_URIS  = path.join(__dirname, 'metadata-uris.json');
const UPLOAD_MODE = process.argv.includes('--upload');

// ─── Card data (mirrors solana/client/src/02-data.js CD[]) ───────────────────
// These names/rarities/types are embedded here so this script can run without
// a browser environment.

const CARD_DATA = [
  // ATTACK (1-12)
  {id:1,  name:'AEGIS',    type:'attack',   rarity:5, clan:'storm'},
  {id:2,  name:'UMBRA',    type:'attack',   rarity:4, clan:'storm'},
  {id:3,  name:'IGNIS',    type:'attack',   rarity:3, clan:'fire'},
  {id:4,  name:'STRIKE',   type:'attack',   rarity:1, clan:'storm'},
  {id:5,  name:'SLASH',    type:'attack',   rarity:1, clan:'storm'},
  {id:6,  name:'IMPALE',   type:'attack',   rarity:2, clan:'storm'},
  {id:7,  name:'CRUSH',    type:'attack',   rarity:2, clan:'stone'},
  {id:8,  name:'FLURRY',   type:'attack',   rarity:3, clan:'storm'},
  {id:9,  name:'BERSERK',  type:'attack',   rarity:3, clan:'storm'},
  {id:10, name:'VENOM',    type:'attack',   rarity:3, clan:'thorn'},
  {id:11, name:'REAPER',   type:'attack',   rarity:4, clan:'void'},
  {id:12, name:'PHANTOM',  type:'attack',   rarity:5, clan:'void'},
  // DEFENSE (13-24)
  {id:13, name:'BASTION',  type:'defense',  rarity:3, clan:'stone'},
  {id:14, name:'WARD',     type:'defense',  rarity:1, clan:'stone'},
  {id:15, name:'BULWARK',  type:'defense',  rarity:2, clan:'stone'},
  {id:16, name:'PARRY',    type:'defense',  rarity:1, clan:'stone'},
  {id:17, name:'DEFLECT',  type:'defense',  rarity:2, clan:'storm'},
  {id:18, name:'COUNTER',  type:'defense',  rarity:3, clan:'storm'},
  {id:19, name:'MIRROR',   type:'defense',  rarity:4, clan:'void'},
  {id:20, name:'AEGIS II', type:'defense',  rarity:3, clan:'stone'},
  {id:21, name:'RAMPART',  type:'defense',  rarity:2, clan:'stone'},
  {id:22, name:'SENTINEL', type:'defense',  rarity:4, clan:'stone'},
  {id:23, name:'IRONWALL', type:'defense',  rarity:3, clan:'stone'},
  {id:24, name:'FORTRESS', type:'defense',  rarity:5, clan:'stone'},
  // FLEE (25-36)
  {id:25, name:'VANISH',   type:'flee',     rarity:2, clan:'void'},
  {id:26, name:'DASH',     type:'flee',     rarity:1, clan:'storm'},
  {id:27, name:'BLINK',    type:'flee',     rarity:3, clan:'void'},
  {id:28, name:'WARP',     type:'flee',     rarity:4, clan:'void'},
  {id:29, name:'GHOST',    type:'flee',     rarity:3, clan:'void'},
  {id:30, name:'SHADOW',   type:'flee',     rarity:2, clan:'void'},
  {id:31, name:'MIRAGE',   type:'flee',     rarity:3, clan:'void'},
  {id:32, name:'PHASE',    type:'flee',     rarity:4, clan:'void'},
  {id:33, name:'SLIP',     type:'flee',     rarity:1, clan:'storm'},
  {id:34, name:'DISENGAGE',type:'flee',     rarity:2, clan:'storm'},
  {id:35, name:'ELUDE',    type:'flee',     rarity:3, clan:'void'},
  {id:36, name:'ESCAPE',   type:'flee',     rarity:5, clan:'void'},
  // MAGIC (37-48)
  {id:37, name:'BOLT',     type:'magic',    rarity:2, clan:'storm'},
  {id:38, name:'FROST',    type:'magic',    rarity:2, clan:'ice'},
  {id:39, name:'FLARE',    type:'magic',    rarity:3, clan:'fire'},
  {id:40, name:'TEMPEST',  type:'magic',    rarity:4, clan:'storm'},
  {id:41, name:'TSUNAMI',  type:'magic',    rarity:4, clan:'wave'},
  {id:42, name:'QUAKE',    type:'magic',    rarity:3, clan:'stone'},
  {id:43, name:'VOID',     type:'magic',    rarity:4, clan:'void'},
  {id:44, name:'RUNE',     type:'magic',    rarity:3, clan:'void'},
  {id:45, name:'SEAL',     type:'magic',    rarity:3, clan:'void'},
  {id:46, name:'CURSE',    type:'magic',    rarity:3, clan:'thorn'},
  {id:47, name:'ELYON',    type:'magic',    rarity:5, clan:'storm'},
  {id:48, name:'ABYSS',    type:'magic',    rarity:4, clan:'void'},
  // RECOVERY (49-60)
  {id:49, name:'MEND',     type:'recovery', rarity:1, clan:'wave'},
  {id:50, name:'SALVE',    type:'recovery', rarity:1, clan:'thorn'},
  {id:51, name:'HEAL',     type:'recovery', rarity:2, clan:'wave'},
  {id:52, name:'REGEN',    type:'recovery', rarity:3, clan:'wave'},
  {id:53, name:'REVIVE',   type:'recovery', rarity:4, clan:'wave'},
  {id:54, name:'PHOENIX',  type:'recovery', rarity:5, clan:'fire'},
  {id:55, name:'SPRING',   type:'recovery', rarity:2, clan:'wave'},
  {id:56, name:'TRANQUIL', type:'recovery', rarity:3, clan:'wave'},
  {id:57, name:'PURITY',   type:'recovery', rarity:3, clan:'wave'},
  {id:58, name:'REMEDY',   type:'recovery', rarity:2, clan:'thorn'},
  {id:59, name:'BLESS',    type:'recovery', rarity:3, clan:'storm'},
  {id:60, name:'KINGMAKER',type:'recovery', rarity:5, clan:'void'},
];

const RARITY_LABEL = ['', 'Common', 'Uncommon', 'Rare', 'Epic', 'Legendary'];
const TYPE_LABEL   = {
  attack:   'Attack',
  defense:  'Defense',
  flee:     'Flee',
  magic:    'Magic',
  recovery: 'Recovery',
};
const SYMBOL = '0xARK';
const COLLECTION_NAME = '0xARK Cards';
const SELLER_FEE_BASIS_POINTS = 500; // 5% royalty

// ─── Metadata builder ─────────────────────────────────────────────────────────

function buildMetadata(card, imageUri) {
  return {
    name:        `${card.name} — 0xARK Card #${card.id}`,
    symbol:      SYMBOL,
    description: `0xARK is a Fully On-Chain PvP card dueling game on Solana. ${card.name} is a ${RARITY_LABEL[card.rarity]} ${TYPE_LABEL[card.type]} card from the ${card.clan} clan.`,
    image:       imageUri || `https://arweave.net/PLACEHOLDER_${card.id}`,
    seller_fee_basis_points: SELLER_FEE_BASIS_POINTS,
    attributes: [
      { trait_type: 'Type',    value: TYPE_LABEL[card.type] },
      { trait_type: 'Rarity',  value: RARITY_LABEL[card.rarity] },
      { trait_type: 'Clan',    value: card.clan.charAt(0).toUpperCase() + card.clan.slice(1) },
      { trait_type: 'Card ID', value: String(card.id) },
    ],
    properties: {
      files:    [{ uri: imageUri || '', type: 'image/png' }],
      category: 'image',
      creators: [
        // Admin wallet — populated at mint time; placeholder here
        { address: 'ADMIN_WALLET_PLACEHOLDER', share: 100 },
      ],
    },
    collection: {
      name:   COLLECTION_NAME,
      family: '0xARK',
    },
  };
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('0xARK Metadata Generator — T-D16-4');

  // Load portrait URIs (may not exist yet if art not uploaded)
  let portraitUris = {};
  if (fs.existsSync(URI_FILE)) {
    portraitUris = JSON.parse(fs.readFileSync(URI_FILE, 'utf8'));
    console.log(`Loaded ${Object.keys(portraitUris).length} portrait URIs`);
  } else {
    console.log('⚠  portrait-uris.json not found — using PLACEHOLDER URIs');
  }

  if (!fs.existsSync(META_DIR)) fs.mkdirSync(META_DIR, { recursive: true });

  for (const card of CARD_DATA) {
    const imageUri = portraitUris[card.id] || '';
    const meta     = buildMetadata(card, imageUri);
    const outFile  = path.join(META_DIR, `card-${String(card.id).padStart(2, '0')}.json`);
    fs.writeFileSync(outFile, JSON.stringify(meta, null, 2));
    console.log(`[${String(card.id).padStart(2, ' ')}/60] ${card.name.padEnd(12)} → ${outFile}`);
  }

  console.log('\n✓ All 60 metadata JSONs generated in tools/arweave-upload/metadata/');

  if (UPLOAD_MODE) {
    console.log('\nUploading metadata JSONs to Arweave…');
    let Irys;
    try {
      ({ default: Irys } = await import('@irys/sdk'));
    } catch {
      console.error('ERR: @irys/sdk not installed. Run: npm install @irys/sdk');
      process.exit(1);
    }

    const key = process.env.IRYS_PRIVATE_KEY;
    if (!key) { console.error('IRYS_PRIVATE_KEY not set'); process.exit(1); }

    const irys = new Irys({
      url:    'https://devnet.irys.xyz',
      token:  'solana',
      key,
      config: { providerUrl: 'https://api.devnet.solana.com' },
    });
    await irys.ready();

    // Load existing meta URIs for resume
    let metaUris = {};
    if (fs.existsSync(META_URIS)) {
      metaUris = JSON.parse(fs.readFileSync(META_URIS, 'utf8'));
    }

    for (const card of CARD_DATA) {
      if (metaUris[card.id]) {
        console.log(`[${card.id}/60] SKIP (already uploaded)`);
        continue;
      }
      const fp   = path.join(META_DIR, `card-${String(card.id).padStart(2, '0')}.json`);
      const data = fs.readFileSync(fp);
      const tags = [
        { name: 'Content-Type', value: 'application/json' },
        { name: 'App-Name',     value: '0xARK' },
        { name: 'Card-Id',      value: String(card.id) },
      ];
      try {
        const tx = await irys.upload(data, { tags });
        metaUris[card.id] = `https://arweave.net/${tx.id}`;
        console.log(`[${card.id}/60] OK  — ${metaUris[card.id]}`);
        fs.writeFileSync(META_URIS, JSON.stringify(metaUris, null, 2));
      } catch (err) {
        console.error(`[${card.id}/60] ERR — ${err.message}`);
      }
    }
    console.log(`\n✓ Metadata URIs written to ${META_URIS}`);
  }
}

main().catch(err => {
  console.error('Fatal:', err.message);
  process.exit(1);
});

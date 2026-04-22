#!/usr/bin/env node
/**
 * T-D16-3: batch-upload.js — Arweave/Bundlr batch uploader for 0xARK card portraits
 *
 * Uploads all 64×64 PNG card portraits to Arweave via Irys (formerly Bundlr).
 * After upload, writes tools/arweave-upload/portrait-uris.json which maps
 * card_id (1-60) → Arweave URI.
 *
 * Usage:
 *   IRYS_PRIVATE_KEY=<base58 solana keypair> node batch-upload.js [--dry-run] [--dir=./portraits]
 *
 * Prerequisites:
 *   npm install @irys/sdk
 *   Place 64×64 PNGs in ./portraits/ named card-01.png … card-60.png
 *
 * Environment:
 *   IRYS_PRIVATE_KEY    — Solana wallet private key (base58) funding the uploads
 *   PORTRAITS_DIR       — Directory containing card-XX.png files (default: ./portraits)
 *   DRY_RUN             — Set "1" to skip upload and just check files
 */

import Irys from '@irys/sdk';
import fs   from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ─── Config ───────────────────────────────────────────────────────────────────

const PORTRAITS_DIR = process.env.PORTRAITS_DIR
  ? path.resolve(process.env.PORTRAITS_DIR)
  : path.join(__dirname, 'portraits');

const OUTPUT_FILE = path.join(__dirname, 'portrait-uris.json');
const DRY_RUN     = process.env.DRY_RUN === '1'
                 || process.argv.includes('--dry-run');
const SOLANA_RPC  = 'https://api.devnet.solana.com';
const CARD_COUNT  = 60;

function log(msg) {
  console.log(`[${new Date().toISOString()}] ${msg}`);
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function cardFile(cardId) {
  return path.join(PORTRAITS_DIR, `card-${String(cardId).padStart(2, '0')}.png`);
}

async function getIrys() {
  const key = process.env.IRYS_PRIVATE_KEY;
  if (!key) throw new Error('IRYS_PRIVATE_KEY not set');

  const irys = new Irys({
    url:     'https://devnet.irys.xyz',
    token:   'solana',
    key,
    config: { providerUrl: SOLANA_RPC },
  });
  await irys.ready();
  return irys;
}

async function fundIfNeeded(irys, totalBytes) {
  const price       = await irys.getPrice(totalBytes);
  const atomicPrice = BigInt(Math.ceil(Number(price) * 1.1)); // 10% buffer
  const balance     = await irys.getLoadedBalance();
  if (balance < atomicPrice) {
    const needed = atomicPrice - balance;
    log(`Funding Irys node: ${Number(needed) / 1e9} SOL`);
    await irys.fund(needed);
  } else {
    log(`Irys balance sufficient: ${Number(balance) / 1e9} SOL`);
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  log('0xARK Portrait Batch Uploader — T-D16-3');
  log(`Portraits directory: ${PORTRAITS_DIR}`);

  // Check all files exist
  const missing = [];
  for (let i = 1; i <= CARD_COUNT; i++) {
    if (!fs.existsSync(cardFile(i))) missing.push(i);
  }
  if (missing.length > 0) {
    log(`⚠ Missing portrait PNGs: cards ${missing.join(', ')}`);
    log('  Place 64×64 PNG files named card-01.png … card-60.png in the portraits/ directory.');
    if (!DRY_RUN) {
      log('Run with --dry-run to check without uploading.');
      process.exit(1);
    }
  } else {
    log(`✓ All ${CARD_COUNT} portrait files present`);
  }

  if (DRY_RUN) {
    log('[DRY RUN] Skipping upload. Exiting.');
    return;
  }

  // Load existing URIs (allow resume)
  let uris = {};
  if (fs.existsSync(OUTPUT_FILE)) {
    uris = JSON.parse(fs.readFileSync(OUTPUT_FILE, 'utf8'));
    const done = Object.keys(uris).length;
    log(`Resuming: ${done} already uploaded`);
  }

  const irys = await getIrys();

  // Calculate total upload size
  let totalBytes = 0;
  for (let i = 1; i <= CARD_COUNT; i++) {
    if (!uris[i] && fs.existsSync(cardFile(i))) {
      totalBytes += fs.statSync(cardFile(i)).size;
    }
  }
  log(`Total bytes to upload: ${totalBytes}`);

  if (totalBytes > 0) {
    await fundIfNeeded(irys, totalBytes);
  }

  // Upload missing cards
  for (let i = 1; i <= CARD_COUNT; i++) {
    if (uris[i]) {
      log(`[${i}/60] SKIP (already uploaded): ${uris[i]}`);
      continue;
    }
    const fp = cardFile(i);
    if (!fs.existsSync(fp)) {
      log(`[${i}/60] SKIP (file missing)`);
      continue;
    }

    const data = fs.readFileSync(fp);
    const tags = [
      { name: 'Content-Type',     value: 'image/png' },
      { name: 'App-Name',         value: '0xARK' },
      { name: 'Card-Id',          value: String(i) },
    ];

    try {
      const tx = await irys.upload(data, { tags });
      const uri = `https://arweave.net/${tx.id}`;
      uris[i] = uri;
      log(`[${i}/60] OK  — ${uri}`);
      fs.writeFileSync(OUTPUT_FILE, JSON.stringify(uris, null, 2));
    } catch (err) {
      log(`[${i}/60] ERR — ${err.message}`);
    }
  }

  const done = Object.values(uris).filter(Boolean).length;
  log(`\nUpload complete: ${done}/${CARD_COUNT} portraits on Arweave`);
  log(`URI map written to: ${OUTPUT_FILE}`);
}

main().catch(err => {
  console.error('Fatal:', err.message);
  process.exit(1);
});

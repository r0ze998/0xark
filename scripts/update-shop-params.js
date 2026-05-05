#!/usr/bin/env node
// update-shop-params.js — Phase 20-B admin script
// Updates GameWorld drop rates and phase threshold on devnet.
//
// Usage:
//   node scripts/update-shop-params.js \
//     --legendary-rate-phase2 15000 \
//     --threshold-seconds 0
//
// Flags (all optional, values in ppm out of 1_000_000):
//   --legendary-rate-phase1 <n>   (≤100000)
//   --legendary-rate-phase2 <n>   (≤100000)
//   --rare-rate-phase1 <n>
//   --rare-rate-phase2 <n>
//   --uncommon-rate <n>
//   --threshold-seconds <n>        (≤14*24*3600)
//   --keypair <path>               (default: ~/.config/solana/id.json)
//   --rpc <url>                    (default: devnet)

import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import {
  Connection, Keypair, PublicKey, Transaction, TransactionInstruction,
  SystemProgram,
} from '@solana/web3.js';
import crypto from 'node:crypto';

const DEVNET_RPC   = 'https://api.devnet.solana.com';
const PROGRAM_ID   = new PublicKey('5i37jWBiA7bV9XmokyDWHQxjJ5s1sBnSEkPSB4J2XfmN');
const GAME_WORLD_SEED = Buffer.from('game_world');

function parseArgs() {
  const args = process.argv.slice(2);
  const get  = (flag) => {
    const i = args.indexOf(flag);
    return i !== -1 ? args[i + 1] : null;
  };
  return {
    legendaryRatePhase1: get('--legendary-rate-phase1'),
    legendaryRatePhase2: get('--legendary-rate-phase2'),
    rareRatePhase1:      get('--rare-rate-phase1'),
    rareRatePhase2:      get('--rare-rate-phase2'),
    uncommonRate:        get('--uncommon-rate'),
    thresholdSeconds:    get('--threshold-seconds'),
    keypairPath:         get('--keypair') ?? join(homedir(), '.config/solana/id.json'),
    rpc:                 get('--rpc')     ?? DEVNET_RPC,
  };
}

function disc(name) {
  const hash = crypto.createHash('sha256').update(`global:${name}`).digest();
  return hash.slice(0, 8);
}

function writeU32LE(buf, off, val) {
  buf.writeUInt32LE(val >>> 0, off);
  return off + 4;
}

function writeU64LE(buf, off, val) {
  const n = BigInt(val);
  buf.writeBigUInt64LE(n, off);
  return off + 8;
}

function writeOptionU32(buf, off, val) {
  if (val === null) { buf[off] = 0; return off + 1; }
  buf[off] = 1; off++;
  return writeU32LE(buf, off, val);
}

function writeOptionU64(buf, off, val) {
  if (val === null) { buf[off] = 0; return off + 1; }
  buf[off] = 1; off++;
  return writeU64LE(buf, off, val);
}

async function main() {
  const args = parseArgs();

  const keypairRaw = JSON.parse(readFileSync(args.keypairPath, 'utf8'));
  const admin      = Keypair.fromSecretKey(new Uint8Array(keypairRaw));
  const conn       = new Connection(args.rpc, 'confirmed');

  const [gameWorldPDA] = PublicKey.findProgramAddressSync([GAME_WORLD_SEED], PROGRAM_ID);

  const toU32 = (v) => v !== null ? parseInt(v, 10) : null;
  const toU64 = (v) => v !== null ? parseInt(v, 10) : null;

  const p1 = toU32(args.legendaryRatePhase1);
  const p2 = toU32(args.legendaryRatePhase2);
  const r1 = toU32(args.rareRatePhase1);
  const r2 = toU32(args.rareRatePhase2);
  const uc = toU32(args.uncommonRate);
  const ts = toU64(args.thresholdSeconds);

  if ([p1, p2, r1, r2, uc, ts].every(v => v === null)) {
    console.error('No parameters specified. Use --help for usage.');
    process.exit(1);
  }

  const maxBytes = 8 + 5 + 5 + 5 + 5 + 5 + 9;
  const data     = Buffer.alloc(maxBytes);
  let off = disc('update_game_params').copy(data, 0);
  off = writeOptionU32(data, off, p1);
  off = writeOptionU32(data, off, p2);
  off = writeOptionU32(data, off, r1);
  off = writeOptionU32(data, off, r2);
  off = writeOptionU32(data, off, uc);
  off = writeOptionU64(data, off, ts);

  const ix = new TransactionInstruction({
    programId: PROGRAM_ID,
    keys: [
      { pubkey: admin.publicKey, isSigner: true,  isWritable: true  },
      { pubkey: gameWorldPDA,    isSigner: false, isWritable: true  },
    ],
    data: data.slice(0, off),
  });

  console.log('Sending update_game_params...');
  console.log('  GameWorld PDA:', gameWorldPDA.toString());
  console.log('  Admin:        ', admin.publicKey.toString());
  if (p1 !== null) console.log('  legendary_rate_phase1:', p1);
  if (p2 !== null) console.log('  legendary_rate_phase2:', p2);
  if (r1 !== null) console.log('  rare_rate_phase1:     ', r1);
  if (r2 !== null) console.log('  rare_rate_phase2:     ', r2);
  if (uc !== null) console.log('  uncommon_rate:        ', uc);
  if (ts !== null) console.log('  threshold_seconds:    ', ts);

  const tx = new Transaction().add(ix);
  const { blockhash } = await conn.getLatestBlockhash();
  tx.recentBlockhash = blockhash;
  tx.feePayer        = admin.publicKey;
  tx.sign(admin);

  const sig = await conn.sendRawTransaction(tx.serialize());
  await conn.confirmTransaction(sig, 'confirmed');
  console.log('\nDone. Signature:', sig);
}

main().catch(err => { console.error(err); process.exit(1); });

#!/usr/bin/env node
// migrate-shop-fields.js — Phase 20-B migration script
// Reallocates the existing GameWorld PDA to Phase 20-B size and sets shop defaults.
// Run ONCE after deploying the Phase 20-B program upgrade.
//
// Usage:
//   node scripts/migrate-shop-fields.js \
//     --ops-treasury GN3aBaUFPpejXBy2u4SgXuwQkkqRFauqAfXNsXhTPz4f \
//     --prize-pool   C8ui4h9tuYiU55VrMohAoFwjsm5RxKPpmQizX9eAAgMa

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

function disc(name) {
  return crypto.createHash('sha256').update(`global:${name}`).digest().slice(0, 8);
}

function parseArgs() {
  const args = process.argv.slice(2);
  const get  = (flag) => { const i = args.indexOf(flag); return i !== -1 ? args[i + 1] : null; };
  return {
    opsTreasury: get('--ops-treasury') ?? 'GN3aBaUFPpejXBy2u4SgXuwQkkqRFauqAfXNsXhTPz4f',
    prizePool:   get('--prize-pool')   ?? 'C8ui4h9tuYiU55VrMohAoFwjsm5RxKPpmQizX9eAAgMa',
    keypairPath: get('--keypair')      ?? join(homedir(), '.config/solana/id.json'),
    rpc:         get('--rpc')          ?? DEVNET_RPC,
  };
}

async function main() {
  const args = parseArgs();
  const keypairRaw = JSON.parse(readFileSync(args.keypairPath, 'utf8'));
  const admin      = Keypair.fromSecretKey(new Uint8Array(keypairRaw));
  const conn       = new Connection(args.rpc, 'confirmed');

  const [gameWorldPDA] = PublicKey.findProgramAddressSync([GAME_WORLD_SEED], PROGRAM_ID);
  const opsTreasury    = new PublicKey(args.opsTreasury);
  const prizePool      = new PublicKey(args.prizePool);

  // disc(8) + ops_treasury(32) + prize_pool(32) = 72 bytes
  const data = Buffer.alloc(72);
  disc('migrate_shop_fields').copy(data, 0);
  opsTreasury.toBuffer().copy(data, 8);
  prizePool.toBuffer().copy(data, 40);

  const ix = new TransactionInstruction({
    programId: PROGRAM_ID,
    keys: [
      { pubkey: gameWorldPDA,    isSigner: false, isWritable: true  },
      { pubkey: admin.publicKey, isSigner: true,  isWritable: true  },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data,
  });

  console.log('Sending migrate_shop_fields...');
  console.log('  GameWorld PDA:', gameWorldPDA.toString());
  console.log('  ops_treasury: ', opsTreasury.toString());
  console.log('  prize_pool:   ', prizePool.toString());

  const tx = new Transaction().add(ix);
  const { blockhash } = await conn.getLatestBlockhash();
  tx.recentBlockhash = blockhash;
  tx.feePayer        = admin.publicKey;
  tx.sign(admin);

  const sig = await conn.sendRawTransaction(tx.serialize());
  await conn.confirmTransaction(sig, 'confirmed');
  console.log('\nMigration complete. Signature:', sig);
}

main().catch(err => { console.error(err); process.exit(1); });

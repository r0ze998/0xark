#!/usr/bin/env node
/**
 * Admin script: set_waitlist_deadline
 *
 * Pushes the waitlist_close_timestamp on the existing GameWorld PDA.
 * Must be run by the admin wallet (DPMPhnVezSq5im35p4w3bC6XjpNZuuvCDVSAVxw4Q28R).
 *
 * Usage:
 *   ADMIN_KEYPAIR=~/.config/solana/id.json \
 *   SOLANA_RPC=https://api.devnet.solana.com \
 *   node scripts/set-waitlist-deadline.js [new_deadline_unix_timestamp]
 *
 * If new_deadline_unix_timestamp is omitted, defaults to now + 14 days.
 */

const { Connection, PublicKey, Transaction, TransactionInstruction,
        Keypair, sendAndConfirmTransaction } = require('@solana/web3.js');
const { createHash } = require('crypto');
const fs = require('fs');

// ─── Config ───────────────────────────────────────────────────────────────
const PROGRAM_ID_STR = '5i37jWBiA7bV9XmokyDWHQxjJ5s1sBnSEkPSB4J2XfmN';
const ADMIN_PUBKEY   = 'DPMPhnVezSq5im35p4w3bC6XjpNZuuvCDVSAVxw4Q28R';
const DEVNET_RPC     = process.env.SOLANA_RPC ?? 'https://api.devnet.solana.com';

const keypairPath = process.env.ADMIN_KEYPAIR ?? (process.env.HOME + '/.config/solana/id.json');

// ─── Helpers ──────────────────────────────────────────────────────────────
function disc(name) {
  return createHash('sha256').update('global:' + name).digest().slice(0, 8);
}

function writeI64LE(buf, offset, value) {
  const big = BigInt(value);
  const lo  = Number(big & 0xffffffffn);
  const hi  = Number((big >> 32n) & 0xffffffffn);
  buf[offset]     = lo & 0xff;
  buf[offset + 1] = (lo >> 8) & 0xff;
  buf[offset + 2] = (lo >> 16) & 0xff;
  buf[offset + 3] = (lo >> 24) & 0xff;
  buf[offset + 4] = hi & 0xff;
  buf[offset + 5] = (hi >> 8) & 0xff;
  buf[offset + 6] = (hi >> 16) & 0xff;
  buf[offset + 7] = (hi >> 24) & 0xff;
  return offset + 8;
}

// ─── Main ─────────────────────────────────────────────────────────────────
async function main() {
  const raw     = JSON.parse(fs.readFileSync(keypairPath, 'utf8'));
  const adminKp = Keypair.fromSecretKey(Uint8Array.from(raw));

  if (adminKp.publicKey.toBase58() !== ADMIN_PUBKEY) {
    console.error(`ERROR: loaded keypair is ${adminKp.publicKey.toBase58()}`);
    console.error(`       expected admin    ${ADMIN_PUBKEY}`);
    process.exit(1);
  }

  const nowSec      = Math.floor(Date.now() / 1000);
  const newDeadline = process.argv[2]
    ? BigInt(process.argv[2])
    : BigInt(nowSec + 14 * 24 * 3600);  // default: now + 14 days

  const programId = new PublicKey(PROGRAM_ID_STR);
  const conn      = new Connection(DEVNET_RPC, 'confirmed');

  const [gameWorldPDA] = PublicKey.findProgramAddressSync(
    [Buffer.from('game_world')],
    programId
  );

  console.log('Program ID  :', PROGRAM_ID_STR);
  console.log('Admin       :', ADMIN_PUBKEY);
  console.log('GameWorld   :', gameWorldPDA.toBase58());
  console.log('New deadline:', newDeadline.toString(), `(${new Date(Number(newDeadline) * 1000).toISOString()})`);
  console.log('RPC         :', DEVNET_RPC);
  console.log('');

  // disc(8) + new_deadline(i64=8) = 16 bytes
  const discBytes = disc('set_waitlist_deadline');
  const data      = Buffer.alloc(16);
  Buffer.from(discBytes).copy(data, 0);
  writeI64LE(data, 8, newDeadline);

  const ix = new TransactionInstruction({
    keys: [
      { pubkey: adminKp.publicKey, isSigner: true,  isWritable: true  },
      { pubkey: gameWorldPDA,      isSigner: false, isWritable: true  },
    ],
    programId,
    data,
  });

  const tx  = new Transaction().add(ix);
  const sig = await sendAndConfirmTransaction(conn, tx, [adminKp], { commitment: 'confirmed' });

  console.log('✓ set_waitlist_deadline confirmed');
  console.log('  signature:', sig);
  console.log('  explorer :', `https://explorer.solana.com/tx/${sig}?cluster=devnet`);
}

main().catch(err => {
  console.error('FAILED:', err.message ?? err);
  process.exit(1);
});

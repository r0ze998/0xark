#!/usr/bin/env node
/**
 * Admin script: init_game_world
 *
 * Initializes the GameWorld PDA with a game start timestamp.
 * Must be run by the admin wallet (DPMPhnVezSq5im35p4w3bC6XjpNZuuvCDVSAVxw4Q28R).
 *
 * Usage:
 *   ADMIN_KEYPAIR=~/.config/solana/id.json \
 *   SOLANA_RPC=https://api.devnet.solana.com \
 *   node scripts/init-game-world.js [game_start_unix_timestamp]
 *
 * If game_start_unix_timestamp is omitted, uses the current time.
 */

const { Connection, PublicKey, Transaction, TransactionInstruction,
        Keypair, SystemProgram, sendAndConfirmTransaction } = require('@solana/web3.js');
const fs = require('fs');

// ─── Config ───────────────────────────────────────────────────────────────
const PROGRAM_ID_STR = '5i37jWBiA7bV9XmokyDWHQxjJ5s1sBnSEkPSB4J2XfmN';
const ADMIN_PUBKEY   = 'DPMPhnVezSq5im35p4w3bC6XjpNZuuvCDVSAVxw4Q28R';
const DEVNET_RPC     = process.env.SOLANA_RPC ?? 'https://api.devnet.solana.com';

const keypairPath = process.env.ADMIN_KEYPAIR
  ?? (process.env.HOME + '/.config/solana/id.json');

// ─── Helpers ──────────────────────────────────────────────────────────────
const ENC = new TextEncoder();

async function disc(name) {
  const preimage = Buffer.from(`global:${name}`);
  const hash     = await require('crypto').subtle
    ? await crypto.subtle.digest('SHA-256', preimage)
    : require('crypto').createHash('sha256').update(preimage).digest();
  return Buffer.from(hash).slice(0, 8);
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
  // Load admin keypair
  const raw       = JSON.parse(fs.readFileSync(keypairPath, 'utf8'));
  const adminKp   = Keypair.fromSecretKey(Uint8Array.from(raw));

  if (adminKp.publicKey.toBase58() !== ADMIN_PUBKEY) {
    console.error(`ERROR: loaded keypair is ${adminKp.publicKey.toBase58()}`);
    console.error(`       expected admin    ${ADMIN_PUBKEY}`);
    process.exit(1);
  }

  const gameStartTs = process.argv[2]
    ? BigInt(process.argv[2])
    : BigInt(Math.floor(Date.now() / 1000));

  const programId = new PublicKey(PROGRAM_ID_STR);
  const conn      = new Connection(DEVNET_RPC, 'confirmed');

  // PDA: ["game_world"]
  const [gameWorldPDA] = PublicKey.findProgramAddressSync(
    [Buffer.from('game_world')],
    programId
  );

  console.log('Program ID  :', PROGRAM_ID_STR);
  console.log('Admin       :', ADMIN_PUBKEY);
  console.log('GameWorld   :', gameWorldPDA.toBase58());
  console.log('Start ts    :', gameStartTs.toString(), `(${new Date(Number(gameStartTs) * 1000).toISOString()})`);
  console.log('RPC         :', DEVNET_RPC);
  console.log('');

  // Build instruction data: disc(8) + game_start_timestamp(i64=8) = 16 bytes
  const discBytes = await disc('init_game_world');
  const data      = Buffer.alloc(16);
  discBytes.copy(data, 0);
  writeI64LE(data, 8, gameStartTs);

  const ix = new TransactionInstruction({
    keys: [
      { pubkey: gameWorldPDA,                isSigner: false, isWritable: true  },
      { pubkey: adminKp.publicKey,           isSigner: true,  isWritable: true  },
      { pubkey: SystemProgram.programId,     isSigner: false, isWritable: false },
    ],
    programId,
    data,
  });

  const tx = new Transaction().add(ix);
  const sig = await sendAndConfirmTransaction(conn, tx, [adminKp], {
    commitment: 'confirmed',
  });

  console.log('✓ init_game_world confirmed');
  console.log('  signature:', sig);
  console.log('  explorer :', `https://explorer.solana.com/tx/${sig}?cluster=devnet`);
}

main().catch(err => {
  console.error('FAILED:', err.message ?? err);
  process.exit(1);
});

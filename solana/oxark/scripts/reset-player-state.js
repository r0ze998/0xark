#!/usr/bin/env node
/**
 * Admin script: reset_player_state
 *
 * Clears a player's season state so they can re-register on devnet.
 * Must be run by the admin wallet (DPMPhnVezSq5im35p4w3bC6XjpNZuuvCDVSAVxw4Q28R).
 *
 * Usage:
 *   ADMIN_KEYPAIR=~/.config/solana/id.json \
 *   SOLANA_RPC=https://api.devnet.solana.com \
 *   node scripts/reset-player-state.js <player-pubkey>
 */

const { Connection, PublicKey, Transaction, TransactionInstruction,
        Keypair, sendAndConfirmTransaction } = require('@solana/web3.js');
const { createHash } = require('crypto');
const fs = require('fs');

const PROGRAM_ID_STR = '5i37jWBiA7bV9XmokyDWHQxjJ5s1sBnSEkPSB4J2XfmN';
const ADMIN_PUBKEY   = 'DPMPhnVezSq5im35p4w3bC6XjpNZuuvCDVSAVxw4Q28R';
const DEVNET_RPC     = process.env.SOLANA_RPC ?? 'https://api.devnet.solana.com';
const keypairPath    = process.env.ADMIN_KEYPAIR ?? (process.env.HOME + '/.config/solana/id.json');

function disc(name) {
  return createHash('sha256').update('global:' + name).digest().slice(0, 8);
}

async function main() {
  const playerArg = process.argv[2];
  if (!playerArg) { console.error('Usage: node reset-player-state.js <player-pubkey>'); process.exit(1); }

  const raw     = JSON.parse(fs.readFileSync(keypairPath, 'utf8'));
  const adminKp = Keypair.fromSecretKey(Uint8Array.from(raw));

  if (adminKp.publicKey.toBase58() !== ADMIN_PUBKEY) {
    console.error('ERROR: wrong keypair loaded'); process.exit(1);
  }

  const programId = new PublicKey(PROGRAM_ID_STR);
  const playerPK  = new PublicKey(playerArg);
  const conn      = new Connection(DEVNET_RPC, 'confirmed');

  const [playerStatePDA, bump] = PublicKey.findProgramAddressSync(
    [Buffer.from('player'), playerPK.toBytes()],
    programId
  );

  console.log('Admin       :', ADMIN_PUBKEY);
  console.log('Player      :', playerPK.toBase58());
  console.log('PlayerState :', playerStatePDA.toBase58(), '(bump', bump + ')');

  const discBytes = disc('reset_player_state');
  const data      = Buffer.alloc(8);
  Buffer.from(discBytes).copy(data, 0);

  const ix = new TransactionInstruction({
    keys: [
      { pubkey: adminKp.publicKey, isSigner: true,  isWritable: true  },
      { pubkey: playerStatePDA,   isSigner: false, isWritable: true  },
      { pubkey: playerPK,         isSigner: false, isWritable: false },
    ],
    programId,
    data,
  });

  const tx  = new Transaction().add(ix);
  const sig = await sendAndConfirmTransaction(conn, tx, [adminKp], { commitment: 'confirmed' });

  console.log('✓ reset_player_state confirmed');
  console.log('  signature:', sig);
  console.log('  explorer :', `https://explorer.solana.com/tx/${sig}?cluster=devnet`);
}

main().catch(err => { console.error('FAILED:', err.message ?? err); process.exit(1); });

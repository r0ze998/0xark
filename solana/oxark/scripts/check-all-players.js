#!/usr/bin/env node
/**
 * Diagnostic: dump all PlayerState accounts on devnet.
 * Handles both current_queue=None (vault_bitmap@170) and Some (vault_bitmap@202).
 *
 * Usage:
 *   SOLANA_RPC=https://api.devnet.solana.com node scripts/check-all-players.js
 */

const { Connection, PublicKey } = require('@solana/web3.js');
const { createHash } = require('crypto');

const PROGRAM_ID_STR = '5i37jWBiA7bV9XmokyDWHQxjJ5s1sBnSEkPSB4J2XfmN';
const RPC = process.env.SOLANA_RPC ?? 'https://api.devnet.solana.com';

const disc = createHash('sha256').update('account:PlayerState').digest().slice(0, 8);

function decodePlayer(pda, data) {
  const d = data;
  if (d.length < 210) { console.log(`  [skip — too short: ${d.length}b]`); return; }

  const player = new PublicKey(d.slice(16, 48)).toBase58();

  // Option<Pubkey> at offset 169: 0=None, 1=Some
  const queueTag  = d[169];
  const queueNone = queueTag === 0;
  const vaultOff  = queueNone ? 170 : 202;
  const depositOff = queueNone ? 178 : 210;

  if (d.length < depositOff + 8) {
    console.log(`  [skip — data too short for Some layout: ${d.length}b]`);
    return;
  }

  const vault = [];
  for (let b = 0; b < 8; b++)
    for (let bit = 0; bit < 8; bit++)
      if ((d[vaultOff + b] >> bit) & 1) vault.push(b * 8 + bit + 1);

  const dv = new DataView(d.buffer, d.byteOffset, d.byteLength);
  const deposit = Number(dv.getBigUint64(depositOff, true));

  const vaultHex = Buffer.from(d.slice(vaultOff, vaultOff + 8)).toString('hex');

  console.log(`Player : ${player}`);
  console.log(`PDA    : ${pda}`);
  console.log(`Queue  : ${queueNone ? 'None' : 'Some (offset shift!)'} [tag byte=${queueTag}]`);
  console.log(`Vault  : ${vault.length} cards @ offset ${vaultOff} — [${vault.join(', ')}]`);
  console.log(`Bitmap : ${vaultHex}`);
  console.log(`Deposit: ${deposit} lamports (${(deposit / 1e9).toFixed(4)} SOL)`);
  console.log('');
}

(async () => {
  const conn = new Connection(RPC, 'confirmed');
  const programId = new PublicKey(PROGRAM_ID_STR);

  console.log('Fetching all PlayerState accounts…');

  const bs58 = require('bs58');
  const discB58 = bs58.encode(disc);

  const accounts = await conn.getProgramAccounts(programId, {
    filters: [
      { memcmp: { offset: 0, bytes: discB58 } },
    ],
  });

  console.log(`Found ${accounts.length} PlayerState account(s)\n`);

  for (const { pubkey, account } of accounts) {
    decodePlayer(pubkey.toBase58(), account.data);
  }
})().catch(err => { console.error('FAILED:', err.message ?? err); process.exit(1); });

// dev/f1-vault-seed.mjs — Seed fixture wallets A/B vault_bitmaps with the species
// they field in the F1 manual e2e (PR-63 item 2).
//
// Runs AGAINST THE OLD LOCALNET PROGRAM (8CH9…). Must NOT run on devnet.
// Idempotent: reads current vault_bitmap first; skips species already present.
//
// A fields: [3, 24, 25, 27, 28]   handA from f1-fixture-prep.mjs
// B fields: [1, 2, 11, 12, 13]    handB from f1-fixture-prep.mjs
//
// Mechanism: buy_pack (standard, 5 random common cards, 0.05 SOL each).
// All needed species are Commons (1-30) and can drop from standard packs.
// Loop until each missing bit is set; max MAX_PACKS per wallet to avoid runaway.
//
// Usage:
//   OXARK_PROGRAM_ID=8CH9… node dev/f1-vault-seed.mjs
//   (omit env var — defaults to localnet 8CH9)
//
// Keys:  dev/fixture-keys/A.json + B.json (relay clone path, gitignored)

import crypto from 'node:crypto';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const RELAY_CLONE = '/Users/hiroprotagonist/Projects/0xark';
const web3 = require(`${RELAY_CLONE}/solana/oxark/node_modules/@solana/web3.js`);
const {
  Connection, Keypair, PublicKey, Transaction, TransactionInstruction,
  SystemProgram, ComputeBudgetProgram, sendAndConfirmTransaction,
} = web3;

const RPC        = process.env.RPC ?? 'http://localhost:8899';
const PROGRAM_ID = new PublicKey(
  process.env.OXARK_PROGRAM_ID ?? '8CH9NtjP6iKSpc8A6RgyM1iD7bdxaKgSNSLaPaQQhx85'
);
const SLOT_HASHES_PK = new PublicKey('SysvarS1otHashes111111111111111111111111111');
const ENC = new TextEncoder();

// handA / handB from f1-fixture-prep.mjs (the species that must be in vault)
const NEEDS_A = [3, 24, 25, 27, 28];
const NEEDS_B = [1, 2, 11, 12, 13];
const MAX_PACKS = 80; // ~80×0.05 = 4 SOL max; far more than needed statistically

const conn = new Connection(RPC, 'confirmed');
const disc  = (n) => crypto.createHash('sha256').update(`global:${n}`).digest().slice(0, 8);
const pda   = (seeds) => PublicKey.findProgramAddressSync(seeds, PROGRAM_ID)[0];
const gwPda = () => pda([ENC.encode('game_world')]);
const ppPda = () => pda([ENC.encode('prize_pool')]);
const psPda = (owner) => pda([ENC.encode('player'), owner.toBytes()]);

const HEAP    = ComputeBudgetProgram.requestHeapFrame({ bytes: 262144 }); // buy_pack needs ~262KB for SlotHashes borrow
const CULIMIT = ComputeBudgetProgram.setComputeUnitLimit({ units: 400000 });

// vault_bitmap is at offset 170 (queue=None) or 202 (queue=Some).
// d[169] is the Option<Pubkey> discriminator for current_queue.
function vaultOff(d) { return d[169] === 0 ? 170 : 202; }

function hasCard(d, id) {
  const off = vaultOff(d);
  const idx = id - 1;
  return Boolean((d[off + Math.floor(idx / 8)] >> (idx % 8)) & 1);
}

async function readVaultBitmap(ownerPk) {
  const info = await conn.getAccountInfo(psPda(ownerPk));
  if (!info) throw new Error(`PlayerState missing for ${ownerPk.toBase58()}`);
  return info.data;
}

async function readOpsTreasury() {
  const info = await conn.getAccountInfo(gwPda());
  if (!info) throw new Error('GameWorld not found — is the validator up with the parked ledger?');
  return new PublicKey(info.data.subarray(93, 93 + 32));
}

function ixBuyPack(buyerPk, opsTreasury) {
  return new TransactionInstruction({
    programId: PROGRAM_ID,
    data: Buffer.concat([disc('buy_pack'), Buffer.from([0])]), // packType=0 (standard, 5 commons)
    keys: [
      { pubkey: buyerPk,       isSigner: true,  isWritable: true  },
      { pubkey: psPda(buyerPk), isSigner: false, isWritable: true  },
      { pubkey: gwPda(),        isSigner: false, isWritable: false },
      { pubkey: opsTreasury,   isSigner: false, isWritable: true  },
      { pubkey: ppPda(),        isSigner: false, isWritable: true  },
      { pubkey: SLOT_HASHES_PK, isSigner: false, isWritable: false },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
  });
}

async function sendPack(wallet, opsTreasury, label) {
  const tx = new Transaction().add(HEAP, CULIMIT, ixBuyPack(wallet.publicKey, opsTreasury));
  const sig = await sendAndConfirmTransaction(conn, tx, [wallet], { commitment: 'confirmed' });
  return sig.slice(0, 12);
}

async function seedWallet(wallet, needed, opsTreasury, label) {
  let d = await readVaultBitmap(wallet.publicKey);
  const missing = () => needed.filter(id => !hasCard(d, id));

  const initial = missing();
  if (initial.length === 0) {
    console.log(`  ${label}: all ${needed.join(',')} already in vault — skipped`);
    return;
  }
  console.log(`  ${label}: needs [${initial.join(',')}] of [${needed.join(',')}]`);

  for (let i = 1; i <= MAX_PACKS; i++) {
    if (missing().length === 0) break;
    const sig = await sendPack(wallet, opsTreasury, label);
    d = await readVaultBitmap(wallet.publicKey);
    const left = missing();
    console.log(`    pack ${i}: sig ${sig}…  still missing: [${left.length ? left.join(',') : 'none — done'}]`);
  }

  const leftover = missing();
  if (leftover.length > 0) {
    console.error(`FATAL: ${label} still missing [${leftover.join(',')}] after ${MAX_PACKS} packs`);
    process.exit(1);
  }
  console.log(`  ✓ ${label} vault complete — has all [${needed.join(',')}]`);
}

(async () => {
  console.log(`\n═══ F1 vault seed — ${RPC} ═══`);
  try { await conn.getVersion(); }
  catch { console.error(`FATAL: no validator at ${RPC} — start with dev/e2e-session.sh`); process.exit(1); }

  const prog = await conn.getAccountInfo(PROGRAM_ID);
  if (!prog?.executable) {
    console.error(`FATAL: program ${PROGRAM_ID.toBase58()} not deployed — wrong ledger?`); process.exit(1);
  }

  const keyA = JSON.parse(readFileSync(`${RELAY_CLONE}/dev/fixture-keys/A.json`, 'utf8'));
  const keyB = JSON.parse(readFileSync(`${RELAY_CLONE}/dev/fixture-keys/B.json`, 'utf8'));
  const A = Keypair.fromSecretKey(new Uint8Array(keyA));
  const B = Keypair.fromSecretKey(new Uint8Array(keyB));

  console.log(`A: ${A.publicKey.toBase58()}`);
  console.log(`B: ${B.publicKey.toBase58()}`);

  const opsTreasury = await readOpsTreasury();
  console.log(`ops_treasury (from GameWorld@93): ${opsTreasury.toBase58()}\n`);

  await seedWallet(A, NEEDS_A, opsTreasury, 'A');
  await seedWallet(B, NEEDS_B, opsTreasury, 'B');

  // Final verification
  console.log('\n── final verification ──');
  const dA = await readVaultBitmap(A.publicKey);
  const dB = await readVaultBitmap(B.publicKey);
  const bitmapStr = (d) => Array.from(d.slice(vaultOff(d), vaultOff(d)+8)).map(b=>b.toString(16).padStart(2,'0')).join(' ');
  const allHave = (d, ids) => ids.every(id => hasCard(d, id));

  const aOk = allHave(dA, NEEDS_A);
  const bOk = allHave(dB, NEEDS_B);
  console.log(`  A vault_bitmap: ${bitmapStr(dA)}  energy: ${dA[vaultOff(dA)+54]}`);
  console.log(`  A has [${NEEDS_A.join(',')}]: ${aOk ? 'YES ✓' : 'NO ✗'}`);
  console.log(`  B vault_bitmap: ${bitmapStr(dB)}  energy: ${dB[vaultOff(dB)+54]}`);
  console.log(`  B has [${NEEDS_B.join(',')}]: ${bOk ? 'YES ✓' : 'NO ✗'}`);

  if (!aOk || !bOk) { console.error('\nVAULT SEED INCOMPLETE'); process.exit(1); }
  console.log('\n✓ VAULT SEED COMPLETE — honest reveals will pass RevealCardNotOwned once program is upgraded');
})().catch(e => { console.error('\nSEED FAILED:', e.message ?? e); process.exit(1); });

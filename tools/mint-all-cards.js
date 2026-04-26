#!/usr/bin/env node
/**
 * mint-all-cards.js — Mint all 60 0xARK cards on devnet for submission proof
 *
 * Usage: node tools/mint-all-cards.js
 * Output: docs/devnet-mint-records.json
 *
 * Requires:
 *   - ~/.config/solana/id.json (deployer keypair, DPMPhnVezSq5im35p4w3bC6XjpNZuuvCDVSAVxw4Q28R)
 *   - devnet RPC
 *   - oxark-cards program deployed at 236FNPRbJr5W7qeV9fJCYsxDEkruSK6fnNAipf47Mq1S
 */

'use strict';

const fs     = require('fs');
const path   = require('path');
const crypto = require('crypto');
const {
  Connection, Keypair, PublicKey, Transaction,
  TransactionInstruction, SystemProgram,
  SYSVAR_RENT_PUBKEY: RENT_PK,
} = require('../solana/oxark/node_modules/@solana/web3.js');

// ── Config ───────────────────────────────────────────────────────────────────
const DEVNET_RPC                  = 'https://api.devnet.solana.com';
const CARDS_PROGRAM_ID            = new PublicKey('236FNPRbJr5W7qeV9fJCYsxDEkruSK6fnNAipf47Mq1S');
const SPL_TOKEN_PROGRAM_ID        = new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');
const ASSOCIATED_TOKEN_PROGRAM_ID = new PublicKey('ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL');
const TOKEN_METADATA_PROGRAM_ID   = new PublicKey('metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s');
const COMPUTE_BUDGET_PROGRAM_ID   = new PublicKey('ComputeBudget111111111111111111111111111111');
const PRIORITY_FEE_MICRO_LAMPORTS = 1_000n;
const COMPUTE_UNITS               = 200_000;
const MINT_DELAY_MS               = 1500; // 1.5s between mints to avoid rate limits

const SOLO_CARD_SEED = Buffer.from('solo_card');
const ENC            = new TextEncoder();

const NFT_CARD_NAMES = [
  'AEGIS','UMBRA','IGNIS','STRIKE','SLASH','IMPALE','CRUSH','FLURRY','BERSERK','VENOM','REAPER','VOIDBLADE',
  'GUARD','PARRY','IRON WALL','COUNTER','AEGIS WARD','MIRROR','FORTRESS','CRYSTAL','NULLIFY','ABS GUARD','SANCTUARY','TITAN',
  'DASH','RETREAT','SMOKE','PHASE','BLINK','SHADOW','WINDASH','PHANTOM','VOIDSTEP','TIMESKIP','ARK GATE','GENESIS',
  'TEMPEST','NIHIL','SPARK','FROST','BLAZE','STATIC','INFERNO','BLIZZARD','THUNDER','MAELSTROM','GRAVITY','SINGULARITY',
  'MEND','REST','POTION','BANDAGE','REJUVEN','WARD','LIFEDRAIN','PHOENIX','ELIXIR','HOLY LIGHT','GEN PULSE','ARK BLESS',
];

// ── Helpers ──────────────────────────────────────────────────────────────────
function discSync(name) {
  const preimage = Buffer.from(`global:${name}`);
  return crypto.createHash('sha256').update(preimage).digest().slice(0, 8);
}

const MINT_SOLO_DISC = discSync('mint_solo_card');

function findSoloCardMintPDA(playerPk, cardId) {
  return PublicKey.findProgramAddressSync(
    [SOLO_CARD_SEED, playerPk.toBytes(), Buffer.from([cardId])],
    CARDS_PROGRAM_ID
  );
}

function findATA(owner, mint) {
  return PublicKey.findProgramAddressSync(
    [owner.toBytes(), SPL_TOKEN_PROGRAM_ID.toBytes(), mint.toBytes()],
    ASSOCIATED_TOKEN_PROGRAM_ID
  );
}

function findMetadataPDA(mint) {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('metadata'), TOKEN_METADATA_PROGRAM_ID.toBytes(), mint.toBytes()],
    TOKEN_METADATA_PROGRAM_ID
  );
}

function writeU32LE(buf, offset, value) {
  const v = value >>> 0;
  buf[offset]     = v & 0xff;
  buf[offset + 1] = (v >> 8) & 0xff;
  buf[offset + 2] = (v >> 16) & 0xff;
  buf[offset + 3] = (v >> 24) & 0xff;
  return offset + 4;
}

function encodeCreateMetadataV3(name, symbol, uri) {
  const nameB   = Buffer.from(name);
  const symbolB = Buffer.from(symbol);
  const uriB    = Buffer.from(uri);
  // 1(disc=33) + 4+N(name) + 4+M(symbol) + 4+L(uri) + 2(royalty) + 5(none opts)
  const buf = Buffer.alloc(1 + 4 + nameB.length + 4 + symbolB.length + 4 + uriB.length + 7);
  let o = 0;
  buf[o++] = 33; // CreateMetadataAccountsV3 discriminant
  o = writeU32LE(buf, o, nameB.length);   nameB.copy(buf, o);   o += nameB.length;
  o = writeU32LE(buf, o, symbolB.length); symbolB.copy(buf, o); o += symbolB.length;
  o = writeU32LE(buf, o, uriB.length);   uriB.copy(buf, o);    o += uriB.length;
  buf[o++] = 244; buf[o++] = 1; // sellerFeeBasisPoints 500 = 0x01F4 LE
  buf[o++] = 0; // creators: None
  buf[o++] = 0; // collection: None
  buf[o++] = 0; // uses: None
  buf[o++] = 1; // is_mutable: true
  buf[o++] = 0; // collection_details: None
  return buf;
}

function makeBudgetIxs() {
  const limitData = Buffer.alloc(5);
  limitData[0] = 0x02;
  new DataView(limitData.buffer).setUint32(1, COMPUTE_UNITS, true);
  const limitIx = new TransactionInstruction({ keys: [], programId: COMPUTE_BUDGET_PROGRAM_ID, data: limitData });

  const priceData = Buffer.alloc(9);
  priceData[0] = 0x03;
  new DataView(priceData.buffer).setUint32(1, Number(PRIORITY_FEE_MICRO_LAMPORTS & 0xffffffffn), true);
  new DataView(priceData.buffer).setUint32(5, Number(PRIORITY_FEE_MICRO_LAMPORTS >> 32n), true);
  const priceIx = new TransactionInstruction({ keys: [], programId: COMPUTE_BUDGET_PROGRAM_ID, data: priceData });

  return [limitIx, priceIx];
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// ── Main ─────────────────────────────────────────────────────────────────────
async function mintCard(conn, payer, cardId) {
  const [mintPDA]     = findSoloCardMintPDA(payer.publicKey, cardId);
  const [playerATA]   = findATA(payer.publicKey, mintPDA);
  const [metadataPDA] = findMetadataPDA(mintPDA);

  const cardName = `0xARK #${String(cardId).padStart(3, '0')} — ${NFT_CARD_NAMES[cardId - 1] || ''}`;
  const metaUri  = `https://r0ze998.github.io/0xark/nft/card/${cardId}.json`;

  // Ix 1: mint_solo_card (Anchor)
  const anchorData = Buffer.alloc(9);
  MINT_SOLO_DISC.copy(anchorData, 0);
  anchorData[8] = cardId & 0xff;

  const mintIx = new TransactionInstruction({
    programId: CARDS_PROGRAM_ID,
    keys: [
      { pubkey: mintPDA,             isSigner: false, isWritable: true  },
      { pubkey: playerATA,           isSigner: false, isWritable: true  },
      { pubkey: payer.publicKey,     isSigner: true,  isWritable: true  },
      { pubkey: SPL_TOKEN_PROGRAM_ID,        isSigner: false, isWritable: false },
      { pubkey: ASSOCIATED_TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: SystemProgram.programId,     isSigner: false, isWritable: false },
      { pubkey: RENT_PK,             isSigner: false, isWritable: false },
    ],
    data: anchorData,
  });

  // Ix 2: create_metadata_accounts_v3 (Metaplex)
  const metaIx = new TransactionInstruction({
    programId: TOKEN_METADATA_PROGRAM_ID,
    keys: [
      { pubkey: metadataPDA,         isSigner: false, isWritable: true  },
      { pubkey: mintPDA,             isSigner: false, isWritable: false },
      { pubkey: payer.publicKey,     isSigner: true,  isWritable: false }, // mint authority
      { pubkey: payer.publicKey,     isSigner: true,  isWritable: true  }, // payer
      { pubkey: payer.publicKey,     isSigner: false, isWritable: false }, // update authority
      { pubkey: SystemProgram.programId,     isSigner: false, isWritable: false },
      { pubkey: RENT_PK,             isSigner: false, isWritable: false },
    ],
    data: encodeCreateMetadataV3(cardName, '0xARK', metaUri),
  });

  // Ix 3: set_authority → None (burn mint authority)
  const burnData = Buffer.alloc(35);
  burnData[0] = 6; // SetAuthority
  burnData[1] = 0; // MintTokens authority type
  burnData[2] = 0; // COption::None

  const burnIx = new TransactionInstruction({
    programId: SPL_TOKEN_PROGRAM_ID,
    keys: [
      { pubkey: mintPDA,         isSigner: false, isWritable: true  },
      { pubkey: payer.publicKey, isSigner: true,  isWritable: false },
    ],
    data: burnData,
  });

  const { blockhash, lastValidBlockHeight } = await conn.getLatestBlockhash();
  const [limitIx, priceIx] = makeBudgetIxs();

  const tx = new Transaction();
  tx.add(limitIx, priceIx, mintIx, metaIx, burnIx);
  tx.feePayer       = payer.publicKey;
  tx.recentBlockhash = blockhash;
  tx.sign(payer);

  const sig = await conn.sendRawTransaction(tx.serialize(), { skipPreflight: false, maxRetries: 3 });
  await conn.confirmTransaction({ signature: sig, blockhash, lastValidBlockHeight }, 'confirmed');

  return {
    sig,
    mintAddress: mintPDA.toString(),
    metadataAddress: metadataPDA.toString(),
  };
}

async function main() {
  const keyData = JSON.parse(fs.readFileSync('/Users/hiroprotagonist/.config/solana/id.json', 'utf8'));
  const payer   = Keypair.fromSecretKey(Uint8Array.from(keyData));
  const conn    = new Connection(DEVNET_RPC, 'confirmed');

  console.log(`Wallet: ${payer.publicKey.toString()}`);
  const bal = await conn.getBalance(payer.publicKey);
  console.log(`Balance: ${(bal / 1e9).toFixed(4)} SOL`);
  console.log(`Minting 60 cards...\n`);

  const records = [];
  const errors  = [];

  for (let cardId = 1; cardId <= 60; cardId++) {
    const name = NFT_CARD_NAMES[cardId - 1];
    process.stdout.write(`[${String(cardId).padStart(2)}/${60}] #${String(cardId).padStart(3,'0')} ${name.padEnd(12)} `);

    try {
      const { sig, mintAddress, metadataAddress } = await mintCard(conn, payer, cardId);
      const solscanUrl = `https://solscan.io/token/${mintAddress}?cluster=devnet`;
      records.push({ card_id: cardId, name, mint_address: mintAddress, metadata_address: metadataAddress, sig, solscan_url: solscanUrl });
      console.log(`✓ ${mintAddress.slice(0, 8)}... ${sig.slice(0, 8)}...`);
    } catch (err) {
      const msg = err.message || String(err);
      // Already minted = PDA already exists → treat as success, just fetch existing
      if (msg.includes('already in use') || msg.includes('custom program error: 0x0') || msg.includes('AccountAlreadyInitialized')) {
        const [mintPDA]     = findSoloCardMintPDA(payer.publicKey, cardId);
        const [metadataPDA] = findMetadataPDA(mintPDA);
        const solscanUrl = `https://solscan.io/token/${mintPDA.toString()}?cluster=devnet`;
        records.push({ card_id: cardId, name, mint_address: mintPDA.toString(), metadata_address: metadataPDA.toString(), sig: null, solscan_url: solscanUrl, note: 'already_minted' });
        console.log(`⊙ already minted — ${mintPDA.toString().slice(0, 8)}...`);
      } else {
        errors.push({ card_id: cardId, name, error: msg });
        console.log(`✗ ERROR: ${msg.slice(0, 80)}`);
      }
    }

    if (cardId < 60) await sleep(MINT_DELAY_MS);
  }

  // Write records
  const outPath = path.join(__dirname, '../docs/devnet-mint-records.json');
  const output  = {
    generated_at: new Date().toISOString(),
    wallet: payer.publicKey.toString(),
    program_id: CARDS_PROGRAM_ID.toString(),
    total_cards: 60,
    minted_ok: records.filter(r => !r.note).length,
    already_minted: records.filter(r => r.note === 'already_minted').length,
    errors: errors.length,
    records,
    error_list: errors,
  };
  fs.writeFileSync(outPath, JSON.stringify(output, null, 2));
  console.log(`\nRecords saved → ${outPath}`);
  console.log(`OK: ${output.minted_ok}  Already: ${output.already_minted}  Errors: ${output.errors}`);

  if (errors.length > 0) {
    console.log('\nFailed cards:');
    errors.forEach(e => console.log(`  #${e.card_id} ${e.name}: ${e.error}`));
    process.exit(1);
  }
}

main().catch(err => { console.error(err); process.exit(1); });

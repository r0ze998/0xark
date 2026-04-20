#!/usr/bin/env node
/**
 * T42 E2E — x402 Card P2P
 *
 * Tests:
 *   1. list_card (create CardListing PDA)
 *   2. POST /card-buy with dev bypass → sale session details
 *   3. buy_card instruction (on-chain CardSaleRecord PDA + listing deactivated)
 *   4. Verify CardListing.active == false
 *   5. Verify CardSaleRecord PDA fields
 *
 * Usage: node tests/t42-card-p2p-e2e.js
 * Requires: devnet SOL, agent-broker running (or bypass mode)
 */

const web3 = require('../../../multiplayer/node_modules/@solana/web3.js');
const crypto = require('crypto');
const fs   = require('fs');
const http = require('http');

// ─── Config ──────────────────────────────────────────────────────────────────
const CARDS_PROGRAM_ID = new web3.PublicKey('236FNPRbJr5W7qeV9fJCYsxDEkruSK6fnNAipf47Mq1S');
const DEVNET_RPC       = process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com';
const BROKER_URL       = process.env.BROKER_URL     || 'http://localhost:3402';
const TEST_CARD_ID     = 7;          // BERSERK (attack, r3) — arbitrary test card
const TEST_PRICE       = 5_000_000n; // 0.005 SOL in lamports

// ─── Keypair ─────────────────────────────────────────────────────────────────
const keypairPath = `${process.env.HOME}/.config/solana/id.json`;
const keypairRaw  = JSON.parse(fs.readFileSync(keypairPath));
const payer       = web3.Keypair.fromSecretKey(Uint8Array.from(keypairRaw));
const conn        = new web3.Connection(DEVNET_RPC, 'confirmed');

console.log('=== T42 Card P2P E2E ===');
console.log('Payer/Seller:', payer.publicKey.toBase58());
console.log('Buyer:        (same wallet — self-trade test)');
console.log('Cards Program:', CARDS_PROGRAM_ID.toBase58());
console.log('Broker:', BROKER_URL);
console.log('');

// ─── Helpers ─────────────────────────────────────────────────────────────────
function disc(name) {
  return crypto.createHash('sha256').update(`global:${name}`).digest().slice(0, 8);
}
function u8(n)   { return Buffer.from([n]); }
function u64LE(n) { const b = Buffer.alloc(8); b.writeBigUInt64LE(BigInt(n), 0); return b; }

function findPDA(seeds) {
  return web3.PublicKey.findProgramAddressSync(seeds, CARDS_PROGRAM_ID);
}

async function sendIx(label, ixData, keys) {
  const ix = new web3.TransactionInstruction({ programId: CARDS_PROGRAM_ID, keys, data: ixData });
  const tx = new web3.Transaction();
  tx.add(ix);
  const bh = await conn.getLatestBlockhash('confirmed');
  tx.recentBlockhash = bh.blockhash;
  tx.feePayer = payer.publicKey;
  tx.sign(payer);
  const sig = await conn.sendRawTransaction(tx.serialize(), { skipPreflight: false });
  await conn.confirmTransaction({ signature: sig, ...bh }, 'confirmed');
  console.log(`  [${label}] ✅ sig=${sig.slice(0, 20)}...`);
  return sig;
}

async function postJson(path, body, headers = {}) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const url  = new URL(BROKER_URL + path);
    const opts = {
      hostname: url.hostname,
      port:     url.port || 3402,
      path:     url.pathname,
      method:   'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data),
        ...headers,
      },
    };
    const req = http.request(opts, (res) => {
      let chunks = '';
      res.on('data', d => { chunks += d; });
      res.on('end', () => resolve({ status: res.statusCode, body: JSON.parse(chunks) }));
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

let passed = 0, failed = 0;
function assert(label, cond, detail = '') {
  if (cond) { console.log(`  ✅ ${label}`); passed++; }
  else { console.error(`  ❌ FAIL: ${label}${detail ? ' — ' + detail : ''}`); failed++; }
}

// ─── Main ─────────────────────────────────────────────────────────────────────
(async () => {
  try {
    // ── Step 1: list_card ────────────────────────────────────────────────────
    console.log('\n[1] list_card (CardListing PDA)');
    const [listingPda] = findPDA([
      Buffer.from('card_listing'),
      payer.publicKey.toBuffer(),
      u8(TEST_CARD_ID),
    ]);

    const existingListing = await conn.getAccountInfo(listingPda, 'confirmed');
    if (!existingListing) {
      // list_card discriminator + card_id(u8)[1] + price_lamports(u64)[8]
      const ixData = Buffer.concat([
        disc('list_card'),
        u8(TEST_CARD_ID),
        u64LE(TEST_PRICE),
      ]);

      await sendIx('list_card', ixData, [
        { pubkey: listingPda,                   isSigner: false, isWritable: true  },
        { pubkey: payer.publicKey,              isSigner: true,  isWritable: true  },
        { pubkey: web3.SystemProgram.programId, isSigner: false, isWritable: false },
      ]);
    } else {
      console.log('  [list_card] listing already exists — checking state');
    }

    // Verify CardListing PDA
    const listingInfo = await conn.getAccountInfo(listingPda, 'confirmed');
    assert('CardListing PDA exists',           listingInfo !== null);
    assert('CardListing owned by program',     listingInfo?.owner.equals(CARDS_PROGRAM_ID));

    if (listingInfo) {
      const d = listingInfo.data;
      // Layout: disc[8] + seller[32] + card_id[1] + price[8] + active[1] + bump[1]
      const LISTING_CARD_ID_OFFSET = 8 + 32;
      const LISTING_PRICE_OFFSET   = 8 + 32 + 1;
      const LISTING_ACTIVE_OFFSET  = 8 + 32 + 1 + 8;

      const storedCardId = d[LISTING_CARD_ID_OFFSET];
      const storedPrice  = d.readBigUInt64LE(LISTING_PRICE_OFFSET);
      const isActive     = d[LISTING_ACTIVE_OFFSET] === 1;

      assert('CardListing.card_id == TEST_CARD_ID', storedCardId === TEST_CARD_ID, `stored=${storedCardId}`);
      assert('CardListing.price_lamports set',       storedPrice > 0n, `stored=${storedPrice}`);
      // May be false if already purchased in a prior run — acceptable
      console.log(`  CardListing.active: ${isActive}`);
    }

    // ── Step 2: POST /card-buy (dev bypass) ──────────────────────────────────
    console.log('\n[2] POST /card-buy (dev bypass)');
    const buyBody = {
      card_id:        TEST_CARD_ID,
      seller_pubkey:  payer.publicKey.toBase58(),
      buyer_pubkey:   payer.publicKey.toBase58(),   // self-trade for test
      price_lamports: Number(TEST_PRICE),
    };

    const buyResp = await postJson('/card-buy', buyBody, { 'X-Payment': 'local-dev-bypass' });
    assert('HTTP 200 from /card-buy',      buyResp.status === 200,
      `got ${buyResp.status}: ${JSON.stringify(buyResp.body).slice(0,80)}`);

    const sale = buyResp.body;
    assert('sale_session_id present',      typeof sale.sale_session_id === 'string');
    assert('card_id matches',              sale.card_id === TEST_CARD_ID);
    assert('seller_pubkey present',        typeof sale.seller_pubkey === 'string');
    assert('payment_sig present',          typeof sale.payment_sig === 'string');
    assert('sold_at present',              typeof sale.sold_at === 'number');

    console.log('  sale_session_id:', sale.sale_session_id);
    console.log('  sold_at:', new Date(sale.sold_at * 1000).toISOString());

    // ── Step 3: buy_card (on-chain CardSaleRecord PDA) ────────────────────────
    console.log('\n[3] buy_card (CardSaleRecord PDA)');
    const [salePda] = findPDA([
      Buffer.from('card_sale'),
      payer.publicKey.toBuffer(),   // buyer
      u8(TEST_CARD_ID),
      payer.publicKey.toBuffer(),   // seller (same wallet — self-trade test)
    ]);

    const existingSale = await conn.getAccountInfo(salePda, 'confirmed');
    if (!existingSale) {
      const paymentTxLo = Buffer.alloc(32, 0);
      const paymentTxHi = Buffer.alloc(32, 0);

      // buy_card layout: disc[8] + card_id(u8)[1] + seller_key(pubkey)[32] + tx_lo[32] + tx_hi[32]
      const ixData = Buffer.concat([
        disc('buy_card'),
        u8(TEST_CARD_ID),
        payer.publicKey.toBuffer(),  // seller_key
        paymentTxLo,
        paymentTxHi,
      ]);

      await sendIx('buy_card', ixData, [
        { pubkey: listingPda,                        isSigner: false, isWritable: true  },
        { pubkey: salePda,                           isSigner: false, isWritable: true  },
        { pubkey: payer.publicKey,                   isSigner: true,  isWritable: true  },  // buyer
        { pubkey: web3.SYSVAR_CLOCK_PUBKEY,          isSigner: false, isWritable: false },
        { pubkey: web3.SystemProgram.programId,      isSigner: false, isWritable: false },
      ]);
    } else {
      console.log('  [buy_card] sale record already exists — reading');
    }

    // ── Step 4: Verify CardListing.active == false ────────────────────────────
    console.log('\n[4] Verify CardListing deactivated');
    const listingAfter = await conn.getAccountInfo(listingPda, 'confirmed');
    if (listingAfter) {
      const LISTING_ACTIVE_OFFSET = 8 + 32 + 1 + 8;
      const isActiveAfter = listingAfter.data[LISTING_ACTIVE_OFFSET] === 1;
      assert('CardListing.active == false after purchase', !isActiveAfter, `active=${isActiveAfter}`);
    } else {
      assert('CardListing still exists', false);
    }

    // ── Step 5: Verify CardSaleRecord PDA ────────────────────────────────────
    console.log('\n[5] Verify CardSaleRecord PDA');
    const saleInfo = await conn.getAccountInfo(salePda, 'confirmed');
    assert('CardSaleRecord PDA exists',       saleInfo !== null);
    assert('CardSaleRecord owned by program', saleInfo?.owner.equals(CARDS_PROGRAM_ID));

    if (saleInfo) {
      const d = saleInfo.data;
      // Layout: disc[8] + seller[32] + buyer[32] + card_id[1] + price[8] + sold_at[8] + tx_lo[32] + tx_hi[32] + bump[1]
      const SALE_CARD_ID_OFFSET  = 8 + 32 + 32;
      const SALE_PRICE_OFFSET    = 8 + 32 + 32 + 1;
      const SALE_SOLD_AT_OFFSET  = 8 + 32 + 32 + 1 + 8;

      const storedCardId = d[SALE_CARD_ID_OFFSET];
      const storedPrice  = d.readBigUInt64LE(SALE_PRICE_OFFSET);
      const soldAt       = Number(d.readBigInt64LE(SALE_SOLD_AT_OFFSET));
      const nowTs        = Math.floor(Date.now() / 1000);

      assert('CardSaleRecord.card_id == TEST_CARD_ID', storedCardId === TEST_CARD_ID, `stored=${storedCardId}`);
      assert('CardSaleRecord.sold_at > 0',             soldAt > 0, `sold_at=${soldAt}`);
      assert('CardSaleRecord.sold_at <= now',          soldAt <= nowTs + 5, `sold_at=${soldAt} now=${nowTs}`);
      assert('CardSaleRecord.price_lamports set',      storedPrice === TEST_PRICE, `stored=${storedPrice}`);

      console.log('  CardSaleRecord data:');
      console.log('    card_id:  ', storedCardId);
      console.log('    price:    ', storedPrice.toString(), 'lamports');
      console.log('    sold_at:  ', new Date(soldAt * 1000).toISOString());
    }

    console.log(`\n=== T42 RESULT: ${passed} passed, ${failed} failed ===`);
    if (failed > 0) process.exit(1);

  } catch (e) {
    console.error('\n[FATAL]', e.message ?? e);
    process.exit(1);
  }
})();

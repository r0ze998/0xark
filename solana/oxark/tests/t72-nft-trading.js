#!/usr/bin/env node
/**
 * T72 E2E — NFT Trading House
 *
 * Tests:
 *   onchain.js: listCard, buyCard, cancelListing, getListings stubs
 *   State vars: nftSelIdx, nftListings, nftListPrice, nftTxPhase, NFT_LIST_PRICES, NFT_SHOP_TABS
 *   drawNFTTradingShop: 3-tab UI (MY CARDS, MARKET, MY LISTINGS)
 *   TX phases: listing/buying/cancelling/done/error
 *   Input routing: tab nav, arrow select, Z action, X close
 *   Listings refresh on open
 *   Build output
 *
 * Usage: node tests/t72-nft-trading.js
 */

'use strict';
const fs = require('fs');
const path = require('path');

let passed = 0, failed = 0;
function assert(label, cond, detail = '') {
  if (cond) { console.log(`  ✅ ${label}`); passed++; }
  else { console.error(`  ❌ FAIL: ${label}${detail ? ' — ' + detail : ''}`); failed++; }
}

console.log('=== T72 NFT Trading House E2E ===\n');

const onchain = fs.readFileSync(
  path.join(__dirname, '../../../solana/client/onchain.js'), 'utf8'
);
const state04 = fs.readFileSync(
  path.join(__dirname, '../../../solana/client/src/04-state.js'), 'utf8'
);
const overlay08 = fs.readFileSync(
  path.join(__dirname, '../../../solana/client/src/08-overlays.js'), 'utf8'
);
const input10 = fs.readFileSync(
  path.join(__dirname, '../../../solana/client/src/10-input.js'), 'utf8'
);
const built = fs.readFileSync(
  path.join(__dirname, '../../../solana/client/index.html'), 'utf8'
);

// ── onchain.js stubs ──────────────────────────────────────────────────────────
console.log('[Onchain] NFT listing stubs');
assert('listCard function defined', onchain.includes('async function listCard('));
assert('buyCard function defined', onchain.includes('async function buyCard('));
assert('cancelListing function defined', onchain.includes('async function cancelListing('));
assert('getListings function defined', onchain.includes('function getListings()'));
assert('_LISTINGS_KEY localStorage key', onchain.includes("'oxark_nft_listings'"));
assert('listCard builds listing object', onchain.includes('id: Date.now()'));
assert('buyCard removes from array', onchain.includes('arr.splice(idx, 1)'));
assert('buyCard guards own listing', onchain.includes('Cannot buy your own listing'));
assert('cancelListing checks seller', onchain.includes('Listing not found or not yours'));
assert('all 4 functions exported in oxarkOnchain', onchain.includes('listCard,')&&onchain.includes('buyCard,')&&onchain.includes('cancelListing,')&&onchain.includes('getListings,'));

// ── State vars ────────────────────────────────────────────────────────────────
console.log('\n[State] NFT trading state vars');
assert('NFT_SHOP_TABS defined', state04.includes('NFT_SHOP_TABS='));
assert('NFT_SHOP_TABS has 3 entries', state04.includes("'MY CARDS'")&&state04.includes("'MARKET'")&&state04.includes("'MY LISTINGS'"));
assert('nftSelIdx defined', state04.includes('nftSelIdx=0'));
assert('nftListings defined', state04.includes('nftListings=[]'));
assert('nftListPrice defined', state04.includes('nftListPrice='));
assert('NFT_LIST_PRICES defined', state04.includes('NFT_LIST_PRICES='));
assert('NFT_LIST_PRICES has multiple options', state04.includes('[0.01,'));
assert('nftListPriceIdx defined', state04.includes('nftListPriceIdx='));
assert('nftTxPhase defined', state04.includes("nftTxPhase=''"));
assert('nftTxResult defined', state04.includes("nftTxResult=''"));
assert('nftTxError defined', state04.includes("nftTxError=''"));

// ── Overlays ──────────────────────────────────────────────────────────────────
console.log('\n[Overlays] drawNFTTradingShop');
assert('drawNFTTradingShop defined (full impl)', overlay08.includes('function drawNFTTradingShop(cx,cy,cw,ch){'));
assert('Tab bar renders NFT_SHOP_TABS', overlay08.includes('NFT_SHOP_TABS'));
assert('MY CARDS tab shows card list', overlay08.includes('Select a card to list'));
assert('MY CARDS shows rarity', overlay08.includes('RARITY_LABEL[cr.r]'));
assert('MARKET tab shows listings', overlay08.includes('No active listings'));
assert('MARKET shows price', overlay08.includes('priceSol'));
assert('MY LISTINGS tab renders', overlay08.includes('Cancel listing'));
assert('loading phases shown', overlay08.includes("nftTxPhase==='listing'"));
assert('done phase shows result', overlay08.includes("nftTxPhase==='done'"));
assert('error phase shown', overlay08.includes("nftTxPhase==='error'"));
assert('dots animation in loading', overlay08.includes("'.'"));

// ── Input routing ─────────────────────────────────────────────────────────────
console.log('\n[Input] NFT trading input');
assert("nft_trading branch in input", input10.includes("townShopType==='nft_trading'"));
assert('busy guard for tx phases', input10.includes("nftTxPhase==='listing'||nftTxPhase==='buying'"));
assert('done/error dismissal', input10.includes("nftTxPhase==='done'||nftTxPhase==='error'"));
assert('tab left/right navigation', input10.includes('townShopTab=Math.max(0,townShopTab-1)'));
assert('MY CARDS arrow nav', input10.includes('nftSelIdx=Math.max(0,nftSelIdx-1)'));
assert('price cycle left/right', input10.includes('nftListPriceIdx=Math.max(0'));
assert('Z calls listCard', input10.includes('oxarkOnchain.listCard'));
assert('listCard removes card from hand', input10.includes('pl[0].cd[item.slot]=0'));
assert('Z calls buyCard on MARKET tab', input10.includes('oxarkOnchain.buyCard'));
assert('buyCard adds card to player', input10.includes('addCardToPlayer&&addCardToPlayer'));
assert('Z calls cancelListing on MY LISTINGS', input10.includes('oxarkOnchain.cancelListing'));
assert('cancelListing returns card to hand', input10.includes('Return card to hand'));
assert('listings refreshed on tab switch', input10.includes('oxarkOnchain.getListings()'));
assert('listings refreshed on modal open', input10.includes("nearInteractable.id==='nft_trading'")&&input10.includes('oxarkOnchain.getListings()'));
assert('X closes modal', input10.includes("townShopActive=false;townShopType='';townShopOpenFrame=0;sfxBack()"));

// ── Build output ──────────────────────────────────────────────────────────────
console.log('\n[Build]');
assert('listCard in build', built.includes('async function listCard'));
assert('buyCard in build', built.includes('async function buyCard'));
assert('cancelListing in build', built.includes('async function cancelListing'));
assert('NFT_SHOP_TABS in build', built.includes('NFT_SHOP_TABS'));
assert('nftTxPhase in build', built.includes('nftTxPhase'));
assert('drawNFTTradingShop in build', built.includes('drawNFTTradingShop'));

// ─── Result ───────────────────────────────────────────────────────────────────
console.log(`\n=== T72 RESULT: ${passed} passed, ${failed} failed ===`);
if (failed > 0) process.exit(1);

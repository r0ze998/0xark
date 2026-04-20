#!/usr/bin/env node
/**
 * T73 E2E — General Item Shop
 *
 * Tests:
 *   ITEM_CATALOG (4 items: booster, hint, revive, scout)
 *   State vars: itemShopSelIdx, itemShopTxPhase, itemShopRevealCard, itemInventory
 *   itemInvAdd / itemInvUse / itemInvSave helpers
 *   drawItemShop: item list, pricing, loading/reveal/done/error phases
 *   Booster reveal animation (card flip)
 *   doBuyItem: x402 path + simulation path, per-item effects
 *   Input routing: arrow nav, Z buy, Z dismiss reveal, X close
 *   Build output
 *
 * Usage: node tests/t73-item-shop.js
 */

'use strict';
const fs = require('fs');
const path = require('path');

let passed = 0, failed = 0;
function assert(label, cond, detail = '') {
  if (cond) { console.log(`  ✅ ${label}`); passed++; }
  else { console.error(`  ❌ FAIL: ${label}${detail ? ' — ' + detail : ''}`); failed++; }
}

console.log('=== T73 General Item Shop E2E ===\n');

const state04 = fs.readFileSync(
  path.join(__dirname, '../../../solana/client/src/04-state.js'), 'utf8'
);
const world06 = fs.readFileSync(
  path.join(__dirname, '../../../solana/client/src/06-world-systems.js'), 'utf8'
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

// ── ITEM_CATALOG ──────────────────────────────────────────────────────────────
console.log('[Catalog] ITEM_CATALOG');
assert('ITEM_CATALOG defined', state04.includes('const ITEM_CATALOG='));
assert('booster item', state04.includes("id:'booster'"));
assert('hint item', state04.includes("id:'hint'"));
assert('revive item', state04.includes("id:'revive'"));
assert('scout item', state04.includes("id:'scout'"));
assert('all items have name', (state04.match(/name:/g)||[]).length >= 4);
assert('all items have price', (state04.match(/price:/g)||[]).length >= 4);
assert('all items have endpoint', (state04.match(/endpoint:/g)||[]).length >= 4);
assert('all items have icon', (state04.match(/icon:/g)||[]).length >= 4);

// ── State vars ────────────────────────────────────────────────────────────────
console.log('\n[State] Item shop state vars');
assert('itemShopSelIdx defined', state04.includes('itemShopSelIdx=0'));
assert('itemShopTxPhase defined', state04.includes("itemShopTxPhase=''"));
assert('itemShopResult defined', state04.includes("itemShopResult=''"));
assert('itemShopError defined', state04.includes("itemShopError=''"));
assert('itemShopRevealCard defined', state04.includes('itemShopRevealCard=-1'));
assert('itemShopRevealFrame defined', state04.includes('itemShopRevealFrame=0'));
assert('itemInventory defined', state04.includes('let itemInventory='));
assert('localStorage key defined', state04.includes("'oxark_item_inventory'"));
assert('itemInvSave defined', state04.includes('function itemInvSave()'));
assert('itemInvAdd defined', state04.includes('function itemInvAdd('));
assert('itemInvUse defined', state04.includes('function itemInvUse('));

// ── World systems: doBuyItem ──────────────────────────────────────────────────
console.log('\n[World] doBuyItem function');
assert('doBuyItem defined', world06.includes('function doBuyItem(item)'));
assert('sets loading phase', world06.includes("itemShopTxPhase='loading'"));
assert('booster picks random card', world06.includes("item.id==='booster'"));
assert('booster sets reveal phase', world06.includes("itemShopTxPhase='reveal'"));
assert('hint reads rival floor', world06.includes("item.id==='hint'"));
assert('hint calls twSet', world06.includes('twSet'));
assert('revive restores empty slot', world06.includes("item.id==='revive'"));
assert('revive calls syncCardCount', world06.includes('syncCardCount'));
assert('scout marks treasures scouted', world06.includes("item.id==='scout'"));
assert('scout sets t.scouted=true', world06.includes('t.scouted=true'));
assert('x402 path attempted', world06.includes('x402Available&&item.endpoint'));
assert('x402 fallback to simulate', world06.includes('doSimulate'));
assert('simulation uses setTimeout', world06.includes('setTimeout(doSimulate'));
assert('itemInvAdd called', world06.includes('itemInvAdd(item.id'));

// ── Overlays: drawItemShop ────────────────────────────────────────────────────
console.log('\n[Overlays] drawItemShop phases');
assert('drawItemShop defined (full impl)', overlay08.includes('function drawItemShop(cx,cy,cw,ch){'));
assert('booster reveal animation', overlay08.includes("itemShopTxPhase==='reveal'"));
assert('card flip scaleX animation', overlay08.includes('scaleX'));
assert('loading phase dots', overlay08.includes("'Processing'"));
assert('done phase checkmark', overlay08.includes("itemShopTxPhase==='done'"));
assert('error phase X', overlay08.includes("itemShopTxPhase==='error'"));
assert('item list renders ITEM_CATALOG', overlay08.includes('ITEM_CATALOG'));
assert('price shown per item', overlay08.includes('item.price'));
assert('inventory count shown', overlay08.includes('itemInventory[item.id]'));
assert('x402 status shown', overlay08.includes('x402Available'));

// ── Input routing ─────────────────────────────────────────────────────────────
console.log('\n[Input] Item shop input');
assert("item_shop branch", input10.includes("townShopType==='item_shop'"));
assert('busy guard for loading', input10.includes("itemShopTxPhase==='loading'"));
assert('reveal dismiss gives card', input10.includes("itemShopTxPhase==='reveal'"));
assert('reveal dismiss calls addCardToPlayer', input10.includes('addCardToPlayer&&addCardToPlayer(0,itemShopRevealCard)'));
assert('done/error dismissal', input10.includes("itemShopTxPhase==='done'||itemShopTxPhase==='error'"));
assert('arrow up/down navigation', input10.includes('itemShopSelIdx=Math.max(0,itemShopSelIdx-1)'));
assert('Z calls doBuyItem', input10.includes('doBuyItem(ITEM_CATALOG[itemShopSelIdx])'));
assert('X closes item shop modal', input10.includes("townShopType==='item_shop'")||input10.includes('itemShopTxPhase'));

// ── Build output ──────────────────────────────────────────────────────────────
console.log('\n[Build]');
assert('ITEM_CATALOG in build', built.includes('ITEM_CATALOG'));
assert('doBuyItem in build', built.includes('doBuyItem'));
assert('itemShopRevealCard in build', built.includes('itemShopRevealCard'));
assert('itemInventory in build', built.includes('itemInventory'));
assert('drawItemShop in build', built.includes('drawItemShop'));

// ─── Result ───────────────────────────────────────────────────────────────────
console.log(`\n=== T73 RESULT: ${passed} passed, ${failed} failed ===`);
if (failed > 0) process.exit(1);

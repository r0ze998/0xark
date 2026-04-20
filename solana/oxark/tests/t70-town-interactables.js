#!/usr/bin/env node
/**
 * T70 E2E — Town Interactive Building Infrastructure
 *
 * Tests:
 *   TOWN_INTERACTABLES array (3 entries: dungeon_gate, nft_trading, item_shop)
 *   Proximity detection helper (checkTownInteractable)
 *   nearInteractable / townShopActive state vars
 *   drawTownHint / drawTownShopModal draw functions
 *   Modal stub renderers (drawDungeonGateShop, drawNFTTradingShop, drawItemShop)
 *   [Z] handler routing in input
 *   Build output verification
 *
 * Usage: node tests/t70-town-interactables.js
 */

'use strict';
const fs = require('fs');
const path = require('path');

let passed = 0, failed = 0;
function assert(label, cond, detail = '') {
  if (cond) { console.log(`  ✅ ${label}`); passed++; }
  else { console.error(`  ❌ FAIL: ${label}${detail ? ' — ' + detail : ''}`); failed++; }
}

console.log('=== T70 Town Interactive Building Infrastructure E2E ===\n');

const data02 = fs.readFileSync(
  path.join(__dirname, '../../../solana/client/src/02-data.js'), 'utf8'
);
const state04 = fs.readFileSync(
  path.join(__dirname, '../../../solana/client/src/04-state.js'), 'utf8'
);
const world06 = fs.readFileSync(
  path.join(__dirname, '../../../solana/client/src/06-world-systems.js'), 'utf8'
);
const overlay08 = fs.readFileSync(
  path.join(__dirname, '../../../solana/client/src/08-overlays.js'), 'utf8'
);
const loop09 = fs.readFileSync(
  path.join(__dirname, '../../../solana/client/src/09-game-loop.js'), 'utf8'
);
const input10 = fs.readFileSync(
  path.join(__dirname, '../../../solana/client/src/10-input.js'), 'utf8'
);
const built = fs.readFileSync(
  path.join(__dirname, '../../../solana/client/index.html'), 'utf8'
);

// ── TOWN_INTERACTABLES definition ─────────────────────────────────────────────
console.log('[Data] TOWN_INTERACTABLES');
assert('TOWN_INTERACTABLES defined', data02.includes('const TOWN_INTERACTABLES='));
assert('dungeon_gate entry', data02.includes("id:'dungeon_gate'"));
assert('nft_trading entry', data02.includes("id:'nft_trading'"));
assert('item_shop entry', data02.includes("id:'item_shop'"));
assert('dungeon_gate at tx:27', data02.includes('tx:27'));
assert('nft_trading at tx:9', data02.match(/id:'nft_trading'.*?tx:9/s));
assert('item_shop at tx:19', data02.match(/id:'item_shop'.*?tx:19/s));
assert('all entries have label', (data02.match(/label:/g)||[]).length >= 3);
assert('all entries have hint', (data02.match(/hint:/g)||[]).length >= 3);
assert('all entries have col', (data02.match(/col:/g)||[]).length >= 3);
assert('all entries have accentCol', (data02.match(/accentCol:/g)||[]).length >= 3);

// ── State vars ────────────────────────────────────────────────────────────────
console.log('\n[State] Town shop state vars');
assert('nearInteractable defined', state04.includes('let nearInteractable=null'));
assert('townShopActive defined', state04.includes('townShopActive=false'));
assert('townShopType defined', state04.includes("townShopType=''"));
assert('townShopTab defined', state04.includes('townShopTab=0'));
assert('townShopOpenFrame defined', state04.includes('townShopOpenFrame=0'));

// ── World systems ─────────────────────────────────────────────────────────────
console.log('\n[World] checkTownInteractable');
assert('checkTownInteractable defined', world06.includes('function checkTownInteractable()'));
assert('guards non-town maps', world06.includes('currentMap!==0||inDungeon'));
assert('checks TOWN_INTERACTABLES array', world06.includes('TOWN_INTERACTABLES'));
assert('Manhattan distance check', world06.includes('Math.abs(px-t.tx)<=1'));
assert('sets nearInteractable', world06.includes('nearInteractable=found'));

// ── Game loop wiring ──────────────────────────────────────────────────────────
console.log('\n[Loop] Game loop wiring');
assert('checkTownInteractable called per frame', loop09.includes('checkTownInteractable()'));
assert('drawTownHint called', loop09.includes('drawTownHint()'));
assert('drawTownShopModal called', loop09.includes('drawTownShopModal()'));
assert('townShopActive blocks held movement', loop09.includes('townShopActive'));

// ── Overlays ──────────────────────────────────────────────────────────────────
console.log('\n[Overlays] drawTownHint + drawTownShopModal');
assert('drawTownHint defined', overlay08.includes('function drawTownHint()'));
assert('hint guards inDungeon', overlay08.includes('inDungeon||battlePhase||mo||introActive||townShopActive'));
assert('hint shows [Z] badge', overlay08.includes("'Z'"));
assert('hint uses nearInteractable.col', overlay08.includes('nearInteractable'));
assert('drawTownShopModal defined', overlay08.includes('function drawTownShopModal()'));
assert('modal dispatches dungeon_gate', overlay08.includes("'dungeon_gate'"));
assert('modal dispatches nft_trading', overlay08.includes("'nft_trading'"));
assert('modal dispatches item_shop', overlay08.includes("'item_shop'"));
assert('drawDungeonGateShop stub defined', overlay08.includes('function drawDungeonGateShop'));
assert('drawNFTTradingShop stub defined', overlay08.includes('function drawNFTTradingShop'));
assert('drawItemShop stub defined', overlay08.includes('function drawItemShop'));
assert('slide-in animation', overlay08.includes('townShopOpenFrame'));

// ── Input ─────────────────────────────────────────────────────────────────────
console.log('\n[Input] [Z]/[X] routing');
assert('townShopActive [X] close handler', input10.includes('townShopActive=false'));
assert('townShopType cleared on close', input10.includes("townShopType=''"));
assert('tab navigation left', input10.includes('townShopTab=Math.max(0'));
assert('tab navigation right', input10.includes('townShopTab=Math.min(2'));
assert('[Z] opens town shop when nearInteractable', input10.includes('nearInteractable&&!inDungeon&&currentMap===0'));
assert('dungeon_gate routes to dungeonConfirm', input10.includes("nearInteractable.id==='dungeon_gate'"));
assert('nft/item shop sets townShopActive', input10.includes('townShopActive=true'));

// ── Build output ──────────────────────────────────────────────────────────────
console.log('\n[Build]');
assert('TOWN_INTERACTABLES in build', built.includes('TOWN_INTERACTABLES'));
assert('checkTownInteractable in build', built.includes('checkTownInteractable'));
assert('drawTownHint in build', built.includes('drawTownHint'));
assert('drawTownShopModal in build', built.includes('drawTownShopModal'));
assert('nearInteractable in build', built.includes('nearInteractable'));

// ─── Result ───────────────────────────────────────────────────────────────────
console.log(`\n=== T70 RESULT: ${passed} passed, ${failed} failed ===`);
if (failed > 0) process.exit(1);

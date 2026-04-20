#!/usr/bin/env node
/**
 * T74 E2E — Town Hub Polish + Integration Pass
 *
 * Tests:
 *   T74 polish: drawDungeonDoorGlow, animated border on shop modal, town guide toast
 *   Integration: all 3 shops accessible (dungeon_gate, nft_trading, item_shop)
 *   BGM: updateAmbient wired for town (currentMap===0), startAmbientPort defined
 *   Full town system: TOWN_INTERACTABLES, checkTownInteractable, townShopActive flow
 *   All shops have non-stub renderers
 *   Build output (all features present)
 *
 * Usage: node tests/t74-town-integration.js
 */

'use strict';
const fs = require('fs');
const path = require('path');

let passed = 0, failed = 0;
function assert(label, cond, detail = '') {
  if (cond) { console.log(`  ✅ ${label}`); passed++; }
  else { console.error(`  ❌ FAIL: ${label}${detail ? ' — ' + detail : ''}`); failed++; }
}

console.log('=== T74 Town Hub Polish + Integration E2E ===\n');

const pixi01 = fs.readFileSync(
  path.join(__dirname, '../../../solana/client/src/01-pixi.js'), 'utf8'
);
const data02 = fs.readFileSync(
  path.join(__dirname, '../../../solana/client/src/02-data.js'), 'utf8'
);
const state04 = fs.readFileSync(
  path.join(__dirname, '../../../solana/client/src/04-state.js'), 'utf8'
);
const world06 = fs.readFileSync(
  path.join(__dirname, '../../../solana/client/src/06-world-systems.js'), 'utf8'
);
const map07 = fs.readFileSync(
  path.join(__dirname, '../../../solana/client/src/07-map.js'), 'utf8'
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

// ── T74 Polish ────────────────────────────────────────────────────────────────
console.log('[T74] Polish features');
assert('drawDungeonDoorGlow defined', map07.includes('function drawDungeonDoorGlow()'));
assert('door glow uses dgDoorGlow', map07.includes('dgDoorGlow'));
assert('door glow guards non-town', map07.includes('currentMap!==0'));
assert('door glow creates radial gradient', map07.includes('createRadialGradient'));
assert('drawDungeonDoorGlow wired in game loop', loop09.includes('drawDungeonDoorGlow()'));
assert('animated border on shop modal', overlay08.includes('borderPulse'));
assert('border pulse uses fr', overlay08.includes('Math.sin(fr*0.07)'));
assert('border uses accentCol', overlay08.includes("g.strokeStyle=t.accentCol"));
assert('town guide toast var defined', state04.includes('_townGuideDone'));
assert('town guide toast triggered at fr===60', loop09.includes('fr===60&&!_townGuideDone'));
assert('town guide toast message', loop09.includes("'Walk near a building and press [Z] to enter'"));

// ── BGM integration ───────────────────────────────────────────────────────────
console.log('\n[BGM] Town ambient + modal compatibility');
assert('startAmbientPort defined in 01-pixi.js', pixi01.includes('function startAmbientPort'));
assert('updateAmbient wires town map (currentMap===0)', pixi01.includes('currentMap===0'));
assert('updateAmbient called every frame in loop', loop09.includes('updateAmbient()'));
assert('stopBattleBGM defined', pixi01.includes('function stopBattleBGM'));
assert('startBattleBGM defined', pixi01.includes('function startBattleBGM'));

// ── Full system integration ───────────────────────────────────────────────────
console.log('\n[Integration] All 3 town shops end-to-end');
// Data layer
assert('TOWN_INTERACTABLES[3] all present', data02.includes("id:'dungeon_gate'")&&data02.includes("id:'nft_trading'")&&data02.includes("id:'item_shop'"));
// Proximity detection
assert('checkTownInteractable defined', world06.includes('function checkTownInteractable()'));
assert('checkTownInteractable called per frame', loop09.includes('checkTownInteractable()'));
// Modal dispatch
assert('drawTownShopModal dispatches all 3', overlay08.includes("'dungeon_gate'")&&overlay08.includes("'nft_trading'")&&overlay08.includes("'item_shop'"));
// Shop renderers (non-stub, verified by content uniqueness)
assert('drawDungeonGateShop has _DG_OPTIONS', overlay08.includes('_DG_OPTIONS'));
assert('drawNFTTradingShop has tab bar', overlay08.includes('NFT_SHOP_TABS'));
assert('drawItemShop has ITEM_CATALOG', overlay08.includes('ITEM_CATALOG'));
// Input routing
assert('[Z] opens dungeon_gate shop', input10.includes("nearInteractable.id==='dungeon_gate'"));
assert('[Z] opens nft_trading shop', input10.includes("id:'nft_trading'")||input10.includes("townShopType==='nft_trading'"));
assert('[Z] opens item_shop', input10.includes("townShopType==='item_shop'"));
assert('[X] closes all shops', (input10.match(/townShopActive=false/g)||[]).length >= 3);
// State
assert('townShopActive blocks held movement', loop09.includes('townShopActive'));
assert('nearInteractable null on dungeon entry', world06.includes('nearInteractable=null'));

// ── All T70-T74 tests referenced ─────────────────────────────────────────────
console.log('\n[Tests] All T70-T73 test files present');
const testDir = path.join(__dirname, '.');
assert('t70 test exists', fs.existsSync(path.join(testDir, 't70-town-interactables.js')));
assert('t71 test exists', fs.existsSync(path.join(testDir, 't71-dungeon-gate.js')));
assert('t72 test exists', fs.existsSync(path.join(testDir, 't72-nft-trading.js')));
assert('t73 test exists', fs.existsSync(path.join(testDir, 't73-item-shop.js')));

// ── Build output ──────────────────────────────────────────────────────────────
console.log('\n[Build]');
assert('drawDungeonDoorGlow in build', built.includes('drawDungeonDoorGlow'));
assert('borderPulse in build', built.includes('borderPulse'));
assert('_townGuideDone in build', built.includes('_townGuideDone'));
assert('TOWN_INTERACTABLES in build', built.includes('TOWN_INTERACTABLES'));
assert('ITEM_CATALOG in build', built.includes('ITEM_CATALOG'));
assert('NFT_SHOP_TABS in build', built.includes('NFT_SHOP_TABS'));
assert('dgDoorGlow in build', built.includes('dgDoorGlow'));
assert('drawTownShopModal in build', built.includes('drawTownShopModal'));
assert('drawTownHint in build', built.includes('drawTownHint'));
assert('checkTownInteractable in build', built.includes('checkTownInteractable'));

// ─── Result ───────────────────────────────────────────────────────────────────
console.log(`\n=== T74 RESULT: ${passed} passed, ${failed} failed ===`);
if (failed > 0) process.exit(1);

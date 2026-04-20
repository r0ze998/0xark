#!/usr/bin/env node
/**
 * T64 E2E — BGM/SE Final Polish
 *
 * Tests:
 *   BGM: 3 tracks (town/dungeon/deep), battle BGM
 *   SE: 10 new functions wired to correct events
 *
 * Usage: node tests/t64-bgm-se.js
 */

'use strict';
const fs = require('fs');
const path = require('path');

let passed = 0, failed = 0;
function assert(label, cond, detail = '') {
  if (cond) { console.log(`  ✅ ${label}`); passed++; }
  else { console.error(`  ❌ FAIL: ${label}${detail ? ' — ' + detail : ''}`); failed++; }
}

console.log('=== T64 BGM/SE Final Polish E2E ===\n');

const pixi01 = fs.readFileSync(
  path.join(__dirname, '../../../solana/client/src/01-pixi.js'), 'utf8'
);
const world06 = fs.readFileSync(
  path.join(__dirname, '../../../solana/client/src/06-world-systems.js'), 'utf8'
);
const battle07 = fs.readFileSync(
  path.join(__dirname, '../../../solana/client/src/07-battle.js'), 'utf8'
);
const input10 = fs.readFileSync(
  path.join(__dirname, '../../../solana/client/src/10-input.js'), 'utf8'
);
const built = fs.readFileSync(
  path.join(__dirname, '../../../solana/client/index.html'), 'utf8'
);

// ── BGM tracks ────────────────────────────────────────────────────────────────
console.log('[BGM] 3 ambient tracks + battle BGM');
assert('startAmbientPort defined', pixi01.includes('function startAmbientPort'));
assert('startAmbientForest defined', pixi01.includes('function startAmbientForest'));
assert('startAmbientRuins defined', pixi01.includes('function startAmbientRuins'));
assert('startAmbientDeepDungeon defined', pixi01.includes('function startAmbientDeepDungeon'));
assert('deep dungeon wired for maps 3+', pixi01.includes('currentMap>=3'));
assert('startBattleBGM defined', pixi01.includes('function startBattleBGM'));
assert('stopBattleBGM defined', pixi01.includes('function stopBattleBGM'));
assert('startBattleBGM called in VS splash', battle07.includes('startBattleBGM'));
assert('stopBattleBGM called on escape', input10.includes('stopBattleBGM'));

// ── SE functions ──────────────────────────────────────────────────────────────
console.log('\n[SE] 10 new/enhanced functions');
assert('sfxCardEpic defined', pixi01.includes('function sfxCardEpic'));
assert('sfxChestOpen defined', pixi01.includes('function sfxChestOpen'));
assert('sfxStairsDescend defined', pixi01.includes('function sfxStairsDescend'));
assert('sfxStairsAscend defined', pixi01.includes('function sfxStairsAscend'));
assert('sfxBossEncounter defined', pixi01.includes('function sfxBossEncounter'));
assert('sfxSynthesis defined', pixi01.includes('function sfxSynthesis'));
assert('sfxEscape defined', pixi01.includes('function sfxEscape'));
assert('sfxRarityCommon defined', pixi01.includes('function sfxRarityCommon'));
assert('sfxRarityRare defined', pixi01.includes('function sfxRarityRare'));
assert('sfxRarityLegendary defined', pixi01.includes('function sfxRarityLegendary'));

// ── SE wiring ─────────────────────────────────────────────────────────────────
console.log('\n[SE wiring]');
assert('sfxEscape wired in map transition', world06.includes('sfxEscape()'));
assert('sfxStairsDescend wired', world06.includes('sfxStairsDescend()'));
assert('sfxStairsAscend wired', world06.includes('sfxStairsAscend()'));
assert('sfxSynthesis wired in doSynthesis', world06.includes('sfxSynthesis()'));
assert('sfxRarityLegendary wired on card get', world06.includes('sfxRarityLegendary'));
assert('sfxRarityRare wired on card get', world06.includes('sfxRarityRare'));
assert('sfxRarityCommon wired on card get', world06.includes('sfxRarityCommon'));

// ── Build output ──────────────────────────────────────────────────────────────
console.log('\n[Build]');
assert('startAmbientDeepDungeon in build', built.includes('startAmbientDeepDungeon'));
assert('startBattleBGM in build', built.includes('startBattleBGM'));
assert('sfxStairsDescend in build', built.includes('sfxStairsDescend'));
assert('sfxSynthesis in build', built.includes('sfxSynthesis'));
assert('sfxRarityLegendary in build', built.includes('sfxRarityLegendary'));

// ─── Result ───────────────────────────────────────────────────────────────────
console.log(`\n=== T64 RESULT: ${passed} passed, ${failed} failed ===`);
if (failed > 0) process.exit(1);

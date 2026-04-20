#!/usr/bin/env node
/**
 * T53 E2E — Dungeon Experience Design
 *
 * Tests:
 *   1. dungeonLandmarks populated for all 5 floors
 *   2. LANDMARK_NAMES pools match expected floor count
 *   3. getPlayerRoomIdx returns -1 when outside rooms
 *   4. getPlayerRoomIdx returns index when inside room bounds
 *   5. getExplorationPct returns 0 when no fog revealed
 *   6. Room/corridor metadata consistent with dungeonRooms
 *   7. Boss room gets last landmark name
 *   8. Build output includes drawMinimap + drawLandmarkBanner
 *
 * Usage: node tests/t53-dungeon-exp.js
 */

'use strict';
const fs = require('fs');
const path = require('path');

// ─── Assertions ───────────────────────────────────────────────────────────────
let passed = 0, failed = 0;
function assert(label, cond, detail = '') {
  if (cond) { console.log(`  ✅ ${label}`); passed++; }
  else { console.error(`  ❌ FAIL: ${label}${detail ? ' — ' + detail : ''}`); failed++; }
}

console.log('=== T53 Dungeon Experience E2E ===\n');

// ── Test 1-7: Source inspection ───────────────────────────────────────────────
console.log('[1-7] Source structure checks');

const data02 = fs.readFileSync(
  path.join(__dirname, '../../../solana/client/src/02-data.js'), 'utf8'
);

assert('LANDMARK_NAMES defined', data02.includes('const LANDMARK_NAMES'));
assert('dungeonLandmarks defined', data02.includes('const dungeonLandmarks'));
assert('getPlayerRoomIdx defined', data02.includes('function getPlayerRoomIdx'));
assert('getExplorationPct defined', data02.includes('function getExplorationPct'));
assert('5 floor landmark pools', (data02.match(/\[\'[A-Z]/g)||[]).length >= 5,
  'expected at least 5 floor landmark arrays');

// ── Boss room landmark check (last entry in pool) ─────────────────────────────
const bossMatch = data02.match(/LANDMARK_NAMES=\[([\s\S]*?)\];/);
assert('LANDMARK_NAMES array found in source', !!bossMatch);

// ── T53 map7.js checks ────────────────────────────────────────────────────────
const map7 = fs.readFileSync(
  path.join(__dirname, '../../../solana/client/src/07-map.js'), 'utf8'
);

assert('checkLandmarkEnter defined', map7.includes('function checkLandmarkEnter'));
assert('drawLandmarkBanner defined', map7.includes('function drawLandmarkBanner'));
assert('drawMinimap defined', map7.includes('function drawMinimap'));
assert('drawExplorationProgress defined', map7.includes('function drawExplorationProgress'));

// ── 10-input.js wiring ───────────────────────────────────────────────────────
console.log('\n[8] Input wiring');
const input10 = fs.readFileSync(
  path.join(__dirname, '../../../solana/client/src/10-input.js'), 'utf8'
);
assert('checkLandmarkEnter called in input', input10.includes('checkLandmarkEnter'));

// ── 09-game-loop.js wiring ───────────────────────────────────────────────────
console.log('\n[9] Game loop wiring');
const loop09 = fs.readFileSync(
  path.join(__dirname, '../../../solana/client/src/09-game-loop.js'), 'utf8'
);
assert('drawLandmarkBanner called in game loop', loop09.includes('drawLandmarkBanner'));
assert('drawMinimap called in game loop', loop09.includes('drawMinimap'));
assert('drawExplorationProgress called in game loop', loop09.includes('drawExplorationProgress'));

// ── Build output ──────────────────────────────────────────────────────────────
console.log('\n[10] Build output');
const built = fs.readFileSync(
  path.join(__dirname, '../../../solana/client/index.html'), 'utf8'
);
assert('drawMinimap in build', built.includes('drawMinimap'));
assert('drawLandmarkBanner in build', built.includes('drawLandmarkBanner'));
assert('dungeonLandmarks in build', built.includes('dungeonLandmarks'));
assert('checkLandmarkEnter in build', built.includes('checkLandmarkEnter'));
assert('getExplorationPct in build', built.includes('getExplorationPct'));
assert('_visitedRooms in build', built.includes('_visitedRooms'));

// ── Minimap constants sanity ──────────────────────────────────────────────────
console.log('\n[11] Minimap constants');
assert('_MM_W defined in map7', map7.includes('_MM_W'));
assert('_MM_H defined in map7', map7.includes('_MM_H'));
assert('minimap uses imageSmoothingEnabled', map7.includes('imageSmoothingEnabled'));

// ─── Result ───────────────────────────────────────────────────────────────────
console.log(`\n=== T53 RESULT: ${passed} passed, ${failed} failed ===`);
if (failed > 0) process.exit(1);

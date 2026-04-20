#!/usr/bin/env node
/**
 * T63 E2E — Tutorial System
 *
 * Tests:
 *   1. TUTORIAL_STEPS defined with 6 steps
 *   2. Each step has required fields (id, goal, hint, obj)
 *   3. isTutorial state variable exists
 *   4. tutorialStepDone, skipTutorial, resetTutorial functions defined
 *   5. Objective triggers wired (input, battle, world-systems)
 *   6. drawTutorialStepOverlay in 08-overlays.js
 *   7. handleTutorialSkip defined
 *   8. localStorage key 'oxark_tutorial_done' used
 *   9. Tutorial panel called from game loop
 *  10. Build output includes all key symbols
 *
 * Usage: node tests/t63-tutorial.js
 */

'use strict';
const fs = require('fs');
const path = require('path');

let passed = 0, failed = 0;
function assert(label, cond, detail = '') {
  if (cond) { console.log(`  ✅ ${label}`); passed++; }
  else { console.error(`  ❌ FAIL: ${label}${detail ? ' — ' + detail : ''}`); failed++; }
}

console.log('=== T63 Tutorial System E2E ===\n');

// ─── Source reads ──────────────────────────────────────────────────────────────
const state04 = fs.readFileSync(
  path.join(__dirname, '../../../solana/client/src/04-state.js'), 'utf8'
);
const overlays08 = fs.readFileSync(
  path.join(__dirname, '../../../solana/client/src/08-overlays.js'), 'utf8'
);
const loop09 = fs.readFileSync(
  path.join(__dirname, '../../../solana/client/src/09-game-loop.js'), 'utf8'
);
const input10 = fs.readFileSync(
  path.join(__dirname, '../../../solana/client/src/10-input.js'), 'utf8'
);
const battle07 = fs.readFileSync(
  path.join(__dirname, '../../../solana/client/src/07-battle.js'), 'utf8'
);
const world06 = fs.readFileSync(
  path.join(__dirname, '../../../solana/client/src/06-world-systems.js'), 'utf8'
);
const built = fs.readFileSync(
  path.join(__dirname, '../../../solana/client/index.html'), 'utf8'
);

// ── Test 1: TUTORIAL_STEPS ────────────────────────────────────────────────────
console.log('[1] TUTORIAL_STEPS — 6 steps');
assert('TUTORIAL_STEPS defined', state04.includes('const TUTORIAL_STEPS'));
const stepMatches = state04.match(/\{id:/g);
assert('6 tutorial steps', stepMatches && stepMatches.length === 6,
  `got ${stepMatches ? stepMatches.length : 0}`);

// ── Test 2: Step field structure ──────────────────────────────────────────────
console.log('\n[2] Step fields');
assert('id field present', state04.includes("id:'move'"));
assert('goal field present', state04.includes("goal:'"));
assert('hint field present', state04.includes("hint:'"));
assert('obj field present', state04.includes("obj:'"));

// ── Test 3: isTutorial state var ─────────────────────────────────────────────
console.log('\n[3] isTutorial state');
assert('isTutorial defined', state04.includes('let isTutorial'));
assert('isTutorial reads localStorage', state04.includes("oxark_tutorial_done"));
assert('tutorialStep defined', state04.includes('let tutorialStep'));
assert('tutorialProgress defined', state04.includes('let tutorialProgress'));

// ── Test 4: Tutorial control functions ───────────────────────────────────────
console.log('\n[4] Tutorial control functions');
assert('tutorialStepDone defined', state04.includes('function tutorialStepDone'));
assert('skipTutorial defined', state04.includes('function skipTutorial'));
assert('resetTutorial defined', state04.includes('function resetTutorial'));

// ── Test 5: Objective wiring ──────────────────────────────────────────────────
console.log('\n[5] Objective triggers');
assert('move objective in input', input10.includes("tutorialStepDone('move')"));
assert('grass objective in input', input10.includes("tutorialStepDone('grass')"));
assert('dungeon objective in input', input10.includes("tutorialStepDone('dungeon')"));
assert('escape objective in input', input10.includes("tutorialStepDone('escape')"));
assert('card objective in world-systems', world06.includes("tutorialStepDone('card')"));
assert('battle objective in battle', battle07.includes("tutorialStepDone('battle')"));

// ── Test 6: Overlay functions ─────────────────────────────────────────────────
console.log('\n[6] Overlay functions');
assert('drawTutorialStepOverlay defined', overlays08.includes('function drawTutorialStepOverlay'));
assert('handleTutorialSkip defined', overlays08.includes('function handleTutorialSkip'));
assert('skipTutorial called in overlay', overlays08.includes('skipTutorial()'));

// ── Test 7: Game loop wiring ──────────────────────────────────────────────────
console.log('\n[7] Game loop');
assert('drawTutorialStepOverlay in game loop', loop09.includes('drawTutorialStepOverlay'));

// ── Test 8: localStorage ─────────────────────────────────────────────────────
console.log('\n[8] localStorage integration');
assert('localStorage.setItem in skipTutorial', state04.includes("setItem('oxark_tutorial_done','1')"));
assert('localStorage.getItem in isTutorial init', state04.includes("getItem('oxark_tutorial_done')"));

// ── Test 9: Build output ─────────────────────────────────────────────────────
console.log('\n[9] Build output');
assert('isTutorial in build', built.includes('isTutorial'));
assert('TUTORIAL_STEPS in build', built.includes('TUTORIAL_STEPS'));
assert('tutorialStepDone in build', built.includes('tutorialStepDone'));
assert('drawTutorialStepOverlay in build', built.includes('drawTutorialStepOverlay'));
assert('skipTutorial in build', built.includes('skipTutorial'));
assert('oxark_tutorial_done in build', built.includes('oxark_tutorial_done'));

// ─── Result ───────────────────────────────────────────────────────────────────
console.log(`\n=== T63 RESULT: ${passed} passed, ${failed} failed ===`);
if (failed > 0) process.exit(1);

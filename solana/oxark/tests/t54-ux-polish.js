#!/usr/bin/env node
/**
 * T54 E2E — UX-7/8/9/10 Polish
 *
 * Tests:
 *   UX-7: New SE functions (sfxCardRare, sfxSynergyTrigger, sfxLandmarkDiscover,
 *                           sfxTutorialStep, sfxWalletConnect, sfxError)
 *   UX-8: Wallet HUD indicator (drawWalletHUD, sfxWalletConnect wired)
 *   UX-9: Error toast system (showToast, showError, drawToasts)
 *   UX-10: Onboarding prompt (initOnboard, drawOnboardPrompt, localStorage key)
 *
 * Usage: node tests/t54-ux-polish.js
 */

'use strict';
const fs = require('fs');
const path = require('path');

let passed = 0, failed = 0;
function assert(label, cond, detail = '') {
  if (cond) { console.log(`  ✅ ${label}`); passed++; }
  else { console.error(`  ❌ FAIL: ${label}${detail ? ' — ' + detail : ''}`); failed++; }
}

console.log('=== T54 UX Polish E2E ===\n');

const pixi01 = fs.readFileSync(
  path.join(__dirname, '../../../solana/client/src/01-pixi.js'), 'utf8'
);
const overlays08 = fs.readFileSync(
  path.join(__dirname, '../../../solana/client/src/08-overlays.js'), 'utf8'
);
const loop09 = fs.readFileSync(
  path.join(__dirname, '../../../solana/client/src/09-game-loop.js'), 'utf8'
);
const init11 = fs.readFileSync(
  path.join(__dirname, '../../../solana/client/src/11-save-init.js'), 'utf8'
);
const input10 = fs.readFileSync(
  path.join(__dirname, '../../../solana/client/src/10-input.js'), 'utf8'
);
const battle07 = fs.readFileSync(
  path.join(__dirname, '../../../solana/client/src/07-battle.js'), 'utf8'
);
const built = fs.readFileSync(
  path.join(__dirname, '../../../solana/client/index.html'), 'utf8'
);

// ── UX-7: Sound variety ───────────────────────────────────────────────────────
console.log('[UX-7] Sound variety');
assert('sfxCardRare defined', pixi01.includes('function sfxCardRare'));
assert('sfxSynergyTrigger defined', pixi01.includes('function sfxSynergyTrigger'));
assert('sfxLandmarkDiscover defined', pixi01.includes('function sfxLandmarkDiscover'));
assert('sfxTutorialStep defined', pixi01.includes('function sfxTutorialStep'));
assert('sfxWalletConnect defined', pixi01.includes('function sfxWalletConnect'));
assert('sfxError defined', pixi01.includes('function sfxError'));
assert('sfxSynergyTrigger called in battle', battle07.includes('sfxSynergyTrigger'));
assert('sfxWalletConnect called on connect', input10.includes('sfxWalletConnect'));

// ── UX-8: Wallet HUD ─────────────────────────────────────────────────────────
console.log('\n[UX-8] Wallet HUD');
assert('drawWalletHUD defined', overlays08.includes('function drawWalletHUD'));
assert('drawWalletHUD in game loop', loop09.includes('drawWalletHUD'));
assert('walletConnected check in HUD', overlays08.includes('walletConnected'));
assert('showToast on wallet connect', input10.includes("showToast('Wallet connected"));

// ── UX-9: Error toast system ──────────────────────────────────────────────────
console.log('\n[UX-9] Error toast system');
assert('showToast defined', overlays08.includes('function showToast'));
assert('showError defined', overlays08.includes('function showError'));
assert('drawToasts defined', overlays08.includes('function drawToasts'));
assert('drawToasts in game loop', loop09.includes('drawToasts'));
assert('_toasts array defined', overlays08.includes('const _toasts'));
assert('showError calls sfxError', overlays08.includes('sfxError()'));
assert('showError called on wallet fail', input10.includes("showError('Wallet connection failed"));

// ── UX-10: Onboarding ─────────────────────────────────────────────────────────
console.log('\n[UX-10] Onboarding');
assert('initOnboard defined', overlays08.includes('function initOnboard'));
assert('drawOnboardPrompt defined', overlays08.includes('function drawOnboardPrompt'));
assert('drawOnboardPrompt in game loop', loop09.includes('drawOnboardPrompt'));
assert('initOnboard called at start', init11.includes('initOnboard'));
assert('oxark_onboard localStorage key', overlays08.includes("'oxark_onboard'"));

// ── Build output ──────────────────────────────────────────────────────────────
console.log('\n[Build] Key symbols in output');
assert('sfxCardRare in build', built.includes('sfxCardRare'));
assert('showToast in build', built.includes('showToast'));
assert('drawWalletHUD in build', built.includes('drawWalletHUD'));
assert('initOnboard in build', built.includes('initOnboard'));
assert('drawToasts in build', built.includes('drawToasts'));

// ─── Result ───────────────────────────────────────────────────────────────────
console.log(`\n=== T54 RESULT: ${passed} passed, ${failed} failed ===`);
if (failed > 0) process.exit(1);

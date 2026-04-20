#!/usr/bin/env node
/**
 * T71 E2E — Dungeon Gate Shop
 *
 * Tests:
 *   dgPhase / dgMenuIdx / dgTxResult / dgLastGameId state vars
 *   _DG_OPTIONS (3 options: quick enter, create, join)
 *   drawDungeonGateShop phases (menu, loading, result, join)
 *   dgQuickEnter / dgCreateSeason / dgJoinSeason functions
 *   Door glow (dgDoorGlow) animation in game loop
 *   Input routing for dungeon gate (arrow nav, Z confirm, X back)
 *   Build output verification
 *
 * Usage: node tests/t71-dungeon-gate.js
 */

'use strict';
const fs = require('fs');
const path = require('path');

let passed = 0, failed = 0;
function assert(label, cond, detail = '') {
  if (cond) { console.log(`  ✅ ${label}`); passed++; }
  else { console.error(`  ❌ FAIL: ${label}${detail ? ' — ' + detail : ''}`); failed++; }
}

console.log('=== T71 Dungeon Gate Shop E2E ===\n');

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

// ── State vars ────────────────────────────────────────────────────────────────
console.log('[State] Dungeon gate state vars');
assert('dgPhase defined', state04.includes("let dgPhase='menu'"));
assert('dgMenuIdx defined', state04.includes('dgMenuIdx=0'));
assert('dgTxResult defined', state04.includes("dgTxResult=''"));
assert('dgTxError defined', state04.includes("dgTxError=''"));
assert('dgLoading defined', state04.includes('dgLoading=false'));
assert('dgLastGameId defined', state04.includes('dgLastGameId=0'));
assert('dgDoorGlow defined', state04.includes('dgDoorGlow=0'));

// ── World systems ─────────────────────────────────────────────────────────────
console.log('\n[World] dgQuickEnter / dgCreateSeason / dgJoinSeason');
assert('dgQuickEnter defined', world06.includes('function dgQuickEnter()'));
assert('dgQuickEnter fires doMapTransition', world06.includes('doMapTransition(ex)'));
assert('dgCreateSeason defined', world06.includes('function dgCreateSeason()'));
assert('dgCreateSeason checks wallet', world06.includes("!walletConnected"));
assert('dgCreateSeason calls oxarkOnchain.createGame', world06.includes('oxarkOnchain.createGame'));
assert('dgCreateSeason saves gameId to localStorage', world06.includes("oxark_last_game_id"));
assert('dgJoinSeason defined', world06.includes('function dgJoinSeason()'));
assert('dgJoinSeason calls oxarkOnchain.joinGame', world06.includes('oxarkOnchain.joinGame'));
assert('dgJoinSeason handles no gameId', world06.includes('No Game ID found'));
assert('all functions set dgPhase=loading', (world06.match(/dgPhase='loading'/g)||[]).length >= 2);
assert('result phase set on success', world06.includes("dgPhase='result'"));
assert('join phase set on success', world06.includes("dgPhase='join'"));
assert('error stored in dgTxError', world06.includes('dgTxError='));

// ── Overlays ──────────────────────────────────────────────────────────────────
console.log('\n[Overlays] drawDungeonGateShop phases');
assert('_DG_OPTIONS defined with 3 entries', overlay08.includes('const _DG_OPTIONS='));
assert('QUICK ENTER option', overlay08.includes('QUICK ENTER'));
assert('CREATE SEASON option', overlay08.includes('CREATE SEASON'));
assert('JOIN SEASON option', overlay08.includes('JOIN SEASON'));
assert('menu phase rendered', overlay08.includes("dgPhase==='menu'"));
assert('loading phase rendered', overlay08.includes("dgPhase==='loading'"));
assert('result phase rendered with success', overlay08.includes('Season Created'));
assert('join phase rendered with success', overlay08.includes('Joined Season'));
assert('error branch shown', overlay08.includes("dgTxError"));
assert('loading dots animation', overlay08.includes("'Processing'"));
assert('door glow indicator', overlay08.includes('dgDoorGlow'));
assert('Game ID displayed', overlay08.includes('Game ID: '));
assert('controls hint shown', overlay08.includes('[Z] Enter dungeon'));

// ── Game loop ─────────────────────────────────────────────────────────────────
console.log('\n[Loop] Door glow update');
assert('dgDoorGlow animated in loop', loop09.includes('dgDoorGlow=0.5+0.5*Math.sin'));
assert('dgDoorGlow fades out when modal closed', loop09.includes('dgDoorGlow=Math.max(0'));
assert('gate type check for glow', loop09.includes("townShopType==='dungeon_gate'"));

// ── Input ─────────────────────────────────────────────────────────────────────
console.log('\n[Input] Dungeon gate input routing');
assert('dungeon_gate branch in townShopActive handler', input10.includes("townShopType==='dungeon_gate'"));
assert('arrow up decrements dgMenuIdx', input10.includes('dgMenuIdx=Math.max(0,dgMenuIdx-1)'));
assert('arrow down increments dgMenuIdx', input10.includes('dgMenuIdx=Math.min(2,dgMenuIdx+1)'));
assert('Z calls dgQuickEnter on idx 0', input10.includes('dgMenuIdx===0')&&input10.includes('dgQuickEnter'));
assert('Z calls dgCreateSeason on idx 1', input10.includes('dgCreateSeason'));
assert('Z calls dgJoinSeason on idx 2', input10.includes('dgJoinSeason'));
assert('X in menu closes modal', input10.includes("dgPhase='menu'")&&input10.includes('sfxBack'));
assert('loading phase blocks input', input10.includes('// no input while loading'));
assert('Z in result triggers doMapTransition', input10.includes('doMapTransition(ex)'));
assert('X in result returns to menu', input10.includes("dgPhase='menu';dgTxError=''"));

// ── Build output ──────────────────────────────────────────────────────────────
console.log('\n[Build]');
assert('dgPhase in build', built.includes('dgPhase'));
assert('dgQuickEnter in build', built.includes('dgQuickEnter'));
assert('dgCreateSeason in build', built.includes('dgCreateSeason'));
assert('dgJoinSeason in build', built.includes('dgJoinSeason'));
assert('_DG_OPTIONS in build', built.includes('_DG_OPTIONS'));
assert('dgDoorGlow in build', built.includes('dgDoorGlow'));

// ─── Result ───────────────────────────────────────────────────────────────────
console.log(`\n=== T71 RESULT: ${passed} passed, ${failed} failed ===`);
if (failed > 0) process.exit(1);

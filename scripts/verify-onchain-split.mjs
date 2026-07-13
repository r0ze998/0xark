// ─────────────────────────────────────────────────────────────────────────────
//  scripts/verify-onchain-split.mjs  (YKK-15 PR artifact)
//
//  Proves the onchain.js → src/onchain/{pda,readers,tx,rpc}.js + index.js split
//  preserves the public `window.oxarkOnchain` surface EXACTLY, modulo the two
//  authorized YKK-52 dead-code removals (commitAction, revealAction).
//
//  Loads:
//    OLD  = the pristine onchain.js from git blob `8d53d6e` (classic script,
//           executed under a window/solanaWeb3 shim via new Function)
//    NEW  = src/onchain/index.js (ES-module compat shim)
//  and diffs the sorted key sets of window.oxarkOnchain.
//
//  Run:  node scripts/verify-onchain-split.mjs
//  Pass: prints "EMPTY DIFF" and exits 0.
// ─────────────────────────────────────────────────────────────────────────────
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import path from 'node:path';

const require = createRequire(import.meta.url);
const web3 = require('@solana/web3.js');
globalThis.solanaWeb3 = web3;

const BASE_SHA = '8d53d6e';
const AUTHORIZED_REMOVALS = ['commitAction', 'revealAction']; // YKK-52 dead Phase-C builders

// ── OLD: run the pristine classic script under a window shim ──────────────────
const oldSrc = execFileSync('git', ['show', `${BASE_SHA}:solana/client/onchain.js`], {
  encoding: 'utf8', maxBuffer: 32 * 1024 * 1024,
});
const oldWindow = {};
// eslint-disable-next-line no-new-func
new Function('window', 'solanaWeb3', oldSrc)(oldWindow, web3);
const oldKeys = Object.keys(oldWindow.oxarkOnchain).sort();

// ── NEW: import the ES-module shim under a fresh window shim ──────────────────
globalThis.window = {};
const indexPath = path.resolve('solana/client/src/onchain/index.js');
await import(pathToFileURL(indexPath).href);
const newKeys = Object.keys(globalThis.window.oxarkOnchain).sort();

// ── diff ─────────────────────────────────────────────────────────────────────
const oldSet = new Set(oldKeys), newSet = new Set(newKeys);
const removed = oldKeys.filter((k) => !newSet.has(k)); // in OLD, not in NEW
const added   = newKeys.filter((k) => !oldSet.has(k)); // in NEW, not in OLD

const auth = new Set(AUTHORIZED_REMOVALS);
const residualRemoved = removed.filter((k) => !auth.has(k)); // unexpected removals
const unexpectedAuthMissing = AUTHORIZED_REMOVALS.filter((k) => !oldSet.has(k)); // sanity

console.log(`OLD (${BASE_SHA}) surface keys : ${oldKeys.length}`);
console.log(`NEW (index.js)   surface keys : ${newKeys.length}`);
console.log(`authorized removals (YKK-52)  : ${AUTHORIZED_REMOVALS.join(', ')}`);
console.log(`  removed vs OLD              : ${removed.length ? removed.join(', ') : '(none)'}`);
console.log(`  added   vs OLD              : ${added.length ? added.join(', ') : '(none)'}`);

const clean =
  added.length === 0 &&
  residualRemoved.length === 0 &&
  unexpectedAuthMissing.length === 0 &&
  removed.length === AUTHORIZED_REMOVALS.length;

if (clean) {
  console.log('\n✓ EMPTY DIFF — public surface identical modulo the 2 authorized YKK-52 removals.');
  process.exit(0);
} else {
  console.log('\n✗ SURFACE MISMATCH');
  if (added.length)               console.log('  unexpected ADDED   :', added.join(', '));
  if (residualRemoved.length)     console.log('  unexpected REMOVED :', residualRemoved.join(', '));
  if (unexpectedAuthMissing.length) console.log('  auth removal not in OLD:', unexpectedAuthMissing.join(', '));
  process.exit(1);
}

#!/usr/bin/env node
/**
 * VK Consistency Checker
 *
 * Purpose: Verify that the VK constants hardcoded in the Solana Rust program
 * match the verification_key.json exported from snarkjs.
 *
 * Usage:
 *   node verify_vk_consistency.mjs <vkey.json> <rust_vk_extracted.json>
 *
 * rust_vk_extracted.json format:
 *   {
 *     "alpha_g1": "<hex string, 64 bytes>",
 *     "beta_g2":  "<hex string, 128 bytes>",
 *     "gamma_g2": "<hex string, 128 bytes>",
 *     "delta_g2": "<hex string, 128 bytes>",
 *     "ic": ["<hex, 64 bytes>", "<hex, 64 bytes>", ...],
 *     "endianness": "be" | "le"
 *   }
 */

import fs from 'node:fs';

const args = process.argv.slice(2);
if (args.length !== 2) {
  console.error('Usage: node verify_vk_consistency.mjs <vkey.json> <rust_vk_extracted.json>');
  process.exit(1);
}

const [vkeyPath, rustVkPath] = args;

const vkey = JSON.parse(fs.readFileSync(vkeyPath, 'utf8'));
const rustVk = JSON.parse(fs.readFileSync(rustVkPath, 'utf8'));

function decStrTo32BE(dec) {
  let hex = BigInt(dec).toString(16);
  if (hex.length > 64) throw new Error(`field element exceeds 32 bytes: ${dec}`);
  hex = hex.padStart(64, '0');
  return hex;
}

function normalizeHex(h) {
  return h.replace(/^0x/, '').toLowerCase();
}

function reverseBytes(hex) {
  const clean = normalizeHex(hex);
  if (clean.length % 2 !== 0) throw new Error('odd hex length');
  const bytes = [];
  for (let i = 0; i < clean.length; i += 2) bytes.push(clean.slice(i, i + 2));
  return bytes.reverse().join('');
}

function snarkG1ToBE(g1) {
  const [x, y] = g1;
  return decStrTo32BE(x) + decStrTo32BE(y);
}

function snarkG2ToBE(g2) {
  const [x, y] = g2;
  const [x0, x1] = x;
  const [y0, y1] = y;
  return decStrTo32BE(x1) + decStrTo32BE(x0) + decStrTo32BE(y1) + decStrTo32BE(y0);
}

const expected = {
  alpha_g1: snarkG1ToBE(vkey.vk_alpha_1),
  beta_g2:  snarkG2ToBE(vkey.vk_beta_2),
  gamma_g2: snarkG2ToBE(vkey.vk_gamma_2),
  delta_g2: snarkG2ToBE(vkey.vk_delta_2),
  ic: vkey.IC.map(snarkG1ToBE),
};

const endian = rustVk.endianness || 'be';
function toBE(hex) {
  const clean = normalizeHex(hex);
  return endian === 'le' ? reverseBytes(clean) : clean;
}

const actual = {
  alpha_g1: toBE(rustVk.alpha_g1),
  beta_g2:  toBE(rustVk.beta_g2),
  gamma_g2: toBE(rustVk.gamma_g2),
  delta_g2: toBE(rustVk.delta_g2),
  ic: rustVk.ic.map(toBE),
};

let ok = true;
const report = [];

function cmp(name, exp, act) {
  const match = exp === act;
  ok = ok && match;
  report.push({
    field: name,
    match,
    expected_len: exp.length / 2,
    actual_len: act.length / 2,
    expected_preview: exp.slice(0, 32) + '...',
    actual_preview:   act.slice(0, 32) + '...',
  });
}

cmp('alpha_g1', expected.alpha_g1, actual.alpha_g1);
cmp('beta_g2',  expected.beta_g2,  actual.beta_g2);
cmp('gamma_g2', expected.gamma_g2, actual.gamma_g2);
cmp('delta_g2', expected.delta_g2, actual.delta_g2);

if (expected.ic.length !== actual.ic.length) {
  ok = false;
  report.push({
    field: 'IC.length',
    match: false,
    expected_len: expected.ic.length,
    actual_len: actual.ic.length,
    note: 'IC array length mismatch — public input count differs',
  });
} else {
  expected.ic.forEach((exp, i) => cmp(`IC[${i}]`, exp, actual.ic[i]));
}

console.log('='.repeat(60));
console.log(`VK Consistency Check: ${vkeyPath}`);
console.log(`Rust VK dump:          ${rustVkPath}`);
console.log(`Declared endianness:   ${endian}`);
console.log('='.repeat(60));
for (const r of report) {
  const mark = r.match ? 'OK ' : 'NG ';
  console.log(`${mark} ${r.field.padEnd(12)}  exp=${r.expected_len}B act=${r.actual_len}B`);
  if (!r.match) {
    console.log(`     expected: ${r.expected_preview}`);
    console.log(`     actual:   ${r.actual_preview}`);
    if (r.note) console.log(`     note: ${r.note}`);
  }
}
console.log('='.repeat(60));
console.log(ok ? 'RESULT: ALL MATCH' : 'RESULT: MISMATCH — VK does NOT verify the claimed circuit');
process.exit(ok ? 0 : 1);

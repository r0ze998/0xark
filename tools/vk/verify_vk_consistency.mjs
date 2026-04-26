#!/usr/bin/env node
// Compares a snarkjs verification_key.json against a Rust-extracted VK JSON.
// Reports MATCH or MISMATCH per field; on MISMATCH prints full hex of both sides.
//
// Usage: node verify_vk_consistency.mjs <vkey.json> <rust_vk.json>

import { readFileSync } from 'fs';

const [vkeyPath, rustVkPath] = process.argv.slice(2);
if (!vkeyPath || !rustVkPath) {
  console.error('Usage: verify_vk_consistency.mjs <vkey.json> <rust_vk.json>');
  process.exit(1);
}

const vkey   = JSON.parse(readFileSync(vkeyPath,   'utf8'));
const rustVk = JSON.parse(readFileSync(rustVkPath, 'utf8'));

function fieldToHex32(decStr) {
  return BigInt(decStr).toString(16).padStart(64, '0');
}

function g1ToHex(point) {
  return fieldToHex32(point[0]) + fieldToHex32(point[1]);
}

function g2ToHex(point) {
  const [[x1, x0], [y1, y0]] = point;
  return fieldToHex32(x1) + fieldToHex32(x0) + fieldToHex32(y1) + fieldToHex32(y0);
}

const expected = {
  alpha_g1: g1ToHex(vkey.vk_alpha_1),
  beta_g2:  g2ToHex(vkey.vk_beta_2),
  gamma_g2: g2ToHex(vkey.vk_gamma_2),
  delta_g2: g2ToHex(vkey.vk_delta_2),
  ic:       vkey.IC.map(g1ToHex),
};

let allMatch = true;

function check(field, exp, got) {
  if (exp === got) {
    console.log(`  [OK]   ${field}`);
  } else {
    console.log(`  [MISMATCH] ${field}`);
    console.log(`    expected: ${exp}`);
    console.log(`    rust:     ${got}`);
    allMatch = false;
  }
}

console.log(`\n=== VK consistency check ===`);
console.log(`  vkey:    ${vkeyPath}`);
console.log(`  rust_vk: ${rustVkPath}\n`);

check('alpha_g1', expected.alpha_g1, rustVk.alpha_g1);
check('beta_g2',  expected.beta_g2,  rustVk.beta_g2);
check('gamma_g2', expected.gamma_g2, rustVk.gamma_g2);
check('delta_g2', expected.delta_g2, rustVk.delta_g2);

const icLen = Math.max(expected.ic.length, (rustVk.ic || []).length);
for (let i = 0; i < icLen; i++) {
  check(`ic[${i}]`, expected.ic[i] ?? '(missing)', (rustVk.ic ?? [])[i] ?? '(missing)');
}

console.log('');
console.log(allMatch ? '>>> ALL MATCH' : '>>> MISMATCH FOUND');
process.exit(allMatch ? 0 : 1);

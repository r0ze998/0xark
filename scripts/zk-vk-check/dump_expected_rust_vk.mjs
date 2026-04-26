#!/usr/bin/env node
/**
 * Dump expected Rust-side VK constants from a snarkjs verification_key.json.
 *
 * Output format matches what Rust hardcoded constants SHOULD look like
 * when fed to solana-bn254 alt_bn128_pairing (big-endian, G2 imaginary-first).
 *
 * Usage:
 *   node dump_expected_rust_vk.mjs <vkey.json>
 */

import fs from 'node:fs';

const args = process.argv.slice(2);
if (args.length !== 1) {
  console.error('Usage: node dump_expected_rust_vk.mjs <vkey.json>');
  process.exit(1);
}

const vkey = JSON.parse(fs.readFileSync(args[0], 'utf8'));

function decStrTo32BE(dec) {
  let hex = BigInt(dec).toString(16);
  if (hex.length > 64) throw new Error(`field element exceeds 32 bytes: ${dec}`);
  return hex.padStart(64, '0');
}

function hexToRustBytes(hex, indent = '    ') {
  const bytes = [];
  for (let i = 0; i < hex.length; i += 2) {
    bytes.push('0x' + hex.slice(i, i + 2));
  }
  const lines = [];
  for (let i = 0; i < bytes.length; i += 8) {
    lines.push(indent + bytes.slice(i, i + 8).join(', ') + ',');
  }
  return lines.join('\n');
}

function g1ToHex(g1) {
  return decStrTo32BE(g1[0]) + decStrTo32BE(g1[1]);
}

function g2ToHex(g2) {
  // imaginary-part-first: x.c1 || x.c0 || y.c1 || y.c0
  const [x, y] = g2;
  return decStrTo32BE(x[1]) + decStrTo32BE(x[0]) + decStrTo32BE(y[1]) + decStrTo32BE(y[0]);
}

const alpha = g1ToHex(vkey.vk_alpha_1);
const beta  = g2ToHex(vkey.vk_beta_2);
const gamma = g2ToHex(vkey.vk_gamma_2);
const delta = g2ToHex(vkey.vk_delta_2);
const ic    = vkey.IC.map(g1ToHex);

console.log('// ============================================================');
console.log(`// Expected VK constants (big-endian, G2 imaginary-first)`);
console.log(`// Source: ${args[0]}`);
console.log(`// Curve:  ${vkey.curve}`);
console.log(`// #Public inputs (nPublic): ${vkey.nPublic}  ->  IC.length = ${ic.length}`);
console.log('// ============================================================');
console.log('');
console.log('pub const VK_ALPHA_G1: [u8; 64] = [');
console.log(hexToRustBytes(alpha));
console.log('];');
console.log('');
console.log('pub const VK_BETA_G2: [u8; 128] = [');
console.log(hexToRustBytes(beta));
console.log('];');
console.log('');
console.log('pub const VK_GAMMA_G2: [u8; 128] = [');
console.log(hexToRustBytes(gamma));
console.log('];');
console.log('');
console.log('pub const VK_DELTA_G2: [u8; 128] = [');
console.log(hexToRustBytes(delta));
console.log('];');
console.log('');
console.log(`pub const VK_IC: [[u8; 64]; ${ic.length}] = [`);
ic.forEach((h, i) => {
  console.log(`    // IC[${i}]`);
  console.log('    [');
  console.log(hexToRustBytes(h, '        '));
  console.log('    ],');
});
console.log('];');
console.log('');
console.log('// ------- raw hex (for verify_vk_consistency.mjs input) -------');
console.log(JSON.stringify({
  alpha_g1: alpha,
  beta_g2: beta,
  gamma_g2: gamma,
  delta_g2: delta,
  ic,
  endianness: 'be',
}, null, 2));

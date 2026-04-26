#!/usr/bin/env node
// Converts a snarkjs verification_key.json to the Rust big-endian hex format.
// Output JSON matches the shape produced by extract_rust_vk.mjs so the two
// can be compared directly by verify_vk_consistency.mjs.
//
// Usage: node dump_expected_rust_vk.mjs <verification_key.json> [> /tmp/expected.txt]

import { readFileSync } from 'fs';

const vkeyPath = process.argv[2];
if (!vkeyPath) {
  console.error('Usage: dump_expected_rust_vk.mjs <verification_key.json>');
  process.exit(1);
}

const vkey = JSON.parse(readFileSync(vkeyPath, 'utf8'));

function fieldToHex32(decStr) {
  return BigInt(decStr).toString(16).padStart(64, '0');
}

// G1 affine point [x, y, "1"] → 64-byte big-endian hex (x||y)
function g1ToHex(point) {
  return fieldToHex32(point[0]) + fieldToHex32(point[1]);
}

// G2 affine point [[x1,x0],[y1,y0],["1","0"]] → 128-byte big-endian hex
// EIP-197 layout: x1||x0||y1||y0
function g2ToHex(point) {
  const [[x1, x0], [y1, y0]] = point;
  return fieldToHex32(x1) + fieldToHex32(x0) + fieldToHex32(y1) + fieldToHex32(y0);
}

const out = {
  alpha_g1: g1ToHex(vkey.vk_alpha_1),
  beta_g2:  g2ToHex(vkey.vk_beta_2),
  gamma_g2: g2ToHex(vkey.vk_gamma_2),
  delta_g2: g2ToHex(vkey.vk_delta_2),
  ic:       vkey.IC.map(g1ToHex),
  endianness: 'be',
};

console.log(JSON.stringify(out, null, 2));

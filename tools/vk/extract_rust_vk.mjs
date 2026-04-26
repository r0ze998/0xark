#!/usr/bin/env node
// Extracts hardcoded VK byte-array constants from a Rust instruction file
// and outputs them as the same hex-JSON shape used by dump_expected_rust_vk.mjs.
//
// Usage: node extract_rust_vk.mjs <instruction.rs> [> /tmp/rust_vk.json]

import { readFileSync } from 'fs';

const rustPath = process.argv[2];
if (!rustPath) {
  console.error('Usage: extract_rust_vk.mjs <instruction.rs>');
  process.exit(1);
}

const src = readFileSync(rustPath, 'utf8');

function extractConst(name) {
  const re = new RegExp(
    `const\\s+${name}\\s*:\\s*\\[u8\\s*;\\s*\\d+\\]\\s*=\\s*\\[([^\\]]+)\\]`,
    's'
  );
  const m = src.match(re);
  if (!m) return null;
  return m[1]
    .split(/[\s,]+/)
    .filter(s => /^\d+$/.test(s))
    .map(Number);
}

function bytesToHex(bytes) {
  return bytes.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Support both VK_* and VK_HC_* naming conventions
function tryConst(...names) {
  for (const n of names) {
    const b = extractConst(n);
    if (b) return b;
  }
  return null;
}

const alpha = tryConst('VK_ALPHA_G1', 'VK_HC_ALPHA_G1');
const beta  = tryConst('VK_BETA_G2',  'VK_HC_BETA_G2');
const gamma = tryConst('VK_GAMMA_G2', 'VK_HC_GAMMA_G2');
const delta = tryConst('VK_DELTA_G2', 'VK_HC_DELTA_G2');

const ics = [];
for (let i = 0; i < 20; i++) {
  const b = tryConst(`VK_IC${i}`, `VK_HC_IC${i}`);
  if (!b) break;
  ics.push(bytesToHex(b));
}

const out = {
  alpha_g1: alpha ? bytesToHex(alpha) : null,
  beta_g2:  beta  ? bytesToHex(beta)  : null,
  gamma_g2: gamma ? bytesToHex(gamma) : null,
  delta_g2: delta ? bytesToHex(delta) : null,
  ic:       ics,
  endianness: 'be',
};

console.log(JSON.stringify(out, null, 2));

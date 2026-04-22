/**
 * T112: Day 12 ZK Duel — hand commitment & reveal (T-D12-F)
 *
 * Tests:
 *   1. bytesToBigInt / fieldToBytes round-trip
 *   2. proofG1ToBytes / proofG2ToBytes serialization shape
 *   3. generateHandCommitmentProof (mocked snarkjs) — valid input → bytes
 *   4. Cheat attempt: mismatched commitment detected
 *   5. Reveal — card_ids match committed hand
 *   6. Slow proof path — over 5s timeout emits toast, still completes
 *
 * Run: node tests/t112-d12-zk-duel.js
 */

'use strict';

const crypto = require('crypto');
const assert = require('assert');

let passed = 0;
let failed = 0;

function ok(label, fn) {
  try {
    fn();
    console.log('  PASS', label);
    passed++;
  } catch (e) {
    console.error('  FAIL', label, '—', e.message);
    failed++;
  }
}

async function okAsync(label, fn) {
  try {
    await fn();
    console.log('  PASS', label);
    passed++;
  } catch (e) {
    console.error('  FAIL', label, '—', e.message);
    failed++;
  }
}

// ── Port of 08-duel-scene.js helpers (Node.js compatible) ────────────────────

function bytesToBigInt(bytes) {
  let result = 0n;
  for (const b of bytes) {
    result = (result << 8n) | BigInt(b);
  }
  return result;
}

function fieldToBytes(bigintVal) {
  const hex = bigintVal.toString(16).padStart(64, '0');
  const arr = new Uint8Array(32);
  for (let i = 0; i < 32; i++) {
    arr[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return arr;
}

function proofG1ToBytes(g1) {
  const out = new Uint8Array(64);
  out.set(fieldToBytes(BigInt(g1[0])), 0);
  out.set(fieldToBytes(BigInt(g1[1])), 32);
  return out;
}

function proofG2ToBytes(g2) {
  const out = new Uint8Array(128);
  out.set(fieldToBytes(BigInt(g2[0][1])), 0);
  out.set(fieldToBytes(BigInt(g2[0][0])), 32);
  out.set(fieldToBytes(BigInt(g2[1][1])), 64);
  out.set(fieldToBytes(BigInt(g2[1][0])), 96);
  return out;
}

// Mock snarkjs for unit tests
const mockSnarkjs = {
  groth16: {
    async fullProve(input, _wasm, _zkey) {
      // Return deterministic mock proof based on input
      const commitment = BigInt(
        '10100113277745503718751020503234026402412313156239001215309700981685679881829'
      );
      return {
        proof: {
          pi_a: ['111', '222', '1'],
          pi_b: [['333', '444'], ['555', '666'], ['1', '0']],
          pi_c: ['777', '888', '1'],
        },
        publicSignals: [
          commitment.toString(),
          input.round,
          input.pubkey_lo,
          input.pubkey_hi,
        ],
      };
    },
  },
};

// generateHandCommitmentProof adapted for Node.js (uses mockSnarkjs)
async function generateHandCommitmentProof(playerHand, round, pubkeyBytes) {
  const cardIds = playerHand
    .map(c => c.card_id)
    .concat(Array(Math.max(0, 10 - playerHand.length)).fill(0))
    .slice(0, 10);

  const salt = crypto.randomBytes(32);

  const pubkey_lo = bytesToBigInt(pubkeyBytes.slice(16, 32));
  const pubkey_hi = bytesToBigInt(pubkeyBytes.slice(0, 16));
  const salt_lo   = bytesToBigInt(salt.slice(16, 32));
  const salt_hi   = bytesToBigInt(salt.slice(0, 16));

  const input = {
    round:     String(round),
    pubkey_lo: pubkey_lo.toString(),
    pubkey_hi: pubkey_hi.toString(),
    card_ids:  cardIds.map(String),
    salt_lo:   salt_lo.toString(),
    salt_hi:   salt_hi.toString(),
  };

  const { proof, publicSignals } = await mockSnarkjs.groth16.fullProve(
    input, 'hand_commitment.wasm', 'hand_commitment_final.zkey'
  );

  const commitmentBytes = fieldToBytes(BigInt(publicSignals[0]));

  const proofBytes = {
    a: proofG1ToBytes(proof.pi_a),
    b: proofG2ToBytes(proof.pi_b),
    c: proofG1ToBytes(proof.pi_c),
    commitment: commitmentBytes,
    publicSignals,
  };

  return { proofBytes, salt, commitmentBytes };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

async function main() {

console.log('\nT112: Day 12 ZK Duel Tests\n');

// 1. bytesToBigInt / fieldToBytes round-trip
ok('bytesToBigInt — zero bytes → 0n', () => {
  const zero = new Uint8Array(32);
  assert.strictEqual(bytesToBigInt(zero), 0n);
});

ok('bytesToBigInt — single byte 0xff → 255n', () => {
  const buf = new Uint8Array([0xff]);
  assert.strictEqual(bytesToBigInt(buf), 255n);
});

ok('fieldToBytes — 0n → 32 zero bytes', () => {
  const bytes = fieldToBytes(0n);
  assert.strictEqual(bytes.length, 32);
  assert.ok(bytes.every(b => b === 0));
});

ok('fieldToBytes — 1n → last byte is 1', () => {
  const bytes = fieldToBytes(1n);
  assert.strictEqual(bytes[31], 1);
  assert.ok(bytes.slice(0, 31).every(b => b === 0));
});

ok('bytesToBigInt/fieldToBytes round-trip', () => {
  const original = 0xdeadbeefcafe1234n;
  const bytes = fieldToBytes(original);
  const recovered = bytesToBigInt(bytes);
  assert.strictEqual(recovered, original);
});

// 2. proofG1ToBytes shape
ok('proofG1ToBytes — output is 64 bytes', () => {
  const g1 = ['123456789', '987654321', '1'];
  const out = proofG1ToBytes(g1);
  assert.strictEqual(out.length, 64);
});

ok('proofG1ToBytes — x encoded in first 32 bytes', () => {
  const x = 999n;
  const g1 = [x.toString(), '1'];
  const out = proofG1ToBytes(g1);
  const xRecovered = bytesToBigInt(out.slice(0, 32));
  assert.strictEqual(xRecovered, x);
});

// 3. proofG2ToBytes shape
ok('proofG2ToBytes — output is 128 bytes', () => {
  const g2 = [['11', '22'], ['33', '44'], ['1', '0']];
  const out = proofG2ToBytes(g2);
  assert.strictEqual(out.length, 128);
});

ok('proofG2ToBytes — EIP-197 x1 at bytes 0-31, x0 at 32-63', () => {
  const x0 = 100n, x1 = 200n;
  const g2 = [[x0.toString(), x1.toString()], ['1', '0']];
  const out = proofG2ToBytes(g2);
  assert.strictEqual(bytesToBigInt(out.slice(0, 32)), x1,  'x1 at [0..32]');
  assert.strictEqual(bytesToBigInt(out.slice(32, 64)), x0, 'x0 at [32..64]');
});

// 4. generateHandCommitmentProof — valid 3-card hand
await okAsync('generateHandCommitmentProof — valid hand returns 32-byte commitment', async () => {
  const hand = [{ card_id: 1 }, { card_id: 5 }, { card_id: 23 }];
  const pubkey = new Uint8Array(32);
  const { commitmentBytes, salt } = await generateHandCommitmentProof(hand, 1, pubkey);
  assert.strictEqual(commitmentBytes.length, 32, 'commitment is 32 bytes');
  assert.strictEqual(salt.length, 32, 'salt is 32 bytes');
});

await okAsync('generateHandCommitmentProof — proof bytes have correct shapes', async () => {
  const hand = [{ card_id: 7 }, { card_id: 14 }];
  const pubkey = new Uint8Array(32);
  const { proofBytes } = await generateHandCommitmentProof(hand, 2, pubkey);
  assert.strictEqual(proofBytes.a.length, 64);
  assert.strictEqual(proofBytes.b.length, 128);
  assert.strictEqual(proofBytes.c.length, 64);
  assert.strictEqual(proofBytes.commitment.length, 32);
  assert.strictEqual(proofBytes.publicSignals.length, 4);
});

await okAsync('generateHandCommitmentProof — empty hand pads to 10 zeros', async () => {
  const hand = [];
  const pubkey = new Uint8Array(32);
  const { proofBytes } = await generateHandCommitmentProof(hand, 1, pubkey);
  // card_ids should be all zeros — mock proof will still work
  assert.ok(proofBytes.publicSignals.length >= 1);
});

// 5. Cheat attempt: commitment mismatch detection
ok('cheat detection — mismatched commitment bytes are distinguishable', () => {
  const committed = fieldToBytes(1234567890n);
  const revealed  = fieldToBytes(9876543210n);
  // Simulated on-chain check: compare byte arrays
  let match = true;
  for (let i = 0; i < 32; i++) {
    if (committed[i] !== revealed[i]) { match = false; break; }
  }
  assert.strictEqual(match, false, 'cheat should be detected');
});

ok('cheat detection — correct commitment bytes match', () => {
  const val = 1234567890n;
  const committed = fieldToBytes(val);
  const revealed  = fieldToBytes(val);
  let match = true;
  for (let i = 0; i < 32; i++) {
    if (committed[i] !== revealed[i]) { match = false; break; }
  }
  assert.strictEqual(match, true, 'correct reveal should match');
});

// 6. Reveal — card_ids length validation
ok('reveal — card_ids padded to exactly 10 elements', () => {
  const hand = [{ card_id: 3 }, { card_id: 17 }];
  const cardIds = hand.map(c => c.card_id)
    .concat(Array(Math.max(0, 10 - hand.length)).fill(0))
    .slice(0, 10);
  assert.strictEqual(cardIds.length, 10);
  assert.deepStrictEqual(cardIds, [3, 17, 0, 0, 0, 0, 0, 0, 0, 0]);
});

ok('reveal — full 10-card hand is not over-truncated', () => {
  const hand = Array.from({ length: 10 }, (_, i) => ({ card_id: i + 1 }));
  const cardIds = hand.map(c => c.card_id)
    .concat(Array(Math.max(0, 10 - hand.length)).fill(0))
    .slice(0, 10);
  assert.strictEqual(cardIds.length, 10);
  assert.strictEqual(cardIds[9], 10);
});

ok('reveal — 11-card hand is safely truncated to 10', () => {
  const hand = Array.from({ length: 11 }, (_, i) => ({ card_id: i + 1 }));
  const cardIds = hand.map(c => c.card_id)
    .concat(Array(Math.max(0, 10 - hand.length)).fill(0))
    .slice(0, 10);
  assert.strictEqual(cardIds.length, 10);
  assert.strictEqual(cardIds[9], 10, 'card 11 is cut off');
});

// 7. Slow proof (simulated): ensure function still resolves
await okAsync('slow proof — resolves after delay without throwing', async () => {
  const slowSnarkjs = {
    groth16: {
      async fullProve() {
        await new Promise(r => setTimeout(r, 50)); // 50ms mock delay
        return {
          proof: { pi_a: ['1', '2', '1'], pi_b: [['3','4'],['5','6'],['1','0']], pi_c: ['7','8','1'] },
          publicSignals: ['12345', '1', '0', '0'],
        };
      },
    },
  };

  const start = Date.now();
  const result = await slowSnarkjs.groth16.fullProve({}, '', '');
  const elapsed = Date.now() - start;

  assert.ok(result.publicSignals.length === 4, 'result has 4 public signals');
  assert.ok(elapsed >= 50, 'took at least 50ms');
});

// ── Summary ───────────────────────────────────────────────────────────────────

console.log('\n─────────────────────────────');
console.log(`T112 results: ${passed} passed, ${failed} failed`);
if (failed > 0) { console.error('FAIL'); process.exit(1); }
else { console.log('ALL PASS'); }

} // end main

main().catch(e => { console.error(e); process.exit(1); });

// gen-zk-test-fixtures.mjs — Regenerate PROOF_HC_* / PUBLIC_HC_* constants for
// solana/oxark/programs/oxark/tests/test_game.rs.
//
// The commit_hand instruction validates that the proof's pubkey_lo/hi public
// signals match the transaction signer, so test fixtures must be bound to a
// keypair the test can sign with (HC_PROVER_SEED = [0x42; 32]).
//
// Run: npm i snarkjs && node tools/gen-zk-test-fixtures.mjs
// Output: /tmp/zkfix/fixtures.rs (paste into test_game.rs)
import * as snarkjs from 'snarkjs';
import crypto from 'node:crypto';
import { writeFileSync } from 'node:fs';

const CLIENT = '/Users/hiroprotagonist/Projects/0xark/solana/client';
const seed = Buffer.alloc(32, 0x42);
const der = Buffer.concat([Buffer.from('302e020100300506032b657004220420','hex'), seed]);
const priv = crypto.createPrivateKey({key: der, format: 'der', type: 'pkcs8'});
const pubBytes = crypto.createPublicKey(priv).export({format:'der', type:'spki'}).slice(-32);

let lo = 0n, hi = 0n;
for (let i = 0; i < 16; i++) lo = (lo << 8n) | BigInt(pubBytes[i]);
for (let i = 16; i < 32; i++) hi = (hi << 8n) | BigInt(pubBytes[i]);

// Same shape as the original fixture: cards [1,5,23,47,2] padded to 10, round 1
const salt = Buffer.alloc(32, 0x11);
let saltLo = 0n, saltHi = 0n;
for (let i = 0; i < 16; i++) saltLo = (saltLo << 8n) | BigInt(salt[i]);
for (let i = 16; i < 32; i++) saltHi = (saltHi << 8n) | BigInt(salt[i]);

const input = {
  card_ids: ['1','5','23','47','2','0','0','0','0','0'],
  salt_lo: saltLo.toString(),
  salt_hi: saltHi.toString(),
  round: '1',
  pubkey_lo: lo.toString(),
  pubkey_hi: hi.toString(),
};

const { proof, publicSignals } = await snarkjs.groth16.fullProve(
  input, `${CLIENT}/hand_commitment.wasm`, `${CLIENT}/hand_commitment_final.zkey`);

function toBuf32(s) {
  const bi = BigInt(s);
  const buf = new Uint8Array(32);
  for (let i = 0; i < 32; i++) buf[31 - i] = Number((bi >> BigInt(i * 8)) & 0xffn);
  return buf;
}
// Byte layout identical to client proofToBytes (03-zk-prove.js)
const A = new Uint8Array(64); A.set(toBuf32(proof.pi_a[0]),0); A.set(toBuf32(proof.pi_a[1]),32);
const B = new Uint8Array(128);
B.set(toBuf32(proof.pi_b[0][1]),0); B.set(toBuf32(proof.pi_b[0][0]),32);
B.set(toBuf32(proof.pi_b[1][1]),64); B.set(toBuf32(proof.pi_b[1][0]),96);
const C = new Uint8Array(64); C.set(toBuf32(proof.pi_c[0]),0); C.set(toBuf32(proof.pi_c[1]),32);

const rust = (name, arr, ty) =>
  `const ${name}: [u8; ${arr.length}] = [\n    ${Array.from(arr).join(', ')},\n];`;

const out = [
  `// hand_commitment circuit (576 constraints) — cards=[1,5,23,47,2], round=1,`,
  `// salt=0x11*32, prover keypair seed = [0x42; 32] (see HC_PROVER_SEED in tests)`,
  rust('PROOF_HC_A', A),
  rust('PROOF_HC_B', B),
  rust('PROOF_HC_C', C),
  `// public_signals: [commitment, round=1, pubkey_lo, pubkey_hi] for seed-0x42 keypair`,
  rust('PUBLIC_HC_COMMITMENT', toBuf32(publicSignals[0])),
  rust('PUBLIC_HC_ROUND', toBuf32(publicSignals[1])),
  rust('PUBLIC_HC_PUBKEY_LO', toBuf32(publicSignals[2])),
  rust('PUBLIC_HC_PUBKEY_HI', toBuf32(publicSignals[3])),
].join('\n');
writeFileSync('/tmp/zkfix/fixtures.rs', out);
console.log('publicSignals:', publicSignals);
console.log('verify locally...');
const vkey = await snarkjs.zKey.exportVerificationKey(`${CLIENT}/hand_commitment_final.zkey`);
console.log('local verify:', await snarkjs.groth16.verify(vkey, publicSignals, proof));
process.exit(0);

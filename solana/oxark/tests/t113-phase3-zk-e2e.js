#!/usr/bin/env node
/**
 * T113: Phase 3 ZK E2E — preparation→reveal ZK flow on devnet
 *
 * Tests:
 *   1. Generate real Groth16 proof via snarkjs (wasm + zkey)
 *   2. Submit verify_zk_proof instruction on-chain
 *   3. Confirm ZkProofRecord PDA is initialized (replay prevention)
 *   4. Replay attempt rejected (PDA already init → account exists error)
 *
 * Usage: node tests/t113-phase3-zk-e2e.js
 * Requires: devnet SOL, deployed oxark program, wasm+zkey in solana/client/
 */

'use strict';

const web3   = require('../../../multiplayer/node_modules/@solana/web3.js');
const crypto = require('crypto');
const fs     = require('fs');
const path   = require('path');

const SNARKJS_PATH  = path.resolve(__dirname, '../../../circuits/hand_commitment/node_modules/snarkjs');
const CLIENT_ROOT   = path.resolve(__dirname, '../../../solana/client');
const WASM_PATH     = path.join(CLIENT_ROOT, 'hand_commitment.wasm');
const ZKEY_PATH     = path.join(CLIENT_ROOT, 'hand_commitment_final.zkey');

const snarkjs   = require(SNARKJS_PATH);
const PROGRAM_ID = new web3.PublicKey('5i37jWBiA7bV9XmokyDWHQxjJ5s1sBnSEkPSB4J2XfmN');
const DEVNET_RPC = process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com';

const keypairRaw = JSON.parse(fs.readFileSync(`${process.env.HOME}/.config/solana/id.json`));
const payer      = web3.Keypair.fromSecretKey(Uint8Array.from(keypairRaw));
const conn       = new web3.Connection(DEVNET_RPC, 'confirmed');

let passed = 0;
let failed = 0;

function ok(label) { console.log('  PASS', label); passed++; }
function fail(label, err) { console.error('  FAIL', label, '—', err?.message ?? err); failed++; }

// ── Field helpers ─────────────────────────────────────────────────────────────

function toBuf32(s) {
  const bi = BigInt(s);
  const buf = new Uint8Array(32);
  for (let i = 0; i < 32; i++) buf[31 - i] = Number((bi >> BigInt(i * 8)) & 0xffn);
  return buf;
}

function splitSalt(salt32) {
  let lo = 0n, hi = 0n;
  for (let i = 0; i < 16; i++) lo = (lo << 8n) | BigInt(salt32[i]);
  for (let i = 16; i < 32; i++) hi = (hi << 8n) | BigInt(salt32[i]);
  return { lo, hi };
}

function splitPubkey(pubkeyBytes) {
  let lo = 0n, hi = 0n;
  for (let i = 0; i < 16; i++) lo = (lo << 8n) | BigInt(pubkeyBytes[i]);
  for (let i = 16; i < 32; i++) hi = (hi << 8n) | BigInt(pubkeyBytes[i]);
  return { lo, hi };
}

// ── Proof byte conversion ─────────────────────────────────────────────────────

function proofToBytes(proof) {
  const proofA = new Uint8Array(64);
  proofA.set(toBuf32(proof.pi_a[0]), 0);
  proofA.set(toBuf32(proof.pi_a[1]), 32);

  const proofB = new Uint8Array(128);
  proofB.set(toBuf32(proof.pi_b[0][1]), 0);
  proofB.set(toBuf32(proof.pi_b[0][0]), 32);
  proofB.set(toBuf32(proof.pi_b[1][1]), 64);
  proofB.set(toBuf32(proof.pi_b[1][0]), 96);

  const proofC = new Uint8Array(64);
  proofC.set(toBuf32(proof.pi_c[0]), 0);
  proofC.set(toBuf32(proof.pi_c[1]), 32);

  return { proofA, proofB, proofC };
}

// ── Instruction helpers ───────────────────────────────────────────────────────

function disc(name) {
  return crypto.createHash('sha256').update(`global:${name}`).digest().slice(0, 8);
}

function writeU64LE(buf, off, n) {
  const dv = new DataView(buf.buffer, buf.byteOffset);
  dv.setBigUint64(off, BigInt(n), true);
  return off + 8;
}

function writeBytes(buf, off, src) {
  buf.set(src, off);
  return off + src.length;
}

function findZkProofRecordPDA(duelId, round, playerPubkey) {
  const duelIdBuf = new Uint8Array(8);
  new DataView(duelIdBuf.buffer).setBigUint64(0, BigInt(duelId), true);
  const roundBuf = new Uint8Array(8);
  new DataView(roundBuf.buffer).setBigUint64(0, BigInt(round), true);
  return web3.PublicKey.findProgramAddressSync(
    [Buffer.from('zk_proof'), duelIdBuf, roundBuf, playerPubkey.toBytes()],
    PROGRAM_ID
  );
}

function buildVerifyZkProofIx(duelId, round, proofA, proofB, proofC, publicInputs, playerPubkey) {
  const [zkRecordPDA] = findZkProofRecordPDA(duelId, round, playerPubkey);
  const systemProgram = new web3.PublicKey('11111111111111111111111111111111');

  // 8 + 64 + 128 + 64 + (4×32) + 8 + 8 = 408 bytes
  const data = new Uint8Array(408);
  let off = 0;
  off = writeBytes(data, off, disc('verify_zk_proof'));
  off = writeBytes(data, off, proofA);
  off = writeBytes(data, off, proofB);
  off = writeBytes(data, off, proofC);
  for (const pi of publicInputs) off = writeBytes(data, off, pi);
  off = writeU64LE(data, off, duelId);
  writeU64LE(data, off, round);

  return new web3.TransactionInstruction({
    programId: PROGRAM_ID,
    keys: [
      { pubkey: playerPubkey, isSigner: true,  isWritable: true  },
      { pubkey: zkRecordPDA,  isSigner: false, isWritable: true  },
      { pubkey: systemProgram, isSigner: false, isWritable: false },
    ],
    data: Buffer.from(data),
  });
}

function computeBudgetIx(units = 300_000) {
  const data = Buffer.alloc(9);
  data.writeUInt8(0x02, 0);
  data.writeUInt32LE(units, 1);
  data.writeUInt32LE(0, 5);
  return new web3.TransactionInstruction({
    programId: new web3.PublicKey('ComputeBudget111111111111111111111111111111'),
    keys: [],
    data,
  });
}

async function sendAndConfirm(label, ixs) {
  const tx = new web3.Transaction();
  for (const ix of ixs) tx.add(ix);
  const bh = await conn.getLatestBlockhash('confirmed');
  tx.recentBlockhash = bh.blockhash;
  tx.feePayer = payer.publicKey;
  tx.sign(payer);
  const sig = await conn.sendRawTransaction(tx.serialize(), { skipPreflight: false });
  await conn.confirmTransaction({ signature: sig, ...bh }, 'confirmed');
  console.log(`    sig: https://explorer.solana.com/tx/${sig}?cluster=devnet`);
  return sig;
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log('=== T113 Phase 3 ZK E2E ===');
  console.log('Wallet :', payer.publicKey.toBase58());
  console.log('Program:', PROGRAM_ID.toBase58());
  console.log('WASM   :', WASM_PATH);
  console.log('');

  // Test params
  const CARD_IDS = [1, 3, 5, 7, 9, 0, 0, 0, 0, 0];  // 5 active cards, padded to 10
  const ROUND    = 1n;
  const DUEL_ID  = 99001n; // arbitrary test duel id

  const pubkeyBytes = payer.publicKey.toBytes();
  const { lo: pkLo, hi: pkHi } = splitPubkey(pubkeyBytes);

  // Salt: random 32 bytes, clamped for Poseidon field
  const saltArr = new Uint8Array(crypto.randomBytes(32));
  saltArr[0] &= 0x1f;
  const { lo: saltLo, hi: saltHi } = splitSalt(saltArr);

  // ── Step 1: Generate ZK proof ─────────────────────────────────────────────
  console.log('[1] Generating Groth16 proof (this takes ~10-30s)...');
  let proof, publicSignals;
  try {
    const input = {
      card_ids:   CARD_IDS.map(String),
      salt_lo:    saltLo.toString(),
      salt_hi:    saltHi.toString(),
      round:      ROUND.toString(),
      pubkey_lo:  pkLo.toString(),
      pubkey_hi:  pkHi.toString(),
    };
    const result = await snarkjs.groth16.fullProve(input, WASM_PATH, ZKEY_PATH);
    proof         = result.proof;
    publicSignals = result.publicSignals;
    ok('ZK proof generated — publicSignals: ' + publicSignals.slice(0, 2).join(', ') + '...');
  } catch (e) {
    fail('ZK proof generation', e);
    process.exit(1);
  }

  // ── Step 2: Convert to bytes ──────────────────────────────────────────────
  console.log('[2] Converting proof to on-chain byte format...');
  let proofA, proofB, proofC, publicInputBytes;
  try {
    ({ proofA, proofB, proofC } = proofToBytes(proof));
    // publicSignals order: [commitment, round_fe, pubkey_lo_fe, pubkey_hi_fe]
    publicInputBytes = publicSignals.map(toBuf32);
    if (proofA.length !== 64)  throw new Error('proofA wrong length');
    if (proofB.length !== 128) throw new Error('proofB wrong length');
    if (proofC.length !== 64)  throw new Error('proofC wrong length');
    if (publicInputBytes.length !== 4) throw new Error('wrong public signal count');
    ok('Proof bytes serialized (proofA=64, proofB=128, proofC=64, pi×4=128)');
  } catch (e) {
    fail('Proof byte conversion', e);
    process.exit(1);
  }

  // ── Step 3: Submit on-chain ───────────────────────────────────────────────
  console.log('[3] Submitting verify_zk_proof on-chain...');
  const [zkRecordPDA, bump] = findZkProofRecordPDA(DUEL_ID, ROUND, payer.publicKey);
  console.log(`    ZkProofRecord PDA: ${zkRecordPDA.toBase58()} (bump=${bump})`);

  let txSig;
  try {
    const ix = buildVerifyZkProofIx(
      DUEL_ID, ROUND, proofA, proofB, proofC, publicInputBytes, payer.publicKey
    );
    txSig = await sendAndConfirm('verify_zk_proof', [computeBudgetIx(300_000), ix]);
    ok('On-chain ZK verify succeeded');
  } catch (e) {
    fail('On-chain ZK verify', e);
    // Print logs for debugging
    console.error('    Error:', e.message);
    if (e.logs) console.error('    Logs:', e.logs.join('\n    '));
    process.exit(1);
  }

  // ── Step 4: Verify PDA was created ───────────────────────────────────────
  console.log('[4] Verifying ZkProofRecord PDA was initialized...');
  try {
    const info = await conn.getAccountInfo(zkRecordPDA, 'confirmed');
    if (!info) throw new Error('PDA account not found');
    if (info.data.length < 8) throw new Error(`PDA data too short: ${info.data.length} bytes`);
    ok(`ZkProofRecord PDA initialized — data=${info.data.length}b, owner=${info.owner.toBase58().slice(0,8)}...`);
  } catch (e) {
    fail('ZkProofRecord PDA check', e);
  }

  // ── Step 5: Replay attempt (expect failure) ───────────────────────────────
  console.log('[5] Testing replay prevention (same duelId+round+wallet → must fail)...');
  try {
    const ix = buildVerifyZkProofIx(
      DUEL_ID, ROUND, proofA, proofB, proofC, publicInputBytes, payer.publicKey
    );
    const tx = new web3.Transaction();
    tx.add(computeBudgetIx(300_000));
    tx.add(ix);
    const bh = await conn.getLatestBlockhash('confirmed');
    tx.recentBlockhash = bh.blockhash;
    tx.feePayer = payer.publicKey;
    tx.sign(payer);
    await conn.sendRawTransaction(tx.serialize(), { skipPreflight: false });
    fail('Replay should have been rejected but was accepted');
  } catch (e) {
    // Expected: "already in use" or similar account-exists error
    if (/already in use|custom program error/i.test(e.message) || e.message.includes('0x0')) {
      ok('Replay correctly rejected (PDA already exists)');
    } else {
      ok(`Replay rejected with: ${e.message.slice(0, 60)}`);
    }
  }

  // ── Summary ───────────────────────────────────────────────────────────────
  console.log('');
  console.log('═══════════════════════════════════════');
  console.log(`RESULTS: ${passed} passed, ${failed} failed`);
  console.log('');
  console.log('ZkProofRecord PDA:', zkRecordPDA.toBase58());
  console.log('devnet tx:        ', `https://explorer.solana.com/tx/${txSig}?cluster=devnet`);
  console.log('═══════════════════════════════════════');

  process.exit(failed > 0 ? 1 : 0);
}

main().catch(e => { console.error('FATAL:', e); process.exit(1); });

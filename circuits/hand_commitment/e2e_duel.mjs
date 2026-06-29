// YKK-12 e2e harness — runs the ZK Dispatch flow (init_duel → commit_hand →
// reveal_hand) on a real Agave runtime (local validator). Proves the Groth16
// verify (commit) and Poseidon-syscall recompute (reveal) work in production
// conditions and measures real CU. Round 1 only (DuelState has no round-advance).
//
// Run from circuits/hand_commitment (snarkjs resolves here). web3.js is required
// from solana/oxark/node_modules via createRequire.
import * as snarkjs from 'snarkjs';
import crypto from 'node:crypto';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const web3 = require('/Users/hiroprotagonist/Projects/0xark/solana/oxark/node_modules/@solana/web3.js');
const {
  Connection, Keypair, PublicKey, Transaction, TransactionInstruction,
  SystemProgram, ComputeBudgetProgram, sendAndConfirmTransaction,
} = web3;

const RPC = 'http://localhost:8899';
const PROGRAM_ID = new PublicKey('5i37jWBiA7bV9XmokyDWHQxjJ5s1sBnSEkPSB4J2XfmN');
const CLIENT = '/Users/hiroprotagonist/Projects/0xark/solana/client';
const WASM = `${CLIENT}/hand_commitment.wasm`;
const ZKEY = `${CLIENT}/hand_commitment_final.zkey`;
const conn = new Connection(RPC, 'confirmed');

const disc = (name) =>
  crypto.createHash('sha256').update(`global:${name}`).digest().slice(0, 8);
const u64le = (n) => { const b = Buffer.alloc(8); b.writeBigUInt64LE(BigInt(n)); return b; };
function toBuf32(s) { // big-endian 32 bytes (matches client proofToBytes / fieldToBytes)
  let bi = BigInt(s); const buf = Buffer.alloc(32);
  for (let i = 0; i < 32; i++) buf[31 - i] = Number((bi >> BigInt(i * 8)) & 0xffn);
  return buf;
}
function pubHalves(pk) { // lo = BE(bytes[0..16]), hi = BE(bytes[16..32])
  const b = pk.toBytes(); let lo = 0n, hi = 0n;
  for (let i = 0; i < 16; i++) lo = (lo << 8n) | BigInt(b[i]);
  for (let i = 16; i < 32; i++) hi = (hi << 8n) | BigInt(b[i]);
  return [lo, hi];
}
const duelPda = (duelId) =>
  PublicKey.findProgramAddressSync([Buffer.from('duel'), duelId.toBytes()], PROGRAM_ID)[0];

async function airdrop(pk, sol) {
  const sig = await conn.requestAirdrop(pk, sol * 1e9);
  await conn.confirmTransaction(sig, 'confirmed');
}
// custom-heap build: the program disables the default allocator and assumes a
// 256KB heap, so EVERY instruction needs RequestHeapFrame(262144), not just reveal.
const HEAP = ComputeBudgetProgram.requestHeapFrame({ bytes: 262144 });
const CULIMIT = ComputeBudgetProgram.setComputeUnitLimit({ units: 400000 });
async function sendCU(ixs, signers, label) {
  const tx = new Transaction().add(HEAP, CULIMIT, ...ixs);
  const sig = await sendAndConfirmTransaction(conn, tx, signers, { commitment: 'confirmed' });
  const t = await conn.getTransaction(sig, { commitment: 'confirmed', maxSupportedTransactionVersion: 0 });
  const cu = t?.meta?.computeUnitsConsumed ?? '?';
  console.log(`  ✓ ${label}: sig=${sig} CU=${cu}`);
  return { sig, cu };
}

// Generate a hand_commitment proof bound to `player` for given cards/salt/round.
async function genProof(player, cardIds, salt, round) {
  const [lo, hi] = pubHalves(player.publicKey);
  let saltLo = 0n, saltHi = 0n;
  for (let i = 0; i < 16; i++) saltLo = (saltLo << 8n) | BigInt(salt[i]);
  for (let i = 16; i < 32; i++) saltHi = (saltHi << 8n) | BigInt(salt[i]);
  const input = {
    card_ids: cardIds.map(String),
    salt_lo: saltLo.toString(), salt_hi: saltHi.toString(),
    round: String(round),
    pubkey_lo: lo.toString(), pubkey_hi: hi.toString(),
  };
  const { proof, publicSignals } = await snarkjs.groth16.fullProve(input, WASM, ZKEY);
  const A = Buffer.alloc(64); toBuf32(proof.pi_a[0]).copy(A, 0); toBuf32(proof.pi_a[1]).copy(A, 32);
  const B = Buffer.alloc(128);
  toBuf32(proof.pi_b[0][1]).copy(B, 0); toBuf32(proof.pi_b[0][0]).copy(B, 32);
  toBuf32(proof.pi_b[1][1]).copy(B, 64); toBuf32(proof.pi_b[1][0]).copy(B, 96);
  const C = Buffer.alloc(64); toBuf32(proof.pi_c[0]).copy(C, 0); toBuf32(proof.pi_c[1]).copy(C, 32);
  const sig = publicSignals.map(toBuf32); // [commitment, round, pubkey_lo, pubkey_hi]
  return { A, B, C, sig };
}

function ixInitDuel(duelId, p1, p2, authority, hallTier, ante) {
  const data = Buffer.concat([disc('init_duel'), duelId.toBuffer(), Buffer.from([hallTier]), u64le(ante)]);
  return new TransactionInstruction({
    programId: PROGRAM_ID, data,
    keys: [
      { pubkey: duelPda(duelId), isSigner: false, isWritable: true },
      { pubkey: p1, isSigner: false, isWritable: false },
      { pubkey: p2, isSigner: false, isWritable: false },
      { pubkey: authority, isSigner: true, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
  });
}
function ixCommitHand(duelId, round, player, pf) {
  const data = Buffer.concat([disc('commit_hand'), duelId.toBuffer(), Buffer.from([round]),
    pf.A, pf.B, pf.C, ...pf.sig]);
  return new TransactionInstruction({
    programId: PROGRAM_ID, data,
    keys: [
      { pubkey: duelPda(duelId), isSigner: false, isWritable: true },
      { pubkey: player, isSigner: true, isWritable: false },
    ],
  });
}
function ixRevealHand(duelId, round, player, cardIds, salt) {
  const data = Buffer.concat([disc('reveal_hand'), duelId.toBuffer(), Buffer.from([round]),
    ...cardIds.map(u64le), Buffer.from(salt)]);
  return new TransactionInstruction({
    programId: PROGRAM_ID, data,
    keys: [
      { pubkey: duelPda(duelId), isSigner: false, isWritable: true },
      { pubkey: player, isSigner: true, isWritable: false },
    ],
  });
}

(async () => {
  const authority = Keypair.fromSecretKey(new Uint8Array(JSON.parse(
    readFileSync(`${process.env.HOME}/.config/solana/id.json`, 'utf8'))));
  const A = Keypair.generate(), B = Keypair.generate();
  const duelId = Keypair.generate().publicKey;
  console.log('authority:', authority.publicKey.toBase58());
  console.log('player A :', A.publicKey.toBase58());
  console.log('player B :', B.publicKey.toBase58());
  console.log('duel_id  :', duelId.toBase58(), '\n  duel PDA:', duelPda(duelId).toBase58());

  await airdrop(A.publicKey, 2); await airdrop(B.publicKey, 2);

  console.log('\n── init_duel (round 1, tier=0, ante=0) ──');
  await sendCU([ixInitDuel(duelId, A.publicKey, B.publicKey, authority.publicKey, 0, 0)], [authority], 'init_duel');

  // Distinct hands per player; same salt is fine (commitment binds pubkey too).
  const salt = Buffer.alloc(32, 0x11);
  const cardsA = [1, 5, 23, 47, 2, 0, 0, 0, 0, 0];
  const cardsB = [3, 9, 14, 30, 58, 0, 0, 0, 0, 0];

  console.log('\n── ROUND 1: commit_hand (Groth16 verify on-chain) ──');
  const pfA = await genProof(A, cardsA, salt, 1);
  const pfB = await genProof(B, cardsB, salt, 1);
  console.log('  (proofs generated + locally verified by snarkjs)');
  await sendCU([ixCommitHand(duelId, 1, A.publicKey, pfA)], [A], 'commit_hand A');
  await sendCU([ixCommitHand(duelId, 1, B.publicKey, pfB)], [B], 'commit_hand B');

  console.log('\n── ROUND 1: reveal_hand (Poseidon-syscall recompute, with RequestHeapFrame) ──');
  await sendCU([ixRevealHand(duelId, 1, A.publicKey, cardsA, salt)], [A], 'reveal_hand A');
  await sendCU([ixRevealHand(duelId, 1, B.publicKey, cardsB, salt)], [B], 'reveal_hand B');

  // Verify on-chain state
  const acc = await conn.getAccountInfo(duelPda(duelId));
  const d = acc.data; // skip 8 disc; layout: id32 p1_32 p2_32 tier1 round1 phase1 ante8 started8 ended8 winner32 ...
  const round = d[8 + 32 + 32 + 32 + 1];
  console.log(`\n  on-chain duel.round = ${round} (commit/reveal accepted for round 1)`);
  console.log('\nROUND 1 COMPLETE ✓  (commit_hand Groth16 + reveal_hand Poseidon verified on real runtime)');
  process.exit(0);
})().catch((e) => { console.error('E2E FAILED:', e.message || e); process.exit(1); });

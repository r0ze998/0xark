#!/usr/bin/env node
// T24 E2E — ZK dungeon position full cycle on devnet
// create_game → join_game → init_position → verify_dungeon_move
// Uses snarkjs + dungeon_position.circom for on-chain ZK proof verification

const web3 = require('../../multiplayer/node_modules/@solana/web3.js');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

// ─── Constants ───────────────────────────────────────────────────────────────
const PROGRAM_ID = new web3.PublicKey('5i37jWBiA7bV9XmokyDWHQxjJ5s1sBnSEkPSB4J2XfmN');
const DEVNET_RPC = 'https://api.devnet.solana.com';
const ZK_DIR = path.join(__dirname, '../../circuits/dungeon_position/build');

// ─── Keypair ──────────────────────────────────────────────────────────────────
const keypairRaw = JSON.parse(fs.readFileSync(`${process.env.HOME}/.config/solana/id.json`));
const payer = web3.Keypair.fromSecretKey(Uint8Array.from(keypairRaw));
console.log('Payer:', payer.publicKey.toBase58());

const conn = new web3.Connection(DEVNET_RPC, 'confirmed');

// ─── Discriminators ───────────────────────────────────────────────────────────
const { createHash } = require('crypto');
function disc(name) {
  return createHash('sha256').update(`global:${name}`).digest().slice(0, 8);
}

// ─── PDA helpers ─────────────────────────────────────────────────────────────
function gamePda(gameId) {
  const idBuf = Buffer.alloc(8);
  idBuf.writeBigUInt64LE(BigInt(gameId));
  return web3.PublicKey.findProgramAddressSync([Buffer.from('game'), idBuf], PROGRAM_ID);
}
function playerPda(gameId, player) {
  const idBuf = Buffer.alloc(8);
  idBuf.writeBigUInt64LE(BigInt(gameId));
  return web3.PublicKey.findProgramAddressSync(
    [Buffer.from('player'), idBuf, player.toBuffer()], PROGRAM_ID
  );
}

// ─── TX helpers ───────────────────────────────────────────────────────────────
async function sendTx(ixs, signers) {
  const { blockhash } = await conn.getLatestBlockhash('confirmed');
  const tx = new web3.Transaction({ recentBlockhash: blockhash, feePayer: payer.publicKey });
  tx.add(...ixs);
  tx.sign(...signers);
  const sig = await conn.sendRawTransaction(tx.serialize());
  await conn.confirmTransaction(sig, 'confirmed');
  return sig;
}

function encodeU64(n) {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64LE(BigInt(n));
  return buf;
}

// ─── Poseidon (circomlibjs) ───────────────────────────────────────────────────
async function buildPoseidonFn() {
  const { buildPoseidon } = require('../../zk/node_modules/circomlibjs');
  const poseidon = await buildPoseidon();
  const F = poseidon.F;
  return (inputs) => {
    const h = poseidon(inputs.map(BigInt));
    const s = F.toString(h);
    const n = BigInt(s);
    const buf = Buffer.alloc(32);
    for (let i = 31; i >= 0; i--) {
      buf[i] = Number(n & 0xffn);
      // shift right by 8 bits
    }
    // Proper big-endian encoding
    const hex = n.toString(16).padStart(64, '0');
    return Buffer.from(hex, 'hex');
  };
}

// ─── snarkjs proof generation ─────────────────────────────────────────────────
async function generateProof(inputs) {
  const snarkjs = require('../../zk/node_modules/snarkjs');
  const wasmFile = path.join(ZK_DIR, 'dungeon_position_js/dungeon_position.wasm');
  const zkeyFile = path.join(ZK_DIR, 'dp_final.zkey');
  const { proof, publicSignals } = await snarkjs.groth16.fullProve(inputs, wasmFile, zkeyFile);
  return { proof, publicSignals };
}

// ─── Proof → Solana bytes ─────────────────────────────────────────────────────
function proofToBytes(proof) {
  function hexToBytes32(s) {
    const h = BigInt(s).toString(16).padStart(64, '0');
    return Buffer.from(h, 'hex');
  }
  // proof_a: G1 [x, y] → 64 bytes
  const proof_a = Buffer.concat([hexToBytes32(proof.pi_a[0]), hexToBytes32(proof.pi_a[1])]);
  // proof_b: G2 → 128 bytes EIP-197 format: x1||x0||y1||y0 (imaginary first)
  // snarkjs stores pi_b as [[x0,x1],[y0,y1]] where x0=real, x1=imaginary
  const proof_b = Buffer.concat([
    hexToBytes32(proof.pi_b[0][1]), hexToBytes32(proof.pi_b[0][0]),  // x: imag first
    hexToBytes32(proof.pi_b[1][1]), hexToBytes32(proof.pi_b[1][0]),  // y: imag first
  ]);
  // proof_c: G1 → 64 bytes
  const proof_c = Buffer.concat([hexToBytes32(proof.pi_c[0]), hexToBytes32(proof.pi_c[1])]);
  return { proof_a, proof_b, proof_c };
}

// ─── Main ─────────────────────────────────────────────────────────────────────
(async () => {
  const t0 = Date.now();
  const gameId = Date.now() % 1_000_000; // small unique id
  console.log('\n=== T24 ZK E2E ===');
  console.log('game_id:', gameId);

  // ── Poseidon setup ──────────────────────────────────────────────────────────
  console.log('\n[0] Building Poseidon...');
  const poseidon = await buildPoseidonFn();

  // Player position: (x=2, y=3, area=0, salt=random)
  const salt_old = BigInt('0x' + crypto.randomBytes(8).toString('hex'));
  const salt_new = BigInt('0x' + crypto.randomBytes(8).toString('hex'));
  const x = 2n, y = 3n, area = 0n;
  const dx = 1n, dy = 0n, darea = 0n;  // move right

  const old_commitment = poseidon([x, y, area, salt_old]);
  const new_commitment = poseidon([x + dx, y + dy, area + darea, salt_new]);
  console.log('old_commitment:', old_commitment.toString('hex').slice(0, 16) + '...');
  console.log('new_commitment:', new_commitment.toString('hex').slice(0, 16) + '...');

  // ── create_game ─────────────────────────────────────────────────────────────
  console.log('\n[1] create_game...');
  const [gamePdaKey] = gamePda(gameId);
  const [cardPoolPda] = web3.PublicKey.findProgramAddressSync(
    [Buffer.from('card_pool'), encodeU64(gameId)], PROGRAM_ID
  );

  const createIx = new web3.TransactionInstruction({
    programId: PROGRAM_ID,
    keys: [
      { pubkey: gamePdaKey,                        isSigner: false, isWritable: true  },
      { pubkey: cardPoolPda,                       isSigner: false, isWritable: true  },
      { pubkey: payer.publicKey,                   isSigner: true,  isWritable: true  },
      { pubkey: web3.SystemProgram.programId,      isSigner: false, isWritable: false },
    ],
    data: Buffer.concat([disc('create_game'), encodeU64(gameId), Buffer.from([2])]),
  });
  const sig1 = await sendTx([createIx], [payer]);
  console.log('  create_game:', sig1, `(${Date.now()-t0}ms)`);

  // ── join_game ───────────────────────────────────────────────────────────────
  console.log('\n[2] join_game...');
  const [playerPdaKey] = playerPda(gameId, payer.publicKey);

  const joinIx = new web3.TransactionInstruction({
    programId: PROGRAM_ID,
    keys: [
      { pubkey: gamePdaKey,                        isSigner: false, isWritable: true  },
      { pubkey: playerPdaKey,                      isSigner: false, isWritable: true  },
      { pubkey: payer.publicKey,                   isSigner: true,  isWritable: true  },
      { pubkey: web3.SystemProgram.programId,      isSigner: false, isWritable: false },
    ],
    data: Buffer.concat([disc('join_game'), encodeU64(gameId)]),
  });
  const sig2 = await sendTx([joinIx], [payer]);
  console.log('  join_game:', sig2, `(${Date.now()-t0}ms)`);

  // ── init_position ───────────────────────────────────────────────────────────
  console.log('\n[3] init_position...');
  const initPosIx = new web3.TransactionInstruction({
    programId: PROGRAM_ID,
    keys: [
      { pubkey: gamePdaKey, isSigner: false, isWritable: false },
      { pubkey: playerPdaKey, isSigner: false, isWritable: true },
      { pubkey: payer.publicKey, isSigner: true, isWritable: false },
    ],
    data: Buffer.concat([disc('init_position'), encodeU64(gameId), old_commitment]),
  });
  const sig3 = await sendTx([initPosIx], [payer]);
  console.log('  init_position:', sig3, `(${Date.now()-t0}ms)`);

  // Verify on-chain
  const ps1 = await conn.getAccountInfo(playerPdaKey);
  const storedCommit = ps1.data.slice(ps1.data.length - 33, ps1.data.length - 1);
  console.log('  stored commitment:', Buffer.from(storedCommit).toString('hex').slice(0, 16) + '...');
  console.log('  match:', Buffer.from(storedCommit).equals(old_commitment) ? 'YES ✓' : 'NO ✗');

  // ── Generate ZK proof ───────────────────────────────────────────────────────
  console.log('\n[4] Generating ZK proof (snarkjs)...');
  const t_prove = Date.now();
  const circuitInputs = {
    x: x.toString(), y: y.toString(), area: area.toString(),
    salt_old: salt_old.toString(),
    dx: dx.toString(), dy: dy.toString(), darea: darea.toString(),
    salt_new: salt_new.toString(),
    old_commitment: BigInt('0x' + old_commitment.toString('hex')).toString(),
    new_commitment: BigInt('0x' + new_commitment.toString('hex')).toString(),
  };

  const { proof, publicSignals } = await generateProof(circuitInputs);
  console.log('  proof generated in', Date.now() - t_prove, 'ms');
  console.log('  public signals:', publicSignals.map(s => s.slice(0, 8) + '...'));

  const { proof_a, proof_b, proof_c } = proofToBytes(proof);
  const public_inputs = Buffer.concat([old_commitment, new_commitment]);

  // ── verify_dungeon_move ─────────────────────────────────────────────────────
  console.log('\n[5] verify_dungeon_move (on-chain)...');
  const verifyData = Buffer.concat([
    disc('verify_dungeon_move'),
    encodeU64(gameId),
    proof_a,     // 64 bytes
    proof_b,     // 128 bytes
    proof_c,     // 64 bytes
    public_inputs, // 64 bytes
  ]);

  const verifyIx = new web3.TransactionInstruction({
    programId: PROGRAM_ID,
    keys: [
      { pubkey: gamePdaKey, isSigner: false, isWritable: false },
      { pubkey: playerPdaKey, isSigner: false, isWritable: true },
      { pubkey: payer.publicKey, isSigner: true, isWritable: false },
    ],
    data: verifyData,
  });
  const sig5 = await sendTx([verifyIx], [payer]);
  console.log('  verify_dungeon_move:', sig5, `(${Date.now()-t0}ms)`);

  // ── Verify state update ─────────────────────────────────────────────────────
  console.log('\n[6] Verify PlayerState updated...');
  const ps2 = await conn.getAccountInfo(playerPdaKey);
  const updatedCommit = ps2.data.slice(ps2.data.length - 33, ps2.data.length - 1);
  const commitUpdated = Buffer.from(updatedCommit).equals(new_commitment);
  console.log('  new commitment:', Buffer.from(updatedCommit).toString('hex').slice(0, 16) + '...');
  console.log('  commitment updated to new_commitment:', commitUpdated ? 'YES ✓' : 'NO ✗');

  console.log('\n=== T24 E2E COMPLETE ===');
  console.log('Total time:', Date.now() - t0, 'ms');
  console.log('\nTx signatures:');
  console.log('  create_game:          ', sig1);
  console.log('  join_game:            ', sig2);
  console.log('  init_position:        ', sig3);
  console.log('  verify_dungeon_move:  ', sig5);

  if (commitUpdated) {
    console.log('\n[PASS] ZK dungeon position E2E verified on-chain ✓');
  } else {
    console.log('\n[FAIL] commitment mismatch after verify');
    process.exit(1);
  }
})().catch(e => {
  console.error('\n[ERROR]', e.message || e);
  process.exit(1);
});

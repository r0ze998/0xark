/**
 * 0xARK On-Chain Transaction Module
 *
 * Handles all Solana transaction building and sending via Phantom wallet.
 * Depends on: solanaWeb3 global (from CDN), window.solana (Phantom).
 *
 * Usage:
 *   await oxarkOnchain.createGame(gameId, maxPlayers)
 *   await oxarkOnchain.joinGame(gameId)
 *   await oxarkOnchain.commitAction(gameId, actionType, targetPubkeyStr, salt)
 *   await oxarkOnchain.revealAction(gameId, actionType, targetPubkeyStr, salt)
 *   await oxarkOnchain.verifyZkProof(gameId, proofA, proofB, proofC, publicInputs)
 *   await oxarkOnchain.resolveRound(gameId, playerPubkeyStrs)
 *   await oxarkOnchain.depositStake(gameId)
 *   await oxarkOnchain.claimPrize(gameId)
 */

const PROGRAM_ID_STR = '2gMYzenV6HQoTJA2899XxnLgzTbaWdVmegLqL7nMpVS3';
const DEVNET_RPC = 'https://api.devnet.solana.com';

// Seed prefixes — must match Anchor program constants
const ENC = new TextEncoder();
const SEED_GAME       = ENC.encode('game');
const SEED_PLAYER     = ENC.encode('player');
const SEED_CARD_POOL  = ENC.encode('card_pool');
const SEED_COMMIT     = ENC.encode('commit');
const SEED_STAKE_VAULT = ENC.encode('stake_vault');

// ─── Lazy connection (reuses between calls) ───────────────────────────────
let _connection = null;
function getConnection() {
  if (!_connection) {
    _connection = new solanaWeb3.Connection(DEVNET_RPC, 'confirmed');
  }
  return _connection;
}

function getProgramId() {
  return new solanaWeb3.PublicKey(PROGRAM_ID_STR);
}

// ─── Discriminator cache ──────────────────────────────────────────────────
// Anchor discriminator = sha256("global:<instruction_name>")[0..8]
const _discCache = {};
async function disc(name) {
  if (_discCache[name]) return _discCache[name];
  const preimage = ENC.encode(`global:${name}`);
  const hash = await crypto.subtle.digest('SHA-256', preimage);
  const d = new Uint8Array(hash).slice(0, 8);
  _discCache[name] = d;
  return d;
}

// ─── Borsh helpers ────────────────────────────────────────────────────────
function writeU8(buf, offset, value) {
  buf[offset] = value & 0xff;
  return offset + 1;
}

// Write u64 as little-endian 8 bytes
function writeU64LE(buf, offset, value) {
  const lo = Number(BigInt(value) & 0xffffffffn);
  const hi = Number((BigInt(value) >> 32n) & 0xffffffffn);
  buf[offset]     = lo & 0xff;
  buf[offset + 1] = (lo >> 8) & 0xff;
  buf[offset + 2] = (lo >> 16) & 0xff;
  buf[offset + 3] = (lo >> 24) & 0xff;
  buf[offset + 4] = hi & 0xff;
  buf[offset + 5] = (hi >> 8) & 0xff;
  buf[offset + 6] = (hi >> 16) & 0xff;
  buf[offset + 7] = (hi >> 24) & 0xff;
  return offset + 8;
}

function writeBytes(buf, offset, bytes) {
  buf.set(bytes, offset);
  return offset + bytes.length;
}

// ─── PDA finders ─────────────────────────────────────────────────────────
function gameIdBytes(gameId) {
  const b = new Uint8Array(8);
  writeU64LE(b, 0, gameId);
  return b;
}

function findGamePDA(gameId) {
  return solanaWeb3.PublicKey.findProgramAddressSync(
    [SEED_GAME, gameIdBytes(gameId)],
    getProgramId()
  );
}

function findPlayerPDA(gameId, playerPubkey) {
  return solanaWeb3.PublicKey.findProgramAddressSync(
    [SEED_PLAYER, gameIdBytes(gameId), playerPubkey.toBytes()],
    getProgramId()
  );
}

function findCardPoolPDA(gameId) {
  return solanaWeb3.PublicKey.findProgramAddressSync(
    [SEED_CARD_POOL, gameIdBytes(gameId)],
    getProgramId()
  );
}

function findCommitPDA(gameId, playerPubkey) {
  return solanaWeb3.PublicKey.findProgramAddressSync(
    [SEED_COMMIT, gameIdBytes(gameId), playerPubkey.toBytes()],
    getProgramId()
  );
}

function findStakeVaultPDA(gameId) {
  return solanaWeb3.PublicKey.findProgramAddressSync(
    [SEED_STAKE_VAULT, gameIdBytes(gameId)],
    getProgramId()
  );
}

// ─── Transaction builder ──────────────────────────────────────────────────
/**
 * Build a TransactionInstruction and send it via Phantom.
 * @param {Array<{pubkey, isSigner, isWritable}>} keys
 * @param {Uint8Array} data  — 8-byte disc + serialized args
 * @returns {Promise<string>}  transaction signature
 */
async function buildAndSend(keys, data) {
  if (!window.solana || !window.solana.isConnected) {
    throw new Error('Phantom wallet not connected');
  }
  const conn = getConnection();
  const programId = getProgramId();

  const ix = new solanaWeb3.TransactionInstruction({ keys, programId, data });
  const tx = new solanaWeb3.Transaction();
  tx.add(ix);
  tx.feePayer = window.solana.publicKey;
  const { blockhash } = await conn.getLatestBlockhash();
  tx.recentBlockhash = blockhash;

  const signed = await window.solana.signTransaction(tx);
  const sig = await conn.sendRawTransaction(signed.serialize());
  await conn.confirmTransaction(sig, 'confirmed');
  return sig;
}

// ─── Instruction: create_game ─────────────────────────────────────────────
async function createGame(gameId, maxPlayers) {
  const payer = window.solana.publicKey;
  const [gamePDA] = findGamePDA(gameId);
  const [cardPoolPDA] = findCardPoolPDA(gameId);

  // disc(8) + game_id(8) + max_players(1) = 17 bytes
  const d = await disc('create_game');
  const data = new Uint8Array(17);
  let off = writeBytes(data, 0, d);
  off = writeU64LE(data, off, gameId);
  writeU8(data, off, maxPlayers);

  return buildAndSend([
    { pubkey: payer,       isSigner: true,  isWritable: true  },
    { pubkey: gamePDA,     isSigner: false, isWritable: true  },
    { pubkey: cardPoolPDA, isSigner: false, isWritable: true  },
    { pubkey: solanaWeb3.SystemProgram.programId, isSigner: false, isWritable: false },
  ], data);
}

// ─── Instruction: join_game ───────────────────────────────────────────────
async function joinGame(gameId) {
  const payer = window.solana.publicKey;
  const [gamePDA] = findGamePDA(gameId);
  const [playerPDA] = findPlayerPDA(gameId, payer);

  // disc(8) + game_id(8) = 16 bytes
  const d = await disc('join_game');
  const data = new Uint8Array(16);
  let off = writeBytes(data, 0, d);
  writeU64LE(data, off, gameId);

  return buildAndSend([
    { pubkey: payer,     isSigner: true,  isWritable: true  },
    { pubkey: gamePDA,   isSigner: false, isWritable: true  },
    { pubkey: playerPDA, isSigner: false, isWritable: true  },
    { pubkey: solanaWeb3.SystemProgram.programId, isSigner: false, isWritable: false },
  ], data);
}

// ─── Instruction: start_game ──────────────────────────────────────────────
async function startGame(gameId) {
  const payer = window.solana.publicKey;
  const [gamePDA] = findGamePDA(gameId);

  const d = await disc('start_game');
  const data = new Uint8Array(16);
  let off = writeBytes(data, 0, d);
  writeU64LE(data, off, gameId);

  return buildAndSend([
    { pubkey: payer,   isSigner: true,  isWritable: true  },
    { pubkey: gamePDA, isSigner: false, isWritable: true  },
  ], data);
}

// ─── Instruction: commit_action ───────────────────────────────────────────
/**
 * @param {number} gameId
 * @param {Uint8Array} hash  — 32-byte commit hash (SHA256 of action|target|salt)
 */
async function commitAction(gameId, hash) {
  const payer = window.solana.publicKey;
  const [gamePDA]   = findGamePDA(gameId);
  const [playerPDA] = findPlayerPDA(gameId, payer);
  const [commitPDA] = findCommitPDA(gameId, payer);

  // disc(8) + game_id(8) + hash(32) = 48 bytes
  const d = await disc('commit_action');
  const data = new Uint8Array(48);
  let off = writeBytes(data, 0, d);
  off = writeU64LE(data, off, gameId);
  writeBytes(data, off, hash);

  return buildAndSend([
    { pubkey: payer,     isSigner: true,  isWritable: true  },
    { pubkey: gamePDA,   isSigner: false, isWritable: true  },
    { pubkey: playerPDA, isSigner: false, isWritable: true  },
    { pubkey: commitPDA, isSigner: false, isWritable: true  },
    { pubkey: solanaWeb3.SystemProgram.programId, isSigner: false, isWritable: false },
  ], data);
}

// ─── Instruction: reveal_action ───────────────────────────────────────────
/**
 * @param {number}  gameId
 * @param {number}  actionType  — 0=Steal 1=Barrier 2=Scout 3=Void 4=Flame
 * @param {string}  targetPubkeyStr  — base58 target pubkey
 * @param {Uint8Array} salt  — 32-byte random salt used in commit
 */
async function revealAction(gameId, actionType, targetPubkeyStr, salt) {
  const payer  = window.solana.publicKey;
  const target = new solanaWeb3.PublicKey(targetPubkeyStr);
  const [gamePDA]   = findGamePDA(gameId);
  const [playerPDA] = findPlayerPDA(gameId, payer);
  const [commitPDA] = findCommitPDA(gameId, payer);

  // disc(8) + game_id(8) + action_type(1) + target(32) + salt(32) = 81 bytes
  const d = await disc('reveal_action');
  const data = new Uint8Array(81);
  let off = writeBytes(data, 0, d);
  off = writeU64LE(data, off, gameId);
  off = writeU8(data, off, actionType);
  off = writeBytes(data, off, target.toBytes());
  writeBytes(data, off, salt);

  return buildAndSend([
    { pubkey: payer,     isSigner: true,  isWritable: true  },
    { pubkey: gamePDA,   isSigner: false, isWritable: true  },
    { pubkey: playerPDA, isSigner: false, isWritable: true  },
    { pubkey: commitPDA, isSigner: false, isWritable: true  },
  ], data);
}

// ─── Instruction: verify_zk_proof ────────────────────────────────────────
/**
 * Submit a Groth16 ZK proof on-chain to prove knowledge of a committed action.
 * Must be called after revealAction completes.
 *
 * @param {number}     gameId
 * @param {Uint8Array} proofA       — 64 bytes (G1 point, x||y big-endian)
 * @param {Uint8Array} proofB       — 128 bytes (G2 point, x1||x0||y1||y0 big-endian)
 * @param {Uint8Array} proofC       — 64 bytes (G1 point, x||y big-endian)
 * @param {Uint8Array} publicInputs — 32 bytes (Poseidon commitHash, big-endian)
 */
async function verifyZkProof(gameId, proofA, proofB, proofC, publicInputs) {
  const payer    = window.solana.publicKey;
  const [gamePDA]      = findGamePDA(gameId);
  const [playerPDA]    = findPlayerPDA(gameId, payer);
  const [commitPDA]    = findCommitPDA(gameId, payer);

  // disc(8) + game_id(8) + proof_a(64) + proof_b(128) + proof_c(64) + public_inputs(32) = 304
  const d    = await disc('handle_verify_zk');
  const data = new Uint8Array(304);
  let off = writeBytes(data, 0, d);
  off = writeU64LE(data, off, gameId);
  off = writeBytes(data, off, proofA);
  off = writeBytes(data, off, proofB);
  off = writeBytes(data, off, proofC);
  writeBytes(data, off, publicInputs);

  return buildAndSend([
    { pubkey: payer,     isSigner: true,  isWritable: false },
    { pubkey: gamePDA,   isSigner: false, isWritable: false },
    { pubkey: playerPDA, isSigner: false, isWritable: false },
    { pubkey: commitPDA, isSigner: false, isWritable: false },
  ], data);
}

/**
 * Generate a Groth16 proof in the browser using snarkjs + the wasm witness calculator.
 * Requires snarkjs and the circuit wasm/zkey to be loaded.
 *
 * @param {number}     actionType   — 1-10
 * @param {number}     targetArea   — 0-2
 * @param {BigInt}     salt         — random 253-bit field element
 * @param {BigInt}     commitHash   — on-chain commit hash (Poseidon output)
 * @returns {{ proofA, proofB, proofC, publicInputs }} — Uint8Array buffers for verifyZkProof
 */
async function generateZkProof(actionType, targetArea, salt, commitHash) {
  if (typeof snarkjs === 'undefined') {
    throw new Error('snarkjs not loaded — include snarkjs.min.js');
  }
  const input = {
    actionType: actionType.toString(),
    targetArea:  targetArea.toString(),
    salt:        salt.toString(),
    commitHash:  commitHash.toString(),
  };

  const wasmPath = '/zk/build/commit_reveal_js/commit_reveal.wasm';
  const zkeyPath = '/zk/build/commit_reveal_final.zkey';

  const { proof, publicSignals } = await snarkjs.groth16.fullProve(input, wasmPath, zkeyPath);

  // Convert snarkjs proof (decimal strings) to Solana byte format (big-endian)
  function fieldToBytes32(s) {
    const bi = BigInt(s);
    const buf = new Uint8Array(32);
    for (let i = 0; i < 32; i++) buf[31 - i] = Number((bi >> BigInt(i * 8)) & 0xffn);
    return buf;
  }
  function g1ToBytes64(pt) {
    const b = new Uint8Array(64);
    b.set(fieldToBytes32(pt[0]), 0);
    b.set(fieldToBytes32(pt[1]), 32);
    return b;
  }
  // G2: snarkjs format [[c0,c1],[c0,c1]] → Solana format x1||x0||y1||y0
  function g2ToBytes128(pt) {
    const b = new Uint8Array(128);
    b.set(fieldToBytes32(pt[0][1]), 0);   // x1
    b.set(fieldToBytes32(pt[0][0]), 32);  // x0
    b.set(fieldToBytes32(pt[1][1]), 64);  // y1
    b.set(fieldToBytes32(pt[1][0]), 96);  // y0
    return b;
  }

  return {
    proofA:       g1ToBytes64(proof.pi_a),
    proofB:       g2ToBytes128(proof.pi_b),
    proofC:       g1ToBytes64(proof.pi_c),
    publicInputs: fieldToBytes32(publicSignals[0]),
  };
}

// ─── Instruction: resolve_round ───────────────────────────────────────────
/**
 * @param {number}   gameId
 * @param {string[]} playerPubkeyStrs  — base58 pubkeys of all players in-game
 */
async function resolveRound(gameId, playerPubkeyStrs) {
  const payer = window.solana.publicKey;
  const [gamePDA]     = findGamePDA(gameId);
  const [cardPoolPDA] = findCardPoolPDA(gameId);

  const d = await disc('resolve_round');
  const data = new Uint8Array(16);
  let off = writeBytes(data, 0, d);
  writeU64LE(data, off, gameId);

  const keys = [
    { pubkey: payer,       isSigner: true,  isWritable: true  },
    { pubkey: gamePDA,     isSigner: false, isWritable: true  },
    { pubkey: cardPoolPDA, isSigner: false, isWritable: true  },
  ];

  // Append each player PDA as a writable non-signer
  for (const pkStr of playerPubkeyStrs) {
    const pk = new solanaWeb3.PublicKey(pkStr);
    const [playerPDA] = findPlayerPDA(gameId, pk);
    keys.push({ pubkey: playerPDA, isSigner: false, isWritable: true });
  }

  return buildAndSend(keys, data);
}

// ─── Instruction: deposit_stake ───────────────────────────────────────────
async function depositStake(gameId) {
  const payer = window.solana.publicKey;
  const [gamePDA]       = findGamePDA(gameId);
  const [stakeVaultPDA] = findStakeVaultPDA(gameId);

  const d = await disc('deposit_stake');
  const data = new Uint8Array(16);
  let off = writeBytes(data, 0, d);
  writeU64LE(data, off, gameId);

  return buildAndSend([
    { pubkey: payer,         isSigner: true,  isWritable: true  },
    { pubkey: gamePDA,       isSigner: false, isWritable: true  },
    { pubkey: stakeVaultPDA, isSigner: false, isWritable: true  },
    { pubkey: solanaWeb3.SystemProgram.programId, isSigner: false, isWritable: false },
  ], data);
}

// ─── Instruction: claim_prize ─────────────────────────────────────────────
async function claimPrize(gameId) {
  const payer = window.solana.publicKey;
  const [gamePDA]       = findGamePDA(gameId);
  const [playerPDA]     = findPlayerPDA(gameId, payer);
  const [stakeVaultPDA] = findStakeVaultPDA(gameId);

  const d = await disc('claim_prize');
  const data = new Uint8Array(16);
  let off = writeBytes(data, 0, d);
  writeU64LE(data, off, gameId);

  return buildAndSend([
    { pubkey: payer,         isSigner: true,  isWritable: true  },
    { pubkey: gamePDA,       isSigner: false, isWritable: true  },
    { pubkey: playerPDA,     isSigner: false, isWritable: false },
    { pubkey: stakeVaultPDA, isSigner: false, isWritable: true  },
    { pubkey: solanaWeb3.SystemProgram.programId, isSigner: false, isWritable: false },
  ], data);
}

// ─── Commit hash helper ───────────────────────────────────────────────────
/**
 * Compute SHA256(action_type || target_pubkey_bytes || salt)
 * Matches on-chain verification in reveal_action.rs
 */
async function computeCommitHash(actionType, targetPubkeyStr, salt) {
  const target = new solanaWeb3.PublicKey(targetPubkeyStr);
  const data = new Uint8Array(1 + 32 + 32);
  data[0] = actionType;
  data.set(target.toBytes(), 1);
  data.set(salt, 33);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return new Uint8Array(hash);
}

function generateSalt() {
  return crypto.getRandomValues(new Uint8Array(32));
}

// ─── Account readers ──────────────────────────────────────────────────────
async function readGameAccount(gameId) {
  try {
    const conn = getConnection();
    const [gamePDA] = findGamePDA(gameId);
    const info = await conn.getAccountInfo(gamePDA);
    if (!info) return null;

    const dv = new DataView(info.data.buffer, info.data.byteOffset);
    // Layout (after 8-byte discriminator):
    // game_id: u64, host: [u8;32], status: u8, round: u8,
    // max_rounds: u8, player_count: u8, max_players: u8,
    // cards_in_pool: u8, winner: [u8;32], commit_count: u8, reveal_count: u8
    const base = 8;
    return {
      gameId:      Number(dv.getBigUint64(base,      true)),
      status:      info.data[base + 8 + 32],
      round:       info.data[base + 8 + 32 + 1],
      maxRounds:   info.data[base + 8 + 32 + 2],
      playerCount: info.data[base + 8 + 32 + 3],
      maxPlayers:  info.data[base + 8 + 32 + 4],
      cardsInPool: info.data[base + 8 + 32 + 5],
      commitCount: info.data[base + 8 + 32 + 5 + 1 + 32],
      revealCount: info.data[base + 8 + 32 + 5 + 1 + 32 + 1],
    };
  } catch (e) {
    console.error('[onchain] readGameAccount failed:', e);
    return null;
  }
}

async function readPlayerState(gameId, playerPubkeyStr) {
  try {
    const conn = getConnection();
    const pk = new solanaWeb3.PublicKey(playerPubkeyStr);
    const [playerPDA] = findPlayerPDA(gameId, pk);
    const info = await conn.getAccountInfo(playerPDA);
    if (!info) return null;

    // Layout (after 8-byte disc): game_id(8) + player(32) + index(1) + area(1)
    // + cards([u8;5]) + card_count(1) + steal(1) + barrier(1) + scout(1)
    // + has_committed(bool=1) + has_revealed(bool=1)
    const base = 8 + 8 + 32 + 1 + 1;
    return {
      area:         info.data[8 + 8 + 32 + 1],
      cards:        Array.from(info.data.slice(base, base + 5)),
      cardCount:    info.data[base + 5],
      stealCount:   info.data[base + 6],
      barrierCount: info.data[base + 7],
      scoutCount:   info.data[base + 8],
      hasCommitted: !!info.data[base + 9],
      hasRevealed:  !!info.data[base + 10],
    };
  } catch (e) {
    console.error('[onchain] readPlayerState failed:', e);
    return null;
  }
}

// ─── Exports ──────────────────────────────────────────────────────────────
window.oxarkOnchain = {
  PROGRAM_ID: PROGRAM_ID_STR,
  // Instructions
  createGame,
  joinGame,
  startGame,
  commitAction,
  revealAction,
  verifyZkProof,
  resolveRound,
  depositStake,
  claimPrize,
  // ZK proof generation (browser-side, requires snarkjs)
  generateZkProof,
  // Helpers
  computeCommitHash,
  generateSalt,
  // Readers
  readGameAccount,
  readPlayerState,
  // PDA finders (exported for UI use)
  findGamePDA,
  findPlayerPDA,
  findStakeVaultPDA,
};

console.log('[0xARK] onchain module loaded. Program:', PROGRAM_ID_STR);

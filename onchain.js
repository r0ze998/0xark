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

function writeU32LE(buf, offset, value) {
  const v = value >>> 0;
  buf[offset]     = v & 0xff;
  buf[offset + 1] = (v >> 8) & 0xff;
  buf[offset + 2] = (v >> 16) & 0xff;
  buf[offset + 3] = (v >> 24) & 0xff;
  return offset + 4;
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

// Write i64 as little-endian 8 bytes (same bit pattern as u64 for two's complement)
function writeI64LE(buf, offset, value) {
  return writeU64LE(buf, offset, BigInt(value) & 0xffffffffffffffffn);
}

function writeBytes(buf, offset, bytes) {
  buf.set(bytes, offset);
  return offset + bytes.length;
}

// ─── Anchor error code mapping ────────────────────────────────────────────
// Custom errors start at 6000 (Anchor default base).
// Map code → human-readable message for UI display.
const ANCHOR_ERRORS = {
  6000: 'Game is not in lobby',
  6001: 'Game is full',
  6002: 'Not enough players to start',
  6003: 'Only the host can perform this action',
  6004: 'Not in commit phase',
  6005: 'Not in reveal phase',
  6006: 'Already committed this round',
  6007: 'Already revealed this round',
  6008: 'Must commit before revealing',
  6009: 'Hash mismatch — action does not match commit',
  6010: 'Invalid action type',
  6011: 'No spells left',
  6012: 'Cannot target yourself',
  6013: 'Card not found in hand',
  6014: 'Card pool is empty',
  6015: 'No cards left in this area',
  6016: 'Players must be in the same area',
  6017: 'Invalid area ID',
  6018: 'Game is already finished',
  6019: 'Round limit reached',
  6020: 'ZK proof is invalid',
};

function parseAnchorError(e) {
  if (!e) return 'Unknown error';
  const msg = e.message ?? String(e);
  // Anchor error format: "custom program error: 0x1770" (0x1770 = 6000 decimal)
  const hexMatch = msg.match(/custom program error: 0x([0-9a-fA-F]+)/);
  if (hexMatch) {
    const code = parseInt(hexMatch[1], 16);
    return ANCHOR_ERRORS[code] ?? `Program error ${code}`;
  }
  // Simulation logs include "Error Code: X. Error Number: Y."
  const codeMatch = msg.match(/Error Number: (\d+)/);
  if (codeMatch) {
    const code = parseInt(codeMatch[1], 10);
    return ANCHOR_ERRORS[code] ?? `Program error ${code}`;
  }
  return msg;
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

// round is a u8; Rust seeds: [COMMIT_SEED, game_id(u64-LE), round(u8, 1 byte), player]
function findCommitPDA(gameId, round, playerPubkey) {
  const roundBytes = new Uint8Array(1);
  roundBytes[0] = round & 0xff;
  return solanaWeb3.PublicKey.findProgramAddressSync(
    [SEED_COMMIT, gameIdBytes(gameId), roundBytes, playerPubkey.toBytes()],
    getProgramId()
  );
}

// Read the current round from the on-chain game account.
// Game struct layout (Anchor 8-byte discriminator + fields):
//   disc(8) + game_id(u64=8) + host(Pubkey=32) + status(u8=1) + round(u8=1) → offset 49
async function readGameRound(gamePDA) {
  try {
    const info = await getConnection().getAccountInfo(gamePDA);
    if (info && info.data.length > 49) {
      return info.data[49]; // round: u8
    }
  } catch (_) {}
  return 0;
}

function findStakeVaultPDA(gameId) {
  return solanaWeb3.PublicKey.findProgramAddressSync(
    [SEED_STAKE_VAULT, gameIdBytes(gameId)],
    getProgramId()
  );
}

function agentIdBytes(agentId) {
  const b = new Uint8Array(4);
  writeU32LE(b, 0, agentId);
  return b;
}

function findAgentPDA(agentId) {
  return solanaWeb3.PublicKey.findProgramAddressSync(
    [ENC.encode('agent'), agentIdBytes(agentId)],
    getProgramId()
  );
}

function seasonIdBytes(seasonId) {
  const b = new Uint8Array(4);
  writeU32LE(b, 0, seasonId);
  return b;
}

function findSeasonPDA(seasonId) {
  return solanaWeb3.PublicKey.findProgramAddressSync(
    [ENC.encode('season'), seasonIdBytes(seasonId)],
    getProgramId()
  );
}

// ─── Compute budget constants ─────────────────────────────────────────────
// Measured on devnet. verify_zk_proof requires the highest budget (BN254 pairing).
// All other instructions use the standard budget.
const COMPUTE_BUDGET = {
  default:        200_000,  // standard instructions (create, join, commit, reveal, resolve)
  verify_zk_proof: 300_000, // Groth16 BN254 on-chain verify
  mint_card_nft:   100_000, // SPL Token + Metaplex CPI
};
// Priority fee in micro-lamports per compute unit.
// 1000 µL/CU ≈ top-of-block on a quiet devnet slot. Adjust upward for mainnet congestion.
const PRIORITY_FEE_MICRO_LAMPORTS = 1_000;

/**
 * Build compute budget instructions for a transaction.
 * Returns [setComputeLimit, setUnitPrice] instructions.
 */
function computeBudgetIxs(computeUnits) {
  // ComputeBudgetProgram.setComputeUnitLimit  — instruction ID 0x02
  const limitData = new Uint8Array(5);
  limitData[0] = 0x02;
  new DataView(limitData.buffer).setUint32(1, computeUnits, true); // little-endian u32
  const limitIx = new solanaWeb3.TransactionInstruction({
    keys: [],
    programId: new solanaWeb3.PublicKey('ComputeBudget111111111111111111111111111111'),
    data: limitData,
  });

  // ComputeBudgetProgram.setComputeUnitPrice — instruction ID 0x03
  const priceData = new Uint8Array(9);
  priceData[0] = 0x03;
  // priority fee as u64 little-endian
  const feeBig = BigInt(PRIORITY_FEE_MICRO_LAMPORTS);
  new DataView(priceData.buffer).setUint32(1, Number(feeBig & 0xffffffffn), true);
  new DataView(priceData.buffer).setUint32(5, Number(feeBig >> 32n), true);
  const priceIx = new solanaWeb3.TransactionInstruction({
    keys: [],
    programId: new solanaWeb3.PublicKey('ComputeBudget111111111111111111111111111111'),
    data: priceData,
  });

  return [limitIx, priceIx];
}

// ─── Transaction builder ──────────────────────────────────────────────────
/**
 * Build a TransactionInstruction and send it via Phantom.
 * Automatically prepends compute-budget instructions for reliable inclusion.
 *
 * @param {Array<{pubkey, isSigner, isWritable}>} keys
 * @param {Uint8Array} data  — 8-byte disc + serialized args
 * @param {number} [computeUnits] — override compute unit limit (default: 200k)
 * @returns {Promise<string>}  transaction signature
 */
async function buildAndSend(keys, data, computeUnits = COMPUTE_BUDGET.default) {
  if (!window.solana || !window.solana.isConnected) {
    throw new Error('Phantom wallet not connected');
  }
  const conn = getConnection();
  const programId = getProgramId();

  const ix = new solanaWeb3.TransactionInstruction({ keys, programId, data });
  const [limitIx, priceIx] = computeBudgetIxs(computeUnits);

  const tx = new solanaWeb3.Transaction();
  tx.add(limitIx, priceIx, ix); // compute budget must come first
  tx.feePayer = window.solana.publicKey;

  const { blockhash, lastValidBlockHeight } = await conn.getLatestBlockhash();
  tx.recentBlockhash = blockhash;

  // ── Preflight simulation: catch program errors before Phantom popup ──────
  // This saves the user from approving a TX that will fail on-chain.
  const sim = await conn.simulateTransaction(tx);
  if (sim.value.err) {
    const logs = sim.value.logs ?? [];
    // Extract Anchor error from logs e.g. "Program log: AnchorError ... Error Number: 6009"
    const logErr = logs.find(l => l.includes('Error Number:') || l.includes('Error Code:'));
    if (logErr) {
      const m = logErr.match(/Error Number: (\d+)/);
      const code = m ? parseInt(m[1], 10) : null;
      const msg = code ? (ANCHOR_ERRORS[code] ?? `Program error ${code}`) : logErr;
      throw new Error(msg);
    }
    throw new Error(JSON.stringify(sim.value.err));
  }

  const signed = await window.solana.signTransaction(tx);
  const sig = await conn.sendRawTransaction(signed.serialize(), {
    skipPreflight: true, // already simulated above
    maxRetries: 5,
  });
  await conn.confirmTransaction({ signature: sig, blockhash, lastValidBlockHeight }, 'confirmed');
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

  // Account order matches CreateGame: game (0), card_pool (1), host/signer (2), system_program (3)
  return buildAndSend([
    { pubkey: gamePDA,     isSigner: false, isWritable: true  }, // game
    { pubkey: cardPoolPDA, isSigner: false, isWritable: true  }, // card_pool
    { pubkey: payer,       isSigner: true,  isWritable: true  }, // host (signer)
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

  // Account order matches JoinGame: game (0), player_state (1), player/signer (2), system_program (3)
  return buildAndSend([
    { pubkey: gamePDA,   isSigner: false, isWritable: true  }, // game
    { pubkey: playerPDA, isSigner: false, isWritable: true  }, // player_state
    { pubkey: payer,     isSigner: true,  isWritable: true  }, // player (signer)
    { pubkey: solanaWeb3.SystemProgram.programId, isSigner: false, isWritable: false },
  ], data);
}

// ─── Instruction: start_game ──────────────────────────────────────────────
async function startGame(gameId) {
  const payer = window.solana.publicKey;
  const [gamePDA]     = findGamePDA(gameId);
  const [cardPoolPDA] = findCardPoolPDA(gameId);

  const d = await disc('start_game');
  const data = new Uint8Array(16);
  let off = writeBytes(data, 0, d);
  writeU64LE(data, off, gameId);

  // Account order matches StartGame: game (0), card_pool (1), host/signer (2)
  // Player PDAs go in remaining_accounts (not named accounts)
  return buildAndSend([
    { pubkey: gamePDA,     isSigner: false, isWritable: true  }, // game
    { pubkey: cardPoolPDA, isSigner: false, isWritable: true  }, // card_pool
    { pubkey: payer,       isSigner: true,  isWritable: false }, // host (signer)
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

  // Must read current round to derive commit PDA — Rust seeds include round
  const round = await readGameRound(gamePDA);
  const [commitPDA] = findCommitPDA(gameId, round, payer);

  // disc(8) + game_id(8) + hash(32) = 48 bytes
  const d = await disc('commit_action');
  const data = new Uint8Array(48);
  let off = writeBytes(data, 0, d);
  off = writeU64LE(data, off, gameId);
  writeBytes(data, off, hash);

  // Account order MUST match CommitActionCtx field order:
  //   game (0), player_state (1), commit (2), player/signer (3), system_program (4)
  return buildAndSend([
    { pubkey: gamePDA,   isSigner: false, isWritable: true  }, // game
    { pubkey: playerPDA, isSigner: false, isWritable: true  }, // player_state
    { pubkey: commitPDA, isSigner: false, isWritable: true  }, // commit (init)
    { pubkey: payer,     isSigner: true,  isWritable: true  }, // player (signer + payer)
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

  // Must use same round as the commit — read from game account
  const round = await readGameRound(gamePDA);
  const [commitPDA] = findCommitPDA(gameId, round, payer);

  // disc(8) + game_id(8) + action_type(1) + target(32) + salt(32) = 81 bytes
  const d = await disc('reveal_action');
  const data = new Uint8Array(81);
  let off = writeBytes(data, 0, d);
  off = writeU64LE(data, off, gameId);
  off = writeU8(data, off, actionType);
  off = writeBytes(data, off, target.toBytes());
  writeBytes(data, off, salt);

  // Account order MUST match RevealActionCtx field order:
  //   game (0), player_state (1), commit (2, readonly), player/signer (3, readonly)
  return buildAndSend([
    { pubkey: gamePDA,   isSigner: false, isWritable: true  }, // game
    { pubkey: playerPDA, isSigner: false, isWritable: true  }, // player_state
    { pubkey: commitPDA, isSigner: false, isWritable: false }, // commit (readonly)
    { pubkey: payer,     isSigner: true,  isWritable: false }, // player (signer)
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
  const [gamePDA]   = findGamePDA(gameId);
  const [playerPDA] = findPlayerPDA(gameId, payer);

  // disc(8) + game_id(8) + proof_a(64) + proof_b(128) + proof_c(64) + public_inputs(32) = 304
  const d    = await disc('verify_zk_proof');
  const data = new Uint8Array(304);
  let off = writeBytes(data, 0, d);
  off = writeU64LE(data, off, gameId);
  off = writeBytes(data, off, proofA);
  off = writeBytes(data, off, proofB);
  off = writeBytes(data, off, proofC);
  writeBytes(data, off, publicInputs);

  // Account order matches VerifyZkProof Anchor struct: game (0), player_state (1), player/signer (2)
  return buildAndSend([
    { pubkey: gamePDA,   isSigner: false, isWritable: false }, // game
    { pubkey: playerPDA, isSigner: false, isWritable: false }, // player_state
    { pubkey: payer,     isSigner: true,  isWritable: false }, // player (signer)
  ], data, COMPUTE_BUDGET.verify_zk_proof);
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

  // Resolve paths relative to the page's base (handles GitHub Pages /0xark/ prefix)
  const base = (document.querySelector('base')?.href ?? window.location.origin + '/');
  const basePath = new URL('.', base).pathname;
  const wasmPath = basePath + 'zk/build/commit_reveal_js/commit_reveal.wasm';
  const zkeyPath = basePath + 'zk/build/commit_reveal_final.zkey';

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

  // Account order MUST match Anchor struct ResolveRound field order:
  //   game (0), card_pool (1), caller/signer (2), remaining_accounts (player PDAs)
  const keys = [
    { pubkey: gamePDA,     isSigner: false, isWritable: true  }, // game
    { pubkey: cardPoolPDA, isSigner: false, isWritable: true  }, // card_pool
    { pubkey: payer,       isSigner: true,  isWritable: false }, // caller (signer)
  ];

  // Append each player PDA as remaining_accounts (writable for state updates)
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

  // Account order matches DepositStake: game (0, readonly), stake_vault (1), player/signer (2), system_program (3)
  return buildAndSend([
    { pubkey: gamePDA,       isSigner: false, isWritable: false }, // game (readonly — no mut in Rust struct)
    { pubkey: stakeVaultPDA, isSigner: false, isWritable: true  }, // stake_vault (init)
    { pubkey: payer,         isSigner: true,  isWritable: true  }, // player (signer + payer)
    { pubkey: solanaWeb3.SystemProgram.programId, isSigner: false, isWritable: false },
  ], data);
}

// ─── Instruction: claim_prize ─────────────────────────────────────────────
async function claimPrize(gameId) {
  const payer = window.solana.publicKey;
  const [gamePDA]       = findGamePDA(gameId);
  const [stakeVaultPDA] = findStakeVaultPDA(gameId);

  const d = await disc('claim_prize');
  const data = new Uint8Array(16);
  let off = writeBytes(data, 0, d);
  writeU64LE(data, off, gameId);

  // Account order matches ClaimPrize: game (0, readonly), stake_vault (1), player/signer (2), system_program (3)
  return buildAndSend([
    { pubkey: gamePDA,       isSigner: false, isWritable: false }, // game (readonly — no mut in Rust struct)
    { pubkey: stakeVaultPDA, isSigner: false, isWritable: true  }, // stake_vault
    { pubkey: payer,         isSigner: true,  isWritable: true  }, // player (signer + winner)
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

// ─── Instruction: register_agent ─────────────────────────────────────────────
/**
 * Register an AI agent in the on-chain agent marketplace.
 * @param {number}   agentId          — u32 unique agent identifier
 * @param {Uint8Array} nameHash       — SHA256 of agent name (32 bytes)
 * @param {Uint8Array} strategyHash   — SHA256 of strategy description (32 bytes)
 * @param {Uint8Array} endpointHash   — SHA256 of x402 endpoint URL (32 bytes)
 * @param {number}   pricePerQuery    — lamports per intel query
 */
async function registerAgent(agentId, nameHash, strategyHash, endpointHash, pricePerQuery) {
  const owner = window.solana.publicKey;
  const [agentPDA] = findAgentPDA(agentId);

  // disc(8) + agent_id(4) + name_hash(32) + strategy_hash(32) + endpoint_hash(32) + price_per_query(8)
  const d = await disc('register_agent');
  const data = new Uint8Array(116);
  let off = writeBytes(data, 0, d);
  off = writeU32LE(data, off, agentId);
  off = writeBytes(data, off, nameHash);
  off = writeBytes(data, off, strategyHash);
  off = writeBytes(data, off, endpointHash);
  writeU64LE(data, off, pricePerQuery);

  return buildAndSend([
    { pubkey: agentPDA, isSigner: false, isWritable: true  },
    { pubkey: owner,    isSigner: true,  isWritable: true  },
    { pubkey: solanaWeb3.SystemProgram.programId, isSigner: false, isWritable: false },
  ], data);
}

// ─── Instruction: deactivate_agent ────────────────────────────────────────────
async function deactivateAgent(agentId) {
  const owner = window.solana.publicKey;
  const [agentPDA] = findAgentPDA(agentId);

  // disc(8) + agent_id(4)
  const d = await disc('deactivate_agent');
  const data = new Uint8Array(12);
  let off = writeBytes(data, 0, d);
  writeU32LE(data, off, agentId);

  return buildAndSend([
    { pubkey: agentPDA, isSigner: false, isWritable: true },
    { pubkey: owner,    isSigner: true,  isWritable: false },
  ], data);
}

// ─── Instruction: create_season ───────────────────────────────────────────────
/**
 * @param {number} seasonId
 * @param {number} entryFee          — lamports
 * @param {number} maxPlayers
 * @param {number} durationSeconds   — season length in seconds
 */
async function createSeason(seasonId, entryFee, maxPlayers, durationSeconds) {
  const authority = window.solana.publicKey;
  const [seasonPDA] = findSeasonPDA(seasonId);

  // disc(8) + season_id(4) + entry_fee(8) + max_players(4) + duration_seconds(8)
  const d = await disc('create_season');
  const data = new Uint8Array(32);
  let off = writeBytes(data, 0, d);
  off = writeU32LE(data, off, seasonId);
  off = writeU64LE(data, off, entryFee);
  off = writeU32LE(data, off, maxPlayers);
  writeI64LE(data, off, durationSeconds);

  return buildAndSend([
    { pubkey: seasonPDA,  isSigner: false, isWritable: true  },
    { pubkey: authority,  isSigner: true,  isWritable: true  },
    { pubkey: solanaWeb3.SystemProgram.programId, isSigner: false, isWritable: false },
  ], data);
}

// ─── Instruction: end_season ──────────────────────────────────────────────────
async function endSeason(seasonId) {
  const authority = window.solana.publicKey;
  const [seasonPDA] = findSeasonPDA(seasonId);

  // disc(8) + season_id(4)
  const d = await disc('end_season');
  const data = new Uint8Array(12);
  let off = writeBytes(data, 0, d);
  writeU32LE(data, off, seasonId);

  return buildAndSend([
    { pubkey: seasonPDA, isSigner: false, isWritable: true },
    { pubkey: authority, isSigner: true,  isWritable: false },
  ], data);
}

// ─── Account reader: agent listing ────────────────────────────────────────────
async function readAgentListing(agentId) {
  try {
    const conn = getConnection();
    const [agentPDA] = findAgentPDA(agentId);
    const info = await conn.getAccountInfo(agentPDA);
    if (!info) return null;

    // Layout after 8-byte disc:
    // agent_id(4) + owner(32) + name_hash(32) + strategy_hash(32) + endpoint_hash(32)
    // + price_per_query(8) + total_queries(8) + total_revenue(8) + rating(2) + active(1) + bump(1)
    const dv = new DataView(info.data.buffer, info.data.byteOffset);
    let off = 8; // skip discriminator
    const agentIdRead = dv.getUint32(off, true); off += 4;
    const owner = new solanaWeb3.PublicKey(info.data.slice(off, off + 32)); off += 32;
    const nameHash     = Array.from(info.data.slice(off, off + 32)); off += 32;
    const strategyHash = Array.from(info.data.slice(off, off + 32)); off += 32;
    const endpointHash = Array.from(info.data.slice(off, off + 32)); off += 32;
    const pricePerQuery  = Number(dv.getBigUint64(off, true)); off += 8;
    const totalQueries   = Number(dv.getBigUint64(off, true)); off += 8;
    const totalRevenue   = Number(dv.getBigUint64(off, true)); off += 8;
    const rating         = dv.getUint16(off, true); off += 2;
    const active         = !!info.data[off]; off += 1;

    return {
      agentId: agentIdRead, owner: owner.toBase58(),
      nameHash, strategyHash, endpointHash,
      pricePerQuery, totalQueries, totalRevenue,
      rating: rating / 100, // e.g. 500 → 5.00
      active,
    };
  } catch (e) {
    console.error('[onchain] readAgentListing failed:', e);
    return null;
  }
}

// ─── Account reader: season ────────────────────────────────────────────────────
async function readSeason(seasonId) {
  try {
    const conn = getConnection();
    const [seasonPDA] = findSeasonPDA(seasonId);
    const info = await conn.getAccountInfo(seasonPDA);
    if (!info) return null;

    // Layout after 8-byte disc:
    // season_id(4) + authority(32) + entry_fee(8) + prize_pool(8) + player_count(4)
    // + max_players(4) + status(1) + winner(32) + winner_time(8) + fastest_clear_rounds(1)
    // + season_start(8) + season_end(8) + bump(1)
    const dv = new DataView(info.data.buffer, info.data.byteOffset);
    let off = 8;
    const seasonIdRead   = dv.getUint32(off, true); off += 4;
    const authority      = new solanaWeb3.PublicKey(info.data.slice(off, off + 32)); off += 32;
    const entryFee       = Number(dv.getBigUint64(off, true)); off += 8;
    const prizePool      = Number(dv.getBigUint64(off, true)); off += 8;
    const playerCount    = dv.getUint32(off, true); off += 4;
    const maxPlayers     = dv.getUint32(off, true); off += 4;
    const status         = info.data[off]; off += 1;
    const winner         = new solanaWeb3.PublicKey(info.data.slice(off, off + 32)); off += 32;
    const winnerTime     = Number(dv.getBigInt64(off, true)); off += 8;
    const fastestClear   = info.data[off]; off += 1;
    const seasonStart    = Number(dv.getBigInt64(off, true)); off += 8;
    const seasonEnd      = Number(dv.getBigInt64(off, true));

    return {
      seasonId: seasonIdRead,
      authority: authority.toBase58(),
      entryFee, prizePool, playerCount, maxPlayers,
      status: ['Open', 'Active', 'Ended'][status] ?? status,
      winner: winner.toBase58(),
      winnerTime, fastestClear, seasonStart, seasonEnd,
    };
  } catch (e) {
    console.error('[onchain] readSeason failed:', e);
    return null;
  }
}

// ─── NFT Minting (mint_solo_card + Metaplex Token Metadata) ─────────────────
// Each card (1-60) is a real Solana NFT:
//   • SPL Token mint with decimals=0, supply=1
//   • Metaplex Token Metadata with name / symbol / off-chain JSON uri
//   • Mint authority burned atomically → provably 1-of-1
// Three instructions are bundled into one atomic transaction:
//   1. mint_solo_card (Anchor) — creates PDA mint + ATA, mints 1 token
//   2. create_metadata_accounts_v3 (Metaplex) — attaches name/symbol/uri on-chain
//   3. set_authority (SPL Token) — burns mint authority → permanently 1-of-1

const SOLO_CARD_SEED              = ENC.encode('solo_card');
const SPL_TOKEN_PROGRAM_ID        = 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA';
const ASSOCIATED_TOKEN_PROGRAM_ID = 'ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJe1bx';
const SYSVAR_RENT_PUBKEY          = 'SysvarRent111111111111111111111111111111111';
const TOKEN_METADATA_PROGRAM_ID   = 'metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s';

// Display names for cards 1-60 (index 0 = card_id 1)
const NFT_CARD_NAMES = [
  'AEGIS','UMBRA','IGNIS','STRIKE','SLASH','IMPALE','CRUSH','FLURRY','BERSERK','VENOM','REAPER','VOIDBLADE',
  'GUARD','PARRY','IRON WALL','COUNTER','AEGIS WARD','MIRROR','FORTRESS','CRYSTAL','NULLIFY','ABS GUARD','SANCTUARY','TITAN',
  'DASH','RETREAT','SMOKE','PHASE','BLINK','SHADOW','WINDASH','PHANTOM','VOIDSTEP','TIMESKIP','ARK GATE','GENESIS',
  'TEMPEST','NIHIL','SPARK','FROST','BLAZE','STATIC','INFERNO','BLIZZARD','THUNDER','MAELSTROM','GRAVITY','SINGULARITY',
  'MEND','REST','POTION','BANDAGE','REJUVEN','WARD','LIFEDRAIN','PHOENIX','ELIXIR','HOLY LIGHT','GEN PULSE','ARK BLESS',
];

function findSoloCardMintPDA(playerPubkey, cardId) {
  return solanaWeb3.PublicKey.findProgramAddressSync(
    [SOLO_CARD_SEED, playerPubkey.toBytes(), new Uint8Array([cardId])],
    getProgramId()
  );
}

function findAssociatedTokenAddress(ownerPubkey, mintPubkey) {
  return solanaWeb3.PublicKey.findProgramAddressSync(
    [
      ownerPubkey.toBytes(),
      new solanaWeb3.PublicKey(SPL_TOKEN_PROGRAM_ID).toBytes(),
      mintPubkey.toBytes(),
    ],
    new solanaWeb3.PublicKey(ASSOCIATED_TOKEN_PROGRAM_ID)
  );
}

// PDA: ["metadata", TOKEN_METADATA_PROGRAM_ID, mint]
function findMetadataPDA(mintPubkey) {
  const metaProgram = new solanaWeb3.PublicKey(TOKEN_METADATA_PROGRAM_ID);
  return solanaWeb3.PublicKey.findProgramAddressSync(
    [ENC.encode('metadata'), metaProgram.toBytes(), mintPubkey.toBytes()],
    metaProgram
  );
}

// Borsh-encode CreateMetadataAccountsV3 instruction data (discriminant = 33)
function encodeCreateMetadataV3(name, symbol, uri, sellerFeeBasisPoints) {
  const nameB   = ENC.encode(name);
  const symbolB = ENC.encode(symbol);
  const uriB    = ENC.encode(uri);
  // 1(disc) + 4+N + 4+M + 4+L + 2(fee) + 1(creators:None) + 1(coll:None) + 1(uses:None) + 1(is_mutable) + 1(coll_details:None)
  const buf = new Uint8Array(1 + 4 + nameB.length + 4 + symbolB.length + 4 + uriB.length + 2 + 5);
  let o = 0;
  buf[o++] = 33;                        // CreateMetadataAccountsV3 discriminant
  o = writeU32LE(buf, o, nameB.length); buf.set(nameB, o); o += nameB.length;
  o = writeU32LE(buf, o, symbolB.length); buf.set(symbolB, o); o += symbolB.length;
  o = writeU32LE(buf, o, uriB.length); buf.set(uriB, o); o += uriB.length;
  buf[o++] = sellerFeeBasisPoints & 0xff;
  buf[o++] = (sellerFeeBasisPoints >> 8) & 0xff;
  buf[o++] = 0; // creators: None
  buf[o++] = 0; // collection: None
  buf[o++] = 0; // uses: None
  buf[o++] = 1; // is_mutable: true
  buf[o++] = 0; // collection_details: None
  return buf;
}

/**
 * Mint a card as a proper Solana NFT with on-chain Metaplex metadata.
 * Sends ONE atomic transaction with three instructions:
 *   1. mint_solo_card (Anchor) — init PDA mint (authority=player), create ATA, mint 1 token
 *   2. create_metadata_accounts_v3 (Metaplex) — attach name/symbol/uri to mint
 *   3. set_authority (SPL Token) — burn mint authority → provably 1-of-1
 */
async function mintCardWithMetadata(cardId) {
  if (!window.solana?.isConnected) throw new Error('Phantom not connected');
  const player        = window.solana.publicKey;
  const splToken      = new solanaWeb3.PublicKey(SPL_TOKEN_PROGRAM_ID);
  const assocToken    = new solanaWeb3.PublicKey(ASSOCIATED_TOKEN_PROGRAM_ID);
  const metaProgram   = new solanaWeb3.PublicKey(TOKEN_METADATA_PROGRAM_ID);
  const sysProgram    = solanaWeb3.SystemProgram.programId;
  const rent          = new solanaWeb3.PublicKey(SYSVAR_RENT_PUBKEY);

  const [mintPDA]     = findSoloCardMintPDA(player, cardId);
  const [playerATA]   = findAssociatedTokenAddress(player, mintPDA);
  const [metadataPDA] = findMetadataPDA(mintPDA);

  const cardName = `0xARK #${String(cardId).padStart(3, '0')} \u2014 ${NFT_CARD_NAMES[cardId - 1] || ''}`;
  const metaUri  = `https://r0ze998.github.io/0xark/nft/card/${cardId}.json`;

  // ── Ix 1: mint_solo_card (Anchor) ────────────────────────────────────────
  const anchorDisc = await disc('mint_solo_card');
  const anchorData = new Uint8Array(9);
  writeBytes(anchorData, 0, anchorDisc);
  anchorData[8] = cardId & 0xff;

  const mintIx = new solanaWeb3.TransactionInstruction({
    programId: getProgramId(),
    keys: [
      { pubkey: mintPDA,    isSigner: false, isWritable: true  },
      { pubkey: playerATA,  isSigner: false, isWritable: true  },
      { pubkey: player,     isSigner: true,  isWritable: true  },
      { pubkey: splToken,   isSigner: false, isWritable: false },
      { pubkey: assocToken, isSigner: false, isWritable: false },
      { pubkey: sysProgram, isSigner: false, isWritable: false },
      { pubkey: rent,       isSigner: false, isWritable: false },
    ],
    data: anchorData,
  });

  // ── Ix 2: create_metadata_accounts_v3 (Metaplex) ────────────────────────
  const metaIx = new solanaWeb3.TransactionInstruction({
    programId: metaProgram,
    keys: [
      { pubkey: metadataPDA, isSigner: false, isWritable: true  }, // metadata PDA (created)
      { pubkey: mintPDA,     isSigner: false, isWritable: false }, // mint
      { pubkey: player,      isSigner: true,  isWritable: false }, // mint authority
      { pubkey: player,      isSigner: true,  isWritable: true  }, // payer
      { pubkey: player,      isSigner: false, isWritable: false }, // update authority
      { pubkey: sysProgram,  isSigner: false, isWritable: false },
      { pubkey: rent,        isSigner: false, isWritable: false }, // optional but safe to include
    ],
    data: encodeCreateMetadataV3(cardName, '0xARK', metaUri, 500 /* 5% royalty */),
  });

  // ── Ix 3: set_authority → None (burn mint authority) ─────────────────────
  // SPL Token SetAuthority layout: [6, authority_type(1byte), COption(1+32bytes)]
  const burnData = new Uint8Array(35);
  burnData[0] = 6; // SetAuthority instruction
  burnData[1] = 0; // MintTokens authority type
  burnData[2] = 0; // COption::None (no new authority → burned permanently)

  const burnIx = new solanaWeb3.TransactionInstruction({
    programId: splToken,
    keys: [
      { pubkey: mintPDA, isSigner: false, isWritable: true  }, // mint
      { pubkey: player,  isSigner: true,  isWritable: false }, // current authority
    ],
    data: burnData,
  });

  // ── Build single atomic transaction ──────────────────────────────────────
  const conn = getConnection();
  const { blockhash, lastValidBlockHeight } = await conn.getLatestBlockhash();
  const [limitIx, priceIx] = computeBudgetIxs(200_000); // mint + metaplex + burn

  const tx = new solanaWeb3.Transaction();
  tx.add(limitIx, priceIx, mintIx, metaIx, burnIx);
  tx.feePayer       = player;
  tx.recentBlockhash = blockhash;

  const sim = await conn.simulateTransaction(tx);
  if (sim.value.err) {
    const logs = sim.value.logs ?? [];
    const logErr = logs.find(l => l.includes('Error Number:') || l.includes('Error Code:'));
    if (logErr) {
      const m = logErr.match(/Error Number: (\d+)/);
      const code = m ? parseInt(m[1], 10) : null;
      throw new Error(code ? (ANCHOR_ERRORS[code] ?? `Program error ${code}`) : logErr);
    }
    throw new Error(JSON.stringify(sim.value.err));
  }

  const signed = await window.solana.signTransaction(tx);
  const sig = await conn.sendRawTransaction(signed.serialize(), { skipPreflight: true, maxRetries: 5 });
  await conn.confirmTransaction({ signature: sig, blockhash, lastValidBlockHeight }, 'confirmed');
  return sig;
}

// ─── Session Keys (stub — Q2 2026) ───────────────────────────────────────────
// Currently every battle action requires a Phantom popup.
// Session Keys eliminate per-action popups: the player signs once to authorize
// an ephemeral keypair, which then signs all in-session TXs automatically.
//
// Pattern (not yet implemented — see docs/magicblock-migration.md):
//
//   const sessionKey = await initSessionKey();
//   // sessionKey.keypair signs subsequent battle TXs without Phantom popup
//   // Revoked on tab close or explicit session.revoke()
//
// Dependencies needed:
//   @magicblock-labs/ephemeral-rollups-sdk  (or Privy embedded wallet)
//
// Until implemented, all actions route through buildAndSend() → Phantom popup.
//
// ─────────────────────────────────────────────────────────────────────────────

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
  // Core game instructions
  createGame,
  joinGame,
  startGame,
  commitAction,
  revealAction,
  verifyZkProof,
  resolveRound,
  depositStake,
  claimPrize,
  // Agent registry instructions
  registerAgent,
  deactivateAgent,
  // Season instructions
  createSeason,
  endSeason,
  // NFT minting (mint + Metaplex metadata + burn authority — one atomic tx)
  mintCardWithMetadata,
  // ZK proof generation (browser-side, requires snarkjs)
  generateZkProof,
  // Helpers
  computeCommitHash,
  generateSalt,
  parseAnchorError,
  // Account readers
  readGameAccount,
  readPlayerState,
  readAgentListing,
  readSeason,
  // PDA finders (exported for React UI)
  findGamePDA,
  findPlayerPDA,
  findAgentPDA,
  findSeasonPDA,
  findStakeVaultPDA,
};

console.log('[0xARK] onchain module loaded. Program:', PROGRAM_ID_STR);

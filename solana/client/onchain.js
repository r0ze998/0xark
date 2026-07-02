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

// ════ INFRASTRUCTURE ════

const PROGRAM_ID_STR       = '5i37jWBiA7bV9XmokyDWHQxjJ5s1sBnSEkPSB4J2XfmN';
const CARDS_PROGRAM_ID_STR = '236FNPRbJr5W7qeV9fJCYsxDEkruSK6fnNAipf47Mq1S';
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

// ─── MagicBlock ER mode flag ──────────────────────────────────────────────
// When true, commitAction/revealAction route through the Magic Router
// (window.oxarkMB.sendViaMagicRouter) instead of the base-layer connection.
// Toggle via oxarkOnchain.setMagicBlockMode(true/false).
// Requires window.oxarkMB to be loaded (01-magicblock.js).
let _mbMode = false;
function setMagicBlockMode(enabled) { _mbMode = !!enabled; }

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

function writeU16LE(buf, offset, value) {
  const v = value & 0xffff;
  buf[offset]     = v & 0xff;
  buf[offset + 1] = (v >> 8) & 0xff;
  return offset + 2;
}

function writeBool(buf, offset, value) {
  buf[offset] = value ? 1 : 0;
  return offset + 1;
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
  6021: 'Wrong magic program address',
  6022: 'Wrong magic context address',
  6023: 'Wrong game account (PDA mismatch)',
  6024: 'Wrong player_state account (PDA mismatch)',
  6025: 'Wrong delegation program address',
  6026: 'Wrong owner program address',
  6027: 'Position commitment already initialized',
  6028: 'Position commitment mismatch',
  6029: 'Agent is not active',
  6030: 'Duration must be > 0 seconds',
  6031: 'Invalid deck composition',
  6032: 'Deck is locked',
  6033: 'Tier locked',
  6034: 'Player is already in a matchmaking queue',
  6035: 'Player is not in this queue',
  6036: 'Matchmaking queue is full',
  6037: 'Duel ID mismatch',
  6038: 'Round mismatch',
  6039: 'Caller is not a duel participant',
  6040: 'Hand commitment not set',
  6041: 'Hand already revealed',
  6042: 'Duel is already over',
  6043: 'Poseidon hash computation failed',
  6044: 'Invalid state for this operation',
  6045: 'Legendary supply cap reached',
  6046: 'No pending Legendary claim',
  6047: 'Season has not ended',
  6048: 'Legendary cards cannot be burned',
  6049: 'Rare cards require conditional burn',
  6050: 'Evolve parents must be Common rarity',
  6051: 'Evolve target must be Uncommon rarity',
  6052: 'Stat imprint limit reached',
  6053: 'Starter cards are protected from steal',
  6054: 'Permanent steal requires Gold Hall',
  6055: 'Legendary requires Legendary Steal',
  6056: 'Legendary requires Gold Hall tier',
  6057: 'Season stats already initialized',
  6058: 'No active lease to return',
  6059: 'Lease has not expired',
  6060: 'Caller is not the authorized admin',
  6061: 'Waitlist registration is closed',
  6062: 'Player already registered',
  6063: 'Game is not active',
  6064: 'Game has not ended',
  6065: 'Player not registered',
  6066: 'No prize to claim',
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

// ─── Phase 18: new PDA finders ────────────────────────────────────────────

function findPlayerStatePDA(playerPubkey) {
  return solanaWeb3.PublicKey.findProgramAddressSync(
    [ENC.encode('player'), playerPubkey.toBytes()],
    getProgramId()
  );
}

function findGameWorldPDA() {
  return solanaWeb3.PublicKey.findProgramAddressSync(
    [ENC.encode('game_world')],
    getProgramId()
  );
}

// YKK-38: the prize pool is the PDA seeds=[b"prize_pool"]. claim_prize_v2 pays out
// from it via invoke_signed, and deposits (register_waitlist / buy_pack) land here.
function findPrizePoolPDA() {
  return solanaWeb3.PublicKey.findProgramAddressSync(
    [ENC.encode('prize_pool')],
    getProgramId()
  );
}

function findCardBattleHistoryPDA(cardMintPubkey) {
  return solanaWeb3.PublicKey.findProgramAddressSync(
    [ENC.encode('card_battle_history'), cardMintPubkey.toBytes()],
    getProgramId()
  );
}

// CardMintRecord PDA — on-chain rarity source (C5 / YKK-32).
function findCardMintRecordPDA(cardMintPubkey) {
  return solanaWeb3.PublicKey.findProgramAddressSync(
    [ENC.encode('card_mint_record'), cardMintPubkey.toBytes()],
    getProgramId()
  );
}

function findSeasonStatsPDA(createdAtI64) {
  const b = new Uint8Array(8);
  writeI64LE(b, 0, createdAtI64);
  return solanaWeb3.PublicKey.findProgramAddressSync(
    [ENC.encode('season_stats'), b],
    getProgramId()
  );
}

// Read created_at (i64 LE) from CardBattleHistory account.
// Layout: disc(8) + card_mint(32) + wins(4) + losses(4) + kos(4) + dmg_dealt(8) +
//         times_summoned(4) + owners_history(320) + owners_history_len(1) +
//         owners_dropped_count(4) + acquisition_source(1) + current_owner_since(8) → created_at at 398
async function readCardBattleHistoryCreatedAt(cardMintStr) {
  try {
    const mint = new solanaWeb3.PublicKey(cardMintStr);
    const [histPDA] = findCardBattleHistoryPDA(mint);
    const info = await getConnection().getAccountInfo(histPDA);
    if (info && info.data.length >= 406) {
      const dv = new DataView(info.data.buffer, info.data.byteOffset);
      return dv.getBigInt64(398, true);
    }
  } catch (_) {}
  return 0n;
}

// ─── Compute budget constants ─────────────────────────────────────────────
// Measured on devnet. verify_zk_proof requires the highest budget (BN254 pairing).
// All other instructions use the standard budget.
const COMPUTE_BUDGET = {
  default:        200_000,  // standard instructions (create, join, commit, reveal, resolve)
  verify_zk_proof: 300_000, // Groth16 BN254 on-chain verify
  mint_card_nft:   100_000, // SPL Token + Metaplex CPI
  init_duel:        50_000, // DuelState PDA init
  commit_hand:     300_000, // Groth16 BN254 hand commitment verify
  reveal_hand:     100_000, // Poseidon(15) hash + optional damage_calc on round 5
};
// Priority fee in micro-lamports per compute unit.
// 1000 µL/CU ≈ top-of-block on a quiet devnet slot. Adjust upward for mainnet congestion.
const PRIORITY_FEE_MICRO_LAMPORTS = 1_000;

// ComputeBudgetProgram.requestHeapFrame — instruction ID 0x01, u32 LE bytes.
// YKK-40: the program is built with `default = ["custom-heap"]`, which disables
// the default allocator and assumes a 256KB heap — so EVERY instruction (not just
// reveal_hand) needs this frame, else the program faults on its first heap alloc
// ("Access violation in heap section", ~331 CU; verified on a local validator).
const HEAP_FRAME_BYTES = 262144; // 256KB — must match the program's custom-heap size
function requestHeapFrameIx(heapBytes) {
  const data = new Uint8Array(5);
  data[0] = 0x01;
  new DataView(data.buffer).setUint32(1, heapBytes, true);
  return new solanaWeb3.TransactionInstruction({
    keys: [],
    programId: new solanaWeb3.PublicKey('ComputeBudget111111111111111111111111111111'),
    data,
  });
}

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
  const heapIx = requestHeapFrameIx(HEAP_FRAME_BYTES); // YKK-40: custom-heap needs this on every tx
  const [limitIx, priceIx] = computeBudgetIxs(computeUnits);

  const tx = new solanaWeb3.Transaction();
  tx.add(heapIx, limitIx, priceIx, ix); // compute budget (heap + limit + price) must come first
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

// buildAndSend for SEVERAL program instructions in one transaction (single
// Phantom approval). Same heap/compute-budget prelude and preflight simulation.
// Used by settleDuelHistory to pack per-card settle instructions together.
async function buildAndSendMulti(ixSpecs, computeUnits = COMPUTE_BUDGET.default) {
  if (!window.solana || !window.solana.isConnected) {
    throw new Error('Phantom wallet not connected');
  }
  const conn = getConnection();
  const programId = getProgramId();

  const heapIx = requestHeapFrameIx(HEAP_FRAME_BYTES); // YKK-40: custom-heap needs this on every tx
  const [limitIx, priceIx] = computeBudgetIxs(computeUnits);

  const tx = new solanaWeb3.Transaction();
  tx.add(heapIx, limitIx, priceIx);
  for (const { keys, data } of ixSpecs) {
    tx.add(new solanaWeb3.TransactionInstruction({ keys, programId, data }));
  }
  tx.feePayer = window.solana.publicKey;

  const { blockhash, lastValidBlockHeight } = await conn.getLatestBlockhash();
  tx.recentBlockhash = blockhash;

  const sim = await conn.simulateTransaction(tx);
  if (sim.value.err) {
    const logs = sim.value.logs ?? [];
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
    skipPreflight: true,
    maxRetries: 5,
  });
  await conn.confirmTransaction({ signature: sig, blockhash, lastValidBlockHeight }, 'confirmed');
  return sig;
}

// ─── Magic Router transaction builder ────────────────────────────────────
// Replaces buildAndSend for commitAction/revealAction when _mbMode is true.
// Key differences vs buildAndSend:
//   • Uses Magic Router's getBlockhashForAccounts (routes to ER if delegated)
//   • Skips preflight simulation — ER handles validation; simulating against
//     base-layer state gives incorrect results for delegated accounts
//   • Sends via Magic Router connection (auto-selects ER or base layer)
//   • No maxRetries — ER confirms faster; caller can retry on timeout
async function buildAndSendViaMagicRouter(keys, data, computeUnits = COMPUTE_BUDGET.default) {
  if (!window.solana || !window.solana.isConnected) {
    throw new Error('Phantom wallet not connected');
  }
  if (!window.oxarkMB) {
    throw new Error('[MagicBlock] window.oxarkMB not loaded — ensure 01-magicblock.js is bundled');
  }
  const programId = getProgramId();
  const ix = new solanaWeb3.TransactionInstruction({ keys, programId, data });
  const heapIx = requestHeapFrameIx(HEAP_FRAME_BYTES); // YKK-40: custom-heap needs this on every tx
  const [limitIx, priceIx] = computeBudgetIxs(computeUnits);

  const tx = new solanaWeb3.Transaction();
  tx.add(heapIx, limitIx, priceIx, ix);
  tx.feePayer = window.solana.publicKey;

  // Use Magic Router's account-aware blockhash (routes to ER if accounts are delegated)
  const writableAccts = window.oxarkMB.getWritableAccounts(tx);
  const bh = await window.oxarkMB.getBlockhashForAccounts(writableAccts);
  tx.recentBlockhash = bh.blockhash;
  tx.lastValidBlockHeight = bh.lastValidBlockHeight;

  const signed = await window.solana.signTransaction(tx);
  const mbConn = window.oxarkMB.getConnection();
  const sig = await mbConn.sendRawTransaction(signed.serialize(), { skipPreflight: true });
  await mbConn.confirmTransaction(
    { signature: sig, blockhash: bh.blockhash, lastValidBlockHeight: bh.lastValidBlockHeight },
    'confirmed'
  );
  return sig;
}

// ════ OXARK PROGRAM — CORE GAME ════

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
/**
 * @param {number}   gameId
 * @param {string[]} playerPubkeyStrs  — base58 pubkeys of players to distribute starter cards
 *                                       passed as remaining_accounts so Rust can init their hands
 */
async function startGame(gameId, playerPubkeyStrs = []) {
  const payer = window.solana.publicKey;
  const [gamePDA]     = findGamePDA(gameId);
  const [cardPoolPDA] = findCardPoolPDA(gameId);

  const d = await disc('start_game');
  const data = new Uint8Array(16);
  let off = writeBytes(data, 0, d);
  writeU64LE(data, off, gameId);

  // Account order matches StartGame: game (0), card_pool (1), host/signer (2)
  // Player PDAs are remaining_accounts — appended after named accounts
  const keys = [
    { pubkey: gamePDA,     isSigner: false, isWritable: true  }, // game
    { pubkey: cardPoolPDA, isSigner: false, isWritable: true  }, // card_pool
    { pubkey: payer,       isSigner: true,  isWritable: false }, // host (signer)
  ];
  for (const pkStr of playerPubkeyStrs) {
    const pk = new solanaWeb3.PublicKey(pkStr);
    const [playerPDA] = findPlayerPDA(gameId, pk);
    keys.push({ pubkey: playerPDA, isSigner: false, isWritable: true });
  }
  return buildAndSend(keys, data);
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
  const accts = [
    { pubkey: gamePDA,   isSigner: false, isWritable: true  }, // game
    { pubkey: playerPDA, isSigner: false, isWritable: true  }, // player_state
    { pubkey: commitPDA, isSigner: false, isWritable: true  }, // commit (init)
    { pubkey: payer,     isSigner: true,  isWritable: true  }, // player (signer + payer)
    { pubkey: solanaWeb3.SystemProgram.programId, isSigner: false, isWritable: false },
  ];
  return _mbMode ? buildAndSendViaMagicRouter(accts, data) : buildAndSend(accts, data);
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
  const accts = [
    { pubkey: gamePDA,   isSigner: false, isWritable: true  }, // game
    { pubkey: playerPDA, isSigner: false, isWritable: true  }, // player_state
    { pubkey: commitPDA, isSigner: false, isWritable: false }, // commit (readonly)
    { pubkey: payer,     isSigner: true,  isWritable: false }, // player (signer)
  ];
  return _mbMode ? buildAndSendViaMagicRouter(accts, data) : buildAndSend(accts, data);
}

// ─── ZK helper: PDA for ZkProofRecord ────────────────────────────────────
function findZkProofRecordPDA(duelId, round, playerPubkey) {
  const duelIdBuf = new solanaWeb3.PublicKey(duelId).toBytes();
  const roundBuf = new Uint8Array(8);
  new DataView(roundBuf.buffer).setBigUint64(0, BigInt(round), true);
  return solanaWeb3.PublicKey.findProgramAddressSync(
    [new TextEncoder().encode('zk_proof'), duelIdBuf, roundBuf, playerPubkey.toBytes()],
    getProgramId()
  );
}

// ─── Instruction: verify_zk_proof ────────────────────────────────────────
/**
 * Submit a hand_commitment v2 Groth16 ZK proof on-chain.
 * Proves: Poseidon(round, pubkey_lo, pubkey_hi, card_ids[10], salt_lo, salt_hi) == commitment
 * with range/uniqueness constraints on active cards, without revealing card selection.
 *
 * @param {string}        duelId       — duel PDA pubkey (base58)
 * @param {number|bigint} round        — round number 1-5 (u64)
 * @param {Uint8Array}    proofA       — 64 bytes (G1 point, x||y big-endian)
 * @param {Uint8Array}    proofB       — 128 bytes (G2, x1||x0||y1||y0 big-endian)
 * @param {Uint8Array}    proofC       — 64 bytes (G1 point, x||y big-endian)
 * @param {Uint8Array[]}  publicInputs — 4 × 32-byte arrays: [commitment, round_fe, pubkey_lo_fe, pubkey_hi_fe]
 */
async function verifyZkProof(duelId, round, proofA, proofB, proofC, publicInputs) {
  const payer = window.solana.publicKey;
  const [zkRecordPDA] = findZkProofRecordPDA(duelId, round, payer);
  const systemProgram = new solanaWeb3.PublicKey('11111111111111111111111111111111');
  const duelPdaBytes  = new solanaWeb3.PublicKey(duelId).toBytes();

  // disc(8) + proof_a(64) + proof_b(128) + proof_c(64) + public_inputs(4×32=128) + duel_pda(32) + round(8) = 432
  const d    = await disc('verify_zk_proof');
  const data = new Uint8Array(432);
  let off = writeBytes(data, 0, d);
  off = writeBytes(data, off, proofA);
  off = writeBytes(data, off, proofB);
  off = writeBytes(data, off, proofC);
  for (const pi of publicInputs) off = writeBytes(data, off, pi);  // 4 × 32 bytes
  off = writeBytes(data, off, duelPdaBytes);
  writeU64LE(data, off, round);

  return buildAndSend([
    { pubkey: payer,       isSigner: true,  isWritable: true  }, // signer
    { pubkey: zkRecordPDA, isSigner: false, isWritable: true  }, // zk_proof_record (init)
    { pubkey: systemProgram, isSigner: false, isWritable: false }, // system_program
  ], data, COMPUTE_BUDGET.verify_zk_proof);
}

// ─── ZK: field element helpers ────────────────────────────────────────────
function _fieldToBytes32(s) {
  const bi = BigInt(s);
  const buf = new Uint8Array(32);
  for (let i = 0; i < 32; i++) buf[31 - i] = Number((bi >> BigInt(i * 8)) & 0xffn);
  return buf;
}
function _g1ToBytes64(pt) {
  const b = new Uint8Array(64);
  b.set(_fieldToBytes32(pt[0]), 0);
  b.set(_fieldToBytes32(pt[1]), 32);
  return b;
}
function _g2ToBytes128(pt) {
  const b = new Uint8Array(128);
  b.set(_fieldToBytes32(pt[0][1]), 0);   // x1
  b.set(_fieldToBytes32(pt[0][0]), 32);  // x0
  b.set(_fieldToBytes32(pt[1][1]), 64);  // y1
  b.set(_fieldToBytes32(pt[1][0]), 96);  // y0
  return b;
}

/**
 * Generate a hand_commitment v2 Groth16 proof in the browser via snarkjs.
 *
 * @param {number[]}  cardIds   — 10 card catalog IDs; [0..4] active (1-60), [5..9] padding (0)
 * @param {bigint}    saltLo    — lower 16 bytes of 32-byte salt as u128
 * @param {bigint}    saltHi    — upper 16 bytes of 32-byte salt as u128
 * @param {number}    round     — round number 1-5
 * @param {bigint}    pubkeyLo  — bytes[0..16] of player pubkey as u128
 * @param {bigint}    pubkeyHi  — bytes[16..32] of player pubkey as u128
 * @returns {{ proofA, proofB, proofC, publicInputs: Uint8Array[] }}
 *   publicInputs is [commitment_fe, round_fe, pubkey_lo_fe, pubkey_hi_fe] (each 32 bytes)
 */
async function generateZkProof(cardIds, saltLo, saltHi, round, pubkeyLo, pubkeyHi) {
  if (typeof snarkjs === 'undefined') {
    throw new Error('snarkjs not loaded — include snarkjs.min.js before calling generateZkProof');
  }

  const input = {
    card_ids:  cardIds.map(String),
    salt_lo:   saltLo.toString(),
    salt_hi:   saltHi.toString(),
    round:     round.toString(),
    pubkey_lo: pubkeyLo.toString(),
    pubkey_hi: pubkeyHi.toString(),
  };

  const base = (document.querySelector('base')?.href ?? window.location.origin + '/');
  const basePath = new URL('.', base).pathname;
  const wasmPath = basePath + 'hand_commitment.wasm';
  const zkeyPath = basePath + 'hand_commitment_final.zkey';

  const { proof, publicSignals } = await snarkjs.groth16.fullProve(input, wasmPath, zkeyPath);

  // publicSignals order: [commitment, round, pubkey_lo, pubkey_hi]
  return {
    proofA: _g1ToBytes64(proof.pi_a),
    proofB: _g2ToBytes128(proof.pi_b),
    proofC: _g1ToBytes64(proof.pi_c),
    publicInputs: publicSignals.map(_fieldToBytes32),
  };
}

/**
 * Split a Solana PublicKey into lo/hi u128 field elements (matching the circuit packing).
 * pubkey_lo = bytes[0..16] as u128 big-endian
 * pubkey_hi = bytes[16..32] as u128 big-endian
 *
 * @param {solanaWeb3.PublicKey} pubkey
 * @returns {{ lo: bigint, hi: bigint }}
 */
function splitPubkeyForZk(pubkey) {
  const bytes = pubkey.toBytes();
  let lo = 0n, hi = 0n;
  for (let i = 0; i < 16; i++) lo = (lo << 8n) | BigInt(bytes[i]);
  for (let i = 16; i < 32; i++) hi = (hi << 8n) | BigInt(bytes[i]);
  return { lo, hi };
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

// ════ MAGICBLOCK (MR mode variants) ════

// ─── MagicBlock lifecycle wrappers ───────────────────────────────────────
// T4: delegate after start_game, undelegate before claim_prize.
// Full PDA delegation requires Phase C Day 2 Rust changes; until then the
// delegation step logs a warning and continues (graceful degradation).

/**
 * startGameMB — starts the game then attempts to delegate Game PDA to the ER.
 * Falls back gracefully if delegation stubs are not yet implemented in Rust.
 * Activates _mbMode so subsequent commitAction/revealAction use Magic Router.
 */
async function startGameMB(gameId, playerPubkeyStrs = []) {
  // 1. Submit start_game to base layer (delegation always goes to base layer)
  const sig = await startGame(gameId, playerPubkeyStrs);

  // 2. Attempt delegation (stub returns { ok: false } until Rust is updated)
  if (window.oxarkMB) {
    const result = await window.oxarkMB.delegateGameAccounts(gameId);
    if (result.ok) {
      // Delegation succeeded — activate MB routing for game actions
      setMagicBlockMode(true);
      console.log('[MagicBlock] Game PDAs delegated — routing via ER. sig:', sig);
    } else {
      // Stub path — Magic Router still adds value as a routing layer
      // even without delegation (base-layer fallback is transparent)
      console.log('[MagicBlock] Delegation stub (Rust update required). MB routing OFF. sig:', sig);
    }
  }
  return { sig, erActive: _mbMode };
}

/**
 * claimPrizeMB — undelegates Game PDA back to base layer then claims the prize.
 * Deactivates _mbMode so future calls use the standard base-layer path.
 */
async function claimPrizeMB(gameId) {
  // 1. Undelegate (returns state to base layer so claim_prize can mutate it)
  if (window.oxarkMB) {
    const result = await window.oxarkMB.undelegateGameAccounts(gameId);
    if (result.ok) {
      console.log('[MagicBlock] Game PDAs undelegated — ready for base-layer claim.');
    } else {
      console.log('[MagicBlock] Undelegation stub (Rust update required). Proceeding anyway.');
    }
  }
  // 2. Deactivate MB routing — claim always goes to base layer
  setMagicBlockMode(false);

  // 3. Submit claim_prize to base layer
  return claimPrize(gameId);
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

// ════ OXARK PROGRAM — AGENT / SEASON ════

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

// ════ OXARK-CARDS PROGRAM ════

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

function getCardsProgramId() {
  return new solanaWeb3.PublicKey(CARDS_PROGRAM_ID_STR);
}

function findSoloCardMintPDA(playerPubkey, cardId) {
  return solanaWeb3.PublicKey.findProgramAddressSync(
    [SOLO_CARD_SEED, playerPubkey.toBytes(), new Uint8Array([cardId])],
    getCardsProgramId()  // mint_solo_card lives in oxark-cards, not the main program
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
    programId: getCardsProgramId(),  // mint_solo_card is in oxark-cards program
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

// ─── Delegation program PDA helpers ──────────────────────────────────────
const DELEGATION_PROGRAM_ID_STR = 'DELeGGvXpWV2fqJUhqcF5ZSYMS4JTLjteaAMARRSaeSh';
let _delegationProgramId = null;
function getDelegationProgramId() {
  if (!_delegationProgramId) _delegationProgramId = new solanaWeb3.PublicKey(DELEGATION_PROGRAM_ID_STR);
  return _delegationProgramId;
}

// Derive the three delegation PDAs for a delegated account (game or player_state).
// Per the MagicBlock delegation spec:
//   buffer:              seeds=["buffer", account]              owner=ownerProgram
//   delegation_record:   seeds=["delegation", account]          owner=delegationProgram
//   delegation_metadata: seeds=["delegation-metadata", account] owner=delegationProgram
function findDelegationPDAs(accountPubkey) {
  const accountBytes = accountPubkey.toBytes();
  const dlgProgram   = getDelegationProgramId();
  const ownerProgram = getProgramId();

  const [buffer] = solanaWeb3.PublicKey.findProgramAddressSync(
    [ENC.encode('buffer'), accountBytes], ownerProgram
  );
  const [delegationRecord] = solanaWeb3.PublicKey.findProgramAddressSync(
    [ENC.encode('delegation'), accountBytes], dlgProgram
  );
  const [delegationMetadata] = solanaWeb3.PublicKey.findProgramAddressSync(
    [ENC.encode('delegation-metadata'), accountBytes], dlgProgram
  );
  return { buffer, delegationRecord, delegationMetadata };
}

// ─── Instruction: delegate_session ───────────────────────────────────────
// Sent to base layer. Delegates game + player_state PDAs to the MagicBlock ER.
// Account order matches DelegateSession in delegate_session.rs.
async function delegateSession(gameId) {
  const payer = window.solana.publicKey;
  const [gamePDA]    = findGamePDA(gameId);
  const [playerPDA]  = findPlayerPDA(gameId, payer);

  const gamePDAs    = findDelegationPDAs(gamePDA);
  const playerPDAs  = findDelegationPDAs(playerPDA);
  const dlgProgramId = getDelegationProgramId();
  const ownerProgram = getProgramId();

  // disc(8) + game_id(u64 LE=8) = 16 bytes
  const d = await disc('delegate_session');
  const data = new Uint8Array(16);
  let off = writeBytes(data, 0, d);
  writeU64LE(data, off, gameId);

  return buildAndSend([
    { pubkey: payer,                          isSigner: true,  isWritable: true  }, // payer
    { pubkey: gamePDA,                        isSigner: false, isWritable: true  }, // game
    { pubkey: playerPDA,                      isSigner: false, isWritable: true  }, // player_state
    { pubkey: gamePDAs.buffer,                isSigner: false, isWritable: true  }, // game_buffer
    { pubkey: gamePDAs.delegationRecord,      isSigner: false, isWritable: true  }, // game_delegation_record
    { pubkey: gamePDAs.delegationMetadata,    isSigner: false, isWritable: true  }, // game_delegation_metadata
    { pubkey: playerPDAs.buffer,              isSigner: false, isWritable: true  }, // player_buffer
    { pubkey: playerPDAs.delegationRecord,    isSigner: false, isWritable: true  }, // player_delegation_record
    { pubkey: playerPDAs.delegationMetadata,  isSigner: false, isWritable: true  }, // player_delegation_metadata
    { pubkey: ownerProgram,                   isSigner: false, isWritable: false }, // owner_program
    { pubkey: dlgProgramId,                   isSigner: false, isWritable: false }, // delegation_program
    { pubkey: solanaWeb3.SystemProgram.programId, isSigner: false, isWritable: false },
  ], data, COMPUTE_BUDGET.default);
}

// ─── Instruction: undelegate_session ─────────────────────────────────────
// Sent to ER validator (via Magic Router). Schedules commit + undelegate.
// The ER commits pending state diffs to base layer then restores account ownership.
// Account order matches UndelegateSession in undelegate_session.rs.
async function undelegateSession(gameId) {
  const payer = window.solana.publicKey;
  const [gamePDA]        = findGamePDA(gameId);
  const [playerPDA]      = findPlayerPDA(gameId, payer);
  const magicContextId   = new solanaWeb3.PublicKey('MagicContext1111111111111111111111111111111');
  const magicProgramId   = new solanaWeb3.PublicKey('Magic11111111111111111111111111111111111111');

  // disc(8) + game_id(u64 LE=8) = 16 bytes
  const d = await disc('undelegate_session');
  const data = new Uint8Array(16);
  let off = writeBytes(data, 0, d);
  writeU64LE(data, off, gameId);

  // Must be sent via Magic Router to the ER validator (not base layer).
  return buildAndSendViaMagicRouter([
    { pubkey: payer,          isSigner: true,  isWritable: true  }, // payer
    { pubkey: gamePDA,        isSigner: false, isWritable: true  }, // game
    { pubkey: playerPDA,      isSigner: false, isWritable: true  }, // player_state
    { pubkey: magicContextId, isSigner: false, isWritable: true  }, // magic_context
    { pubkey: magicProgramId, isSigner: false, isWritable: false }, // magic_program
  ], data, COMPUTE_BUDGET.default);
}

// ════ CLIENT-SIDE ════

// ─── Exports ──────────────────────────────────────────────────────────────
// ─── T72: NFT Trading — localStorage-backed listings ──────────────────────────
// Full on-chain escrow deferred; this layer stores listings locally and logs txs.
// Replace with real PDAs when list_card/buy_card instructions are deployed.
const _LISTINGS_KEY = 'oxark_nft_listings';
function _loadListings() {
  try { return JSON.parse(localStorage.getItem(_LISTINGS_KEY) || '[]'); } catch(e) { return []; }
}
function _saveListings(arr) {
  try { localStorage.setItem(_LISTINGS_KEY, JSON.stringify(arr)); } catch(e) {}
}
async function listCard(cardId, priceSol) {
  if (!window.solana?.isConnected) throw new Error('Phantom not connected');
  const seller = window.solana.publicKey.toBase58();
  const listing = { id: Date.now(), cardId, seller, priceSol, ts: Date.now() };
  const arr = _loadListings();
  arr.push(listing);
  _saveListings(arr);
  return listing.id;
}
async function buyCard(listingId) {
  if (!window.solana?.isConnected) throw new Error('Phantom not connected');
  const buyer = window.solana.publicKey.toBase58();
  const arr = _loadListings();
  const idx = arr.findIndex(l => l.id === listingId);
  if (idx < 0) throw new Error('Listing not found');
  if (arr[idx].seller === buyer) throw new Error('Cannot buy your own listing');
  const listing = arr.splice(idx, 1)[0];
  _saveListings(arr);
  return listing;
}
async function cancelListing(listingId) {
  if (!window.solana?.isConnected) throw new Error('Phantom not connected');
  const seller = window.solana.publicKey.toBase58();
  const arr = _loadListings();
  const idx = arr.findIndex(l => l.id === listingId && l.seller === seller);
  if (idx < 0) throw new Error('Listing not found or not yours');
  const listing = arr.splice(idx, 1)[0];
  _saveListings(arr);
  return listing;
}
function getListings() { return _loadListings(); }

// ── T81: Deck system (Axis A) ──────────────────────────────────────────────
// PDA seeds: ["player_deck", player_pubkey]
// save_deck validates: cost≤30, Legendary≤2, Rare≤6, Common≥12
// lock_deck: sets locked_until = now + 3600 on-chain

async function findPlayerDeckPDA(playerPubkey) {
  const { PublicKey } = window.solanaWeb3 || {};
  if (!PublicKey) throw new Error('solanaWeb3 not loaded');
  const pid = new PublicKey(PROGRAM_ID_STR);
  const [pda] = await PublicKey.findProgramAddress(
    [Buffer.from('player_deck'), playerPubkey.toBuffer()],
    pid
  );
  return pda;
}

async function saveDeck(cards) {
  // cards: number[] of card IDs (1-60)
  const provider = _getProvider();
  const program = _getProgram(provider);
  const player = provider.wallet.publicKey;
  const tx = await program.methods
    .saveDeck(cards.map(c => c & 0xff))
    .accounts({ player })
    .rpc();
  return tx;
}

async function lockDeck() {
  const provider = _getProvider();
  const program = _getProgram(provider);
  const player = provider.wallet.publicKey;
  const playerDeck = await findPlayerDeckPDA(player);
  const tx = await program.methods
    .lockDeck()
    .accounts({ playerDeck, player })
    .rpc();
  return tx;
}

// ── T83: ZK Card Commit instructions ─────────────────────────────────────────

async function findCardCommitPDA(playerPubkey, gameId, round) {
  const { PublicKey, Buffer } = solanaWeb3;
  const pid = new PublicKey(PROGRAM_ID_STR);
  const gameIdBuf = Buffer.alloc(8);
  gameIdBuf.writeBigUInt64LE(BigInt(gameId));
  const [pda] = await PublicKey.findProgramAddress(
    [Buffer.from('card_commit'), playerPubkey.toBuffer(), gameIdBuf, Buffer.from([round & 0xff])],
    pid
  );
  return pda;
}

async function commitCard(gameId, commitment) {
  // commitment: Uint8Array(32) from zkCardCommit.commitCard()
  const provider = _getProvider();
  const program = _getProgram(provider);
  const player = provider.wallet.publicKey;
  const tx = await program.methods
    .commitCard(new solanaWeb3.BN(gameId), Array.from(commitment))
    .accounts({ player })
    .rpc();
  return tx;
}

async function revealCard(gameId, cardId, salt) {
  // salt: Uint8Array(32) from zkCardCommit.commitCard() result
  const provider = _getProvider();
  const program = _getProgram(provider);
  const player = provider.wallet.publicKey;
  const tx = await program.methods
    .revealCard(new solanaWeb3.BN(gameId), cardId & 0xff, Array.from(salt))
    .accounts({ player })
    .rpc();
  return tx;
}

async function findPlayerRegistryPDA(playerPubkey) {
  const [pda] = await solanaWeb3.PublicKey.findProgramAddressSync(
    [Buffer.from('player_registry'), playerPubkey.toBytes()],
    new solanaWeb3.PublicKey(PROGRAM_ID_STR)
  );
  return pda;
}

async function registerCard(cardId) {
  const provider = _getProvider();
  const program = _getProgram(provider);
  const player = provider.wallet.publicKey;
  const tx = await program.methods
    .registerCard(cardId & 0xff)
    .accounts({ player })
    .rpc();
  return tx;
}

// ════ PHASE 18 — REAL ANCHOR INSTRUCTION WRAPPERS ════

// ─── PlayerState existence check ─────────────────────────────────────────
async function checkPlayerStateExists(playerPubkey) {
  const [pda] = findPlayerStatePDA(playerPubkey);
  const info  = await getConnection().getAccountInfo(pda);
  if (!info) return false;
  // Account may exist but be in reset state (deposit_amount=0 = unregistered).
  // Treat deposit=0 as "not registered" so the register screen shows.
  const d = info.data;
  const queueNone  = d.length > 169 && d[169] === 0;
  const depositOff = queueNone ? 178 : 210;
  if (d.length < depositOff + 8) return false;
  const dv = new DataView(d.buffer, d.byteOffset, d.byteLength);
  return Number(dv.getBigUint64(depositOff, true)) > 0;
}

// ─── register_waitlist ────────────────────────────────────────────────────
// Deposits 0.5 SOL and registers the player on the Season 1 waitlist.
// YKK-38: prize_pool is the program PDA; only opsTreasury is an external address.
// opsTreasuryStr: base58 pubkey of the ops treasury account.
async function registerWaitlist(opsTreasuryStr) {
  const player = window.solana.publicKey;
  const [playerStatePDA] = findPlayerStatePDA(player);
  const [gameWorldPDA]   = findGameWorldPDA();
  const [prizePool]      = findPrizePoolPDA();
  const opsTreasury      = new solanaWeb3.PublicKey(opsTreasuryStr);

  const d    = await disc('register_waitlist');
  const data = new Uint8Array(8);
  writeBytes(data, 0, d);

  return buildAndSend([
    { pubkey: playerStatePDA, isSigner: false, isWritable: true  },
    { pubkey: gameWorldPDA,   isSigner: false, isWritable: true  },
    { pubkey: prizePool,      isSigner: false, isWritable: true  },
    { pubkey: opsTreasury,    isSigner: false, isWritable: true  },
    { pubkey: player,         isSigner: true,  isWritable: true  },
    { pubkey: solanaWeb3.SystemProgram.programId, isSigner: false, isWritable: false },
  ], data);
}

// ─── burn_card ────────────────────────────────────────────────────────────
// Burns a Common or Uncommon card NFT. cardMintStr: base58 mint pubkey.
// YKK-37: rarity is read on-chain from CardMintRecord (C5); the caller no longer
// passes it (Rare/Legendary remain blocked on-chain). Account order must match
// BurnCard: card_mint_record sits between card_history and season_stats.
async function burnCard(cardMintStr) {
  const owner    = window.solana.publicKey;
  const mintPK   = new solanaWeb3.PublicKey(cardMintStr);
  const [ata]       = findAssociatedTokenAddress(owner, mintPK);
  const [histPDA]   = findCardBattleHistoryPDA(mintPK);
  const [recordPDA] = findCardMintRecordPDA(mintPK);
  const createdAt   = await readCardBattleHistoryCreatedAt(cardMintStr);
  const [statsPDA]  = findSeasonStatsPDA(createdAt);

  // disc(8) + card_mint(32) = 40 bytes
  const d    = await disc('burn_card');
  const data = new Uint8Array(40);
  let off = writeBytes(data, 0, d);
  writeBytes(data, off, mintPK.toBytes());

  return buildAndSend([
    { pubkey: owner,     isSigner: true,  isWritable: true  },
    { pubkey: mintPK,    isSigner: false, isWritable: true  },
    { pubkey: ata,       isSigner: false, isWritable: true  },
    { pubkey: histPDA,   isSigner: false, isWritable: true  },
    { pubkey: recordPDA, isSigner: false, isWritable: false },
    { pubkey: statsPDA,  isSigner: false, isWritable: true  },
    { pubkey: new solanaWeb3.PublicKey(SPL_TOKEN_PROGRAM_ID),        isSigner: false, isWritable: false },
    { pubkey: solanaWeb3.SystemProgram.programId,                    isSigner: false, isWritable: false },
    { pubkey: new solanaWeb3.PublicKey(ASSOCIATED_TOKEN_PROGRAM_ID), isSigner: false, isWritable: false },
    { pubkey: new solanaWeb3.PublicKey(SYSVAR_RENT_PUBKEY),         isSigner: false, isWritable: false },
  ], data);
}

// ─── promote_card ───────────────────────────────────────────────────────────
// YKK-45: provenance-driven single-card promotion (supersedes evolve_cards). One
// card is promoted IN PLACE — same SPL mint, no burn — by raising the rarity stored
// in its CardMintRecord PDA, gated on the card's on-chain `wins`. The holder must own
// the NFT. First step is Common→Uncommon only. cardMintStr: base58 mint pubkey.
async function promoteCard(cardMintStr) {
  const owner  = window.solana.publicKey;
  const mintPK = new solanaWeb3.PublicKey(cardMintStr);
  const [ata]       = findAssociatedTokenAddress(owner, mintPK);
  const [recordPDA] = findCardMintRecordPDA(mintPK);
  const [histPDA]   = findCardBattleHistoryPDA(mintPK);

  // disc(8) + card_mint(32) = 40 bytes
  const d    = await disc('promote_card');
  const data = new Uint8Array(40);
  let off = writeBytes(data, 0, d);
  writeBytes(data, off, mintPK.toBytes());

  // Account order must match PromoteCard:
  // owner, card_mint_account, owner_token_account, card_mint_record, card_battle_history
  return buildAndSend([
    { pubkey: owner,     isSigner: true,  isWritable: false },
    { pubkey: mintPK,    isSigner: false, isWritable: false },
    { pubkey: ata,       isSigner: false, isWritable: false },
    { pubkey: recordPDA, isSigner: false, isWritable: true  },
    { pubkey: histPDA,   isSigner: false, isWritable: false },
  ], data);
}

// ─── settle_duel_history ──────────────────────────────────────────────────
// Trustless provenance settlement: after a duel ENDS, each participant settles
// their own cards' win/loss credit FROM the on-chain DuelState — this replaces
// the old client-side self-reporting (update_card_battle_history is admin-only
// now; open deltas let anyone forge the wins that gate promote_card).
// duelIdStr: base58 duel id; cardMintStrs: mints of the cards this player used
// (their species must appear in the player's revealed hands for that duel).
// One on-chain instruction per card, packed 5 per transaction. Safe to retry:
// already-settled cards fail preflight with CardAlreadySettled — drop them and
// resend the rest.
const SETTLE_BATCH = 5;

function findDuelSettleRecordPDA(duelIdPubkey, playerPubkey) {
  return solanaWeb3.PublicKey.findProgramAddressSync(
    [ENC.encode('duel_settle'), duelIdPubkey.toBytes(), playerPubkey.toBytes()],
    getProgramId()
  );
}

async function settleDuelHistory(duelIdStr, cardMintStrs) {
  const player = window.solana.publicKey;
  const duelId = new solanaWeb3.PublicKey(duelIdStr);
  const [duelPDA]   = findDuelPDA(duelId);
  const [settlePDA] = findDuelSettleRecordPDA(duelId, player);

  const d = await disc('settle_duel_history');
  const ixSpecs = cardMintStrs.map((mintStr) => {
    const mintPK = new solanaWeb3.PublicKey(mintStr);
    const [recordPDA] = findCardMintRecordPDA(mintPK);
    const [histPDA]   = findCardBattleHistoryPDA(mintPK);

    // disc(8) + duel_id(32) + card_mint(32) = 72 bytes
    const data = new Uint8Array(72);
    let off = writeBytes(data, 0, d);
    off = writeBytes(data, off, duelId.toBytes());
    writeBytes(data, off, mintPK.toBytes());

    // Account order must match SettleDuelHistory:
    // duel, player, settle_record, card_mint_record, card_battle_history, system_program
    return {
      keys: [
        { pubkey: duelPDA,   isSigner: false, isWritable: false },
        { pubkey: player,    isSigner: true,  isWritable: true  },
        { pubkey: settlePDA, isSigner: false, isWritable: true  },
        { pubkey: recordPDA, isSigner: false, isWritable: false },
        { pubkey: histPDA,   isSigner: false, isWritable: true  },
        { pubkey: solanaWeb3.SystemProgram.programId, isSigner: false, isWritable: false },
      ],
      data,
    };
  });

  const sigs = [];
  for (let i = 0; i < ixSpecs.length; i += SETTLE_BATCH) {
    sigs.push(await buildAndSendMulti(ixSpecs.slice(i, i + SETTLE_BATCH)));
  }
  return sigs;
}

// ─── claim_timeout_win ────────────────────────────────────────────────────
// Ends a stalled duel: if the opponent has owed the current round's commit or
// reveal for DUEL_STALL_TIMEOUT_SECONDS (and this player has done their part),
// this player takes the duel. Winner/ended_at are set exactly like a played-out
// decision, so settleDuelHistory works on timeout wins too.
async function claimTimeoutWin(duelIdStr) {
  const claimant = window.solana.publicKey;
  const duelId = new solanaWeb3.PublicKey(duelIdStr);
  const [duelPDA] = findDuelPDA(duelId);

  // disc(8) + duel_id(32) = 40 bytes
  const d    = await disc('claim_timeout_win');
  const data = new Uint8Array(40);
  let off = writeBytes(data, 0, d);
  writeBytes(data, off, duelId.toBytes());

  // Account order must match ClaimTimeoutWin: duel, claimant
  return buildAndSend([
    { pubkey: duelPDA,  isSigner: false, isWritable: true  },
    { pubkey: claimant, isSigner: true,  isWritable: false },
  ], data);
}

// ─── grant_imprint ────────────────────────────────────────────────────────
// ⚠️ ADMIN-ONLY since the provenance-gate fix: imprints carry battle-stat
// bonuses, so open grants were stat inflation. The connected wallet must be
// ADMIN_PUBKEY or the program rejects with NotAdmin. Organic imprints are
// auto-granted by settle_duel_history at win thresholds.
// Records a battle imprint onto a card's history PDA.
// imprintKeyVal: u8 stat key; isCosmetic: bool; duelId: u64 (BigInt or number).
// YKK-32: stat-imprint rarity cap is read on-chain from the card's CardMintRecord
// PDA; the caller no longer passes a rarity argument (it was spoofable).
async function grantImprint(cardMintStr, imprintKeyVal, isCosmetic, duelId) {
  const payer = window.solana.publicKey;
  const mintPK = new solanaWeb3.PublicKey(cardMintStr);
  const [histPDA]   = findCardBattleHistoryPDA(mintPK);
  const [recordPDA] = findCardMintRecordPDA(mintPK);

  // disc(8) + card_mint(32) + imprint_key_val(1) + is_cosmetic(1) + duel_id(8) = 50
  const d    = await disc('grant_imprint');
  const data = new Uint8Array(50);
  let off = writeBytes(data, 0, d);
  off = writeBytes(data, off, mintPK.toBytes());
  off = writeU8(data, off, imprintKeyVal & 0xff);
  off = writeBool(data, off, isCosmetic);
  writeU64LE(data, off, duelId);

  // Account order must match GrantImprint: card_mint_record follows card_battle_history.
  return buildAndSend([
    { pubkey: histPDA,   isSigner: false, isWritable: true  },
    { pubkey: recordPDA, isSigner: false, isWritable: false },
    { pubkey: payer,     isSigner: true,  isWritable: true  },
    { pubkey: solanaWeb3.SystemProgram.programId, isSigner: false, isWritable: false },
  ], data);
}

// ─── claim_prize_v2 ───────────────────────────────────────────────────────
// Claims tier-proportional prize from the prize pool after game ends.
// YKK-38: prize_pool is the program PDA; no external address argument needed.
async function claimPrizeV2() {
  const player = window.solana.publicKey;
  const [playerStatePDA] = findPlayerStatePDA(player);
  const [gameWorldPDA]   = findGameWorldPDA();
  const [prizePool]      = findPrizePoolPDA();

  const d    = await disc('claim_prize_v2');
  const data = new Uint8Array(8);
  writeBytes(data, 0, d);

  return buildAndSend([
    { pubkey: playerStatePDA, isSigner: false, isWritable: true  },
    { pubkey: gameWorldPDA,   isSigner: false, isWritable: true  },
    { pubkey: prizePool,      isSigner: false, isWritable: true  },
    { pubkey: player,         isSigner: true,  isWritable: true  },
    { pubkey: solanaWeb3.SystemProgram.programId, isSigner: false, isWritable: false },
  ], data);
}

// ─── check_legendary_v2 ───────────────────────────────────────────────────
// Checks if the player's vault has all 60 cards and triggers the legendary state.
function findDuelPDA(duelIdPubkey) {
  return solanaWeb3.PublicKey.findProgramAddressSync(
    [ENC.encode('duel'), duelIdPubkey.toBytes()],
    getProgramId()
  );
}

function findDuelLootRecordPDA(duelIdPubkey) {
  return solanaWeb3.PublicKey.findProgramAddressSync(
    [ENC.encode('duel_loot'), duelIdPubkey.toBytes()],
    getProgramId()
  );
}

// ─── Phase 15 battle instructions ────────────────────────────────────────────

/// Initialize a DuelState PDA when two players are matched.
/// Called by P1 (host) wallet immediately after matchmaking_matched.
/// @param {string} duelIdStr   — base58 Pubkey generated by server
/// @param {string} player1Str  — P1 wallet address (= caller)
/// @param {string} player2Str  — P2 wallet address (from matchmaking)
/// @param {number} [hallTier]  — 0–2 (default 0)
/// @param {bigint} [ante]      — ante in lamports (default 0n)
async function initDuel(duelIdStr, player1Str, player2Str, hallTier = 0, ante = 0n) {
  const authority = window.solana?.publicKey;
  if (!authority) throw new Error('Wallet not connected');

  const duelIdPK  = new solanaWeb3.PublicKey(duelIdStr);
  const player1PK = new solanaWeb3.PublicKey(player1Str);
  const player2PK = new solanaWeb3.PublicKey(player2Str);
  const [duelPDA] = findDuelPDA(duelIdPK);

  // Borsh: disc(8) + duel_id(32) + hall_tier(1) + ante(8)
  const d    = await disc('init_duel');
  const data = new Uint8Array(8 + 32 + 1 + 8);
  let off = writeBytes(data, 0, d);
  off = writeBytes(data, off, duelIdPK.toBytes());
  off = writeU8(data, off, hallTier & 0xff);
  writeU64LE(data, off, ante);

  return buildAndSend([
    { pubkey: duelPDA,                            isSigner: false, isWritable: true  },
    { pubkey: player1PK,                          isSigner: false, isWritable: false },
    { pubkey: player2PK,                          isSigner: false, isWritable: false },
    { pubkey: authority,                          isSigner: true,  isWritable: true  },
    { pubkey: solanaWeb3.SystemProgram.programId, isSigner: false, isWritable: false },
  ], data, COMPUTE_BUDGET.init_duel);
}

/// Commit a player's hand for the current round via Groth16 ZK proof.
/// @param {string}       duelIdStr      — base58 Pubkey
/// @param {number}       round          — 1–5
/// @param {Uint8Array}   proofA         — 64 bytes
/// @param {Uint8Array}   proofB         — 128 bytes
/// @param {Uint8Array}   proofC         — 64 bytes
/// @param {Uint8Array[]} publicSignals  — 4 × 32-byte arrays: [commitment, round, pubkey_lo, pubkey_hi]
async function commitHand(duelIdStr, round, proofA, proofB, proofC, publicSignals) {
  const player = window.solana?.publicKey;
  if (!player) throw new Error('Wallet not connected');

  const duelIdPK = new solanaWeb3.PublicKey(duelIdStr);
  const [duelPDA] = findDuelPDA(duelIdPK);

  // Borsh: disc(8) + duel_id(32) + round(1) + proof_a(64) + proof_b(128) + proof_c(64)
  //        + public_signals(4×32=128) = 425 bytes
  const d    = await disc('commit_hand');
  const data = new Uint8Array(8 + 32 + 1 + 64 + 128 + 64 + 128);
  let off = writeBytes(data, 0, d);
  off = writeBytes(data, off, duelIdPK.toBytes());
  off = writeU8(data, off, round & 0xff);
  off = writeBytes(data, off, proofA);
  off = writeBytes(data, off, proofB);
  off = writeBytes(data, off, proofC);
  for (let i = 0; i < 4; i++) {
    off = writeBytes(data, off, publicSignals[i] ?? new Uint8Array(32));
  }

  return buildAndSend([
    { pubkey: duelPDA, isSigner: false, isWritable: true },
    { pubkey: player,  isSigner: true,  isWritable: false },
  ], data, COMPUTE_BUDGET.commit_hand);
}

/// Reveal a player's hand for the given round.
/// On round 5 and both players revealed: damage_calc runs on-chain, duel.winner set.
/// @param {string}     duelIdStr — base58 Pubkey
/// @param {number}     round     — 1–5
/// @param {bigint[]}   cardIds   — 10 u64s (5 card IDs × 2 slots per card, or 10 card positions)
/// @param {Uint8Array} salt      — 32 bytes
async function revealHand(duelIdStr, round, cardIds, salt) {
  if (!window.solana || !window.solana.isConnected) throw new Error('Phantom wallet not connected');
  const player = window.solana.publicKey;

  const duelIdPK = new solanaWeb3.PublicKey(duelIdStr);
  const [duelPDA] = findDuelPDA(duelIdPK);

  // Borsh: disc(8) + duel_id(32) + round(1) + card_ids(10×8=80) + salt(32) = 153 bytes
  const d    = await disc('reveal_hand');
  const data = new Uint8Array(8 + 32 + 1 + 80 + 32);
  let off = writeBytes(data, 0, d);
  off = writeBytes(data, off, duelIdPK.toBytes());
  off = writeU8(data, off, round & 0xff);
  for (let i = 0; i < 10; i++) {
    off = writeU64LE(data, off, cardIds[i] ?? 0n);
  }
  writeBytes(data, off, salt);

  // reveal_hand TX instruction order: RequestHeapFrame MUST be first.
  // The program's 256KB BumpAllocator writes to ~0x30003fff8 on first alloc;
  // without RequestHeapFrame(262144) the validator maps only 32KB and faults.
  const heapIx   = requestHeapFrameIx(262144);
  const [limitIx, priceIx] = computeBudgetIxs(COMPUTE_BUDGET.reveal_hand);
  const revealIx = new solanaWeb3.TransactionInstruction({
    keys: [
      { pubkey: duelPDA, isSigner: false, isWritable: true  },
      { pubkey: player,  isSigner: true,  isWritable: false },
    ],
    programId: getProgramId(),
    data,
  });

  const conn = getConnection();
  const tx = new solanaWeb3.Transaction();
  tx.add(heapIx, limitIx, priceIx, revealIx);
  tx.feePayer = player;

  const { blockhash, lastValidBlockHeight } = await conn.getLatestBlockhash();
  tx.recentBlockhash = blockhash;

  const sim = await conn.simulateTransaction(tx);
  if (sim.value.err) {
    const logs = sim.value.logs ?? [];
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
    skipPreflight: true,
    maxRetries: 5,
  });
  await conn.confirmTransaction({ signature: sig, blockhash, lastValidBlockHeight }, 'confirmed');
  return sig;
}

/// Fetch DuelState account and return { winner, endedAt, round }.
/// Used by clients after round-5 reveal to detect duel resolution.
/// @param {string} duelIdStr — base58 Pubkey
async function getDuelState(duelIdStr) {
  const duelIdPK = new solanaWeb3.PublicKey(duelIdStr);
  const [duelPDA] = findDuelPDA(duelIdPK);
  const rpc  = new solanaWeb3.Connection(DEVNET_RPC, 'confirmed');
  const info = await rpc.getAccountInfo(duelPDA);
  if (!info) return null;
  const d = info.data;
  // DuelState layout (after 8-byte disc):
  // id(32) player_1(32) player_2(32) hall_tier(1) round(1) phase(1) ante(8)
  // winner(32) started_at(8) ended_at(8) bump(1) ...
  const off = 8 + 32 + 32 + 32 + 1 + 1 + 1 + 8; // = 115
  const winner   = new solanaWeb3.PublicKey(d.slice(off, off + 32)).toBase58();
  const endedAt  = Number(new DataView(d.buffer, d.byteOffset + off + 32, 8).getBigInt64(0, true));
  const round    = d[8 + 32 + 32 + 32 + 1];
  return { winner, endedAt, round };
}

// SlotHashes sysvar pubkey (stable across all Solana versions).
const SLOT_HASHES_PUBKEY = new solanaWeb3.PublicKey('SysvarS1otHashes111111111111111111111111111');

/// Claim 1 random card from loser's battle field on-chain.
/// @param {string|PublicKey} duelId  — unique duel identifier (Pubkey)
/// @param {string}           loserPubkeyStr — loser's wallet address
/// @param {number[]}         loserField  — [cardId, cardId, cardId, cardId, cardId]
/// @returns {{ signature: string, stolenCardId: number|null }}
async function claimBattleLoot(duelId, loserPubkeyStr, loserField) {
  const winner = window.oxarkWallet?.getPublicKey?.();
  if (!winner) throw new Error('Wallet not connected');

  const duelIdPK  = typeof duelId === 'string'
    ? new solanaWeb3.PublicKey(duelId)
    : duelId;
  const loserPK   = new solanaWeb3.PublicKey(loserPubkeyStr);

  const [winnerStatePDA] = findPlayerStatePDA(winner);
  const [loserStatePDA]  = findPlayerStatePDA(loserPK);
  const [duelPDA]        = findDuelPDA(duelIdPK);
  const [lootRecordPDA]  = findDuelLootRecordPDA(duelIdPK);

  // Borsh: disc(8) + duel_id(Pubkey=32) + loser_pubkey(Pubkey=32) + loser_field([u8;5])
  const d    = await disc('claim_battle_loot');
  const data = new Uint8Array(8 + 32 + 32 + 5);
  let off = writeBytes(data, 0, d);
  off = writeBytes(data, off, duelIdPK.toBytes());
  off = writeBytes(data, off, loserPK.toBytes());
  const fieldArr = Array.from({ length: 5 }, (_, i) => (loserField[i] ?? 0) & 0xff);
  fieldArr.forEach((b, i) => { data[off + i] = b; });

  const sig = await buildAndSend([
    { pubkey: winner,         isSigner: true,  isWritable: true  },
    { pubkey: winnerStatePDA, isSigner: false, isWritable: true  },
    { pubkey: loserStatePDA,  isSigner: false, isWritable: true  },
    { pubkey: duelPDA,        isSigner: false, isWritable: false }, // DuelState guard
    { pubkey: lootRecordPDA,  isSigner: false, isWritable: true  },
    { pubkey: SLOT_HASHES_PUBKEY, isSigner: false, isWritable: false },
    { pubkey: solanaWeb3.SystemProgram.programId, isSigner: false, isWritable: false },
  ], data);

  // Read stolen_card_id from the DuelLootRecord account.
  // Account layout: 8 (disc) + 32 (duel_id) + 32 (winner) + 32 (loser) + 5 (field) + 1 (stolen)
  let stolenCardId = null;
  try {
    const rpc  = new solanaWeb3.Connection(DEVNET_RPC, 'confirmed');
    const info = await rpc.getAccountInfo(lootRecordPDA);
    if (info && info.data.length >= 8 + 32 + 32 + 32 + 5 + 1) {
      stolenCardId = info.data[8 + 32 + 32 + 32 + 5];
    }
  } catch (_) { /* non-fatal */ }

  return { signature: sig, stolenCardId };
}

async function checkLegendaryV2() {
  const player = window.solana.publicKey;
  const [playerStatePDA] = findPlayerStatePDA(player);
  const [gameWorldPDA]   = findGameWorldPDA();

  const d    = await disc('check_legendary_v2');
  const data = new Uint8Array(8);
  writeBytes(data, 0, d);

  return buildAndSend([
    { pubkey: playerStatePDA, isSigner: false, isWritable: true  },
    { pubkey: gameWorldPDA,   isSigner: false, isWritable: false },
    { pubkey: player,         isSigner: true,  isWritable: false },
  ], data);
}

// ── Phase 20-B: Shop instructions ────────────────────────────────────────────

const OPS_TREASURY_PK  = new solanaWeb3.PublicKey('GN3aBaUFPpejXBy2u4SgXuwQkkqRFauqAfXNsXhTPz4f');
// YKK-38: prize pool is now the program PDA (findPrizePoolPDA), not a fixed account.

// ─── refill_energy ────────────────────────────────────────────────────────
// Refill energy to full for SOL (YKK-44 gate / YKK-43 sink). No args — the fee
// (ENERGY_REFILL_COST_LAMPORTS) and target (ops_treasury) are fixed on-chain.
// NOTE: energy is not yet consumed anywhere (the duel-entry gate is a pending
// change), so this currently just sets energy=max; wire the commit_hand gate to
// make it meaningful.
async function refillEnergy() {
  const player           = window.solana.publicKey;
  const [playerStatePDA] = findPlayerStatePDA(player);
  const [gameWorldPDA]   = findGameWorldPDA();

  // disc(8) only — no instruction args
  const d    = await disc('refill_energy');
  const data = new Uint8Array(8);
  writeBytes(data, 0, d);

  // Account order must match RefillEnergy:
  // player, player_state, game_world, ops_treasury, system_program
  return buildAndSend([
    { pubkey: player,          isSigner: true,  isWritable: true  },
    { pubkey: playerStatePDA,  isSigner: false, isWritable: true  },
    { pubkey: gameWorldPDA,    isSigner: false, isWritable: false },
    { pubkey: OPS_TREASURY_PK, isSigner: false, isWritable: true  },
    { pubkey: solanaWeb3.SystemProgram.programId, isSigner: false, isWritable: false },
  ], data);
}

async function buyPack(packType) {
  const buyer         = window.solana.publicKey;
  const [playerStatePDA] = findPlayerStatePDA(buyer);
  const [gameWorldPDA]   = findGameWorldPDA();
  const [prizePool]      = findPrizePoolPDA(); // YKK-38: PDA vault

  // disc(8) + pack_type(1) = 9 bytes
  const d    = await disc('buy_pack');
  const data = new Uint8Array(9);
  let off = writeBytes(data, 0, d);
  writeU8(data, off, packType & 0xff);

  const sig = await buildAndSend([
    { pubkey: buyer,            isSigner: true,  isWritable: true  },
    { pubkey: playerStatePDA,   isSigner: false, isWritable: true  },
    { pubkey: gameWorldPDA,     isSigner: false, isWritable: false },
    { pubkey: OPS_TREASURY_PK,  isSigner: false, isWritable: true  },
    { pubkey: prizePool,        isSigner: false, isWritable: true  },
    { pubkey: SLOT_HASHES_PUBKEY, isSigner: false, isWritable: false },
    { pubkey: solanaWeb3.SystemProgram.programId, isSigner: false, isWritable: false },
  ], data);

  const cardIds = await _getPackCardIds(sig);
  return { signature: sig, cardIds };
}

async function _getPackCardIds(signature) {
  try {
    const conn = getConnection();
    const tx   = await conn.getTransaction(signature, {
      commitment: 'confirmed',
      maxSupportedTransactionVersion: 0,
    });
    if (!tx?.meta?.logMessages) return [];
    // Anchor emits: "Program log: Instruction: BuyPack" then event data
    // Parse msg "buy_pack: buyer=... cards=[id1, id2, ...]"
    for (const line of tx.meta.logMessages) {
      const m = line.match(/buy_pack:.*cards=\[([^\]]+)\]/);
      if (m) {
        return m[1].split(',').map(s => parseInt(s.trim(), 10)).filter(n => n > 0);
      }
    }
  } catch (_) {}
  return [];
}

async function updateShopParams({
  legendaryRatePhase1 = null,
  legendaryRatePhase2 = null,
  rareRatePhase1      = null,
  rareRatePhase2      = null,
  uncommonRate        = null,
  thresholdSeconds    = null,
} = {}) {
  const [gameWorldPDA] = findGameWorldPDA();
  const admin          = window.solana.publicKey;

  // Each Option<u32> = 1 (present) + 4 = 5 bytes, or 1 byte (None).
  // Each Option<u64> = 1 + 8 = 9 bytes, or 1 byte.
  function writeOptionU32(buf, off, val) {
    if (val === null || val === undefined) { buf[off] = 0; return off + 1; }
    buf[off] = 1; off++;
    writeU32LE(buf, off, val >>> 0); return off + 4;
  }
  function writeOptionU64(buf, off, val) {
    if (val === null || val === undefined) { buf[off] = 0; return off + 1; }
    buf[off] = 1; off++;
    writeU64LE(buf, off, val); return off + 8;
  }

  const maxSize = 8 + 5 + 5 + 5 + 5 + 5 + 9; // disc + 5×Option<u32> + Option<u64>
  const data    = new Uint8Array(maxSize);
  let off = writeBytes(data, 0, await disc('update_game_params'));
  off = writeOptionU32(data, off, legendaryRatePhase1);
  off = writeOptionU32(data, off, legendaryRatePhase2);
  off = writeOptionU32(data, off, rareRatePhase1);
  off = writeOptionU32(data, off, rareRatePhase2);
  off = writeOptionU32(data, off, uncommonRate);
  off = writeOptionU64(data, off, thresholdSeconds);

  return buildAndSend([
    { pubkey: admin,        isSigner: true,  isWritable: true  },
    { pubkey: gameWorldPDA, isSigner: false, isWritable: true  },
  ], data.slice(0, off));
}

// ─── Phase 20-C: Trade Floor ──────────────────────────────────────────────────

function findTradeListingPDA(sellerPubkey, cardId) {
  return solanaWeb3.PublicKey.findProgramAddressSync(
    [ENC.encode('trade'), sellerPubkey.toBytes(), new Uint8Array([cardId])],
    getProgramId()
  );
}

async function createListing(cardId, priceLamports) {
  const seller          = window.solana.publicKey;
  const [sellerStatePDA] = findPlayerStatePDA(seller);
  const [listingPDA]     = findTradeListingPDA(seller, cardId);

  // disc(8) + card_id(u8=1) + price(u64=8)
  const data = new Uint8Array(17);
  let off = writeBytes(data, 0, await disc('create_listing'));
  data[off] = cardId; off += 1;
  writeU64LE(data, off, BigInt(priceLamports));

  return buildAndSend([
    { pubkey: seller,          isSigner: true,  isWritable: true  },
    { pubkey: sellerStatePDA,  isSigner: false, isWritable: true  },
    { pubkey: listingPDA,      isSigner: false, isWritable: true  },
    { pubkey: solanaWeb3.SystemProgram.programId, isSigner: false, isWritable: false },
  ], data);
}

async function acceptListing(cardId, sellerPubkeyStr) {
  const buyer           = window.solana.publicKey;
  const sellerPK        = new solanaWeb3.PublicKey(sellerPubkeyStr);
  const [buyerStatePDA]  = findPlayerStatePDA(buyer);
  const [listingPDA]     = findTradeListingPDA(sellerPK, cardId);

  // disc(8) + seller_pubkey(32) + card_id(u8=1)
  const data = new Uint8Array(41);
  let off = writeBytes(data, 0, await disc('accept_listing'));
  off = writeBytes(data, off, sellerPK.toBytes());
  data[off] = cardId;

  return buildAndSend([
    { pubkey: buyer,          isSigner: true,  isWritable: true  },
    { pubkey: buyerStatePDA,  isSigner: false, isWritable: true  },
    { pubkey: listingPDA,     isSigner: false, isWritable: true  },
    { pubkey: sellerPK,       isSigner: false, isWritable: true  },
    { pubkey: solanaWeb3.SystemProgram.programId, isSigner: false, isWritable: false },
  ], data);
}

async function cancelListingOnchain(cardId) {
  const seller          = window.solana.publicKey;
  const [sellerStatePDA] = findPlayerStatePDA(seller);
  const [listingPDA]     = findTradeListingPDA(seller, cardId);

  // disc(8) + card_id(u8=1)
  const data = new Uint8Array(9);
  let off = writeBytes(data, 0, await disc('cancel_listing'));
  data[off] = cardId;

  return buildAndSend([
    { pubkey: seller,         isSigner: true,  isWritable: true  },
    { pubkey: sellerStatePDA, isSigner: false, isWritable: true  },
    { pubkey: listingPDA,     isSigner: false, isWritable: true  },
  ], data);
}

async function fetchAllListings() {
  const conn = getConnection();
  const programId = getProgramId();
  // Account discriminator for TradeListing = sha256("account:TradeListing")[0..8]
  const accountDiscBytes = await disc('account:TradeListing');
  const accounts = await conn.getProgramAccounts(programId, {
    filters: [
      { memcmp: { offset: 0, bytes: solanaWeb3.bs58.encode(accountDiscBytes) } },
    ],
  });
  return accounts.map(({ account }) => {
    const d = account.data;
    // Layout (after 8-byte disc): seller(32) + card_id(u8) + price(u64) + created_at(i64) + active(bool)
    const seller     = new solanaWeb3.PublicKey(d.slice(8, 40)).toString();
    const cardId     = d[40];
    const price      = Number(new DataView(d.buffer, d.byteOffset + 41, 8).getBigUint64(0, true));
    const createdAt  = Number(new DataView(d.buffer, d.byteOffset + 49, 8).getBigInt64(0, true));
    const active     = d[57] === 1;
    return { seller, cardId, price, createdAt, active };
  }).filter(l => l.active);
}

// ── Season 1 account readers (Bug 8 fix) ──────────────────────────────────

async function getPlayerState(playerPubkey) {
  const conn = getConnection();
  const pk = typeof playerPubkey === 'string'
    ? new solanaWeb3.PublicKey(playerPubkey)
    : playerPubkey;
  const [pda] = findPlayerStatePDA(pk);
  const info = await conn.getAccountInfo(pda);
  if (!info) return null;
  const d = info.data;
  // current_queue (Option<Pubkey>) at offset 169:
  //   None (0x00) → vault_bitmap@170, deposit@178
  //   Some (0x01) → vault_bitmap@202, deposit@210
  const queueNone  = d[169] === 0;
  const vaultOff   = queueNone ? 170 : 202;
  const depositOff = queueNone ? 178 : 210;
  const vault = [];
  for (let b = 0; b < 8; b++)
    for (let bit = 0; bit < 8; bit++)
      if ((d[vaultOff + b] >> bit) & 1) vault.push(b * 8 + bit + 1);
  const dv = new DataView(d.buffer, d.byteOffset, d.byteLength);
  const deposit = Number(dv.getBigUint64(depositOff, true));
  return { vault, vault_count: vault.length, deposit_amount: deposit };
}

async function getGameWorld() {
  const conn = getConnection();
  const [pda] = findGameWorldPDA();
  const info = await conn.getAccountInfo(pda);
  if (!info) return null;
  const d = info.data;
  const dv = new DataView(d.buffer, d.byteOffset, d.byteLength);
  const readI64 = off => Number(dv.getBigInt64(off, true));
  return {
    game_start_timestamp:         readI64(8),
    end_timestamp:                readI64(16),
    waitlist_close_timestamp:     readI64(24),
    total_participants:           dv.getUint32(32, true),
    game_status:                  d[59],
    shop_phase_threshold_seconds: Number(dv.getBigUint64(157, true)),
  };
}

window.oxarkOnchain = {
  PROGRAM_ID:       PROGRAM_ID_STR,
  CARDS_PROGRAM_ID: CARDS_PROGRAM_ID_STR,
  // MagicBlock ER mode toggle and getter (requires window.oxarkMB / 01-magicblock.js)
  setMagicBlockMode,
  getMbMode: () => _mbMode,
  // MagicBlock delegation instructions (Phase C Day 2 — real Rust CPI)
  delegateSession,
  undelegateSession,
  // MagicBlock lifecycle wrappers (T4: delegate after start, undelegate before claim)
  startGameMB,
  claimPrizeMB,
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
  // ZK proof generation + helpers (browser-side, requires snarkjs)
  generateZkProof,
  splitPubkeyForZk,
  findZkProofRecordPDA,
  // NFT Trading (T72) — localStorage-backed listings (legacy)
  listCard,
  buyCard,
  getListings,
  // Phase 20-C: Trade Floor — on-chain escrow listings
  createListing,
  acceptListing,
  cancelListing: cancelListingOnchain,
  fetchAllListings,
  findTradeListingPDA,
  // Deck system (T81 — Axis A) — save_deck + lock_deck on-chain PDAs
  saveDeck,
  lockDeck,
  findPlayerDeckPDA,
  // ZK Card Commit (T83 — Axis C) — commit_card + reveal_card on-chain PDAs
  commitCard,
  revealCard,
  findCardCommitPDA,
  // Player Registry (T95 — GI Rule) — register_card on-chain PDA
  registerCard,
  findPlayerRegistryPDA,
  // Phase 18 — on-chain wiring (Season 1 instructions)
  checkPlayerStateExists,
  registerWaitlist,
  burnCard,
  promoteCard,
  settleDuelHistory,
  claimTimeoutWin,
  findDuelSettleRecordPDA,
  grantImprint,
  claimPrizeV2,
  checkLegendaryV2,
  // Phase 15 — battle instructions
  initDuel,
  commitHand,
  revealHand,
  getDuelState,
  // Phase 19 — claim_battle_loot
  claimBattleLoot,
  findDuelPDA,
  findDuelLootRecordPDA,
  // Phase 20-B — shop
  buyPack,
  refillEnergy,
  updateShopParams,
  // Helpers
  computeCommitHash,
  generateSalt,
  parseAnchorError,
  writeU16LE,
  // Season 1 account readers
  getPlayerState,
  getGameWorld,
  // Account readers
  readGameAccount,
  readPlayerState,
  readAgentListing,
  readSeason,
  readCardBattleHistoryCreatedAt,
  // PDA finders (exported for React UI)
  findGamePDA,
  findPlayerPDA,
  findAgentPDA,
  findSeasonPDA,
  findStakeVaultPDA,
  findPlayerStatePDA,
  findGameWorldPDA,
  findCardBattleHistoryPDA,
  findSeasonStatsPDA,
};

console.log('[0xARK] onchain module loaded. Program:', PROGRAM_ID_STR);

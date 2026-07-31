// AUTO-SPLIT from onchain.js (YKK-15) — pure move, function bodies byte-identical.
// See PR: onchain.js -> src/onchain/{pda,readers,tx,rpc}.js + index.js shim.

import { ANCHOR_ERRORS, ASSOCIATED_TOKEN_PROGRAM_ID, COMPUTE_BUDGET, HEAP_FRAME_BYTES, NFT_CARD_NAMES, OPS_TREASURY_PK, SETTLE_BATCH, SLOT_HASHES_PUBKEY, SPL_TOKEN_PROGRAM_ID, SYSVAR_RENT_PUBKEY, TOKEN_METADATA_PROGRAM_ID, computeBudgetIxs, disc, encodeCreateMetadataV3, findAgentPDA, findAssociatedTokenAddress, findCardBattleHistoryPDA, findCardMintRecordPDA, findCardPoolPDA, findDelegationPDAs, findDuelLootRecordPDA, findDuelPDA, findDuelSettleRecordPDA, findGamePDA, findGameWorldPDA, findMetadataPDA, findPlayerDeckPDA, findPlayerPDA, findPlayerStatePDA, findPrizePoolPDA, findSeasonPDA, findSeasonStatsPDA, findSoloCardMintPDA, findStakeVaultPDA, findTradeListingPDA, findZkProofRecordPDA, getCardsProgramId, getDelegationProgramId, getProgramId, requestHeapFrameIx, writeBool, writeBytes, writeI64LE, writeU32LE, writeU64LE, writeU8 } from './pda.js';
import { DEVNET_RPC, getConnection } from './rpc.js';
import { invalidateOwnedCardMints, readCardBattleHistoryCreatedAt } from './readers.js';

// ─── MagicBlock ER mode flag ──────────────────────────────────────────────
// When true, commitAction/revealAction route through the Magic Router
// (window.oxarkMB.sendViaMagicRouter) instead of the base-layer connection.
// Toggle via oxarkOnchain.setMagicBlockMode(true/false).
// Requires window.oxarkMB to be loaded (01-magicblock.js).
let _mbMode = false;
function setMagicBlockMode(enabled) { _mbMode = !!enabled; }

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




// ════ MAGICBLOCK (MR mode variants) ════

// ─── MagicBlock lifecycle wrappers ───────────────────────────────────────
// T4: delegate after start_game, undelegate before claim_prize.
// Full PDA delegation requires Phase C Day 2 Rust changes; until then the
// delegation step logs a warning and continues (graceful degradation).



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

  const sig = await buildAndSend([
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
  invalidateOwnedCardMints(); // spec §1.4: burn removes a mint from the owner
  return sig;
}

// ─── promote_card ───────────────────────────────────────────────────────────
// YKK-45: provenance-driven single-card promotion (supersedes evolve_cards). One
// card is promoted IN PLACE — same SPL mint, no burn — by raising the rarity stored
// in its CardMintRecord PDA, gated on the card's on-chain `wins`. The holder must own
// the NFT. First step is Common→Uncommon only. cardMintStr: base58 mint pubkey.
async function promoteCard(cardMintStr) {
  const owner  = window.solana.publicKey;
  const mintPK = new solanaWeb3.PublicKey(cardMintStr);
  const [ata]           = findAssociatedTokenAddress(owner, mintPK);
  const [recordPDA]     = findCardMintRecordPDA(mintPK);
  const [histPDA]       = findCardBattleHistoryPDA(mintPK);
  const [gameWorldPDA]  = findGameWorldPDA();

  // disc(8) + card_mint(32) = 40 bytes
  const d    = await disc('promote_card');
  const data = new Uint8Array(40);
  let off = writeBytes(data, 0, d);
  writeBytes(data, off, mintPK.toBytes());

  // Account order must match PromoteCard:
  // owner, card_mint_account, owner_token_account, card_mint_record,
  // card_battle_history, game_world, ops_treasury, system_program.
  // owner is now writable (pays the tier promotion fee → ops_treasury).
  const sig = await buildAndSend([
    { pubkey: owner,           isSigner: true,  isWritable: true  },
    { pubkey: mintPK,          isSigner: false, isWritable: false },
    { pubkey: ata,             isSigner: false, isWritable: false },
    { pubkey: recordPDA,       isSigner: false, isWritable: true  },
    { pubkey: histPDA,         isSigner: false, isWritable: false },
    { pubkey: gameWorldPDA,    isSigner: false, isWritable: false },
    { pubkey: OPS_TREASURY_PK, isSigner: false, isWritable: true  },
    { pubkey: solanaWeb3.SystemProgram.programId, isSigner: false, isWritable: false },
  ], data);
  invalidateOwnedCardMints(); // spec §1.4: promote changes the mint's stored rarity
  return sig;
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
// ADMIN-ONLY since the provenance-gate fix: imprints carry battle-stat
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
  const [playerStatePDA] = findPlayerStatePDA(player);  // energy gate (YKK-44)

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
    { pubkey: playerStatePDA, isSigner: false, isWritable: true },
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
  // BUG-1: reveal_hand now verifies the revealer owns each fielded species.
  const [playerStatePDA] = findPlayerStatePDA(player);

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
      { pubkey: duelPDA,        isSigner: false, isWritable: true  },
      { pubkey: player,         isSigner: true,  isWritable: false },
      { pubkey: playerStatePDA, isSigner: false, isWritable: false }, // BUG-1: vault-ownership
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

/// Claim 1 random card from loser's battle field on-chain.
/// The loot pool is derived on-chain from the loser's revealed hands in
/// DuelState — the client no longer supplies (and cannot steer) the field.
/// @param {string|PublicKey} duelId  — unique duel identifier (Pubkey)
/// @param {string}           loserPubkeyStr — loser's wallet address
/// @returns {{ signature: string, stolenCardId: number|null }}
async function claimBattleLoot(duelId, loserPubkeyStr) {
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

  // Borsh: disc(8) + duel_id(Pubkey=32) + loser_pubkey(Pubkey=32).
  // loser_field is no longer an argument — the program derives it from chain.
  const d    = await disc('claim_battle_loot');
  const data = new Uint8Array(8 + 32 + 32);
  let off = writeBytes(data, 0, d);
  off = writeBytes(data, off, duelIdPK.toBytes());
  off = writeBytes(data, off, loserPK.toBytes());

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
  invalidateOwnedCardMints(); // spec §1.4: buyPack adds new mints to the owner

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

export {
  _mbMode,
  setMagicBlockMode,
  buildAndSend,
  buildAndSendMulti,
  buildAndSendViaMagicRouter,
  _fieldToBytes32,
  _g1ToBytes64,
  _g2ToBytes128,
  generateZkProof,
  splitPubkeyForZk,
  registerAgent,
  deactivateAgent,
  createSeason,
  endSeason,
  mintCardWithMetadata,
  delegateSession,
  undelegateSession,
  _LISTINGS_KEY,
  _loadListings,
  _saveListings,
  listCard,
  buyCard,
  cancelListing,
  getListings,
  saveDeck,
  lockDeck,
  registerCard,
  registerWaitlist,
  burnCard,
  promoteCard,
  settleDuelHistory,
  claimTimeoutWin,
  grantImprint,
  claimPrizeV2,
  initDuel,
  commitHand,
  revealHand,
  claimBattleLoot,
  checkLegendaryV2,
  refillEnergy,
  buyPack,
  _getPackCardIds,
  updateShopParams,
  createListing,
  acceptListing,
  cancelListingOnchain,
};

// AUTO-SPLIT from onchain.js (YKK-15) — pure move, function bodies byte-identical.
// See PR: onchain.js -> src/onchain/{pda,readers,tx,rpc}.js + index.js shim.

/**
 * 0xARK On-Chain Transaction Module
 *
 * Handles all Solana transaction building and sending via Phantom wallet.
 * Depends on: solanaWeb3 global (from CDN), window.solana (Phantom).
 *
 * Usage:
 */

// ════ INFRASTRUCTURE ════

const PROGRAM_ID_STR       = '5i37jWBiA7bV9XmokyDWHQxjJ5s1sBnSEkPSB4J2XfmN';
const CARDS_PROGRAM_ID_STR = '236FNPRbJr5W7qeV9fJCYsxDEkruSK6fnNAipf47Mq1S';

// Seed prefixes — must match Anchor program constants
const ENC = new TextEncoder();
const SEED_GAME       = ENC.encode('game');
const SEED_PLAYER     = ENC.encode('player');
const SEED_CARD_POOL  = ENC.encode('card_pool');
const SEED_COMMIT     = ENC.encode('commit');
const SEED_STAKE_VAULT = ENC.encode('stake_vault');

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

async function findPlayerRegistryPDA(playerPubkey) {
  const [pda] = await solanaWeb3.PublicKey.findProgramAddressSync(
    [Buffer.from('player_registry'), playerPubkey.toBytes()],
    new solanaWeb3.PublicKey(PROGRAM_ID_STR)
  );
  return pda;
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

/// Fetch DuelState account and return { winner, endedAt, round }.
/// Used by clients after round-5 reveal to detect duel resolution.
/// @param {string} duelIdStr — base58 Pubkey
// ── F1-0 constants, mirrored from the Rust program (chain is authoritative at
//    spend time; these drive client-side projection/gating only).
//    mirror of solana/oxark/programs/oxark/src/constants.rs
const ENERGY_MAX = 5;                     // constants.rs ENERGY_MAX
const ENERGY_REGEN_SECS = 4 * 3600;       // constants.rs ENERGY_REGEN_INTERVAL_SECONDS (4h)
const DUEL_STALL_TIMEOUT_SECONDS = 600;

// SlotHashes sysvar pubkey (stable across all Solana versions).
const SLOT_HASHES_PUBKEY = new solanaWeb3.PublicKey('SysvarS1otHashes111111111111111111111111111');

// ── Phase 20-B: Shop instructions ────────────────────────────────────────────

const OPS_TREASURY_PK  = new solanaWeb3.PublicKey('GN3aBaUFPpejXBy2u4SgXuwQkkqRFauqAfXNsXhTPz4f');

// ─── Phase 20-C: Trade Floor ──────────────────────────────────────────────────

function findTradeListingPDA(sellerPubkey, cardId) {
  return solanaWeb3.PublicKey.findProgramAddressSync(
    [ENC.encode('trade'), sellerPubkey.toBytes(), new Uint8Array([cardId])],
    getProgramId()
  );
}

export {
  PROGRAM_ID_STR,
  CARDS_PROGRAM_ID_STR,
  ENC,
  SEED_GAME,
  SEED_PLAYER,
  SEED_CARD_POOL,
  SEED_COMMIT,
  SEED_STAKE_VAULT,
  getProgramId,
  _discCache,
  disc,
  writeU8,
  writeU32LE,
  writeU64LE,
  writeI64LE,
  writeBytes,
  writeU16LE,
  writeBool,
  ANCHOR_ERRORS,
  parseAnchorError,
  gameIdBytes,
  findGamePDA,
  findPlayerPDA,
  findCardPoolPDA,
  findCommitPDA,
  findStakeVaultPDA,
  agentIdBytes,
  findAgentPDA,
  seasonIdBytes,
  findSeasonPDA,
  findPlayerStatePDA,
  findGameWorldPDA,
  findPrizePoolPDA,
  findCardBattleHistoryPDA,
  findCardMintRecordPDA,
  findSeasonStatsPDA,
  COMPUTE_BUDGET,
  PRIORITY_FEE_MICRO_LAMPORTS,
  HEAP_FRAME_BYTES,
  requestHeapFrameIx,
  computeBudgetIxs,
  findZkProofRecordPDA,
  computeCommitHash,
  generateSalt,
  SOLO_CARD_SEED,
  SPL_TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  SYSVAR_RENT_PUBKEY,
  TOKEN_METADATA_PROGRAM_ID,
  NFT_CARD_NAMES,
  getCardsProgramId,
  findSoloCardMintPDA,
  findAssociatedTokenAddress,
  findMetadataPDA,
  encodeCreateMetadataV3,
  DELEGATION_PROGRAM_ID_STR,
  _delegationProgramId,
  getDelegationProgramId,
  findDelegationPDAs,
  findPlayerDeckPDA,
  findCardCommitPDA,
  findPlayerRegistryPDA,
  SETTLE_BATCH,
  findDuelSettleRecordPDA,
  findDuelPDA,
  findDuelLootRecordPDA,
  ENERGY_MAX,
  ENERGY_REGEN_SECS,
  DUEL_STALL_TIMEOUT_SECONDS,
  SLOT_HASHES_PUBKEY,
  OPS_TREASURY_PK,
  findTradeListingPDA,
};

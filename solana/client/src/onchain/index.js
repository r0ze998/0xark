// AUTO-SPLIT from onchain.js (YKK-15) — pure move, function bodies byte-identical.
// See PR: onchain.js -> src/onchain/{pda,readers,tx,rpc}.js + index.js shim.

import { CARDS_PROGRAM_ID_STR, DUEL_STALL_TIMEOUT_SECONDS, ENERGY_MAX, ENERGY_REGEN_SECS, PROGRAM_ID_STR, computeCommitHash, findAgentPDA, findCardBattleHistoryPDA, findCardCommitPDA, findDuelLootRecordPDA, findDuelPDA, findDuelSettleRecordPDA, findGamePDA, findGameWorldPDA, findPlayerDeckPDA, findPlayerPDA, findPlayerRegistryPDA, findPlayerStatePDA, findSeasonPDA, findSeasonStatsPDA, findStakeVaultPDA, findTradeListingPDA, findZkProofRecordPDA, generateSalt, parseAnchorError, writeU16LE } from './pda.js';
import { checkPlayerStateExists, fetchAllListings, getCardBattleHistory, getCardMintRecord, getDuelState, getDuelStateFull, getRoundSalts, getGameWorld, getOwnedCardMints, getPlayerState, invalidateOwnedCardMints, readAgentListing, readCardBattleHistoryCreatedAt, readGameAccount, readPlayerState, readSeason } from './readers.js';
import { _mbMode, acceptListing, burnCard, buyCard, buyPack, cancelListingOnchain, checkLegendaryV2, claimBattleLoot, claimPrizeV2, claimTimeoutWin, commitHand, createListing, createSeason, deactivateAgent, delegateSession, endSeason, generateZkProof, getListings, grantImprint, initDuel, listCard, lockDeck, mintCardWithMetadata, promoteCard, refillEnergy, registerAgent, registerCard, registerWaitlist, revealHand, saveDeck, setMagicBlockMode, settleDuelHistory, splitPubkeyForZk, undelegateSession, updateShopParams } from './tx.js';

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
  // Core game instructions
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
  // F1-0 — onchain.js reader plumbing
  getDuelStateFull,
  getRoundSalts,
  getCardMintRecord,
  getOwnedCardMints,
  invalidateOwnedCardMints,
  getCardBattleHistory,
  ENERGY_MAX,
  ENERGY_REGEN_SECS,
  DUEL_STALL_TIMEOUT_SECONDS,
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

// ── F1-0 acceptance: dev-only readers dump. Compare against `solana account`
//    dumps of the same PDAs on a local validator (spec §1 acceptance). Stripped
//    in a later PR. Usage: await window.__oxarkDebugReaders({ duelId, mint, player })
window.__oxarkDebugReaders = async ({ duelId, mint, player } = {}) => {
  const w = player ?? window.oxarkWallet?.getPublicKey?.()?.toString?.();
  const out = {};
  try {
    if (w)      out.playerState       = await getPlayerState(w);
    if (duelId) out.duelStateFull     = await getDuelStateFull(duelId);
    if (mint) {
      out.cardMintRecord    = await getCardMintRecord(mint);
      out.cardBattleHistory = await getCardBattleHistory(mint);
    }
    out.ownedCardMints = Object.fromEntries(await getOwnedCardMints());
  } catch (e) { out.error = String(e?.stack ?? e); }
  console.log('[__oxarkDebugReaders]', out);
  return out;
};

console.log('[0xARK] onchain module loaded. Program:', PROGRAM_ID_STR);

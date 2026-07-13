// AUTO-SPLIT from onchain.js (YKK-15) — pure move, function bodies byte-identical.
// See PR: onchain.js -> src/onchain/{pda,readers,tx,rpc}.js + index.js shim.

import { SPL_TOKEN_PROGRAM_ID, disc, findAgentPDA, findCardBattleHistoryPDA, findCardMintRecordPDA, findDuelPDA, findGamePDA, findGameWorldPDA, findPlayerPDA, findPlayerStatePDA, findSeasonPDA, getProgramId } from './pda.js';
import { getConnection } from './rpc.js';

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
}   // constants.rs DUEL_STALL_TIMEOUT_SECONDS

// ── F1-0: full DuelState reader. Offsets RE-DERIVED from state.rs `DuelState`
//    (SIZE 1624), NOT the old comment block — which had winner/started_at/
//    ended_at in the wrong order and returned a garbage winner/endedAt.
//    After the 8-byte disc:
//      id@8 p1@40 p2@72 hall_tier@104 round@105 phase@106 ante@107
//      started_at@115 ended_at@123 winner@131
//      p1_commit@163 p2_commit@323 ([u8;32]×5)
//      p1_reveal@483 p2_reveal@883 ([u64;10]×5 = 80 bytes/round)
//      p1_round_wins@1614 p2_round_wins@1615 last_progress_at@1616
async function getDuelStateFull(duelIdStr) {
  const duelIdPK = new solanaWeb3.PublicKey(duelIdStr);
  const [duelPDA] = findDuelPDA(duelIdPK);
  const info = await getConnection().getAccountInfo(duelPDA);
  if (!info) return null;
  const d = info.data;
  const dv = new DataView(d.buffer, d.byteOffset, d.byteLength);
  const b58 = (o) => new solanaWeb3.PublicKey(d.slice(o, o + 32)).toBase58();
  const i64 = (o) => Number(dv.getBigInt64(o, true));
  const nonZero = (o, len) => { for (let i = 0; i < len; i++) if (d[o + i] !== 0) return true; return false; };

  const P1_COMMIT = 163, P2_COMMIT = 323;   // [[u8;32];5]
  const P1_REVEAL = 483, P2_REVEAL = 883;   // [[u64;10];5], 80 bytes/round
  const committed = [], revealed = [];      // [round0..4][ p1, p2 ]
  for (let r = 0; r < 5; r++) {
    committed.push([nonZero(P1_COMMIT + r * 32, 32), nonZero(P2_COMMIT + r * 32, 32)]);
    revealed.push([nonZero(P1_REVEAL + r * 80, 80), nonZero(P2_REVEAL + r * 80, 80)]);
  }
  return {
    player1: b58(40), player2: b58(72),
    round: d[105],
    p1RoundWins: d[1614], p2RoundWins: d[1615],
    winner: b58(131), startedAt: i64(115), endedAt: i64(123),
    lastProgressAt: i64(1616),
    committed, revealed,
  };
}

// Back-compat thin wrapper over getDuelStateFull (fixes the old winner/endedAt bug).
async function getDuelState(duelIdStr) {
  const full = await getDuelStateFull(duelIdStr);
  return full ? { winner: full.winner, endedAt: full.endedAt, round: full.round } : null;
}

// ── F1-0: CardMintRecord → { cardId, rarity }. state.rs: disc8 + card_mint@8 +
//    card_id@40 + rarity@41.
async function getCardMintRecord(mintStr) {
  const [pda] = findCardMintRecordPDA(new solanaWeb3.PublicKey(mintStr));
  const info = await getConnection().getAccountInfo(pda);
  if (!info) return null;
  const d = info.data;
  return { cardId: d[40], rarity: d[41] };
}

// ── F1-0: enumerate the wallet's owned card mints (amount 1, decimals 0),
//    resolve each to its CardMintRecord, group by cardId. Session-cached; call
//    invalidateOwnedCardMints() after buyPack / burn / promote / (future) steal.
let _ownedCardMintsCache = null;
function invalidateOwnedCardMints() { _ownedCardMintsCache = null; }
async function getOwnedCardMints() {
  if (_ownedCardMintsCache) return _ownedCardMintsCache;
  const wallet = window.oxarkWallet?.getPublicKey?.();
  if (!wallet) return new Map();
  const conn = getConnection();
  const ownerPK = typeof wallet === 'string' ? new solanaWeb3.PublicKey(wallet) : wallet;
  const resp = await conn.getParsedTokenAccountsByOwner(
    ownerPK, { programId: new solanaWeb3.PublicKey(SPL_TOKEN_PROGRAM_ID) });
  const mints = resp.value
    .map(a => a.account.data.parsed?.info)
    .filter(i => i && i.tokenAmount?.amount === '1' && i.tokenAmount?.decimals === 0)
    .map(i => i.mint);
  const recordPDAs = mints.map(m => findCardMintRecordPDA(new solanaWeb3.PublicKey(m))[0]);
  const infos = recordPDAs.length ? await conn.getMultipleAccountsInfo(recordPDAs) : [];
  const map = new Map(); // cardId -> [{ mint, rarity }]  (multiple copies possible)
  infos.forEach((info, i) => {
    if (!info) return;                     // token not a card mint (no record)
    const cardId = info.data[40], rarity = info.data[41];
    if (!map.has(cardId)) map.set(cardId, []);
    map.get(cardId).push({ mint: mints[i], rarity });
  });
  _ownedCardMintsCache = map;
  return map;
}

// ── F1-0: full CardBattleHistory decode (scalar fields; lease_* skipped).
//    state.rs `CardBattleHistory` (LEN 636), after 8-byte disc:
//      card_mint@8 wins@40 losses@44 kos@48 dmg_dealt@52 times_summoned@60
//      owners_history@64 owners_history_len@384 owners_dropped@385 acq_source@389
//      current_owner_since@390 created_at@398 bump@406
//      burn_count@407 souls@411 legendary_kills@415
//      imprints@419 ([Imprint;5], 22 bytes each) imprint_count@529
async function getCardBattleHistory(mintStr) {
  const [pda] = findCardBattleHistoryPDA(new solanaWeb3.PublicKey(mintStr));
  const info = await getConnection().getAccountInfo(pda);
  if (!info) return null;
  const d = info.data;
  const dv = new DataView(d.buffer, d.byteOffset, d.byteLength);
  const IMP = 419, IMP_SIZE = 22;          // Imprint: key u8@0, value i32@1, is_cosmetic@5, acquired_at i64@6, duel_id u64@14
  const imprintCount = d[529];
  const imprints = [];
  for (let i = 0; i < imprintCount && i < 5; i++) {
    const o = IMP + i * IMP_SIZE;
    imprints.push({ key: d[o], value: dv.getInt32(o + 1, true), isCosmetic: d[o + 5] === 1 });
  }
  return {
    wins: dv.getUint32(40, true),
    losses: dv.getUint32(44, true),
    kos: dv.getUint32(48, true),
    dmgDealt: Number(dv.getBigUint64(52, true)),
    timesSummoned: dv.getUint32(60, true),
    ownersHistoryCount: d[384],
    ownersDroppedCount: dv.getUint32(385, true),
    acquisitionSource: d[389],
    legendaryKills: dv.getUint32(415, true),
    imprints,
  };
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
  // F1-0: energy fields are the LAST two of PlayerState, so they sit at a fixed
  // offset from vaultOff (which already absorbs the current_queue Option shift):
  //   from vaultOff: vault_bitmap(8) deposit(8) +5 u8 + x402(8) + peek(8) +1 u8
  //   + legendary_progress(6) +2 u8 + last_drop_ts(8) → energy@+54, regen_ts@+55.
  const energy = d[vaultOff + 54];
  const energyLastTs = Number(dv.getBigInt64(vaultOff + 55, true));
  return { vault, vault_count: vault.length, deposit_amount: deposit, energy, energyLastTs };
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

export {
  readGameRound,
  readCardBattleHistoryCreatedAt,
  readAgentListing,
  readSeason,
  readGameAccount,
  readPlayerState,
  checkPlayerStateExists,
  getDuelStateFull,
  getDuelState,
  getCardMintRecord,
  _ownedCardMintsCache,
  invalidateOwnedCardMints,
  getOwnedCardMints,
  getCardBattleHistory,
  fetchAllListings,
  getPlayerState,
  getGameWorld,
};

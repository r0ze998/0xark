/**
 * 0xARK x402 Information Broker Agent
 *
 * Sells game intelligence via x402 micropayments (USDC on Solana).
 * Players pay to learn rival positions, card holdings, and strategy.
 *
 * GDD v1.0: 60 unique cards, 5 dungeon floors (B1-B5), rivals VEGA & MIRA.
 *
 * Endpoints:
 *   GET  /intel/location/:playerId  — $0.002 USDC — Rival floor position
 *   GET  /intel/hand/:playerId      — $0.003 USDC — Rival card holdings
 *   GET  /intel/strategy            — $0.005 USDC — Optimal next action
 *   GET  /intel/market              — free         — Card pool status
 *   GET  /status                    — free         — Endpoint catalog
 *   GET  /health                    — free         — Health check
 *   POST /update-state              — free         — Push game state from client
 */

import express from 'express';
import { Connection, PublicKey } from '@solana/web3.js';

const app = express();
const PORT = process.env.PORT || 3402;

const RECIPIENT_WALLET = process.env.BROKER_WALLET || 'DPMPhnVezSq5im35p4w3bC6XjpNZuuvCDVSAVxw4Q28R';
const DEVNET_RPC = process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com';
const PROGRAM_ID = new PublicKey('5i37jWBiA7bV9XmokyDWHQxjJ5s1sBnSEkPSB4J2XfmN');

// Scout peek price: 0.005 SOL = 5_000_000 lamports
const SCOUT_PEEK_LAMPORTS = 5_000_000;
// Agent hire price: 0.05 SOL = 50_000_000 lamports
const AGENT_HIRE_LAMPORTS = 50_000_000;

// PlayerState layout (Anchor default, no padding beyond field sizes)
// [0..8]=discriminator [8..16]=game_id [16..48]=player [48]=player_index
// [49]=area [50..55]=cards[5] [55]=card_count ... [136..168]=position_commitment [168]=initialized
const PS_CARDS_OFFSET = 50;
const PS_AREA_OFFSET = 49;
const PS_CARD_COUNT_OFFSET = 55;
const CARD_TYPE_NAMES = ['', 'Crystal', 'Shadow', 'Inferno', 'Gale', 'Tidal'];

// Single cached connection — avoids creating a new Connection object per payment request
const connection = new Connection(DEVNET_RPC, 'confirmed');

// Replay protection — cap at 10k entries to prevent unbounded growth (demo/devnet only)
const usedSignatures = new Set();
const MAX_SIG_CACHE = 10000;
function trackSignature(sig) {
  if (usedSignatures.size >= MAX_SIG_CACHE) {
    // Evict oldest ~1k entries (Set preserves insertion order)
    let evicted = 0;
    for (const s of usedSignatures) {
      usedSignatures.delete(s);
      if (++evicted >= 1000) break;
    }
  }
  usedSignatures.add(sig);
}

// ═══════════════════════════════════════
// GAME STATE (updated by POST /update-state)
// ═══════════════════════════════════════

const FLOOR_NAMES = { 0: 'Town', 1: 'B1', 2: 'B2', 3: 'B3', 4: 'B4', 5: 'B5' };
const FLOOR_RARITY = {
  0: 'Town (no drops)',
  1: 'Starter set — 10 cards (all 5 types)',
  2: 'Advanced set — 10 cards (all 5 types)',
  3: 'Expert set — 16 cards (all 5 types)',
  4: 'Elite set — 12 cards (all 5 types)',
  5: 'Legendary set — 12 cards incl. AEGIS & UMBRA',
};

let gameState = {
  players: [
    { id: 0, name: 'Player', area: 0, cards: new Array(60).fill(0), cardCount: 0 },
    { id: 1, name: 'VEGA',   area: 0, cards: new Array(60).fill(0), cardCount: 0 },
    { id: 2, name: 'MIRA',   area: 0, cards: new Array(60).fill(0), cardCount: 0 },
  ],
  currentMap: 0,
  rivalMaps: [0, 0],
  round: 0,
  _lastUpdate: null,
};

// ═══════════════════════════════════════
// MIDDLEWARE
// ═══════════════════════════════════════

app.use(express.json());
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Payment');
  res.setHeader('Access-Control-Expose-Headers', 'X-Payment-Required');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

// ═══════════════════════════════════════
// x402 PAYMENT VERIFICATION
// ═══════════════════════════════════════

/**
 * Verify a Solana tx signature confirms a USDC transfer >= expectedAmountUSDC
 * to RECIPIENT_WALLET. Prevents replay via usedSignatures set.
 * Dev bypass: X-Payment: local-dev-bypass
 */
async function verifyPayment(signature, expectedAmountUSDC) {
  if (signature === 'local-dev-bypass') return { ok: true, simulated: true };
  if (usedSignatures.has(signature)) {
    return { ok: false, reason: 'Signature already used (replay attempt)' };
  }
  try {
    const tx = await connection.getParsedTransaction(signature, {
      commitment: 'confirmed',
      maxSupportedTransactionVersion: 0,
    });
    if (!tx) return { ok: false, reason: 'Transaction not found on devnet' };
    if (tx.meta?.err) return { ok: false, reason: 'Transaction failed on-chain' };

    // Scan for SPL token transfer >= expectedAmount TO RECIPIENT_WALLET
    const ixs = tx.transaction.message.instructions;
    for (const ix of ixs) {
      const t = ix.parsed?.type;
      if (t === 'transfer' || t === 'transferChecked') {
        const info = ix.parsed.info;
        // Verify funds actually went to our wallet (prevent spoofed transfers)
        const dest = info.destination ?? info.newAuthority ?? '';
        if (!dest.includes(RECIPIENT_WALLET)) continue;
        const decimals = info.tokenAmount?.decimals ?? 6;
        const raw = Number(info.amount ?? info.tokenAmount?.amount ?? 0);
        const amountUSDC = raw / Math.pow(10, decimals);
        if (amountUSDC >= expectedAmountUSDC) {
          trackSignature(signature);
          return { ok: true, amount: amountUSDC };
        }
      }
    }
    return { ok: false, reason: `No USDC transfer >= $${expectedAmountUSDC} to broker wallet found` };
  } catch (e) {
    return { ok: false, reason: 'RPC error: ' + e.message };
  }
}

function requirePayment(amountUSDC, description) {
  return async (req, res, next) => {
    if (amountUSDC <= 0) return next();
    const payment = req.headers['x-payment'];
    if (!payment) {
      const payload = {
        version: 1,
        scheme: 'exact',
        network: 'solana-devnet',
        amount: amountUSDC,
        currency: 'USDC',
        recipient: RECIPIENT_WALLET,
        description,
      };
      res.setHeader('X-Payment-Required', JSON.stringify(payload));
      return res.status(402).json({ error: 'Payment Required', x402: payload });
    }
    const result = await verifyPayment(payment, amountUSDC);
    if (!result.ok) {
      return res.status(402).json({ error: 'Payment verification failed', reason: result.reason });
    }
    if (!result.simulated) {
      console.log(`[x402] Verified $${amountUSDC} USDC for "${description}"`);
    }
    next();
  };
}

// ═══════════════════════════════════════
// STRATEGY ENGINE (GDD v1.0 — 60 cards)
// ═══════════════════════════════════════

function uniqueCards(cards) {
  return new Set(cards.filter(c => c > 0));
}

function analyzeStrategy(requesterId = 0) {
  const me = gameState.players[requesterId];
  if (!me) return { error: 'Player not found' };

  const myFloor = requesterId === 0
    ? gameState.currentMap
    : (gameState.rivalMaps[requesterId - 1] ?? 0);
  const myUnique = uniqueCards(me.cards).size;
  const toWin = 60 - myUnique;

  // Optimal floor for collection progress
  let targetFloor = 1;
  if (myUnique >= 48) targetFloor = 5;
  else if (myUnique >= 36) targetFloor = 4;
  else if (myUnique >= 24) targetFloor = 3;
  else if (myUnique >= 12) targetFloor = 2;

  const rivals = gameState.players
    .filter((_, i) => i !== requesterId)
    .map((p, idx) => {
      const rIdx = requesterId === 0 ? idx : (idx >= requesterId - 1 ? idx + 1 : idx);
      const floor = p.id === 0
        ? gameState.currentMap
        : (gameState.rivalMaps[p.id - 1] ?? 0);
      return { ...p, floor, unique: uniqueCards(p.cards).size };
    });

  const sameFloor = rivals.filter(r => r.floor === myFloor);
  const leader = [...rivals].sort((a, b) => b.unique - a.unique)[0];

  // Determine best action
  let action, reasoning, confidence;

  if (sameFloor.length > 0) {
    const threat = sameFloor.sort((a, b) => b.unique - a.unique)[0];
    if (myUnique >= 55) {
      action = 'BARRIER';
      reasoning = `You have ${myUnique}/60 — protect your progress. ${threat.name} on same floor.`;
      confidence = 0.90;
    } else if (threat.unique <= myUnique - 5) {
      action = 'DRAW';
      reasoning = `${threat.name} is far behind (${threat.unique}). Draw freely on ${FLOOR_NAMES[myFloor]}.`;
      confidence = 0.80;
    } else if (threat.unique > myUnique) {
      action = 'STEAL';
      reasoning = `${threat.name} leads (${threat.unique} vs ${myUnique}). Steal to catch up.`;
      confidence = 0.70;
    } else {
      action = 'DRAW';
      reasoning = `${threat.name} nearby. Draw — ${FLOOR_RARITY[myFloor]}.`;
      confidence = 0.65;
    }
  } else if (myFloor !== targetFloor) {
    action = 'MOVE';
    reasoning = `No rivals on this floor. Move to ${FLOOR_NAMES[targetFloor]} for ${FLOOR_RARITY[targetFloor]}.`;
    confidence = 0.85;
  } else {
    action = 'DRAW';
    reasoning = `Clear floor. Draw — ${FLOOR_RARITY[myFloor]}. ${toWin} cards to go.`;
    confidence = 0.90;
  }

  // Rival behavior predictions (VEGA = aggressive, MIRA = strategic)
  const predictions = rivals.map(r => {
    const isVEGA = r.name === 'VEGA';
    const isAhead = r.unique > myUnique;
    const predicted = isVEGA
      ? (isAhead ? 'BARRIER' : 'STEAL')
      : (r.floor >= 4 ? 'DRAW' : 'SCOUT');
    return {
      name: r.name,
      floor: FLOOR_NAMES[r.floor] ?? `B${r.floor}`,
      uniqueCards: r.unique,
      sameFloor: r.floor === myFloor,
      predictedAction: predicted,
      threat: r.floor === myFloor ? 'HIGH' : 'LOW',
    };
  });

  return {
    round: gameState.round,
    yourUniqueCards: myUnique,
    toWin,
    currentFloor: FLOOR_NAMES[myFloor] ?? `B${myFloor}`,
    recommendedFloor: FLOOR_NAMES[targetFloor] ?? `B${targetFloor}`,
    recommendedAction: action,
    reasoning,
    confidence,
    rivals: predictions,
    leaderGap: leader ? leader.unique - myUnique : 0,
    timestamp: Date.now(),
  };
}

// ═══════════════════════════════════════
// ENDPOINTS
// ═══════════════════════════════════════

app.get('/intel/location/:playerId',
  requirePayment(0.002, 'Rival floor position'),
  (req, res) => {
    const pid = parseInt(req.params.playerId, 10);
    if (isNaN(pid) || pid < 0 || pid > 2) return res.status(400).json({ error: 'playerId must be 0, 1, or 2' });
    const p = gameState.players[pid];
    if (!p) return res.status(404).json({ error: 'Player not found' });
    const floor = pid === 0
      ? gameState.currentMap
      : (gameState.rivalMaps[pid - 1] ?? 0);
    res.json({
      playerId: pid,
      name: p.name,
      floor,
      floorName: FLOOR_NAMES[floor] ?? `B${floor}`,
      floorDrops: FLOOR_RARITY[floor] ?? 'Unknown',
      timestamp: Date.now(),
    });
  }
);

app.get('/intel/hand/:playerId',
  requirePayment(0.003, 'Rival card holdings'),
  (req, res) => {
    const pid = parseInt(req.params.playerId, 10);
    if (isNaN(pid) || pid < 0 || pid > 2) return res.status(400).json({ error: 'playerId must be 0, 1, or 2' });
    const p = gameState.players[pid];
    if (!p) return res.status(404).json({ error: 'Player not found' });
    const held = p.cards
      .map((v, i) => ({ slot: i, cardId: v }))
      .filter(c => c.cardId > 0);
    res.json({
      playerId: pid,
      name: p.name,
      uniqueCount: uniqueCards(p.cards).size,
      totalHeld: held.length,
      cards: held,
      timestamp: Date.now(),
    });
  }
);

app.get('/intel/strategy',
  requirePayment(0.005, 'Strategic analysis'),
  (req, res) => {
    const pid = parseInt(req.query.player ?? '0', 10);
    if (isNaN(pid) || pid < 0 || pid > 2) return res.status(400).json({ error: 'player must be 0, 1, or 2' });
    const result = analyzeStrategy(pid);
    // Warn caller if state is stale (>2 minutes since last /update-state)
    const staleMs = gameState._lastUpdate ? Date.now() - gameState._lastUpdate : Infinity;
    if (staleMs > 120_000) {
      result.warning = `State is ${Math.round(staleMs / 1000)}s old — client may not have synced recently`;
    }
    res.json(result);
  }
);

app.get('/intel/market', (req, res) => {
  const heldCount = new Array(61).fill(0);
  for (const p of gameState.players) {
    for (const c of p.cards) { if (c > 0 && c <= 60) heldCount[c]++; }
  }
  const pool = Array.from({ length: 60 }, (_, i) => ({
    cardId: i + 1,
    heldByPlayers: heldCount[i + 1],
    available: heldCount[i + 1] === 0,
    floor: Math.min(5, Math.ceil((i + 1) / 12)),
  }));
  res.json({
    round: gameState.round,
    totalCards: 60,
    availableCards: pool.filter(c => c.available).length,
    byFloor: [1, 2, 3, 4, 5].map(f => ({
      floor: FLOOR_NAMES[f],
      available: pool.filter(c => c.floor === f && c.available).length,
      total: 12,
    })),
    pool,
    timestamp: Date.now(),
  });
});

app.get('/status', (req, res) => {
  res.json({
    agent: '0xARK Information Broker v1.0',
    network: 'solana-devnet',
    recipient: RECIPIENT_WALLET,
    endpoints: [
      { path: 'POST /scout-peek',    price: '0.005 SOL',    desc: 'Peek one on-chain card from target player' },
      { path: 'POST /agent-hire',    price: '0.05 SOL',     desc: 'Hire AI agent for auto-play session' },
      { path: 'POST /card-buy',      price: '0.01 SOL fee', desc: 'x402 P2P card marketplace purchase' },
      { path: '/intel/location/:id', price: '$0.002 USDC',  desc: 'Rival floor position' },
      { path: '/intel/hand/:id',     price: '$0.003 USDC',  desc: 'Rival card holdings' },
      { path: '/intel/strategy',     price: '$0.005 USDC',  desc: 'Strategic analysis' },
      { path: '/intel/market',       price: 'free',          desc: 'Card pool status (60 cards)' },
    ],
    stateAge: gameState._lastUpdate
      ? `${Math.round((Date.now() - gameState._lastUpdate) / 1000)}s ago`
      : 'using defaults',
    timestamp: Date.now(),
  });
});

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    agent: '0xARK Information Broker v1.0',
    hasLiveState: !!gameState._lastUpdate,
    rivalFloors: {
      VEGA: FLOOR_NAMES[gameState.rivalMaps[0]] ?? 'unknown',
      MIRA: FLOOR_NAMES[gameState.rivalMaps[1]] ?? 'unknown',
    },
  });
});

app.post('/update-state', (req, res) => {
  const body = req.body;
  if (!body || !Array.isArray(body.players)) {
    return res.status(400).json({ error: 'players array required' });
  }
  gameState = {
    ...gameState,
    players: body.players.map(p => ({
      ...p,
      cards: Array.isArray(p.cards) ? p.cards : new Array(60).fill(0),
    })),
    currentMap: body.currentMap ?? gameState.currentMap,
    rivalMaps: Array.isArray(body.rivalMaps) ? body.rivalMaps : gameState.rivalMaps,
    round: body.round ?? gameState.round,
    _lastUpdate: Date.now(),
  };
  console.log(`[state] round=${gameState.round} playerFloor=${gameState.currentMap} VEGA=B${gameState.rivalMaps[0]} MIRA=B${gameState.rivalMaps[1]}`);
  res.json({ status: 'ok', round: gameState.round });
});

// ═══════════════════════════════════════
// SOL PAYMENT VERIFICATION
// ═══════════════════════════════════════

/**
 * Verify a native SOL transfer >= minLamports to RECIPIENT_WALLET.
 * Dev bypass: X-Payment: local-dev-bypass
 */
async function verifySolPayment(signature, minLamports) {
  if (signature === 'local-dev-bypass') return { ok: true, simulated: true };
  if (usedSignatures.has(signature)) {
    return { ok: false, reason: 'Signature already used (replay attempt)' };
  }
  try {
    const tx = await connection.getParsedTransaction(signature, {
      commitment: 'confirmed',
      maxSupportedTransactionVersion: 0,
    });
    if (!tx) return { ok: false, reason: 'Transaction not found on devnet' };
    if (tx.meta?.err) return { ok: false, reason: 'Transaction failed on-chain' };

    // Check native SOL balance change for RECIPIENT_WALLET
    const recipientPk = new PublicKey(RECIPIENT_WALLET);
    const keys = tx.transaction.message.accountKeys;
    for (let i = 0; i < keys.length; i++) {
      if (keys[i].pubkey.equals(recipientPk)) {
        const pre = tx.meta.preBalances[i] ?? 0;
        const post = tx.meta.postBalances[i] ?? 0;
        const received = post - pre;
        if (received >= minLamports) {
          trackSignature(signature);
          return { ok: true, lamports: received };
        }
      }
    }
    return {
      ok: false,
      reason: `No SOL transfer >= ${minLamports} lamports to broker wallet found`,
    };
  } catch (e) {
    return { ok: false, reason: 'RPC error: ' + e.message };
  }
}

// ═══════════════════════════════════════
// ON-CHAIN PLAYER STATE READER
// ═══════════════════════════════════════

function playerStatePda(gameId, playerPubkey) {
  const idBuf = Buffer.alloc(8);
  idBuf.writeBigUInt64LE(BigInt(gameId));
  const [pda] = PublicKey.findProgramAddressSync(
    [Buffer.from('player'), idBuf, playerPubkey.toBuffer()],
    PROGRAM_ID,
  );
  return pda;
}

async function fetchPlayerCards(gameId, targetPubkey) {
  const pda = playerStatePda(gameId, targetPubkey);
  const info = await connection.getAccountInfo(pda, 'confirmed');
  if (!info) return null;
  const data = info.data;
  if (data.length < PS_CARD_COUNT_OFFSET + 1) return null;

  const area = data[PS_AREA_OFFSET];
  const cardCount = data[PS_CARD_COUNT_OFFSET];
  const cards = Array.from(data.slice(PS_CARDS_OFFSET, PS_CARDS_OFFSET + 5))
    .filter(c => c > 0)
    .map(c => ({ id: c, name: CARD_TYPE_NAMES[c] ?? `Type${c}` }));

  return { pda: pda.toBase58(), area, cardCount, cards };
}

// ═══════════════════════════════════════
// /scout-peek  (POST, 0.005 SOL)
// ═══════════════════════════════════════

/**
 * POST /scout-peek
 * Body: { game_id: number|string, target_pubkey: string }
 * Header: X-Payment: <solana_tx_sig>  (or "local-dev-bypass" for dev)
 *
 * Returns one card ID from the target player's on-chain PlayerState.
 * 402 if no / invalid payment.
 */
app.post('/scout-peek', async (req, res) => {
  const payment = req.headers['x-payment'];
  if (!payment) {
    const payload = {
      version: 1,
      scheme: 'exact',
      network: 'solana-devnet',
      amount: SCOUT_PEEK_LAMPORTS,
      currency: 'SOL',
      recipient: RECIPIENT_WALLET,
      description: 'Scout peek - reveal one card from target player',
    };
    res.setHeader('X-Payment-Required', JSON.stringify(payload));
    return res.status(402).json({ error: 'Payment Required', x402: payload });
  }

  const result = await verifySolPayment(payment, SCOUT_PEEK_LAMPORTS);
  if (!result.ok) {
    return res.status(402).json({ error: 'Payment verification failed', reason: result.reason });
  }

  const { game_id, target_pubkey } = req.body ?? {};
  if (!game_id || !target_pubkey) {
    return res.status(400).json({ error: 'game_id and target_pubkey required' });
  }

  let targetPk;
  try {
    targetPk = new PublicKey(target_pubkey);
  } catch {
    return res.status(400).json({ error: 'Invalid target_pubkey' });
  }

  const state = await fetchPlayerCards(Number(game_id), targetPk).catch(e => null);
  if (!state) {
    return res.status(404).json({ error: 'PlayerState not found for given game_id + target_pubkey' });
  }

  if (state.cards.length === 0) {
    return res.json({
      revealed: null,
      message: 'Target player holds no cards',
      area: state.area,
      timestamp: Date.now(),
    });
  }

  // Reveal the first card (index 0) — deterministic, payer gets one peek per payment
  const revealed = state.cards[0];
  if (!result.simulated) {
    console.log(`[scout-peek] game=${game_id} target=${target_pubkey.slice(0, 8)}... → card ${revealed.id} (${revealed.name})`);
  }

  res.json({
    revealed,
    totalCards: state.cardCount,
    area: state.area,
    pda: state.pda,
    timestamp: Date.now(),
  });
});

// ═══════════════════════════════════════
// /agent-hire  (POST, 0.05 SOL)
// ═══════════════════════════════════════

/**
 * POST /agent-hire
 * Body: { game_id: number|string, agent_id: number, duration_seconds: number, hirer_pubkey: string }
 * Header: X-Payment: <solana_tx_sig>  (or "local-dev-bypass" for dev)
 *
 * Returns { hire_session_id, agent_id, expires_at, agent_endpoint, payment_sig }
 * Caller should then submit `register_agent_hire` instruction on-chain with payment_sig.
 */
app.post('/agent-hire', async (req, res) => {
  const payment = req.headers['x-payment'];
  if (!payment) {
    const payload = {
      version: 1,
      scheme: 'exact',
      network: 'solana-devnet',
      amount: AGENT_HIRE_LAMPORTS,
      currency: 'SOL',
      recipient: RECIPIENT_WALLET,
      description: 'Agent hire — 0.05 SOL/session for AI auto-play',
    };
    res.setHeader('X-Payment-Required', JSON.stringify(payload));
    return res.status(402).json({ error: 'Payment Required', x402: payload });
  }

  const result = await verifySolPayment(payment, AGENT_HIRE_LAMPORTS);
  if (!result.ok) {
    return res.status(402).json({ error: 'Payment verification failed', reason: result.reason });
  }

  const { game_id, agent_id, duration_seconds = 3600, hirer_pubkey } = req.body ?? {};
  if (!hirer_pubkey || agent_id == null) {
    return res.status(400).json({ error: 'agent_id and hirer_pubkey required' });
  }

  const agentIdNum = Number(agent_id);
  const durationSec = Number(duration_seconds);
  if (!Number.isInteger(agentIdNum) || agentIdNum < 0) {
    return res.status(400).json({ error: 'agent_id must be a non-negative integer' });
  }
  if (!Number.isInteger(durationSec) || durationSec <= 0) {
    return res.status(400).json({ error: 'duration_seconds must be a positive integer' });
  }

  const startedAt = Math.floor(Date.now() / 1000);
  const expiresAt = startedAt + durationSec;

  // hire_session_id: deterministic from hirer + agent_id (matching on-chain PDA)
  const hireSessionId = `hire_${hirer_pubkey.slice(0, 8)}_agent${agentIdNum}`;

  if (!result.simulated) {
    console.log(`[agent-hire] hirer=${hirer_pubkey.slice(0, 8)} agent=${agentIdNum} duration=${durationSec}s expires=${expiresAt} tx=${payment.slice(0, 12)}..`);
  }

  res.json({
    hire_session_id: hireSessionId,
    agent_id: agentIdNum,
    game_id: game_id ?? null,
    hirer_pubkey,
    started_at: startedAt,
    expires_at: expiresAt,
    // Caller submits register_agent_hire on-chain with this tx as payment_tx bytes
    payment_sig: result.simulated ? 'local-dev-bypass' : payment,
    // Agent endpoint is published by agent owner (hash stored on-chain, URL off-chain)
    agent_endpoint: `http://localhost:${PORT}/agent/${agentIdNum}`,
    message: 'Call register_agent_hire on-chain with payment_sig to finalize the session.',
  });
});

// ═══════════════════════════════════════
// /card-buy  (POST, price set by seller listing)
// ═══════════════════════════════════════

// Card buy price: 0.01 SOL minimum facilitator fee (seller sets card price separately)
const CARD_BUY_MIN_LAMPORTS = 10_000_000; // 0.01 SOL facilitator fee

/**
 * POST /card-buy
 *
 * x402 flow for P2P card purchases:
 *   1. Probe → 402 + X-Payment-Required (facilitator fee = 0.01 SOL)
 *   2. Pay facilitator fee
 *   3. Retry with X-Payment → sale session details
 *
 * Body: { card_id, seller_pubkey, buyer_pubkey, price_lamports }
 * Returns: { sale_session_id, card_id, seller_pubkey, buyer_pubkey,
 *            price_lamports, payment_sig, sold_at }
 *
 * Note: On-chain SOL transfer (seller payment) is handled client-side
 * by calling buy_card on the oxark-cards program. The facilitator fee
 * covers broker verification cost.
 */
app.post('/card-buy', async (req, res) => {
  const payment = req.headers['x-payment'];
  const isDev   = payment === 'local-dev-bypass';

  const body = req.body ?? {};
  const { card_id, seller_pubkey, buyer_pubkey, price_lamports } = body;

  if (!card_id || !seller_pubkey || !buyer_pubkey) {
    return res.status(400).json({ error: 'card_id, seller_pubkey, buyer_pubkey required' });
  }

  const cardIdNum = parseInt(card_id, 10);
  if (isNaN(cardIdNum) || cardIdNum < 1 || cardIdNum > 60) {
    return res.status(400).json({ error: 'card_id must be 1-60' });
  }

  // ── Step 1: No payment → return 402 ────────────────────────────────────
  if (!payment) {
    return res.status(402)
      .set('X-Payment-Required', JSON.stringify({
        protocol:  'x402',
        network:   'solana-devnet',
        recipient: RECIPIENT_WALLET,
        amount:    CARD_BUY_MIN_LAMPORTS,
        memo:      `card-buy:${cardIdNum}:${seller_pubkey.slice(0, 8)}`,
      }))
      .json({ reason: 'Payment required', amount_lamports: CARD_BUY_MIN_LAMPORTS });
  }

  // ── Dev bypass ──────────────────────────────────────────────────────────
  if (isDev) {
    const soldAt = Math.floor(Date.now() / 1000);
    console.log(`[card-buy] DEV bypass: card=${cardIdNum} seller=${seller_pubkey.slice(0,8)} buyer=${buyer_pubkey.slice(0,8)}`);
    return res.json({
      sale_session_id: `sale_${buyer_pubkey.slice(0,8)}_card${cardIdNum}`,
      card_id:         cardIdNum,
      seller_pubkey,
      buyer_pubkey,
      price_lamports:  price_lamports ?? 0,
      payment_sig:     'local-dev-bypass',
      sold_at:         soldAt,
      message:         'Call buy_card on-chain with payment_sig to finalize.',
    });
  }

  // ── Live payment verification ───────────────────────────────────────────
  if (usedSignatures.has(payment)) {
    return res.status(402).json({ reason: 'Payment signature already used (replay)' });
  }

  try {
    const result = await verifySolPayment(payment, RECIPIENT_WALLET, CARD_BUY_MIN_LAMPORTS);
    if (!result.valid) {
      return res.status(402).json({ reason: result.reason });
    }

    trackSignature(payment);
    const soldAt = Math.floor(Date.now() / 1000);

    console.log(`[card-buy] card=${cardIdNum} seller=${seller_pubkey.slice(0,8)} buyer=${buyer_pubkey.slice(0,8)} tx=${payment.slice(0,12)}..`);

    return res.json({
      sale_session_id: `sale_${buyer_pubkey.slice(0,8)}_card${cardIdNum}`,
      card_id:         cardIdNum,
      seller_pubkey,
      buyer_pubkey,
      price_lamports:  price_lamports ?? 0,
      payment_sig:     payment,
      sold_at:         soldAt,
      message:         'Call buy_card on-chain with payment_sig to finalize.',
    });
  } catch (e) {
    console.error('[card-buy] error:', e.message);
    return res.status(500).json({ error: 'Internal error verifying payment' });
  }
});

// ═══════════════════════════════════════
// EXPORTS & STARTUP
// ═══════════════════════════════════════

export { app, gameState, analyzeStrategy, FLOOR_NAMES, FLOOR_RARITY, verifySolPayment, fetchPlayerCards };

app.listen(PORT, () => {
  console.log(`\n0xARK x402 Information Broker v1.0`);
  console.log(`Port: ${PORT}   Recipient: ${RECIPIENT_WALLET}`);
  console.log(`\nEndpoints:`);
  console.log(`  GET  /intel/location/:id   $0.002 USDC`);
  console.log(`  GET  /intel/hand/:id       $0.003 USDC`);
  console.log(`  GET  /intel/strategy       $0.005 USDC`);
  console.log(`  GET  /intel/market         free`);
  console.log(`  POST /update-state         free`);
  console.log(`\nDev bypass: X-Payment: local-dev-bypass\n`);
});

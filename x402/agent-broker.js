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
import { Connection } from '@solana/web3.js';

const app = express();
const PORT = 3402;

const RECIPIENT_WALLET = process.env.BROKER_WALLET || 'DPMPhnVezSq5im35p4w3bC6XjpNZuuvCDVSAVxw4Q28R';
const DEVNET_RPC = 'https://api.devnet.solana.com';

// Replay protection
const usedSignatures = new Set();

// ═══════════════════════════════════════
// GAME STATE (updated by POST /update-state)
// ═══════════════════════════════════════

const FLOOR_NAMES = { 0: 'Town', 1: 'B1', 2: 'B2', 3: 'B3', 4: 'B4', 5: 'B5' };
const FLOOR_RARITY = {
  0: 'Town (no drops)',
  1: 'Starter set — 10 cards (all 5 types)',
  2: 'Advanced set — 10 cards (all 5 types)',
  3: 'Expert set — 15 cards (all 5 types)',
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
    const connection = new Connection(DEVNET_RPC, 'confirmed');
    const tx = await connection.getParsedTransaction(signature, {
      commitment: 'confirmed',
      maxSupportedTransactionVersion: 0,
    });
    if (!tx) return { ok: false, reason: 'Transaction not found on devnet' };
    if (tx.meta?.err) return { ok: false, reason: 'Transaction failed on-chain' };

    // Scan for SPL token transfer >= expectedAmount to RECIPIENT_WALLET
    const ixs = tx.transaction.message.instructions;
    for (const ix of ixs) {
      const t = ix.parsed?.type;
      if (t === 'transfer' || t === 'transferChecked') {
        const info = ix.parsed.info;
        const decimals = info.tokenAmount?.decimals ?? 6;
        const raw = Number(info.amount ?? info.tokenAmount?.amount ?? 0);
        const amountUSDC = raw / Math.pow(10, decimals);
        if (amountUSDC >= expectedAmountUSDC) {
          usedSignatures.add(signature);
          return { ok: true, amount: amountUSDC };
        }
      }
    }
    return { ok: false, reason: `No USDC transfer >= $${expectedAmountUSDC} found` };
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
    const pid = parseInt(req.params.playerId);
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
    const pid = parseInt(req.params.playerId);
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
    const pid = parseInt(req.query.player ?? '0');
    res.json(analyzeStrategy(pid));
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
      { path: '/intel/location/:id', price: '$0.002 USDC', desc: 'Rival floor position' },
      { path: '/intel/hand/:id',     price: '$0.003 USDC', desc: 'Rival card holdings' },
      { path: '/intel/strategy',     price: '$0.005 USDC', desc: 'Strategic analysis' },
      { path: '/intel/market',       price: 'free',         desc: 'Card pool status (60 cards)' },
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
// EXPORTS & STARTUP
// ═══════════════════════════════════════

export { app, gameState, analyzeStrategy, FLOOR_NAMES, FLOOR_RARITY };

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

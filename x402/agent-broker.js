/**
 * 0xARK x402 Information Broker Agent
 *
 * An AI agent that sells game intelligence via x402 micropayments.
 * Players (or their AI agents) can pay USDC to learn:
 * - Where a rival is (area information)
 * - What cards a rival holds
 * - Strategic advice based on game state
 *
 * Each request costs $0.001-$0.005 USDC via x402 protocol.
 *
 * Usage:
 *   node agent-broker.js
 *
 * Endpoints:
 *   GET  /intel/location/:playerId  — $0.002 — Returns player's current area
 *   GET  /intel/hand/:playerId      — $0.003 — Returns player's card holdings
 *   GET  /intel/strategy            — $0.005 — Returns optimal next action
 *   GET  /intel/market              — free   — Returns card pool status
 *   GET  /status                    — free   — Returns all endpoints with prices
 *   GET  /health                    — free   — Health check
 *   POST /update-state              — free   — Push current game state from client
 */

import express from 'express';

const app = express();
const PORT = 3402;

const RECIPIENT_WALLET = '0xARK_BROKER_WALLET';

// ═══════════════════════════════════════
// DYNAMIC GAME STATE
// ═══════════════════════════════════════

// Default state — overwritten by POST /update-state from the game client
let gameState = {
  players: [
    { id: 0, name: 'Player', area: 0, cards: [1, 3, 0, 0, 0], cardCount: 2 },
    { id: 1, name: 'Rival', area: 1, cards: [2, 5, 0, 0, 0], cardCount: 2 },
    { id: 2, name: 'Hunter', area: 2, cards: [4, 0, 0, 0, 0], cardCount: 1 },
  ],
  cardPool: { 1: 1, 2: 1, 3: 2, 4: 2, 5: 1 },
  round: 5,
  rivalMaps: [0, 0],
  rivalAI: [],
};

const CARD_NAMES = ['', 'AEGIS', 'UMBRA', 'IGNIS', 'TEMPEST', 'NIHIL'];
const AREA_NAMES = ['Corsair Bay', 'Smugglers Jungle', 'Cursed Temple'];

// Endpoint price catalog
const ENDPOINTS = [
  { path: '/intel/location/:playerId', method: 'GET', price: 0.002, currency: 'USDC', description: 'Player location intelligence' },
  { path: '/intel/hand/:playerId', method: 'GET', price: 0.003, currency: 'USDC', description: 'Player hand intelligence' },
  { path: '/intel/strategy', method: 'GET', price: 0.005, currency: 'USDC', description: 'Strategic analysis' },
  { path: '/intel/market', method: 'GET', price: 0, currency: 'USDC', description: 'Card pool status (free)' },
  { path: '/status', method: 'GET', price: 0, currency: 'USDC', description: 'Endpoint catalog (free)' },
  { path: '/health', method: 'GET', price: 0, currency: 'USDC', description: 'Health check (free)' },
  { path: '/update-state', method: 'POST', price: 0, currency: 'USDC', description: 'Push game state from client (free)' },
];

// ═══════════════════════════════════════
// MIDDLEWARE
// ═══════════════════════════════════════

app.use(express.json());

// CORS — allow the game client to call from any origin
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Payment');
  res.setHeader('Access-Control-Expose-Headers', 'X-Payment-Required');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }
  next();
});

// ═══════════════════════════════════════
// x402 PAYMENT VERIFICATION
// ═══════════════════════════════════════

/**
 * Verify a Solana transaction signature for x402 payment.
 * In production this would check the on-chain USDC transfer via RPC.
 * For now it logs the signature and accepts any non-empty value.
 */
function verifyPayment(signature, expectedAmount, description) {
  console.log(`[x402] Verifying payment for "${description}"`);
  console.log(`[x402]   Signature : ${signature}`);
  console.log(`[x402]   Expected  : $${expectedAmount} USDC`);
  console.log(`[x402]   Recipient : ${RECIPIENT_WALLET}`);
  // TODO: Use @solana/web3.js to confirm the transaction on-chain:
  //   1. Fetch transaction by signature
  //   2. Confirm it transfers >= expectedAmount USDC to RECIPIENT_WALLET
  //   3. Confirm it is finalized (not just confirmed)
  //   4. Prevent replay by tracking used signatures
  return true;
}

/**
 * x402 payment middleware.
 * If X-Payment header is present, verify it. Otherwise return 402 with
 * the x402 protocol payload in both the response body and the
 * X-Payment-Required header.
 */
function requirePayment(amount, description) {
  return (req, res, next) => {
    // Free endpoints skip payment
    if (amount <= 0) return next();

    const payment = req.headers['x-payment'];

    if (!payment) {
      const paymentRequired = {
        version: 1,
        scheme: 'exact',
        network: 'solana-mainnet',
        amount,
        currency: 'USDC',
        recipient: RECIPIENT_WALLET,
        description,
      };

      res.setHeader('X-Payment-Required', JSON.stringify(paymentRequired));
      return res.status(402).json({
        error: 'Payment Required',
        x402: paymentRequired,
      });
    }

    // Verify the provided Solana transaction signature
    const valid = verifyPayment(payment, amount, description);
    if (!valid) {
      return res.status(402).json({
        error: 'Payment verification failed',
        details: 'The provided transaction signature could not be verified.',
      });
    }

    console.log(`[x402] Payment accepted: $${amount} USDC for "${description}"`);
    next();
  };
}

// ═══════════════════════════════════════
// STRATEGY ENGINE
// ═══════════════════════════════════════

/**
 * Analyze game state and produce strategic advice.
 * Accepts an optional requesterId (0 = player, 1+ = rival AI).
 */
function analyzeStrategy(requesterId = 0) {
  const requester = gameState.players[requesterId];
  if (!requester) return { recommendation: 'Unknown player.', confidence: 0 };

  const requesterCards = new Set(requester.cards.filter(c => c > 0));
  const missing = [1, 2, 3, 4, 5].filter(c => !requesterCards.has(c));
  const cardCount = requesterCards.size;
  const others = gameState.players.filter((_, i) => i !== requesterId);

  // Determine threats: who is on the same map?
  const requesterMap = requesterId === 0
    ? (gameState.currentMap ?? requester.area)
    : (gameState.rivalMaps?.[requesterId - 1] ?? requester.area);

  const nearbyThreats = others.filter((o, idx) => {
    const oMap = idx === 0
      ? (gameState.currentMap ?? o.area)
      : (gameState.rivalMaps?.[idx - 1] ?? o.area);
    return oMap === requesterMap;
  });

  // Card pool availability
  const poolRemaining = gameState.cardPool
    ? Object.values(gameState.cardPool).reduce((a, b) => a + b, 0)
    : 0;

  let advice = '';
  let confidence = 0.75;

  if (missing.length === 0) {
    advice = 'You have all 5 crystals! Head to the Ancient Ruins altar to win.';
    confidence = 1.0;
  } else if (missing.length === 1) {
    const needed = CARD_NAMES[missing[0]];
    const bestArea = missing[0] <= 2 ? 'Port Town' : missing[0] <= 4 ? 'Deep Forest' : 'Ancient Ruins';
    if (nearbyThreats.length > 0) {
      advice = `You need ${needed}. Best area: ${bestArea}. WARNING: ${nearbyThreats.map(t => t.name).join(', ')} nearby — use Barrier before Drawing.`;
      confidence = 0.85;
    } else {
      advice = `You need ${needed}. Go to ${bestArea} and Draw. Coast is clear — no rivals nearby.`;
      confidence = 0.90;
    }
  } else if (missing.length <= 3 && cardCount >= 2) {
    // Mid-game: balance drawing and defense
    const weakest = [...others].sort((a, b) =>
      a.cards.filter(c => c > 0).length - b.cards.filter(c => c > 0).length
    )[0];
    if (weakest && weakest.cards.filter(c => c > 0).length >= 3) {
      advice = `Consider Stealing from ${weakest.name} (${weakest.cards.filter(c => c > 0).length} cards). You still need: ${missing.map(c => CARD_NAMES[c]).join(', ')}.`;
    } else {
      advice = `Focus on Drawing. You need: ${missing.map(c => CARD_NAMES[c]).join(', ')}. ${poolRemaining} cards remain in the pool.`;
    }
    confidence = 0.70;
  } else {
    // Early game or behind
    const weakest = [...others].sort((a, b) =>
      a.cards.filter(c => c > 0).length - b.cards.filter(c => c > 0).length
    )[0];
    if (weakest && weakest.cards.filter(c => c > 0).length <= 1) {
      advice = `Explore and Draw aggressively. ${weakest.name} is weak (${weakest.cards.filter(c => c > 0).length} cards) — avoid them, focus on cards.`;
    } else if (nearbyThreats.length > 0) {
      advice = `Rivals nearby! Move to a safer area first, then Draw. You need ${missing.length} more cards.`;
    } else {
      advice = `Explore and Draw. You need: ${missing.map(c => CARD_NAMES[c]).join(', ')}. Head to tall grass patches for better odds.`;
    }
    confidence = 0.60;
  }

  // Predict rival actions based on personality and state
  const predictions = others.map((o, idx) => {
    const oCards = o.cards.filter(c => c > 0).length;
    const oUnique = new Set(o.cards.filter(c => c > 0)).size;
    const aiData = gameState.rivalAI?.[idx];
    const personality = aiData?.personality || (idx === 0 ? 'collector' : 'hunter');

    let predictedAction = 'DRAW';
    let actionConfidence = 0.5;

    if (personality === 'hunter') {
      if (oUnique >= 4) { predictedAction = 'BARRIER'; actionConfidence = 0.7; }
      else if (cardCount >= 2) { predictedAction = 'STEAL'; actionConfidence = 0.65; }
      else { predictedAction = 'DRAW'; actionConfidence = 0.6; }
    } else {
      if (oUnique >= 4) { predictedAction = 'BARRIER'; actionConfidence = 0.75; }
      else if (oCards >= 3 && cardCount > oUnique) { predictedAction = 'STEAL'; actionConfidence = 0.4; }
      else { predictedAction = 'DRAW'; actionConfidence = 0.65; }
    }

    return {
      name: o.name,
      personality,
      cardCount: oCards,
      uniqueCards: oUnique,
      predictedAction,
      actionConfidence,
    };
  });

  return {
    round: gameState.round,
    requesterId,
    requesterName: requester.name,
    yourCards: requester.cards.filter(c => c > 0).map(c => CARD_NAMES[c]),
    missing: missing.map(c => CARD_NAMES[c]),
    nearbyThreats: nearbyThreats.map(t => t.name),
    rivalPredictions: predictions,
    poolRemaining,
    recommendation: advice,
    confidence,
    timestamp: Date.now(),
  };
}

// ═══════════════════════════════════════
// ENDPOINTS
// ═══════════════════════════════════════

// Location intel
app.get('/intel/location/:playerId',
  requirePayment(0.002, 'Player location intelligence'),
  (req, res) => {
    const pid = parseInt(req.params.playerId);
    const player = gameState.players[pid];
    if (!player) return res.status(404).json({ error: 'Player not found' });

    // Use rivalMaps for rivals, currentMap for player 0
    let area = player.area;
    if (pid === 0 && gameState.currentMap !== undefined) {
      area = gameState.currentMap;
    } else if (pid > 0 && gameState.rivalMaps?.[pid - 1] !== undefined) {
      area = gameState.rivalMaps[pid - 1];
    }

    res.json({
      playerId: pid,
      playerName: player.name,
      area,
      areaName: AREA_NAMES[area] || 'Unknown',
      confidence: 0.95,
      timestamp: Date.now(),
    });
  }
);

// Hand intel
app.get('/intel/hand/:playerId',
  requirePayment(0.003, 'Player hand intelligence'),
  (req, res) => {
    const pid = parseInt(req.params.playerId);
    const player = gameState.players[pid];
    if (!player) return res.status(404).json({ error: 'Player not found' });

    const cards = player.cards
      .filter(c => c > 0)
      .map(c => ({ id: c, name: CARD_NAMES[c] }));

    res.json({
      playerId: pid,
      playerName: player.name,
      cardCount: cards.length,
      cards,
      confidence: 0.90,
      timestamp: Date.now(),
    });
  }
);

// Strategy advice
app.get('/intel/strategy',
  requirePayment(0.005, 'Strategic analysis'),
  (req, res) => {
    const requesterId = parseInt(req.query.player || '0');
    res.json(analyzeStrategy(requesterId));
  }
);

// Market data (free)
app.get('/intel/market',
  (req, res) => {
    const pool = Object.entries(gameState.cardPool).map(([id, remaining]) => ({
      cardId: parseInt(id),
      cardName: CARD_NAMES[parseInt(id)],
      remaining,
      totalSupply: 3,
    }));

    res.json({
      round: gameState.round,
      pool,
      totalCardsInPool: Object.values(gameState.cardPool).reduce((a, b) => a + b, 0),
      timestamp: Date.now(),
    });
  }
);

// Status — endpoint catalog with prices
app.get('/status', (req, res) => {
  res.json({
    agent: '0xARK Information Broker',
    version: '0.2.0',
    network: 'solana-mainnet',
    currency: 'USDC',
    recipient: RECIPIENT_WALLET,
    endpoints: ENDPOINTS,
    gameStateAge: gameState._lastUpdate
      ? `${Math.round((Date.now() - gameState._lastUpdate) / 1000)}s ago`
      : 'using defaults',
    timestamp: Date.now(),
  });
});

// Health check (free)
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    agent: '0xARK Information Broker',
    version: '0.2.0',
    hasLiveState: !!gameState._lastUpdate,
  });
});

// Accept game state push from client
app.post('/update-state', (req, res) => {
  const body = req.body;
  if (!body || !body.players) {
    return res.status(400).json({ error: 'Invalid state: players array required' });
  }

  gameState = {
    ...gameState,
    players: body.players,
    cardPool: body.cardPool || gameState.cardPool,
    round: body.round ?? gameState.round,
    currentMap: body.currentMap ?? gameState.currentMap,
    rivalMaps: body.rivalMaps || gameState.rivalMaps,
    rivalAI: body.rivalAI || gameState.rivalAI,
    _lastUpdate: Date.now(),
  };

  console.log(`[x402] Game state updated — round ${gameState.round}, ${gameState.players.length} players`);
  res.json({ status: 'ok', round: gameState.round, timestamp: Date.now() });
});

// ═══════════════════════════════════════
// EXPORTS & STARTUP
// ═══════════════════════════════════════

export { app, gameState, analyzeStrategy, verifyPayment, CARD_NAMES, AREA_NAMES };

app.listen(PORT, () => {
  console.log(`0xARK x402 Information Broker running on port ${PORT}`);
  console.log(`Endpoints:`);
  for (const ep of ENDPOINTS) {
    const price = ep.price > 0 ? `$${ep.price}` : 'free';
    console.log(`  ${ep.method.padEnd(4)} ${ep.path.padEnd(30)} — ${price}`);
  }
  console.log(`\nCORS enabled for all origins`);
  console.log(`x402 protocol: Solana mainnet / USDC`);
});

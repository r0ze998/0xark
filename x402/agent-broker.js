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
 *   GET /intel/location/:playerId  — $0.002 — Returns player's current area
 *   GET /intel/hand/:playerId      — $0.003 — Returns player's card holdings
 *   GET /intel/strategy            — $0.005 — Returns optimal next action
 *   GET /intel/market              — $0.001 — Returns card pool status
 */

import express from 'express';

const app = express();
const PORT = 3402;

// Simulated game state (in production, read from Solana via RPC)
const gameState = {
  players: [
    { id: 0, name: 'Player', area: 0, cards: [1, 3, 0, 0, 0], cardCount: 2 },
    { id: 1, name: 'Rival', area: 1, cards: [2, 5, 0, 0, 0], cardCount: 2 },
    { id: 2, name: 'Hunter', area: 2, cards: [4, 0, 0, 0, 0], cardCount: 1 },
  ],
  cardPool: { 1: 1, 2: 1, 3: 2, 4: 2, 5: 1 }, // remaining per type
  round: 5,
};

const CARD_NAMES = ['', 'Crystal', 'Shadow', 'Flame', 'Storm', 'Void'];
const AREA_NAMES = ['Port Town', 'Deep Forest', 'Ancient Ruins'];

// x402 payment header check (simplified — in production use @x402/express middleware)
function requirePayment(amount, description) {
  return (req, res, next) => {
    const payment = req.headers['x-payment'];
    if (!payment) {
      res.status(402).json({
        error: 'Payment Required',
        x402: {
          version: 1,
          scheme: 'exact',
          network: 'solana-mainnet',
          amount: amount,
          currency: 'USDC',
          recipient: '0xARK_BROKER_WALLET',
          description: description,
        }
      });
      return;
    }
    // In production: verify payment signature, check USDC transfer
    // For POC: accept any payment header
    console.log(`Payment received: $${amount} for ${description}`);
    next();
  };
}

// Location intel
app.get('/intel/location/:playerId',
  requirePayment(0.002, 'Player location intelligence'),
  (req, res) => {
    const pid = parseInt(req.params.playerId);
    const player = gameState.players[pid];
    if (!player) return res.status(404).json({ error: 'Player not found' });

    res.json({
      playerId: pid,
      playerName: player.name,
      area: player.area,
      areaName: AREA_NAMES[player.area],
      confidence: 0.95, // might be stale by 1 round
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
      cardCount: player.cardCount,
      cards: cards,
      confidence: 0.90,
      timestamp: Date.now(),
    });
  }
);

// Strategy advice
app.get('/intel/strategy',
  requirePayment(0.005, 'Strategic analysis'),
  (req, res) => {
    const you = gameState.players[0];
    const rivals = gameState.players.slice(1);
    const yourCards = new Set(you.cards.filter(c => c > 0));
    const missing = [1, 2, 3, 4, 5].filter(c => !yourCards.has(c));

    let advice = '';
    if (missing.length === 1) {
      const needed = CARD_NAMES[missing[0]];
      const area = missing[0] <= 2 ? 'Port Town' : missing[0] <= 4 ? 'Deep Forest' : 'Ancient Ruins';
      advice = `You need ${needed}. Go to ${area} and Draw. Avoid battles — protect your hand.`;
    } else if (missing.length <= 2) {
      advice = `Almost there. Focus on Draw in the right areas. Use Barrier if rivals are nearby.`;
    } else {
      const weakestRival = rivals.sort((a, b) => a.cardCount - b.cardCount)[0];
      advice = `Explore and Draw. ${weakestRival.name} is weak (${weakestRival.cardCount} cards) — consider Stealing.`;
    }

    res.json({
      round: gameState.round,
      yourCards: you.cards.filter(c => c > 0).map(c => CARD_NAMES[c]),
      missing: missing.map(c => CARD_NAMES[c]),
      recommendation: advice,
      confidence: 0.75,
      timestamp: Date.now(),
    });
  }
);

// Market data (cheapest — public-ish info)
app.get('/intel/market',
  requirePayment(0.001, 'Card pool status'),
  (req, res) => {
    const pool = Object.entries(gameState.cardPool).map(([id, remaining]) => ({
      cardId: parseInt(id),
      cardName: CARD_NAMES[parseInt(id)],
      remaining,
      totalSupply: 3, // original supply
    }));

    res.json({
      round: gameState.round,
      pool,
      totalCardsInPool: Object.values(gameState.cardPool).reduce((a, b) => a + b, 0),
      timestamp: Date.now(),
    });
  }
);

// Health check (free)
app.get('/health', (req, res) => {
  res.json({ status: 'ok', agent: '0xARK Information Broker', version: '0.1.0' });
});

app.listen(PORT, () => {
  console.log(`0xARK x402 Information Broker running on port ${PORT}`);
  console.log(`Endpoints:`);
  console.log(`  GET /intel/location/:id  — $0.002`);
  console.log(`  GET /intel/hand/:id      — $0.003`);
  console.log(`  GET /intel/strategy      — $0.005`);
  console.log(`  GET /intel/market        — $0.001`);
});

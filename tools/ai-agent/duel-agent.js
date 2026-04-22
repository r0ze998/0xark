/**
 * duel-agent.js — T-D15-C: 0xARK Duel Hall Matchmaking AI Agent
 *
 * Anthropic-powered agent that:
 *   1. Polls the matchmaking queue REST endpoint every 5 seconds
 *   2. Auto-joins Bronze/Silver/Gold Hall queue as a fallback opponent
 *   3. Plays complete duels using claude-haiku-4-5 for Summon decisions
 *   4. Falls back to rule-based strategy on API errors
 *
 * Usage:
 *   ANTHROPIC_API_KEY=sk-... node duel-agent.js [--difficulty=matchmaking|tutorial]
 *
 * Environment:
 *   ANTHROPIC_API_KEY   — Required for LLM play (rule-based fallback if absent)
 *   DUEL_API_URL        — 0xARK multiplayer server HTTP base (default: http://localhost:3001)
 *   WS_URL              — WebSocket URL for duel events (default: ws://localhost:3001)
 *   AGENT_HALL          — bronze|silver|gold (default: bronze)
 *   AGENT_DIFFICULTY    — matchmaking|tutorial (default: matchmaking)
 */

import Anthropic from '@anthropic-ai/sdk';
import WebSocket from 'ws';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ─── Config ───────────────────────────────────────────────────────────────────

const API_URL     = process.env.DUEL_API_URL     || 'http://localhost:3001';
const WS_URL_BASE = process.env.WS_URL           || 'ws://localhost:3001';
const HALL        = process.env.AGENT_HALL       || 'bronze';
const DIFFICULTY  = process.env.AGENT_DIFFICULTY || _argDifficulty();
const POLL_MS     = 5000;        // matchmaking poll interval
const WAIT_BEFORE_JOIN_MS = 30000; // wait 30s for a human before agent joins
const LLM_MODEL   = 'claude-haiku-4-5-20251001'; // cheap + fast
const MAX_TOKENS  = 400;
const LOG_DIR     = path.join(__dirname, 'logs');

function _argDifficulty() {
  const d = process.argv.find(a => a.startsWith('--difficulty='));
  return d ? d.split('=')[1] : 'matchmaking';
}

// ─── Logger ───────────────────────────────────────────────────────────────────

if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR, { recursive: true });
const LOG_FILE = path.join(LOG_DIR, `duel-agent-${Date.now()}.log`);
const logStream = fs.createWriteStream(LOG_FILE, { flags: 'a' });

function log(level, ...args) {
  const msg = `[${new Date().toISOString()}] [${level.toUpperCase()}] ${args.join(' ')}`;
  console.log(msg);
  logStream.write(msg + '\n');
}

// ─── Anthropic Client ─────────────────────────────────────────────────────────

const anthropic = process.env.ANTHROPIC_API_KEY
  ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  : null;

if (!anthropic) log('warn', 'ANTHROPIC_API_KEY not set — using rule-based fallback for all decisions');

// ─── System Prompts ───────────────────────────────────────────────────────────

const SYSTEM_PROMPT_MATCHMAKING = `You are an AI agent playing 0xARK, a strategic card dueling game.

Game rules:
- 5 rounds, each round has: Draw → Energy → Summon → Battle phases
- Cards have types: attack, defense, magic, flee, recovery
- Three lanes: front, middle, back
- Summon cards to lanes to deal damage in Battle
- Element affinity: fire > ice > lightning > fire (25% bonus damage)
- Defender: cards in back lane take 50% damage
- Scout Peek: reveal one opponent card (3/duel)
- Extra Action: summon a 2nd card (2/duel)
- Shards: currency for special moves

Strategic principles:
- Balance attack and defense
- Protect valuable cards with Defender
- Use Scout Peek when opponent's hand is unknown
- Save Extra Actions for critical rounds
- Consider elemental matchups

Your responses must be valid JSON only. No markdown, no explanation outside JSON.`;

const SYSTEM_PROMPT_TUTORIAL = `You are a friendly tutorial AI in 0xARK. Play simply and gently.
- Always summon to Front lane only
- Never use Scout Peek or Extra Action
- Use cheapest (lowest rarity) cards first
- Play suboptimally on purpose so new players can win 70% of the time
- Be predictable and educational

Your responses must be valid JSON only.`;

// ─── Rule-Based Fallback ──────────────────────────────────────────────────────

function ruleBasedSummonActions(state) {
  const { hand, energy, lanes } = state;
  const actions = [];
  // Find cheapest available card that fits energy
  const energyAvail = energy || { fire:3, ice:3, lightning:3 };
  const totalEnergy = Object.values(energyAvail).reduce((a,b)=>a+b,0);
  // Sort by rarity ascending (cheapest first)
  const sorted = [...hand].sort((a,b)=>(a.r||1)-(b.r||1));
  for (const card of sorted) {
    const cost = card.ct || 1;
    if (cost <= totalEnergy) {
      actions.push({ type:'summon', card_id: card.id, lane:'front' });
      break;
    }
  }
  return actions;
}

// ─── LLM Summon Decision ──────────────────────────────────────────────────────

async function llmSummonDecision(state, duelStats) {
  if (!anthropic) return { actions: ruleBasedSummonActions(state), source: 'rule-based' };

  const prompt = `Current duel state:
- Phase: Summon
- Round: ${state.round}/5
- Your HP: ${state.agentHP}, Opponent HP: ${state.opponentHP}
- Your hand: ${JSON.stringify(state.hand)}
- Your energy: ${JSON.stringify(state.energy)}
- Your lanes (occupied): ${JSON.stringify(state.myLanes)}
- Opponent visible lanes: ${JSON.stringify(state.opponentLanes)}
- Shards: ${state.shards || 0}
- Extra Actions remaining: ${state.extraActionsLeft || 2}
- Scout Peeks remaining: ${state.scoutPeeksLeft || 3}

Decide Summon actions. Output JSON:
{
  "actions": [
    { "type": "summon", "card_id": N, "lane": "front|middle|back" },
    { "type": "use_extra_action" },
    { "type": "use_scout_peek" }
  ],
  "reasoning": "one sentence"
}

Output ONLY valid JSON. No markdown.`;

  try {
    const resp = await anthropic.messages.create({
      model: LLM_MODEL,
      max_tokens: MAX_TOKENS,
      system: DIFFICULTY === 'tutorial' ? SYSTEM_PROMPT_TUTORIAL : SYSTEM_PROMPT_MATCHMAKING,
      messages: [{ role: 'user', content: prompt }],
    });
    const text = resp.content[0]?.text || '{}';
    const parsed = JSON.parse(text);
    log('debug', `LLM decision: ${parsed.reasoning || '(no reasoning)'}`);
    duelStats.apiCalls++;
    return { actions: parsed.actions || [], source: 'llm' };
  } catch (err) {
    log('warn', `LLM failed (${err.message}), using rule-based fallback`);
    return { actions: ruleBasedSummonActions(state), source: 'rule-based' };
  }
}

// ─── Matchmaking Poller ───────────────────────────────────────────────────────

class DuelAgent {
  constructor() {
    this.running = false;
    this.ws = null;
    this.duelId = null;
    this.duelState = {};
    this.duelStats = { wins: 0, losses: 0, apiCalls: 0 };
    this._queueWaitMs = 0;
  }

  async start() {
    this.running = true;
    log('info', `Duel Agent starting — Hall: ${HALL}, Difficulty: ${DIFFICULTY}`);
    this._connectWS();
    await this._pollLoop();
  }

  stop() {
    this.running = false;
    if (this.ws) this.ws.close();
    log('info', `Agent stopped. Stats: ${JSON.stringify(this.duelStats)}`);
    logStream.end();
  }

  // ── WebSocket for duel events ─────────────────────────────────────────────

  _connectWS() {
    try {
      this.ws = new WebSocket(WS_URL_BASE);
      this.ws.on('message', (data) => this._onWsMessage(data));
      this.ws.on('error', (e) => log('warn', 'WS error:', e.message));
      this.ws.on('close', () => {
        if (this.running) setTimeout(() => this._connectWS(), 3000);
      });
    } catch (e) {
      log('warn', 'WS connect failed:', e.message);
    }
  }

  _onWsMessage(data) {
    try {
      const msg = JSON.parse(data.toString());
      this._handleDuelEvent(msg);
    } catch (_) {}
  }

  _handleDuelEvent(msg) {
    if (!msg.type) return;
    switch (msg.type) {
      case 'duel_start':
        this.duelId = msg.duelId;
        this.duelState = {
          round: 1, agentHP: 20, opponentHP: 20,
          hand: msg.hand || [], energy: msg.energy || {},
          myLanes: {}, opponentLanes: {},
          shards: 0, extraActionsLeft: 2, scoutPeeksLeft: 3,
        };
        log('info', `Duel started: ${msg.duelId} vs ${msg.opponent || 'opponent'}`);
        break;
      case 'duel_phase':
        this._handlePhase(msg);
        break;
      case 'duel_end':
        if (msg.winner === 'agent') this.duelStats.wins++;
        else this.duelStats.losses++;
        log('info', `Duel ${this.duelId} ended. Result: ${msg.winner === 'agent' ? 'WIN' : 'LOSS'}. Stats: ${JSON.stringify(this.duelStats)}`);
        this.duelId = null;
        break;
    }
  }

  async _handlePhase(msg) {
    const phase = msg.phase;
    if (!this.duelState) return;

    // Update state from server
    if (msg.hp !== undefined) this.duelState.agentHP = msg.hp;
    if (msg.opponentHp !== undefined) this.duelState.opponentHP = msg.opponentHp;
    if (msg.hand) this.duelState.hand = msg.hand;
    if (msg.energy) this.duelState.energy = msg.energy;
    if (msg.round) this.duelState.round = msg.round;

    if (phase === 'summon') {
      const decision = await llmSummonDecision(this.duelState, this.duelStats);
      log('debug', `Summon actions (${decision.source}): ${JSON.stringify(decision.actions)}`);
      if (this.ws && this.ws.readyState === 1) {
        this.ws.send(JSON.stringify({
          type: 'duel_action',
          duelId: this.duelId,
          phase: 'summon',
          actions: decision.actions,
        }));
      }
    } else if (phase === 'draw' || phase === 'energy' || phase === 'battle') {
      // Auto-advance non-decision phases
      if (this.ws && this.ws.readyState === 1) {
        this.ws.send(JSON.stringify({
          type: 'duel_action',
          duelId: this.duelId,
          phase,
          actions: [],
        }));
      }
    }
  }

  // ── Matchmaking polling ───────────────────────────────────────────────────

  async _pollLoop() {
    while (this.running) {
      if (!this.duelId) {
        await this._checkAndJoinQueue();
      }
      await new Promise(r => setTimeout(r, POLL_MS));
    }
  }

  async _checkAndJoinQueue() {
    try {
      const resp = await fetch(`${API_URL}/api/queue/${HALL}`);
      if (!resp.ok) return;
      const data = await resp.json();

      // If a human has been waiting > WAIT_BEFORE_JOIN_MS, join as opponent
      if (data.waitingPlayers && data.waitingPlayers.length > 0) {
        const oldest = data.waitingPlayers[0];
        const waitMs = Date.now() - (oldest.joinedAt || 0);
        if (waitMs >= WAIT_BEFORE_JOIN_MS) {
          log('info', `Human waited ${Math.round(waitMs/1000)}s — joining as AI opponent`);
          await this._joinQueue();
        }
      }
    } catch (e) {
      // API not available — normal when running without server
      log('debug', 'Queue poll failed:', e.message);
    }
  }

  async _joinQueue() {
    try {
      const resp = await fetch(`${API_URL}/api/queue/${HALL}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agent: true, difficulty: DIFFICULTY }),
      });
      if (resp.ok) log('info', `Joined ${HALL} queue as AI agent`);
    } catch (e) {
      log('debug', 'Queue join failed:', e.message);
    }
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

const agent = new DuelAgent();
process.on('SIGINT', () => { agent.stop(); process.exit(0); });
agent.start().catch(e => { log('error', 'Agent fatal:', e.message); process.exit(1); });

/**
 * agent.js — 0xARK AI Auto-Play Agent
 *
 * An autonomous agent that plays 0xARK via:
 *   - WebSocket connection to the multiplayer server
 *   - Claude API for LLM-driven strategic decisions
 *   - Heuristic fallback strategy when LLM is unavailable
 *
 * Usage:
 *   ANTHROPIC_API_KEY=sk-... node agent.js [--room <roomId>] [--name <name>]
 *
 * Environment:
 *   ANTHROPIC_API_KEY   - Claude API key (optional; uses heuristic if absent)
 *   WS_URL              - WebSocket server URL (default: ws://localhost:3001)
 *   AGENT_NAME          - Agent display name (default: OxarkBot)
 *   LOG_LEVEL           - 'debug'|'info'|'warn' (default: 'info')
 */

import Anthropic from '@anthropic-ai/sdk';
import WebSocket from 'ws';
import { heuristicCard, heuristicFlee } from './strategy.js';

const WS_URL     = process.env.WS_URL     || 'ws://localhost:3001';
const AGENT_NAME = process.env.AGENT_NAME || 'OxarkBot';
const LOG_LEVEL  = process.env.LOG_LEVEL  || 'info';

const LEVELS = { debug: 0, info: 1, warn: 2, error: 3 };
const log = (lvl, ...args) => {
  if (LEVELS[lvl] >= LEVELS[LOG_LEVEL]) {
    console.log(`[${new Date().toISOString()}] [${lvl.toUpperCase()}]`, ...args);
  }
};

// ─── State ────────────────────────────────────────────────────────────────────

const DEFAULT_STATE = {
  playerId:  null,
  roomId:    null,
  gameId:    null,
  x:         20,
  y:         20,
  area:      0,          // 0=town, 1-N=dungeon floor
  hp:        100,
  maxHp:     100,
  hand:      [],         // [{id, name, type, rarity}]
  inBattle:  false,
  opponent:  null,       // {playerId, cardType}
  floorDepth: 0,
  nearbyPlayers: new Map(),
};

// ─── OxarkAgent ───────────────────────────────────────────────────────────────

export class OxarkAgent {
  constructor(config = {}) {
    this.wsUrl     = config.wsUrl     || WS_URL;
    this.name      = config.name      || AGENT_NAME;
    this.roomId    = config.roomId    || null;
    this.apiKey    = 'apiKey' in config ? config.apiKey : (process.env.ANTHROPIC_API_KEY || null);
    this.llmModel  = config.llmModel  || 'claude-haiku-4-5-20251001';  // cheap + fast for agent loops
    this.tickMs    = config.tickMs    || 2000;   // decision interval
    this.maxTicks  = config.maxTicks  || Infinity;

    this.state     = { ...DEFAULT_STATE };
    this.ws        = null;
    this.anthropic = this.apiKey ? new Anthropic({ apiKey: this.apiKey }) : null;

    this._tickTimer  = null;
    this._tickCount  = 0;
    this._decisions  = [];   // record for testing / replay
    this._running    = false;
  }

  // ── Public API ──────────────────────────────────────────────────────────────

  /** Connect and begin playing. Resolves when agent stops. */
  async start() {
    this._running = true;
    await this._connect();
    return new Promise(resolve => { this._resolve = resolve; });
  }

  /** Graceful stop. */
  stop() {
    this._running = false;
    if (this._tickTimer) clearInterval(this._tickTimer);
    if (this.ws) this.ws.close();
    if (this._resolve) this._resolve(this._decisions);
  }

  /** Return recorded decisions (for tests). */
  getDecisions() { return this._decisions; }

  // ── LLM Decision Interface (tested directly in unit tests) ─────────────────

  /**
   * Decide which card to play in battle.
   * Falls back to heuristic if LLM unavailable or fails.
   *
   * @returns {{ cardIndex, card, reason, source:'llm'|'heuristic' }}
   */
  async decideBattleCard() {
    const opponentType = this.state.opponent?.cardType ?? null;
    if (this.anthropic && this.state.hand.length > 0) {
      try {
        const decision = await this._llmBattleCard(opponentType);
        return { ...decision, source: 'llm' };
      } catch (err) {
        log('warn', 'LLM battle card failed, using heuristic:', err.message);
      }
    }
    const decision = heuristicCard(this.state.hand, opponentType, this.state);
    return { ...decision, source: 'heuristic' };
  }

  /**
   * Decide whether to flee from a battle.
   * Falls back to heuristic if LLM unavailable or fails.
   *
   * @returns {{ flee: boolean, reason, source:'llm'|'heuristic' }}
   */
  async decideFlee() {
    const opponentType = this.state.opponent?.cardType ?? null;
    if (this.anthropic) {
      try {
        const decision = await this._llmFlee(opponentType);
        return { ...decision, source: 'llm' };
      } catch (err) {
        log('warn', 'LLM flee failed, using heuristic:', err.message);
      }
    }
    const decision = heuristicFlee(this.state, opponentType);
    return { ...decision, source: 'heuristic' };
  }

  // ── WebSocket ───────────────────────────────────────────────────────────────

  _connect() {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(this.wsUrl);

      this.ws.on('open', () => {
        log('info', `Connected to ${this.wsUrl}`);
        this._joinOrCreate();
        resolve();
      });

      this.ws.on('message', (data) => {
        try {
          const msg = JSON.parse(data.toString());
          this._handleMessage(msg);
        } catch (_) { /* ignore malformed */ }
      });

      this.ws.on('close', () => {
        log('info', 'WebSocket closed');
        this._running = false;
        if (this._resolve) this._resolve(this._decisions);
      });

      this.ws.on('error', (err) => {
        log('warn', 'WebSocket error:', err.message);
        reject(err);
      });
    });
  }

  _send(msg) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(msg));
    }
  }

  _joinOrCreate() {
    if (this.roomId) {
      this._send({ type: 'join_room', roomId: this.roomId, name: this.name });
    } else {
      this._send({ type: 'create_room', gameId: Date.now(), name: this.name });
    }
  }

  _handleMessage(msg) {
    log('debug', 'MSG:', JSON.stringify(msg));

    switch (msg.type) {
      case 'room_created':
      case 'room_joined':
        this.state.playerId = msg.playerId;
        this.state.roomId   = msg.roomId;
        this.state.gameId   = msg.gameId;
        log('info', `In room ${msg.roomId} as ${msg.playerId}`);
        this._startTick();
        break;

      case 'player_moved':
        this.state.nearbyPlayers.set(msg.playerId, { x: msg.x, y: msg.y, area: msg.area });
        break;

      case 'player_left':
        this.state.nearbyPlayers.delete(msg.playerId);
        break;

      case 'chat':
        log('debug', `<${msg.name}> ${msg.message}`);
        break;

      case 'error':
        log('warn', 'Server error:', msg.message);
        break;
    }
  }

  // ── Tick Loop ───────────────────────────────────────────────────────────────

  _startTick() {
    this._tickTimer = setInterval(() => this._tick(), this.tickMs);
  }

  async _tick() {
    if (!this._running) return;
    this._tickCount++;

    if (this._tickCount > this.maxTicks) {
      this.stop();
      return;
    }

    if (this.state.inBattle) {
      await this._doBattleTurn();
    }
  }

  async _doBattleTurn() {
    // Decide flee or fight
    const fleeDecision = await this.decideFlee();
    this._decisions.push({ type: 'flee_check', ...fleeDecision, tick: this._tickCount });

    if (fleeDecision.flee) {
      log('info', `Flee: ${fleeDecision.reason} [${fleeDecision.source}]`);
      this.state.inBattle = false;
      this.state.opponent = null;
      return;
    }

    // Play a card
    const cardDecision = await this.decideBattleCard();
    this._decisions.push({ type: 'card', ...cardDecision, tick: this._tickCount });
    log('info', `Card: ${cardDecision.reason} [${cardDecision.source}]`);

    // Remove played card from hand (simulate)
    if (cardDecision.cardIndex >= 0) {
      this.state.hand = [
        ...this.state.hand.slice(0, cardDecision.cardIndex),
        ...this.state.hand.slice(cardDecision.cardIndex + 1),
      ];
    }

    // If hand empty, battle ends (fled implicitly)
    if (this.state.hand.length === 0) {
      this.state.inBattle = false;
      this.state.opponent = null;
    }
  }

  // ── LLM Calls ───────────────────────────────────────────────────────────────

  async _llmBattleCard(opponentType) {
    const { hand, hp, maxHp } = this.state;

    const prompt = `You are an AI playing 0xARK card battles on Solana.

Battle state:
- Your HP: ${hp}/${maxHp}
- Opponent's card type: ${opponentType ?? 'unknown'}
- Your hand: ${hand.map((c, i) => `[${i}] ${c.name} (${c.type}, rarity ${c.rarity})`).join(', ')}

Card type counters: attack→beaten by defense, defense→beaten by magic, magic→beaten by flee, flee→beaten by attack.
Higher rarity = stronger effect.

Choose the card index (0-based) to play.
Reply with JSON: {"index":<number>,"reason":"<one sentence>"}`;

    const response = await this.anthropic.messages.create({
      model: this.llmModel,
      max_tokens: 128,
      messages: [{ role: 'user', content: prompt }],
    });

    const text = response.content[0]?.text ?? '';
    const match = text.match(/\{[^}]+\}/);
    if (!match) throw new Error('LLM returned no JSON');
    const parsed = JSON.parse(match[0]);
    const idx = parseInt(parsed.index, 10);
    if (isNaN(idx) || idx < 0 || idx >= hand.length) throw new Error(`LLM chose invalid index: ${parsed.index}`);

    return { cardIndex: idx, card: hand[idx], reason: parsed.reason ?? `playing ${hand[idx].name}` };
  }

  async _llmFlee(opponentType) {
    const { hp, maxHp, hand } = this.state;

    const prompt = `You are an AI playing 0xARK.

Battle state:
- Your HP: ${hp}/${maxHp} (${Math.round(hp/maxHp*100)}%)
- Opponent's card type: ${opponentType ?? 'unknown'}
- Cards in hand: ${hand.map(c => `${c.name}(${c.type})`).join(', ') || 'none'}

Should you flee this battle to preserve HP and cards?
Reply with JSON: {"flee":<true|false>,"reason":"<one sentence>"}`;

    const response = await this.anthropic.messages.create({
      model: this.llmModel,
      max_tokens: 128,
      messages: [{ role: 'user', content: prompt }],
    });

    const text = response.content[0]?.text ?? '';
    const match = text.match(/\{[^}]+\}/);
    if (!match) throw new Error('LLM returned no JSON');
    const parsed = JSON.parse(match[0]);

    return { flee: !!parsed.flee, reason: parsed.reason ?? (parsed.flee ? 'LLM chose flee' : 'LLM chose fight') };
  }
}

// ─── CLI Entry ────────────────────────────────────────────────────────────────

if (process.argv[1] === new URL(import.meta.url).pathname) {
  const args  = process.argv.slice(2);
  const roomIdx = args.indexOf('--room');
  const nameIdx = args.indexOf('--name');

  const agent = new OxarkAgent({
    roomId: roomIdx >= 0 ? args[roomIdx + 1] : null,
    name:   nameIdx >= 0 ? args[nameIdx + 1] : AGENT_NAME,
  });

  process.on('SIGINT', () => { agent.stop(); process.exit(0); });

  agent.start().then(decisions => {
    log('info', `Agent stopped after ${decisions.length} decisions`);
  });
}

/**
 * agent-vs-agent.js — 0xARK Agent vs Agent Tournament Runner
 *
 * Runs a self-contained duel between two Claude Haiku agents.
 * No external server required — both agents share an in-process event bus.
 *
 * Usage:
 *   ANTHROPIC_API_KEY=sk-... node scripts/agent-vs-agent.js
 *
 * Environment:
 *   ANTHROPIC_API_KEY   — Required (both agents use Haiku 4.5)
 *   AGENT_HALL          — bronze|silver|gold (default: bronze)
 *   LOG_PATH            — output log path (default: docs/sample-duel-logs/agent-vs-agent-001.log)
 *   ROUNDS              — number of duel rounds (default: 5)
 */

import Anthropic from '@anthropic-ai/sdk';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT  = path.resolve(__dirname, '../../..');

// ─── Config ──────────────────────────────────────────────────────────────────

const HALL      = process.env.AGENT_HALL || 'bronze';
const LOG_PATH  = process.env.LOG_PATH
  || path.join(REPO_ROOT, 'docs/sample-duel-logs/agent-vs-agent-001.log');
const ROUNDS    = parseInt(process.env.ROUNDS || '5', 10);
const LLM_MODEL = 'claude-haiku-4-5-20251001';

// ─── Logger ──────────────────────────────────────────────────────────────────

fs.mkdirSync(path.dirname(LOG_PATH), { recursive: true });
const logStream = fs.createWriteStream(LOG_PATH, { flags: 'w' });

function log(tag, msg) {
  const line = `[${new Date().toISOString()}] [${tag}] ${msg}`;
  console.log(line);
  logStream.write(line + '\n');
}

function logJson(tag, obj) {
  log(tag, JSON.stringify(obj));
}

// ─── Card Pool (shared between agents) ───────────────────────────────────────

const CARD_POOL = [
  // Black Flag Commons (Wind)
  { id:1,  name:'Powder-Charge Boarder', clan:'Black Flag',      bp:3, hp:2, ini:3, cost:2, elem:'wind',   rarity:'Common' },
  { id:2,  name:'Storm Bosun',           clan:'Black Flag',      bp:3, hp:2, ini:2, cost:2, elem:'wind',   rarity:'Common' },
  { id:3,  name:'Grapple Specialist',    clan:'Black Flag',      bp:4, hp:2, ini:3, cost:2, elem:'wind',   rarity:'Common' },
  { id:4,  name:'Salt-Bitten Deckhand',  clan:'Black Flag',      bp:3, hp:2, ini:1, cost:1, elem:'wind',   rarity:'Common' },
  { id:5,  name:'Flare Saboteur',        clan:'Black Flag',      bp:2, hp:2, ini:2, cost:1, elem:'wind',   rarity:'Common' },
  { id:6,  name:'Reef Pilot',            clan:'Black Flag',      bp:4, hp:3, ini:1, cost:3, elem:'wind',   rarity:'Common' },
  // Hollow Blade Commons (Fire)
  { id:13, name:'Oath-Branded Squire',   clan:'Hollow Blade',    bp:3, hp:3, ini:1, cost:2, elem:'fire',   rarity:'Common' },
  { id:14, name:'Palace Sentinel',       clan:'Hollow Blade',    bp:4, hp:4, ini:1, cost:3, elem:'fire',   rarity:'Common' },
  { id:15, name:'Sword Instructor',      clan:'Hollow Blade',    bp:2, hp:3, ini:2, cost:2, elem:'fire',   rarity:'Common' },
  { id:16, name:'Herald of Ashes',       clan:'Hollow Blade',    bp:2, hp:2, ini:3, cost:1, elem:'fire',   rarity:'Common' },
  // Iron Circle Commons (Earth)
  { id:23, name:'Ancestral Ranger',      clan:'Iron Circle',     bp:3, hp:4, ini:2, cost:3, elem:'earth',  rarity:'Common' },
  { id:24, name:'Lineage Scout',         clan:'Iron Circle',     bp:2, hp:3, ini:2, cost:1, elem:'earth',  rarity:'Common' },
  // Nameless Silk Commons (Shadow)
  { id:25, name:'Shadow Lifter',         clan:'Nameless Silk',   bp:2, hp:2, ini:3, cost:1, elem:'shadow', rarity:'Common' },
  { id:27, name:'Soul-Binder',           clan:'Nameless Silk',   bp:3, hp:2, ini:3, cost:2, elem:'shadow', rarity:'Common' },
  // Uncommons
  { id:31, name:'First Mate Kaelith',    clan:'Black Flag',      bp:5, hp:4, ini:3, cost:3, elem:'wind',   rarity:'Uncommon' },
  { id:39, name:'Captain of the Guard',  clan:'Hollow Blade',    bp:5, hp:5, ini:2, cost:3, elem:'fire',   rarity:'Uncommon' },
  { id:40, name:'Oathsworn Knight',      clan:'Hollow Blade',    bp:6, hp:6, ini:1, cost:4, elem:'fire',   rarity:'Uncommon' },
  { id:45, name:'Silent Assassin',       clan:'Nameless Silk',   bp:5, hp:3, ini:4, cost:3, elem:'shadow', rarity:'Uncommon' },
  { id:46, name:'Soul-Thief',            clan:'Nameless Silk',   bp:4, hp:3, ini:4, cost:3, elem:'shadow', rarity:'Uncommon' },
];

function drawHand(n = 5) {
  const shuffled = [...CARD_POOL].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, n);
}

// ─── Agent Player ─────────────────────────────────────────────────────────────

class AgentPlayer {
  constructor(name, clan) {
    this.name    = name;
    this.clan    = clan;
    this.hp      = 20;
    this.hand    = drawHand(5);
    this.lanes   = { front: null, middle: null, back: null };
    this.energy  = 4;
    this.shards  = 3;
    this.peeksLeft = 3;
    this.stats   = { summons: 0, apiCalls: 0, fallbacks: 0 };
    this.client  = process.env.ANTHROPIC_API_KEY
      ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
      : null;
  }

  async decideSummon(round, opponentVisible) {
    if (!this.client) return this._heuristicSummon();

    const prompt = `You are ${this.name}, playing ${this.clan} in 0xARK (${HALL} hall, round ${round}/${ROUNDS}).

Your HP: ${this.hp} | Energy: ${this.energy} | Shards: ${this.shards}
Your hand: ${JSON.stringify(this.hand.map(c => ({ id: c.id, name: c.name, bp: c.bp, hp: c.hp, cost: c.cost, elem: c.elem })))}
Your lanes: front=${this.lanes.front?.name||'empty'} middle=${this.lanes.middle?.name||'empty'} back=${this.lanes.back?.name||'empty'}
Opponent visible: ${JSON.stringify(opponentVisible)}

Output ONLY valid JSON. Choose 1 summon action (or pass):
{"action":"summon","card_id":N,"lane":"front|middle|back","reasoning":"one sentence"}
OR {"action":"pass","reasoning":"why"}`;

    try {
      const resp = await this.client.messages.create({
        model: LLM_MODEL,
        max_tokens: 200,
        messages: [{ role: 'user', content: prompt }],
      });
      const parsed = JSON.parse(resp.content[0]?.text || '{}');
      this.stats.apiCalls++;
      return parsed;
    } catch (_) {
      this.stats.fallbacks++;
      return this._heuristicSummon();
    }
  }

  _heuristicSummon() {
    const affordable = this.hand.filter(c => c.cost <= this.energy);
    if (!affordable.length) return { action: 'pass', reasoning: 'no affordable cards' };
    const best = affordable.sort((a,b) => b.bp - a.bp)[0];
    const lane = !this.lanes.front ? 'front' : !this.lanes.middle ? 'middle' : 'back';
    return { action: 'summon', card_id: best.id, lane, reasoning: 'highest BP affordable card' };
  }

  applySummon(decision) {
    if (decision.action !== 'summon') return null;
    const card = this.hand.find(c => c.id === decision.card_id);
    if (!card || this.energy < card.cost) return null;
    if (this.lanes[decision.lane]) return null; // lane occupied

    this.lanes[decision.lane] = card;
    this.hand = this.hand.filter(c => c.id !== card.id);
    this.energy -= card.cost;
    this.stats.summons++;
    return card;
  }

  draw(n = 1) {
    const pool = CARD_POOL.filter(c => !this.hand.find(h => h.id === c.id));
    const picks = pool.sort(() => Math.random() - 0.5).slice(0, n);
    this.hand.push(...picks);
  }

  refillEnergy(round) {
    this.energy = Math.min(4 + round, 8);
  }

  visibleLanes() {
    return Object.fromEntries(
      Object.entries(this.lanes).map(([lane, card]) => [lane, card ? { name: card.name, bp: card.bp, hp: card.hp } : null])
    );
  }
}

// ─── Battle Resolution ────────────────────────────────────────────────────────

function resolveBattle(a, b) {
  const events = [];
  const ELEMENT_BONUS = {
    fire: 'earth', earth: 'wind', wind: 'shadow', shadow: 'gold', gold: 'fire',
  };

  for (const lane of ['front', 'middle', 'back']) {
    const ca = a.lanes[lane];
    const cb = b.lanes[lane];
    if (!ca && !cb) continue;

    let aBP = ca?.bp || 0;
    let bBP = cb?.bp || 0;

    // Element affinity (+2 BP if you counter opponent's element)
    if (ca && cb) {
      if (ELEMENT_BONUS[ca.elem] === cb.elem) aBP += 2;
      if (ELEMENT_BONUS[cb.elem] === ca.elem) bBP += 2;
    }

    // Back lane defender: 50% reduced incoming damage
    const aIsBack = lane === 'back';

    if (ca && cb) {
      // Both have cards — trade
      const netA = aBP - bBP;
      const netB = bBP - aBP;
      if (netA > 0) { b.hp -= aIsBack ? Math.ceil(netA / 2) : netA; }
      if (netB > 0) { a.hp -= aIsBack ? Math.ceil(netB / 2) : netB; }
      events.push({ lane, a: ca.name, b: cb.name, aBP, bBP, net: netA });
    } else if (ca) {
      b.hp -= aBP;
      events.push({ lane, a: ca.name, b: null, aBP, net: aBP });
    } else if (cb) {
      a.hp -= bBP;
      events.push({ lane, a: null, b: cb.name, bBP, net: -bBP });
    }
  }

  // Clear lanes after battle
  a.lanes = { front: null, middle: null, back: null };
  b.lanes = { front: null, middle: null, back: null };

  return events;
}

// ─── Main Duel ────────────────────────────────────────────────────────────────

async function runDuel() {
  log('SYSTEM', `=== 0xARK Agent vs Agent Duel ===`);
  log('SYSTEM', `Hall: ${HALL} | Rounds: ${ROUNDS} | Model: ${LLM_MODEL}`);
  log('SYSTEM', `Log: ${LOG_PATH}`);
  log('SYSTEM', `LLM available: ${!!process.env.ANTHROPIC_API_KEY}`);

  const alpha = new AgentPlayer('ALPHA (Black Flag)', 'Black Flag');
  const beta  = new AgentPlayer('BETA (Hollow Blade)', 'Hollow Blade');

  log('DUEL', `Players: ${alpha.name} vs ${beta.name}`);
  log('DUEL', `Alpha hand: ${alpha.hand.map(c=>c.name).join(', ')}`);
  log('DUEL', `Beta  hand: ${beta.hand.map(c=>c.name).join(', ')}`);

  const duelLog = {
    meta: {
      timestamp: new Date().toISOString(),
      hall: HALL,
      model: LLM_MODEL,
      rounds: ROUNDS,
      players: [
        { name: alpha.name, clan: alpha.clan },
        { name: beta.name,  clan: beta.clan  },
      ],
    },
    rounds: [],
    result: null,
  };

  for (let round = 1; round <= ROUNDS; round++) {
    log('ROUND', `─── Round ${round}/${ROUNDS} ─── Alpha HP:${alpha.hp} Beta HP:${beta.hp}`);

    // Draw phase
    alpha.draw(1);
    beta.draw(1);
    log('DRAW', `Alpha drew: ${alpha.hand.at(-1)?.name} | Beta drew: ${beta.hand.at(-1)?.name}`);

    // Energy phase
    alpha.refillEnergy(round);
    beta.refillEnergy(round);
    log('ENERGY', `Alpha energy: ${alpha.energy} | Beta energy: ${beta.energy}`);

    // Summon phase — both agents decide simultaneously
    const [alphaDecision, betaDecision] = await Promise.all([
      alpha.decideSummon(round, beta.visibleLanes()),
      beta.decideSummon(round, alpha.visibleLanes()),
    ]);

    log('SUMMON', `Alpha: ${JSON.stringify(alphaDecision)}`);
    log('SUMMON', `Beta:  ${JSON.stringify(betaDecision)}`);

    const alphaCard = alpha.applySummon(alphaDecision);
    const betaCard  = beta.applySummon(betaDecision);

    if (alphaCard) log('SUMMON', `Alpha plays ${alphaCard.name} to ${alphaDecision.lane}`);
    if (betaCard)  log('SUMMON', `Beta  plays ${betaCard.name}  to ${betaDecision.lane}`);

    // Battle phase
    const battleEvents = resolveBattle(alpha, beta);
    for (const ev of battleEvents) {
      log('BATTLE', JSON.stringify(ev));
    }
    log('STATUS', `After battle — Alpha HP:${alpha.hp} Beta HP:${beta.hp}`);

    duelLog.rounds.push({
      round,
      alpha: { hp: alpha.hp, decision: alphaDecision, played: alphaCard?.name || null },
      beta:  { hp: beta.hp,  decision: betaDecision,  played: betaCard?.name  || null },
      battle: battleEvents,
    });

    if (alpha.hp <= 0 || beta.hp <= 0) {
      log('DUEL', `Early finish at round ${round}`);
      break;
    }
  }

  // Determine winner
  let winner;
  if (alpha.hp > beta.hp) winner = alpha.name;
  else if (beta.hp > alpha.hp) winner = beta.name;
  else winner = 'DRAW';

  log('RESULT', `WINNER: ${winner} | Alpha HP:${alpha.hp} Beta HP:${beta.hp}`);
  log('RESULT', `Alpha stats: ${JSON.stringify(alpha.stats)}`);
  log('RESULT', `Beta  stats: ${JSON.stringify(beta.stats)}`);

  duelLog.result = {
    winner,
    finalHp: { alpha: alpha.hp, beta: beta.hp },
    stats: {
      alpha: alpha.stats,
      beta:  beta.stats,
    },
    completedAt: new Date().toISOString(),
  };

  // Write structured JSON summary at end of log
  log('JSON_SUMMARY', JSON.stringify(duelLog, null, 2));
  log('SYSTEM', `=== Duel complete. Log saved to ${LOG_PATH} ===`);

  logStream.end();
  return duelLog;
}

// ─── Entry ────────────────────────────────────────────────────────────────────

runDuel()
  .then(result => {
    console.log(`\n✓ Duel complete: ${result.result.winner}`);
    console.log(`  Log: ${LOG_PATH}`);
    process.exit(0);
  })
  .catch(err => {
    console.error('Fatal:', err.message);
    process.exit(1);
  });

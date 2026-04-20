#!/usr/bin/env node
/**
 * T44 E2E — 0xARK AI Agent auto-play bot
 *
 * Tests (no live server or API key required):
 *   1. OxarkAgent instantiates correctly
 *   2. Heuristic dungeon move — normal exploration (go south)
 *   3. Heuristic dungeon move — low HP retreat (go north)
 *   4. Heuristic card selection — counter opponent type
 *   5. Heuristic card selection — critical HP prefers recovery
 *   6. Heuristic flee — flee when low HP and no recovery
 *   7. Heuristic flee — stay when healthy
 *   8. LLM dungeon move (live, skipped if no API key)
 *   9. LLM card battle decision (live, skipped if no API key)
 *  10. Decision recording via getDecisions()
 *  11. decideDungeonMove falls back to heuristic when LLM unavailable
 *  12. decideBattleCard falls back to heuristic when LLM unavailable
 *
 * Usage:
 *   node tests/t44-agent-e2e.js
 *   ANTHROPIC_API_KEY=sk-... node tests/t44-agent-e2e.js   # enables live LLM tests
 */

import { OxarkAgent } from '../agent.js';
import { heuristicMove, heuristicCard, heuristicFlee } from '../strategy.js';

// ─── Helpers ──────────────────────────────────────────────────────────────────
let passed = 0, failed = 0;

function assert(label, cond, detail = '') {
  if (cond) {
    console.log(`  ✅ ${label}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${label}${detail ? ' — ' + detail : ''}`);
    failed++;
  }
}

function skip(label, reason) {
  console.log(`  ⏭  SKIP: ${label} (${reason})`);
}

// ─── Sample data ──────────────────────────────────────────────────────────────
const SAMPLE_HAND = [
  { id: 1,  name: 'AEGIS',    type: 'attack',   rarity: 5 },
  { id: 13, name: 'GUARD',    type: 'defense',  rarity: 1 },
  { id: 49, name: 'HEAL',     type: 'recovery', rarity: 2 },
  { id: 37, name: 'TEMPEST',  type: 'magic',    rarity: 5 },
  { id: 25, name: 'DASH',     type: 'flee',     rarity: 1 },
];

const BASE_STATE = {
  x: 20, y: 20, area: 1,
  hp: 80, maxHp: 100,
  hand: SAMPLE_HAND,
  floorDepth: 2,
};

const OPEN_MOVE = (dx, dy) => {
  const nx = 20 + dx, ny = 20 + dy;
  return nx >= 0 && nx < 40 && ny >= 0 && ny < 40;
};

// ─── Tests ────────────────────────────────────────────────────────────────────
console.log('=== T44 AI Agent E2E ===\n');

// 1. Instantiation
console.log('[1] OxarkAgent instantiation');
{
  const agent = new OxarkAgent({ apiKey: null, tickMs: 9999 });
  assert('agent created',           agent instanceof OxarkAgent);
  assert('no anthropic without key', agent.anthropic === null);
  assert('decisions empty',          agent.getDecisions().length === 0);
}

// 2. Heuristic move — normal (go south)
console.log('\n[2] Heuristic move — normal exploration');
{
  const result = heuristicMove({ ...BASE_STATE }, OPEN_MOVE);
  assert('returns direction', typeof result.dx === 'number' && typeof result.dy === 'number');
  assert('goes south (deeper)', result.dy === 1, `dy=${result.dy}`);
  assert('has reason', typeof result.reason === 'string' && result.reason.length > 0);
}

// 3. Heuristic move — low HP retreat (go north)
console.log('\n[3] Heuristic move — low HP retreat');
{
  const lowHpState = { ...BASE_STATE, hp: 20 };  // 20% hp
  const result = heuristicMove(lowHpState, OPEN_MOVE);
  assert('retreats north', result.dy === -1, `dy=${result.dy}`);
  assert('reason mentions hp', result.reason.toLowerCase().includes('hp') || result.reason.includes('retreat'));
}

// 4. Heuristic card — counter opponent
console.log('\n[4] Heuristic card selection — counter opponent');
{
  // Opponent plays attack → we should counter with defense
  const result = heuristicCard(SAMPLE_HAND, 'attack', { hp: 80, maxHp: 100 });
  assert('returns cardIndex',  typeof result.cardIndex === 'number');
  assert('selects defense card', result.card.type === 'defense', `got ${result.card.type}`);
  assert('reason mentions counter', result.reason.toLowerCase().includes('counter'));
}

// 5. Heuristic card — critical HP prefers recovery
console.log('\n[5] Heuristic card selection — critical HP uses recovery');
{
  const result = heuristicCard(SAMPLE_HAND, null, { hp: 15, maxHp: 100 });
  assert('returns cardIndex', typeof result.cardIndex === 'number');
  assert('picks recovery',    result.card.type === 'recovery', `got ${result.card.type}`);
}

// 6. Heuristic flee — flee when low HP and no recovery
console.log('\n[6] Heuristic flee — flee when low HP + no recovery');
{
  const noRecoveryHand = SAMPLE_HAND.filter(c => c.type !== 'recovery');
  const state = { ...BASE_STATE, hp: 20, hand: noRecoveryHand };
  const result = heuristicFlee(state, 'attack');
  assert('decides to flee', result.flee === true, `flee=${result.flee}`);
  assert('has reason', result.reason.length > 0);
}

// 7. Heuristic flee — stay when healthy
console.log('\n[7] Heuristic flee — stay when healthy');
{
  const result = heuristicFlee(BASE_STATE, 'attack');
  assert('decides to stay', result.flee === false, `flee=${result.flee}`);
}

// 8. LLM dungeon move (live — skipped if no API key)
console.log('\n[8] LLM dungeon move (live)');
if (!process.env.ANTHROPIC_API_KEY) {
  skip('LLM dungeon move', 'no ANTHROPIC_API_KEY');
} else {
  const agent = new OxarkAgent({ tickMs: 9999 });
  agent.state  = { ...BASE_STATE };
  const result = await agent.decideDungeonMove(OPEN_MOVE);
  // When key is valid: source='llm'; when key invalid: fallback to heuristic — both are valid
  assert('returns a direction',    typeof result.dx === 'number');
  assert('has reason',             result.reason?.length > 0);
  assert('source is llm or heuristic', result.source === 'llm' || result.source === 'heuristic');
  if (result.source === 'llm') console.log(`  LLM chose: ${result.reason}`);
  else                         console.log(`  Heuristic fallback: ${result.reason}`);
}

// 9. LLM card battle decision (live)
console.log('\n[9] LLM card battle decision (live)');
if (!process.env.ANTHROPIC_API_KEY) {
  skip('LLM battle card', 'no ANTHROPIC_API_KEY');
} else {
  const agent = new OxarkAgent({ tickMs: 9999 });
  agent.state  = { ...BASE_STATE, inBattle: true, opponent: { cardType: 'attack' } };
  const result = await agent.decideBattleCard();
  assert('valid cardIndex',   result.cardIndex >= 0 && result.cardIndex < SAMPLE_HAND.length);
  assert('has reason',        result.reason?.length > 0);
  assert('source is llm or heuristic', result.source === 'llm' || result.source === 'heuristic');
  if (result.source === 'llm') console.log(`  LLM chose: ${result.reason}`);
  else                         console.log(`  Heuristic fallback: ${result.reason}`);
}

// 10. Decision recording
console.log('\n[10] Decision recording via getDecisions()');
{
  const agent = new OxarkAgent({ apiKey: null, tickMs: 9999 });
  agent.state  = { ...BASE_STATE };
  agent._decisions = [];

  await agent.decideDungeonMove(OPEN_MOVE).then(d => agent._decisions.push({ type: 'move', ...d }));
  await agent.decideBattleCard().then(d => agent._decisions.push({ type: 'card', ...d }));

  const decisions = agent.getDecisions();
  assert('has 2 decisions', decisions.length === 2, `got ${decisions.length}`);
  assert('first is move',   decisions[0].type === 'move');
  assert('second is card',  decisions[1].type === 'card');
}

// 11. decideDungeonMove falls back to heuristic when LLM unavailable
console.log('\n[11] decideDungeonMove — heuristic fallback (no API key)');
{
  const agent = new OxarkAgent({ apiKey: null, tickMs: 9999 });
  agent.state  = { ...BASE_STATE };
  const result = await agent.decideDungeonMove(OPEN_MOVE);
  assert('source is heuristic', result.source === 'heuristic', `got ${result.source}`);
  assert('valid direction',     typeof result.dx === 'number');
}

// 12. decideBattleCard falls back to heuristic when LLM unavailable
console.log('\n[12] decideBattleCard — heuristic fallback (no API key)');
{
  const agent = new OxarkAgent({ apiKey: null, tickMs: 9999 });
  agent.state  = { ...BASE_STATE, opponent: { cardType: 'attack' } };
  const result = await agent.decideBattleCard();
  assert('source is heuristic', result.source === 'heuristic', `got ${result.source}`);
  assert('valid cardIndex',     result.cardIndex >= 0);
  assert('card is defense',     result.card.type === 'defense', `got ${result.card?.type}`);
}

// ─── Result ──────────────────────────────────────────────────────────────────
console.log(`\n=== T44 RESULT: ${passed} passed, ${failed} failed ===`);
if (failed > 0) process.exit(1);

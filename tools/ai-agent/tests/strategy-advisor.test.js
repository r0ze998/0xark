// strategy-advisor.test.js — Unit tests for parseAdviceResponse
// No API key required; tests the parsing + fallback logic only.
import { parseAdviceResponse } from '../src/strategy-advisor.js';

const tests = [];
let passed = 0;
let failed = 0;

function test(name, fn) { tests.push({ name, fn }); }
function assert(cond, msg) { if (!cond) throw new Error(msg ?? 'assertion failed'); }
function assertEqual(a, b) { if (a !== b) throw new Error(`expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`); }

// ── Well-formed Claude response ───────────────────────────────────────────────

test('parses full JSON block with code fences', () => {
  const text = `
Here's my advice:

\`\`\`json
{
  "primaryAction": { "type": "attack", "cards": [1, 5, 12], "reasoning": "High BP combo" },
  "alternativeActions": [
    { "type": "defense", "cards": [3], "reasoning": "Safe play if opponent is aggressive" }
  ],
  "riskLevel": "medium"
}
\`\`\`

Focus on aggressive early game to build pressure.
`;
  const result = parseAdviceResponse(text, { currentPhase: 'preparation' });
  assertEqual(result.recommendation.primaryAction.type, 'attack');
  assert(result.recommendation.primaryAction.cards.includes(5), 'cards should include 5');
  assertEqual(result.recommendation.primaryAction.reasoning, 'High BP combo');
  assertEqual(result.recommendation.alternativeActions.length, 1);
  assertEqual(result.recommendation.alternativeActions[0].type, 'defense');
  assertEqual(result.recommendation.riskLevel, 'medium');
  assertEqual(result.recommendation.phase, 'preparation');
  assert(result.explanation.length > 0, 'explanation should not be empty');
  assertEqual(result.identity_source, 'ai');
});

test('falls back gracefully when JSON is missing', () => {
  const result = parseAdviceResponse('Just some plain text advice.', { currentPhase: 'reveal' });
  assertEqual(result.recommendation.primaryAction.type, 'attack');
  assert(Array.isArray(result.recommendation.alternativeActions));
  assertEqual(result.recommendation.phase, 'reveal');
  assertEqual(result.identity_source, 'ai');
});

test('falls back gracefully on empty text', () => {
  const result = parseAdviceResponse('', { currentPhase: 'interruption' });
  assertEqual(result.recommendation.phase, 'interruption');
  assertEqual(result.identity_source, 'ai');
});

test('clamps alternativeActions to 3', () => {
  const text = `
\`\`\`json
{
  "primaryAction": { "type": "flee", "cards": [], "reasoning": "Escape" },
  "alternativeActions": [
    { "type": "attack", "cards": [1], "reasoning": "A" },
    { "type": "defense", "cards": [2], "reasoning": "B" },
    { "type": "magic", "cards": [3], "reasoning": "C" },
    { "type": "heal", "cards": [4], "reasoning": "D" }
  ],
  "riskLevel": "low"
}
\`\`\`
`;
  const result = parseAdviceResponse(text, {});
  assert(result.recommendation.alternativeActions.length <= 3, 'should clamp to 3');
});

test('sanitizes invalid riskLevel to medium', () => {
  const text = `\`\`\`json
{ "primaryAction": { "type": "attack", "cards": [], "reasoning": "x" },
  "alternativeActions": [],
  "riskLevel": "extreme" }
\`\`\``;
  const result = parseAdviceResponse(text, {});
  assertEqual(result.recommendation.riskLevel, 'medium');
});

test('clamps card list to 5 entries', () => {
  const text = `\`\`\`json
{ "primaryAction": { "type": "attack", "cards": [1,2,3,4,5,6,7,8], "reasoning": "All in" },
  "alternativeActions": [],
  "riskLevel": "high" }
\`\`\``;
  const result = parseAdviceResponse(text, {});
  assert(result.recommendation.primaryAction.cards.length <= 5, 'cards should be clamped to 5');
});

test('explanation strips JSON fences', () => {
  const text = 'Advice here.\n```json\n{"primaryAction":{"type":"attack","cards":[],"reasoning":"x"},"alternativeActions":[],"riskLevel":"low"}\n```\nEnd advice.';
  const result = parseAdviceResponse(text, {});
  assert(!result.explanation.includes('```'), 'explanation should not contain fences');
  assert(result.explanation.includes('Advice here'), 'explanation should include prefix text');
});

test('handles snake_case keys from older responses', () => {
  const text = `\`\`\`json
{ "primary_action": { "type": "heal", "cards": [5], "reasoning": "low hp" },
  "alternatives": [],
  "risk_level": "low" }
\`\`\``;
  const result = parseAdviceResponse(text, {});
  assertEqual(result.recommendation.primaryAction.type, 'heal');
  assertEqual(result.recommendation.riskLevel, 'low');
});

// ── Run ───────────────────────────────────────────────────────────────────────
for (const { name, fn } of tests) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ✗ ${name}: ${err.message}`);
    failed++;
  }
}

console.log('─'.repeat(50));
console.log(`strategy-advisor: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);

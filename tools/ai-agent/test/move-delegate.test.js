'use strict';
/**
 * move-delegate.test.js — Phase 14 AI move delegation unit tests
 * Run: node tools/ai-agent/test/move-delegate.test.js
 */

import assert from 'node:assert/strict';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const { parseAiResponse, delegateMove } = await import(
  path.join(__dirname, '../src/move-delegate.js')
);

let passed = 0, failed = 0;
function test(name, fn) {
  try { fn(); console.log(`  ✓ ${name}`); passed++; }
  catch (e) { console.error(`  ✗ ${name}\n    ${e.message}`); failed++; }
}
async function asyncTest(name, fn) {
  try { await fn(); console.log(`  ✓ ${name}`); passed++; }
  catch (e) { console.error(`  ✗ ${name}\n    ${e.message}`); failed++; }
}

const VALID_PUBKEY = 'So11111111111111111111111111111111111111112';
const MOCK_STATE   = { hp: 80, maxHp: 100, round: 2, opponentPubkey: VALID_PUBKEY };

// ─── parseAiResponse ─────────────────────────────────────────────────────────

console.log('\nmove-delegate — parseAiResponse');

test('valid JSON → correct action_type and target', () => {
  const r = parseAiResponse(`{"action_type":3,"target":"${VALID_PUBKEY}"}`, MOCK_STATE);
  assert.equal(r.action_type, 3);
  assert.equal(r.target, VALID_PUBKEY);
  assert.equal(r.identity_source, 'ai');
});

test('action_type=10 (deprecated Move) → fallback to 0', () => {
  const r = parseAiResponse('{"action_type":10,"target":"' + VALID_PUBKEY + '"}', MOCK_STATE);
  assert.equal(r.action_type, 0);
});

test('action_type=15 (out of range) → fallback to 0', () => {
  const r = parseAiResponse('{"action_type":15,"target":"' + VALID_PUBKEY + '"}', MOCK_STATE);
  assert.equal(r.action_type, 0);
});

test('action_type=-1 → fallback to 0', () => {
  const r = parseAiResponse('{"action_type":-1,"target":"' + VALID_PUBKEY + '"}', MOCK_STATE);
  assert.equal(r.action_type, 0);
});

test('no JSON in response → fallback (action_type=0, target=null)', () => {
  const r = parseAiResponse('I choose to draw a card', MOCK_STATE);
  assert.equal(r.action_type, 0);
  assert.equal(r.target, null);
});

test('invalid JSON → fallback', () => {
  const r = parseAiResponse('{bad json}', MOCK_STATE);
  assert.equal(r.action_type, 0);
});

test('invalid target format → uses opponentPubkey from publicState', () => {
  const r = parseAiResponse('{"action_type":1,"target":"not_a_pubkey"}', MOCK_STATE);
  assert.equal(r.action_type, 1);
  assert.equal(r.target, VALID_PUBKEY);
});

test('no opponentPubkey in state → null target when target invalid', () => {
  const r = parseAiResponse('{"action_type":2,"target":"INVALID"}', {});
  assert.equal(r.action_type, 2);
  assert.equal(r.target, null);
});

test('identity_source always "ai"', () => {
  const r = parseAiResponse('{}', MOCK_STATE);
  assert.equal(r.identity_source, 'ai');
});

// ─── delegateMove (with mock Anthropic factory) ──────────────────────────────

console.log('\nmove-delegate — delegateMove');

function makeMockAnthropic(responseText) {
  return class MockAnthropic {
    constructor() {}
    get messages() {
      return {
        create: async () => ({
          content: [{ type: 'text', text: responseText }],
        }),
      };
    }
  };
}

await asyncTest('delegateMove with valid API response', async () => {
  process.env.ANTHROPIC_API_KEY = 'sk-test-key';
  const MockAnthropic = makeMockAnthropic(`{"action_type":5,"target":"${VALID_PUBKEY}"}`);
  const result = await delegateMove(MOCK_STATE, MockAnthropic);
  assert.equal(result.action_type, 5);
  assert.equal(result.target, VALID_PUBKEY);
  assert.equal(result.identity_source, 'ai');
  delete process.env.ANTHROPIC_API_KEY;
});

await asyncTest('delegateMove without ANTHROPIC_API_KEY throws', async () => {
  const prev = process.env.ANTHROPIC_API_KEY;
  delete process.env.ANTHROPIC_API_KEY;
  await assert.rejects(() => delegateMove(MOCK_STATE), /ANTHROPIC_API_KEY/);
  if (prev) process.env.ANTHROPIC_API_KEY = prev;
});

await asyncTest('delegateMove: API error → fallback action (action_type=0)', async () => {
  process.env.ANTHROPIC_API_KEY = 'sk-test-key';
  class ErrorAnthropic {
    constructor() {}
    get messages() {
      return { create: async () => { throw new Error('rate limited'); } };
    }
  }
  const result = await delegateMove(MOCK_STATE, ErrorAnthropic);
  assert.equal(result.action_type, 0);
  assert.equal(result.identity_source, 'ai');
  delete process.env.ANTHROPIC_API_KEY;
});

await asyncTest('delegateMove: deprecated action_type=10 → fallback', async () => {
  process.env.ANTHROPIC_API_KEY = 'sk-test-key';
  const MockAnthropic = makeMockAnthropic('{"action_type":10,"target":"' + VALID_PUBKEY + '"}');
  const result = await delegateMove(MOCK_STATE, MockAnthropic);
  assert.equal(result.action_type, 0);
  delete process.env.ANTHROPIC_API_KEY;
});

console.log('\n' + '─'.repeat(50));
console.log(`move-delegate: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exitCode = 1;

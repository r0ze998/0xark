// move-delegate.js — Phase 14 AI move delegation
// ESM. Imported by multiplayer/server.js and tested by tools/ai-agent/test/move-delegate.test.js.

const BASE58_RE = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

/**
 * Parse a raw Claude text response into a validated move result.
 * Exported for unit testing without a real API call.
 *
 * @param {string} text         — raw LLM response text
 * @param {object} publicState  — original publicState (for fallback opponentPubkey)
 * @returns {{ action_type: number, target: string|null, identity_source: 'ai' }}
 */
export function parseAiResponse(text, publicState) {
  const match = String(text).match(/\{[^}]+\}/);
  if (!match) return { action_type: 0, target: null, identity_source: 'ai' };

  let parsed;
  try { parsed = JSON.parse(match[0]); } catch {
    return { action_type: 0, target: null, identity_source: 'ai' };
  }

  const action_type = parseInt(parsed.action_type, 10);
  const validActionType = !isNaN(action_type) && action_type >= 0 && action_type <= 9
    ? action_type
    : 0;

  const rawTarget = typeof parsed.target === 'string' ? parsed.target : null;
  const target = rawTarget && BASE58_RE.test(rawTarget)
    ? rawTarget
    : (publicState?.opponentPubkey ?? null);

  return { action_type: validActionType, target, identity_source: 'ai' };
}

/**
 * Delegate a 0xARK battle move to Claude AI.
 * Uses only public_state — hidden opponent information must never be passed.
 *
 * @param {object} publicState  — { hand, hp, maxHp, round, opponentAction, opponentPubkey, ... }
 * @param {Function|null} _anthropicFactory  — optional DI for testing; pass a mock Anthropic class
 * @returns {Promise<{ action_type: number, target: string|null, identity_source: 'ai' }>}
 * @throws {Error} if ANTHROPIC_API_KEY not set or SDK unavailable
 */
export async function delegateMove(publicState, _anthropicFactory = null) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY not configured');

  const model = process.env.AI_MODEL_NAME || 'claude-sonnet-4-6';

  let AnthropicClass = _anthropicFactory;
  if (!AnthropicClass) {
    try {
      ({ default: AnthropicClass } = await import('@anthropic-ai/sdk'));
    } catch {
      throw new Error('Anthropic SDK not available');
    }
  }

  const client = new AnthropicClass({ apiKey });
  const prompt =
    'You are an 0xARK card battle player. Given the current state, ' +
    'choose the optimal action_type (0-9, Move=10 deprecated) and target.\n' +
    'State: ' + JSON.stringify(publicState) + '\n' +
    'Respond with JSON: {"action_type": <int 0-9>, "target": "<pubkey_string>"}';

  let text = '';
  try {
    const response = await client.messages.create({
      model,
      max_tokens: 128,
      messages: [{ role: 'user', content: prompt }],
    });
    text = response.content[0]?.text ?? '';
  } catch (err) {
    console.error('[move-delegate] Claude API error:', err.message);
    return { action_type: 0, target: null, identity_source: 'ai' };
  }

  return parseAiResponse(text, publicState);
}

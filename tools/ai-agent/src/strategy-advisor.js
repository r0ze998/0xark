// strategy-advisor.js — Phase 19 AI strategy advice (non-binding suggestions)
// ESM. Imported by multiplayer/server.js for /x402/ai-strategy-advice.
//
// Contrast with move-delegate.js (ai-move):
//   ai-move       → AI decides; result goes on-chain immediately
//   ai-strategy-advice → AI suggests; player decides whether to follow

// ─── Types (JSDoc) ────────────────────────────────────────────────────────────

/**
 * @typedef {{ type: string, cards: number[], reasoning: string }} ActionSuggestion
 * @typedef {{
 *   primaryAction: ActionSuggestion,
 *   alternativeActions: ActionSuggestion[],
 *   riskLevel: 'low'|'medium'|'high',
 *   phase: string,
 * }} Recommendation
 * @typedef {{ recommendation: Recommendation, explanation: string, identity_source: 'ai' }} AdviceResult
 */

const PHASE_LABELS = {
  preparation:  'Preparation (select 5 cards + actions)',
  interruption: 'Interruption (may swap cards before reveal)',
  reveal:       'Reveal (compute BP totals)',
};

/**
 * Parse Claude's response into a structured AdviceResult.
 * Exported for unit testing.
 *
 * @param {string} text       — raw LLM response
 * @param {object} context    — original context (for fallback values)
 * @returns {AdviceResult}
 */
export function parseAdviceResponse(text, context = {}) {
  const phase = context.currentPhase ?? 'preparation';

  // Try to extract a JSON block from the response
  const jsonMatch = String(text).match(/```json\s*([\s\S]*?)```/i)
    || String(text).match(/(\{[\s\S]*"primaryAction"[\s\S]*\})/);

  let rec = null;
  if (jsonMatch) {
    try { rec = JSON.parse(jsonMatch[1] ?? jsonMatch[0]); } catch (_) {}
  }

  // Build a safe recommendation object regardless of parse quality
  const primaryAction = rec?.primaryAction ?? rec?.primary_action ?? null;
  const alternatives  = Array.isArray(rec?.alternativeActions ?? rec?.alternatives)
    ? (rec.alternativeActions ?? rec.alternatives).slice(0, 3)
    : [];
  const riskLevel = ['low', 'medium', 'high'].includes(rec?.riskLevel ?? rec?.risk_level)
    ? (rec.riskLevel ?? rec.risk_level)
    : 'medium';

  // Extract natural language explanation (everything outside JSON fences)
  const explanation = text
    .replace(/```json[\s\S]*?```/gi, '')
    .replace(/```[\s\S]*?```/gi, '')
    .trim()
    || 'No explanation provided.';

  const recommendation = {
    primaryAction: primaryAction
      ? {
          type:      String(primaryAction.type ?? 'attack').slice(0, 32),
          cards:     Array.isArray(primaryAction.cards) ? primaryAction.cards.map(Number).slice(0, 5) : [],
          reasoning: String(primaryAction.reasoning ?? '').slice(0, 256),
        }
      : { type: 'attack', cards: [], reasoning: 'Default fallback — no AI data.' },
    alternativeActions: alternatives.map(a => ({
      type:      String(a.type ?? '').slice(0, 32),
      cards:     Array.isArray(a.cards) ? a.cards.map(Number).slice(0, 5) : [],
      reasoning: String(a.reasoning ?? '').slice(0, 256),
    })),
    riskLevel,
    phase,
  };

  return { recommendation, explanation, identity_source: 'ai' };
}

/**
 * Build the system prompt for strategy advice.
 * Only public information and the player's own hand are included.
 */
function _buildPrompt(context) {
  const phase       = context.currentPhase ?? 'preparation';
  const phaseLabel  = PHASE_LABELS[phase] ?? phase;
  const ownVault    = (context.ownVault ?? []).slice(0, 60);
  const ownHand     = (context.ownHand  ?? []).slice(0, 5);
  const oppSize     = context.opponentVaultSize != null ? Number(context.opponentVaultSize) : null;
  const oppRevealed = (context.opponentRevealed ?? []).slice(0, 10);
  const history     = (context.matchHistory ?? []).slice(0, 3);

  const parts = [
    '0xARK is a Solana card battle game. You are a strategic advisor.',
    `Current phase: ${phaseLabel}`,
    '',
    'YOUR INFORMATION:',
    `- Vault cards (${ownVault.length}): [${ownVault.join(', ')}]`,
  ];
  if (ownHand.length > 0) {
    parts.push(`- Hand being considered: [${ownHand.join(', ')}]`);
  }
  parts.push('');
  parts.push('OPPONENT INFORMATION (public only):');
  if (oppSize != null) parts.push(`- Vault size: ${oppSize} cards`);
  if (oppRevealed.length > 0) parts.push(`- Revealed cards seen: [${oppRevealed.join(', ')}]`);
  if (oppSize == null && oppRevealed.length === 0) parts.push('- No intel available yet.');
  parts.push('');
  if (history.length > 0) {
    parts.push(`RECENT MATCH HISTORY (last ${history.length}): ${JSON.stringify(history)}`);
    parts.push('');
  }
  parts.push(
    'Provide strategic advice for this phase. Respond with:',
    '1. A JSON block (```json) containing:',
    '   { "primaryAction": { "type": string, "cards": number[], "reasoning": string },',
    '     "alternativeActions": [same shape, up to 2],',
    '     "riskLevel": "low"|"medium"|"high" }',
    '   Action types: "attack", "defense", "flee", "magic", "heal"',
    '   Cards: list of card IDs to play (from vault/hand above)',
    '2. A natural language explanation of your reasoning (2-3 sentences).',
    '',
    'IMPORTANT: Only use card IDs from the player\'s vault/hand. Do not reveal opponent\'s hidden cards.',
  );
  return parts.join('\n');
}

/**
 * Generate strategic advice using Claude AI.
 *
 * @param {object} context         — player context (see _buildPrompt)
 * @param {Function|null} _factory — optional Anthropic class for DI/testing
 * @returns {Promise<AdviceResult>}
 */
export async function adviseStrategy(context = {}, _factory = null) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY not configured');

  const model = process.env.AI_ADVISOR_MODEL || process.env.AI_MODEL_NAME || 'claude-haiku-4-5-20251001';

  let AnthropicClass = _factory;
  if (!AnthropicClass) {
    try {
      ({ default: AnthropicClass } = await import('@anthropic-ai/sdk'));
    } catch {
      throw new Error('Anthropic SDK not available');
    }
  }

  const client = new AnthropicClass({ apiKey });
  const prompt = _buildPrompt(context);

  let text = '';
  try {
    const response = await client.messages.create({
      model,
      max_tokens: 512,
      messages: [{ role: 'user', content: prompt }],
    });
    text = response.content[0]?.text ?? '';
  } catch (err) {
    console.error('[strategy-advisor] Claude API error:', err.message);
    return parseAdviceResponse('', context);
  }

  return parseAdviceResponse(text, context);
}

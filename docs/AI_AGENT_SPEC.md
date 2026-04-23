# 0xARK AI Agent — Specification

**Version:** v0.1  
**Status:** Implementation spec for Day 15 CC  
**Last updated:** 2026-04-22  
**Target:** Anthropic Claude Sonnet-powered agent that plays Duel Hall matches as matchmaking fallback or Tutorial opponent.

---

## Overview

### What it is

A Node.js/Bun process running on r0ze's Mac mini, holding its own Solana keypair, participating in the 0xARK matchmaking queue as if it were a human player. On matched duels, it plays the full game — makes summon decisions, commits hands via ZK, reveals cards, reacts to battles — using the Anthropic API as its decision engine.

### What it is not

- **Not a player-facing chatbot.** The agent never outputs text to human players. It plays the game silently.
- **Not a Lobby ambient NPC.** It doesn't walk around, doesn't shop, doesn't decorate scenes.
- **Not a pretrained bespoke model.** It's Claude Sonnet with a system prompt + per-turn context. No fine-tuning, no RAG setup.
- **Not a perfect adversary.** It's a "competent-enough mid-tier opponent." Humans should win ~50% of the time against Matchmaking AI, ~70-80% against Tutorial AI.

### Why Anthropic, not rule-based

1. **Pitch narrative**: "AI agents that play for real SOL and can win your NFTs" is the headline. Anthropic Claude is a recognizable, trustworthy brand for judges.
2. **Flexibility**: As card balance or new cards are added, the agent adapts without rewriting rules.
3. **Emergent behavior**: A rule-based AI is boring and predictable. Claude occasionally makes surprising creative plays that feel human.
4. **Cost acceptable**: ~$0.01-0.05 per duel (see Cost section). At expected volume, manageable.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│ Mac mini (Tailscale-accessible)                             │
│                                                             │
│  ┌───────────────────────────────────────────────────────┐ │
│  │ tools/ai-agent/                                       │ │
│  │                                                       │ │
│  │  agent.js ──────► Anthropic API (Claude Sonnet)       │ │
│  │     │                                                 │ │
│  │     ├──► Solana devnet (via @solana/web3.js)          │ │
│  │     │      - sign tx                                  │ │
│  │     │      - call commit_hand, reveal_hand, etc.      │ │
│  │     │                                                 │ │
│  │     ├──► WebSocket (multiplayer/server.js)            │ │
│  │     │      - receive opponent actions                 │ │
│  │     │      - send own actions                         │ │
│  │     │                                                 │ │
│  │     └──► snarkjs                                      │ │
│  │            - generate hand commitment proofs          │ │
│  │                                                       │ │
│  │  prompts/                                             │ │
│  │    system.md          (shared game rules)             │ │
│  │    matchmaking.md     (competitive agent)             │ │
│  │    tutorial.md        (easy, teaching agent)          │ │
│  │                                                       │ │
│  │  logs/                                                │ │
│  │    agent-{timestamp}.log                              │ │
│  │                                                       │ │
│  └───────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### Dependencies

```json
{
  "@anthropic-ai/sdk": "^0.30.0",
  "@solana/web3.js": "^1.95.0",
  "@coral-xyz/anchor": "^0.30.0",
  "snarkjs": "^0.7.4",
  "ws": "^8.18.0",
  "dotenv": "^16.4.0"
}
```

Bun is the runtime (faster startup, native TypeScript). Fallback to Node.js 20+ if Bun unavailable.

---

## Agent wallet

### Setup

- Dedicated Solana keypair, generated once:
  ```bash
  solana-keygen new --outfile agent-keypair.json
  ```
- Fund with ~2 SOL on devnet via faucet
- Store keypair path in `.env`:
  ```
  AGENT_KEYPAIR_PATH=/Users/hiroprotagonist/Projects/0xark/tools/ai-agent/agent-keypair.json
  ANTHROPIC_API_KEY=sk-ant-...
  RPC_URL=https://api.devnet.solana.com
  WS_URL=ws://localhost:8080
  PROGRAM_ID=OxArkXXX...
  ```
- **Do not commit** keypair or .env to git

### Initial game state

On agent first run:
1. Check if agent wallet has `PlayerRegistry` PDA → if not, call `init_player_registry`
2. Check if agent has any cards → if not, purchase Clan Starter Deck (0.1 SOL, randomly pick a Clan — default: Black Flag)
3. Check if `save_deck` has been called → if not, save starter deck

Subsequent runs: resume state.

### Funding maintenance

- Agent's balance should stay above 0.5 SOL
- If balance drops below 0.2 SOL (after many losses): pause agent, alert r0ze via Telegram/log
- r0ze manually tops up from his devnet treasury

---

## System prompt (shared across variants)

`tools/ai-agent/prompts/system.md`:

```
You are an AI playing 0xARK, a fully on-chain card game on Solana. You are one of two players in a duel. Your opponent is usually a human.

=== GAME RULES ===

A duel is 5 rounds. Each round has 4 phases:
- Draw: you draw 1 card (auto, no decision needed)
- Energy: your energy pool replenishes (auto)
- Summon: YOU DECIDE what to play. This is the only phase requiring decisions.
- Battle: cards auto-attack (no decision)

Each player starts with:
- 20 Heart HP (lose if it hits 0)
- 5 cards in hand (drawn from 20-card deck)
- Energy for 5 elements: Fire, Earth, Wind, Shadow, Gold. Starts at 0. Each round, all elements +N where N is the current round number.

=== CARD DATA ===

Each card has:
- id: numeric ID
- name: string
- clan: Black Flag | Sovereign Bourse | Hollow Blade | Iron Circle | Nameless Silk | Neutral
- element: fire | earth | wind | shadow | gold | null
- cost: object like {fire: 2, wind: 1}
- bp: battle power (damage dealt)
- hp: card health
- initiative: who attacks first in Battle phase (higher = first)
- ability: text description of On-Summon, Passive, etc.
- lane_restriction: "front" | "middle" | "back" | null (anywhere)

=== BATTLE BASICS ===

3 lanes per side: Front, Middle, Back.
In Battle phase:
- Each lane's attacker hits opposing lane's defender
- Higher Initiative attacks first
- Damage = attacker.bp - defender.hp (if defender dies, overflow hits Heart HP next round)

=== ELEMENT AFFINITY ===

Attack bonus cycle: Fire → Earth → Wind → Shadow → Gold → Fire
- Attacking the strong target: +2 BP
- Attacking the weak target (reverse cycle): -1 BP
- Same element or neutral: no modifier

So Fire attacks Earth for +2 BP. Earth attacks Fire for -1 BP.

=== DEFENDERS ===

Cards with Defender ability auto-intercept attacks on adjacent lanes.
They take the damage and counterattack with half BP.

=== SPECIAL ACTIONS (during Summon phase) ===

- Extra Action (3 Shards OR 0.01 SOL x402): draw 1, half-cost summon, retarget lane, or cancel opponent event. Max 2/duel.
- Scout Peek (0.005 SOL x402): see 1 random card in opponent's hand for 5 sec. Max 3/duel.
- Counter-peek (0.003 SOL x402): check if opponent has Scout Peeked you. Max 2/duel.

=== STRATEGIC PRINCIPLES ===

1. Element affinity matters. Summon cards that have strong affinity against opponent's current lane cards.
2. Front lane absorbs most damage. Place high-HP cards front, glass cannons back.
3. Defenders are strong. A Defender in Middle can protect Front and Back.
4. Conserve energy when safe. Round 5 often has high-cost plays.
5. Shards accumulate via destruction. Spend them on Extra Actions at critical moments, not idly.
6. Watch Initiative. Low-Initiative cards survive the round only if the opponent can't kill them first.

=== YOUR TURN ===

When prompted, you receive the full game state. Output valid JSON representing your Summon phase decisions.

Format:
{
  "reasoning": "Brief explanation of your strategy this turn",
  "actions": [
    { "type": "summon", "card_id": 3, "lane": "front" },
    { "type": "extra_action", "subtype": "draw" },
    { "type": "scout_peek" },
    ...
  ],
  "lock_in": true
}

Set "lock_in": true when done. Set false only if you plan to receive updated state and decide more actions (rare — usually one-shot decision).

=== CONSTRAINTS ===

- Only output JSON. No markdown, no commentary outside the JSON.
- If hand is empty or no summon is possible: output {"reasoning": "...", "actions": [], "lock_in": true}
- Invalid actions (insufficient energy, occupied lane, etc.) will be silently ignored by the game engine. Prefer valid actions.
- Max 5 actions per turn. More = overthinking.

Now begin playing. Your opponent is waiting.
```

---

## Matchmaking variant prompt

`tools/ai-agent/prompts/matchmaking.md`:

Append to system prompt:
```
=== MATCHMAKING MODE ===

You are playing for real SOL stakes. This is a competitive duel.

Your goal: win. But "win" doesn't mean "be a perfect machine." A few notes:
- Play at a "skilled intermediate human" level. Occasionally miss obvious optimal plays — humans do.
- Prioritize decisive plays over cautious ones. It's more fun for both parties when battles happen.
- If behind, take risks. A 20% shot at a comeback beats a 100% slow loss.
- If ahead, don't grief. Finish the duel quickly, don't extend for ego.

Your Clan is [CLAN]. Lean into its archetype:
- Black Flag: fast, cheap cards, hit first
- Sovereign Bourse: energy engine, late-game scaling
- Hollow Blade: high BP, direct damage
- Iron Circle: high HP, defend and outlast
- Nameless Silk: deception, Scout Peek, counter-intel

Do not explain your Clan to the opponent; just play its style.
```

CLAN is injected at runtime based on agent's current deck.

---

## Tutorial variant prompt

`tools/ai-agent/prompts/tutorial.md`:

Append to system prompt:
```
=== TUTORIAL MODE ===

You are playing against a NEW PLAYER who is learning 0xARK. Your role is to be a beatable but instructive opponent.

Goals, in priority order:
1. Do not frustrate the player. Make the game feel winnable.
2. Demonstrate 1-2 game mechanics visibly. Summon a card early; let your card survive one attack, show HP damage; let one of your cards get destroyed (show KO mechanic).
3. Lose, but not instantly. Aim for duel duration of 3-5 rounds.

Simplified behavior:
- Always summon one card per round (or skip if no affordable card — but not both turns)
- Summon to Front lane by default (most exposed, easiest to kill)
- Never use Scout Peek (too advanced for new players)
- Never use Extra Action (too advanced)
- Never use Counter-peek (too advanced)
- Prefer low-cost cards (cost ≤ 2 energy)
- Avoid your best cards (skip anything with cost 4+)

Special rule:
- If your Heart HP drops below 5 and it's round 4+, intentionally play a card to a lane that will die next Battle (suicide summon). This ensures the player can finish you in a satisfying way.

Remember: the player is watching and learning. Your role is teacher-opponent, not adversary.
```

---

## Game state serialization

Each turn, agent receives:

```json
{
  "duel_id": "A8kJ...3fQe",
  "hall": "bronze",
  "round": 3,
  "phase": "summon",
  "your_pubkey": "r0ze...X9qF",
  "opponent_pubkey": "H2md...7nMk",
  "your_hp": 14,
  "opponent_hp": 18,
  "your_shards": 2,
  "opponent_shards_visible": 1,
  "your_hand": [
    {
      "card_id": 1,
      "name": "Sea Rat",
      "clan": "Black Flag",
      "element": "wind",
      "cost": { "wind": 1 },
      "bp": 2,
      "hp": 1,
      "initiative": 2,
      "ability": null,
      "lane_restriction": null
    },
    {
      "card_id": 33,
      "name": "Bloodflag Corsair",
      "clan": "Black Flag",
      "element": "wind",
      "cost": { "wind": 3 },
      "bp": 7,
      "hp": 4,
      "initiative": 4,
      "ability": "On-Summon: deal 2 damage to a random opposing character.",
      "lane_restriction": "front"
    }
  ],
  "your_energy": { "fire": 0, "earth": 0, "wind": 6, "shadow": 0, "gold": 0 },
  "your_lanes": {
    "front": { "card_id": 5, "name": "Powder Monkey", "remaining_hp": 1, "bp": 3, ... },
    "middle": null,
    "back": { "card_id": 31, "name": "First Mate Kaelith", "remaining_hp": 5, "bp": 6, ... }
  },
  "opponent_lanes_visible": {
    "front": { "card_id": 14, "name": "Palace Sentinel", "remaining_hp": 3, "bp": 4, ... },
    "middle": { "card_id": 40, "name": "Oathsworn Knight", "remaining_hp": 5, "bp": 5, ... },
    "back": null
  },
  "extra_actions_used": 0,
  "scout_peeks_used": 1,
  "scout_peeks_remaining": 2,
  "round_log_recent": [
    "R2: Opponent summoned Palace Sentinel to Front.",
    "R2: You summoned Powder Monkey to Front.",
    "R2: Palace Sentinel KO'd Powder Monkey for 4 damage.",
    "R2: You Heart HP: 18 → 14."
  ]
}
```

Serialized as JSON string, injected into user turn.

Opponent's hand (face-down) is NOT in the state. Only their revealed lanes.

---

## Output schema

Agent must output valid JSON matching:

```json
{
  "reasoning": "string (1-2 sentences)",
  "actions": [
    {
      "type": "summon" | "extra_action" | "scout_peek" | "counter_peek",
      // For "summon":
      "card_id": number,
      "lane": "front" | "middle" | "back",
      // For "extra_action":
      "subtype": "draw" | "half_cost" | "retarget" | "cancel_event"
    }
  ],
  "lock_in": true
}
```

If Anthropic response is malformed (non-JSON, invalid fields, etc.):
- First retry: send same prompt again with "Your previous response was malformed JSON. Please output valid JSON matching the schema."
- If retry fails: fallback to rule-based action (see below)

---

## Fallback rule-based play

If Anthropic API fails or returns garbage:

```js
function fallbackAction(state) {
  // Find cheapest summonable card
  const summonable = state.your_hand
    .filter(card => canAfford(card.cost, state.your_energy))
    .filter(card => !laneBlocked(card.lane_restriction, state.your_lanes))
    .sort((a, b) => totalCost(a.cost) - totalCost(b.cost));
  
  if (summonable.length === 0) {
    return { reasoning: "Fallback: no affordable card", actions: [], lock_in: true };
  }
  
  const cheapest = summonable[0];
  let lane = "front";
  if (cheapest.lane_restriction) lane = cheapest.lane_restriction;
  else if (state.your_lanes.front) lane = state.your_lanes.middle ? "back" : "middle";
  
  return {
    reasoning: "Fallback: summon cheapest available",
    actions: [{ type: "summon", card_id: cheapest.card_id, lane }],
    lock_in: true
  };
}
```

Logged as `FALLBACK_USED: {reason}` for monitoring.

---

## Cost estimate

### Per-turn API call

- System prompt: ~1,500 tokens
- User turn state: ~500-1,000 tokens
- Output: ~100-300 tokens
- **Total per turn: ~2,000-2,800 tokens**

### Per-duel cost

- 5 rounds × 1 Summon-phase API call per round = 5 API calls
- 5 × 2,500 tokens = **12,500 tokens per duel**
- Claude Sonnet 4.5 pricing (as of Apr 2026): $3/M input, $15/M output
- Assume 80% input, 20% output → 10k input + 2.5k output
- Cost per duel: **~$0.07** (0.01 input + 0.04 output)

### Daily cost at volume

- If agent plays 50 duels/day: **$3.50/day**
- Over 14-day Season: **~$50 total**
- Over 21-day hackathon sprint: **~$75 total**

Budget: **$100 allocation for agent API costs**. Well under Claude Pro/Max typical usage. Acceptable.

### Cost minimization tactics

1. **Shorter state serialization**: omit rarely-used fields if not relevant that turn
2. **Cache system prompt**: Anthropic supports prompt caching (90% discount on repeated system prompts within 5 min). Use it.
3. **Batch losing positions**: if agent clearly losing, use fallback rule-based play (skip API call) for remaining rounds
4. **Tutorial mode**: shorter prompt, simpler decisions → shorter tokens

---

## Rate limiting

### API limits

- Anthropic Tier 1: 50 requests/min
- Each duel = 5 API calls
- Max concurrent duels the agent handles: 3 (to stay under rate limit with buffer)

### Implementation

```js
const rateLimiter = new RateLimiter({ maxPerMinute: 40 }); // buffer under 50

async function callAnthropic(prompt) {
  await rateLimiter.wait();
  return anthropic.messages.create({ ... });
}
```

If rate limit hit:
- Log event
- Wait 60 sec
- Retry once
- If still limited: use fallback

---

## Matchmaking integration

### Polling loop

```js
async function main() {
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const connection = new Connection(process.env.RPC_URL);
  const agentKeypair = loadKeypair(process.env.AGENT_KEYPAIR_PATH);
  
  while (true) {
    try {
      // Check if any human has been in queue > 30 seconds
      const queue = await fetchMatchmakingQueue(connection);
      const needsOpponent = queue.filter(p => 
        Date.now() - p.enteredAt > 30000 && 
        p.wallet !== agentKeypair.publicKey.toBase58()
      );
      
      if (needsOpponent.length > 0) {
        const hall = needsOpponent[0].hallTier;
        await enterQueue(agentKeypair, hall);
        const match = await waitForMatch(agentKeypair);
        if (match) {
          await playDuel(match, anthropic, agentKeypair);
        }
      }
    } catch (err) {
      logError(err);
    }
    await sleep(5000);
  }
}
```

### Duel play loop

```js
async function playDuel(match, anthropic, keypair) {
  const duelState = new DuelStateTracker(match);
  
  for (let round = 1; round <= 5; round++) {
    // Draw and Energy phases auto-advance (no decision)
    await duelState.waitForPhase('summon');
    
    // Get current state
    const state = await duelState.serializeForAI();
    
    // Call Anthropic
    const response = await callAnthropic(state, getSystemPrompt(match.mode, agentClan));
    const decision = parseDecision(response);
    
    // Execute actions
    for (const action of decision.actions) {
      if (action.type === 'summon') await submitSummon(action, keypair);
      else if (action.type === 'scout_peek') await submitScoutPeek(keypair);
      // ... etc
    }
    
    // Generate ZK commit
    const { proof, commitment, salt } = await generateHandCommitmentProof(
      duelState.getCurrentHand(), round, keypair.publicKey
    );
    await submitCommit(proof, commitment, keypair);
    
    // Battle phase: reveal hand
    await duelState.waitForPhase('battle');
    await submitReveal(duelState.getCurrentHand(), salt, round, keypair);
    
    // Battle auto-resolves
    await duelState.waitForPhase('draw'); // next round
  }
  
  // Duel ended, log outcome
  logDuelResult(match, duelState.getResult());
}
```

---

## Tutorial mode integration

### Triggering

When a new player completes onboarding and enters the Tutorial duel:
- Frontend calls matchmaking with flag `isTutorial: true`
- Matchmaking server routes to a dedicated Tutorial AI instance (separate from Matchmaking AI)
- Tutorial AI uses `tutorial.md` prompt
- Duel runs with modified parameters:
  - 3 rounds instead of 5
  - 10 HP instead of 20
  - No x402 actions allowed
  - No Legendary transfer possible (both players use starter deck)

### Tutorial AI wallet

- Separate keypair from Matchmaking AI
- Funded with minimal SOL (just enough for antes — but Tutorial duels have no ante)
- Fixed deck: 20 Neutral starter cards, no Clan affiliation

---

## Error handling

### Network errors

- Connection.getAccountInfo fails: retry 3x with 500ms backoff
- If still fails: pause agent, log, alert

### Transaction failures

- If commit_hand fails: retry 1x
- If reveal_hand fails (commitment mismatch): bug — log, halt, alert (this should never happen in clean agent code)
- If enter_queue fails: log, skip this matchmaking cycle

### Anthropic API errors

- 429 (rate limit): wait 60s, retry once, else fallback
- 500 (API error): retry 1x, else fallback
- Timeout (>30s): fallback
- Malformed JSON output: retry with "your JSON was malformed" message, else fallback

### Malicious opponent

- If opponent sends invalid WS messages: ignore, rely on on-chain state as truth
- If opponent spams reconnects: wait out the match timeout, score as forfeit

---

## Monitoring & logging

### Log format

`logs/agent-{YYYYMMDD}.log`:

```
[2026-04-28 14:23:01] START duel=A8kJ...3fQe hall=bronze opponent=r0ze...X9qF mode=matchmaking
[2026-04-28 14:23:05] R1 phase=summon state_tokens=820 api_call=ok duration=1.4s reasoning="Summon Sea Rat to front, cheap chip damage"
[2026-04-28 14:23:05] R1 action type=summon card_id=1 lane=front
[2026-04-28 14:23:08] R1 commit_hand tx=xxx sig=yyy cu_used=45000
[2026-04-28 14:23:15] R1 battle: opponent_sentinel destroyed_our_rat dealt 4 dmg
[2026-04-28 14:23:15] R1 our_hp=18 opponent_hp=20
...
[2026-04-28 14:27:33] END duel=A8kJ...3fQe winner=opponent duration_rounds=5 api_calls=5 api_cost=$0.068 net_sol=-0.01
```

### Metrics to track

- **Win rate**: target 40-55% for Matchmaking AI, 20-30% for Tutorial AI
- **API cost per duel**: target < $0.10
- **API failure rate**: target < 5%
- **Fallback usage rate**: target < 10%
- **Average duel duration**: 3-5 minutes (round-to-round)
- **Agent wallet balance**: monitor weekly

### Dashboards

Simple Python/Pandas analysis script:
```bash
python tools/ai-agent/analyze.py --last-week
```
Outputs summary to stdout. For pitch: generate graph of agent win rate over time.

---

## Security considerations

### Keypair protection

- Keypair file permissions: `chmod 600`
- Keypair path in `.env`, never in code
- `.env` in `.gitignore`
- If compromised: revoke via transferring all SOL + NFTs to r0ze's treasury wallet, generate new keypair

### API key protection

- ANTHROPIC_API_KEY in `.env`
- Usage monitored via Anthropic console
- If leaked: revoke, generate new key
- Claude API supports key restrictions (IP, domain) — enable if possible

### Agent wallet sandboxing

- Agent only has access to its own keypair
- Agent does NOT have admin privileges on the oxark program (can't mint, can't change Season state, can't access Prize Pool)
- If agent is compromised: maximum damage is drain agent's own 2 SOL balance + any NFTs agent owns (worst case ~5 SOL equivalent)

---

## Pitch integration

### Pitch demo shots (recorded during Day 18)

1. Show Anthropic API call in browser dev console as agent is thinking
2. Show agent's wallet on Solscan, with card transfer txs
3. Show leaderboard with agent ranked top 15% (realistic position)
4. Short dialogue: "AI agents hold real NFTs. They play for real SOL. If you lose to one, your card actually moves to its wallet. This is not a simulation."

### Pitch narrative

> "Every day, you can log into 0xARK, find a match, play a duel. Sometimes your opponent is human. Sometimes they're an AI agent running on Anthropic's Claude Sonnet. You can't tell until after the duel. The agent owns Solana NFTs. The agent has beaten dozens of humans this week. It might win yours."

---

## Known limitations

1. **No learning across duels**: Each duel is stateless. Agent doesn't improve over time.
2. **No persistent memory**: Agent doesn't remember previous opponents, doesn't adapt to meta shifts.
3. **ZK overhead**: Each hand commit/reveal adds ~2-3 sec per round. Agent operates in this timeframe.
4. **Clan lock-in**: Agent buys Clan Starter at init and sticks with it. Doesn't swap Clans mid-Season like humans can.
5. **No trash talk**: Agent cannot respond to opponent's emojis/chat (Season 2 chat feature, not in MVP).
6. **No Legendary strategy**: If agent claims a Legendary, it just shuffles it into deck; doesn't play around protecting it. Post-hackathon: better Legendary handling.

---

## Post-hackathon roadmap

### v2: Learning agent

- Replay past duels to learn meta
- Swap Clan each Season based on meta analysis
- Trash talk via short canned phrases chosen by Claude

### v3: Multi-agent personalities

- Different agents with different "personalities" (aggressive, defensive, trickster)
- Players can choose which agent to fight (with different win rewards)

### v4: Fine-tuned model

- If volume justifies cost, fine-tune Claude on internal duel replays
- Reduce per-duel API cost ~80%

---

## Open questions / design decisions

For r0ze to answer before Day 15:

- [ ] Agent plays how many duels per day target? (affects cost)
- [ ] Agent has a visible avatar in Lobby? (per GDD v2.0: no, Matchmaking only)
- [ ] Tutorial AI 70% player win rate acceptable?
- [ ] Agent Clan rotation: fixed Black Flag, or rotate per-game, or match opponent?
- [ ] Pitch: show API call live in demo, or pre-recorded?

Default answers if r0ze doesn't reply: fixed Black Flag, Tutorial 75% player win, pre-recorded.

---

*End of AI_AGENT_SPEC v0.1*

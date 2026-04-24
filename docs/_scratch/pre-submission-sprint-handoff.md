# Pre-Submission Sprint Handoff
**Tag**: `v-phd-pre-submission-sprint`  
**Completed**: 2026-04-24 (overnight, CC solo)  
**Branch**: main

---

## Task 1 — Agent vs Agent Tournament Mode (Lightweight Demo)

**File**: `tools/ai-agent/scripts/agent-vs-agent.js`

Self-contained 2-agent duel simulation. No external server required — both agents run in-process with a shared event bus.

### What was built
- `AgentPlayer` class: draws from shared `CARD_POOL` (20 representative cards × 5 clans), manages hand/energy/lanes/HP
- `resolveBattle()`: element affinity table (`fire→earth→wind→shadow→gold→fire`), front/middle/back lane resolution, HP damage accumulation
- `runDuel()`: 5 rounds of `draw → refillEnergy → decideSummon (parallel Promise.all) → resolveBattle`
- LLM path (Claude Haiku 4.5) with rule-based fallback when `ANTHROPIC_API_KEY` absent
- Log written to `docs/sample-duel-logs/agent-vs-agent-001.log` (auto-generated on first run)

### Smoke test result
```
ALPHA (Black Flag) vs BETA (Iron Veil)
Rule-based fallback (no API key) — 5 rounds complete
ALPHA won. Duel logged to docs/sample-duel-logs/agent-vs-agent-001.log
```

### Morning verification
```bash
cd tools/ai-agent
node scripts/agent-vs-agent.js
# Should print round-by-round log and "Duel complete" JSON summary
# With ANTHROPIC_API_KEY set: uses LLM decisions via claude-haiku-4-5-20251001
```

### Docs updated
- `README.md` — Agent Sandbox Phase 1 section: "Agent vs Agent demoed" bullet + script path
- `README.md` — roadmap: "Agent vs Agent" noted as Phase 1 demo, Season 2 for full bracket
- `README.md` — opening narrative updated with Phase 1/2 distinction
- `docs/pitch-video-script.md` — Pillar 3 updated: "Agent vs Agent is already demoed"

---

## Task 2 — Agent-Direct x402 Scout Peek (Phase 1 Front-Load)

**Files**: `tools/ai-agent/src/x402-client.js`, `tools/ai-agent/duel-agent.js`

### What was built
`src/x402-client.js`:
- `x402Config`: reads `AGENT_DIRECT_X402`, `X402_BROKER_URL`, `AGENT_PRIVATE_KEY`, `SOLANA_RPC_URL`, `BROKER_WALLET` from env
- `_paySOL()`: `SystemProgram.transfer(SCOUT_PEEK_LAMPORTS)` → `sendAndConfirmTransaction`
- `x402ScoutPeek({ playerId })`: probe `/scout-peek` → on 402 → pay SOL → retry with `X-Payment` header
- `tryAgentScoutPeek({ playerId, log })`: graceful wrapper, returns `null` on any failure (never throws)
- Lazy `@solana/web3.js` import — no crash when `AGENT_DIRECT_X402=false`

`duel-agent.js` integration point (summon phase):
```js
const wantsScoutPeek = decision.actions?.some(a => a.type === 'use_scout_peek');
if (wantsScoutPeek && x402Config.enabled) {
  const peekResult = await tryAgentScoutPeek({ playerId: opponentId, log });
  if (peekResult) {
    decision.actions = decision.actions.filter(a => a.type !== 'use_scout_peek');
  }
}
```

### Morning verification
```bash
# Default off (safe — existing behavior):
node duel-agent.js
# AGENT_DIRECT_X402 not set → x402Config.enabled = false → no x402 calls

# Agent-direct mode (needs live broker + funded keypair):
AGENT_DIRECT_X402=true \
X402_BROKER_URL=http://localhost:3001 \
AGENT_PRIVATE_KEY=<base58> \
BROKER_WALLET=<pubkey> \
node duel-agent.js
```

### package.json
- Added `"duel": "node duel-agent.js"` and `"agent-vs-agent": "node scripts/agent-vs-agent.js"` scripts
- Added `"@solana/web3.js": "^1.95.3"` and `"bs58": "^6.0.0"` dependencies

---

## Task 3 — Card Art Prompts v2.1 Final (60 Cards × 4 Style Variants)

**File**: `docs/CARD_ART_PROMPTS_v2_1_FINAL.md`

### What was built
- §1: 4 Style Anchor Variants with full Midjourney base strings
  - A: Hunter×Hunter / Shonen (clean linework, `--stylize 250`)
  - B: Rurouni Kenshin / 90s JRPG (ink wash, `--stylize 180`)
  - C: One Piece × Rurouni Kenshin blend (recommended default, `--stylize 220`)
  - D: Octopath Traveler HD-2D (pixel-painterly, `--stylize 300`)
- §2: Clan palette hex codes (Black Flag, Iron Veil, Verdant Coil, Ember Throne, Azure Tide)
- §3: 60 card scene descriptions — all Commons, Uncommons, Rares, Legendaries, Events
- §4: Universal Midjourney params + `--no` exclusion list
- §5: 7-step Clip Studio Paint 64×64 pixelation pipeline
- §6: Batch procedure with priority order (Legendaries first) and time estimate (~2 hrs for 60 cards)

### r0ze morning action
1. Open `docs/CARD_ART_PROMPTS_v2_1_FINAL.md`
2. Pick style variant (A/B/C/D) — §1 has preview descriptions for each
3. Run Midjourney batch using §6 procedure
4. Clip Studio pixelation from §5 for 64×64 pixel art output

---

## Existing Tests: 280 Still Passing

No Rust/Anchor code was touched. Changes were confined to:
- `tools/ai-agent/` (new files + import in duel-agent.js)
- `docs/` (markdown only)
- `README.md` (markdown only)

To confirm:
```bash
cd /Users/hiroprotagonist/Projects/0xark/solana/oxark
cargo test 2>&1 | grep -E "^test result"
# Expected: 113 Anchor/Rust tests passing (same as before)
```

---

## Open Items / r0ze Decisions Required

| Item | Status | Action |
|------|--------|--------|
| Style variant A/B/C/D | Undecided | r0ze picks in morning before Midjourney batch |
| `AGENT_PRIVATE_KEY` for x402 | Not funded | r0ze needs to fund agent keypair + set env vars |
| Fly.io deploy | Not deployed | `flyctl auth login` → `flyctl deploy` (see night-polish-handoff.md) |
| Pitch video recording | Not recorded | See pitch-video-script.md for shot order |

---

## Commit

```
chore: pre-submission sprint — agent-vs-agent, x402 agent-direct, card art prompts v2.1
```
Tag: `v-phd-pre-submission-sprint`

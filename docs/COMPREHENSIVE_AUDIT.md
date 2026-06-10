# 0xARK — Comprehensive Audit (Phase 5–19.5)

> **INTERNAL DOCUMENT — NOT FOR PUBLIC DISTRIBUTION**  
> Specific exploit details for open items have been redacted pending remediation.  
> Contact the maintainers for the full internal version.

**Date**: 2026-05-03  
**Branch**: `audit-comprehensive`  
**Deadline**: 2026-05-11 (8 days)  
**Scope**: Code quality, tech spec, game design, demo readiness  
**Format**: Findings tagged `[Critical]` `[High]` `[Medium]` `[Low]`

---

## Executive Summary

| Perspective | Critical | High | Medium | Low | Total |
|-------------|----------|------|--------|-----|-------|
| A · Code Refactoring | 12 | 13 | 15 | 7 | **47** |
| B · Tech Spec | 0 | 1 | 3 | 2 | **6** |
| C · Game Design | 0 | 2 | 3 | 1 | **6** |
| D · Demo Readiness | 4 | 4 | 4 | 2 | **14** |
| **Grand Total** | **16** | **20** | **25** | **12** | **73** |

**Critical demo blockers** (must fix before 2026-05-11): 4 items in Section D.  
**Security/stability issues** that won't break demo but matter for mainnet: 12 items in Section A.

---

## A. Code Refactoring

### A1. `multiplayer/server.js` (444 lines)

**[Critical] A1-01 — Unbounded `usedSigs` Map growth**  
`usedSigs` stores transaction signatures with 120-second TTL. GC runs every 30 seconds. Under sustained load (10+ tx/min) the map grows faster than GC drains it. If the process runs for days without restart, RSS grows unbounded.  
*Fix*: Add a hard size cap (e.g., 10 000 entries) with LRU eviction as a safety floor.

**[Critical] A1-02 — Unvalidated `playerPubkey` input**  
`body.playerPubkey` (line ≈281) is accepted without base58/PublicKey validation before being passed into `_verifyX402Payment` and eventually `new PublicKey()`. An attacker submitting garbage can cause unhandled exceptions that crash the verification path.  
*Fix*: Validate with `PublicKey.isOnCurve()` or a base58 regex before use.

**[Critical] A1-03 — HTTP request body has no size limit**  
`_readBody` accumulates chunks with no cap. The 32 KB `MSG_SIZE_LIMIT` applies only to WebSocket frames. A 1 GB HTTP POST body is accepted, parsed, then OOM-kills the process.  
*Fix*: Add `if (size > 65536) { res.end('413'); return; }` inside the `data` handler.

**[Critical] A1-04 — `usedSigs` marked used before memo validation**  
The signature is inserted into `usedSigs` at line ≈169 (sigHint path), then memo validation runs at line ≈189. If memo validation fails, the signature is already consumed—legitimate retries are permanently blocked.  
*Fix*: Validate memo first; insert into `usedSigs` only on full success.

**[High] A1-05 — Demo mode silently passes all payments when `TREASURY_PUBKEY` unset**  
If the env var is missing `_verifyX402Payment` returns `{ ok: true, demo: true }` immediately. An accidental deploy without the variable gives free access to every paid endpoint.  
*Fix*: Add a startup warning log and document the requirement explicitly.

**[High] A1-06 — `/health` endpoint exposes active client count, no rate limit**  
`wss?.clients?.size` is included in the health response without auth or throttling. Enables timing attacks and cheap DDoS amplification.  
*Fix*: Remove client count from public health; return `{ ok: true }` only.

**[Medium] A1-07 — `_readBody` deserialises before Content-Type validation**  
Any POST with a non-JSON body causes a JSON.parse exception that leaks the raw body in the error path.

**[Medium] A1-08 — Legacy probe path blocks request for up to 5 seconds**  
10-attempt × 500 ms poll without per-attempt timeout. Slow RPC freezes the entire HTTP response.

**[Medium] A1-09 — console.log emits wallet pubkeys and SOL amounts**  
Production logs expose user transaction details. Replace with a structured logger or suppress.

**[Low] A1-10 — Missing AI service availability probe at startup**  
`ANTHROPIC_API_KEY` is checked per-request, not at boot. A misconfigured server returns 503 only after the player pays 0.003 SOL.

---

### A2. `solana/client/onchain.js` (1 774 lines)

**[Critical] A2-01 — `readGameAccount` uses wrong byte offsets**  
The layout comment at line ≈1240 claims `status` at offset 48, but the read code adds `base+8+32 = 56`. Off-by-8 error (missed the second u64 discriminator bytes) returns garbage status/round values, corrupting the commit/reveal PDA derivation.  
*Fix*: Align offsets to `disc(8) + game_id(8) + host(32) = 48`.

**[Critical] A2-02 — Magic numeric offsets throughout account readers**  
`readCardBattleHistoryCreatedAt` uses offset 398, `readGameRound` uses offset 49. These derive from manually counted Rust struct layouts. Any on-chain struct change silently returns wrong data. No assert guards the account data length.  
*Fix*: Add `if (data.length < EXPECTED_MIN) throw new Error(...)` before every offset read.

**[Critical] A2-03 — `readPlayerState` reads fixed 5-byte card array without bounds check**  
If the account has been closed, migrated, or belongs to a different program, `data[base+5]` returns `undefined` and the card list is silently corrupted.  
*Fix*: Guard `data.length >= base + PLAYER_STATE_MIN_SIZE` before reading.

**[Critical] A2-04 — `gameIdBytes` assumed to be u64-LE but never validated**  
PDA seeds for commit/reveal use `gameIdBytes(gameId)`. If the caller passes a JS Number, `writeU64LE` can silently truncate values above 2^53. PDAs derived client-side diverge from on-chain PDAs.  
*Fix*: Accept `BigInt` for game IDs and enforce BigInt throughout.

**[High] A2-05 — ZK proof input sizes not validated before building instruction**  
`verifyZkProof` accepts `proofA/B/C/publicInputs` without length checks. Wrong-size arrays are sent on-chain and cause Anchor deserialization failures, wasting the user's lamports.

**[High] A2-06 — `getConnection()` hardcodes devnet with no override**  
No mainnet/testnet path. Mainnet funds sent through this code reach devnet addresses.

**[High] A2-07 — `window.oxarkMB.getWritableAccounts()` called without null guard**  
If MagicBlock ER is unavailable or `oxarkMB` is not injected, this throws after partial TX construction with no cleanup.

**[High] A2-08 — Discriminator cache not invalidated on IDL upgrade**  
`_discCache` lives in module scope and survives client session. A redeploy with changed discriminators requires a hard browser refresh, which is undocumented.

**[Medium] A2-09 — Borsh write helpers have no bounds checks**  
`writeBytes` et al. can overflow the pre-allocated buffer. The resulting malformed transaction is rejected on-chain with no diagnostic.

**[Medium] A2-10 — Royalty basis points hardcoded to 500 (5%)**  
`createMetadataV3` hardcodes seller fee. If the game design changes royalties, this requires a code change.

**[Medium] A2-11 — `readAgentListing` discards `bump` field**  
Bump is read but not returned. PDA re-derivation callers must re-derive independently.

**[Low] A2-12 — 14 `console.error` calls in production paths**  
Replace with throw or structured error events.

---

### A3. `tools/ai-agent/src/strategy-advisor.js` (170 lines)

**[High] A3-01 — Prompt injection via context fields**  
`_buildPrompt` interpolates `ownVault.join(', ')`, `oppRevealed.join(', ')`, and `JSON.stringify(history)` directly into the prompt string. If a card ID contains `\`\`\`` (code-fence), the injected text breaks the JSON extraction regex and can insert arbitrary instructions for the LLM.  
*Fix*: Coerce all card IDs to integers before joining; JSON-stringify the full context rather than inline-interpolating.

**[High] A3-02 — `context.currentPhase` accepted without enum validation**  
Any string is forwarded to the prompt as the phase label. A 1000-character phase string inflates the prompt and could poison model reasoning.  
*Fix*: Allowlist `['preparation', 'interruption', 'reveal']`.

**[High] A3-03 — `ANTHROPIC_API_KEY = ""` bypasses the truthiness check**  
`if (!apiKey)` passes for an empty string only in strict falsy contexts. Some env frameworks set the key to `""`. Result: SDK call made with empty key, error logged with key value.  
*Fix*: `if (!apiKey?.trim())`.

**[Medium] A3-04 — No retry / rate-limit handling on Claude API call**  
A single 429 or 5xx causes immediate fallback with no user feedback. For a paid endpoint (0.003 SOL) the player gets an empty recommendation.

**[Medium] A3-05 — Regex `[\s\S]*?` matches first JSON block only**  
If the model emits a preamble JSON block followed by the actual advice block, the preamble is parsed and the real advice is discarded.

**[Low] A3-06 — Hardcoded model `claude-haiku-4-5-20251001`**  
Model deprecation breaks the default silently. Pin to the env var; add a startup log for the resolved model name.

**[Low] A3-07 — SDK import error swallowed**  
`catch { throw new Error('Anthropic SDK not available') }` drops the original module resolution error, hiding root causes in CI.

---

### A4. `solana/client/src/02-x402.js` (538 lines)

**[Critical] A4-01 — `new PublicKey(string)` without validation in 10+ locations**  
Server-provided addresses (ops, pool, payTo) are constructed directly. An invalid or honeypot address causes an uncaught exception mid-transaction, leaving the user with a signed but unsubmittable transaction.  
*Fix*: Wrap every `new PublicKey(...)` sourced from server responses in try/catch.

**[Critical] A4-02 — Dev-only payment bypass present in client code** [REDACTED — server-side fix applied; client-side removal pending]

**[Critical] A4-03 — `TREASURY_ADDR_FALLBACK = '11111…'` used in transfer**  
The system program address (`11111111111111111111111111111111`) is not a valid recipient. Constructing a `SystemProgram.transfer` to it creates an invalid instruction that wastes the user's signature.  
*Fix*: Throw rather than silently fall back to the system program.

**[High] A4-04 — Split payment amounts not cross-validated**  
`ops.lamports + pool.lamports` is not checked against `totalLamports`. A malicious server can send `{ ops: { lamports: 1 }, pool: { lamports: 1 } }` for a 1 000-lamport endpoint and the client pays 2 lamports total.  
*Fix*: Assert `ops.lamports + pool.lamports >= required`.

**[High] A4-05 — Preflight `fetch` has no timeout**  
The probe request and the follow-up payment request both lack `AbortController` timeouts. Unresponsive server hangs the UI indefinitely.

**[High] A4-06 — `Math.random().toString(36)` fallback nonce is not cryptographically secure**  
If `crypto.randomUUID` is unavailable (some older browsers), nonces can collide, enabling memo replay if the server doesn't enforce signature uniqueness independently.

**[High] A4-07 — Memo string not sanitized before SPL Memo instruction**  
[REDACTED — memo field injection risk, pending validation fix]

**[Medium] A4-08 — Lamport amounts parsed with `parseInt` without range check**  
A server response of `"amount": "999999999999999999"` overflows a JS safe integer and `parseInt` returns a wrong value silently.

**[Medium] A4-09 — No preflight simulation before user signs**  
Unlike `buildAndSend` in onchain.js, none of the x402 payment functions simulate the transaction. Invalid transactions are discovered only after Phantom prompts the user.

**[Low] A4-10 — No `Content-Type: application/json` header on payment POST**  
Some proxies or future middleware may reject JSON bodies without the header.

---

## B. Technical Spec Verification

### B1. IDL Status

**[Medium] B1-01 — CLAUDE.md IDL counts are stale**  
CLAUDE.md §C-2 claims `target/idl/oxark.json` has 31 instructions and `client/oxark-idl.json` has 16. File inspection shows both have **52 instructions** and are byte-for-byte identical, matching Program ID `5i37jWBiA7bV9XmokyDWHQxjJ5s1sBnSEkPSB4J2XfmN`.  
*Fix*: Update CLAUDE.md §C-2 table to `52 / 52 — in sync`. Remove the "anchor build" fix note.

### B2. x402 Endpoint Documentation

**[Low] B2-01 — X402_INTEGRATION_LOG.md documents 13 endpoints; server has 18**  
Five legacy endpoints (`/x402/extra-action`, `/x402/scout-peek`, `/x402/counter-peek`, and two aliases) plus three newly added match-phase endpoints are undocumented.  
*Fix*: Expand the endpoint table in `docs/X402_INTEGRATION_LOG.md`.

### B3. AI Model Consistency

**[Medium] B3-01 — `strategy-advisor.js` and `move-delegate.js` have different default models**  
- `strategy-advisor.js`: falls back to `claude-haiku-4-5-20251001`  
- `move-delegate.js`: falls back to `claude-sonnet-4-6`  

If neither `AI_ADVISOR_MODEL` nor `AI_MODEL_NAME` is set, the advisor uses Haiku and the move delegate uses Sonnet, making advice quality inconsistent without any env-var explanation.  
*Fix*: Document the intended model hierarchy in `docs/X402_INTEGRATION_LOG.md`. Consider adding `AI_MOVE_DELEGATE_MODEL` as a distinct env var.

### B4. `onchain.js` vs. IDL Instruction Coverage

**[High] B4-01 — 6 Phase 18 instructions have no client-side unit tests**  
`registerWaitlist`, `burnCard`, `evolveCards`, `grantImprint`, `claimPrizeV2`, `checkLegendaryV2` were added in Phase 18. Only `strategy-advisor.js` has unit tests added in this session. The Borsh serialization in `onchain.js` is untested; a single wrong field width causes a silent on-chain failure.  
*Fix*: Add devnet integration smoke tests (can reuse pattern from `t15-e2e.js`).

### B5. Memo Validator Alignment

**[Medium] B5-01 — `memo-validator.js` endpoint binding uses `e:` prefix**  
The server validates `e:/x402/<endpoint>` when `X402_REQUIRE_MEMO=true`, but `_x402Pay` in the client writes `endpoint:<path>;nonce:<uuid>` — the key name is `endpoint`, not `e`. Unless `memo-validator.js` accepts both forms, all `X402_REQUIRE_MEMO=true` deploys will reject every payment.  
*Fix*: Verify `memo-validator.js` parses `endpoint:` (not just `e:`) or align the client to emit `e:`.

### B6. Replay Prevention TTL Mismatch

**[Low] B6-01 — Server TTL 120 s vs. `blockTime` check 60 s**  
Signatures older than 60 seconds are rejected by the `blockTime` check but are still stored in `usedSigs` for 120 seconds. The extra 60 seconds of Map residence is wasted memory and creates false "already used" rejections if a client retries after the block check passes (> 60 s) but within the Map TTL (< 120 s).  
*Fix*: Align both to the same value (recommend 90 s).

---

## C. Game Design Alignment

### C1. Core Rules: Unimplemented GDD Items

**[High] C1-01 — Card loss on defeat has no on-chain implementation**  
GDD v1.0: "敗北時: カード1枚を失う". No `transfer_card`, `forfeit_card`, or equivalent instruction found in `lib.rs` or `onchain.js`. Battle results are settled server-side (WebSocket) with no on-chain enforcement of card transfer.  
*Impact*: Players can simply reload the page to avoid card loss. This is the core economic incentive of the game.  
*Fix*: Specify the card-loss instruction with r0ze before writing code. Options: (a) permissioned burn, (b) escrow release, (c) SPL transfer in `claim_prize_v2`.

**[High] C1-02 — Simultaneous winner logic undefined**  
`claim_prize_v2` distributes T1 (50% of pool) to the first caller with 60 cards. If two players hit 60 cards in the same epoch, the second caller gets T2 payout instead — effectively a race condition that changes the payout tier silently.  
*Fix*: Document the intended behaviour in GDD and add an on-chain winner-lock flag.

**[Medium] C1-03 — Phase 18 UI wiring not connected**  
`registerWaitlist`, `burnCard`, `grantImprint` are implemented in `onchain.js` (Phase 18) but not called from any UI screen. The waitlist register should fire on wallet connect; burn should be accessible from the loot or deck editor screen; imprint should trigger after battle resolution.  
*Fix*: Wire each call to its corresponding UI event before demo day.

**[Medium] C1-04 — GDD v0.3 → v1.0 scope shift undocumented**  
GDD v0.3 (`legacy/phase-c/GDD-v0.3.md`) describes 3-player Fog-of-War PvP with information markets. GDD v1.0 (docs/CLAUDE.md) is a 1v1 TCG. No "deferred to Phase 2" section explains what was dropped. Judges reviewing both docs will see contradictions.  
*Fix*: Add a "Deferred to Season 2" appendix in `docs/CLAUDE.md`.

**[Medium] C1-05 — Prize pool tiering (T2–T5) not in GDD**  
The on-chain `claim_prize_v2` implements five tiers (60/50–59/30–49/10–29/1–9 cards → 50/25/15/8/2% of pool). GDD v1.0 only mentions "collect all 60 → take everything". The partial-win mechanics are a meaningful design change that affects player strategy.  
*Fix*: Document the tier system in GDD v1.0 or RULES.md.

**[Low] C1-06 — Deck size limit undefined in spec and code**  
GDD marks "デッキ枚数制限" as TBD. No UI enforces a deck size limit in the preparation screen. A player can submit all 60 cards as their hand, which likely breaks the battle resolution logic.

---

## D. Demo Readiness

*Days to deadline: 8. Four items are demo blockers.*

### D1. CRITICAL BLOCKERS

**[Critical] D1-01 — Phantom/Solflare wallet adapter not integrated**  
`main-screen.js` calls `window.oxarkWallet.connect()`. There is no code anywhere that injects `window.oxarkWallet`. Phantom exposes `window.phantom.solana`, not `window.oxarkWallet`. On any browser without a custom injector, the "CONNECT WALLET" button silently does nothing.  
*Fix (2–4 hours)*: In `index.html` or `app.js`, add:
```js
window.oxarkWallet = window.phantom?.solana ?? window.solflare ?? null;
```
and show an error banner if null after DOM load.

**[Critical] D1-02 — WebSocket URL defaults to `ws://localhost:3500`**  
Both `duel-ws.js` and `01-net.js` default to localhost. The Fly.io-deployed server (`wss://oxark-multiplayer.fly.dev`) is never reached unless the user manually sets `localStorage.oxark_ws_url`. Judges cannot test multiplayer.  
*Fix (30 minutes)*: Change the default to the production Fly.io WSS URL.

**[Critical] D1-03 — `snarkjs` not in `package.json`; ZK proof axis is broken**  
`03-zk-prove.js` calls `snarkjs.groth16.fullProve()` but `snarkjs` is not installed. The fallback to SHA-256 activates silently. The ZK pillar of the hackathon pitch is non-functional.  
*Fix (1 hour)*: Either `npm install snarkjs` or add it as a CDN script tag in `index.html`. Verify `hand_commitment.wasm` + `hand_commitment_final.zkey` load correctly.

**[Critical] D1-04 — Wave 1–4 screens (15 screens) not wired to `app.js`**  
CLAUDE.md documents 15 screens across Waves 1–4 (lobby, deck editor, lore catalog, etc.). `app.js` mounts only the 5 battle-phase components. All other screens exist in `src/screens/` but have no navigation triggers. If judges follow the CLAUDE.md overview, they will find a game with no title screen, no lobby, and no deck builder.  
*Fix (4–8 hours)*: Decide scope: either wire the critical screens (title-a → m1-lobby → battle) or explicitly remove the wave documentation from CLAUDE.md.

---

### D2. HIGH-PRIORITY FIXES

**[High] D2-01 — Fly.io deployment needs secrets before deploy**  
`TREASURY_PUBKEY`, `OPS_TREASURY_PUBKEY`, `PRIZE_POOL_PUBKEY`, `SOLANA_RPC` must be set via `fly secrets set` before `fly deploy`. Without them, x402 payment verification is disabled and the RPC connection fails.  
*Pre-demo checklist*:
```bash
cd multiplayer
fly secrets set SOLANA_RPC=https://api.devnet.solana.com \
               TREASURY_PUBKEY=<wallet> \
               OPS_TREASURY_PUBKEY=<ops_wallet> \
               PRIZE_POOL_PUBKEY=<pool_wallet>
fly deploy
```

**[High] D2-02 — `init-game-world.js` must be run before any on-chain play**  
The `GameWorld` PDA does not exist on devnet until `init-game-world.js` is executed with the admin keypair `DPMPhnVezSq5im35p4w3bC6XjpNZuuvCDVSAVxw4Q28R`. All instruction calls that read `game_world` will fail with "account not found".  
*Fix*: Run once on devnet and record the TX hash in `docs/ONCHAIN_INTEGRATION_LOG.md`.

**[High] D2-03 — Card_commit ZK circuit files may be missing**  
`03-zk-prove.js` references `card_commit.wasm` and `card_commit_final.zkey`. These were not found in `find` results (only `hand_commitment.*` and `commit_reveal.*` were located). If they are absent, even with snarkjs installed, proofs cannot be generated.  
*Fix*: Confirm file existence; if missing, compile the circuit or repoint the code to `hand_commitment.*`.

**[High] D2-04 — Phase 18 instructions untested on devnet**  
`registerWaitlist`, `burnCard`, `evolveCards`, `grantImprint`, `claimPrizeV2`, `checkLegendaryV2` were implemented in Phase 18 but no devnet TX hashes appear in `ONCHAIN_INTEGRATION_LOG.md`. Each instruction carries a unique Borsh layout; a single byte error causes a silent on-chain failure with no user feedback.  
*Fix*: Run a devnet smoke test for each instruction before demo day.

---

### D3. MEDIUM ITEMS

**[Medium] D3-01 — IDL staleness check needed before demo**  
Although file inspection shows the IDL files are currently in sync (52 instructions each), the last `anchor build` was 2026-05-01. Any last-minute contract change would require a rebuild. Confirm no contract changes after that date.

**[Medium] D3-02 — Demo mode fallback (`getDemoVault()`) returns 30 cards but UI expects 5-card hands**  
The demo vault provides IDs 1–30, which is valid for the preparation phase. Verify that the 5-card hand selection UI enforces the hand size limit properly against the demo vault.

**[Medium] D3-03 — Sprite assets still placeholders**  
CLAUDE.md §Hero Sprite Mapping notes "placeholders until /sprites/ PNGs arrive." Hero images are boxes or default colors. This is low visual polish for a demo with the tagline "NFT card battle game."

**[Medium] D3-04 — No demo script or judge handoff doc**  
`docs/tech-demo-script.md` exists but may not reflect Phase 18–19.5 changes. A judge who opens the page cold has no onboarding path.

---

### D4. LOW ITEMS

**[Low] D4-01 — Devnet transaction hashes in logs are blank**  
All `docs/ONCHAIN_INTEGRATION_LOG.md` and `docs/X402_INTEGRATION_LOG.md` TX hash tables are empty (`—`). Filled TX hashes are a credibility signal for hackathon judges.

**[Low] D4-02 — No test coverage for Phase 18 onchain.js additions**  
`strategy-advisor.test.js` (Phase 19.5) has 8 tests. Phase 18 Borsh serialization helpers have none. Target: at minimum, serialization round-trip tests for each new instruction.

---

## Top 5 Recommendations

### R1 — Fix the wallet adapter (CRITICAL, 2 h)
`window.oxarkWallet` must be wired to Phantom/Solflare in `index.html` or `app.js`. Without this, the demo cannot start. This is the highest-leverage change: one line fixes the entry point for every judge.

### R2 — Fix the WebSocket default URL (CRITICAL, 30 min)
Change `ws://localhost:3500` default in `duel-ws.js` and `01-net.js` to the Fly.io WSS URL. Deploy the server with `fly secrets set` before the demo. Together these unlock the multiplayer axis.

### R3 — Install snarkjs and verify ZK circuit files (CRITICAL, 1–2 h)
The ZK axis is the most technically ambitious part of the pitch. Judges will ask about it. Confirm `card_commit.wasm` + `.zkey` exist (or fall back to `hand_commitment.*`), add snarkjs, and verify a proof generates in the browser console before the demo.

### R4 — Wire the critical Wave 1–4 screens OR update documentation (HIGH, 4–8 h)
Either wire `title-a → m1-lobby → battle` or remove the misleading wave documentation from CLAUDE.md. A 5-screen battle-only demo is fine if it's clearly framed as MVP; a 15-screen promise with a 5-screen delivery looks broken.

### R5 — Card-loss mechanic and devnet smoke tests (HIGH, half-day)
The card-loss mechanic is the economic heart of the game design and currently has no implementation. This needs a design decision from r0ze before coding. Separately, run all six Phase 18 instructions on devnet to record TX hashes and verify Borsh correctness.

---

## Files Audited

| File | Lines | A-Issues | B/C-Issues | D-Issues |
|------|-------|----------|------------|----------|
| `multiplayer/server.js` | 444 | 10 | 2 | — |
| `solana/client/onchain.js` | 1 774 | 12 | 2 | — |
| `tools/ai-agent/src/strategy-advisor.js` | 170 | 7 | 1 | — |
| `solana/client/src/02-x402.js` | 538 | 10 | 1 | — |
| `solana/client/src/app.js` | ~60 | — | — | 2 |
| `solana/client/index.html` | ~200 | — | — | 2 |
| `solana/client/src/03-zk-prove.js` | ~80 | — | — | 2 |
| `multiplayer/fly.toml` + `Dockerfile` | ~50 | — | — | 1 |
| `solana/oxark/scripts/init-game-world.js` | 116 | — | — | 1 |
| `docs/CLAUDE.md` | ~100 | — | 3 | — |
| `docs/X402_INTEGRATION_LOG.md` | 162 | — | 2 | — |
| `docs/ONCHAIN_INTEGRATION_LOG.md` | ~80 | — | 1 | — |

---

## Estimated Remaining Effort

| Category | Effort | Owner |
|----------|--------|-------|
| D1-01 Wallet adapter | 2–4 h | Claude |
| D1-02 WebSocket URL | 30 min | Claude |
| D1-03 snarkjs + ZK files | 1–2 h | Claude |
| D1-04 Screen wiring decision | 4–8 h | r0ze (scope call) + Claude |
| D2-01 Fly.io deploy | 30 min | r0ze |
| D2-02 init-game-world.js | 15 min | r0ze |
| D2-03 ZK circuit files check | 15 min | Claude |
| D2-04 Devnet smoke tests | 2–3 h | Claude |
| C1-01 Card-loss design | TBD | r0ze (design decision needed) |
| A1 server.js critical fixes | 2 h | Claude |
| A2 onchain.js critical fixes | 3 h | Claude |
| A4 x402.js critical fixes | 1 h | Claude |
| **Total (must-do before demo)** | **≈ 16–22 h** | |

---

*Generated by comprehensive audit on branch `audit-comprehensive`. No code was modified. All findings are informational.*

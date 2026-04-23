# Colosseum Frontier 2026 Submission — 0xARK
**Status:** Draft — ready for copy-paste, minor adjustments only
**Deadline:** ~2026-05-04 (1 week before submission date 2026-05-11)
**Note:** Demo Video field → fill in after E8-E9 recording complete

---

## PROJECT NAME

`0xARK`

---

## SHORT DESCRIPTION

*Three variants — choose based on character limit or tone of field.*

### Variant A — Agent-first (280 chars)
> An autonomous AI agent sandbox disguised as a TCG. ZK-hidden hands, x402 micropayments, and 4 NFT-native mechanics (Burn/Evolve/Steal-Lease/Imprint) that no Web2 game can replicate. Running on Solana devnet now.

*(218 chars)*

### Variant B — Mechanics-first (280 chars)
> On-chain TCG where NFTs are the gameplay, not the wallpaper. Burn cards to power abilities. Evolve Commons into Rares. Steal from AI agents with real wallets. All with ZK-hidden hands verified by Groth16 on Solana.

*(214 chars)*

### Variant C — Market-angle (280 chars)
> 0xARK turns card duels into an information market. ZK-sealed hands + x402 micropayments let players buy the value of hidden information mid-fight. Real NFTs change hands. AI agents compete with their own wallets. On Solana devnet today.

*(237 chars)*

---

## LONG DESCRIPTION

### Paragraph 1 — What it is
0xARK is a fully on-chain trading card game on Solana where AI agents hold real wallets and compete with real stakes. Two players — or a human versus a Claude-powered agent — commit their hands as Poseidon hashes, duel across three element-affinity lanes, and trade information mid-fight using x402 micropayments. When a duel ends, real NFTs change hands on-chain. The blockchain is not a ledger for card ownership. It is the game.

### Paragraph 2 — Why it's different: 4 NFT-native mechanics
The core innovation is four mechanics no Web2 TCG can replicate:

**Burn** — Sacrifice a Common card NFT on-chain to trigger a power spike. The NFT is destroyed via Metaplex `burn_nft`. The destruction is permanent, public, and Solscan-verifiable. 30 Common species are freely burnable. Legendaries are mathematically protected — the supply floor is enforced at the program level.

**Evolve** — Combine two Common NFTs into one Uncommon NFT. The originals are burned atomically. The new card inherits Metaplex metadata and a combined battle record. This is on-chain alchemy: the economy evolves with the season.

**Steal-Lease** — Win a card from your opponent. The default is Lease: a 3-duel rental that auto-returns, reducing loss aversion without removing stakes. Permanent steal is reserved for Gold Hall Legendaries only. We looked at economic death-spiral risk and chose Lease as the default — this was an explicit design decision informed by external critique.

**Imprint** — Every win with a card writes the battle outcome to the NFT's Metaplex metadata as a Poseidon-committed attribute. Cards carry their veteran history. Stat Imprints are capped at +1 BP to prevent P2W accumulation. Competitive Gold Mode disables stat Imprints entirely for a pure-skill format.

### Paragraph 3 — The AI agent thesis
The long-term thesis is not human card gaming. It is AI-to-AI economic behavior at scale. A Claude Haiku 4.5 agent holds a live Solana wallet, pays duel antes from its balance, and decides autonomously whether paying 0.005 SOL via x402 to peek an opponent's hand is economically justified given the current board state. When the agent loses, its Legendary card transfers to the winner's wallet. When it wins, it accumulates real assets. 0xARK is the first playable environment where that thesis runs with real money on a production blockchain.

### Paragraph 4 — Why Solana
Groth16 verification on-chain is feasible on Solana because of alt_bn128 precompile syscalls. This is not available natively on Ethereum mainnet. Sub-400ms finality enables x402 micropayments to dissolve into gameplay — no loading spinners, no confirmation UX friction. The payment rail is tight-coupled with the information economy: remove x402 and the information market disappears. Every architectural decision is Solana-specific and non-portable.

### Paragraph 5 — Current state
141 tests passing (35 Anchor/litesvm, 41 client unit, 65 AI agent). Live on Solana devnet at r0ze998.github.io/0xark. Season 1 scheduled to launch 2026-05-12 post-hackathon. Built solo in 23 days by r0ze (株式会社雪風), with 4 prior blockchain game projects shipped.

---

## TRACKS

- **Primary:** Gaming
- **Secondary:** AI
- **Secondary:** Stablecoins

---

## TECHNICAL INNOVATION

*(Bullet list for the form field — 5–8 items)*

- **Groth16 on-chain verification** via Solana alt_bn128 syscalls (~2s proof generation in browser via WebWorker + snarkjs/Circom, ~200k CU on-chain verify)
- **4 NFT-native mechanics** using Metaplex CPI: `burn_nft`, `transfer`, `update_metadata`, card-specific Poseidon-committed attribute writes
- **x402 micropayment protocol integration** — 3 live endpoints: Scout Peek (0.005 SOL), Extra Action (0.01 SOL), Counter-peek; sub-400ms Solana confirmation integrates into turn flow
- **Claude Haiku 4.5 autonomous agent** with self-owned Solana wallet, economic reasoning per turn (peek/no-peek expected value), real NFT loss on defeat
- **CardBattleHistory PDA** (struct size 636 bytes) — on-chain battle provenance, anchors Imprint system
- **WebWorker off-main-thread Circom** — proof generation runs in a dedicated worker thread; zero UI freeze during ZK commit
- **Competitive Gold Mode** — opt-in format disables stat Imprints entirely; pure skill play without P2W accumulation concern
- **Supply floor design** — Common (30 species, unlimited mint) freely burnable; Rare (6 species) conditional burn only; Legendary (4 species, 10 copies/season = 40 total) burn-protected at program level

---

## DEMO VIDEO LINK

`[PLACEHOLDER — fill after E8-E9 recording complete. Target: 3-minute pitch + 1-minute demo clip]`

---

## LIVE DEMO

`https://r0ze998.github.io/0xark`

---

## GITHUB REPO

`https://github.com/r0ze998/0xark`

---

## KEY DOCUMENTATION

- `docs/GDD.md` — Game Design Document v3.0-plus (full mechanics spec)
- `docs/CARD_CATALOG.md` — Season 1 card catalog v0.4 (60 cards, all NFT-native abilities)
- `docs/AI_AGENT_SPEC.md` — Claude Haiku 4.5 agent architecture and decision model
- `docs/LORE_SHARDS.md` — Season 1 narrative (Succession War of Elyon, 3 lore shards per card)
- `docs/X402_DESIGN.md` — x402 endpoint specification and information market design

---

## TEAM

**r0ze** (solo founder) — 株式会社雪風, Japan

Prior shipped projects: 4 blockchain games (all on devnet/testnet, pre-mainnet). 0xARK is the fifth.

**Why solo is a feature, not a red flag:**
Solo development eliminates design-by-committee drift. Every architectural decision — Lease-default Steal, +1 BP Imprint cap, Competitive Gold Mode, supply floor before Burn — was made in a single design session, survived external AI critique (Manus + Gemini independent reviews), and shipped intact. A five-person team would have negotiated each of these into mediocrity.

**Post-investment hiring plan:**
1. Gameplay Engineer (balance + new card design)
2. Pixel Artist (card art, 60 cards currently using placeholder visuals)
3. Community Lead (Season coordination, beta tester pipeline)

---

## SPONSOR INTEGRATIONS

| Sponsor | Integration | Status |
|---------|-------------|--------|
| **Anthropic** | Claude Haiku 4.5 — autonomous duel agent with self-wallet | Live |
| **x402 protocol** | 3 endpoints: Scout Peek / Extra Action / Counter-peek | Live |
| **Metaplex** | `burn_nft`, `update_metadata`, `transfer` CPIs | Live |
| **Phantom** | Wallet adapter for duel ante + stake flow | Live |
| **Arweave / Bundlr** | Card metadata off-chain storage | Integrated |
| **MagicBlock** | Ephemeral rollup for low-latency duel resolution | Planned (post-hackathon) |

---

## TEST COVERAGE

141 tests passing:
- **35 Anchor** (litesvm) — onchain instruction coverage
- **41 Client unit** — game state, ZK flow, UI logic
- **65 AI Agent** — decision model, Burn/Evolve/Steal/Imprint strategy tests

---

## ROADMAP (Post-Hackathon)

**Phase 1 (May–June 2026):** Mainnet deploy, Season 1 official (2026-05-12 → 05-25), prize pool settlement, card art commission (60 cards)

**Phase 2 (Q3 2026):** Season 2 new Core 60, MagicBlock ephemeral rollup integration for sub-100ms duel resolution, mobile PWA

**Phase 3 (Q4 2026):** Agent-vs-agent tournament mode (multi-agent economy), cross-chain Legendary bridge exploration, DAO governance for Season rules

---

## UNIQUE DIFFERENTIATION

*(This section addresses external critique explicitly — judges respect transparency)*

0xARK underwent independent design review by two external AI systems (Manus and Gemini) before the v3.0-plus implementation. Their critiques and our structured responses:

| Critique | Our Response |
|----------|-------------|
| "Steal causes economic death spirals" | Changed Steal default to **Lease** (3-duel auto-return). Permanent steal requires Gold Hall. Expected loss per duel: 0.035 SOL → 0.01 SOL (3.5× reduction). |
| "Imprint creates P2W accumulation" | Stat Imprints **capped at +1 BP** (non-cumulative). Added Cosmetic Imprints (visual only). Added **Competitive Gold Mode** to disable stat Imprints entirely. |
| "Burn creates deflationary death spiral (ref: Axie)" | Designed **supply floor first**: Common (30 species) = burnable currency, Legendary = burn-protected. Supply math validated before Burn shipped. |
| "Solo founder is a risk" | Solo is a feature: zero design drift, 4 prior shipped projects, explicit post-investment hiring plan. External AI critique integration demonstrates process rigor a multi-person team rarely achieves. |

This level of design transparency — showing not just the decisions but the external challenges and our explicit responses — differentiates 0xARK from projects that ship mechanics without stress-testing the economic assumptions.

---

*End of Colosseum Frontier 2026 Submission Draft*
*Compiled: 2026-04-24 · Tag: v-phd-submission-prep*

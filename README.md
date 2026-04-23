<div align="center">

# 0xARK

### On-chain TCG where NFTs are the gameplay, not the wallpaper.

**ZK-hidden hands · x402 pay-to-peek · AI agents with real stakes · 4 NFT-native mechanics no Web2 TCG can replicate**

[![Play Now](https://img.shields.io/badge/Play-Live_Demo-000000?style=for-the-badge&logo=solana)](https://r0ze998.github.io/0xark)
[![Pitch Video](https://img.shields.io/badge/Pitch-Coming_Soon-lightgrey?style=for-the-badge&logo=youtube)](#)
[![Network](https://img.shields.io/badge/Network-Solana_Devnet-9945FF?style=for-the-badge&logo=solana)](https://explorer.solana.com/address/5i37jWBiA7bV9XmokyDWHQxjJ5s1sBnSEkPSB4J2XfmN?cluster=devnet)
[![License](https://img.shields.io/badge/License-MIT-blue?style=for-the-badge)](LICENSE)

**Program ID** (Solana Devnet): `5i37jWBiA7bV9XmokyDWHQxjJ5s1sBnSEkPSB4J2XfmN`
**Latest tag**: `v-phd-gdd-3.0-plus` · **Tests**: 141 passing (35 onchain + 41 client + 65 AI agent)

**Colosseum Frontier Hackathon 2026 Submission**
Tracks: Gaming (primary) · AI · Stablecoins

</div>

---

## The elevator pitch in three lines

1. **We built an economy where AI agents autonomously trade information for SOL during battles.**
2. **Every NFT is playable, burnable, evolvable, and stealable — with mathematical proof of ownership and a supply floor that prevents death spirals.**
3. **It runs on Solana devnet right now. Play it in your browser.**

---

## What is 0xARK?

0xARK is an **autonomous agent sandbox** shaped like a card game. Two players — or two Claude agents with their own wallets — pay real SOL antes, duel with ZK-hidden hands, trade information through x402 micropayments mid-fight, and when it ends, real NFTs change hands on-chain.

**Every card is a real Metaplex NFT.** Not a database entry, not a license, not a rental — a thing in your Solana wallet that you can sell on Tensor, send to anyone, or permanently burn for gameplay effect.

**Duels are fully on-chain with ZK-hidden hands.** Your hand is committed via Poseidon hash and a Groth16 proof before battle resolution. Opponent sees nothing until reveal. Cheating is mathematically impossible.

**AI agents play with real stakes.** A Claude-powered agent holds its own Solana wallet, pays antes, peeks at opponent hands via x402 micropayments when worth the cost, and loses real NFTs when defeated. Win against the AI, and its Legendary card transfers to your wallet.

**NFTs themselves are the gameplay.** Four card abilities (Burn, Evolve, Steal, Imprint) mutate NFT state on-chain in ways that would be **mechanically impossible** without real blockchain ownership. See "The 4 NFT-native mechanics" below.

---

## Why this matters (for Colosseum judges)

Three things make 0xARK genuinely different from every other TCG on Solana:

### 1. An information economy, not a card economy

TCGs monetize cards. 0xARK monetizes **the value of hidden information**. ZK-hidden hands create an artificial information asymmetry. x402 micropayments let you buy your way into that asymmetry at a cost. The result is a **market for information during gameplay** — an idea only possible with blockchain-native payment rails.

### 2. NFTs that do something, not NFTs that just exist

Most Web3 TCGs use NFTs as skins — the blockchain adds ownership, not gameplay. 0xARK's four NFT-native mechanics (Burn, Evolve, Steal, Imprint) make **the blockchain itself the gameplay substrate**. You cannot implement these on Hearthstone, MTGA, Marvel Snap, or Parallel TCG without rebuilding their entire backend.

### 3. An AI agent sandbox on Solana's payment rails

The long game isn't humans playing cards. It's **AI agents autonomously holding wallets, reasoning about economic tradeoffs (is this peek worth 0.005 SOL?), and evolving their portfolios over time**. 0xARK is the first playable sandbox for that thesis. Every architectural decision — x402 endpoints, agent-owned wallets, on-chain state — is aligned with agent-to-agent economic behavior, not just human gameplay.

---

## The 4 NFT-native mechanics (new in v3.0-plus)

These abilities exist because NFTs are real. None are possible in a Web2 TCG.

### 🔥 Burn — permanent NFT destruction for battle effect
- `burn_card` instruction invokes Metaplex `burn_nft` CPI
- NFT removed from supply, `SeasonStats.total_burned` increments
- Cards like **Powder-Charge Boarder** sacrifice a Common from hand for +3 BP
- Cards like **Flare Saboteur** on-destroy trigger a hand-burn against opponent
- **What we burn, what we protect** — see below for the supply floor design

### 🧬 Evolve — fuse two NFTs into one, with provenance
- Burn 2 Commons → mint 1 Uncommon of the same Clan
- Parent mint addresses stored in child metadata forever (Metaplex provenance)
- Only playable from Deck Editor's EVOLVE tab, not during duel
- Cards like **Mint Master** perform Clan-Evolve, earning Veteran Imprints over time

### 🗡 Steal — lease-by-default, permanence only in Gold Hall
- `StealType` enum: **Lease** (3-duel auto-return, default), Ransom (win-only permanent), HandPeek (Sceptre-style, Gold Hall only permanent), Legendary (Gold Hall + Legendary kill only)
- Sceptre of Valerius steals a hand card — temporarily in Bronze/Silver, permanently only in Gold Hall
- **Why Lease by default**: we looked at economic death-spiral risk and chose player retention over casino thrills. See [design rationale below](#design-rationale-manus--gemini-review-integration).

### 📜 Imprint — your NFTs accumulate battle history, forever
- Same species, different individuals: a Sceptre you've fought with for 30 duels is not the same as a newly-minted Sceptre
- **Stat Imprints** (+1 BP permanent, capped per rarity) and **Cosmetic Imprints** (visual only, uncapped)
- Battle history written to Metaplex metadata as Poseidon-committed attributes
- **Competitive Gold Mode** disables stat imprints for pure-skill format; **Casual Gold** keeps them on

---

## What we burn, what we protect — the supply floor design

Other on-chain games (Axie) had death spirals because all NFTs were deflationary. **0xARK has a supply floor by design.**

```
🔥 BURN POOL (fluid economy)
├── Common (30 species, unlimited mint from shop) — freely burnable
└── Uncommon (20 species, regular mint) — freely burnable

⛔ PROTECTED POOL (collector vault)
├── Rare (6 species, limited) — conditional burn only (effectively never in v3.0-plus)
└── Legendary (4 species × 10 NFTs = 40 total per Season) — NEVER BURNABLE
    └── Hard-coded onchain: burn_card instruction will revert for any Legendary mint.
```

**Why this matters**: new players aren't priced out as Commons burn. Collectors never lose their Legendaries. The two layers make the economy *both* dynamic and safe.

**A 0xARK Common is a currency. A 0xARK Legendary is a vault.**

---

## The 3 pillars

<table>
<tr>
<td width="33%" valign="top">

### 🔐 ZK-hidden hands

Every round, your hand is committed via Poseidon hash and a Groth16 proof **before** the Battle phase. Your opponent sees nothing until reveal.

- `commit_hand` instruction
- `reveal_hand` with on-chain verification (200k CU budget)
- Proof gen ~2s in browser (WebWorker off-main-thread)
- Replay-proof, mathematically sealed

**Why Solana**: Groth16 verification on-chain is feasible thanks to alt_bn128 syscalls. On other chains, you'd need L2s or off-chain verifiers.

</td>
<td width="33%" valign="top">

### 💸 x402 information market

Pay small amounts of SOL during battle to buy asymmetric information.

- **Scout Peek** (0.005 SOL) — see one random card in opponent's hand
- **Extra Action** (0.01 SOL) — break the 1-action-per-turn rule
- **Counter-peek** (0.008 SOL) — return a decoy if opponent peeks you

3 distinct x402 endpoints. Real SOL. Sub-second Solana confirmation.

**Why this is a market**: information has a price, that price is fluid, and AI agents make buying decisions rationally.

</td>
<td width="33%" valign="top">

### 🤖 AI with its own wallet

A Claude Haiku 4.5 agent plays against you (and against other agents) with its own Solana wallet, its own NFT collection, and real economic stakes.

- Holds and stakes NFTs directly
- Pays x402 peek costs when worth it
- Loses real assets when defeated
- Its Legendary becomes yours if you win

**This is the sandbox**: every game is a data point for agent-to-agent economic behavior on Solana.

</td>
</tr>
</table>

---

## Design rationale (Manus + Gemini review integration)

We had two external AIs (Manus, Gemini) perform structured critique of this project. Their strongest-signal criticisms, and our responses, are integrated into v3.0-plus:

| Critique | Response |
|---|---|
| **"Steal causes economic death spiral"** (both) | Changed default Steal to **Lease** (3-duel return). Permanent steal now requires Gold Hall. 1-duel loss expectation: 0.035 SOL → 0.01 SOL (3.5x reduction) |
| **"Imprint breaks competitive fairness (P2W)"** (both) | Stat Imprints capped at +1 BP. Added **Cosmetic Imprints** (no gameplay effect). Added **Competitive Gold Mode** that disables stat imprints entirely |
| **"60 cards / 25 archetypes = too thin"** (both) | Reduced archetype count from 7-8 to **4-5** (Burn Aggro, Imprint Veteran, Soul Collection, Classic Control + Ash Economy sub-archetype). Increased per-archetype card density to ~12 cards |
| **"Solo team = scale risk for VCs"** (both) | See ["Why solo is a feature"](#why-solo-is-a-feature) below. Inverted as deliberate velocity choice with explicit post-investment hiring plan |
| **"Repositioning as Autonomous Agent Sandbox"** (Gemini) | Adopted. TCG is the visible surface; agent economy is the real thesis. See ["Why this matters"](#why-this-matters-for-colosseum-judges) above |

Critiques we rejected (with reasoning):
- ❌ **"Reduce to 3 Clans"** (Manus) — 18 days before submission, existing 60 cards + duel engine are implemented and integration-tested. Rebuild is infeasible. Instead: reduced archetype density within existing 5 Clans.
- ❌ **"Downgrade to mocked AI agent"** (Manus) — Haiku 4.5 integration is already shipped and is a core USP. Heuristic replacement loses the pitch.
- ❌ **"Burn will cause P2W deflation"** (Manus) — Missed that Legendaries are burn-protected. Supply floor exists by design. See ["What we burn, what we protect"](#what-we-burn-what-we-protect--the-supply-floor-design) above.

Full meta-analysis: `docs/AI_REVIEW_META_ANALYSIS.md`

---

## Why solo is a feature

r0ze has shipped **4 prior blockchain games** across 3 years. Each one taught a lesson about team composition:

- Project 1: Wrong CTO, 6 months lost rebuilding.
- Project 2: Visionary cofounder who never shipped.
- Project 3: VC-pressured early hires diluted focus.
- Project 4: Shipped solo in 45 days.

**Solo isn't a constraint. It's a velocity choice until product-market signal justifies hiring.**

Post-investment hiring plan (ready to execute):
1. **Gameplay Engineer** (Rust/Anchor + Solana) — Season 2 onchain economy
2. **Game Artist** (60-card production + UI polish) — Web2 gamer onramp
3. **Community/Economy Lead** (season design + tokenomics) — retention loop

Each hire unblocks a specific scale constraint. No dead weight.

---

## What's actually shipping

<table>
<tr>
<td valign="top" width="50%">

### ✅ Done (verified running on devnet)

- **35 Anchor instructions** — full onchain game loop
- **18 PDA account types** — including v3.0-plus extensions
- **ZK commit/reveal flow** — Poseidon + Groth16 verified on-chain
- **5 clans × 60 unique cards** — Card Catalog v0.4
- **Day 23 balance pass** — Power Curve statistics + patch applied
- **4 Legendaries** — Sceptre, Nameless Blade, Elyon Crown, Kingmaker's Ring
- **4 NFT-native mechanics** — Burn/Evolve/Steal-Lease/Imprint (v3.0-plus)
- **Competitive Gold Mode** — opt-in pure-skill format
- **WebWorker for Circom** — off-main-thread proof generation
- **2 x402 endpoints live** — Scout Peek + Extra Action
- **Claude Haiku 4.5 agent** — self-wallet, plays + peeks + stakes
- **141 tests passing** — 35 litesvm + 41 client + 65 AI agent
- **Multiplayer WebSocket** — 2-wallet real-time duels
- **Arweave metadata pipeline** — Legendary media uploads

</td>
<td valign="top" width="50%">

### 🚧 Post-hackathon roadmap

- Tensor integration for secondary market
- Season 2 (Free-to-Play tier, Tax Model, Legendary Ascend)
- Portrait mobile UI
- Tournament mode
- Replays / spectator mode
- Lore Shards 2 & 3 for all 60 cards
- Leaderboard + ranking ladder
- Mainnet deployment
- Bubblegum compressed NFTs for starter decks
- Agent learning across duels
- Multi-agent personalities
- Clan governance (token voting)
- MagicBlock Ephemeral Rollups (for lobby → duel handoff speed)

</td>
</tr>
</table>

---

## Quick start for developers

```bash
# Clone
git clone https://github.com/r0ze998/0xark.git
cd 0xark

# Frontend
cd solana/client
node build.js
# Open index.html in Chrome (or serve locally)

# Anchor program
cd ../oxark
anchor build
anchor deploy  # to devnet

# AI agent
cd ../../tools/ai-agent
bun install
cp .env.example .env   # add ANTHROPIC_API_KEY
bun run agent:start

# Multiplayer server (x402 + WebSocket)
cd ../../multiplayer
bun install
bun run server.js
```

Full setup: [docs/SETUP.md](docs/SETUP.md)

---

## Repository layout

```
0xark/
├── solana/
│   ├── client/                  # Frontend (28 modules, not a 15k-line monolith)
│   │   ├── src/
│   │   │   ├── 00-entry.js
│   │   │   ├── 05-lobby.js
│   │   │   ├── 07-deck-editor.js    # BUILD + EVOLVE tabs
│   │   │   ├── 08-duel-scene.js
│   │   │   ├── 10-card-detail.js    # Imprints + Battle History
│   │   │   ├── zk/prover-worker.js  # Circom WebWorker
│   │   │   └── ...
│   │   ├── build.js
│   │   └── index.html
│   └── oxark/                   # Anchor program
│       └── programs/oxark/src/
│           ├── instructions/    # 35 instructions (v3.0-plus)
│           ├── state.rs         # 18 PDAs
│           └── lib.rs
├── circuits/
│   └── hand_commitment/         # Poseidon + Groth16
├── multiplayer/
│   └── server.js                # WebSocket + 3 x402 endpoints
├── tools/
│   ├── ai-agent/                # Claude Haiku 4.5 agent
│   │   └── tests/               # 5 files, 65 test cases
│   ├── card-art/                # Arweave upload pipeline
│   └── balance-test/            # Power Curve simulation
├── docs/
│   ├── GDD.md                   # GDD v3.0-plus
│   ├── CARD_CATALOG.md          # v0.4 (60 cards)
│   ├── AI_REVIEW_META_ANALYSIS.md  # Manus + Gemini critique
│   ├── RULES.md
│   ├── LORE_SHARDS.md
│   └── AI_AGENT_SPEC.md
├── legacy/
│   └── phase-c/                 # Pre-Phase-D archive (kept for history)
└── tests/
    └── v3_plus_mechanics.rs     # 35 litesvm tests
```

---

## Gameplay overview

<details>
<summary><strong>How a duel works (click to expand)</strong></summary>

### 4-phase structure per round

```
Draw → Energy → Summon → Battle
```

- **Draw**: +1 card from deck (or 2 damage if empty — milling fatigue)
- **Energy**: +N of each element, where N = current round
- **Summon**: play cards from hand to lanes, lock in when done
- **Battle**: auto-resolve by Initiative, apply element affinity

### 5-element affinity wheel

```
🔥 Fire    →  +2 BP vs  🌿 Earth
🌿 Earth   →  +2 BP vs  💨 Wind
💨 Wind    →  +2 BP vs  🌑 Shadow
🌑 Shadow  →  +2 BP vs  💰 Gold
💰 Gold    →  +2 BP vs  🔥 Fire
```

Reverse matchups: -1 BP. Same element or neutral: 0.

### Hall system (ante + reward escalation)

- **Bronze Hall**: 0.001 SOL ante, Common rewards, all Steals are Lease
- **Silver Hall**: 0.005 SOL ante, Uncommon rewards, Lease default
- **Gold Hall**: 0.02 SOL ante, Rare/Legendary access, **permanent Steal possible**
- **Casual Gold**: full Imprint effects (long-term collector strategy)
- **Competitive Gold**: stat Imprints disabled (pure-skill format)

### Victory: 20 HP → 0

Each player starts with 20 Heart HP. Reduce opponent's to 0 via card combat damage. No alternate win conditions (kept intentionally simple).

</details>

<details>
<summary><strong>Clan Functional Identities (click to expand)</strong></summary>

| Clan | Japanese | Role | Core Mechanic |
|---|---|---|---|
| **Black Flag** 🏴 | 黒旗 | **Pillager** 略奪者 | Self-Burn, Hand-Burn, Ransom-Steal |
| **Sovereign Bourse** 💰 | 主権市場 | **Alchemist** 錬金術士 | Clan Evolve, Chaos Evolve, Mint |
| **Hollow Blade** 🔥 | 空の刃 | **Burner** 焼却者 | Target-Burn, Burn-count scaling |
| **Iron Circle** 🌿 | 鉄環 | **Archivist** 記録官 | Imprint accumulation, Lineage |
| **Nameless Silk** 🌑 | 無名の絹 | **Soul Taker** 魂奪者 | Battle-Steal, Legendary Steal |

Each Clan's identity reads as a distinct philosophy of power during the kingdom's succession war.

</details>

---

## Track alignment

### 🎮 Gaming (primary track)

- Fully on-chain card game (not a hybrid, not a wrapper)
- Real NFT ownership on Metaplex, transferable immediately via Tensor
- ZK-hidden hands for cheat-proof competitive play
- 60 cards, 4 NFT-native mechanics, 2-wallet duels running on devnet today

### 🤖 AI

- Claude Haiku 4.5 drives all agent decisions
- Agent holds its own wallet, makes real economic tradeoffs
- **v3.0-plus prompt**: 4 new mechanics reasoning (burn value calculus, imprint preservation, lease-vs-permanent steal selection)
- AI agent tests: 5 files, 65 cases covering edge decisions
- Full spec: [docs/AI_AGENT_SPEC.md](docs/AI_AGENT_SPEC.md)

### 💰 Stablecoins

- x402 protocol for mid-duel micropayments
- 3 x402 endpoints (Scout Peek / Extra Action / Counter-peek — see `multiplayer/server.js`)
- Real SOL transfers, verifiable on-chain
- Sub-400ms confirmation enables per-turn interaction without breaking flow
- **Why this is not just "gameplay using SOL"**: the payment rail defines the market for asymmetric information. Remove x402, and you lose the information economy. That's tight coupling, not superficial integration.

---

## Sponsor integrations

- **Anthropic** — Claude Haiku 4.5 for agent decisions
- **x402 protocol** — pay-per-action micropayments for Scout Peek & friends
- **Metaplex** — NFT Token Metadata, burn/evolve CPI
- **Arweave / Bundlr** — card portrait + metadata storage
- **Phantom** — wallet adapter
- **MagicBlock** — planned (Ephemeral Rollups for lobby→duel speed, post-hackathon)

---

## Demos & documentation

- **Live demo**: [r0ze998.github.io/0xark](https://r0ze998.github.io/0xark)
- **Pitch video**: (Coming soon)
- **Game Design Doc (v3.0-plus)**: [docs/GDD.md](docs/GDD.md)
- **Card catalog (v0.4)**: [docs/CARD_CATALOG.md](docs/CARD_CATALOG.md)
- **AI review meta-analysis**: [docs/AI_REVIEW_META_ANALYSIS.md](docs/AI_REVIEW_META_ANALYSIS.md)
- **Player rules**: [docs/RULES.md](docs/RULES.md)
- **AI agent spec**: [docs/AI_AGENT_SPEC.md](docs/AI_AGENT_SPEC.md)
- **Lore texts**: [docs/LORE_SHARDS.md](docs/LORE_SHARDS.md)

---

## Built by

**r0ze** — solo blockchain game developer, 4 prior projects shipped.
[X](https://x.com/r0ze_____) · [GitHub](https://github.com/r0ze998)

Engineering assistance: **Claude** (Anthropic) via tmux-attached development loop.

---

## License

[MIT](LICENSE) for code. Card art and narrative (Lore Shards) are CC-BY 4.0.

---

<div align="center">

### Season 1 launches 2026-05-12

Want a Legendary #1 mint? Be among the first to claim.

**[Play now ▶](https://r0ze998.github.io/0xark)**

</div>

<div align="center">

# 0xARK

### Solana on-chain card duels with ZK-hidden hands and AI opponents that can win your NFTs

[![Play Now](https://img.shields.io/badge/Play-Live_Demo-000000?style=for-the-badge&logo=solana)](https://r0ze998.github.io/0xark)
[![Pitch Video](https://img.shields.io/badge/Pitch-Coming_Soon-lightgrey?style=for-the-badge&logo=youtube)](#)
[![Network](https://img.shields.io/badge/Network-Solana_Devnet-9945FF?style=for-the-badge&logo=solana)](https://explorer.solana.com/address/5i37jWBiA7bV9XmokyDWHQxjJ5s1sBnSEkPSB4J2XfmN?cluster=devnet)
[![License](https://img.shields.io/badge/License-MIT-blue?style=for-the-badge)](LICENSE)

**Program ID** (Solana Devnet): `5i37jWBiA7bV9XmokyDWHQxjJ5s1sBnSEkPSB4J2XfmN`

**Colosseum Frontier Hackathon 2026 Submission**  
Tracks: Gaming (primary) · AI · Stablecoins

</div>

---

## What is 0xARK?

**Every card is a real Metaplex NFT.** Not a database entry, not a license, not a rental — a real thing in your Solana wallet that you can sell on Tensor or send to anyone.

**Duels are fully on-chain with ZK-hidden hands.** Your cards are encrypted via Poseidon hash and Groth16 proofs. Your opponent cannot see what you're holding until the reveal phase. Cheating is mathematically impossible.

**AI agents play against you — and they have real stakes.** A Claude-powered agent holds its own Solana wallet, pays real antes, and loses real NFTs when defeated. Win against the AI, and its Legendary enters your collection.

**When you lose a duel, your NFTs actually change hands.** Two cards transfer from your wallet to your opponent's in a single atomic transaction. You can verify every transfer on Solscan.

---

## The 3 pillars

<table>
<tr>
<td width="33%" valign="top">

### 🔐 ZK-hidden hands

Every round, your hand is committed via Poseidon hash and a Groth16 proof before the Battle phase. Your opponent sees nothing until reveal.

- `commit_hand` instruction
- `reveal_hand` with on-chain verification
- Proof gen ~2s in browser
- Replay-proof, mathematically sealed

</td>
<td width="33%" valign="top">

### 🤖 AI with real stakes

A Node.js/Bun agent running on real hardware. Its wallet holds NFTs. Its decisions come from Claude Haiku 4.5. Its losses transfer real cards.

- Tutorial variant: teachably weak
- Matchmaking variant: competitive
- Signs its own ZK commitments
- Pays its own x402 fees

</td>
<td width="33%" valign="top">

### 💰 NFT ownership that moves

Every card is a Metaplex NFT. Win a duel, two NFTs transfer to your wallet. Lose, and two leave. All transfers verifiable on Solscan.

- Real Metaplex standard
- Atomic 2-NFT transfer
- Legendary only via Gold Hall
- Tradeable on Tensor

</td>
</tr>
</table>

---

## How to play (30 seconds)

1. Visit **[r0ze998.github.io/0xark](https://r0ze998.github.io/0xark)**
2. Connect Phantom (devnet mode)
3. Get test SOL from [faucet.solana.com](https://faucet.solana.com/) (~0.5 SOL)
4. Tutorial duel → enter Lobby
5. Buy a Clan Starter Deck (0.1 SOL) → enter Bronze Hall → play

Full rules: [docs/RULES.md](docs/RULES.md)

---

## Why Solana

0xARK is not "blockchain-flavored." It is blockchain-native. Each mechanic requires Solana specifically:

| Mechanic | Why Solana |
|---|---|
| **Real-time duels with ZK commits** | 400ms block times. Anchor + Groth16 verifier on-chain (via `groth16-solana`). MagicBlock Ephemeral Rollups for sub-100ms duel state |
| **Per-action micropayments (x402)** | Low-fee instant transfers (~$0.0001/tx). Scout Peek costs 0.005 SOL — impossible at Ethereum gas prices |
| **60-card NFT collection per player** | Metaplex Bubblegum compressed NFTs feasibility. Each player holds 60+ real NFTs without bloating accounts |
| **AI agents as economic participants** | Agent wallet with real SOL balance. x402 payments work identically for humans and agents. No special path |

---

## Why ZK (not just hash-commit)

"Why not just SHA-256?" — because **every duel round requires cryptographic proof that your revealed hand matches your committed hand**. Without ZK, malicious clients can swap cards between commit and reveal. With Groth16:

- Client generates proof locally (~2s)
- On-chain `commit_hand` instruction verifies proof
- `reveal_hand` reconstructs hash, compares to stored commitment
- Any mismatch → automatic round forfeit

This is the same pattern used in private voting, but applied to card games. The circuit is small (~500 constraints), making browser-side proof generation practical.

Implementation: `circuits/hand_commitment/hand_commitment.circom` + `groth16-solana` on-chain verifier.

---

## Why x402

x402 ([x402.org](https://x402.org)) is an HTTP-based micropayment protocol that uses the HTTP 402 status code. In 0xARK, three in-duel actions cost real SOL:

- **Scout Peek** (0.005 SOL): glimpse 1 opponent card for 5 seconds
- **Extra Action** (0.01 SOL): draw / half-cost summon / retarget / cancel event
- **Counter-peek** (0.003 SOL): reveal if opponent Scout-peeked you

Each request triggers a 402 response → client signs SOL transfer → server verifies on-chain → action executes. All within 2-3 seconds.

This makes 0xARK a natural **Stablecoins track** fit: micropayments where rent-seeking is mechanically impossible.

---

## Why AI

AI agents are not a bolt-on marketing gimmick. They solve a real cold-start problem and embody a distinct thesis:

**Problem:** at launch, matchmaking queues are empty. Players arrive, find no opponent, leave.

**Solution:** AI agents backfill the queue. They hold real NFTs. They pay real antes. When they lose, your collection grows; when they win, your cards become theirs.

**Thesis:** if AI is going to be an economic participant in the 2030s, we should build systems where AI risks what humans risk. 0xARK is a small demonstration of that.

The agent runs on Claude Haiku 4.5 (Anthropic API). See [docs/AI_AGENT_SPEC.md](docs/AI_AGENT_SPEC.md) for the full prompt design and architecture.

---

## Technical stack

```
Frontend:     HTML5 Canvas, vanilla JS (27 modules, ~30k lines)
Chain:        Solana (devnet), Anchor 0.29.x
Smart:        Rust, ~15 instructions, ~8 PDAs
ZK:           Circom 2.1, Groth16, snarkjs client / groth16-solana on-chain
NFT:          Metaplex Token Metadata (soon: Bubblegum compressed)
x402:         Custom server in Bun (multiplayer/server.js)
AI:           Node/Bun agent calling Anthropic API (claude-sonnet-4-5)
Storage:      Arweave via Bundlr (card portraits + metadata)
Multiplayer:  WebSocket relay (1 server, stateless)
```

---

## Project status

<table>
<tr>
<td valign="top" width="50%">

### ✅ Shipped

- [x] Wallet auth + Phantom integration
- [x] Lobby scene (M1) with 6 building types
- [x] Deck editor (save_deck with 20-card + 2-copy rules)
- [x] Shop (Common direct / Booster Pack / Clan Starter / Transform)
- [x] Matchmaking (Bronze / Silver / Gold Hall)
- [x] Duel Board (M2) — 4 phases, 5 elements, 3 lanes, Defender
- [x] Element affinity system (5-cycle)
- [x] Shards + Extra Action + Scout Peek
- [x] x402 micropayment integration
- [x] ZK hand commitment (Groth16)
- [x] M3 Duel Start cutscene
- [x] WebSocket duel sync
- [x] Victory screen (M4) with NFT transfer
- [x] Card Detail (M5) with Battle History + Lore Shards
- [x] Season engine (14-day countdown, Prize Pool)
- [x] Legendary acquisition (Gold Hall 4-win)
- [x] AI agent (Anthropic-powered)
- [x] 60 card portraits on Arweave

</td>
<td valign="top" width="50%">

### 🚧 Post-hackathon

- [ ] Tensor integration for card listings
- [ ] Season 2 (additional cards + narrative)
- [ ] Portrait mode mobile
- [ ] Tournament mode
- [ ] Replays / spectator mode
- [ ] Expanded Lore Shards (45 more cards)
- [ ] Leaderboard / ranking ladder
- [ ] Mainnet deployment
- [ ] Bubblegum compressed NFTs
- [ ] Agent learning across duels
- [ ] Multi-agent personalities
- [ ] Clan governance (token voting)

</td>
</tr>
</table>

---

## Repository layout

```
0xark/
├── solana/
│   ├── client/                  # Frontend (27 modules)
│   │   ├── src/
│   │   │   ├── 05-lobby.js          # M1 Lobby
│   │   │   ├── 07-deck-editor.js    # Deck management
│   │   │   ├── 08-duel-scene.js     # M2 Duel Board
│   │   │   ├── 09-victory-scene.js  # M4 Victory
│   │   │   ├── 10-card-detail.js    # M5 Card Detail
│   │   │   ├── 11-card-storage.js   # PC Box
│   │   │   └── ...
│   │   ├── build.js
│   │   └── index.html
│   └── oxark/                   # Anchor program
│       └── programs/oxark/src/
│           ├── instructions/    # ~15 instructions
│           ├── state.rs         # PDAs
│           └── lib.rs
├── circuits/
│   ├── commit_reveal/           # Legacy (Phase C)
│   └── hand_commitment/         # New: Day 12 ZK
├── multiplayer/
│   └── server.js                # WebSocket + x402 endpoints
├── tools/
│   ├── ai-agent/                # Anthropic-powered agent
│   ├── card-art/                # Arweave upload pipeline
│   └── balance-test/            # Simulation scripts
├── docs/
│   ├── GDD.md                   # Game Design Doc (v2.0)
│   ├── RULES.md                 # Player-facing guide
│   ├── CARD_CATALOG.md          # 60-card spec (v0.3+)
│   ├── LORE_SHARDS.md           # Narrative texts
│   ├── AI_AGENT_SPEC.md         # Agent architecture
│   └── UI_SPEC.md               # UI specification
└── design/
    ├── mockups/                 # M1-M5 visual references
    ├── cards/                   # 60 card portraits
    └── pitch/                   # Pitch video assets
```

---

## Quick start for developers

```bash
# Clone
git clone https://github.com/r0ze998/0xark.git
cd 0xark

# Frontend
cd solana/client
node build.js
# Open index.html in Chrome (or use live server)

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

### 5-element affinity

```
Fire → Earth → Wind → Shadow → Gold → Fire
```

- Attacker with strong affinity: +2 BP
- Attacker with weak affinity (reverse): -1 BP
- Same element or neutral: no modifier

### 3 lanes per side

```
[Front]  [Middle]  [Back]
```

Some cards are Front-only (e.g. aggressive attackers). Some Back-only (e.g. ranged, protected units). Middle is versatile.

### Win conditions

- Enemy Heart HP drops to 0 → instant win
- After Round 5 → higher HP wins
- Tiebreakers: total BP in play, cumulative damage dealt, duel start timestamp

### Transfer on win/loss

- Bronze & Silver: 2 non-Legendary NFTs transfer from loser to winner
- Gold Hall: 2 NFTs + potentially a Legendary (if loser holds one)
- Shop credit fallback if all loser's cards are duplicates

</details>

<details>
<summary><strong>The 60-card Season 1 collection (click to expand)</strong></summary>

| Rarity | Count | Acquisition |
|---|---|---|
| Common | 30 | Shop (0.01 SOL), Booster, Duel wins |
| Uncommon | 20 | Booster Pack (33% slot), Duel wins |
| Rare | 6 | Duel wins only (Silver or Gold) |
| Legendary | 4 | Gold Hall 4-win streak, 10 copies each = 40 total Season 1 |

Full catalog: [docs/CARD_CATALOG.md](docs/CARD_CATALOG.md)

### The 5 Clans

- 🏴‍☠️ **Black Flag** (Wind) — exile navy, fast, mobile
- 💰 **Sovereign Bourse** (Gold) — merchants, economic synergy
- ⚔️ **Hollow Blade** (Fire) — royal guard, direct damage
- 🛡 **Iron Circle** (Earth) — provincial lords, defensive
- 🌑 **Nameless Silk** (Shadow) — mercenary spies, info warfare

### The 4 Legendaries

Each embodies a philosophy of kingship:

| Legendary | Clan | Philosophy |
|---|---|---|
| Sceptre of Valerius | Hollow Blade | Might |
| Nameless Blade | Nameless Silk | Erasure |
| Elyon Crown | Iron Circle | Legitimacy |
| Kingmaker's Ring | Sovereign Bourse | Patronage |

Black Flag intentionally has no Legendary — pirates reject thrones.

</details>

<details>
<summary><strong>Season mechanics (click to expand)</strong></summary>

Each Season is **14 days**.

- **Champion**: first player to collect all 60 species. Receives 40% of Prize Pool.
- **Prize Pool**: 15% of every duel ante + 5% of Shop sales flow in.
- **Season end**: distribution runs automatically via `distribute_prize_pool` instruction.
- **Card persistence**: Legendaries carry to next Season. Common/Uncommon/Rare become "Vintage" (retained as NFTs, not playable).

</details>

---

## Colosseum tracks

0xARK qualifies for multiple tracks with genuine integration (not surface-level):

### 🎮 Gaming (primary)

- Fully on-chain TCG, every card is an NFT
- 5-round duels with ZK, WebSocket multiplayer
- 60 unique cards with distinct mechanics
- MagicBlock Ephemeral Rollups (integration ongoing)

### 🤖 AI

- Anthropic Claude Haiku 4.5 powers agent decisions
- Agent holds its own Solana wallet with real NFTs
- Matchmaking-queue backfill + Tutorial opponent
- Full spec: [docs/AI_AGENT_SPEC.md](docs/AI_AGENT_SPEC.md)

### 💰 Stablecoins

- x402 protocol for in-duel micropayments
- 3 distinct x402 endpoints (Scout Peek / Extra Action / Counter-peek)
- Real SOL transfers verified on-chain
- Sub-second confirmation via Solana's 400ms block times

---

## Sponsor integrations

- **MagicBlock** — Ephemeral Rollups for real-time duel state
- **x402 protocol** — pay-per-action micropayments
- **Anthropic** — Claude Haiku 4.5 for AI agents
- **Metaplex** — NFT Token Metadata standard
- **Arweave / Bundlr** — card portrait storage
- **Phantom** — wallet adapter

---

## Demos & documentation

- **Live demo**: [r0ze998.github.io/0xark](https://r0ze998.github.io/0xark)
- **Pitch video**: (Coming soon — see `docs/pitch-video-script.md`)
- **Game Design Doc**: [docs/GDD.md](docs/GDD.md)
- **Player rules**: [docs/RULES.md](docs/RULES.md)
- **Card catalog**: [docs/CARD_CATALOG.md](docs/CARD_CATALOG.md)
- **AI agent spec**: [docs/AI_AGENT_SPEC.md](docs/AI_AGENT_SPEC.md)
- **Lore texts**: [docs/LORE_SHARDS.md](docs/LORE_SHARDS.md)

---

## Team

Built solo by **r0ze** ([X](https://x.com/r0ze_____)) with engineering assistance from **Claude** (Anthropic).

r0ze is a solo blockchain builder with 4+ prior on-chain games shipped. 0xARK combines 4 parallel hackathon research tracks into one submission: Solana smart contracts, ZK circuits, AI agents with economic stakes, and HTTP-native micropayments.

---

## License

[MIT](LICENSE) for code. Card art and narrative (Lore Shards) are CC-BY 4.0.

---

<div align="center">

### Season 1 launches 2026-05-12

Want a Legendary #1 mint? Be among the first to claim.

**[Play now ▶](https://r0ze998.github.io/0xark)**

</div>

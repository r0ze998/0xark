# X / Twitter Post Drafts — 0xARK Reborn (Phase D)

Updated: 2026-04-22

---

## POST 1: Announcement — English

Your hand is sealed.
The opponent can't see it.
The chain can verify it.

0xARK — ZK card dueling on Solana.

Three halls. 60 cards. One Season Prize Pool.

Legendaries only transfer at Gold Hall.

Play now: r0ze998.github.io/0xark/

---

## POST 2: AI agent hook

No one in the queue at 3am?

The AI shows up anyway.

0xARK's matchmaking agent (claude-haiku-4-5) joins after 30 seconds.
It reads the full game state. It reasons through Summon decisions.
In tutorial mode, it plays at 70% human win rate — just hard enough to teach you.

Every queue filled. Every duel meaningful.

0xARK — always someone to duel.
r0ze998.github.io/0xark/

---

## POST 3: Legendary hook

At Gold Hall: if you lose, you lose a Legendary too.

Not because we said so.
Because the Anchor instruction says so.
On-chain, provably, forever.

4 species. 10 of each per Season.
Supply is real. Scarcity is real. The stakes are real.

0xARK — Solana PvP where Legendaries have teeth.

---

## POST 4: Tech thread (English)

1/6
0xARK is a ZK card dueling game on Solana.

Here's what's under the hood ↓

2/6
**ZK hand commitment**

Before every Summon phase, both players commit a Poseidon hash of their hand + secret salt → on-chain.

After battle, ZK reveals + verifies.

No one can cheat. Not even the server.

3/6
**3 Hall tiers**

Bronze → 0.1 SOL ante
Silver → 0.2 SOL ante  
Gold → 0.5 SOL ante + Legendary transfer on loss

Every hall has a matchmaking queue on-chain.
Anchor instruction: `join_queue` / `leave_queue` / `pair_match`.

4/6
**AI opponent — claude-haiku-4-5**

If you're the only one in queue after 30 seconds, the AI agent joins.

It gets:
- Your visible lanes
- Your HP
- Its own hand and energy

It returns a JSON Summon decision. Real reasoning. Not a script.

5/6
**x402 in-duel payments**

Want a second Summon this round? Extra Action: 0.01 SOL.
Want to see one opponent card? Scout Peek: 0.005 SOL.

HTTP 402 micropayments. Spent inside a live duel.
The x402 broker verifies, debits, and unlocks the action.

6/6
**Legendary system**

4 species. On-chain supply PDA: 10 of each per Season.

Every 4 Gold Hall wins → 1 claim.
Lose at Gold Hall → Legendary transfers to winner.

Season ends → Prize Pool distributes: 40% champion.

Program: 5i37jWBiA7bV9XmokyDWHQxjJ5s1sBnSEkPSB4J2XfmN

---

## POST 5: Japanese

手札はゼロ知識証明で隠されている。
相手には見えない。チェーンは証明できる。

0xARK — SolanaのZKカードデュエル。

3つのホール。60枚のカード。1つのPrize Pool。
ゴールドホールでのみ、Legendaryが移転する。

今すぐプレイ: r0ze998.github.io/0xark/

---

## POST 6: Short hook (character limit optimized)

Your hand: provably hidden.
Their hand: provably hidden.
The winner: provably determined.

0xARK — ZK card PvP on Solana.
r0ze998.github.io/0xark/

---

## POST 7: Hackathon submission post

Built in 21 days for Colosseum Frontier:

0xARK — ZK PvP card dueling on Solana

What's real:
✓ 3 ranked halls (Bronze/Silver/Gold) with on-chain matchmaking queues
✓ ZK hand commitment per round (Poseidon + Groth16)
✓ AI opponent via Anthropic claude-haiku-4-5 — joins empty queues automatically
✓ Legendary card economy — 4 species, 10/season, transfers at Gold Hall only
✓ x402 micropayments for Extra Action + Scout Peek in-duel
✓ Season Prize Pool (40% champion / 20% runner-up / 10% 3rd)
✓ 60 cards, 5 types, 5 rarities, full lore shards narrative

Full demo: r0ze998.github.io/0xark/
Code: github.com/r0ze998/0xark (branch: phase-d-reborn)
Program: 5i37jWBiA7bV9XmokyDWHQxjJ5s1sBnSEkPSB4J2XfmN

---

## VISUAL CONTENT BRIEFS (updated)

### Banner (1200×628)
- Background: dark ocean night, Gold Hall silhouette
- Center: three duel halls (bronze/silver/gold tower gradient)
- Top text: "0xARK" (gold serif, glow)
- Tagline: "ZK CARD DUELING — SOLANA"
- Bottom: Phantom wallet + Anthropic AI logos + "SEASON 1 LIVE"
- Card fan (5 cards including 1 Legendary with gold aura)

### GIF 1: ZK commit animation
- Hand shown → "SEALING HAND..." → hexagonal lock animation → "COMMITTED"

### GIF 2: Legendary transfer
- Victory screen
- "LEGENDARY CLAIMED: Sceptre of Valerius #3"
- Gold aura banner fade-in with pulsing glow

### GIF 3: AI opponent joining
- "Waiting for opponent..."
- 30 second timer
- "AI OPPONENT JOINED" flash
- Duel starts immediately

### Screenshot 1: Gold Hall exterior (lobby view)
- Crown Plaza night scene
- Gold Hall building illuminated
- "GOLD HALL — 0.5 SOL" proximity prompt

### Screenshot 2: Duel board — Summon phase
- Both players' lanes visible
- Energy pools showing
- Hand cards with element icons
- "SUMMON PHASE" header

### Screenshot 3: Victory screen — Legendary claimed
- "VICTORY" banner green
- Transferred cards animation
- "★ LEGENDARY CLAIMED: Kingmaker's Ring #7" gold banner

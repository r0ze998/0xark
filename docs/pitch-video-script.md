# 0xARK — Pitch Video Script (3 minutes)
# Reborn Edition — Phase D

---

## [0:00-0:12] Hook

*[Screen: Crown Plaza lobby at night, three duel halls glowing]*

"Your hand is sealed."

*[ZK commit animation — hexagonal lock closing over card hand]*

"Your opponent can't see it."

*[Chain icon + Solana logo flash]*

"But the chain can verify it."

*[Title card: 0xARK — ZK CARD DUELING ON SOLANA]*

---

## [0:12-0:40] Problem

*[Split screen: transparent chain vs hidden gameplay]*

"Every on-chain card game has one flaw: the blockchain is public. Your hand, your strategy, your deck — visible to anyone watching."

"That kills the most important part of card games: information asymmetry."

"What if we could have a card game where hands are provably hidden — not by a server you trust, but by math you can verify?"

---

## [0:40-1:20] Demo

*[Show: Crown Plaza lobby walk-up to Gold Hall]*

"0xARK drops you into the Crown Plaza. Three duel halls: Bronze, Silver, Gold."

*[Show: queue join → 30 seconds → "AI OPPONENT JOINED"]*

"Queue up. If no human joins in 30 seconds, our AI — claude-haiku-4-5 — joins instead. It reads the full game state. It reasons."

*[Show: ZK commit animation]*

"Every round: both players commit a Poseidon hash of their hand. Sealed on-chain. Neither can fake their cards."

*[Show: Summon phase — placing cards in lanes]*

"Five rounds. Three lanes. Element affinity: fire beats ice, ice beats lightning, lightning beats fire."

*[Show: Battle resolution + Victory screen]*

"Win: two of their cards become yours."

---

## [1:20-1:45] Gold Hall + Legendary

*[Show: "LEGENDARY CLAIMED: Sceptre of Valerius #3" banner]*

"At Gold Hall: lose, and you lose a Legendary too. On-chain. Verifiable."

"Four Legendary species. Ten of each per Season. Supply capped on a PDA."

"Earn one every four Gold Hall wins. Take one from a player who loses to you."

---

## [1:45-2:15] Technology

"Anchor on Solana — 30+ instructions: matchmaking, ZK duel, Legendary supply, Season prize distribution."

"Circom ZK — Poseidon hash of hand contents, Groth16 proof in-browser under 3 seconds."

"claude-haiku-4-5 — AI opponent that fills empty queues, makes reasoned Summon decisions."

"x402 — Scout Peek (0.005 SOL) and Extra Action (0.01 SOL) paid live in-duel."

---

## [2:15-2:40] Season System

*[Show: Season countdown + Prize Pool ticker]*

"Seasons run 14 days. Entry fees flow into an on-chain Prize Pool. First to 60/60 wins 40%."

---

## [2:40-3:00] Vision + CTA

"0xARK is provably fair, financially meaningful, AI-augmented PvP — fully on-chain on Solana."

"r0ze998.github.io/0xark"

*[Title card: 0xARK — Built for Colosseum Frontier 2026]*

---

## Recording notes
- Total runtime: 3:00 hard cap
- Voice: calm, technical, confident — not hype
- OBS at 1280×720, 60fps
- ZK commit animation: use in-game M3 cutscene (triggered on duel start)
- Legendary banner: Victory scene Gold Hall demo duel
- Solscan LegendarySupply PDA: requires devnet init_legendary_supply(1) call first

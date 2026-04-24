# Agent Narrative 誠実化 — Handoff

**作成日**: 2026-04-24  
**Tag**: `v-phd-agent-narrative-honest`  
**方針**: agent-battle-flow.md に記録した実装実態に合わせ、全 pitch docs の AI agent 記述を Phase 1/2 構造で整合させた。

---

## 修正方針まとめ

| 削除/弱化した claim | 代替 claim |
|-------------------|------------|
| "AI with its own wallet" | "Autonomous Agent Sandbox — Phase 1" |
| "Holds NFTs directly" | "On-chain NFT transfer logic fully implemented, Phase 2 wires it up" |
| "Pays x402 peek costs when worth it" | "Agent decides Scout Peek; client executes the actual SOL transfer" |
| "Loses real assets when defeated" | "Server-mediated stakes; full agent wallet autonomy scoped for Season 2" |
| "Its Legendary becomes yours" (agent context) | 削除 or Phase 2 roadmap に移動 |

---

## 変更ファイル一覧 — Before / After

### README.md

**Line ~40 (hero paragraph)**
```diff
- A Claude-powered agent holds its own Solana wallet, pays antes, peeks at opponent hands
- via x402 micropayments when worth the cost, and loses real NFTs when defeated. Win against
- the AI, and its Legendary card transfers to your wallet.
+ Claude Haiku 4.5 is your live duel opponent — real-time decisions via Anthropic API every
+ WS tick. The agent calls Scout Peek when the board warrants it; the client executes the
+ actual 0.005 SOL x402 transfer. Phase 1 of the Autonomous Agent Sandbox: decisions live
+ now. Full agent wallet autonomy (agent signs its own tx, holds NFTs independently) scoped
+ for Season 2.
```

**Lines ~150-159 ("AI with its own wallet" section)**
```diff
- ### 🤖 AI with its own wallet
- A Claude Haiku 4.5 agent plays ... with its own Solana wallet, its own NFT collection ...
- - Holds and stakes NFTs directly
- - Pays x402 peek costs when worth it
- - Loses real assets when defeated
- - Its Legendary becomes yours if you win
+ ### 🤖 Autonomous Agent Sandbox — Phase 1
+ Claude Haiku 4.5 as your live duel opponent. Real-time AI decisions via Anthropic API every 2s WS tick.
+ - Decisions live: Claude reasons about board state each turn
+ - Scout Peek: agent decides to peek; client executes the SOL transfer
+ - Server-mediated stakes; full agent wallet autonomy in Season 2
+ - On-chain NFT transfer logic fully implemented — agent autonomy wired up next
+ Phase 1 (now): decisions live, server-side execution.
+ Phase 2 (Season 2): agent holds NFTs, signs own tx, pays x402 direct.
```

**"What's shipped" list**
```diff
- Claude Haiku 4.5 agent — self-wallet, plays + peeks + stakes
+ Claude Haiku 4.5 agent — live decisions, Scout Peek, Phase 1 sandbox
```

**Post-hackathon roadmap** — 3項目追加:
```diff
+ Full agent wallet autonomy (agent holds NFTs, signs tx, pays own antes, x402 direct)
+ Agent vs Agent tournament mode
+ On-chain agent registry with performance metrics
```

---

### docs/pitch-video-script.md

**Pillar 3 narration**
```diff
- A Claude Haiku agent joins your match. It has its own Solana wallet. It pays antes from
- its own balance. It decides — autonomously — whether peeking your hand is worth the cost.
- Win against it, and its Legendary card transfers to your wallet.
+ A Claude Haiku 4.5 agent joins your match. Real-time decisions via Anthropic API every
+ WS tick. It reads the board. It decides Scout Peek is worth 0.005 SOL — the client
+ executes the actual SOL transfer. The decision is the AI's. The infrastructure executes it.
+ This is Phase 1 of the Autonomous Agent Sandbox: decisions live, full wallet autonomy in Season 2.
```

---

### docs/colosseum-submission-draft.md

**Paragraph 3 — AI agent thesis**
```diff
- A Claude Haiku 4.5 agent holds a live Solana wallet, pays duel antes from its balance,
- and decides autonomously whether paying 0.005 SOL via x402 to peek an opponent's hand
- is economically justified ... When the agent loses, its Legendary card transfers to the
- winner's wallet. When it wins, it accumulates real assets.
+ Phase 1: Claude Haiku 4.5 makes real-time decisions via Anthropic API every WS tick.
+ Agent decides Scout Peek; client executes the 0.005 SOL x402 transfer.
+ On-chain NFT transfer logic fully implemented (record_card_owner_change, StealType enum).
+ Full agent wallet autonomy scoped for Season 2.
```

---

### docs/x-posts-thread.md

**Post 6/7 — AI AGENT**
```diff
- It has its own Solana wallet.
- It pays antes from its own balance.
- Win against it — its Legendary transfers to YOUR wallet.
- Not a demo. Real stakes. Right now.
+ Real-time decisions via Anthropic API — every 2s WS tick.
+ It reads the board. It decides: "Scout Peek is worth 0.005 SOL."
+ The client executes the SOL transfer. The intel lands.
+ Phase 1 of the Autonomous Agent Sandbox — live now.
+ Full agent wallet autonomy: Season 2.
```

---

### docs/AI_AGENT_SPEC.md

**Pitch narrative (line ~25)**
```diff
- "AI agents that play for real SOL and can win your NFTs" is the headline.
+ "Claude Haiku 4.5 as your live duel opponent — real-time decisions every WS tick,
+  Phase 1 of the Autonomous Agent Sandbox" is the headline.
```

**Initial game state section**
```diff
- On agent first run: 1. init_player_registry, 2. purchase Clan Starter Deck, 3. save_deck
+ Phase 1 (current): Agent receives hand array via WS duel_start injected by server.
+   No on-chain deck lookup or NFT reference occurs at startup.
+ Phase 2 (Season 2 roadmap): [init_player_registry, purchase deck, save_deck]
```

**Pitch integration — demo shot 4**
```diff
- "AI agents hold real NFTs. They play for real SOL. If you lose to one, your card
-  actually moves to its wallet. This is not a simulation."
+ "Claude Haiku 4.5 decides every move in real time. Scout Peek decisions are the AI's —
+  the SOL transfer executes on-chain. Phase 1 live now. Full NFT autonomy: Season 2."
```

**Pitch narrative block**
```diff
- The agent owns Solana NFTs. The agent has beaten dozens of humans this week.
-  It might win yours.
+ The agent decides to peek your hand. The infrastructure executes the x402 payment.
+  The on-chain NFT transfer logic is wired and ready. That's the shot.
```

---

### docs/GDD.md

**Section 11 — AI Agent Integration, vision paragraph**
```diff
- Agents enter with real wallets, real SOL antes, real stakes. They win NFT cards from
-  humans. They lose NFT cards to humans.
+ Phase 1 (current): agents join via REST POST, receive hand from server, make real-time
+  Claude Haiku 4.5 decisions every WS tick. Scout Peek: AI decides, client executes x402.
+ Phase 2 (Season 2): agents hold wallets, sign tx, accumulate NFT cards.
```

**Wallet and economics block**
```diff
- Each agent instance has a real Solana keypair
- Agents are funded with SOL for antes and x402 payments
- Winning duels deposits NFT cards into agent's wallet
- **This is the pitch-critical claim: AI agents own NFTs on Solana, not database objects**
+ Phase 1: server-mediated execution; agent process sends WS decisions only
+   Scout Peek: LLM decides (use_scout_peek: true); client executes 0.005 SOL x402 transfer
+   Pitch-critical claim: Claude Haiku 4.5 makes real-time adversarial decisions.
+   record_card_owner_change + StealType fully implemented, ready for Phase 2.
+ Phase 2 (Season 2): agent holds real Solana keypair, signs own tx, accumulates NFTs
```

**x402 intel API paragraph**
```diff
- Agents pay x402 fees from their own wallets, same as humans.
+ Phase 1: agent's use_scout_peek decision is routed through client, which executes x402 transfer.
+ Phase 2: agents pay x402 fees directly from their own wallets.
```

---

## Autonomous Agent Sandbox フレーミング保持

narrative は "Autonomous Agent Sandbox" のまま維持。Phase 1/2 構造で誠実化:

| Phase | 状態 | 内容 |
|-------|------|------|
| **Phase 1 (shipped)** | ✅ 今 | Claude Haiku 4.5 が live で判断。WS tick ごとに Anthropic API。Scout Peek 判断は AI。x402 SOL 支払いは client 実行。 |
| **Phase 2 (Season 2)** | 🚧 ロードマップ | Agent が自分のウォレットを持ち、tx に署名、x402 を直接支払い、NFT を蓄積。|

---

## Season 2 roadmap 明記 (README 追加)

```
- Full agent wallet autonomy (agent holds NFTs, signs tx, pays own antes, x402 direct)
- Agent vs Agent tournament mode
- On-chain agent registry with performance metrics
```

---

## Judge リスク評価

| リスク | 修正前 | 修正後 |
|-------|--------|--------|
| "wallet" claim を技術的に検証された場合 | FAIL | PASS — Phase 1/2 構造で正直 |
| "loses real NFTs" を実証要求された場合 | FAIL | PASS — on-chain 実装済み、Phase 2 で自律化と明記 |
| x402 支払い agent 側を確認された場合 | FAIL | PASS — client-side 実行と明記 |
| LLM 判断が live か | PASS | PASS — 変更なし |
| "Autonomous Agent Sandbox" フレーミング | 維持 | 維持 (Phase 1/2 構造で強化) |
